const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
const list = load('src/lib/contract-list.ts');
const now = new Date('2026-09-06T00:00:00Z');
function record(id, days, status = 'ACTIVE', assets = 2) {
  return { id, contractNo: `DEMO-${id}`, serviceDesc: 'Synthetic maintenance', customer: { companyName: 'Example Company' }, startDate: now, endDate: new Date(now.getTime() + days * 86400000), status, _count: { items: assets } };
}
const filters = overrides => list.parseContractListParams(overrides || {});

test('validates query bounds, enums, repeated parameters and real dates', () => {
  const parsed = filters({ page: '-8', pageSize: '999999', sort: '__proto__', order: 'bad', status: ['ACTIVE'], endDate: 'NaN', endFrom: '2026-02-30', endTo: '2026-09-30', search: 'x'.repeat(400) });
  assert.equal(parsed.page, 1); assert.equal(parsed.pageSize, 10); assert.equal(parsed.sort, 'contractNo');
  assert.equal(parsed.status, ''); assert.equal(parsed.endDate, ''); assert.equal(parsed.endFrom, ''); assert.equal(parsed.endTo, '2026-09-30'); assert.equal(parsed.search.length, 300);
  assert.equal(filters({page:'1e99'}).page, 1);
  assert.equal(filters({endFrom:'2026-10-01',endTo:'2026-09-30'}).endTo, '');
});
test('preserves status grace boundaries and separates expiring-soon presentation from Active counts', () => {
  const result = list.prepareContractList([record('a', -31), record('b', -30), record('c', -1), record('d', 0), record('e', 90), record('f', 91), record('g', -100, 'DRAFT')], filters(), now);
  assert.deepEqual(result.counts, {ALL:7, EXPIRED:1, PENDING_RENEWAL:2, ACTIVE:3, DRAFT:1});
  assert.equal(result.matching.find(r=>r.id==='e').label, 'Expiring soon');
  assert.equal(result.matching.find(r=>r.id==='f').label, 'Active');
  assert.equal(result.matching.find(r=>r.id==='g').label, 'Draft');
});
test('status filtering retains the correct All count', () => {
  const result = list.prepareContractList([record('a', 100), record('b', -99)], filters({status:'EXPIRED'}), now);
  assert.equal(result.counts.ALL,2); assert.equal(result.total,1); assert.equal(result.rows[0].id,'b');
});
test('pagination handles empty results, last page, out-of-range page and page sizes', () => {
  const records = Array.from({length:26},(_,i)=>record(String(i),100));
  for (const [params, count, page] of [[{page:'2'},10,2],[{page:'3'},6,3],[{page:'999'},6,3],[{pageSize:'25',page:'2'},1,2],[{pageSize:'50'},26,1]]) {
    const result = list.prepareContractList(records,filters(params),now);
    assert.equal(result.rows.length,count); assert.equal(result.page,page);
  }
  const empty = list.prepareContractList([],filters({page:'99'}),now);
  assert.equal(empty.page,1); assert.equal(empty.totalPages,1); assert.equal(empty.total,0);
});
test('sorts asset counts numerically and uses deterministic ties', () => {
  const rows = [record('z',100,'ACTIVE',20), record('b',100,'ACTIVE',2), record('a',100,'ACTIVE',2)];
  assert.deepEqual(list.prepareContractList(rows,filters({sort:'assets',order:'asc'}),now).rows.map(r=>r.id),['a','b','z']);
});
test('search retains serial, PO and related record predicates with soft-delete filter', () => {
  const where = list.contractListWhere(filters({search:'example', customer:'demo-customer', assets:'without',endDate:'30',endFrom:'2026-09-01',endTo:'2026-09-30'}),now);
  assert.equal(where.deletedAt,null); assert.equal(where.customerId,'demo-customer'); assert.deepEqual(where.items,{none:{}});
  assert.equal(where.AND.length,3); assert.ok(JSON.stringify(where.OR).includes('serialNumber')); assert.ok(JSON.stringify(where.OR).includes('poNo'));
  assert.equal(where.AND[2].endDate.lte.toISOString(),'2026-09-30T16:59:59.999Z');
});
test('page numbers match reference and remain bounded for large lists', () => {
  assert.deepEqual(list.contractPageNumbers(1,26),[1,2,3,4,5,26]);
  assert.deepEqual(list.contractPageNumbers(1,4),[1,2,3,4]);
  assert.deepEqual(list.contractPageNumbers(26,26),[1,22,23,24,25,26]);
});
test('navigation preserves filters and encodes arbitrary search text safely', () => {
  const query = new URLSearchParams(list.contractListQuery(filters({search:'a&status=EXPIRED',customer:'demo'}),{page:2}));
  assert.equal(query.get('search'),'a&status=EXPIRED'); assert.equal(query.get('status'),null); assert.equal(query.get('customer'),'demo'); assert.equal(query.get('page'),'2');
});
test('CSV escapes quoting and formulas without changing negative numeric day counts', () => {
  assert.equal(list.contractCsvCell('=1+1'),'"\'=1+1"'); assert.equal(list.contractCsvCell('\t@SUM(1)'),'"\'\t@SUM(1)"');
  assert.equal(list.contractCsvCell('a,"b"'),'"a,""b"""'); assert.equal(list.contractCsvCell(-31),'"-31"');
});
function exportRoute(session, records = []) {
  const calls = {queries:[],audits:[]};
  const route = load('src/app/api/contracts/export/route.ts', {
    '@/lib/auth': {auth:async()=>session}, '@/lib/rbac': {hasPermission:role=>role==='ADMIN'},
    '@/lib/contract-list': list,
    '@/lib/prisma': {contract:{findMany:async query=>{calls.queries.push(query);return records;}},auditLog:{create:async data=>{calls.audits.push(data);}}},
  });
  return {calls, get:query=>route.GET({nextUrl:new URL(`http://localhost/api/contracts/export?${query}`)})};
}
test('export rejects unauthenticated/unauthorized access before querying data',async()=>{
  for (const [session,status] of [[null,401],[{user:{id:'test',role:'VIEWER'}},403]]) {
    const api=exportRoute(session); assert.equal((await api.get('format=csv')).status,status); assert.equal(api.calls.queries.length,0);
  }
});
test('export validates format and selection before querying',async()=>{
  const api=exportRoute({user:{id:'test',role:'ADMIN'}});
  for (const query of ['format=pdf','format=csv&selected=','format=csv&selected=bad%2Fid']) assert.equal((await api.get(query)).status,400);
  assert.equal(api.calls.queries.length,0);
});
test('CSV export uses the same filter, selection scope, audit and safe cells',async()=>{
  const demo=record('a',100); demo.serviceDesc='=1+1';
  const api=exportRoute({user:{id:'test',role:'ADMIN'}},[demo]);
  const response=await api.get('format=csv&selected=a&customer=demo');
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(api.calls.queries[0].where.id,{in:['a']}); assert.equal(api.calls.queries[0].where.customerId,'demo');
  assert.equal(api.calls.audits.length,1); assert.ok((await response.text()).includes("'=1+1"));
});
test('XLSX export stores untrusted text as a string rather than a formula',async()=>{
  const XLSX=require('xlsx'); const demo=record('a',100); demo.serviceDesc='=1+1';
  const api=exportRoute({user:{id:'test',role:'ADMIN'}},[demo]);
  const response=await api.get('format=xlsx'); assert.equal(response.status,200);
  const wb=XLSX.read(Buffer.from(await response.arrayBuffer()),{type:'buffer'});
  assert.equal(wb.Sheets.Contracts.C2.v,'=1+1'); assert.equal(wb.Sheets.Contracts.C2.t,'s'); assert.equal(wb.Sheets.Contracts.C2.f,undefined);
});
