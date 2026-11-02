# repoready — Build Report

MCP Rebuild 1000, Batch 16. Original program build from the
packages-100 plan (cluster D #40), built from the spec in
`~/workspace/mcp-rebuild-100/specs-batch16/repoready.md`
(read first). There is no external original; the tool surface
is the program's defined spec. Local build only — nothing
pushed or published.

Identity: repo `repoready`, npm `@reneturcios/repoready`,
MCP name `io.github.CloudCorpRecords/repoready`, version
`0.1.0`, bin `repoready` → `dist/cli.js`.

## Files created (19/19 per TEMPLATE.md checklist)

- `package.json`, `server.json` (description "Score
  first-contributor readiness: README, install and test
  docs, license, CI, lockfile." — 88 chars, verified; npm
  entry carries `version: 0.1.0`; OCI entry
  `ghcr.io/cloudcorprecords/repoready:0.1.0` carries **no**
  `version` field), `Dockerfile` (node:20-alpine two-stage,
  label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/repoready"`),
  `tsconfig.json`, `.gitignore`, `LICENSE` (MIT, Copyright
  (c) 2026 Rene Turcios), `README.md` (fresh text),
  `CHANGELOG.md` (single 0.1.0 entry, 2026-10-27),
  `package-lock.json` (Route 3, see below)
- `src/index.ts`, `src/cli.ts` (`assess --input <args.json>`
  where the file holds the full arguments object, `mcp`,
  `--version`; exit 2 usage / 1 runtime error, argument
  validation before any file read), `src/mcp.ts`,
  `src/types.ts`, `src/repoready.ts` (core,
  `VERSION = "0.1.0"`)
- `test/repoready.test.ts`
- `.github/workflows/{ci,publish,publish-container,registry-publish}.yml`
  (publish-container `IMAGE = ghcr.io/cloudcorprecords/repoready`,
  smoke-test server-name assertion `repoready`)

Plus the parity fixture at
`harness/fixtures/repoready-tools-original.json` (`_source`
labelled as a program spec from the packages-100 plan,
cluster D #40).

## Tools implemented (1)

- `assess_readiness` — arguments: `files` (array, required,
  minItems 1) of `{path (string, required, non-empty,
  unique), content (string, optional)}`, plus
  `package_scripts` (object, optional; every value must be
  a string).

  The README is the first file in input order whose
  basename lowercased is `readme.md` or starts with
  `readme.`. Basename matching is case-insensitive. The
  eight checks run in the spec's fixed order, each with its
  exact detail strings: (1) `readme` — "README found at
  <path>" / "no README file"; (2) `install_docs` — README
  content matches /install/i: "README documents
  installation" / "no README file" / "README content not
  supplied" / "README does not mention installation";
  (3) `test_script` — "a test script is defined" /
  "package scripts not supplied" / "no test script is
  defined"; (4) `test_command_docs` — README content matches
  /npm test|pytest|go test|cargo test|make test/: "README
  documents a test command" / "no README file" / "README
  content not supplied" / "README does not document a test
  command"; (5) `license` — basename uppercased starts with
  LICENSE or LICENCE: "license file found at <path>" (first
  in input order) / "no license file"; (6) `contributing` —
  basename lowercased starts with "contributing":
  "contributing guide found at <path>" (first) / "no
  contributing guide"; (7) `ci` — a path starting with
  ".github/workflows/": "CI workflows found" / "no CI
  workflows"; (8) `lockfile` — basename one of
  package-lock.json, yarn.lock, pnpm-lock.yaml, Cargo.lock,
  poetry.lock, Pipfile.lock, go.sum: "lockfile found at
  <path>" (first) / "no lockfile".

  Returns `{checks, passed, total, essential_failures,
  ready}`: passed counts the passing checks, total is 8,
  essential_failures lists the failed essential ids
  (readme, install_docs, test_script, test_command_docs) in
  check order, and ready is true exactly when
  essential_failures is empty. The tool assesses supplied
  facts only — it runs nothing.

  The fixture literal
  (`harness/fixtures/repoready-tools-original.json`) and the
  `src/mcp.ts` literal are identical, with no `$schema` and
  no top-level `additionalProperties` — confirmed by the
  parity run below.

## Implementation notes

- `src/mcp.ts` uses the SDK's low-level `Server` with an
  explicit inputSchema literal exactly matching the
  fixture, per the standing fleet rule (no McpServer/zod
  schema conversion). Every `tools/call` is validated by
  the core itself, so the MCP and CLI paths share one
  validation implementation; the core takes the full
  arguments object (`{files, package_scripts?}`).
- Validation is path-naming and total: missing/empty/
  non-array `files`, a file entry that is not an object, a
  missing/empty/non-string or duplicated `path` (the error
  names the second occurrence's path, e.g.
  `files[2].path duplicates files[0].path "dup.txt"`),
  `content` present but not a string, or `package_scripts`
  present but not an object or holding a non-string value
  (naming `package_scripts.<key>`) throws an Error naming
  the offending path and produces no partial result (MCP:
  `isError`; CLI: exit 1).

## Verification (foreground, this session)

- `npm test` (`tsx --test test/*.test.ts`): **48 tests,
  48 pass, 0 fail** — dedicated tests for each of the eight
  checks with its exact pass detail and every distinct fail
  detail; README selection as first in input order
  (including its content driving the doc checks);
  install_docs and test_command_docs fail-detail precedence
  (no README vs content not supplied vs no match, plus
  empty-string content counting as supplied); test_command
  forms npm test / pytest / go test / cargo test / make
  test; test_script with package_scripts absent vs supplied
  with no test key (including an empty map) vs an empty test
  value; license LICENCE/LICENSE forms and first-in-order;
  contributing first-in-order; the CI prefix requiring the
  trailing-slash form ".github/workflows/" (bare
  ".github/workflows" and a nested prefix both fail); every
  name in the lockfile set, first-in-order, and near-miss
  rejections; a full exact-result match for a complete repo;
  check order, total 8, passed counting,
  essential_failures ordering (full and partial sets), and
  ready true when only non-essential checks fail; and every
  validation path (missing/empty/non-array `files`,
  non-object entry, missing/empty/non-string path,
  duplicate path naming the second occurrence, non-string
  content, package_scripts not an object and holding a
  non-string value naming its key, and no partial result on
  invalid input).
- `npx tsc --noEmit` → exit 0; `npm run build` → exit 0,
  `dist/` present with all 15 outputs, verified directly on
  disk after the build.
- `dist/cli.js --version` → `0.1.0`; unknown command and
  `assess` with no `--input` exit 2 with usage;
  `assess --input <missing file>` exits 1 naming the file;
  `assess --input <valid file>` exits 0 and prints the
  assessment JSON (verified against a hand-checked set:
  README/install/test-script/test-docs/license/lockfile
  pass, contributing and CI fail, passed 6, ready true);
  `assess --input <invalid file>` exits 1 with
  `files[1].path duplicates files[0].path "a.ts"`.
- Parity: `harness/parity.py` vs
  `harness/fixtures/repoready-tools-original.json` →
  **PASS, parity 100.0, identical_tools 1/1** (run with
  the rebuild path as an absolute path; the harness does
  not expand a `~` inside the quoted stdio command
  string). Report saved under `parity-out/`.

## Lockfile status

`package-lock.json` generated clean via Route 3 (in the
build dir with no `node_modules` present, offline
`npm install --package-lock-only --ignore-scripts
--offline`), verified: parses, name
`@reneturcios/repoready`, **128 package entries**
(`@modelcontextprotocol/sdk` 1.32.2, `zod` 3.25.76,
`tsx` 4.23.15, `typescript` 5.9.3, `@types/node` 20.19.43).

## Gaps / honest notes

- **Pinned judgement calls** (each with a dedicated test
  where noted): (1) the spec describes `package_scripts`
  as a string-to-string map but gives no literal JSON
  Schema fragment for it; the schema uses
  `additionalProperties: {type: "string"}`, the standard
  map representation, identically in the fixture and in
  `src/mcp.ts`; (2) lockfile basename comparison is
  case-insensitive, following the spec's "basename
  matching below is case-insensitive" (the set itself mixes
  cases: Cargo.lock, Pipfile.lock); (3) a `test` value
  counts as defined when it is a non-empty string in the
  literal sense (length > 0); whitespace-only was not
  special-cased, as the spec does not trim; (4) the
  install match is case-insensitive (/install/i) and the
  test-command match is case-sensitive, exactly as the
  spec's two regexes are written; (5) validation order —
  `files` entries are validated before `package_scripts`,
  so a bad file is reported even when `package_scripts` is
  also malformed; (6) unknown extra fields, at the top
  level and per file, are ignored rather than rejected
  (the spec does not forbid them); (7) a non-object
  top-level arguments value is treated as an empty object,
  so it fails as `files is required`; (8) duplicate-path
  wording is not fixed by the spec (only that the error
  names the second occurrence's path); the message used is
  `files[<i>].path duplicates files[<first>].path "<path>"`,
  matching the fleet pattern. No other spec ambiguity was
  found in the core behaviour.
- Container build not exercised locally; the
  publish-container workflow smoke-tests the image at
  publish time.
- Nothing pushed or published; this is a local build only.
