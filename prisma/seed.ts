import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Default to the local SQLite file when DATABASE_URL isn't set (matches src/lib/db.ts).
process.env.DATABASE_URL ||= "file:./dev.db";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@utterly.app";
const DEMO_PASSWORD = "demonstration123";

const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
};

interface SeedClient {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  tags: string[];
  notes: string;
}

interface SeedInvoice {
  client: number; // index into clients
  number: string;
  issueDate: number; // days offset
  dueDate: number; // days offset
  status: "DRAFT" | "SENT" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED";
  subject: string;
  discountPercent: number;
  taxPercent: number;
  amountPaid: number;
  memo?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  sharedToken?: boolean;
}

const CLIENTS: SeedClient[] = [
  {
    name: "Brightwave Marketing",
    contactName: "Alicia Gomez",
    email: "alicia@brightwave.co",
    phone: "(415) 555-0134",
    tags: ["Long-term", "VIP"],
    notes: "Quarterly retainer. Prefers invoices on the 1st.",
  },
  {
    name: "Northline Logistics",
    contactName: "Derek Wu",
    email: "derek@northline.io",
    phone: "(312) 555-0189",
    tags: ["At risk"],
    notes: "Payment delays in Q3. Keep reminders friendly.",
  },
  {
    name: "Cedar & Oak Studio",
    contactName: "Priya Nair",
    email: "priya@cedaroak.design",
    phone: "(206) 555-0112",
    tags: ["New"],
    notes: "New client — first engagement.",
  },
  {
    name: "Beacon Financial Group",
    contactName: "Marcus Reed",
    email: "marcus@beaconfin.com",
    phone: "(212) 555-0177",
    tags: ["Long-term"],
    notes: "Net 30 terms. Always pays on time.",
  },
  {
    name: "Harbor & Co",
    contactName: "Sofia Laurent",
    email: "sofia@harborco.com",
    phone: "(617) 555-0155",
    tags: ["At risk"],
    notes: "Large outstanding balance — escalate carefully.",
  },
];

const INVOICES: SeedInvoice[] = [
  {
    client: 0, number: "INV-1001", issueDate: -45, dueDate: -15, status: "PARTIALLY_PAID",
    subject: "Q3 campaign support", discountPercent: 0, taxPercent: 0, amountPaid: 1200,
    memo: "Thank you for the continued partnership!", sharedToken: true,
    items: [{ description: "Social media campaign management", quantity: 1, unitPrice: 2400 }],
  },
  {
    client: 0, number: "INV-1005", issueDate: -20, dueDate: 10, status: "SENT",
    subject: "October retainer", discountPercent: 0, taxPercent: 0, amountPaid: 0,
    items: [{ description: "Monthly retainer — October", quantity: 1, unitPrice: 3000 }],
  },
  {
    client: 1, number: "INV-1002", issueDate: -50, dueDate: -20, status: "OVERDUE",
    subject: "Route optimization project", discountPercent: 5, taxPercent: 0, amountPaid: 0,
    memo: "Payment is past due — reach out if you have questions.", sharedToken: true,
    items: [
      { description: "Route optimization audit", quantity: 1, unitPrice: 4500 },
      { description: "Implementation support", quantity: 8, unitPrice: 120 },
    ],
  },
  {
    client: 1, number: "INV-1008", issueDate: -6, dueDate: 8, status: "SENT",
    subject: "Data cleanup", discountPercent: 0, taxPercent: 0, amountPaid: 0,
    items: [{ description: "Legacy data cleanup", quantity: 10, unitPrice: 95 }],
  },
  {
    client: 2, number: "INV-1003", issueDate: -30, dueDate: -5, status: "OVERDUE",
    subject: "Brand identity package", discountPercent: 0, taxPercent: 7.5, amountPaid: 0,
    memo: "First invoice — a gentle reminder.", sharedToken: true,
    items: [{ description: "Brand identity design package", quantity: 1, unitPrice: 5600 }],
  },
  {
    client: 3, number: "INV-1004", issueDate: -60, dueDate: -30, status: "PAID",
    subject: "Annual compliance review", discountPercent: 0, taxPercent: 0, amountPaid: 3200,
    items: [{ description: "Compliance review engagement", quantity: 1, unitPrice: 3200 }],
  },
  {
    client: 3, number: "INV-1006", issueDate: -35, dueDate: -5, status: "PAID",
    subject: "Tax advisory retainer", discountPercent: 0, taxPercent: 0, amountPaid: 1800,
    items: [{ description: "Advisory retainer — September", quantity: 1, unitPrice: 1800 }],
  },
  {
    client: 3, number: "INV-1009", issueDate: -10, dueDate: 20, status: "SENT",
    subject: "Tax advisory retainer", discountPercent: 0, taxPercent: 0, amountPaid: 0,
    items: [{ description: "Advisory retainer — October", quantity: 1, unitPrice: 1800 }],
  },
  {
    client: 4, number: "INV-1007", issueDate: -90, dueDate: -60, status: "OVERDUE",
    subject: "Warehouse systems integration", discountPercent: 0, taxPercent: 0, amountPaid: 0,
    memo: "This balance is significantly overdue.", sharedToken: true,
    items: [{ description: "Warehouse systems integration", quantity: 1, unitPrice: 9800 }],
  },
  {
    client: 4, number: "INV-1010", issueDate: -40, dueDate: -10, status: "OVERDUE",
    subject: "IT support retainer", discountPercent: 0, taxPercent: 0, amountPaid: 0,
    items: [{ description: "IT support retainer", quantity: 1, unitPrice: 2400 }],
  },
  {
    client: 2, number: "INV-1011", issueDate: -2, dueDate: 12, status: "DRAFT",
    subject: "Website mockups", discountPercent: 0, taxPercent: 7.5, amountPaid: 0,
    items: [{ description: "Website homepage mockups", quantity: 3, unitPrice: 400 }],
  },
  {
    client: 1, number: "INV-1012", issueDate: -60, dueDate: -30, status: "CANCELLED",
    subject: "Cancelled — duplicate", discountPercent: 0, taxPercent: 0, amountPaid: 0,
    items: [{ description: "Duplicate invoice (cancelled)", quantity: 1, unitPrice: 0 }],
  },
];

