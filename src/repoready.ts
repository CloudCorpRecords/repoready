/**
 * repoready core: first-contributor readiness assessment.
 *
 *   assessReadiness(args) -> assessment
 *
 * The README is the first file (in input order) whose
 * basename lowercased is "readme.md" or starts with
 * "readme.". Basename matching is case-insensitive.
 *
 * The eight checks, in this fixed order, each with its
 * exact detail strings:
 *
 *   1. readme           pass "README found at <path>"
 *                       fail "no README file"
 *   2. install_docs     pass "README documents installation"
 *                       fail "no README file" /
 *                            "README content not supplied" /
 *                            "README does not mention installation"
 *   3. test_script      pass "a test script is defined"
 *                       fail "package scripts not supplied" /
 *                            "no test script is defined"
 *   4. test_command_docs pass "README documents a test command"
 *                       fail "no README file" /
 *                            "README content not supplied" /
 *                            "README does not document a test command"
 *   5. license          pass "license file found at <path>"
 *                       fail "no license file"
 *   6. contributing     pass "contributing guide found at <path>"
 *                       fail "no contributing guide"
 *   7. ci               pass "CI workflows found"
 *                       fail "no CI workflows"
 *   8. lockfile         pass "lockfile found at <path>"
 *                       fail "no lockfile"
 *
 * Essential checks: readme, install_docs, test_script,
 * test_command_docs. The result is {checks, passed, total,
 * essential_failures, ready}: passed counts the passing
 * checks, total is 8, essential_failures lists the essential
 * ids that failed in check order, and ready is true exactly
 * when essential_failures is empty.
 *
 * Validation is strict and path-naming: any malformed input
 * throws an Error naming the offending path and no partial
 * result is produced. The tool assesses supplied facts
 * only; it runs nothing.
 */
import type {
  RepoReadyCheck,
  RepoReadyFile,
  RepoReadyResult,
} from "./types.js";

export const VERSION = "0.1.0";

const ESSENTIAL = ["readme", "install_docs", "test_script", "test_command_docs"];

const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "cargo.lock",
  "poetry.lock",
  "pipfile.lock",
  "go.sum",
]);

const TEST_COMMAND_RE = /npm test|pytest|go test|cargo test|make test/;
const INSTALL_RE = /install/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function validateArgs(args: unknown): {
  files: RepoReadyFile[];
  packageScripts: Record<string, string> | undefined;
  packageScriptsSupplied: boolean;
} {
  const raw: Record<string, unknown> = isRecord(args) ? args : {};

  if (raw.files === undefined) throw new Error("files is required");
  if (!Array.isArray(raw.files) || raw.files.length === 0) {
    throw new Error("files must be a non-empty array");
  }

  const files: RepoReadyFile[] = [];
  const indexByPath = new Map<string, number>();
  raw.files.forEach((entry, i) => {
    const path = `files[${i}]`;
    if (!isRecord(entry)) throw new Error(`${path} must be an object`);
    if (entry.path === undefined) throw new Error(`${path}.path is required`);
    if (typeof entry.path !== "string" || entry.path.length === 0) {
      throw new Error(`${path}.path must be a non-empty string`);
    }
    const firstIndex = indexByPath.get(entry.path);
    if (firstIndex !== undefined) {
      throw new Error(
        `${path}.path duplicates files[${firstIndex}].path "${entry.path}"`,
      );
    }
    indexByPath.set(entry.path, i);
    if (entry.content !== undefined && typeof entry.content !== "string") {
      throw new Error(`${path}.content must be a string`);
    }
    const file: RepoReadyFile = { path: entry.path };
    if (entry.content !== undefined) file.content = entry.content;
    files.push(file);
  });

  let packageScripts: Record<string, string> | undefined;
  let packageScriptsSupplied = false;
  if (raw.package_scripts !== undefined) {
    if (!isRecord(raw.package_scripts)) {
      throw new Error("package_scripts must be an object");
    }
    packageScriptsSupplied = true;
    packageScripts = {};
    for (const [key, value] of Object.entries(raw.package_scripts)) {
      if (typeof value !== "string") {
        throw new Error(`package_scripts.${key} must be a string`);
      }
      packageScripts[key] = value;
    }
  }

  return { files, packageScripts, packageScriptsSupplied };
}

