import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assessReadiness } from "../src/repoready.js";

/**
 * All tests are pure local computation over inline repo
 * facts: no filesystem, no network, and nothing is executed.
 * Each of the eight checks is pinned with its exact pass
 * detail and every distinct fail detail, the fail-detail
 * precedence for the README content checks is pinned, and
 * every validation path is pinned with its path-naming
 * message.
 */

type Args = Record<string, unknown>;

const GOOD_README =
  "# Demo\n\n## Install\n\nnpm install\n\nVerify with npm test.\n";

const full = (over: Args = {}): Args => ({
  files: [
    { path: "README.md", content: GOOD_README },
    { path: "LICENSE" },
    { path: "CONTRIBUTING.md" },
    { path: ".github/workflows/ci.yml" },
    { path: "package-lock.json" },
  ],
  package_scripts: { test: "node --test" },
  ...over,
});

const check = (args: unknown, id: string) => {
  const out = assessReadiness(args);
  const found = out.checks.find((c) => c.id === id);
  assert.ok(found, `check ${id} missing`);
  return found;
};

describe("assessReadiness — check 1: readme", () => {
  it("passes with 'README found at <path>'", () => {
    assert.deepEqual(check(full(), "readme"), {
      id: "readme",
      status: "pass",
      detail: "README found at README.md",
    });
  });

  it("fails with 'no README file' when no README exists", () => {
    assert.deepEqual(check({ files: [{ path: "src/index.ts" }] }, "readme"), {
      id: "readme",
      status: "fail",
      detail: "no README file",
    });
  });

  it("matches README.md case-insensitively and readme.* variants in subdirectories", () => {
    assert.equal(
      check({ files: [{ path: "docs/ReadMe.MD" }] }, "readme").status,
      "pass",
    );
    assert.equal(
      check({ files: [{ path: "README.txt" }] }, "readme").detail,
      "README found at README.txt",
    );
    assert.equal(
      check({ files: [{ path: "readme" }] }, "readme").status,
      "fail",
    );
  });

  it("selects the README that is first in input order", () => {
    const out = assessReadiness({
      files: [
        { path: "docs/README.md", content: "nothing useful here" },
        { path: "README.md", content: GOOD_README },
      ],
      package_scripts: { test: "x" },
    });
    assert.equal(out.checks[0].detail, "README found at docs/README.md");
    // The first README's content drives the doc checks, so they fail.
    assert.equal(out.checks[1].detail, "README does not mention installation");
    assert.equal(
      out.checks[3].detail,
      "README does not document a test command",
    );
  });
});

describe("assessReadiness — check 2: install_docs", () => {
  it("passes with 'README documents installation' (case-insensitive match)", () => {
    assert.deepEqual(check(full(), "install_docs"), {
      id: "install_docs",
      status: "pass",
      detail: "README documents installation",
    });
    assert.equal(
      check(
        { files: [{ path: "README.md", content: "INSTALLATION steps" }] },
        "install_docs",
      ).status,
      "pass",
    );
  });

  it("fails with 'no README file' when there is no README (precedence 1)", () => {
    assert.deepEqual(check({ files: [{ path: "a.ts" }] }, "install_docs"), {
      id: "install_docs",
      status: "fail",
      detail: "no README file",
    });
  });

  it("fails with 'README content not supplied' when content is absent (precedence 2)", () => {
    assert.deepEqual(
      check({ files: [{ path: "README.md" }] }, "install_docs"),
      {
        id: "install_docs",
        status: "fail",
        detail: "README content not supplied",
      },
    );
  });

  it("fails with 'README does not mention installation' when content does not match (precedence 3)", () => {
    assert.deepEqual(
      check(
        { files: [{ path: "README.md", content: "hello, run npm test" }] },
        "install_docs",
      ),
      {
        id: "install_docs",
        status: "fail",
        detail: "README does not mention installation",
      },
    );
  });

  it("an empty-string content counts as supplied and fails as no match, not as not supplied", () => {
    assert.equal(
      check({ files: [{ path: "README.md", content: "" }] }, "install_docs")
        .detail,
      "README does not mention installation",
    );
  });
});

