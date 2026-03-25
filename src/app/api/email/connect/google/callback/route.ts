import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Google OAuth callback
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const userId = (session.user as { id: string }).id;
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/email?error=oauth_denied", baseUrl));
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/email/connect/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return NextResponse.redirect(new URL("/email?error=token_failed", baseUrl));
    }

    // Get user email from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const gmailAddress = userInfo.email;

    if (!gmailAddress) {
      return NextResponse.redirect(new URL("/email?error=no_email", baseUrl));
    }

    // Check if account already exists
    const existing = await prisma.emailAccount.findFirst({
      where: { userId, email: gmailAddress },
    });

    if (existing) {
      // Update tokens
      await prisma.emailAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken,
          tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        },
      });
    } else {
      // Create new email account
      await prisma.emailAccount.create({
        data: {
          userId,
          provider: "GMAIL",
          email: gmailAddress,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        },
      });
    }

    return NextResponse.redirect(new URL("/email?connected=true", baseUrl));
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/email?error=server_error", baseUrl));
  }
}