function findReadme(files: RepoReadyFile[]): RepoReadyFile | undefined {
  return files.find((f) => {
    const base = basename(f.path).toLowerCase();
    return base === "readme.md" || base.startsWith("readme.");
  });
}

function readmeContentCheck(
  id: string,
  readme: RepoReadyFile | undefined,
  matches: (content: string) => boolean,
  passDetail: string,
  noMatchDetail: string,
): RepoReadyCheck {
  if (readme === undefined) {
    return { id, status: "fail", detail: "no README file" };
  }
  if (readme.content === undefined) {
    return { id, status: "fail", detail: "README content not supplied" };
  }
  if (matches(readme.content)) {
    return { id, status: "pass", detail: passDetail };
  }
  return { id, status: "fail", detail: noMatchDetail };
}

/** Assess first-contributor readiness from the supplied facts. */
export function assessReadiness(args: unknown): RepoReadyResult {
  const { files, packageScripts, packageScriptsSupplied } = validateArgs(args);

  const readme = findReadme(files);

  const licenseFile = files.find((f) => {
    const base = basename(f.path).toUpperCase();
    return base.startsWith("LICENSE") || base.startsWith("LICENCE");
  });

  const contributingFile = files.find((f) =>
    basename(f.path).toLowerCase().startsWith("contributing"),
  );

  const hasCi = files.some((f) => f.path.startsWith(".github/workflows/"));

  const lockfileFile = files.find((f) =>
    LOCKFILE_NAMES.has(basename(f.path).toLowerCase()),
  );

  const checks: RepoReadyCheck[] = [];

  checks.push(
    readme !== undefined
      ? { id: "readme", status: "pass", detail: `README found at ${readme.path}` }
      : { id: "readme", status: "fail", detail: "no README file" },
  );

  checks.push(
    readmeContentCheck(
      "install_docs",
      readme,
      (content) => INSTALL_RE.test(content),
      "README documents installation",
      "README does not mention installation",
    ),
  );

  if (!packageScriptsSupplied) {
    checks.push({
      id: "test_script",
      status: "fail",
      detail: "package scripts not supplied",
    });
  } else if (
    packageScripts !== undefined &&
    typeof packageScripts.test === "string" &&
    packageScripts.test.length > 0
  ) {
    checks.push({
      id: "test_script",
      status: "pass",
      detail: "a test script is defined",
    });
  } else {
    checks.push({
      id: "test_script",
      status: "fail",
      detail: "no test script is defined",
    });
  }

  checks.push(
    readmeContentCheck(
      "test_command_docs",
      readme,
      (content) => TEST_COMMAND_RE.test(content),
      "README documents a test command",
      "README does not document a test command",
    ),
  );

  checks.push(
    licenseFile !== undefined
      ? {
          id: "license",
          status: "pass",
          detail: `license file found at ${licenseFile.path}`,
        }
      : { id: "license", status: "fail", detail: "no license file" },
  );

  checks.push(
    contributingFile !== undefined
      ? {
          id: "contributing",
          status: "pass",
          detail: `contributing guide found at ${contributingFile.path}`,
        }
      : { id: "contributing", status: "fail", detail: "no contributing guide" },
  );

  checks.push(
    hasCi
      ? { id: "ci", status: "pass", detail: "CI workflows found" }
      : { id: "ci", status: "fail", detail: "no CI workflows" },
  );

  checks.push(
    lockfileFile !== undefined
      ? {
          id: "lockfile",
          status: "pass",
          detail: `lockfile found at ${lockfileFile.path}`,
        }
      : { id: "lockfile", status: "fail", detail: "no lockfile" },
  );

  const passed = checks.filter((c) => c.status === "pass").length;
  const essential_failures = ESSENTIAL.filter((id) =>
    checks.some((c) => c.id === id && c.status === "fail"),
  );

  return {
    checks,
    passed,
    total: 8,
    essential_failures,
    ready: essential_failures.length === 0,
  };
}

/** Render a payload as the JSON text block MCP clients show. */
export function formatPayload(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}
