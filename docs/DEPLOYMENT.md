# Deployment Guide

This guide documents the current deployment expectations for the CVMS AI Recruitment System prototype.

## Release Status

`v0.1.2` is a prerelease prototype baseline. It can be reviewed, checked out, started locally, and connected to a configured Supabase project. It is not yet a hardened production deployment.

## Requirements

- Node.js 20 or newer.
- A Supabase project.
- Supabase SQL schema applied from `schema.sql`.
- A private CV storage bucket, for example `private-cvs`.
- Environment variables configured from `.env.example`.

## Environment Variables

Start from:

```bash
cp .env.example .env
```

Minimum local variables:

```env
NODE_ENV=development
PORT=4173
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CV_BUCKET=private-cvs
JWT_SECRET=
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

Do not commit real secrets to GitHub.

## Local Deployment

```bash
git clone https://github.com/Phuonganh149/ai-recruitment-system.git
cd ai-recruitment-system
git checkout v0.1.2
cp .env.example .env
npm test
npm start
```

Open:

```text
http://localhost:4173
```

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `schema.sql`.
4. Create or confirm the private CV bucket.
5. Configure row-level security policies as defined by the schema.
6. Add Supabase URL and keys to `.env`.

## Release Verification

Before publishing a release:

```bash
npm test
```

Confirm GitHub Actions passes for:

- Push to `main`.
- Push tag `v*`.

## Rollback

If a release has a blocking issue:

1. Stop deploying the affected tag.
2. Check out the previous working tag.
3. Restore the previous environment configuration if it changed.
4. Create a GitHub issue describing the failure.
5. Publish a patch release after the fix is verified.

Example:

```bash
git checkout v0.1.1
npm test
npm start
```

## Current Limitations

- No hosted production URL is provided in this release.
- Automated checks cover release readiness and syntax, not complete business-flow integration.
- Supabase and AI-provider behavior depends on external configuration.
