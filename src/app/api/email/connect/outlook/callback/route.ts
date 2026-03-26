import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state"); // userId

  if (error || !code) {
    return NextResponse.redirect(new URL(`/email?error=${error || "oauth_denied"}`, baseUrl));
  }

  const userId = state;
  if (!userId) return NextResponse.redirect(new URL("/email?error=no_user", baseUrl));

  try {
    const redirectUri = `${baseUrl}/api/email/connect/outlook/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      const errMsg = tokens.error_description || tokens.error || "unknown";
      console.error("Outlook token exchange failed:", tokens);
      return NextResponse.redirect(new URL(`/email?error=token_failed&detail=${encodeURIComponent(errMsg)}`, baseUrl));
    }

    // Get user email — try multiple sources
    let outlookEmail = "";

    // 1. Try ID token (has email for personal accounts)
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64").toString());
        outlookEmail = payload.email || payload.preferred_username || "";
      } catch { /* ignore */ }
    }

    // 2. Try Microsoft Graph
    if (!outlookEmail) {
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await profileRes.json();
      outlookEmail = profile.mail || profile.userPrincipalName || profile.displayName || "";
    }

    if (!outlookEmail) {
      return NextResponse.redirect(new URL("/email?error=no_email", baseUrl));
    }

    // Check if account exists
    const existing = await prisma.emailAccount.findFirst({
      where: { userId, email: outlookEmail },
    });

    if (existing) {
      await prisma.emailAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken,
          tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        },
      });
    } else {
      await prisma.emailAccount.create({
        data: {
          userId,
          provider: "OUTLOOK",
          email: outlookEmail,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        },
      });
    }

    return NextResponse.redirect(new URL("/email?connected=true", baseUrl));
  } catch (err) {
    console.error("Outlook OAuth error:", err);
    return NextResponse.redirect(new URL("/email?error=server_error", baseUrl));
  }
}
