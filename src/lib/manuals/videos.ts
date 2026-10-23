import { findManual } from "./content";

export interface VideoManual {
  slug: string;
  /** Section number shown on the card, e.g. "2.1". */
  number: string;
  title: string;
  summary: string;
  /** Public path of the video file under /public. Omit while the video is not recorded yet. */
  src?: string;
  /** Still frame shown before play, so the video itself is not downloaded up front. */
  poster?: string;
  /** Full written manual for the same screen, linked under the steps. */
  manualHref?: string;
  /** The screen the card is about, linked as "เปิดหน้าจอนี้". */
  screenHref?: string;
  /** Sub-heading inside the chapter, mirroring the sidebar group (e.g. "แผนผลิต"). */
  group?: string;
  /** Short numbered steps shown under the video. */
  steps: string[];
}

export interface VideoChapter {
  number: string;
  title: string;
  description: string;
  videos: VideoManual[];
}

interface CardOptions {
  /** Slug of a written manual: its step titles become the card steps and it is linked. */
  manual?: string;
  screen?: string;
  steps?: string[];
}

function card(number: string, slug: string, title: string, summary: string, options: CardOptions = {}): VideoManual {
  const manual = options.manual ? findManual(options.manual) : undefined;
  return {
    slug,
    number,
    title,
    summary,
    manualHref: manual ? `/manuals/${manual.slug}` : undefined,
    screenHref: options.screen ?? manual?.href,
    steps: options.steps ?? manual?.steps.map((step) => step.title) ?? [],
  };
}

/** Steps shared by every simple master-data page (generic list + dialog UI). */
function masterData(number: string, path: string, title: string, what: string): VideoManual {
  return card(number, `master-${path}`, title, `เพิ่มและแก้ไข${what} ที่ใช้เป็นตัวเลือกในฟอร์มอื่นของระบบ`, {
    screen: `/master-data/${path}`,
    steps: [
      `เปิดเมนู ${title}`,
      "ค้นหาจากรหัสหรือชื่อ และกรองสถานะ ใช้งาน / ไม่ใช้งาน",
      "กดปุ่มเพิ่ม กรอกรหัสและชื่อ แล้วบันทึก",
      "กดปุ่ม ⋯ ของแถวเพื่อดูรายละเอียด แก้ไข หรือปิดใช้งาน (ข้อมูลไม่ถูกลบ เปิดใช้งานกลับได้)",
    ],
  });
}