describe("assessReadiness — check 3: test_script", () => {
  it("passes with 'a test script is defined'", () => {
    assert.deepEqual(check(full(), "test_script"), {
      id: "test_script",
      status: "pass",
      detail: "a test script is defined",
    });
  });

  it("fails with 'package scripts not supplied' when package_scripts is absent", () => {
    assert.deepEqual(
      check({ files: [{ path: "README.md", content: GOOD_README }] }, "test_script"),
      {
        id: "test_script",
        status: "fail",
        detail: "package scripts not supplied",
      },
    );
  });

  it("fails with 'no test script is defined' when there is no test key", () => {
    assert.deepEqual(
      check(
        {
          files: [{ path: "README.md", content: GOOD_README }],
          package_scripts: { build: "tsc" },
        },
        "test_script",
      ),
      {
        id: "test_script",
        status: "fail",
        detail: "no test script is defined",
      },
    );
    // An empty map was supplied, so it is also this detail.
    assert.equal(
      check(
        { files: [{ path: "README.md" }], package_scripts: {} },
        "test_script",
      ).detail,
      "no test script is defined",
    );
  });

  it("fails with 'no test script is defined' when the test value is empty", () => {
    assert.equal(
      check(
        {
          files: [{ path: "README.md" }],
          package_scripts: { test: "" },
        },
        "test_script",
      ).detail,
      "no test script is defined",
    );
  });
});

describe("assessReadiness — check 4: test_command_docs", () => {
  it("passes with 'README documents a test command'", () => {
    assert.deepEqual(check(full(), "test_command_docs"), {
      id: "test_command_docs",
      status: "pass",
      detail: "README documents a test command",
    });
  });

  it("passes for each documented test command form", () => {
    for (const cmd of ["npm test", "pytest", "go test", "cargo test", "make test"]) {
      assert.equal(
        check(
          { files: [{ path: "README.md", content: `run ${cmd} now` }] },
          "test_command_docs",
        ).status,
        "pass",
        cmd,
      );
    }
  });

  it("fails with 'no README file' when there is no README (precedence 1)", () => {
    assert.equal(
      check({ files: [{ path: "a.ts" }] }, "test_command_docs").detail,
      "no README file",
    );
  });

  it("fails with 'README content not supplied' when content is absent (precedence 2)", () => {
    assert.equal(
      check({ files: [{ path: "README.md" }] }, "test_command_docs").detail,
      "README content not supplied",
    );
  });

  it("fails with 'README does not document a test command' when content does not match (precedence 3)", () => {
    assert.deepEqual(
      check(
        { files: [{ path: "README.md", content: "install it somehow" }] },
        "test_command_docs",
      ),
      {
        id: "test_command_docs",
        status: "fail",
        detail: "README does not document a test command",
      },
    );
  });
});

describe("assessReadiness — check 5: license", () => {
  it("passes with 'license file found at <path>' for LICENSE and LICENCE forms", () => {
    assert.deepEqual(check(full(), "license"), {
      id: "license",
      status: "pass",
      detail: "license file found at LICENSE",
    });
    assert.equal(
      check({ files: [{ path: "LICENCE.txt" }] }, "license").detail,
      "license file found at LICENCE.txt",
    );
    assert.equal(
      check({ files: [{ path: "docs/license.md" }] }, "license").detail,
      "license file found at docs/license.md",
    );
  });

  it("uses the first license file in input order", () => {
    assert.equal(
      check(
        { files: [{ path: "LICENSE-MIT" }, { path: "LICENSE" }] },
        "license",
      ).detail,
      "license file found at LICENSE-MIT",
    );
  });

  it("fails with 'no license file'", () => {
    assert.deepEqual(check({ files: [{ path: "README.md" }] }, "license"), {
      id: "license",
      status: "fail",
      detail: "no license file",
    });
  });
});

describe("assessReadiness — check 6: contributing", () => {
  it("passes with 'contributing guide found at <path>'", () => {
    assert.deepEqual(check(full(), "contributing"), {
      id: "contributing",
      status: "pass",
      detail: "contributing guide found at CONTRIBUTING.md",
    });
    assert.equal(
      check({ files: [{ path: ".github/contributing.md" }] }, "contributing")
        .detail,
      "contributing guide found at .github/contributing.md",
    );
  });

  it("uses the first contributing file in input order", () => {
    assert.equal(
      check(
        {
          files: [
            { path: "CONTRIBUTING.md" },
            { path: "docs/CONTRIBUTING.txt" },
          ],
        },
        "contributing",
      ).detail,
      "contributing guide found at CONTRIBUTING.md",
    );
  });

  it("fails with 'no contributing guide'", () => {
    assert.deepEqual(
      check({ files: [{ path: "README.md" }] }, "contributing"),
      {
        id: "contributing",
        status: "fail",
        detail: "no contributing guide",
      },
    );
  });
});

