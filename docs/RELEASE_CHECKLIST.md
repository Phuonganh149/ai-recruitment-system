# Release Checklist

Use this checklist before publishing a GitHub Release.

## Versioning

- Confirm the release tag follows the `vMAJOR.MINOR.PATCH` pattern.
- Confirm the tag points to the commit that was tested.
- Confirm the release is marked as prerelease when the product is not production-ready.
- Confirm `package.json` version matches the intended release version.
- Update `CHANGELOG.md` with the release date and notable changes.

## Documentation

- Confirm README setup instructions match the source tree at the release tag.
- Confirm `.env.example` contains all required configuration keys with no real secrets.
- Link important docs in the release notes:
  - SRS
  - Use cases
  - API contract
  - Backend architecture
  - Database design
  - AI research
  - Testing evidence

## Build And Test

- Run `npm test` locally.
- Confirm GitHub Actions passes for the release commit or tag.
- Record manual smoke test results in `docs/TESTING.md` or release notes.

## Traceability

- Link issues, pull requests, and milestones in the release notes.
- Mention the target commit SHA in the release notes.
- Include known limitations and next steps.

## Security

- Search for committed secrets before publishing.
- Confirm API keys are only documented as environment variables.
- Confirm privacy/security-sensitive flows are documented.

## Assets

- Attach build artifacts only when they are useful for users.
- If the release is source-only, state that clearly in the release notes.
