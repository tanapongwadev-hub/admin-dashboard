/**
 * อัดวิดีโอคู่มือ "เพิ่มวัสดุ" ตามชนิดเหล็ก จากแอปจริง (ต้องรัน dev server ที่ :3000 และ cps-api ก่อน)
 *   node scripts/record-material-create-guide.mjs [pcs|pipe|sheet|coil|all|probe]
 *   probe = ไม่อัด แค่พิมพ์ตัวเลือกหน่วย/ประเภทวัสดุ/ซัพพลายเออร์ที่มีในระบบ
 *
 * ผลลัพธ์: docs/manuals/videos/create-<type>.webm
 * สร้างวัสดุทดสอบจริงในฐานข้อมูล dev ผ่าน UI (รหัสขึ้นต้น DEMO-) — ไม่มีการเขียน SQL ตรง
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.GUIDE_BASE ?? "http://localhost:3000";
const USERNAME = process.env.GUIDE_USERNAME ?? "cps-admin";
const PASSWORD = process.env.GUIDE_PASSWORD ?? "Admin123";
const OUT_DIR = path.join(ROOT, "docs", "manuals", "videos");
const TMP_DIR = path.join(OUT_DIR, ".tmp-create");
const IMG = (name) => path.join(ROOT, "docs", "mock-materials", "images", name);
const SIZE = { width: 1440, height: 900 };
const SPEED = Number(process.env.GUIDE_SPEED ?? 1);
// Short run stamp keeps demo codes unique across re-runs (codes must never repeat, even inactive ones).
const STAMP = Date.now().toString(36).slice(-4).toUpperCase();

const TYPES = {
  pcs: {
    shape: "PCS",
    title: "เพิ่มวัสดุชนิด PCS",
    sub: "ชิ้นงานที่นับเป็นชิ้น · กรอก 1 ชุด (2 ขั้นตอน)",
    code: `DEMO-PCS-${STAMP}`,
    name: "สลักเกลียวหกเหลี่ยม M8x40",
    units: ["UNIT", "ชิ้น"],
    image: IMG("MOCK-SUB-PIPE-001.png"),
    packing: "100",
    minimum: "200",
    spec: "สลักเกลียวเหล็กชุบซิงค์ M8 ยาว 40 มม.",
  },
  pipe: {
    shape: "PIPE",
    title: "เพิ่มวัสดุชนิด PIPE",
    sub: "ท่อเหล็กที่ต้องนำไปตัด · กรอก 2 ชุด (3 ขั้นตอน)",
    code: `DEMO-PIPE-${STAMP}`,
    name: "ท่อเหล็ก SGP 6 เมตร",
    units: ["PIPE", "เส้น"],
    image: IMG("MOCK-MAIN-PIPE-001.png"),
    spec: "ท่อเหล็ก SGP ขนาด 1 นิ้ว ยาว 6 เมตร",
    out: { suffix: "CUT", name: "ชิ้นท่อตัด 60 มม.", units: ["UNIT", "ชิ้น"], ratio: "100", packing: "50", spec: "ความยาวชิ้นงานหลังตัด 60 มม.", image: IMG("MOCK-SUB-PIPE-001.png") },
  },
  sheet: {
    shape: "SHEET",
    title: "เพิ่มวัสดุชนิด SHEET",
    sub: "แผ่นเหล็กที่ต้องนำไปตัด · กรอก 2 ชุด (3 ขั้นตอน)",
    code: `DEMO-SHEET-${STAMP}`,
    name: "แผ่นเหล็ก SPCC 1.2 มม. 4x8 ฟุต",
    units: ["SHEET", "แผ่น"],
    image: IMG("MOCK-MAIN-SHEET-001.png"),
    spec: "แผ่นเหล็กรีดเย็น SPCC หนา 1.2 มม. ขนาด 4x8 ฟุต",
    out: { suffix: "CUT", name: "แผ่นตัด 100x200 มม.", units: ["UNIT", "ชิ้น"], ratio: "140", packing: "20", spec: "ขนาดชิ้นงานหลังตัด 100x200 มม.", image: IMG("MOCK-SUB-SHEET-001.png") },
  },
  coil: {
    shape: "COIL",
    title: "เพิ่มวัสดุชนิด COIL",
    sub: "เหล็กม้วนที่ต้องนำไปตัด · กรอก 2 ชุด (3 ขั้นตอน)",
    code: `DEMO-COIL-${STAMP}`,
    name: "เหล็กม้วน SPHC 2.0 มม.",
    units: ["COIL", "ม้วน"],
    image: IMG("MOCK-MAIN-COIL-001.png"),
    spec: "เหล็กม้วนรีดร้อน SPHC หนา 2.0 มม. กว้าง 1,219 มม.",
    out: { suffix: "PRESS", name: "ชิ้นงานปั๊มจากม้วน", units: ["UNIT", "ชิ้น"], ratio: "2000", packing: "100", spec: "ชิ้นงานปั๊มขนาด 50x50 มม.", image: IMG("MOCK-SUB-COIL-001.png") },
  },
};

const arg = process.argv[2] ?? "all";
fs.mkdirSync(TMP_DIR, { recursive: true });
const browser = await chromium.launch();

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("ชื่อผู้ใช้ของคุณ").fill(USERNAME);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

async function openCatalog(page) {
  await page.goto(`${BASE}/materials/catalog`);
  await page.waitForLoadState("networkidle");
}

/* ---------- overlay: caption, fake cursor, spotlight, title card (inline CSS, no CDN) ---------- */
async function overlay(page) {
  await page.evaluate(() => {
    if (document.getElementById("__guide_style")) return;
    const style = document.createElement("style");
    style.id = "__guide_style";
    style.textContent = `
      #__cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:82vw;z-index:2147483646;
        background:rgba(15,23,42,.92);color:#fff;padding:14px 26px;border-radius:14px;font:500 20px/1.45 "IBM Plex Sans Thai","Segoe UI",Tahoma,sans-serif;
        box-shadow:0 10px 40px rgba(0,0,0,.35);opacity:0;transition:opacity .35s;pointer-events:none;text-align:center}
      #__cap.show{opacity:1}
      #__cap b{color:#7dd3fc}
      #__cur{position:fixed;left:700px;top:450px;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transition:left .5s cubic-bezier(.2,.7,.2,1),top .5s cubic-bezier(.2,.7,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
      #__cur svg{width:100%;height:100%}
      #__cur.click:after{content:"";position:absolute;left:-14px;top:-14px;width:40px;height:40px;border-radius:50%;
        border:3px solid #1769D1;animation:__rip .5s ease-out forwards}
      @keyframes __rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
      #__title{position:fixed;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
        background:linear-gradient(135deg,#091C33,#0F2747 55%,#1769D1);color:#fff;font-family:"IBM Plex Sans Thai","Segoe UI",Tahoma,sans-serif;opacity:0;transition:opacity .5s;pointer-events:none}
      #__title.show{opacity:1}
      #__title h1{font-size:50px;font-weight:700;margin:0}
      #__title p{font-size:22px;margin:0;opacity:.85}
      #__spot{position:fixed;z-index:2147483644;pointer-events:none;border:3px solid #1769D1;border-radius:10px;
        box-shadow:0 0 0 9999px rgba(0,0,0,.25);opacity:0;transition:all .4s}
      #__spot.show{opacity:1}
      nextjs-portal{display:none!important}
    `;
    document.head.appendChild(style);
    const cap = document.createElement("div");
    cap.id = "__cap";
    const cur = document.createElement("div");
    cur.id = "__cur";
    cur.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L16.5 20l-3 1.3-3.5-7.6L5 18z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const spot = document.createElement("div");
    spot.id = "__spot";
    document.body.append(cap, cur, spot);
  });
}

