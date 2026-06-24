import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

async function fileExists(path) {
  await access(path, constants.R_OK);
}

async function text(path) {
  return readFile(path, 'utf8');
}

test('release-critical files are present', async () => {
  const requiredFiles = [
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    '.env.example',
    'package.json',
    '.github/workflows/ci.yml',
    'docs/TESTING.md',
    'docs/RELEASE_CHECKLIST.md',
    'docs/DEPLOYMENT.md',
    'docs/SECURITY_REVIEW.md',
    'docs/MANUAL_TEST_REPORT.md',
    'docs/srs/SRS_DOCUMENTATION.md',
    'docs/api/API_CONTRACT.md',
    'docs/backend/BACKEND_ARCHITECTURE.md',
    'docs/database/DATABASE_DESIGN.md',
    'docs/ai/AI_RESEARCH_SOLUTION.md'
  ];

  await Promise.all(requiredFiles.map(fileExists));
});

test('package metadata exposes repeatable release commands', async () => {
  const pkg = JSON.parse(await text('package.json'));

  assert.equal(pkg.version, '0.1.2');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.scripts.start, 'node serve.mjs');
  assert.match(pkg.scripts.test, /test:syntax/);
  assert.match(pkg.scripts.test, /test:readiness/);
});

test('environment template documents required keys without real secrets', async () => {
  const env = await text('.env.example');
  const requiredKeys = [
    'NODE_ENV=',
    'PORT=',
    'DATABASE_URL=',
    'SUPABASE_URL=',
    'SUPABASE_ANON_KEY=',
    'SUPABASE_SERVICE_ROLE_KEY=',
    'JWT_SECRET=',
    'OPENAI_API_KEY='
  ];

  for (const key of requiredKeys) {
    assert.match(env, new RegExp(`^${key}`, 'm'));
  }

  assert.doesNotMatch(env, /github_pat_/i);
  assert.doesNotMatch(env, /sk-[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(env, /eyJ[A-Za-z0-9_-]{20,}/);
});

test('server source contains core API, security, and validation cues', async () => {
  const server = await text('serve.mjs');

  const expectedPatterns = [
    /X-Content-Type-Options/i,
    /rate/i,
    /sendJson/i,
    /\/api\/jobs/i,
    /\/api\/chat/i,
    /\/api\/applications/i,
    /SUPABASE_URL/,
    /GROQ_API_KEY|ANTHROPIC_API_KEY/,
    /Server-side validation/i
  ];

  for (const pattern of expectedPatterns) {
    assert.match(server, pattern);
  }
});

test('documentation covers setup, testing, deployment, and known limitations', async () => {
  const readme = await text('README.md');
  const testing = await text('docs/TESTING.md');
  const deployment = await text('docs/DEPLOYMENT.md');
  const security = await text('docs/SECURITY_REVIEW.md');
  const manual = await text('docs/MANUAL_TEST_REPORT.md');

  assert.match(readme, /npm start/);
  assert.match(readme, /npm test/);
  assert.match(testing, /Automated Checks/);
  assert.match(testing, /Manual Smoke Test Checklist/);
  assert.match(deployment, /Environment Variables/);
  assert.match(deployment, /Rollback/);
  assert.match(security, /Secrets/);
  assert.match(security, /Privacy/);
  assert.match(manual, /v0\.1\.2/);
  assert.match(manual, /Pass/);
});
