const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}

const policy = load("src/lib/password-policy.ts");

test("permanent passwords require strong 12-character values", () => {
  assert.match(policy.validatePassword("Short1!"), /at least 12/);
  assert.equal(policy.validatePassword("LongEnough1!pass"), null);
});

test("temporary passwords allow strong 10-character values", () => {
  assert.equal(policy.validateTemporaryPassword("TempPass1!"), null);
  assert.match(policy.validateTemporaryPassword("alllowercase1!"), /uppercase/);
});

test("user management endpoints enforce permissions and forced password changes", () => {
  const users = fs.readFileSync(path.join(__dirname, "..", "src/app/api/users/route.ts"), "utf8");
  const reset = fs.readFileSync(path.join(__dirname, "..", "src/app/api/users/[id]/reset-password/route.ts"), "utf8");
  const change = fs.readFileSync(path.join(__dirname, "..", "src/app/api/auth/change-password/route.ts"), "utf8");
  assert.match(users, /"user:write"/);
  assert.match(users, /endsWith\("@i-tas\.co\.th"\)/);
  assert.match(reset, /"user:write"/);
  assert.match(reset, /mustChangePassword: true/);
  assert.match(change, /bcrypt\.compare/);
  assert.match(change, /mustChangePassword: false/);
});
