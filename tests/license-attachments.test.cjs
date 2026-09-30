const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(require, module, module.exports);
  return module.exports;
}

const storage = load('src/lib/s3.ts');

test('license attachment validation requires matching allowlisted MIME and extension', () => {
  assert.equal(storage.validateLicenseFile('license.pdf', 'application/pdf', 1024), null);
  assert.equal(storage.validateLicenseFile('evidence.JPG', 'image/jpeg', 1024), null);
  assert.equal(storage.validateLicenseFile('license.exe', 'application/pdf', 1024), 'Unsupported file type');
  assert.equal(storage.validateLicenseFile('license.pdf.exe', 'application/octet-stream', 1024), 'Unsupported file type');
});

test('license attachment validation rejects empty, fractional and oversized files', () => {
  assert.equal(storage.validateLicenseFile('license.pdf', 'application/pdf', 0), 'Invalid file size');
  assert.equal(storage.validateLicenseFile('license.pdf', 'application/pdf', 1.5), 'Invalid file size');
  assert.equal(storage.validateLicenseFile('license.pdf', 'application/pdf', 25 * 1024 * 1024 + 1), 'Invalid file size');
});

test('license object keys remain inside the license prefix and sanitize filenames', () => {
  const key = storage.licenseObjectKey('license-123', '../../ secret license.pdf');
  assert.match(key, /^licenses\/license-123\/[0-9a-f-]+-/);
  assert.equal(key.includes('..'), false);
  assert.equal(key.includes(' '), false);
});
