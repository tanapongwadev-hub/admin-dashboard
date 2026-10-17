import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CommercialTrace } from "@/lib/api/production-lots";
import { formatThaiDate } from "@/lib/production-day";

const fmt = (n: number) => n.toLocaleString("th-TH");

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">{children}</p>;
}

// Production dates, sales and material lots for a product lot / box. The
// sales and material sections come back empty (access flag false) when the
// caller lacks the matching permission, and say so instead of looking empty.
export function CommercialTraceSections({ trace }: { trace: CommercialTrace }) {
  const { boxes, sales, materialLots, access, scope } = trace;
  const soldQty = sales.reduce((sum, row) => sum + Number(row.qty), 0);
  const producedQty = boxes.reduce((sum, row) => sum + Number(row.qty), 0);

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="ผลิตวันไหน"
        hint={
          scope === "ORDER_LINE"
            ? "Lot นี้ยังไม่ถึงขั้นแพ็ก จึงแสดงกล่อง FG ทั้งหมดของรายการผลิตเดียวกัน"
            : scope === "FG_LOT"
              ? "กล่อง FG ทั้งหมดใน Lot นี้"
              : "กล่องที่สแกน"
        }
      >
        {boxes.length === 0 ? (
          <Empty>ยังไม่มีกล่อง FG — ยังไม่ได้แพ็กสินค้าของรายการนี้</Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>กล่อง</TableHead>
                  <TableHead>Lot FG</TableHead>
                  <TableHead>วันที่ผลิต</TableHead>
                  <TableHead>กะ</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boxes.map((box) => (
                  <TableRow key={box.qrCode}>
                    <TableCell className="font-mono text-xs">{box.qrCode}</TableCell>
                    <TableCell className="font-mono text-xs">{box.fgLotNo ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{box.productionDate ? formatThaiDate(box.productionDate) : "—"}</TableCell>
                    <TableCell>{box.shift || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(Number(box.qty))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-right text-xs text-fg-muted">รวม {fmt(producedQty)} ชิ้น · {boxes.length} กล่อง</p>
          </div>
        )}
      </Section>

      <Section title="ขายวันไหน" hint="การส่งออกตามใบตัดสต็อกการขาย (ต่อกล่อง)">
        {!access.sales ? (
          <Empty>บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลการขาย</Empty>
        ) : sales.length === 0 ? (
          <Empty>ยังไม่มีการขาย — ยังไม่มีกล่องของ Lot นี้ที่ถูกตัดสต็อกขาย</Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่ขาย</TableHead>
                  <TableHead>ใบส่งของ</TableHead>
                  <TableHead>ออเดอร์ขาย</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>กล่อง</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((row, index) => (
                  <TableRow key={`${row.issueNo}-${row.qrCode}-${index}`}>
                    <TableCell className="whitespace-nowrap font-medium">{formatThaiDate(row.issueDate)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.issueNo}</TableCell>
                    <TableCell className="font-mono text-xs">{row.salesOrderCode ?? "—"}</TableCell>
                    <TableCell>{row.customerName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.qrCode}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(Number(row.qty))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-right text-xs text-fg-muted">
              ขายแล้ว {fmt(soldQty)} ชิ้น{producedQty > 0 ? ` จาก ${fmt(producedQty)} ชิ้น` : ""}
              {producedQty > soldQty && <Badge variant="info" className="ml-2">คงเหลือ {fmt(producedQty - soldQty)}</Badge>}
            </p>
          </div>
        )}
      </Section>

      <Section title="Lot วัตถุดิบที่ใช้ผลิต" hint="Lot ที่จ่ายให้แผนผลิตนี้ตามใบจัดงาน (ระบบจ่ายตามแผน ไม่ได้ระบุต่อ Lot ผลิต)">
        {!access.materials ? (
          <Empty>บัญชีนี้ไม่มีสิทธิ์ดูข้อมูล Lot วัตถุดิบ</Empty>
        ) : materialLots.length === 0 ? (
          <Empty>ยังไม่มีการจ่ายวัตถุดิบให้แผนผลิตนี้</Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วัตถุดิบ</TableHead>
                  <TableHead>Lot ภายใน</TableHead>
                  <TableHead>Lot ผู้ผลิต</TableHead>
                  <TableHead>ผู้จัดจำหน่าย</TableHead>
                  <TableHead>รับเข้า</TableHead>
                  <TableHead>ใบจัดงาน / จ่ายออก</TableHead>
                  <TableHead className="text-right">จำนวนที่ใช้</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialLots.map((lot) => (
                  <TableRow key={`${lot.materialCode}-${lot.internalLotNo}`}>
                    <TableCell>
                      <span className="font-mono text-xs text-primary">{lot.materialCode}</span>
                      <span className="block text-fg-secondary">{lot.materialName}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{lot.internalLotNo}</TableCell>
                    <TableCell className="font-mono text-xs">{lot.supplierLotNo ?? "—"}</TableCell>
                    <TableCell>{lot.supplierName ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatThaiDate(lot.receiveDate)}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono">{lot.jobOrderCode ?? "—"}</span>
                      {lot.pickedDate && <span className="block text-fg-muted">{formatThaiDate(lot.pickedDate)}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(lot.issuedQty)} {lot.unit ?? ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}
