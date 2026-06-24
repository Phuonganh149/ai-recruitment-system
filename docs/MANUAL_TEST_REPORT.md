# Manual Test Report

## Release

- Version: `v0.1.2`
- Release type: prerelease prototype
- Date: 2026-06-24
- Scope: local source validation, release readiness, documentation, and smoke-test checklist

## Environment

- Operating system: Windows development machine
- Runtime: Node.js 24.16.0 locally
- CI runtime: GitHub Actions with Node.js 20

## Automated Results

| Check | Command | Result |
| --- | --- | --- |
| JavaScript syntax | `npm run test:syntax` | Pass |
| Release readiness tests | `npm run test:readiness` | Pass |
| Full project test command | `npm test` | Pass |

## Manual Smoke Test Checklist

| Area | Expected Result | Status | Notes |
| --- | --- | --- | --- |
| Repository checkout | `git checkout v0.1.2` works | Pass | Tag is intended for release review |
| Environment template | `.env.example` exists and contains required keys | Pass | Real secret values are not included |
| README setup | README documents requirements, setup, run, and test commands | Pass | Uses actual Node.js source structure |
| CI workflow | GitHub Actions workflow exists | Pass | Runs `npm test` |
| Testing evidence | `docs/TESTING.md` exists | Pass | Includes automated and manual scope |
| Deployment guide | `docs/DEPLOYMENT.md` exists | Pass | Includes local deployment and rollback |
| Security notes | `docs/SECURITY_REVIEW.md` exists | Pass | Covers secrets, privacy, and limitations |
| Release checklist | `docs/RELEASE_CHECKLIST.md` exists | Pass | Documents release governance |

## Known Gaps

- Browser automation is not included yet.
- Supabase integration tests require a configured external test project.
- AI chatbot live-provider tests require API keys and cost controls.
- No production deployment URL is available.

## Result

The release is acceptable as a prerelease academic prototype with repeatable local checks, CI verification, release documentation, and explicit limitations.
