"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="th">
      <body>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            fontFamily: "sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <section style={{ maxWidth: "420px", textAlign: "center" }} role="alert">
            <h1>ระบบขัดข้องชั่วคราว</h1>
            <p>เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง</p>
            <button type="button" onClick={retry}>ลองอีกครั้ง</button>
          </section>
        </main>
      </body>
    </html>
  );
}
