# Testing Evidence

This document records the verification scope for the `v0.1.1` release.

## Automated Checks

The repository includes a GitHub Actions workflow at `.github/workflows/ci.yml`.

The workflow runs on:

- Pull requests targeting `main`.
- Pushes to `main`.
- Version tags matching `v*`.

Current automated command:

```bash
npm test
```

The `npm test` script runs syntax checks for the project entry points:

```bash
npm run syntax-check
```

Files covered by syntax checks:

- `serve.mjs`
- `db-adapter.mjs`
- `data.js`
- `dashboard.js`

## Local Verification

Before publishing `v0.1.1`, the following checks should pass locally:

```bash
node --check serve.mjs
node --check db-adapter.mjs
node --check data.js
node --check dashboard.js
npm test
```

## Manual Smoke Test Checklist

Use this checklist when validating a release candidate:

- Start the server with `npm start`.
- Open `http://localhost:4173`.
- Confirm `login.html` loads without a blank page.
- Confirm `dashboard.html` loads static assets correctly.
- Confirm public job data renders from the available data source.
- Confirm required environment variables are documented in `.env.example`.
- Confirm no real API keys, database passwords, or access tokens are committed.
- Confirm candidate/company/admin role flows are documented in README and `/docs`.

## Current Limitations

- The project currently has syntax-level automated checks, not full unit or integration tests.
- Supabase-backed flows require a configured Supabase project and environment variables.
- AI chatbot responses require external AI API keys.
- Browser-level end-to-end tests are planned for a later release.
