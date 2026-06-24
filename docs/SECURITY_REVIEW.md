# Security And Privacy Review

This document records the security posture for the `v0.1.2` prerelease.

## Secrets

- Real API keys, OAuth client secrets, JWT secrets, and Supabase service keys must not be committed.
- `.env.example` is a template only.
- GitHub tokens must be revoked if accidentally shared.
- CI does not require production secrets for release-readiness checks.

## Authentication And Authorization

The project documents and prototypes:

- Supabase Auth integration.
- Candidate, company, and administrator role separation.
- Protected company actions.
- Ownership checks for company job management.
- Session handling for authenticated users.

## Privacy

The system handles candidate data and CV files, so production deployment must protect:

- Candidate profiles.
- Uploaded CV files.
- Company unlock history.
- Application status and interview notes.
- Wallet and transaction records.

The schema includes row-level security oriented work for sensitive tables and CV-related data.

## Application Protections

The server source includes:

- Security headers.
- Rate-limiting orientation for write/authentication actions.
- Server-side validation for required fields.
- Environment-based configuration.
- Fallback behavior when AI API keys are not configured.

## Dependency Hygiene

The current release uses Node.js runtime APIs and does not introduce third-party npm runtime dependencies. This reduces dependency surface for the prototype release.

## Known Security Limitations

- No penetration test has been performed.
- No automated dependency vulnerability scan is configured because the current package has no external dependencies.
- OAuth flows require production credentials and redirect URI validation before real deployment.
- File upload scanning and malware checks are future work.
- Full privacy impact assessment is future work.

## Release Gate

Before any production release, the team should add:

- Automated security scanning.
- End-to-end authentication tests.
- Supabase policy tests.
- File upload validation tests.
- A documented incident response process.
