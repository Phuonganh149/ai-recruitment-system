# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2] - 2026-06-24

### Added

* Added Node.js release-readiness tests under `tests/`.
* Added `docs/DEPLOYMENT.md` with local deployment, Supabase setup, verification, and rollback guidance.
* Added `docs/SECURITY_REVIEW.md` covering secrets, privacy, authorization, dependency hygiene, and known security limitations.
* Added `docs/MANUAL_TEST_REPORT.md` with automated and manual smoke-test evidence.

### Changed

* Expanded `npm test` to run both syntax checks and release-readiness tests.
* Updated CI job naming to reflect release readiness instead of syntax-only verification.
* Updated release documentation coverage for stronger review traceability.

### Known Limitations

* Automated tests do not yet cover full browser or Supabase integration flows.
* Production deployment URL is not included in this prerelease.

## [0.1.1] - 2026-06-24

### Added

* Added `package.json` with `start`, `syntax-check`, and `test` scripts.
* Added GitHub Actions CI workflow for Node.js syntax verification.
* Added `docs/TESTING.md` with automated and manual verification evidence.
* Added `docs/RELEASE_CHECKLIST.md` to standardize future GitHub Releases.

### Changed

* Clarified release readiness for the prototype milestone.
* Updated release preparation materials for better traceability and reproducibility.

### Known Limitations

* Automated checks are currently syntax-level only.
* Supabase-backed flows require external environment configuration.
* AI chatbot features require external API keys.

## [0.1.0] - 2026-06-19

### Added

* Initial project structure for AI Recruitment System.
* Basic recruitment system documentation.
* Repository setup with README and MIT License.
* Initial frontend/backend files for recruitment management.
* Documentation folder for project planning and issue tracking.

### Features Planned

* Company recruitment management.
* Candidate profile and CV management.
* CV analysis using AI.
* AI matching between candidates and job descriptions.
* AI chatbot support for job seekers.

### Notes

This is the first release version of the project.
The release marks the initial development milestone before further feature implementation and system improvement.
