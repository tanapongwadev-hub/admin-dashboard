/** Local demo data only. Run: node scripts/seed-mock-materials.mjs
 * Uses the application APIs (including image staging and BOM activation).
 * Does not overwrite existing records or create inventory receipts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/mock-materials');
const marker = 'MOCK-MATERIALS-3-PAIRS-20261011';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');

async function envFile(filename) {
  const text = await fs.readFile(filename, 'utf8');
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return [];
    let value = match[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
}

const appEnv = await envFile(path.join(root, '.env.local'));
const backendEnv = await envFile(path.join(root, '../cps-api/.env'));
const base = appEnv.API_BASE_URL?.replace(/\/$/, '');
if (!base || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) {
  throw new Error('This seed only supports a loopback API_BASE_URL.');
}
let token;
async function api(route, method = 'GET', body) {
  const multipart = body instanceof FormData;
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`${method} ${route}: ${response.status} ${JSON.stringify(error.message ?? 'Request failed')}`);
  }
  return response.status === 204 ? undefined : response.json();
}

let login = await api('/auth/login', 'POST', {
  username: process.env.MOCK_USERNAME ?? backendEnv.INITIAL_SUPER_ADMIN_USERNAME,
  password: process.env.MOCK_PASSWORD ?? backendEnv.INITIAL_SUPER_ADMIN_PASSWORD,
});
if (login.requiresDepartmentSelection) {
  const assignment = login.departments.find((entry) => entry.roleCode === 'SUPER_ADMIN') ?? login.departments[0];
  if (!assignment) throw new Error('No department assignment is available.');
  login = await api('/auth/select-department', 'POST', { departmentSelectionToken: login.departmentSelectionToken, userDepartmentRoleId: assignment.userDepartmentRoleId });
}
token = login.data?.authentication?.accessToken;
if (!token) throw new Error('Login did not return an access token.');

const lookups = await api('/materials/lookups');
console.log('Available units:', lookups.units.map(({ id, code, nameTh, nameEn }) => ({ id, code, name: nameTh ?? nameEn })));
if (process.argv.includes('--inspect')) process.exit(0);

const pairs = [
  { shape: 'PIPE', ratio: 20, mainCode: 'MOCK-MAIN-PIPE-001', subCode: 'MOCK-SUB-PIPE-001', mainName: 'ท่อเหล็กกลม SS400 Ø32 × 2.0 × 6000 มม. (ตัวอย่าง)', subName: 'ปลอกท่อเหล็กตัด Ø32 × 2.0 × 300 มม. (ตัวอย่าง)', mainSpec: 'SS400 · OD 32 mm · thickness 2.0 mm · length 6000 mm', subSpec: 'SS400 · OD 32 mm · thickness 2.0 mm · cut length 300 mm', packing: 20, unitCodes: ['PIPE', 'LEN', 'BAR', 'ท่อน'], color: '#0284c7' },
  { shape: 'SHEET', ratio: 8, mainCode: 'MOCK-MAIN-SHEET-001', subCode: 'MOCK-SUB-SHEET-001', mainName: 'แผ่นเหล็ก SPCC 2.0 × 1000 × 2000 มม. (ตัวอย่าง)', subName: 'แผ่นยึดเหล็กตัด SPCC 2.0 × 500 × 500 มม. (ตัวอย่าง)', mainSpec: 'SPCC · thickness 2.0 mm · width 1000 mm · length 2000 mm', subSpec: 'SPCC · thickness 2.0 mm · 500 × 500 mm · 4 mounting holes', packing: 10, unitCodes: ['SHEET', 'PLATE', 'แผ่น'], color: '#7c3aed' },
  { shape: 'COIL', ratio: 100, mainCode: 'MOCK-MAIN-COIL-001', subCode: 'MOCK-SUB-COIL-001', mainName: 'คอยล์เหล็กชุบสังกะสี SGCC 0.8 × 100 มม. (ตัวอย่าง)', subName: 'คลิปยึดเหล็กชุบสังกะสี SGCC 0.8 × 30 × 100 มม. (ตัวอย่าง)', mainSpec: 'SGCC · thickness 0.8 mm · strip width 100 mm · demo coil yield 100 pieces', subSpec: 'SGCC · thickness 0.8 mm · 30 × 100 mm · formed U-clip', packing: 50, unitCodes: ['COIL', 'ROLL', 'ม้วน'], color: '#0d9488' },
];

function illustration(pair, sub) {
  const object = pair.shape === 'PIPE'
    ? `<g transform="translate(${sub ? 250 : 125} 270)"><path d="M80 20 L${sub ? 520 : 800} 90 L${sub ? 520 : 800} 230 L80 160Z" fill="url(#metal)"/><ellipse cx="80" cy="90" rx="60" ry="82" fill="#64748b"/><ellipse cx="80" cy="90" rx="43" ry="61" fill="#17263b"/><ellipse cx="${sub ? 520 : 800}" cy="160" rx="60" ry="82" fill="#94a3b8"/><ellipse cx="${sub ? 520 : 800}" cy="160" rx="42" ry="60" fill="#25364a"/></g>`
    : pair.shape === 'SHEET'
      ? `<g transform="translate(130 210)"><path d="M40 290L${sub ? 450 : 620} 55L900 170L${sub ? 490 : 280} 405Z" fill="url(#metal)" stroke="#64748b" stroke-width="4"/><path d="M40 290v16l${sub ? 450 : 240} 115 410-235v-16" fill="#64748b"/>${sub ? '<g fill="#243247"><ellipse cx="210" cy="286" rx="16" ry="10"/><ellipse cx="450" cy="147" rx="16" ry="10"/><ellipse cx="738" cy="216" rx="16" ry="10"/><ellipse cx="493" cy="354" rx="16" ry="10"/></g>' : '<path d="M90 320L320 383M330 140L630 216" stroke="#f1f5f9" stroke-width="3" opacity=".5"/>'}</g>`
      : sub
        ? '<g transform="translate(300 230)"><path d="M30 150L240 35L590 140L380 260Z" fill="url(#metal)" stroke="#64748b" stroke-width="4"/><path d="M30 150v160l350 110V260Z" fill="#94a3b8"/><path d="M380 260L590 140v160L380 420Z" fill="#64748b"/><path d="M100 190v90l220 70v-90Z" fill="#1e293b"/><ellipse cx="485" cy="270" rx="20" ry="29" fill="#25364a"/></g>'
        : '<g transform="translate(260 205)"><path d="M150 60L420 100v320l-270-40Z" fill="url(#metal)"/><ellipse cx="420" cy="260" rx="175" ry="195" fill="#94a3b8" stroke="#64748b" stroke-width="6"/><ellipse cx="420" cy="260" rx="130" ry="150" fill="none" stroke="#cbd5e1" stroke-width="18"/><ellipse cx="420" cy="260" rx="95" ry="113" fill="none" stroke="#64748b" stroke-width="12"/><ellipse cx="420" cy="260" rx="55" ry="70" fill="#1e293b"/><path d="M490 423L750 480L730 520L440 465Z" fill="url(#metal)"/></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient><linearGradient id="metal" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#e2e8f0"/><stop offset=".3" stop-color="#94a3b8"/><stop offset=".55" stop-color="#f1f5f9"/><stop offset="1" stop-color="#64748b"/></linearGradient></defs><rect width="1200" height="800" fill="url(#bg)"/><circle cx="1040" cy="80" r="290" fill="${pair.color}" opacity=".06"/><rect x="56" y="52" width="8" height="65" rx="4" fill="${pair.color}"/><text x="88" y="80" fill="#475569" font-family="sans-serif" font-size="22" letter-spacing="4">MATERIAL ${sub ? 'SUB' : 'MAIN'}</text><text x="88" y="116" fill="#0f172a" font-family="sans-serif" font-size="30" font-weight="700">${sub ? pair.subCode : pair.mainCode}</text><ellipse cx="600" cy="647" rx="410" ry="38" fill="#0f172a" opacity=".09"/>${object}<text x="60" y="735" fill="#334155" font-family="sans-serif" font-size="22">${sub ? pair.subSpec.replaceAll('×', 'x') : pair.mainSpec.replaceAll('×', 'x')}</text><text x="60" y="772" fill="#64748b" font-family="sans-serif" font-size="15">DEMO ILLUSTRATION - NOT A PRODUCT PHOTOGRAPH</text></svg>`;
}

await fs.mkdir(path.join(output, 'images'), { recursive: true });
const results = [];
for (const pair of pairs) {
  const existing = (await api(`/materials?search=${encodeURIComponent(pair.mainCode)}&limit=100`)).items.find((entry) => entry.code === pair.mainCode);
  let main;
  if (existing) {
    if (existing.description !== marker || existing.processingMaterial?.code !== pair.subCode) throw new Error(`Refusing to modify unrelated or incomplete record ${pair.mainCode}`);
    main = existing;
  } else {
    const subConflict = (await api(`/materials?search=${encodeURIComponent(pair.subCode)}&limit=100`)).items.find((entry) => entry.code === pair.subCode);
    if (subConflict) throw new Error(`Sub code already exists: ${pair.subCode}`);
    const pcsUnit = lookups.units.find((unit) => ['PCS', 'PC', 'PIECE'].includes(unit.code?.toUpperCase()) || unit.nameTh === 'ชิ้น');
    const unitAliases = { PIPE: ['เส้น', 'ท่อน'], SHEET: ['ชีท', 'แผ่น'], COIL: ['คอยล์', 'ม้วน'] };
    const rawUnit = lookups.units.find((unit) => [...pair.unitCodes, ...unitAliases[pair.shape]].some((code) => unit.code?.toUpperCase() === code || unit.nameTh === code));
    if (!pcsUnit || !rawUnit) throw new Error(`Missing PCS or ${pair.shape} unit; seed does not substitute incompatible units.`);
    const images = [];
    for (const sub of [false, true]) {
      const name = `${sub ? pair.subCode : pair.mainCode}.png`;
      const buffer = await sharp(Buffer.from(illustration(pair, sub))).png().toBuffer();
      await fs.writeFile(path.join(output, 'images', name), buffer);
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: 'image/png' }), name);
      images.push((await api('/materials/images', 'POST', form)).imagePath);
    }
    const supplier = lookups.suppliers[0];
    main = await api('/materials', 'POST', {
      code: pair.mainCode, name: pair.mainName, type: 'OF_MAT', materialType: pair.shape,
      locationType: 'external', ratio: pair.ratio, unitId: rawUnit.id, specification: pair.mainSpec,
      description: marker, imagePath: images[0], minimumStock: 5, isActive: true,
      supplierIds: supplier ? [supplier.id] : [],
      processingOutput: { code: pair.subCode, name: pair.subName, locationType: 'internal', unitId: pcsUnit.id,
        packingQuantity: pair.packing, specification: pair.subSpec, imagePath: images[1], processLineName: `MOCK-${pair.shape}`, scale: '1:1' },
    });
  }
  const sub = main.processingMaterial;
  if (!sub?.id) throw new Error(`Missing processing output for ${pair.mainCode}`);
  const versions = await api(`/material-engineering/materials/${sub.id}/boms`);
  let bom = versions.find((version) => version.remark === marker);
  if (!bom && versions.length) throw new Error(`Refusing to add demo BOM beside unrelated versions for ${pair.subCode}`);
  if (versions.some((version) => version.status === 'ACTIVE' && version.id !== bom?.id)) throw new Error(`Refusing to replace another active BOM for ${pair.subCode}`);
  if (!bom) {
    bom = await api('/material-engineering/boms', 'POST', {
      materialId: sub.id, specification: `Mock BOM: 1 ${pair.subCode}; ideal yield, excludes kerf/scrap`, remark: marker,
      items: [{ materialId: main.id, unitId: main.unitId, quantity: Number((1 / pair.ratio).toFixed(4)), isScrap: false, wastagePercent: 0, remark: `1 ${pair.shape} -> ${pair.ratio} PCS (demo theoretical yield)` }],
    });
  }
  if (bom.status !== 'ACTIVE') await api(`/material-engineering/boms/${bom.id}/activate`, 'PATCH');
  const saved = await api(`/materials/${main.id}`);
  const savedBoms = await api(`/material-engineering/materials/${sub.id}/boms`);
  if (saved.processingMaterial?.id !== sub.id || !saved.imagePath || !saved.processingMaterial.imagePath || !savedBoms.some((version) => version.id === bom.id && version.status === 'ACTIVE' && version.items?.some((item) => item.materialId === main.id))) {
    throw new Error(`Saved pair/BOM is incomplete: ${pair.mainCode}`);
  }
  for (const imagePath of [saved.imagePath, saved.processingMaterial.imagePath]) {
    const imageUrl = new URL(imagePath, base);
    if (imageUrl.origin !== new URL(base).origin) throw new Error('Unexpected image origin');
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Saved image is unavailable for ${pair.mainCode}`);
  }
  results.push({ shape: pair.shape, main: { id: main.id, code: pair.mainCode, imagePath: saved.imagePath }, sub: { id: sub.id, code: pair.subCode, imagePath: saved.processingMaterial.imagePath }, bomId: bom.id, bomStatus: 'ACTIVE', componentQuantity: Number((1 / pair.ratio).toFixed(4)), sourceUnitId: main.unitId, yield: pair.ratio });
  await fs.writeFile(path.join(output, 'seed-result.json'), JSON.stringify({ marker, pairs: results }, null, 2) + '\n');
  console.log(`Saved ${pair.mainCode} + ${pair.subCode}, active BOM ${bom.id}`);
}
console.log('Created/reused 3 pairs (6 Materials), with images and 3 active BOMs. No stock transactions were created.');
