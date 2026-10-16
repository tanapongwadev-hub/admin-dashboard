/**
 * ถ่ายภาพหน้าจอประกอบคู่มือการใช้งาน (/manuals) จากแอปจริง พร้อมกรอบหมายเลขกำกับจุดสำคัญ
 * (ต้องรัน dev server :3000 และ cps-api ก่อน)
 *   node scripts/capture-manual-screens.mjs [slug ...]
 * ผลลัพธ์: public/manuals/<slug>/NN.jpg — ลำดับภาพตรงกับลำดับ shot ใน PLAN
 *
 * อ่านอย่างเดียว: เปิดหน้า เปิดฟอร์ม กรอก/เลือกค่าตัวอย่าง แต่ไม่กดบันทึก ยืนยัน หรือลบใดๆ
 * หมายเลขกรอบ (marks) ต้องตรงกับ callouts ของขั้นตอนใน src/lib/manuals/content.ts
 * ภาพ material-processing/06.png (หลังแปรรูป) มาจากการแปรรูปจริง สคริปต์นี้ไม่สร้าง
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "manuals");
const BASE = process.env.GUIDE_BASE ?? "http://localhost:3000";
const USERNAME = process.env.GUIDE_USERNAME ?? "cps-admin";
const PASSWORD = process.env.GUIDE_PASSWORD ?? "Admin123";
const SIZE = { width: 1440, height: 900 };
const IMG = (name) => path.join(ROOT, "docs", "mock-materials", "images", name);
const STAMP = Date.now().toString(36).slice(-4).toUpperCase();

/* Locator spec: "css" | { role, name, exact?, nth?, in? } | { text, nth?, in? } | { label, in? }
   in: "dialog" scopes to the topmost open dialog, "menu" to the open menu. */
const btn = (name, extra = {}) => ({ role: "button", name, ...extra });
const dlg = (spec) => (typeof spec === "string" ? { css: spec, in: "dialog" } : { ...spec, in: "dialog" });
const rowMenu = btn(/^ตัวเลือกสำหรับ/, { nth: 0 });

/* Each manual = list of shots run in order on one page. A shot: { go?, do?: actions[], marks?: specs[], scrollDialog?: "top"|"bottom" }.
   Actions: { click }, { fill: [spec, text] }, { pick: [spec, preferList] }, { files: [spec, file] }, { press }, { wait }, { scroll: spec }. */
