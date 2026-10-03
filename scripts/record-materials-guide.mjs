/**
 * อัดวิดีโอคู่มือ Materials Management จากแอปจริง (ต้องรัน dev server ที่ :3000 ก่อน)
 *   node scripts/record-materials-guide.mjs [episode|all]
 *   episode: overview | read | create | detail | update | deactivate | validation
 *           | receiving | disbursement | bom | stock  (ค่าเริ่มต้น: create)
 *   "all" รันทุกตอนตามลำดับในเบราว์เซอร์เดียว (endToEnd/checklist ยังไม่รองรับ — ดู AGENTS.md)
 *
 * ผลลัพธ์: docs/manuals/videos/<episode>.webm (+ .mp4 ถ้ามี ffmpeg ของ Playwright)
 * ใช้บัญชีทดสอบจริงจาก cps-api/.env (INITIAL_SUPER_ADMIN_*) และรหัสวัสดุ DEMO- เท่านั้น
 * ไม่มีการลบข้อมูลด้วย SQL ตรง — ถ้าต้องเคลียร์รหัสชนกัน จะใช้ "ปิดใช้งาน"/แก้ไขผ่าน UI จริงเท่านั้น
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const BASE = process.env.GUIDE_BASE ?? "http://localhost:3000";
const USERNAME = process.env.GUIDE_USERNAME ?? "cps-admin";
const PASSWORD = process.env.GUIDE_PASSWORD ?? "Admin123";
const DEMO_CODE = "DEMO-STPIPE-001";
const DEMO_NAME = "Steel Pipe SGP Schedule 40";
let liveName = DEMO_NAME; // updated after recordUpdate renames the material, so later episodes still find the row
const DEMO_IMAGE = path.join(ROOT, "public", "cci_logo.png");
const OUT_DIR = path.join(ROOT, "docs", "manuals", "videos");
const TMP_DIR = path.join(OUT_DIR, ".tmp");
const SIZE = { width: 1440, height: 900 };
const SPEED = Number(process.env.GUIDE_SPEED ?? 1); // <1 = เร็วขึ้น

const episodeName = process.argv[2] ?? "create";

fs.mkdirSync(TMP_DIR, { recursive: true });

const browser = await chromium.launch();

/* ---------- helpers shared by prep + recorded pages ---------- */
async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("ชื่อผู้ใช้ของคุณ").fill(USERNAME);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

/* ---------- pre-flight (NOT recorded): free up DEMO_CODE if a stale row exists ---------- */
async function preflight() {
  const ctx = await browser.newContext({ viewport: SIZE, locale: "th-TH" });
  const page = await ctx.newPage();
  await login(page);
  // Sweep away EVERY row whose code/name matches DEMO_CODE as a substring —
  // this catches both an exact stale DEMO_CODE row and any already-archived
  // "ARCHIVED-DEMO-STPIPE-001-<ts>" debris left by earlier runs. Renaming
  // both code AND name to a fully unrelated junk string (not just the code)
  // is what actually prevents future name-based lookups (episodes reference
  // the material by its current display name) from ever colliding with old
  // debris again — a code-only rename still left old rows sharing a name
  // with the live row once an episode renamed it mid-run.
  let round = 0;
  for (;;) {
    await page.goto(`${BASE}/materials/pc?search=${encodeURIComponent(DEMO_CODE)}&status=all`);
    await page.waitForLoadState("networkidle");
    const menuButton = page.getByRole("button", { name: /^ตัวเลือกสำหรับ /, exact: false }).first();
    if (!(await menuButton.count())) break;
    round += 1;
    if (round > 10) throw new Error("preflight: too many stale rows, aborting sweep");
    await menuButton.click();
    await page.getByRole("menuitem", { name: "แก้ไข" }).click();
    const junk = `ZZZ-OLD-${Date.now()}-${round}`;
    await page.locator("#code").fill(junk);
    await page.locator("#name").fill(`Old test data (ignore) ${junk}`);
    await page.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง" }).click();
    await page.waitForTimeout(1000);
  }
  console.log(`preflight: swept ${round} stale row(s) matching "${DEMO_CODE}"`);
  await ctx.close();
}