// Source files live in docs/คู่มือ; the served copies are in public/manuals/videos.
// Cards 1.1 and 1.2 have bundled videos; any card can also get a video uploaded from
// the page (SUPER_ADMIN), which overrides these. Steps come from the written manuals
// (content.ts) where one exists, otherwise they are written here.
const SOURCE_CHAPTERS: VideoChapter[] = [
  {
    number: "1",
    title: "เริ่มต้นใช้งาน",
    description: "เข้าสู่ระบบ ภาพรวม และการใช้เมนู",
    videos: [
      {
        slug: "login-single-department",
        number: "1.1",
        title: "เข้าสู่ระบบสำหรับผู้ใช้ที่มี 1 แผนก",
        summary: "ผู้ใช้ที่สังกัดแผนกเดียวจะเข้าสู่ระบบได้ทันทีหลังกรอกชื่อผู้ใช้และรหัสผ่าน",
        src: "/manuals/videos/login-single-department.mp4",
        poster: "/manuals/videos/login-single-department.jpg",
        manualHref: "/manuals/login",
        steps: [
          "เปิดหน้าเข้าสู่ระบบ แล้วกรอกชื่อผู้ใช้และรหัสผ่าน",
          "กดปุ่ม เข้าสู่ระบบ",
          "ระบบพาเข้าสู่หน้าแดชบอร์ดทันที เพราะผู้ใช้สังกัดแผนกเดียว",
        ],
      },
      {
        slug: "login-multi-department",
        number: "1.2",
        title: "เข้าสู่ระบบสำหรับผู้ใช้ที่มีมากกว่า 1 แผนก",
        summary: "ผู้ใช้ที่สังกัดหลายแผนกต้องเลือกแผนกที่จะใช้งานหลังกรอกชื่อผู้ใช้และรหัสผ่าน",
        src: "/manuals/videos/login-multi-department.mp4",
        poster: "/manuals/videos/login-multi-department.jpg",
        manualHref: "/manuals/login",
        steps: [
          "เปิดหน้าเข้าสู่ระบบ แล้วกรอกชื่อผู้ใช้และรหัสผ่าน",
          "กดปุ่ม เข้าสู่ระบบ",
          "เลือกแผนกที่ต้องการใช้งานจากรายการ แล้วยืนยัน",
          "ระบบพาเข้าสู่หน้าแดชบอร์ดของแผนกที่เลือก (สลับแผนกภายหลังได้จากเมนูผู้ใช้ มุมขวาบน)",
        ],
      },
      card("1.3", "navigation", "การใช้เมนูและแถบด้านบน", "เมนูทางซ้าย การค้นหา และเมนูผู้ใช้", { manual: "navigation" }),
      card("1.4", "dashboard", "ภาพรวม (แดชบอร์ด)", "สรุปสถานะคลัง เอกสาร และงานผลิตของทั้งระบบ", {
        screen: "/dashboard",
        steps: [
          "เปิดเมนู ภาพรวม เป็นหน้าแรกหลังเข้าสู่ระบบ",
          "ดูตัวเลขสรุปด้านบน (สต็อก เอกสารรับเข้า/จ่ายออก งานผลิต)",
          "ดูรายการวัสดุที่ใกล้หมดและเอกสารล่าสุด (แสดงตามสิทธิ์ของผู้ใช้)",
          "กดรีเฟรชเพื่อโหลดข้อมูลใหม่",
        ],
      }),
      card("1.5", "menu-hub", "รวมเมนู", "หน้าทางลัดแสดงทุกเมนูที่ผู้ใช้เข้าถึงได้", {
        screen: "/menu-hub",
        steps: ["เปิดเมนู รวมเมนู", "ค้นหาหรือเลื่อนดูเมนูที่แบ่งเป็นกลุ่มตามหน้าที่", "กดการ์ดของเมนูเพื่อเข้าหน้านั้นทันที"],
      }),
      card("1.6", "system-flow", "ภาพรวมลำดับงานของระบบ", "ลำดับตั้งแต่ตั้งค่าข้อมูลหลัก รับวัตถุดิบ ผลิต จนถึงขายและสอบกลับ", { manual: "system-flow" }),
    ],
  },
  {
    number: "2",
    title: "คลังวัสดุ",
    description: "ทะเบียนวัสดุ การรับเข้า การจ่ายออก และใบจัดงาน",
    videos: [
      card("2.1", "material-catalog", "ทะเบียนวัสดุ", "เพิ่มและจัดการวัสดุ PCS หรือ PIPE / SHEET / COIL พร้อมชิ้นงานหลังแปรรูป", { manual: "material-catalog" }),
      card("2.2", "material-receiving", "รับเข้าวัสดุ", "รับวัตถุดิบเข้าคลัง ระบบสร้างล็อต แบ่งกล่อง และสร้าง QR ให้อัตโนมัติ", { manual: "material-receiving" }),
      card("2.3", "material-create", "เพิ่มข้อมูล materials", "เพิ่มวัสดุใหม่ในทะเบียนวัสดุทีละขั้นตอน เลือกชนิดเหล็ก กรอกข้อมูล และแนบรูป", {
        screen: "/materials/catalog",
        steps: [
          "เปิดเมนู ทะเบียนวัสดุ แล้วกดปุ่ม เพิ่มวัสดุ",
          "เลือกชนิดเหล็ก (ชิ้นงาน PCS / ท่อ / แผ่น / ม้วน) ก่อนกรอกข้อมูลอื่น",
          "กรอกรหัสและชื่อวัสดุ ระบบตรวจรหัสซ้ำให้ทันที แล้วเลือกประเภทวัสดุ หน่วย และซัพพลายเออร์อย่างน้อย 1 ราย",
          "แนบรูปวัสดุ (JPEG / PNG / WebP ไม่เกิน 5 MB)",
          "สำหรับท่อ แผ่น หรือม้วน กรอกข้อมูลชิ้นงานหลังแปรรูปในขั้นถัดไปด้วย",
          "กดบันทึกร่างได้ทุกขั้น หรือกดบันทึกที่ขั้นสุดท้ายเพื่อสร้างวัสดุ",
        ],
      }),
      card("2.3", "material-disbursement", "จ่ายออกวัสดุ", "เบิกวัสดุเพื่อผลิตหรือตัดสต็อก ระบบตัดกล่องเก่าก่อน (FIFO)", { manual: "material-disbursement" }),
      card("2.4", "job-orders-products", "ใบจัดงานสินค้า", "ใบจัดงานของแผนผลิตสินค้า: พิมพ์ สแกนหยิบ และจ่ายวัตถุดิบ", {
        manual: "material-job-orders",
        screen: "/materials/job-orders/products",
      }),
      card("2.5", "job-orders-internal-materials", "ใบจัดงานวัตถุดิบภายใน", "ใบจัดงานของแผนผลิตวัสดุภายใน ใช้ขั้นตอนเดียวกับใบจัดงานสินค้า", {
        manual: "material-job-orders",
        screen: "/materials/job-orders/internal-materials",
      }),
    ],
  },
  {
    number: "3",
    title: "แปรรูปวัตถุดิบ",
    description: "ตัดท่อ แผ่น ม้วน เป็นชิ้นงานพร้อม QR",
    videos: [card("3.1", "material-processing", "แปรรูปวัตถุดิบ", "แปรรูป PIPE / SHEET / COIL เป็นชิ้นงาน PCS แล้วสร้างล็อตและ QR ใหม่", { manual: "material-processing" })],
  },
  {
    number: "4",
    title: "วางแผนและดำเนินการผลิต",
    description: "แผนผลิต สั่งผลิตตามกระบวนการ บันทึกผลผลิต",
    videos: [
      card("4.1", "production-plans-products", "แผนผลิตสินค้า", "สร้างและอนุมัติแผนผลิตสินค้า ระบบกันสต็อกวัตถุดิบแบบ FIFO", { manual: "production-plans" }),
      card("4.2", "production-plans-materials", "แผนผลิตวัสดุภายใน", "แผนผลิตของวัสดุภายในที่มี BOM ใช้ขั้นตอนเดียวกับแผนผลิตสินค้า", {
        manual: "production-plans",
        screen: "/production/internal-materials/plans",
      }),
      card("4.3", "process-orders-products", "สั่งผลิตตามกระบวนการ: สินค้า", "สั่งผลิตจากแผนที่จ่ายวัตถุดิบครบ แล้วบันทึกผลผลิตทีละขั้นตอน", { manual: "process-orders" }),
      card("4.4", "process-orders-materials", "สั่งผลิตตามกระบวนการ: วัตถุดิบภายใน", "สั่งผลิตและบันทึกผลผลิตของวัสดุภายใน เมื่อเสร็จรับเข้าคลังอัตโนมัติ", {
        manual: "process-orders",
        screen: "/production/internal-materials/orders",
      }),
    ],
  },
  {
    number: "5",
    title: "สินค้าและวิศวกรรม",
    description: "ทะเบียนสินค้า BOM และ Workflow",
    videos: [
      card("5.1", "products-overview", "ภาพรวมสินค้า", "สรุปการรับเข้า/จ่ายออกสินค้าตามช่วงวันที่ และสินค้าที่ต่ำกว่าขั้นต่ำ", {
        screen: "/engineering/products/overview",
        steps: [
          "เปิดเมนู ภาพรวมสินค้า",
          "เลือกช่วงวันที่ (วันนี้ 7/14/30/90 วัน เดือนนี้ เดือนที่แล้ว หรือกำหนดเอง)",
          "ดูตัวเลขรวม กราฟแนวโน้ม และตารางรวมต่อสินค้า",
          "กดไอคอนดูรายการเคลื่อนไหวของสินค้าแต่ละตัว หรือส่งออกเป็น CSV",
        ],
      }),
      card("5.2", "products", "ทะเบียนสินค้า", "เพิ่มและจัดการสินค้า พร้อมสต็อกสินค้าสำเร็จรูป", { manual: "products" }),
      card("5.3", "bom-products", "BOM และ Workflow: สินค้า", "กำหนดวัตถุดิบที่ใช้ (BOM) และขั้นตอนผลิต (Workflow) ของสินค้า", { manual: "bom-workflow" }),
      card("5.4", "bom-materials", "BOM และ Workflow: วัสดุ", "กำหนด BOM และ Workflow ของวัสดุภายในที่ผลิตเอง", {
        manual: "bom-workflow",
        screen: "/engineering/bom/materials",
      }),
      card("5.5", "setup-wizard", "สร้างครบชุด", "สร้างวัสดุ สินค้า BOM และ Workflow ต่อเนื่องในฟอร์มเดียว (ผู้ดูแลระบบสูงสุด)", {
        screen: "/engineering/setup",
        steps: [
          "เปิดเมนู สร้างครบชุด แล้วเลือกสร้างสินค้าหรือวัสดุ",
          "กรอกวัสดุใหม่ (ถ้ามี) และข้อมูลสินค้า ระบบตรวจรหัสซ้ำให้ทันที",
          "กำหนด BOM และ Workflow",
          "ตรวจทานแล้วกดสร้าง หรือกดบันทึกร่างเพื่อกลับมาทำต่อจาก ร่างของฉัน",
        ],
      }),
    ],
  },
  {
    number: "6",
    title: "การขายและจัดส่ง",
    description: "ออเดอร์ขาย ใบจัดงานขาย และตัดสต็อกส่งของ",
    videos: [
      card("6.1", "sales-orders", "ออเดอร์ขาย", "สร้างออเดอร์ขาย ยืนยันเพื่อจองกล่องสินค้าแบบ FIFO", { manual: "sales-orders" }),
      card("6.2", "sales-job-orders", "ใบจัดงานขาย / ตัดสต็อก", "สแกนหยิบกล่องสินค้า แล้วตัดสต็อกออกใบส่งของ (DO)", { manual: "sales-job-orders" }),
    ],
  },
  {
    number: "7",
    title: "รายงานและตรวจสอบ",
    description: "รายงานวัสดุ สอบกลับการผลิต รายงานขาย และบันทึกการใช้งาน",
    videos: [
      card("7.1", "materials-report", "รายงานติดตามวัสดุ", "ติดตามการรับเข้าและจ่ายออกของวัสดุ ตรวจย้อนไปถึงล็อตและ QR", { manual: "materials-report" }),
      card("7.2", "production-traceability", "สอบกลับการผลิต", "สแกนหรือค้นหา QR / ล็อต เพื่อดูต้นทางวัตถุดิบ วันผลิต และวันขาย", { manual: "production-traceability" }),
      card("7.3", "product-lots-report", "รายงานสอบกลับสินค้า", "ตารางล็อตสินค้า วันผลิต กล่องที่แพ็ก ยอดขาย และสถานะ", {
        screen: "/reports/product-lots",
        steps: [
          "เปิดเมนู รายงานสอบกลับสินค้า",
          "ค้นหาและกรองตามสถานะการขายและช่วงวันที่ผลิต",
          "กดรหัสล็อตเพื่อไปดูต้นทางและการขายที่หน้าสอบกลับการผลิต",
          "ส่งออกเป็น CSV ได้",
        ],
      }),
      card("7.4", "sales-report", "รายงานการขาย", "สรุปการส่งสินค้าตามช่วงวันที่ ลูกค้า และสินค้า", { manual: "sales-report" }),
      card("7.5", "audit-logs", "บันทึกการตรวจสอบ", "ดูประวัติการทำรายการสำคัญในระบบ (ผู้ดูแลระบบสูงสุด)", { manual: "audit-logs" }),
    ],
  },
  {
    number: "8",
    title: "ข้อมูลพื้นฐานและระบบ",
    description: "ข้อมูลหลัก ผู้ใช้และสิทธิ์ และการจัดการเมนู (ผู้ดูแลระบบสูงสุด)",
    videos: [
      card("8.1", "master-data-hub", "ข้อมูลพื้นฐาน (หน้ารวม)", "หน้ารวมข้อมูลหลักทุกชนิด แยกเป็นกลุ่ม พร้อมจำนวนรายการ", { manual: "master-data", screen: "/master-data" }),
      masterData("8.2", "units", "จัดการหน่วยนับ", "หน่วยนับ (เช่น ชิ้น กิโลกรัม)"),
      masterData("8.3", "suppliers", "จัดการผู้จัดจำหน่าย", "ผู้จัดจำหน่าย (ซัพพลายเออร์)"),
      masterData("8.4", "material-models", "จัดการรุ่นวัสดุ", "รุ่นวัสดุ"),
      masterData("8.5", "material-types", "จัดการประเภทวัสดุ", "ประเภทวัสดุ (ลบถาวรได้เมื่อไม่มีวัสดุใช้งานอยู่)"),
      masterData("8.6", "categories", "จัดการหมวดหมู่", "หมวดหมู่"),
      masterData("8.7", "locations", "จัดการสถานที่", "สถานที่จัดเก็บ"),
      masterData("8.8", "product-types", "จัดการประเภทสินค้า", "ประเภทสินค้า"),
      masterData("8.9", "product-models", "จัดการรุ่นสินค้า", "รุ่นสินค้า"),
      masterData("8.10", "customers", "จัดการลูกค้า", "ลูกค้า"),
      masterData("8.11", "delivery-types", "จัดการประเภทการจัดส่ง", "ประเภทการจัดส่ง"),
      masterData("8.12", "loading-points", "จัดการจุดขนถ่าย", "จุดขนถ่าย"),
      masterData("8.13", "process-lines", "จัดการสายการผลิต", "สายการผลิต"),
      masterData("8.14", "process-steps", "จัดการกระบวนการผลิต", "ขั้นตอนกระบวนการผลิตที่ใช้ใน Workflow"),
      masterData("8.15", "reject-reasons", "จัดการเหตุผลการปฏิเสธ", "เหตุผลของเสียที่ใช้ตอนบันทึกผลผลิต"),
      masterData("8.16", "statuses", "จัดการสถานะ", "สถานะ (กำหนดสีและค่าเริ่มต้น)"),
      masterData("8.17", "organizations", "จัดการองค์กร", "องค์กร"),
      card("8.18", "system-users", "จัดการผู้ใช้งาน", "เพิ่มผู้ใช้ กำหนดแผนกและบทบาท รีเซ็ตรหัสผ่าน และเปิด/ปิดใช้งาน", {
        screen: "/system/users",
        steps: [
          "เปิดเมนู จัดการผู้ใช้งาน แล้วค้นหาผู้ใช้",
          "กดเพิ่มผู้ใช้ กรอกข้อมูลและเลือกแผนกกับบทบาทแรก",
          "กดไอคอนจัดการแผนกเพื่อเพิ่มหรือแก้แผนกและบทบาทอื่นของผู้ใช้",
          "รีเซ็ตรหัสผ่าน ปิดใช้งาน หรือลบจากปุ่ม ⋯ (ควรปิดใช้งานแทนการลบ)",
        ],
      }),
      card("8.19", "system-departments", "จัดการแผนก", "แผนกและกลุ่มแผนก ซึ่งแผนกย่อยรับสิทธิ์ต่อจากกลุ่ม", {
        screen: "/system/departments",
        steps: [
          "เปิดเมนู จัดการแผนก",
          "เพิ่มกลุ่มแผนก หรือเพิ่มแผนกย่อยโดยเลือกกลุ่มแม่",
          "แก้ไขชื่อ เปิด/ปิดใช้งาน หรือลบ (ลบไม่ได้ถ้ายังมีแผนกย่อยหรือผู้ใช้)",
        ],
      }),
      card("8.20", "system-roles", "จัดการบทบาท", "บทบาทของผู้ใช้ และเปิด/ปิดใช้งาน", {
        screen: "/system/roles",
        steps: [
          "เปิดเมนู จัดการบทบาท",
          "เพิ่มหรือแก้ไขบทบาท",
          "เปิดหรือปิดใช้งาน (บทบาทระบบปิดหรือลบไม่ได้ บทบาทที่มีผู้ใช้ลบไม่ได้)",
          "แก้สิทธิ์ตาม action ของบทบาทที่หน้า จัดการสิทธิ์ แท็บ Role",
        ],
      }),
      card("8.21", "system-permissions", "จัดการสิทธิ์", "กำหนดว่าแผนกใดเปิดเมนูและ action ใดได้ รวมสิทธิ์รายบุคคล", {
        screen: "/system/permissions",
        steps: [
          "เปิดเมนู จัดการสิทธิ์ แล้วเลือกแท็บ ตามแผนก, Role หรือ ผู้ใช้",
          "ติ๊กช่องเมนู × action เพื่อเปิดหรือปิดสิทธิ์ (ติ๊กกลุ่มเพื่อเปิดทั้งกลุ่ม)",
          "กดบันทึกและระบุเหตุผล ทุกการเปลี่ยนแปลงถูกบันทึกในบันทึกการตรวจสอบ",
        ],
      }),
      card("8.22", "system-sessions", "จัดการเซสชัน", "ดูเซสชันที่เข้าสู่ระบบอยู่ และบังคับออกจากระบบ", {
        screen: "/system/sessions",
        steps: ["เปิดเมนู จัดการเซสชัน", "ดูรายการเซสชันและผู้ใช้", "กดเพิกถอนเซสชันเพื่อบังคับให้ผู้ใช้ออกจากระบบ"],
      }),
      card("8.23", "menu-management", "จัดการเมนู", "ลากเรียงลำดับเมนู เพิ่ม แก้ไข และลบเมนู", { manual: "menu-management" }),
    ],
  },
];