describe("assessReadiness — check 7: ci", () => {
  it("passes with 'CI workflows found'", () => {
    assert.deepEqual(check(full(), "ci"), {
      id: "ci",
      status: "pass",
      detail: "CI workflows found",
    });
  });

  it("requires the trailing-slash prefix '.github/workflows/'", () => {
    assert.equal(
      check({ files: [{ path: ".github/workflows" }] }, "ci").status,
      "fail",
    );
    assert.equal(
      check({ files: [{ path: "x/.github/workflows/ci.yml" }] }, "ci").status,
      "fail",
    );
    assert.equal(
      check({ files: [{ path: ".github/workflows/ci.yml" }] }, "ci").status,
      "pass",
    );
  });

  it("fails with 'no CI workflows'", () => {
    assert.deepEqual(check({ files: [{ path: "README.md" }] }, "ci"), {
      id: "ci",
      status: "fail",
      detail: "no CI workflows",
    });
  });
});

describe("assessReadiness — check 8: lockfile", () => {
  it("passes with 'lockfile found at <path>'", () => {
    assert.deepEqual(check(full(), "lockfile"), {
      id: "lockfile",
      status: "pass",
      detail: "lockfile found at package-lock.json",
    });
  });

  it("recognises every name in the lockfile set", () => {
    for (const name of [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "Cargo.lock",
      "poetry.lock",
      "Pipfile.lock",
      "go.sum",
    ]) {
      assert.equal(
        check({ files: [{ path: `sub/${name}` }] }, "lockfile").detail,
        `lockfile found at sub/${name}`,
        name,
      );
    }
  });

  it("uses the first lockfile in input order and rejects near-miss names", () => {
    assert.equal(
      check(
        { files: [{ path: "yarn.lock" }, { path: "package-lock.json" }] },
        "lockfile",
      ).detail,
      "lockfile found at yarn.lock",
    );
    assert.equal(
      check({ files: [{ path: "package-lock.json.bak" }] }, "lockfile").status,
      "fail",
    );
    assert.equal(
      check({ files: [{ path: "my-yarn.lock" }] }, "lockfile").status,
      "fail",
    );
  });

  it("fails with 'no lockfile'", () => {
    assert.deepEqual(check({ files: [{ path: "README.md" }] }, "lockfile"), {
      id: "lockfile",
      status: "fail",
      detail: "no lockfile",
    });
  });
});