/* ---------- overlay: คำบรรยาย + เคอร์เซอร์จำลอง (วาดด้วย CSS ในหน้าเอง ไม่มี CDN) ---------- */
async function overlay(page) {
  await page.evaluate(() => {
    if (document.getElementById("__guide_style")) return;
    const style = document.createElement("style");
    style.id = "__guide_style";
    style.textContent = `
      #__cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:82vw;z-index:2147483646;
        background:rgba(15,23,42,.9);color:#fff;padding:14px 26px;border-radius:14px;font:500 20px/1.45 "Segoe UI",Tahoma,sans-serif;
        box-shadow:0 10px 40px rgba(0,0,0,.35);opacity:0;transition:opacity .35s;pointer-events:none;text-align:center;white-space:pre-line}
      #__cap.show{opacity:1}
      #__cap b{color:#5eead4}
      #__cur{position:fixed;left:700px;top:450px;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transition:left .5s cubic-bezier(.2,.7,.2,1),top .5s cubic-bezier(.2,.7,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
      #__cur svg{width:100%;height:100%}
      #__cur.click:after{content:"";position:absolute;left:-14px;top:-14px;width:40px;height:40px;border-radius:50%;
        border:3px solid #14b8a6;animation:__rip .5s ease-out forwards}
      @keyframes __rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
      #__title{position:fixed;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
        background:linear-gradient(135deg,#0f172a,#0f766e);color:#fff;font-family:"Segoe UI",Tahoma,sans-serif;opacity:0;transition:opacity .5s;pointer-events:none}
      #__title.show{opacity:1}
      #__title h1{font-size:48px;font-weight:700;margin:0}
      #__title p{font-size:20px;margin:0;opacity:.85}
      #__spot{position:fixed;z-index:2147483644;pointer-events:none;border:3px solid #14b8a6;border-radius:10px;
        box-shadow:0 0 0 9999px rgba(0,0,0,.28);opacity:0;transition:all .4s}
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
    await page.evaluate(
      ([h, p]) => {
        let t = document.getElementById("__title");
        if (!t) {
          t = document.createElement("div");
          t.id = "__title";
          document.body.appendChild(t);
        }
        t.innerHTML = `<h1>${h}</h1><p>${p}</p>`;
        requestAnimationFrame(() => t.classList.add("show"));
      },
      [h, p],
    );
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
    await page.evaluate(
      ([x, y, b, s]) => {
        const cur = document.getElementById("__cur");
        cur.style.left = `${x}px`;
        cur.style.top = `${y}px`;
        const spot = document.getElementById("__spot");
        if (s) {
          Object.assign(spot.style, { left: `${b.x - 6}px`, top: `${b.y - 6}px`, width: `${b.width + 12}px`, height: `${b.height + 12}px` });
          spot.classList.add("show");
        } else spot.classList.remove("show");
      },
      [x, y, box, spotlight],
    );
    await page.mouse.move(x, y);
    await wait(500);
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
    await wait(450);
  }
  async function typeInto(locator, text, { clear = true, delay = 45 } = {}) {
    await click(locator);
    if (clear) await page.keyboard.press("Control+A");
    await page.keyboard.type(text, { delay: delay * SPEED });
    await wait(350);
  }
  async function selectOption(triggerLocator, optionText) {
    await click(triggerLocator);
    await wait(250);
    await click(page.getByRole("option", { name: optionText, exact: true }).first());
  }
  return { wait, say, hush, title, moveTo, unspot, click, typeInto, selectOption };
}

/* ---------- wrapper: creates a recorded context, runs the episode body, saves the video ---------- */
async function withEpisode(name, body) {
  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: TMP_DIR, size: SIZE },
    locale: "th-TH",
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  const helpers = makeHelpers(page);
  try {
    await body(page, helpers);
  } catch (err) {
    console.error(`record${name} failed at a step:`, err.message);
    await page.screenshot({ path: path.join(OUT_DIR, `debug-${name}.png`) }).catch(() => {});
    await ctx.close();
    throw err;
  }
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  const webm = path.join(OUT_DIR, `${name}.webm`);
  // Playwright can still be flushing the video file for a moment right after
  // ctx.close() resolves — retry the copy a few times instead of failing.
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
  transcodeToMp4(name, webm);
}

function transcodeToMp4(name, webm) {
  const ffDir = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  const ffFolder = fs.existsSync(ffDir) ? fs.readdirSync(ffDir).find((d) => d.startsWith("ffmpeg")) : null;
  if (!ffFolder) return;
  const exe = path.join(ffDir, ffFolder, "ffmpeg-win64.exe");
  if (!fs.existsSync(exe)) return;
  const mp4 = path.join(OUT_DIR, `${name}.mp4`);
  const r = spawnSync(exe, ["-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast", mp4], { stdio: "pipe" });
  if (r.status === 0) console.log("saved", mp4, `${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB`);
}

const gotoMaterials = (page, query = "status=all") => page.goto(`${BASE}/materials/pc?${query}`).then(() => page.waitForLoadState("networkidle"));

// FilterDropdown's <Label> has no htmlFor/aria-labelledby wired to its Select
// trigger (unlike the create/edit form's fields), so the combobox's
// accessible name is just whatever value it currently shows — getByRole
// with {name: label} does not work here. Walk from the label text to its
// sibling Select instead.
const filterCombobox = (page, labelText) =>
  page.getByText(labelText, { exact: true }).locator("xpath=following-sibling::*[1]");

/* ================================================================= */
/*                    ตอน 3: Create Material                          */
/* ================================================================= */
async function recordCreate(page, { wait, say, hush, title, moveTo, unspot, click, typeInto, selectOption }) {
  await login(page);
  await page.goto(`${BASE}/materials/pc?status=all`);
  await page.waitForLoadState("networkidle");
  await title("Create Material", "สร้าง Material Master ใหม่ — /materials/pc", 3000);

  await say("หน้า <b>จัดการวัสดุ</b> (/materials/pc) คือที่เดียวที่สร้าง/แก้ไข Material Master ได้จริง", 3200);
  await click(page.getByRole("button", { name: "เพิ่มวัสดุ" }), { spotlight: true });
  await unspot();
  await wait(500);

  await say("ฟอร์มสร้างวัสดุต้องมี <b>รูปภาพ</b> เสมอ — JPEG, PNG หรือ WebP ไม่เกิน 5 MiB", 3000);
  await moveTo(page.getByText("เลือกรูปภาพ").first(), { spotlight: true });
  await page.locator("#material-image").setInputFiles(DEMO_IMAGE);
  await wait(700);
  await unspot();

  await say(`กรอก <b>รหัส</b> และ <b>ชื่อ</b> — ตัวอย่างนี้ใช้ ${DEMO_CODE}`, 2600);
  await typeInto(page.locator("#code"), DEMO_CODE);
  await typeInto(page.locator("#name"), DEMO_NAME);

  await say("เลือก <b>ประเภทวัสดุ</b> จาก Master Data จริง", 2200);
  await selectOption(page.getByRole("combobox", { name: "ประเภทวัสดุ" }), "PC");

  await say("เลือก <b>รูปทรง = PIPE</b> — เมื่อเป็น PIPE, SHEET หรือ COIL ระบบจะบังคับให้กรอก <b>อัตราส่วน (Ratio)</b> ด้วย", 3600);
  await selectOption(page.getByRole("combobox", { name: "รูปทรง" }), "PIPE");

  await say("กรอก <b>อัตราส่วน</b> เป็นจำนวนเต็ม ≥ 1 — ใช้ 20", 2200);
  await typeInto(page.locator("#ratio"), "20");

  await say("เลือก <b>หน่วย</b>", 1800);
  await selectOption(page.getByRole("combobox", { name: "หน่วย" }), "PIPE");

  await say("กรอก <b>จำนวนต่อแพ็ก</b> — ค่านี้ใช้แบ่งกล่องตอนรับเข้าในตอนถัดไป", 2600);
  await typeInto(page.locator("#packingQuantity"), "20");

  await say("กรอก <b>สต็อกขั้นต่ำ (Minimum Stock)</b> — ใช้ประเมินสุขภาพสต็อกภายหลัง", 2600);
  await typeInto(page.locator("#minimumStock"), "40");

  await say("กรอกข้อมูลอ้างอิงที่เหลือ: <b>ประเภทการจัดส่ง, รุ่น, จุดขึ้นสินค้า, สายการผลิต</b>", 3200);
  await selectOption(page.getByRole("combobox", { name: "ประเภทการจัดส่ง" }), "HALF LOWER");
  await selectOption(page.getByRole("combobox", { name: "รุ่น" }), "03P");
  await selectOption(page.getByRole("combobox", { name: "จุดขึ้นสินค้า" }), "จุดขนถ่าย A");
  await typeInto(page.locator("#processLineName"), "Cutting Line 1");

  await say("เลือก <b>ซัพพลายเออร์</b> แล้วกด <b>เพิ่ม</b> — เพิ่มได้มากกว่าหนึ่งราย", 2800);
  await selectOption(page.getByRole("combobox", { name: "ซัพพลายเออร์" }), "THAI HONDA");
  await click(page.getByRole("button", { name: "เพิ่ม", exact: true }));

  await say("กรอก <b>ข้อมูลจำเพาะ</b> และ <b>รายละเอียด</b> เพื่อช่วยแยกวัสดุที่คล้ายกัน", 2800);
  await typeInto(page.locator("#specification"), "ท่อเหล็กกล้า SGP มาตรฐาน Schedule 40 ผิวเรียบ ไม่มีตะเข็บ", { delay: 20 });
  await typeInto(page.locator("#description"), "ใช้สำหรับสาธิตขั้นตอน Create Material ในคู่มือวิดีโอ Materials Management (ข้อมูลทดสอบ)", { delay: 20 });

  await say("ตรวจข้อมูลอีกครั้งก่อนกด <b>เพิ่มวัสดุ</b> เพื่อบันทึก — ระบบอัปโหลดรูปก่อน แล้วค่อยสร้างวัสดุ", 3400);
  await click(page.getByRole("button", { name: "เพิ่มวัสดุ", exact: true }).last(), { spotlight: true });
  await unspot();
  await wait(1800);
  await hush();

  await say(`บันทึกสำเร็จ — ${DEMO_CODE} ปรากฏในรายการ Active ทันที พร้อมคงเหลือ 0 ${""}`, 2800);
  await moveTo(page.getByText(DEMO_NAME).first(), { spotlight: true });
  await wait(1200);
  await unspot();

  await title("จบตอน: Create Material", "ต่อไป: ดูรายละเอียด (Detail) และแก้ไข (Update)", 3000);
}

/* ================================================================= */
/*                    ตอน 1: Overview                                  */
/* ================================================================= */
async function recordOverview(page, { wait, say, title, moveTo, unspot }) {
  await login(page);
  await page.goto(`${BASE}/materials`);
  await page.waitForLoadState("networkidle");
  await title("ภาพรวม Materials", "Control Tower ของวัตถุดิบ — /materials", 3000);
  await say("หน้า <b>/materials</b> คือ Control Tower — ดูสุขภาพสต็อกและงานรับเข้าล่าสุดในภาพรวม", 3400);
  await wait(1500);

  await gotoMaterials(page);
  await say("ส่วนสร้าง/แก้ไขข้อมูลจริงอยู่ที่ <b>/materials/pc</b> (จัดการวัสดุ) — คนละหน้ากับ Control Tower", 3400);
  await moveTo(page.getByRole("heading", { name: "จัดการวัสดุ" }), { spotlight: true });
  await wait(1200);
  await unspot();
  await title("จบตอน: ภาพรวม Materials", "ต่อไป: ดูรายการ / Search / Filter", 2800);
}

/* ================================================================= */
/*                    ตอน 2: Read / Search / Filter                    */
/* ================================================================= */
async function recordRead(page, { wait, say, title, click, typeInto, selectOption, moveTo, unspot }) {
  await login(page);
  await gotoMaterials(page);
  await title("ดูรายการ / Search / Filter", "/materials/pc", 2800);

  await say("ค้นหาด้วย <b>รหัส</b> — พิมพ์บางส่วนของรหัสวัสดุ", 2400);
  await typeInto(page.getByPlaceholder("ค้นหารหัสหรือชื่อวัสดุ..."), DEMO_CODE);
  await wait(900);

  await say("ล้างคำค้น แล้วลองค้นด้วย <b>ชื่อ</b> แทน", 2200);
  await typeInto(page.getByPlaceholder("ค้นหารหัสหรือชื่อวัสดุ..."), "Steel Pipe");
  await wait(900);
  await page.getByPlaceholder("ค้นหารหัสหรือชื่อวัสดุ...").fill("");
  await wait(600);

  await say("ค่าเริ่มต้นของหน้าแสดงเฉพาะ <b>ใช้งาน (Active)</b> — เปลี่ยนเป็นทั้งหมดได้จากตัวกรองสถานะ", 3000);
  await selectOption(filterCombobox(page, "สถานะการใช้งาน"), "ทั้งหมด");
  await wait(900);

  await say("กด <b>ตัวกรองขั้นสูง</b> เพื่อกรองตาม Supplier, Model, จุดขึ้นสินค้า หรือสายการผลิตพร้อมกัน", 3200);
  await click(page.getByRole("button", { name: "ตัวกรองขั้นสูง" }), { spotlight: true });
  await unspot();
  await wait(1200);
  await click(page.getByRole("button", { name: "ปิด", exact: true }).first());

  await title("จบตอน: Read / Search / Filter", "ต่อไป: Create Material", 2800);
}

/* ================================================================= */
/*                    ตอน 4: Material Detail                           */
/* ================================================================= */
async function recordDetail(page, { wait, say, title, click, moveTo, unspot }) {
  await login(page);
  await gotoMaterials(page, `status=all&search=${encodeURIComponent(DEMO_CODE)}`);
  await title("Material Detail", "เปิดรายละเอียดจาก /materials/pc", 2800);

  await say(`ค้นหา <b>${DEMO_CODE}</b> แล้วกด <b>ดูรายละเอียด</b> — ปุ่มนี้มองเห็นตรงๆ บน Editorial card ไม่ได้ซ่อนในเมนู ⋯`, 3400);
  await click(page.getByRole("button", { name: "รายละเอียด", exact: true }).first(), { spotlight: true });
  await unspot();
  await wait(800);

  await say("Dialog แสดง <b>Identity, สถานะ/รูปทรง, คงเหลือ, Data Sheet และเวลาที่แก้ไขล่าสุด</b> ทั้งหมดในหน้าเดียว", 3600);
  await moveTo(page.getByRole("dialog"), { spotlight: true });
  await wait(1600);
  await unspot();

  await say("ปิดใช้งาน + hard delete <b>ไม่มี</b> ในระบบนี้ — Data Sheet ไม่มี Reserved/Available เพราะยังไม่เชื่อม Production Plan", 3600);
  await click(page.getByRole("button", { name: "ปิด", exact: true }).first());

  await title("จบตอน: Material Detail", "ต่อไป: Update Material", 2800);
}

/* ================================================================= */
/*                    ตอน 5: Update Material                           */
/* ================================================================= */
async function recordUpdate(page, { wait, say, title, click, typeInto }) {
  await login(page);
  await gotoMaterials(page, `status=all&search=${encodeURIComponent(DEMO_CODE)}`);
  await title("Update Material", "แก้ไขด้วยฟอร์มเดียวกับ Create", 2800);

  await say("กด <b>แก้ไข</b> จากเมนู ⋯ — ฟอร์มเดิม แต่รูปภาพไม่บังคับถ้ามีรูปเดิมอยู่แล้ว", 3200);
  await click(page.getByRole("button", { name: `ตัวเลือกสำหรับ ${DEMO_NAME}` }).first(), { spotlight: true });
  await click(page.getByRole("menuitem", { name: "แก้ไข" }));
  await wait(800);

  await say("เปลี่ยน <b>ชื่อ</b> ต่อท้ายด้วย \" - Updated\"", 2400);
  await typeInto(page.locator("#name"), `${DEMO_NAME} - Updated`);

  await say("เปลี่ยน <b>จำนวนต่อแพ็ก</b> จาก 20 เป็น 25 — มีผลกับ Receiving ครั้งถัดไปเท่านั้น", 3000);
  await typeInto(page.locator("#packingQuantity"), "25");

  await say("บันทึกด้วย <b>PATCH /materials/:id</b> พร้อม updatedAt — ป้องกันเขียนทับข้อมูลที่คนอื่นเพิ่งแก้ (optimistic concurrency)", 3600);
  await click(page.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true }), { spotlight: true });
  await wait(1500);
  liveName = `${DEMO_NAME} - Updated`;

  await title("จบตอน: Update Material", "ต่อไป: Delete / Inactive", 2800);
}

/* ================================================================= */
/*                    ตอน 6: Delete / Inactive                         */
/* ================================================================= */
async function recordDeactivate(page, { wait, say, title, click, selectOption }) {
  await login(page);
  await gotoMaterials(page, `status=all&search=${encodeURIComponent(DEMO_CODE)}`);
  await title("Delete Material", "จริงๆ คือ Soft Deactivate ไม่ใช่ลบถาวร", 3000);

  await say("กด <b>ปิดใช้งาน</b> จากเมนู ⋯ — ระบบเรียก DELETE /materials/:id แต่ Service เปลี่ยน isActive เป็น false เท่านั้น", 3800);
  await click(page.getByRole("button", { name: `ตัวเลือกสำหรับ ${liveName}` }).first(), { spotlight: true });
  await click(page.getByRole("menuitem", { name: "ปิดใช้งาน" }));
  await wait(600);
  await click(page.getByRole("button", { name: "ปิดใช้งาน", exact: true }).last(), { spotlight: true });
  await wait(1200);

  await say("เปลี่ยนตัวกรองเป็น <b>ไม่ได้ใช้งาน</b> — วัสดุยังอยู่ครบ แค่ไม่โผล่ในรายการ Active เริ่มต้น", 3200);
  await selectOption(filterCombobox(page, "สถานะการใช้งาน"), "ไม่ใช้งาน");
  await wait(1000);

  await say("กด <b>เปิดใช้งาน</b> เพื่อคืนสถานะ — PATCH /materials/:id/restore", 2600);
  await click(page.getByRole("button", { name: `ตัวเลือกสำหรับ ${liveName}` }).first(), { spotlight: true });
  await click(page.getByRole("menuitem", { name: "เปิดใช้งาน" }));
  await wait(600);
  await click(page.getByRole("button", { name: "เปิดใช้งาน", exact: true }).last());
  await wait(1200);

  await title("จบตอน: Delete / Inactive", "ต่อไป: Validation", 2800);
}

/* ================================================================= */
/*                    ตอน 7: Validation                                 */
/* ================================================================= */
async function recordValidation(page, { wait, say, title, click, unspot }) {
  await login(page);
  await gotoMaterials(page);
  await title("Validation", "ตัวอย่างจากกฎจริงใน UI/DTO/Service", 3000);

  await say("ปล่อยทุกช่องว่างแล้วกด <b>เพิ่มวัสดุ</b> — ทดสอบ <b>Required Code / Name</b>", 2800);
  await click(page.getByRole("button", { name: "เพิ่มวัสดุ" }), { spotlight: true });
  await unspot();
  await click(page.getByRole("button", { name: "เพิ่มวัสดุ", exact: true }).last());
  await wait(900);
  await say("UI แจ้งทันทีว่าต้องกรอกรหัสและชื่อก่อนแตะ backend เลย", 2600);

  await say(`ทดสอบ <b>Duplicate Code</b> — กรอกรหัสซ้ำกับ ${DEMO_CODE} ที่มีอยู่แล้ว (ครบทุกช่องบังคับ เพื่อให้ถึง backend จริง)`, 3400);
  await page.locator("#material-image").setInputFiles(DEMO_IMAGE);
  await page.locator("#code").fill(DEMO_CODE);
  await page.locator("#name").fill("Duplicate Code Test");
  await page.getByRole("combobox", { name: "หน่วย" }).click();
  await page.getByRole("option").first().click();
  await click(page.getByRole("button", { name: "เพิ่มวัสดุ", exact: true }).last(), { spotlight: true });
  await wait(1500);
  await say("Backend ตอบ 409 — <b>Material code already exists</b> เพราะรหัสนี้มีอยู่จริงแล้ว", 3200);
  await unspot();

  await click(page.getByRole("button", { name: "ยกเลิก", exact: true }).last());
  await title("จบตอน: Validation", "ต่อไป: Material Receiving", 2800);
}

/* ================================================================= */
/*                    ตอน 8: Material Receiving                        */
/* ================================================================= */
async function recordReceiving(page, { wait, say, title, click, typeInto, moveTo, unspot }) {
  await login(page);
  await page.goto(`${BASE}/materials/materials-receiving`);
  await page.waitForLoadState("networkidle");
  await title("Material Receiving", "รับเข้า → แปลงจำนวน → แบ่งแพ็ก → Lot/QR → Stock", 3400);

  await say("กด <b>รับเข้าวัตถุดิบ</b> เพื่อเปิดฟอร์ม", 2200);
  await click(page.getByRole("button", { name: "รับเข้าวัตถุดิบ" }), { spotlight: true });
  await unspot();
  await wait(600);

  await say(`เลือก <b>วัสดุ</b> = ${DEMO_CODE}`, 2200);
  const materialSelect = page.getByRole("dialog").getByRole("combobox").first();
  await click(materialSelect);
  await wait(300);
  await click(page.getByRole("option", { name: new RegExp(DEMO_CODE) }).first());

  await say("กรอก <b>จำนวนรับเข้า</b> = 2 (Packing 25/แพ็ก → 2×20=40 หน่วย แบ่งได้ 25+15)", 3200);
  await typeInto(page.locator("#mr-receive-qty"), "2");

  if (await page.locator("#mr-ratio").count()) {
    await say("รูปทรง PIPE ต้องยืนยัน <b>Ratio</b> อีกครั้งตอนรับเข้า — ใช้ 20", 2800);
    await typeInto(page.locator("#mr-ratio"), "20");
  }

  await say("กำหนด <b>วันที่ Supplier ผลิต</b> (ห้ามเป็นอนาคต)", 2200);
  const today = new Date().toISOString().slice(0, 10);
  await page.locator("#mr-supplier-production-date").fill(today);
  await wait(600);

  await say("ดู <b>ตัวอย่างก่อนยืนยัน</b> ทางขวา — Internal Lot, Supplier Lot, Converted Qty และ Package breakdown", 3400);
  await moveTo(page.getByText("ตัวอย่างก่อนยืนยันรับเข้า").first(), { spotlight: true }).catch(() => {});
  await wait(1200);
  await unspot();

  await say("กด <b>ยืนยันการรับเข้า</b> — สร้าง Draft และ Confirm stock ในคำสั่งเดียว", 2800);
  await click(page.getByRole("button", { name: "ยืนยันการรับเข้า" }), { spotlight: true });
  await unspot();
  await wait(2000);

  await say("เปิด <b>ดูรายละเอียด</b> ของรายการล่าสุด เพื่อดู Lot, QR และสถานะของแต่ละกล่อง", 3000);
  const detailBtn = page.getByRole("button", { name: "ดูรายละเอียด" }).first();
  if (await detailBtn.count()) {
    await click(detailBtn, { spotlight: true });
    await wait(1500);
    await unspot();
  }

  await title("จบตอน: Material Receiving", "ต่อไป: Material Disbursement", 2800);
}

/* ================================================================= */
/*                    ตอน 9: Material Disbursement                     */
/* ================================================================= */
async function recordDisbursement(page, { wait, say, title, click, typeInto, unspot }) {
  await login(page);
  await page.goto(`${BASE}/materials/materials-disbursement`);
  await page.waitForLoadState("networkidle");
  await title("Material Disbursement", "สร้างร่าง → Confirm → FIFO ตัดแพ็กเกจเก่าสุดก่อน", 3400);

  await say("กด <b>เพิ่มรายการจ่ายออก</b> — ประเภทเริ่มต้นคือ เบิกเพื่อผลิต", 2600);
  await click(page.getByRole("button", { name: "เพิ่มรายการจ่ายออก" }), { spotlight: true });
  await unspot();
  await wait(600);

  await say(`เลือก <b>วัสดุ</b> ในแถวรายการ = ${DEMO_CODE}`, 2400);
  const dialog = page.getByRole("dialog");
  await click(dialog.getByRole("combobox").nth(1)); // 0 = disbursementType (md-type), 1 = the item row's material select
  await wait(300);
  await click(page.getByRole("option", { name: new RegExp(DEMO_CODE) }).first());

  await say("กรอก <b>จำนวนที่จ่ายออก</b> — ต้องไม่เกินคงเหลือที่ระบบแสดงไว้", 2600);
  await typeInto(dialog.locator('input[type="number"]').first(), "1");

  await say("กด <b>บันทึกร่าง</b> — ยังไม่ตัดสต็อกจนกว่าจะยืนยัน", 2400);
  await click(page.getByRole("button", { name: "บันทึกร่าง", exact: true }), { spotlight: true });
  await unspot();
  await wait(1500);

  await say("ยืนยันจากเมนู ⋯ ของแถวล่าสุด — Backend เรียง Package ตาม Receive Date เก่าสุดก่อน (FIFO)", 3400);
  const menuBtn = page.getByRole("button", { name: /ตัวเลือกสำหรับ DIS-/ }).first();
  if (await menuBtn.count()) {
    await click(menuBtn, { spotlight: true });
    await unspot();
    const confirmItem = page.getByRole("menuitem", { name: "ยืนยันการจ่ายออก" });
    if (await confirmItem.count()) {
      await click(confirmItem);
      await wait(1500);
    }
  }

  await title("จบตอน: Material Disbursement", "ต่อไป: BOM", 2800);
}

/* ================================================================= */
/*                    ตอน 10: BOM                                       */
/* ================================================================= */
async function recordBom(page, { wait, say, title, click, moveTo, unspot }) {
  await login(page);
  await gotoMaterials(page, `status=all&search=${encodeURIComponent(DEMO_CODE)}`);
  await title("BOM", "ดูว่า Material ถูกใช้ใน BOM ของ Product ใดบ้าง", 3000);

  await say("เปิดเมนู ⋯ แล้วเลือก <b>BOM / Products</b>", 2400);
  await click(page.getByRole("button", { name: `ตัวเลือกสำหรับ ${liveName}` }).first(), { spotlight: true });
  await unspot();
  await click(page.getByRole("menuitem", { name: "BOM / Products" }));
  await wait(900);

  await say("วัสดุตัวอย่างนี้ยังไม่เคยถูกผูกกับ BOM ใด — ระบบแสดงสถานะจริงตามข้อมูลจริง ไม่ปั้นข้อมูลหลอก", 3600);
  await moveTo(page.getByRole("dialog"), { spotlight: true });
  await wait(1600);
  await unspot();

  await click(page.getByRole("button", { name: "ปิด", exact: true }).first());
  await title("จบตอน: BOM", "ต่อไป: Stock", 2600);
}

/* ================================================================= */
/*                    ตอน 11: Stock                                     */
/* ================================================================= */
async function recordStock(page, { wait, say, title, click, selectOption, moveTo, unspot }) {
  await login(page);
  await page.goto(`${BASE}/materials`);
  await page.waitForLoadState("networkidle");
  await title("Stock", "On Hand, Minimum Stock และ Stock Health", 3000);

  await say("<b>/materials</b> แสดง KPI และ Stock Health Rail ของวัสดุที่ Active ทั้งหมด", 3000);
  await wait(1200);

  await gotoMaterials(page);
  await say("กรองด้วย <b>สถานะสต็อก</b> — แยก ปกติ / ต่ำ / หมด", 2600);
  const stockFilter = filterCombobox(page, "สถานะสต็อก");
  if (await stockFilter.count()) {
    await selectOption(stockFilter, "สต็อกต่ำ");
    await wait(1200);
  }

  await say(`${DEMO_CODE} รับเข้าไปแล้วบางส่วนถูกจ่ายออกในตอนก่อนหน้า — คงเหลือน้อยกว่า Minimum Stock (40) จึงจัดเป็น <b>สต็อกต่ำ</b>`, 3600);
  await moveTo(page.getByText(liveName).first(), { spotlight: true }).catch(() => {});
  await wait(1200);
  await unspot();

  await title("จบตอน: Stock", "จบชุดตอนหลักของ Materials Management", 3000);
}

const EPISODES = {
  overview: recordOverview,
  read: recordRead,
  create: recordCreate,
  detail: recordDetail,
  update: recordUpdate,
  deactivate: recordDeactivate,
  validation: recordValidation,
  receiving: recordReceiving,
  disbursement: recordDisbursement,
  bom: recordBom,
  stock: recordStock,
};

/* ---------- run ---------- */
await preflight();

const requested = episodeName === "all" ? Object.keys(EPISODES) : [episodeName];
for (const name of requested) {
  const fn = EPISODES[name];
  if (!fn) {
    console.error(`unknown episode "${name}" — available: ${Object.keys(EPISODES).join(", ")}`);
    continue;
  }
  console.log(`--- recording: ${name} ---`);
  try {
    await withEpisode(name, fn);
  } catch (err) {
    console.error(`episode "${name}" aborted:`, err.message);
  }
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });
await browser.close();
