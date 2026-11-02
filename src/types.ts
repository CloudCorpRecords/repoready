/**
 * repoready types.
 *
 * repoready scores whether a repository is ready for a first
 * contributor: can a newcomer install it and run one test in
 * under ten minutes? The caller supplies the repo facts —
 * the file list (with the README's content when available)
 * and, optionally, the package.json scripts as a
 * string-to-string map. From those facts alone, as pure
 * local computation, repoready reports:
 *
 *   - eight checks in a fixed order, each with a status and
 *     an exact detail string
 *   - how many of the eight checks passed
 *   - which of the four essential checks failed
 *   - a ready flag that is true exactly when no essential
 *     check failed
 *
 * The assessment is advice from supplied facts, not action:
 * nothing here opens a repository, runs a command, or reads
 * a file the caller did not supply.
 */

/** One repo file to assess, as supplied by the caller. */
export interface RepoReadyFile {
  /** Repo-relative file path; unique across the set. */
  path: string;
  /** File content; used for the README checks when supplied. */
  content?: string;
}

/** The status of one readiness check. */
export type RepoReadyCheckStatus = "pass" | "fail";

/** One readiness check: its id, its status, and its detail. */
export interface RepoReadyCheck {
  /** Check id, one of the eight pinned ids. */
  id: string;
  /** Whether the check passed. */
  status: RepoReadyCheckStatus;
  /** The exact detail string for this outcome. */
  detail: string;
}

/** The first-contributor readiness assessment. */
export interface RepoReadyResult {
  /** The eight checks, in the pinned fixed order. */
  checks: RepoReadyCheck[];
  /** How many checks passed. */
  passed: number;
  /** Total number of checks; always 8. */
  total: number;
  /**
   * The essential check ids that failed, in check order.
   * The essential checks are readme, install_docs,
   * test_script, and test_command_docs.
   */
  essential_failures: string[];
  /** True exactly when essential_failures is empty. */
  ready: boolean;
}
