import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding BSL EMMS database...");

  // ── Departments ────────────────────────────────────────────────────────
  const depts = await Promise.all([
    prisma.department.upsert({ where: { code: "GOV" }, update: {}, create: { name: "Governor's Office", code: "GOV" } }),
    prisma.department.upsert({ where: { code: "FIN" }, update: {}, create: { name: "Finance", code: "FIN" } }),
    prisma.department.upsert({ where: { code: "HR" },  update: {}, create: { name: "Human Resources", code: "HR" } }),
    prisma.department.upsert({ where: { code: "IT" },  update: {}, create: { name: "Information Technology", code: "IT" } }),
    prisma.department.upsert({ where: { code: "OPS" }, update: {}, create: { name: "Operations", code: "OPS" } }),
    prisma.department.upsert({ where: { code: "RIS" }, update: {}, create: { name: "Risk & Compliance", code: "RIS" } }),
    prisma.department.upsert({ where: { code: "LEG" }, update: {}, create: { name: "Legal", code: "LEG" } }),
  ]);

  const [govDept, finDept, hrDept, itDept, opsDept, risDept, legDept] = depts;

  console.log("✅ Departments created");

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // ── Users ──────────────────────────────────────────────────────────────
  const governor = await prisma.user.upsert({
    where: { email: "governor@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "Kelfala M. Kallon",
      email: "governor@bsl.gov.sl",
      staffId: "BSL000001",
      password: await hash("Governor@2026"),
      departmentId: govDept.id,
      role: UserRole.governor,
      mobile: "+232 76 100001",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "System Administrator",
      email: "admin@bsl.gov.sl",
      staffId: "BSL000002",
      password: await hash("Admin@2026"),
      departmentId: itDept.id,
      role: UserRole.admin,
    },
  });

  const finHead = await prisma.user.upsert({
    where: { email: "finhead@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "Mariama Conteh",
      email: "finhead@bsl.gov.sl",
      staffId: "BSL000010",
      password: await hash("FinHead@2026"),
      departmentId: finDept.id,
      role: UserRole.head,
      mobile: "+232 76 100010",
    },
  });

  const hrHead = await prisma.user.upsert({
    where: { email: "hrhead@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "Ibrahim Kamara",
      email: "hrhead@bsl.gov.sl",
      staffId: "BSL000020",
      password: await hash("HrHead@2026"),
      departmentId: hrDept.id,
      role: UserRole.head,
      mobile: "+232 76 100020",
    },
  });

  const itHead = await prisma.user.upsert({
    where: { email: "ithead@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "Fatima Koroma",
      email: "ithead@bsl.gov.sl",
      staffId: "BSL000030",
      password: await hash("ItHead@2026"),
      departmentId: itDept.id,
      role: UserRole.head,
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: "akoroma@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "Aminata Koroma",
      email: "akoroma@bsl.gov.sl",
      staffId: "BSL001001",
      password: await hash("Staff@2026"),
      departmentId: finDept.id,
      role: UserRole.staff,
      mobile: "+232 76 200001",
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "mturay@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "Mohamed Turay",
      email: "mturay@bsl.gov.sl",
      staffId: "BSL001002",
      password: await hash("Staff@2026"),
      departmentId: hrDept.id,
      role: UserRole.staff,
    },
  });

  const staff3 = await prisma.user.upsert({
    where: { email: "fkanu@bsl.gov.sl" },
    update: {},
    create: {
      fullName: "Fatmata Kanu",
      email: "fkanu@bsl.gov.sl",
      staffId: "BSL001003",
      password: await hash("Staff@2026"),
      departmentId: itDept.id,
      role: UserRole.staff,
    },
  });

  console.log("✅ Users created");

  // ── Set department heads ───────────────────────────────────────────────
  await prisma.department.update({ where: { id: govDept.id }, data: { headUserId: governor.id } });
  await prisma.department.update({ where: { id: finDept.id }, data: { headUserId: finHead.id } });
  await prisma.department.update({ where: { id: hrDept.id },  data: { headUserId: hrHead.id } });
  await prisma.department.update({ where: { id: itDept.id },  data: { headUserId: itHead.id } });

  console.log("✅ Department heads assigned");

  // ── Sample Memos ───────────────────────────────────────────────────────
  // Broadcast
  const broadcast = await prisma.memo.upsert({
    where: { referenceNumber: "BSL/IT/2026/0001" },
    update: {},
    create: {
      referenceNumber: "BSL/IT/2026/0001",
      subject: "System Maintenance Notice — EMMS Downtime",
      body: `Dear All Staff,\n\nPlease be advised that the BSL Electronic Memo Management System (EMMS) will undergo scheduled maintenance on Saturday, 14 June 2026 between 10:00 PM and 2:00 AM.\n\nDuring this period, the system will be unavailable. Please plan your memo communications accordingly.\n\nFor urgent matters during the downtime period, please contact the IT Department directly at extension 1000.\n\nThank you for your cooperation.\n\nFatima Koroma\nHead, Information Technology`,
      senderId: itHead.id,
      audienceType: "broadcast",
      priority: "high",
      status: "sent",
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isConfidential: false,
    },
  });

  // Recipients for broadcast (all staff)
  await prisma.memoRecipient.createMany({
    skipDuplicates: true,
    data: [
      { memoId: broadcast.id, userId: staff1.id, receiptType: "to" },
      { memoId: broadcast.id, userId: staff2.id, receiptType: "to" },
      { memoId: broadcast.id, userId: staff3.id, receiptType: "to" },
      { memoId: broadcast.id, userId: finHead.id, receiptType: "cc" },
      { memoId: broadcast.id, userId: hrHead.id, receiptType: "cc" },
      { memoId: broadcast.id, userId: governor.id, receiptType: "cc" },
    ],
  });

  // Individual non-confidential
  const individual = await prisma.memo.upsert({
    where: { referenceNumber: "BSL/FIN/2026/0001" },
    update: {},
    create: {
      referenceNumber: "BSL/FIN/2026/0001",
      subject: "Q2 Budget Reconciliation — Action Required",
      body: `Dear Mohamed,\n\nI am writing to request your assistance with the Q2 2026 budget reconciliation exercise. We require the HR department's payroll variance report for April–June 2026 by end of business on Friday, 13 June 2026.\n\nKindly ensure the report includes:\n1. Salary disbursement breakdown by grade\n2. Overtime payments and allowances\n3. Any exceptional items\n\nPlease acknowledge receipt of this memo and confirm your department's ability to meet the deadline.\n\nWarm regards,\nMariama Conteh\nDirector of Finance`,
      senderId: finHead.id,
      audienceType: "individual",
      priority: "high",
      status: "sent",
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isConfidential: false,
    },
  });

  await prisma.memoRecipient.createMany({
    skipDuplicates: true,
    data: [
      { memoId: individual.id, userId: staff2.id, receiptType: "to" },
      { memoId: individual.id, userId: finHead.id, receiptType: "cc" },
      { memoId: individual.id, userId: hrHead.id, receiptType: "cc" },
    ],
  });

  // Acknowledged one
  await prisma.memoRecipient.updateMany({
    where: { memoId: broadcast.id, userId: staff1.id },
    data: { acknowledgedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  });

  console.log("✅ Sample memos created");

  console.log("\n🎉 Seed complete!\n");
  console.log("Default login credentials:");
  console.log("─────────────────────────────────────────");
  console.log("Governor:     governor@bsl.gov.sl  /  Governor@2026");
  console.log("Admin:        admin@bsl.gov.sl     /  Admin@2026");
  console.log("Fin Head:     finhead@bsl.gov.sl   /  FinHead@2026");
  console.log("HR Head:      hrhead@bsl.gov.sl    /  HrHead@2026");
  console.log("IT Head:      ithead@bsl.gov.sl    /  ItHead@2026");
  console.log("Staff 1:      akoroma@bsl.gov.sl   /  Staff@2026");
  console.log("Staff 2:      mturay@bsl.gov.sl    /  Staff@2026");
  console.log("Staff 3:      fkanu@bsl.gov.sl     /  Staff@2026");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
