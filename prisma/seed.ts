import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// VULN-17 fix: Prevent accidental seed execution in production
if (process.env.NODE_ENV === "production") {
  console.error("ERROR: Seed script must not run in production!");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.choreCompletion.deleteMany();
  await prisma.choreAssignment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.allowanceRule.deleteMany();
  await prisma.savingGoal.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.childAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.family.deleteMany();

  // Create family
  const family = await prisma.family.create({
    data: {
      name: "Familie Muster",
      currency: "EUR",
      timezone: "Europe/Berlin",
    },
  });

  // Create parent
  const hashedPassword = await bcrypt.hash("demo1234", 10);
  await prisma.user.create({
    data: {
      email: "demo@kidsvault.app",
      name: "Anna Muster",
      hashedPassword,
      familyId: family.id,
    },
  });

  // Create children
  const lenaPin = await bcrypt.hash("1234", 10);
  const lena = await prisma.childAccount.create({
    data: {
      name: "Lena",
      avatarEmoji: "👧",
      hashedPin: lenaPin,
      familyId: family.id,
    },
  });

  const maxPin = await bcrypt.hash("5678", 10);
  const max = await prisma.childAccount.create({
    data: {
      name: "Max",
      avatarEmoji: "👦",
      hashedPin: maxPin,
      familyId: family.id,
    },
  });

  // Create transactions for Lena (saldo: 1250 cents = 12.50 EUR)
  const now = new Date();
  await prisma.transaction.createMany({
    data: [
      {
        amountCents: 500,
        type: "ALLOWANCE",
        origin: "ALLOWANCE_RULE",
        description: "Taschengeld (wöchentlich)",
        childAccountId: lena.id,
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        amountCents: 500,
        type: "ALLOWANCE",
        origin: "ALLOWANCE_RULE",
        description: "Taschengeld (wöchentlich)",
        childAccountId: lena.id,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        amountCents: 200,
        type: "CHORE_REWARD",
        origin: "CHORE_COMPLETION",
        description: "Zimmer aufgeräumt",
        childAccountId: lena.id,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        amountCents: -150,
        type: "WITHDRAWAL",
        origin: "MANUAL",
        description: "Eis gekauft",
        childAccountId: lena.id,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        amountCents: 200,
        type: "DEPOSIT",
        origin: "MANUAL",
        description: "Oma Geschenk",
        childAccountId: lena.id,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Create transactions for Max (saldo: 800 cents = 8.00 EUR)
  await prisma.transaction.createMany({
    data: [
      {
        amountCents: 500,
        type: "ALLOWANCE",
        origin: "ALLOWANCE_RULE",
        description: "Taschengeld (wöchentlich)",
        childAccountId: max.id,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        amountCents: 300,
        type: "CHORE_REWARD",
        origin: "CHORE_COMPLETION",
        description: "Geschirr gespült",
        childAccountId: max.id,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Create allowance rule for Lena (500 cents weekly)
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  nextMonday.setHours(8, 0, 0, 0);

  await prisma.allowanceRule.create({
    data: {
      amountCents: 500,
      frequency: "WEEKLY",
      dayOfWeek: 1, // Monday
      isActive: true,
      nextRunAt: nextMonday,
      childAccountId: lena.id,
    },
  });

  // Create chores
  const choreZimmer = await prisma.chore.create({
    data: {
      title: "Zimmer aufräumen",
      description: "Spielzeug wegräumen, Bett machen",
      rewardCents: 200,
      recurrence: "WEEKLY",
      familyId: family.id,
    },
  });

  const choreGeschirr = await prisma.chore.create({
    data: {
      title: "Geschirr spülen",
      description: "Geschirr abwaschen und abtrocknen",
      rewardCents: 150,
      recurrence: "DAILY",
      familyId: family.id,
    },
  });

  // Assign chores
  await prisma.choreAssignment.create({
    data: {
      choreId: choreZimmer.id,
      childAccountId: lena.id,
    },
  });

  await prisma.choreAssignment.create({
    data: {
      choreId: choreGeschirr.id,
      childAccountId: max.id,
    },
  });

  // Create saving goal for Max
  await prisma.savingGoal.create({
    data: {
      title: "Neues Spiel",
      targetCents: 2000,
      childAccountId: max.id,
    },
  });

  // Create saving goal for Lena
  await prisma.savingGoal.create({
    data: {
      title: "Roller",
      targetCents: 5000,
      childAccountId: lena.id,
    },
  });

  // --- Investments ---

  // Enable kiosk investments for the family
  await prisma.family.update({
    where: { id: family.id },
    data: { kioskInvestmentsEnabled: true },
  });

  // Next month 1st at 2 AM (for nextInterestAt)
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(2, 0, 0, 0);

  // Lena: Tagesgeld investment (5% p.a., started 30 days ago, earned 2 cents interest)
  const lenaInvestment = await prisma.investment.create({
    data: {
      type: "TAGESGELD",
      status: "ACTIVE",
      principalCents: 500, // €5.00
      currentBalanceCents: 502, // €5.02 (earned 2 cents)
      interestRateBps: 500, // 5% p.a.
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      nextInterestAt: nextMonth,
      lastInterestAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      childAccountId: lena.id,
      familyId: family.id,
    },
  });

  // INVESTMENT_DEPOSIT transaction for Lena (money left her balance)
  await prisma.transaction.create({
    data: {
      amountCents: -500,
      type: "INVESTMENT_DEPOSIT",
      origin: "INVESTMENT",
      description: "Anlage: Tagesgeld",
      childAccountId: lena.id,
      investmentId: lenaInvestment.id,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Interest audit transaction for Lena
  await prisma.transaction.create({
    data: {
      amountCents: 0,
      type: "INTEREST",
      origin: "INVESTMENT",
      description: "Zinsen: +2 Cent (5.00% p.a.)",
      childAccountId: lena.id,
      investmentId: lenaInvestment.id,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Max: Festgeld investment (8% p.a., 6 months, started 30 days ago)
  const maxInvestment = await prisma.investment.create({
    data: {
      type: "FESTGELD",
      status: "ACTIVE",
      principalCents: 300, // €3.00
      currentBalanceCents: 302, // €3.02 (earned 2 cents)
      interestRateBps: 800, // 8% p.a.
      termMonths: 6,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      maturityDate: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
      nextInterestAt: nextMonth,
      lastInterestAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      childAccountId: max.id,
      familyId: family.id,
    },
  });

  // INVESTMENT_DEPOSIT transaction for Max
  await prisma.transaction.create({
    data: {
      amountCents: -300,
      type: "INVESTMENT_DEPOSIT",
      origin: "INVESTMENT",
      description: "Anlage: Festgeld (6 Monate)",
      childAccountId: max.id,
      investmentId: maxInvestment.id,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Interest audit transaction for Max
  await prisma.transaction.create({
    data: {
      amountCents: 0,
      type: "INTEREST",
      origin: "INVESTMENT",
      description: "Zinsen: +2 Cent (8.00% p.a.)",
      childAccountId: max.id,
      investmentId: maxInvestment.id,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed complete!");
  console.log(`Family: ${family.name} (${family.id})`);
  console.log(`Parent: demo@kidsvault.app / demo1234`);
  console.log(`Lena PIN: 1234 | Max PIN: 5678`);
  console.log(`Lena: Tagesgeld €5.02 (5% p.a.) | Max: Festgeld €3.02 (8% p.a., 6 Mo)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