const CARDS = new Map(SOURCE_CHAPTERS.flatMap((chapter) => chapter.videos).map((video) => [video.slug, video] as const));

interface ChapterSpec {
  title: string;
  description: string;
  /** Optional sidebar group heading, then the card slugs in sidebar order. */
  groups: Array<{ group?: string; slugs: string[] }>;
}

// Chapters and groups mirror the sidebar (iam.menus) top to bottom; the first chapter
// holds the topics that are not menus. Numbers are assigned from the order below.
const STRUCTURE: ChapterSpec[] = [
  {
    title: "เริ่มต้นใช้งาน",
    description: "เข้าสู่ระบบ การใช้เมนู และภาพรวมลำดับงานของระบบ",
    groups: [{ slugs: ["login-single-department", "login-multi-department"] }],
  },
  {
    title: "คลังวัสดุ",
    description: "ทะเบียนวัสดุ การรับเข้า และการจ่ายออก",
    groups: [{ slugs: ["material-catalog", "material-create", "material-receiving", "material-disbursement"] }],
  },
  {
    title: "ใบจัดงาน",
    description: "ใบจัดงานของแผนผลิต: พิมพ์ สแกนหยิบ และจ่ายวัตถุดิบ",
    groups: [{ slugs: ["job-orders-products", "job-orders-internal-materials"] }],
  },
  { title: "แปรรูปวัตถุดิบ", description: "ตัดท่อ แผ่น ม้วน เป็นชิ้นงานพร้อม QR", groups: [{ slugs: ["material-processing"] }] },
  {
    title: "วางแผนและดำเนินการผลิต",
    description: "แผนผลิต และการสั่งผลิตตามกระบวนการ",
    groups: [
      { group: "แผนผลิต", slugs: ["production-plans-products", "production-plans-materials"] },
      { group: "สั่งผลิตตามกระบวนการ", slugs: ["process-orders-products", "process-orders-materials"] },
    ],
  },
  {
    title: "สินค้าและวิศวกรรม",
    description: "ทะเบียนสินค้า BOM และ Workflow",
    groups: [
      { group: "สินค้า", slugs: ["products-overview", "products"] },
      { group: "BOM และขั้นตอนการผลิต", slugs: ["setup-wizard", "bom-products", "bom-materials"] },
    ],
  },
  { title: "การขายและจัดส่ง", description: "ออเดอร์ขาย ใบจัดงานขาย และตัดสต็อกส่งของ", groups: [{ slugs: ["sales-orders", "sales-job-orders"] }] },
  {
    title: "รายงานและตรวจสอบ",
    description: "รายงานวัสดุ สอบกลับ รายงานขาย และบันทึกการใช้งาน",
    groups: [{ slugs: ["materials-report", "production-traceability", "audit-logs", "sales-report", "product-lots-report"] }],
  },
  {
    title: "ข้อมูลพื้นฐานและระบบ",
    description: "ข้อมูลหลัก ผู้ใช้งานและสิทธิ์ และการจัดการเมนู (ผู้ดูแลระบบสูงสุด)",
    groups: [
      { group: "ข้อมูลพื้นฐาน", slugs: ["master-data-hub"] },
      {
        group: "ข้อมูลพื้นฐาน · วัสดุและคลัง",
        slugs: ["master-units", "master-suppliers", "master-material-models", "master-material-types", "master-categories", "master-locations"],
      },
      {
        group: "ข้อมูลพื้นฐาน · สินค้าและลูกค้า",
        slugs: ["master-product-types", "master-product-models", "master-customers", "master-delivery-types", "master-loading-points"],
      },
      { group: "ข้อมูลพื้นฐาน · การผลิต", slugs: ["master-process-lines", "master-process-steps", "master-reject-reasons"] },
      { group: "ข้อมูลพื้นฐาน · ทั่วไป", slugs: ["master-statuses", "master-organizations"] },
      { group: "ผู้ใช้งานและสิทธิ์", slugs: ["system-sessions", "system-permissions", "system-users", "system-roles", "system-departments"] },
      { group: "ระบบ", slugs: ["menu-management"] },
    ],
  },
];

export const VIDEO_CHAPTERS: VideoChapter[] = STRUCTURE.map((spec, chapterIndex) => {
  const number = String(chapterIndex + 1);
  const videos = spec.groups
    .flatMap((entry) => entry.slugs.map((slug) => ({ slug, group: entry.group })))
    .map(({ slug, group }, index) => {
      const card = CARDS.get(slug);
      if (!card) throw new Error(`Unknown video manual card: ${slug}`);
      return { ...card, number: `${number}.${index + 1}`, group };
    });
  return { number, title: spec.title, description: spec.description, videos };
});

export const VIDEO_SLUGS: string[] = VIDEO_CHAPTERS.flatMap((chapter) => chapter.videos.map((video) => video.slug));