const PLAN = {
  login: [
    { go: "/login", noAuth: true, do: [{ fill: ["input[autocomplete=username]", "cps-admin"] }], marks: ["input[autocomplete=username]", "input[type=password]", btn("เข้าสู่ระบบ", { exact: true })] },
  ],
  navigation: [
    { go: "/dashboard", marks: ["aside", btn(/ยุบแถบด้านข้าง|ขยายแถบด้านข้าง/), btn(/ค้นหาหรือไปยัง/), btn(/การแจ้งเตือน/), btn(/System Administrator|บัญชี/, { nth: 0 })] },
    { go: "/materials/catalog", marks: ["#material-search", { text: "ประเภทวัสดุ", nth: 0 }, btn("ตัวกรองขั้นสูง"), btn("มุมมองตาราง"), rowMenu] },
    { do: [{ click: btn("ตัวกรองขั้นสูง") }, { wait: 500 }], marks: [dlg(btn("ใช้ตัวกรอง")), dlg(btn("รีเซ็ต"))] },
    { go: "/materials/catalog", do: [{ click: rowMenu }, { wait: 400 }], marks: ["[role=menu]"] },
  ],
  "material-catalog": [
    { go: "/materials/catalog", marks: [btn("เพิ่มวัสดุ", { exact: true }), btn("ร่างของฉัน"), { role: "tab", name: /รายการปกติ/ }, "#material-search", btn("มุมมองตาราง")] },
    { do: [{ click: btn("เพิ่มวัสดุ", { exact: true }) }, { wait: 500 }, { click: "#materialType" }, { wait: 400 }], marks: ["[role=listbox]"] },
    { do: [{ clickOption: "PIPE" }, { wait: 400 }], marks: [dlg("#materialType"), dlg("#materialType-hint"), dlg(btn("ถัดไป")), dlg(btn("บันทึกร่าง"))] },
    {
      do: [
        { click: dlg(btn("ถัดไป")) }, { wait: 700 },
        { fill: ["#code", `DEMO-MANUAL-${STAMP}`] }, { wait: 900 },
        { fill: ["#name", "ท่อเหล็ก SGP 6 เมตร (ตัวอย่าง)"] },
        { pick: ["#materialTypeId", ["PC"]] }, { pick: ["#locationType", ["External"]] }, { pick: ["#unitId", ["PIPE", "เส้น"]] },
      ],
      scrollDialog: "top",
      marks: ["#code", "#code-check", "#name", "#materialTypeId", "#locationType", "#unitId"],
    },
    {
      do: [{ pick: ["#addSupplierId", []] }, { fill: ["#specification", "ท่อเหล็ก SGP ขนาด 1 นิ้ว ยาว 6 เมตร"] }, { files: ["#material-image", IMG("MOCK-MAIN-PIPE-001.png")] }, { wait: 800 }],
      scrollDialog: "bottom",
      marks: ["#addSupplierId", { text: /ซัพพลายเออร์ที่เลือกแล้ว/, nth: 0 }, "#specification", "label[for='material-image']", dlg(btn("ถัดไป"))],
    },
    {
      do: [
        { click: dlg(btn("ถัดไป")) }, { wait: 1200 },
        { fill: ["#outputCode", `DEMO-MANUAL-${STAMP}-CUT`] }, { wait: 700 },
        { fill: ["#outputName", "ชิ้นท่อตัด 60 มม. (ตัวอย่าง)"] },
        { pick: ["#outputLocationType", ["Internal"]] }, { pick: ["#outputUnitId", ["UNIT", "ชิ้น"]] },
        { fill: ["#ratio", "100"] }, { fill: ["#outputPackingQuantity", "50"] },
      ],
      scrollDialog: "top",
      marks: ["#outputCode", "#outputName", "#outputUnitId", "#ratio", "#outputPackingQuantity"],
    },
    { scrollDialog: "bottom", marks: [dlg(btn("บันทึกร่าง")), dlg(btn("เพิ่มวัสดุ", { exact: true })), dlg(btn("ย้อนกลับ"))] },
    { go: "/materials/catalog", do: [{ click: rowMenu }, { wait: 400 }], marks: ["[role=menu]"] },
  ],
  "material-receiving": [
    { go: "/materials/receiving", marks: [btn("รับเข้าวัตถุดิบ", { exact: true }), { role: "link", name: /แปรรูป Pipe/ }, "#materials-receiving-search", btn("ตัวกรองขั้นสูง"), btn("มุมมองตาราง")] },
    { do: [{ click: btn("รับเข้าวัตถุดิบ", { exact: true }) }, { wait: 600 }], marks: [dlg({ role: "combobox", nth: 0 }), "#mr-receive-qty", "#mr-supplier-production-date"] },
    {
      do: [{ pick: [dlg({ role: "combobox", nth: 0 }), ["Brake Pad", "Brake"]] }, { wait: 800 }, { fill: ["#mr-receive-qty", "45"] }, { wait: 800 }],
      marks: [dlg({ role: "combobox", nth: 0 }), "#mr-receive-qty", dlg({ text: /ตัวอย่างก่อนยืนยันรับเข้า/, nth: 0 }), dlg(btn("ยืนยันการรับเข้า"))],
    },
    { go: "/materials/receiving", do: [{ click: rowMenu }, { wait: 400 }], marks: ["[role=menu]"] },
    { go: "/materials/receiving", do: [{ click: btn("ดูรายละเอียด", { nth: 0 }) }, { wait: 800 }], marks: [dlg({ css: "img", nth: 0 }), dlg(btn(/พิมพ์ QR/))] },
  ],
  "material-disbursement": [
    { go: "/materials/disbursements", marks: [btn("เพิ่มรายการจ่ายออก"), "#materials-disbursement-search", btn("ตัวกรองขั้นสูง"), btn("มุมมองตาราง")] },
    {
      do: [{ click: btn("เพิ่มรายการจ่ายออก") }, { wait: 600 }, { pick: [dlg({ role: "combobox", nth: 1 }), ["Brake"]] }, { fill: [dlg({ css: "input[type=number]", nth: 0 }), "5"] }, { wait: 500 }],
      marks: ["#md-type", "#md-date", "#md-reason", dlg({ role: "combobox", nth: 1 }), dlg({ css: "input[type=number]", nth: 0 }), dlg(btn("เพิ่มรายการ")), dlg({ text: "สรุปรายการ", nth: 0 }), dlg(btn("บันทึกร่าง"))],
    },
  ],
  "material-job-orders": [
    { go: "/materials/job-orders", marks: ["#job-order-search", "#jo-approved-from", { role: "link", name: /^JO-/, nth: 0 }, { role: "link", name: /^พิมพ์ใบจัดงาน/, nth: 0 }] },
    { go: "/materials/job-orders", do: [{ open: /\/materials\/job-orders\/\d+/ }], marks: [{ text: /^JO-/, nth: 0 }, btn(/พิมพ์/, { nth: 0 })] },
    { scroll: { css: "table", nth: 0 }, marks: [{ css: "table", nth: 0 }] },
  ],
  "material-processing": [
    { go: "/materials/receiving", marks: [{ role: "link", name: /แปรรูป Pipe/ }] },
    { go: "/material-processing", marks: ["#processing-search", { role: "combobox", nth: 0 }, { css: "table", nth: 0 }, rowMenu] },
    { do: [{ click: rowMenu }, { wait: 400 }], marks: [{ role: "menuitem", name: /^แปรรูป$/ }, { role: "menuitem", name: /ประวัติ/ }] },
    { do: [{ click: { role: "menuitem", name: /^แปรรูป$/ } }, { wait: 900 }], marks: [dlg({ css: "input[type=number]", nth: 0 }), dlg({ css: "input[type=number]", nth: 1 }), dlg({ css: "input[type=number]", nth: 2 }), dlg({ role: "combobox", nth: 0 })] },
    { scrollDialog: "bottom", marks: [dlg({ text: /กล่อง/, nth: 0 }), dlg(btn(/ยืนยันแปรรูป/))] },
    { go: "/material-processing", do: [{ click: rowMenu }, { wait: 300 }, { click: { role: "menuitem", name: /ประวัติ/ } }, { wait: 900 }] },
  ],
  "production-plans": [
    { go: "/production/internal-materials/plans", marks: [btn(/^สร้างแผน$/), "#production-plan-search", btn("ตัวกรองขั้นสูง"), rowMenu] },
    { go: "/production/products/plans", marks: [btn(/^สร้างแผน$/), btn("นำเข้า Excel")] },
    {
      do: [{ click: btn(/^สร้างแผน$/) }, { wait: 600 }, { fill: ["#plan-title", "แผนผลิตตัวอย่าง (คู่มือ)"] }, { pick: ["#plan-target-0", []] }, { fill: ["#plan-qty-0", "500"] }],
      marks: ["#plan-title", "#plan-target-0", "#plan-qty-0", "#plan-date-0", dlg(btn("เพิ่มรายการ")), dlg(btn("บันทึกร่าง"))],
    },
    { go: "/production/internal-materials/plans", do: [{ click: rowMenu }, { wait: 400 }], marks: ["[role=menu]"] },
    { go: "/production/products/plans", do: [{ click: btn("นำเข้า Excel") }, { wait: 600 }], marks: [dlg({ css: "input[type=file]", nth: 0 })] },
  ],
  "process-orders": [
    { go: "/production/internal-materials/orders", marks: [{ text: "รอสั่งผลิต", nth: 0 }, { text: "สั่งผลิตแล้ว", nth: 0 }, { role: "textbox", nth: 0 }] },
    { go: "/production/internal-materials/orders?tab=orders", marks: [{ text: "สั่งผลิตแล้ว", nth: 0 }, { role: "link", name: /รายละเอียด/, nth: 0 }] },
    { go: "/production/internal-materials/orders?tab=orders", do: [{ open: /\/production\/internal-materials\/orders\/\d+/ }], marks: [{ text: /เส้นทางการผลิต/, nth: 0 }, btn(/ประวัติการบันทึก/), btn(/พิมพ์ QR งานค้าง/, { nth: 0 })] },
    { scroll: btn(/^บันทึกผลิต$/, { nth: 1 }), marks: [btn(/^บันทึกผลิต$/, { nth: 1 }), btn(/^ส่ง /, { nth: 1 })] },
    { do: [{ click: btn(/^บันทึกผลิต$/, { nth: 1 }) }, { wait: 900 }], marks: [dlg({ css: "input", nth: 0 }), dlg({ text: /กล่องถัดไป/, nth: 0 }), dlg({ text: /บันทึกไม่เต็มกล่อง/, nth: 0 })] },
    { do: [{ press: "Escape" }, { wait: 300 }, { click: btn(/ประวัติการบันทึก/) }, { wait: 900 }], marks: [dlg({ css: "ul,table", nth: 0 })] },
  ],
  "production-traceability": [
    { go: "/reports/production", marks: ["#trace-q", btn("สอบกลับ")] },
    { go: "/reports/production?q=QR-ST-691013-001-BOX001", marks: ["#trace-q", { text: /สายการผลิต|ย้อนกลับ/, nth: 0 }] },
  ],
  products: [
    { go: "/engineering/products", marks: [btn("เพิ่มสินค้า"), "#product-search", btn("ตัวกรองขั้นสูง")] },
    { do: [{ click: btn("เพิ่มสินค้า") }, { wait: 700 }], marks: [dlg({ css: "ol,nav", nth: 0 }), dlg(btn("ถัดไป"))] },
    { go: "/engineering/products", do: [{ click: { text: /^รายละเอียด$/, nth: 0 } }, { wait: 900 }], marks: [dlg({ role: "tablist", nth: 0 })] },
    { go: "/engineering/products", do: [{ click: { text: "สต็อกสินค้า", nth: 0 } }, { wait: 900 }], marks: [dlg({ text: /คงเหลือ/, nth: 0 })] },
  ],
  "bom-workflow": [
    { go: "/engineering/bom/products", do: [{ click: "#engineering-owner" }, { wait: 500 }], marks: ["#engineering-search", "[role=listbox],[role=menu]"] },
    { do: [{ clickOption: null }, { wait: 1200 }], marks: [btn(/สร้าง|เพิ่ม/, { nth: 0 }), btn(/ทำสำเนา/, { nth: 0 })] },
  ],
  "sales-orders": [
    { go: "/sales/orders", marks: [btn("สร้างออเดอร์ขาย"), "#sales-orders-search", "#sales-orders-date-from"] },
    {
      do: [{ click: btn("สร้างออเดอร์ขาย") }, { wait: 600 }, { pick: ["#so-customer", []] }, { fill: ["#so-po", "PO-ตัวอย่าง-001"] }, { pick: ["#so-line-0-product", []] }, { fill: ["#so-line-0-qty", "100"] }, { wait: 500 }],
      marks: ["#so-customer", "#so-order-date", "#so-due-date", "#so-po", "#so-line-0-product", "#so-line-0-qty", dlg(btn("เพิ่มรายการสินค้า")), dlg(btn("บันทึกร่าง"))],
    },
  ],
  "sales-job-orders": [
    { go: "/sales/job-orders", marks: ["#sales-job-orders-search", "#sales-job-orders-date-from", { role: "combobox", nth: 0 }] },
  ],
  "sales-report": [
    { go: "/reports/sales", marks: ["#sales-report-date-from", "#sales-report-date-to", { text: "ยอดส่งสินค้ารายวัน", nth: 0 }] },
    { scroll: { text: "รายการตัดสต็อกขาย", nth: 0 }, marks: [{ text: "ยอดส่งตามสินค้า", nth: 0 }, { text: "ยอดส่งตามลูกค้า", nth: 0 }, { text: "รายการตัดสต็อกขาย", nth: 0 }] },
  ],
  "materials-report": [
    { go: "/reports/materials", marks: [{ css: "main section,main [class*=grid]", nth: 0 }, btn(/รายการรับเข้า/), btn("ตัวกรองขั้นสูง"), btn("CSV"), btn("Excel"), btn("PDF")] },
    { do: [{ click: btn("ตัวกรองขั้นสูง") }, { wait: 600 }], marks: [dlg({ role: "combobox", nth: 0 }), dlg(btn("ใช้ตัวกรอง"))] },
    { go: "/reports/materials", do: [{ click: btn(/^CCI-26K16-003$/, { nth: 0 }) }, { wait: 1200 }], marks: [dlg({ text: /คงเหลือ/, nth: 0 }), dlg({ text: /SUB QR/, nth: 0 })] },
  ],
  "audit-logs": [
    { go: "/reports/audit-logs", marks: [{ css: "table", nth: 0 }] },
  ],
  "master-data": [
    { go: "/master-data", marks: ["main a[href='/master-data/units']", "main a[href='/master-data/suppliers']"] },
    { go: "/master-data/units", marks: [btn(/^เพิ่ม/), { css: "input[type=search],input[placeholder*='ค้นหา']", nth: 0 }, rowMenu] },
    { do: [{ click: btn(/^เพิ่ม/) }, { wait: 600 }], marks: [dlg({ css: "input", nth: 0 }), dlg({ css: "input", nth: 1 }), dlg({ css: "input", nth: 3 }), dlg(btn(/^สร้าง/))] },
    { go: "/master-data/units", do: [{ click: rowMenu }, { wait: 400 }], marks: ["[role=menu]"] },
  ],
  "menu-management": [
    { go: "/system/menus", marks: [btn("เพิ่มเมนู"), btn(/^ลากเพื่อจัดลำดับ/, { nth: 1 }), rowMenu, btn("บันทึกการเปลี่ยนแปลง"), btn("รีเซ็ต")] },
    { do: [{ click: btn("เพิ่มเมนู") }, { wait: 600 }], marks: [dlg({ css: "input", nth: 0 }), dlg({ css: "input", nth: 1 }), dlg({ role: "combobox", nth: 0 })] },
  ],
};

