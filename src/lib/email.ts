import nodemailer from "nodemailer";

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendEmail(options: MailOptions): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log("[Email skipped — no SMTP configured]", options.subject);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@bsl.gov.sl",
    to: Array.isArray(options.to) ? options.to.join(",") : options.to,
    subject: options.subject,
    html: options.html,
  });
}

export function buildMemoNotificationHtml(params: {
  recipientName: string;
  senderName: string;
  subject: string;
  referenceNumber: string;
  priority: string;
  audienceType: string;
  appUrl: string;
}): string {
  const priorityBadge =
    params.priority === "urgent"
      ? `<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">URGENT</span>`
      : params.priority === "high"
      ? `<span style="background:#ea580c;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">HIGH</span>`
      : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#003087;padding:20px;color:white;">
        <h1 style="margin:0;font-size:20px;">Bank of Sierra Leone</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">Electronic Memo Management System</p>
      </div>
      <div style="padding:24px;background:#f9f9f9;">
        <p>Dear ${params.recipientName},</p>
        <p>You have received a new memo. ${priorityBadge}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;width:40%;background:#fff;">Reference</td><td style="padding:8px;border:1px solid #e5e7eb;background:#fff;">${params.referenceNumber}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fff;">From</td><td style="padding:8px;border:1px solid #e5e7eb;background:#fff;">${params.senderName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#fff;">Subject</td><td style="padding:8px;border:1px solid #e5e7eb;background:#fff;">${params.audienceType === "confidential" ? "[CONFIDENTIAL]" : params.subject}</td></tr>
        </table>
        <a href="${params.appUrl}/memos/${params.referenceNumber}" style="display:inline-block;background:#003087;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">View Memo</a>
      </div>
      <div style="padding:12px 24px;background:#e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        Bank of Sierra Leone &bull; EMMS &bull; Strictly Confidential
      </div>
    </div>
  `;
}
