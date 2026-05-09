// test-security.mjs
// รัน: node test-security.mjs
// ต้องเปิด dev server ก่อน: npm run dev

const BASE = "http://localhost:3000";

const results = [];

async function check(label, fn, expectStatus) {
  try {
    const res = await fn();
    const pass = res.status === expectStatus;
    results.push({ label, pass, got: res.status, expected: expectStatus });
    console.log(`${pass ? "✅" : "❌"} [${res.status}] ${label}`);
  } catch (e) {
    results.push({ label, pass: false, got: "ERROR", expected: expectStatus });
    console.log(`❌ [ERROR] ${label} — ${e.message}`);
  }
}

console.log("\n=== Security Tests — iTAS BackOffice ===\n");
console.log("Target:", BASE);
console.log("\n--- No Auth → ทุกอันต้องได้ 401 ---");

await check("GET /api/customers (no auth)", () =>
  fetch(`${BASE}/api/customers`), 401);

await check("POST /api/customers (no auth)", () =>
  fetch(`${BASE}/api/customers`, { method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName: "Test" }) }), 401);

await check("GET /api/licenses (no auth)", () =>
  fetch(`${BASE}/api/licenses`), 401);

await check("POST /api/licenses (no auth)", () =>
  fetch(`${BASE}/api/licenses`, { method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}) }), 401);

await check("GET /api/notifications (no auth)", () =>
  fetch(`${BASE}/api/notifications`), 401);

await check("PATCH /api/assets/fake-id (no auth)", () =>
  fetch(`${BASE}/api/assets/fake-id`, { method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brand: "Cisco" }) }), 401);

await check("POST /api/admin/reset-data (no auth) ← Critical", () =>
  fetch(`${BASE}/api/admin/reset-data`, { method: "POST" }), 401);

await check("GET /api/customers/fake-id (no auth)", () =>
  fetch(`${BASE}/api/customers/fake-id`), 401);

await check("DELETE /api/customers/fake-id (no auth)", () =>
  fetch(`${BASE}/api/customers/fake-id`, { method: "DELETE" }), 401);

console.log("\n--- Health check → ต้องได้ 200 ---");

await check("GET /api/health", () =>
  fetch(`${BASE}/api/health`), 200);

console.log("\n--- Validation → ต้องได้ 400 (bad input) ---");
// Note: endpoints ด้านล่างต้องการ auth จริง แต่จะ 401 ก่อนถึง validation
// ถ้า login แล้ว cookie จะทดสอบ validation ต่อได้

console.log("\n=== Summary ===");
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`Passed: ${passed}/${results.length}`);
if (failed > 0) {
  console.log("\nFailed tests:");
  results.filter(r => !r.pass).forEach(r =>
    console.log(`  ❌ ${r.label} — got ${r.got}, expected ${r.expected}`)
  );
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed! Ready to deploy.");
}