const only = process.argv.slice(2);
const browser = await chromium.launch();

async function newPage(auth) {
  const ctx = await browser.newContext({ viewport: SIZE, locale: "th-TH", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (auth) {
    await page.goto(`${BASE}/login`);
    await page.getByPlaceholder("ชื่อผู้ใช้ของคุณ").fill(USERNAME);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  }
  return page;
}

function scopeOf(page, where) {
  if (where === "dialog") return page.getByRole("dialog").last();
  if (where === "menu") return page.getByRole("menu").last();
  return page;
}

function locate(page, spec) {
  if (typeof spec === "string") return page.locator(spec).first();
  const scope = scopeOf(page, spec.in);
  let loc;
  if (spec.css) loc = scope.locator(spec.css);
  else if (spec.role) loc = scope.getByRole(spec.role, spec.name !== undefined ? { name: spec.name, exact: spec.exact } : {});
  else if (spec.text) loc = scope.getByText(spec.text);
  else if (spec.label) loc = scope.getByLabel(spec.label);
  return loc.nth(spec.nth ?? 0);
}

async function pickOption(page, prefer) {
  const options = page.getByRole("option");
  await options.first().waitFor({ timeout: 5000 });
  const labels = (await options.allInnerTexts()).map((s) => s.trim());
  let index = -1;
  for (const want of prefer ?? []) {
    index = labels.findIndex((l) => l === want || l.includes(want));
    if (index >= 0) break;
  }
  if (index < 0) index = labels.findIndex((l) => l && l !== "ไม่ระบุ" && !l.startsWith("ทั้งหมด"));
  if (index < 0) throw new Error("no option to pick");
  await options.nth(index).click();
  await page.waitForTimeout(300);
}

async function run(page, action) {
  if (action.click) await locate(page, action.click).click();
  else if (action.fill) await locate(page, action.fill[0]).fill(action.fill[1]);
  else if (action.pick) {
    await locate(page, action.pick[0]).click();
    await pickOption(page, action.pick[1]);
  } else if ("clickOption" in action) await pickOption(page, action.clickOption ? [action.clickOption] : []);
  else if (action.files) await locate(page, action.files[0]).setInputFiles(action.files[1]);
  else if (action.press) await page.keyboard.press(action.press);
  else if (action.wait) await page.waitForTimeout(action.wait);
  else if (action.open) {
    const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
    const target = hrefs.find((h) => h && action.open.test(h));
    if (!target) throw new Error(`no link matching ${action.open}`);
    await page.goto(`${BASE}${target}`);
    await page.waitForLoadState("networkidle");
  }
}

async function scrollDialog(page, where) {
  await page.evaluate((where) => {
    const dialog = [...document.querySelectorAll("[role=dialog]")].pop();
    if (!dialog) return;
    const scrollers = [dialog, ...dialog.querySelectorAll("*")].filter((el) => el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY));
    for (const el of scrollers) el.scrollTop = where === "bottom" ? el.scrollHeight : 0;
  }, where);
  await page.waitForTimeout(300);
}

async function drawMarks(page, slug, shotNo, marks) {
  const boxes = [];
  for (const [i, spec] of marks.entries()) {
    const box = await locate(page, spec).boundingBox({ timeout: 1500 }).catch(() => null);
    const visible = box && box.width > 0 && box.y + box.height > 0 && box.y < SIZE.height && box.x < SIZE.width;
    if (!visible) console.log(`  mark ${i + 1} not visible in ${slug}/${shotNo}:`, JSON.stringify(spec, (k, v) => (v instanceof RegExp ? String(v) : v)));
    boxes.push(visible ? box : null);
  }
  await page.evaluate(({ boxes, w, h }) => {
    document.querySelectorAll(".__mark").forEach((el) => el.remove());
    boxes.forEach((b, i) => {
      if (!b) return;
      const pad = 4;
      const x = Math.max(2, b.x - pad), y = Math.max(2, b.y - pad);
      const width = Math.min(w - x - 2, b.width + pad * 2), height = Math.min(h - y - 2, b.height + pad * 2);
      const frame = document.createElement("div");
      frame.className = "__mark";
      Object.assign(frame.style, { position: "fixed", left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, border: "3px solid #DC2626", borderRadius: "8px", zIndex: 2147483646, pointerEvents: "none", boxShadow: "0 0 0 2px rgba(255,255,255,.85)" });
      const badge = document.createElement("div");
      badge.className = "__mark";
      badge.textContent = String(i + 1);
      const bx = Math.min(w - 30, Math.max(2, x - 14)), by = Math.min(h - 30, Math.max(2, y - 14));
      Object.assign(badge.style, { position: "fixed", left: `${bx}px`, top: `${by}px`, width: "28px", height: "28px", borderRadius: "50%", background: "#DC2626", color: "#fff", font: "700 15px/28px 'IBM Plex Sans Thai',sans-serif", textAlign: "center", zIndex: 2147483647, pointerEvents: "none", boxShadow: "0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.35)" });
      document.body.append(frame, badge);
    });
  }, { boxes, w: SIZE.width, h: SIZE.height });
}

const authed = await newPage(true);
const guest = await newPage(false);

for (const [slug, shots] of Object.entries(PLAN)) {
  if (only.length && !only.includes(slug)) continue;
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".jpg")) fs.rmSync(path.join(dir, f));
  let broken = false;
  for (const [index, shot] of shots.entries()) {
    const page = shot.noAuth ? guest : authed;
    const shotNo = String(index + 1).padStart(2, "0");
    const file = path.join(dir, `${shotNo}.jpg`);
    try {
      if (broken && !shot.go) throw new Error("previous shot failed and this one continues from it");
      await page.evaluate(() => document.querySelectorAll(".__mark").forEach((el) => el.remove())).catch(() => {});
      if (shot.go) {
        await page.goto(`${BASE}${shot.go}`);
        await page.waitForLoadState("networkidle");
      }
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      for (const action of shot.do ?? []) await run(page, action);
      if (shot.scroll) await locate(page, shot.scroll).scrollIntoViewIfNeeded();
      if (shot.scrollDialog) await scrollDialog(page, shot.scrollDialog);
      await page.waitForTimeout(500);
      await drawMarks(page, slug, shotNo, shot.marks ?? []);
      await page.screenshot({ path: file, type: "jpeg", quality: 82 });
      broken = false;
      console.log("saved", path.relative(ROOT, file));
    } catch (err) {
      broken = true;
      console.error("FAILED", slug, shotNo, err.message.split("\n")[0]);
    }
  }
}

await browser.close();
