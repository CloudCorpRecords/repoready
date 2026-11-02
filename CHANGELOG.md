# Changelog

## 0.1.0 (2026-10-27)

- Initial release: `assess_readiness` MCP tool and `assess`
  CLI command scoring first-contributor readiness from
  supplied repo files and package scripts.
- Eight checks in a fixed order — README, install
  documentation, test script, test command documentation,
  license, contributing guide, CI, and lockfile — each with
  its exact pass or fail detail string, plus a passed count,
  the list of failed essential checks, and a `ready` flag
  that is true exactly when no essential check failed.
- The tool assesses supplied facts only: it runs nothing,
  reads no repository, and makes no network calls.
- Path-naming validation errors for malformed input, with
  no partial result on invalid input.
