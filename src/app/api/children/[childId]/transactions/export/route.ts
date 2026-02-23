import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth();
  if (!session?.familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await params;

  const child = await prisma.childAccount.findFirst({
    where: { id: childId, familyId: session.familyId },
  });
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { childAccountId: childId },
    orderBy: { createdAt: "desc" },
  });

  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
  });
  const currency = family?.currency || "EUR";

  // Build CSV
  const header = "Datum,Typ,Beschreibung,Betrag,Währung";
  const rows = transactions.map((tx) => {
    const date = tx.createdAt.toISOString().slice(0, 10);
    const amount = (tx.amountCents / 100).toFixed(2);
    // VULN-15 fix: Sanitize CSV formula injection
    let desc = tx.description.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(desc)) {
      desc = "'" + desc; // Prefix with ' to prevent Excel formula execution
    }
    // Quote type and currency to prevent CSV structure breakage
    return `${date},"${tx.type}","${desc}",${amount},"${currency}"`;
  });

  const csv = [header, ...rows].join("\n");
  // Sanitize filename: only alphanumeric + dashes
  const safeName = child.name.toLowerCase().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-");
  const filename = `${safeName || "child"}-transactions.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