function invoiceTotal(items: { quantity: number; unitPrice: number }[], discount: number, tax: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const afterDiscount = subtotal * (1 - discount / 100);
  return Math.round((afterDiscount * (1 + tax / 100)) * 100) / 100;
}

async function seedDemo(userId: string) {
  // Clear previous demo data (keep the user/subscription/automation).
  await prisma.reminder.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { userId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { userId } } });
  await prisma.invoice.deleteMany({ where: { userId } });
  await prisma.client.deleteMany({ where: { userId } });

  const clientRows = await Promise.all(
    CLIENTS.map((c, idx) =>
      prisma.client.create({
        data: {
          userId,
          name: c.name,
          contactName: c.contactName,
          email: c.email,
          phone: c.phone,
          billingAddress: `${100 + idx * 7} Market Street, ${["San Francisco", "Chicago", "Seattle", "New York", "Boston"][idx]}, ${["CA", "IL", "WA", "NY", "MA"][idx]} ${["94103", "60601", "98101", "10005", "02108"][idx]}`,
          notes: c.notes,
          tags: c.tags.join(","),
        },
      }),
    ),
  );

  for (let i = 0; i < INVOICES.length; i++) {
    const inv = INVOICES[i];
    const items = inv.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: Math.round(it.quantity * it.unitPrice * 100) / 100,
    }));
    const total = invoiceTotal(inv.items, inv.discountPercent, inv.taxPercent);

    const created = await prisma.invoice.create({
      data: {
        userId,
        clientId: clientRows[inv.client].id,
        number: inv.number,
        issueDate: daysFromNow(inv.issueDate),
        dueDate: daysFromNow(inv.dueDate),
        status: inv.status,
        subject: inv.subject,
        discountPercent: inv.discountPercent,
        taxPercent: inv.taxPercent,
        totalAmount: total,
        amountPaid: inv.amountPaid,
        memo: inv.memo ?? "",
        sharedLinkToken: inv.sharedToken ? `demo-${inv.number.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}` : null,
        items: { create: items },
      },
    });

    if (inv.amountPaid > 0 || inv.status === "PAID") {
      const paid = inv.status === "PAID" ? total : inv.amountPaid;
      const createdAt = daysFromNow(Math.min(inv.issueDate + 15, -2));
      await prisma.payment.create({
        data: {
          userId,
          invoiceId: created.id,
          clientId: clientRows[inv.client].id,
          amount: paid,
          method: inv.client === 3 ? "BANK_TRANSFER" : "CARD",
          status: "SUCCEEDED",
          transactionRef: `py_${Math.random().toString(36).slice(2, 10)}`,
          paidAt: createdAt,
          createdAt,
        },
      });
    }

    if (inv.status === "OVERDUE") {
      const daysOverdue = Math.max(1, Math.round((Date.now() - created.dueDate.getTime()) / 86400000));
      const bucket = daysOverdue <= 7 ? "EARLY" : daysOverdue <= 30 ? "LATE" : daysOverdue <= 60 ? "SEVERE" : "CRITICAL";
      await prisma.reminder.create({
        data: {
          userId,
          invoiceId: created.id,
          bucket: bucket as any,
          tone: "PROFESSIONAL",
          subject: `Payment reminder for invoice ${inv.number}`,
          body: `Hi ${clientRows[inv.client].contactName},\n\nThis is a friendly reminder that invoice ${inv.number} (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)}) is ${daysOverdue} days past due.\n\nPlease let us know if you have any questions.\n\nThanks,\nDemo Studio`,
          scheduledAt: new Date(),
          status: "PREVIEW",
          recommendedNextDate: daysFromNow(7),
          strategy: bucket === "CRITICAL" ? "Escalate to a firm, direct call and hold further work until payment clears." : "Send a polite follow-up and offer a payment plan if needed.",
        },
      });
    }
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  let demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demo) {
    demo = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo Studio",
        passwordHash,
        plan: "PROFESSIONAL",
        isDemoUser: true,
        businessName: "Demo Studio",
        businessType: "AGENCY",
        currency: "USD",
        paymentPreference: "Net 15",
      },
    });
    await prisma.subscription.create({
      data: { userId: demo.id, tier: "PROFESSIONAL", status: "ACTIVE", priceAmount: 49 },
    });
    await prisma.automationSetting.create({ data: { userId: demo.id } });
  } else {
    await prisma.user.update({ where: { id: demo.id }, data: { isDemoUser: true } });
  }

  await seedDemo(demo.id);

  // Optional first admin (set ADMIN_EMAIL in .env)
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Admin",
          passwordHash,
          role: "ADMIN",
          plan: "BUSINESS",
        },
      });
    }
  }

  console.log("Seeded Utterly with a demo workspace.");
  console.log(`  Sign in: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