function makeHelpers(page) {
  const wait = (ms) => page.waitForTimeout(ms * SPEED);
  async function say(text, ms = 3000) {
    await overlay(page);
    await page.evaluate((t) => {
      const cap = document.getElementById("__cap");
      cap.innerHTML = t;
      cap.classList.add("show");
    }, text);
    await wait(ms);
  }
  async function hush() {
    await page.evaluate(() => document.getElementById("__cap")?.classList.remove("show"));
  }
  async function title(h, p, ms = 3000) {
    await overlay(page);
    await page.evaluate(([h, p]) => {
      let t = document.getElementById("__title");
      if (!t) {
        t = document.createElement("div");
        t.id = "__title";
        document.body.appendChild(t);
      }
      t.innerHTML = `<h1>${h}</h1><p>${p}</p>`;
      requestAnimationFrame(() => t.classList.add("show"));
    }, [h, p]);
    await wait(ms);
    await page.evaluate(() => document.getElementById("__title")?.classList.remove("show"));
    await wait(500);
  }
  async function moveTo(locator, { spotlight = false } = {}) {
    await locator.scrollIntoViewIfNeeded();
    await wait(200);
    const box = await locator.boundingBox();
    if (!box) throw new Error("element not visible for moveTo");
    const x = box.x + Math.min(box.width / 2, 120);
    const y = box.y + box.height / 2;
    await overlay(page);
    await page.evaluate(([x, y, b, s]) => {
      const cur = document.getElementById("__cur");
      cur.style.left = `${x}px`;
      cur.style.top = `${y}px`;
      const spot = document.getElementById("__spot");
      if (s) {
        Object.assign(spot.style, { left: `${b.x - 6}px`, top: `${b.y - 6}px`, width: `${b.width + 12}px`, height: `${b.height + 12}px` });
        spot.classList.add("show");
      } else spot.classList.remove("show");
    }, [x, y, box, spotlight]);
    await page.mouse.move(x, y);
    await wait(450);
    return { x, y };
  }
  async function unspot() {
    await page.evaluate(() => document.getElementById("__spot")?.classList.remove("show"));
  }
  async function click(locator, opts) {
    const { x, y } = await moveTo(locator, opts);
    await page.evaluate(() => {
      const c = document.getElementById("__cur");
      c.classList.remove("click");
      void c.offsetWidth;
      c.classList.add("click");
    });
    await page.mouse.click(x, y);
    await wait(400);
  }
  async function typeInto(locator, text, { delay = 40 } = {}) {
    await click(locator);
    await page.keyboard.press("Control+A");
    await page.keyboard.type(text, { delay: delay * SPEED });
    await wait(300);
  }
  /** Open a Select by its trigger id and pick the first option whose label matches a preference, else the first real option. */
  async function pick(triggerId, prefer = []) {
    await click(page.locator(`#${triggerId}`));
    await wait(300);
    const options = page.getByRole("option");
    const labels = (await options.allInnerTexts()).map((s) => s.trim());
    let index = -1;
    for (const want of prefer) {
      index = labels.findIndex((l) => l === want || l.includes(want));
      if (index >= 0) break;
    }
    if (index < 0) index = labels.findIndex((l) => l && l !== "ไม่ระบุ");
    if (index < 0) throw new Error(`no option for #${triggerId}`);
    await click(options.nth(index));
    await wait(250);
    return labels.at(index);
  }
  return { wait, say, hush, title, moveTo, unspot, click, typeInto, pick };
}

