import PDFDocument from "pdfkit";
import { formatDate } from "./utils";

interface AckEntry {
  name: string;
  acknowledgedAt: Date | null;
  readAt: Date | null;
}

interface CcEntry {
  name: string;
  role: string;
}

interface PdfMemoData {
  referenceNumber: string;
  subject: string;
  body: string;
  priority: string;
  audienceType: string;
  isConfidential: boolean;
  sentAt: Date | null;
  createdAt: Date;
  sender: { fullName: string; department: { name: string } };
  recipients: Array<{ name: string; department: string; type: string }>;
  ccList: CcEntry[];
  acknowledgements: AckEntry[];
}

const BSL_BLUE = "#003087";
const BSL_GOLD = "#b8860b";

export function generateMemoPdf(memo: PdfMemoData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100;

    // ── CONFIDENTIAL watermark (drawn first, behind content) ──────────────
    if (memo.isConfidential) {
      doc.save();
      doc.opacity(0.08);
      doc.fontSize(72).fillColor("red").font("Helvetica-Bold");
      doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.text("CONFIDENTIAL", 50, doc.page.height / 2 - 36, {
        width: pageWidth + 0,
        align: "center",
      });
      doc.restore();
    }

    // ── HEADER ─────────────────────────────────────────────────────────────
    doc.rect(50, 40, pageWidth, 60).fill(BSL_BLUE);
    doc.fillColor("white").fontSize(16).font("Helvetica-Bold");
    doc.text("BANK OF SIERRA LEONE", 60, 52, { width: pageWidth - 20 });
    doc.fontSize(9).font("Helvetica");
    doc.text("Electronic Memo Management System", 60, 72);

    // Reference box (top right)
    doc.fillColor(BSL_BLUE).fontSize(8).font("Helvetica-Bold");
    const refText = memo.referenceNumber;
    doc.text(refText, doc.page.width - 200, 47, { width: 145, align: "right" });
    doc.fillColor("white").fontSize(7).font("Helvetica");
    doc.text(formatDate(memo.sentAt || memo.createdAt), doc.page.width - 200, 57, {
      width: 145,
      align: "right",
    });

    // Priority badge
    if (memo.priority !== "normal") {
      const badgeColor = memo.priority === "urgent" ? "#dc2626" : "#ea580c";
      doc.rect(doc.page.width - 100, 68, 50, 14).fill(badgeColor);
      doc.fillColor("white").fontSize(7).font("Helvetica-Bold");
      doc.text(memo.priority.toUpperCase(), doc.page.width - 100, 71, {
        width: 50,
        align: "center",
      });
    }

    doc.moveDown(3);

    // ── TITLE ──────────────────────────────────────────────────────────────
    if (memo.isConfidential) {
      doc.fillColor("red").fontSize(10).font("Helvetica-Bold");
      doc.text("STRICTLY CONFIDENTIAL", { align: "center" });
      doc.moveDown(0.3);
    }

    doc.fillColor(BSL_BLUE).fontSize(13).font("Helvetica-Bold");
    doc.text("INTERNAL MEMORANDUM", { align: "center" });
    doc.moveDown(0.5);

    // ── DIVIDER ────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(BSL_GOLD).lineWidth(2).stroke();
    doc.moveDown(0.5);

    // ── META TABLE ─────────────────────────────────────────────────────────
    const metaRows: Array<[string, string]> = [
      ["To", memo.recipients.filter((r) => r.type === "to").map((r) => `${r.name} (${r.department})`).join(", ") || "All Staff"],
      ["From", `${memo.sender.fullName} — ${memo.sender.department.name}`],
      ["CC", memo.ccList.map((c) => c.name).join(", ") || "—"],
      ["Reference", memo.referenceNumber],
      ["Date", formatDate(memo.sentAt || memo.createdAt)],
      ["Priority", memo.priority.toUpperCase()],
      ["Type", memo.audienceType === "confidential" ? "Confidential" : memo.audienceType === "broadcast" ? "Broadcast" : "Individual"],
    ];

    const col1 = 50;
    const col2 = 160;
    let yPos = doc.y;

    metaRows.forEach(([label, value]) => {
      doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold");
      doc.text(label + ":", col1, yPos, { width: 100 });
      doc.fillColor("#111827").font("Helvetica");
      doc.text(value, col2, yPos, { width: pageWidth - 110 });
      yPos += 18;
    });

    doc.y = yPos + 8;

    // ── SUBJECT ────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#e5e7eb").lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.fillColor(BSL_BLUE).fontSize(11).font("Helvetica-Bold");
    doc.text(`RE: ${memo.subject}`, { width: pageWidth });
    doc.moveDown(0.8);

    // ── BODY ───────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#e5e7eb").lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.fillColor("#111827").fontSize(10).font("Helvetica");
    doc.text(memo.body, { width: pageWidth, lineGap: 4 });
    doc.moveDown(1);

    // ── ACKNOWLEDGEMENT LOG ────────────────────────────────────────────────
    if (memo.acknowledgements.length > 0) {
      doc.addPage();

      if (memo.isConfidential) {
        doc.save();
        doc.opacity(0.08);
        doc.fontSize(72).fillColor("red").font("Helvetica-Bold");
        doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.text("CONFIDENTIAL", 50, doc.page.height / 2 - 36, { width: pageWidth, align: "center" });
        doc.restore();
      }

      doc.fillColor(BSL_BLUE).fontSize(11).font("Helvetica-Bold");
      doc.text("ACKNOWLEDGEMENT LOG", 50, 50, { width: pageWidth });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(BSL_GOLD).lineWidth(2).stroke();
      doc.moveDown(0.5);

      // Table header
      doc.rect(50, doc.y, pageWidth, 18).fill("#f3f4f6");
      doc.fillColor("#374151").fontSize(8).font("Helvetica-Bold");
      doc.text("Recipient", 55, doc.y - 14, { width: 200 });
      doc.text("Status", 260, doc.y - 14, { width: 100 });
      doc.text("Read At", 365, doc.y - 14, { width: 120 });
      doc.text("Acknowledged At", 490, doc.y - 14, { width: 120 });
      doc.moveDown(0.3);

      memo.acknowledgements.forEach((ack, i) => {
        const rowY = doc.y;
        if (i % 2 === 0) doc.rect(50, rowY, pageWidth, 16).fill("#fafafa");
        doc.fillColor("#111827").fontSize(8).font("Helvetica");
        const status = ack.acknowledgedAt ? "Acknowledged" : "Pending";
        const statusColor = ack.acknowledgedAt ? "#15803d" : "#dc2626";
        doc.text(ack.name, 55, rowY + 3, { width: 200 });
        doc.fillColor(statusColor).text(status, 260, rowY + 3, { width: 100 });
        doc.fillColor("#111827").text(ack.readAt ? formatDate(ack.readAt) : "—", 365, rowY + 3, { width: 120 });
        doc.text(ack.acknowledgedAt ? formatDate(ack.acknowledgedAt) : "—", 490, rowY + 3, { width: 120 });
        doc.moveDown(1);
      });
    }

    // ── FOOTER ─────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).strokeColor("#e5e7eb").lineWidth(1).stroke();
    doc.fillColor("#9ca3af").fontSize(8).font("Helvetica");
    doc.text(
      `Bank of Sierra Leone | EMMS | ${memo.isConfidential ? "STRICTLY CONFIDENTIAL" : "Internal Use Only"} | Generated ${formatDate(new Date())}`,
      50,
      footerY + 6,
      { width: pageWidth, align: "center" }
    );

    doc.end();
  });
}
