# repoready

A repository can be technically excellent and still lose its
first contributor in the first ten minutes: no README to
orient them, no install steps to follow, no test command to
prove the setup worked. repoready scores that first
experience — **from the facts you supply, running nothing**.

You hand it the repo's file list (with the README's content
when you have it) and, optionally, the package.json scripts.
It hands back eight checks in a fixed order, each with a
pass or fail and an exact detail string:

- **readme** — a README exists
- **install_docs** — the README documents installation
- **test_script** — a `test` script is defined
- **test_command_docs** — the README documents a test command
- **license** — a license file is present
- **contributing** — a contributing guide is present
- **ci** — CI workflows are present under `.github/workflows/`
- **lockfile** — a known lockfile is present

The first four checks are essential. Alongside the checks,
the result counts how many passed (out of 8), lists the
essential checks that failed in check order, and sets
`ready` to true exactly when no essential check failed. A
repo can therefore score well on the supporting checks —
license, contributing guide, CI, lockfile — and still be
honestly marked not ready because a newcomer cannot install
it or cannot run a test.

The README is the first file in input order whose basename,
lowercased, is `readme.md` or starts with `readme.`. When
its content was not supplied, the two documentation checks
say so plainly (`README content not supplied`) rather than
guessing from its name. Basename matching is
case-insensitive throughout, CI requires the exact
`.github/workflows/` path prefix, and the lockfile check
recognises `package-lock.json`, `yarn.lock`,
`pnpm-lock.yaml`, `Cargo.lock`, `poetry.lock`,
`Pipfile.lock`, and `go.sum`.

Malformed input — a missing or empty file list, a missing,
empty, or duplicated file path, a non-string `content`, or
a `package_scripts` value that is not a string — is a
validation error naming the offending path, and no partial
assessment is produced. The computation is pure and local:
no network, no configuration, and nothing is executed.

## CLI

```bash
npx @reneturcios/repoready assess --input args.json
npx @reneturcios/repoready --version
```

`args.json` contains the full arguments object:

```json
{
  "files": [
    { "path": "README.md", "content": "# Demo\n\n## Install\n\nnpm install\n\nRun npm test to verify.\n" },
    { "path": "LICENSE" },
    { "path": "CONTRIBUTING.md" },
    { "path": ".github/workflows/ci.yml" },
    { "path": "package-lock.json" }
  ],
  "package_scripts": { "test": "node --test", "build": "tsc" }
}
```

The assessment is printed as JSON:

```json
{
  "checks": [
    { "id": "readme", "status": "pass", "detail": "README found at README.md" },
    { "id": "install_docs", "status": "pass", "detail": "README documents installation" },
    { "id": "test_script", "status": "pass", "detail": "a test script is defined" },
    { "id": "test_command_docs", "status": "pass", "detail": "README documents a test command" },
    { "id": "license", "status": "pass", "detail": "license file found at LICENSE" },
    { "id": "contributing", "status": "pass", "detail": "contributing guide found at CONTRIBUTING.md" },
    { "id": "ci", "status": "pass", "detail": "CI workflows found" },
    { "id": "lockfile", "status": "pass", "detail": "lockfile found at package-lock.json" }
  ],
  "passed": 8,
  "total": 8,
  "essential_failures": [],
  "ready": true
}
```

Exit codes: `0` on success, `1` on a runtime error (including
an unreadable or invalid input file, or invalid input), `2`
on a usage error.

## MCP server

```bash
npx -y @reneturcios/repoready mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "repoready": {
      "command": "npx",
      "args": ["-y", "@reneturcios/repoready", "mcp"]
    }
  }
}
```

### Tools

- `assess_readiness` — Assess first-contributor readiness
  from repo files and package scripts.
  - `files` (array, required, at least one) — files as
    `{path, content?}` objects; `path` is unique across the
    set and `content` is used for the README checks
  - `package_scripts` (object, optional) — package.json
    scripts as a string-to-string map

  Returns `{checks, passed, total, essential_failures, ready}`.

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/repoready
docker run --rm -v "$PWD:/w" ghcr.io/cloudcorprecords/repoready assess --input /w/args.json
```

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # tsx --test test/*.test.ts (pure local, no network)
npm run dev     # run the CLI from source
```

## License

MIT — Copyright (c) 2026 Rene Turcios