async function withEpisode(name, body) {
  const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: TMP_DIR, size: SIZE }, locale: "th-TH", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const h = makeHelpers(page);
  try {
    await body(page, h);
  } catch (err) {
    console.error(`${name} failed:`, err.message);
    await page.screenshot({ path: path.join(OUT_DIR, `debug-${name}.png`) }).catch(() => {});
    await ctx.close();
    throw err;
  }
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  const webm = path.join(OUT_DIR, `${name}.webm`);
  for (let attempt = 1; ; attempt += 1) {
    try {
      fs.copyFileSync(src, webm);
      break;
    } catch (err) {
      if (attempt >= 5) throw err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  console.log("saved", webm, `${(fs.statSync(webm).size / 1e6).toFixed(1)} MB`);
}

/* ---------- one episode = add one material of a given steel type ---------- */
async function recordType(key, page, { wait, say, hush, title, moveTo, unspot, click, typeInto, pick }) {
  const t = TYPES[key];
  const raw = !!t.out;
  // Log in and open the page before recording anything meaningful; the title card hides the login flash.
  await login(page);
  await openCatalog(page);
  await title(t.title, t.sub, 3200);

  await say("ไปที่เมนู <b>คลังวัสดุ → ทะเบียนวัสดุ</b> แล้วกดปุ่ม <b>เพิ่มวัสดุ</b>", 3000);
  await click(page.getByRole("button", { name: "เพิ่มวัสดุ" }).first(), { spotlight: true });
  await unspot();
  await wait(700);

  // Step 1 — steel type
  await say(`<b>ขั้นที่ 1</b> เลือก <b>ชนิดเหล็ก</b> — ตัวอย่างนี้เลือก <b>${t.shape}</b>`, 2800);
  await click(page.locator("#materialType"), { spotlight: true });
  await unspot();
  await wait(400);
  await click(page.getByRole("option", { name: t.shape, exact: true }));
  await wait(500);
  await moveTo(page.locator("#materialType-hint"), { spotlight: true });
  await say(raw ? "PIPE / SHEET / COIL ต้องกรอก <b>2 ชุด</b>: วัตถุดิบก่อนแปรรูป และชิ้นงานหลังแปรรูป" : "PCS กรอกข้อมูลเพียง <b>1 ชุด</b>", 3000);
  await unspot();
  await click(page.getByRole("button", { name: "ถัดไป" }));
  await wait(800);

  // Step 2 — source material
  await say(raw ? "<b>ขั้นที่ 2</b> กรอกข้อมูล <b>วัตถุดิบก่อนแปรรูป</b> ที่รับเข้าเป็นเส้น / แผ่น / ม้วน" : "<b>ขั้นที่ 2</b> กรอก <b>ข้อมูล Material</b>", 2800);
  if (!raw) {
    await say("แนบ <b>รูปภาพวัสดุ</b> (จำเป็น) — JPEG, PNG หรือ WebP ไม่เกิน 5 MiB", 2800);
    await moveTo(page.locator("label[for='material-image']").first(), { spotlight: true }).catch(() => {});
    await page.locator("#material-image").setInputFiles(t.image);
    await wait(900);
    await unspot();
  }
  await say(`กรอก <b>รหัส</b> — ระบบตรวจรหัสซ้ำให้ทันทีขณะพิมพ์`, 2400);
  await typeInto(page.locator("#code"), t.code);
  await wait(900);
  await moveTo(page.locator("#code-check"), { spotlight: true }).catch(() => {});
  await wait(900);
  await unspot();
  await say("กรอก <b>ชื่อ</b> ให้สื่อความหมาย", 2000);
  await typeInto(page.locator("#name"), t.name, { delay: 25 });

  await say("เลือก <b>ประเภทวัสดุ</b> (ไม่บังคับ) และ <b>Location Type</b> — Internal ใช้ภายใน, External รับจากภายนอก", 3400);
  await pick("materialTypeId", ["PC"]);
  await pick("locationType", [raw ? "External" : "Internal"]);
  const unit = await pick("unitId", t.units);
  await say(`เลือก <b>หน่วย</b> ที่ใช้รับเข้าและนับสต็อก — เลือก <b>${unit}</b>`, 2400);

  if (!raw) {
    await say("กรอก <b>จำนวนต่อแพ็ก</b> สำหรับแบ่งกล่อง/QR ตอนรับเข้า และ <b>สต็อกขั้นต่ำ</b>", 3000);
    await typeInto(page.locator("#packingQuantity"), t.packing);
    await typeInto(page.locator("#minimumStock"), t.minimum);
    await say("ข้อมูลอ้างอิงอื่น เช่น ประเภทการจัดส่ง รุ่น จุดขึ้นสินค้า ไม่บังคับ", 2600);
  }

  await say("เลือก <b>ซัพพลายเออร์</b> — เลือกแล้วระบบเพิ่มเข้ารายการทันที (ต้องมีอย่างน้อย 1 รายจึงรับเข้าได้)", 3400);
  await pick("addSupplierId");
  await wait(500);
  await moveTo(page.getByText(/ซัพพลายเออร์ที่เลือกแล้ว/).first(), { spotlight: true }).catch(() => {});
  await wait(900);
  await unspot();

  await say("กรอก <b>ขนาด / ข้อมูลจำเพาะ</b> เพื่อแยกวัสดุที่คล้ายกัน", 2200);
  await typeInto(page.locator("#specification"), t.spec, { delay: 20 });

  if (raw) {
    await say("แนบ <b>รูปภาพวัสดุ</b> (จำเป็น) — JPEG, PNG หรือ WebP ไม่เกิน 5 MiB", 2800);
    await page.locator("#material-image").scrollIntoViewIfNeeded();
    await moveTo(page.locator("label[for='material-image']").first(), { spotlight: true }).catch(() => {});
    await page.locator("#material-image").setInputFiles(t.image);
    await wait(900);
    await unspot();

    await click(page.getByRole("button", { name: "ถัดไป" }));
    await wait(1200);

    // Step 3 — processed output
    await say("<b>ขั้นที่ 3</b> กรอก <b>ชิ้นงานหลังแปรรูป</b> — ระบบสร้างเป็น Material ชนิด PCS อีกรายการ", 3200);
    await say("รหัสหลังแปรรูปต้อง <b>ต่างจากต้นทาง</b> — นิยมเติมท้าย เช่น -CUT", 2600);
    await typeInto(page.locator("#outputCode"), `${t.code}-${t.out.suffix}`);
    await wait(800);
    await typeInto(page.locator("#outputName"), t.out.name, { delay: 25 });
    await pick("outputLocationType", ["Internal"]);
    const outUnit = await pick("outputUnitId", t.out.units);
    await say(`เลือก <b>หน่วยหลังแปรรูป</b> — ${outUnit}`, 1800);

    await say(`<b>ตัดได้กี่ชิ้นต่อ 1 หน่วยต้นทาง</b> — ตัวอย่าง: 1 ${unit} ตัดได้ ${Number(t.out.ratio).toLocaleString()} ชิ้น`, 3200);
    await typeInto(page.locator("#ratio"), t.out.ratio);
    await say("<b>จำนวนชิ้นต่อกล่อง</b> ใช้แบ่งกล่องและสร้าง QR หลังแปรรูป", 2600);
    await typeInto(page.locator("#outputPackingQuantity"), t.out.packing);
    await typeInto(page.locator("#outputSpecification"), t.out.spec, { delay: 20 });

    await say("แนบ <b>รูปหลังแปรรูป</b> ได้ (ไม่บังคับ)", 2000);
    await page.locator("#output-material-image").setInputFiles(t.out.image);
    await wait(900);
  }

  await say("ระหว่างทางกด <b>บันทึกร่าง</b> ได้ทุกขั้น แล้วกลับมาทำต่อจาก <b>ร่างของฉัน</b>", 3000);
  await moveTo(page.getByRole("button", { name: "บันทึกร่าง" }), { spotlight: true });
  await wait(900);
  await unspot();

  await say(raw ? "ตรวจทานแล้วกด <b>เพิ่มวัสดุ</b> — ระบบบันทึกทั้ง 2 รายการพร้อมกันและผูกเข้าด้วยกัน" : "ตรวจทานแล้วกด <b>เพิ่มวัสดุ</b>", 3000);
  await click(page.getByRole("button", { name: "เพิ่มวัสดุ", exact: true }).last(), { spotlight: true });
  await unspot();
  await hush();
  await page.getByRole("dialog").last().waitFor({ state: "hidden", timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await wait(800);

  await page.goto(`${BASE}/materials/catalog?search=${encodeURIComponent(t.code)}`);
  await page.waitForLoadState("networkidle");
  await say(raw ? `บันทึกสำเร็จ — ${t.code} และ ${t.code}-${t.out.suffix} อยู่ในทะเบียนวัสดุ (สต็อกเริ่มที่ 0)` : `บันทึกสำเร็จ — ${t.code} อยู่ในทะเบียนวัสดุ (สต็อกเริ่มที่ 0)`, 3600);
  await moveTo(page.getByText(t.code).first(), { spotlight: true }).catch(() => {});
  await wait(1500);
  await unspot();
  await say("ขั้นต่อไป: กด <b>รับเข้า</b> เพื่อเพิ่มสต็อก" + (raw ? " แล้วนำไป <b>แปรรูป</b>" : ""), 3000);
  await hush();
  await title("จบ: " + t.title, "การเพิ่มวัสดุยังไม่เพิ่มสต็อก · สต็อกเพิ่มเมื่อรับเข้าหรือยืนยันแปรรูป", 3000);
}

async function probe() {
  const ctx = await browser.newContext({ viewport: SIZE, locale: "th-TH" });
  const page = await ctx.newPage();
  await login(page);
  await openCatalog(page);
  await page.getByRole("button", { name: "เพิ่มวัสดุ" }).first().click();
  await page.locator("#materialType").click();
  await page.getByRole("option", { name: "PIPE", exact: true }).click();
  await page.getByRole("button", { name: "ถัดไป" }).click();
  for (const id of ["materialTypeId", "locationType", "unitId", "addSupplierId"]) {
    await page.locator(`#${id}`).click();
    const labels = await page.getByRole("option").allInnerTexts();
    console.log(id, "=>", labels.join(" | "));
    await page.keyboard.press("Escape");
  }
  await ctx.close();
}

if (arg === "probe") {
  await probe();
} else {
  const keys = arg === "all" ? Object.keys(TYPES) : [arg];
  for (const key of keys) {
    if (!TYPES[key]) {
      console.error(`unknown type "${key}" — use pcs | pipe | sheet | coil | all | probe`);
      continue;
    }
    console.log(`--- recording create-${key} (code ${TYPES[key].code}) ---`);
    try {
      await withEpisode(`create-${key}`, (page, h) => recordType(key, page, h));
    } catch (err) {
      console.error(`episode create-${key} aborted:`, err.message);
    }
  }
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });
await browser.close();
