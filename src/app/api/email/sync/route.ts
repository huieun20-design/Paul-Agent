import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/api-helpers";
import { syncGmailEmails, syncGmailSentEmails } from "@/lib/email/gmail";
import { syncOutlookEmails } from "@/lib/email/outlook";
import { categorizeEmail } from "@/lib/email/categorizer";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const userId = user.id;

  let body: { accountId?: string; maxResults?: number; customCategories?: Record<string, string[]>; recategorize?: boolean } = {};
  try {
    body = await request.json();
  } catch { /* empty body is ok */ }

  // Re-categorize existing emails with updated categories
  if (body.recategorize && body.customCategories) {
    const emailAccounts = await prisma.emailAccount.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = emailAccounts.map(a => a.id);

    const emails = await prisma.email.findMany({
      where: { emailAccountId: { in: accountIds } },
      select: { id: true, subject: true, bodyText: true },
    });

    let updated = 0;
    for (const email of emails) {
      const newCategory = categorizeEmail(email.subject, email.bodyText, body.customCategories);
      await prisma.email.update({
        where: { id: email.id },
        data: { category: newCategory },
      });
      updated++;
    }

    return NextResponse.json({ recategorized: updated });
  }

  // Normal sync
  const accounts = body.accountId
    ? await prisma.emailAccount.findMany({ where: { id: body.accountId, userId } })
    : await prisma.emailAccount.findMany({ where: { userId, accessToken: { not: null } } });

  if (accounts.length === 0) {
    return NextResponse.json({ error: "No email accounts with valid tokens. Please connect via Gmail OAuth." }, { status: 404 });
  }

  let totalSynced = 0;
  const results: { email: string; synced?: number; error?: string }[] = [];

  for (const account of accounts) {
    if (!account.accessToken) {
      results.push({ email: account.email, error: "No access token" });
      continue;
    }

    try {
      let synced = 0;
      if (account.provider === "GMAIL") {
        const inbox = await syncGmailEmails(account.id, body.maxResults || 100, body.customCategories);
        const sent = await syncGmailSentEmails(account.id, body.maxResults || 100, body.customCategories);
        synced = inbox + sent;
      } else if (account.provider === "OUTLOOK") {
        synced = await syncOutlookEmails(account.id, body.maxResults || 100, body.customCategories);
      } else {
        results.push({ email: account.email, error: `Provider ${account.provider} not supported` });
        continue;
      }
      totalSynced += synced;
      results.push({ email: account.email, synced });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Sync failed for ${account.email}:`, message);
      results.push({ email: account.email, error: message });
    }
  }

  return NextResponse.json({ totalSynced, results });
}