describe("assessReadiness — result shape, essential failures, ready", () => {
  it("the full result matches exactly for a complete repo", () => {
    assert.deepEqual(assessReadiness(full()), {
      checks: [
        { id: "readme", status: "pass", detail: "README found at README.md" },
        {
          id: "install_docs",
          status: "pass",
          detail: "README documents installation",
        },
        {
          id: "test_script",
          status: "pass",
          detail: "a test script is defined",
        },
        {
          id: "test_command_docs",
          status: "pass",
          detail: "README documents a test command",
        },
        {
          id: "license",
          status: "pass",
          detail: "license file found at LICENSE",
        },
        {
          id: "contributing",
          status: "pass",
          detail: "contributing guide found at CONTRIBUTING.md",
        },
        { id: "ci", status: "pass", detail: "CI workflows found" },
        {
          id: "lockfile",
          status: "pass",
          detail: "lockfile found at package-lock.json",
        },
      ],
      passed: 8,
      total: 8,
      essential_failures: [],
      ready: true,
    });
  });

  it("checks are always in the pinned fixed order and total is 8", () => {
    const out = assessReadiness({ files: [{ path: "a.ts" }] });
    assert.deepEqual(
      out.checks.map((c) => c.id),
      [
        "readme",
        "install_docs",
        "test_script",
        "test_command_docs",
        "license",
        "contributing",
        "ci",
        "lockfile",
      ],
    );
    assert.equal(out.total, 8);
    assert.equal(out.passed, 0);
  });

  it("essential_failures lists failed essential ids in check order and ready is false", () => {
    const out = assessReadiness({ files: [{ path: "a.ts" }] });
    assert.deepEqual(out.essential_failures, [
      "readme",
      "install_docs",
      "test_script",
      "test_command_docs",
    ]);
    assert.equal(out.ready, false);
  });

  it("essential_failures keeps check order for a partial failure set", () => {
    const out = assessReadiness({
      files: [{ path: "README.md", content: "install only" }],
    });
    // readme + install_docs pass; test_script + test_command_docs fail.
    assert.deepEqual(out.essential_failures, [
      "test_script",
      "test_command_docs",
    ]);
    assert.equal(out.ready, false);
    assert.equal(out.passed, 2);
  });

  it("ready is true when only non-essential checks fail", () => {
    const out = assessReadiness({
      files: [{ path: "README.md", content: GOOD_README }],
      package_scripts: { test: "node --test" },
    });
    assert.deepEqual(out.essential_failures, []);
    assert.equal(out.ready, true);
    assert.equal(out.passed, 4);
  });

  it("passed counts exactly the passing checks", () => {
    const out = assessReadiness(full());
    assert.equal(
      out.passed,
      out.checks.filter((c) => c.status === "pass").length,
    );
  });

  it("unknown extra fields are ignored (pinned judgement call)", () => {
    const out = assessReadiness({
      files: [{ path: "README.md", content: GOOD_README, size: 42 }],
      package_scripts: { test: "x" },
      comment: "not part of the spec",
    });
    assert.equal(out.ready, true);
  });
});

describe("assessReadiness — validation", () => {
  const throws = (args: unknown, message: string) =>
    assert.throws(() => assessReadiness(args), { message });

  it("files missing is an error naming files", () => {
    throws({}, "files is required");
    throws(null, "files is required");
    throws([], "files is required");
  });

  it("files empty or not an array is an error", () => {
    throws({ files: [] }, "files must be a non-empty array");
    throws({ files: "README.md" }, "files must be a non-empty array");
    throws({ files: 7 }, "files must be a non-empty array");
  });

  it("a file entry that is not an object names its path", () => {
    throws({ files: ["README.md"] }, "files[0] must be an object");
    throws(
      { files: [{ path: "a.ts" }, null] },
      "files[1] must be an object",
    );
  });

  it("path missing names its path", () => {
    throws({ files: [{ content: "x" }] }, "files[0].path is required");
  });

  it("path empty or non-string names its path", () => {
    throws({ files: [{ path: "" }] }, "files[0].path must be a non-empty string");
    throws({ files: [{ path: 42 }] }, "files[0].path must be a non-empty string");
  });

  it("a duplicate path names the second occurrence's path", () => {
    throws(
      {
        files: [{ path: "dup.txt" }, { path: "other.txt" }, { path: "dup.txt" }],
      },
      'files[2].path duplicates files[0].path "dup.txt"',
    );
  });

  it("content present but not a string names its path", () => {
    throws(
      { files: [{ path: "README.md", content: 42 }] },
      "files[0].content must be a string",
    );
    throws(
      { files: [{ path: "a.ts" }, { path: "README.md", content: null }] },
      "files[1].content must be a string",
    );
  });

  it("package_scripts present but not an object names package_scripts", () => {
    throws(
      { files: [{ path: "a.ts" }], package_scripts: "test" },
      "package_scripts must be an object",
    );
    throws(
      { files: [{ path: "a.ts" }], package_scripts: ["test"] },
      "package_scripts must be an object",
    );
  });

  it("package_scripts holding a non-string value names the offending key", () => {
    throws(
      { files: [{ path: "a.ts" }], package_scripts: { test: 42 } },
      "package_scripts.test must be a string",
    );
    throws(
      {
        files: [{ path: "a.ts" }],
        package_scripts: { build: "tsc", lint: null },
      },
      "package_scripts.lint must be a string",
    );
  });

  it("no partial result is produced on invalid input", () => {
    assert.throws(() =>
      assessReadiness({
        files: [{ path: "README.md", content: GOOD_README }, { path: "README.md" }],
        package_scripts: { test: "x" },
      }),
    );
  });
});
