import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Microsoft OAuth not configured" }, { status: 500 });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/email/connect/outlook/callback`;

  const scopes = [
    "openid",
    "email",
    "profile",
    "offline_access",
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/Mail.ReadWrite",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    response_mode: "query",
    state: user.id,
  });

  return NextResponse.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
}
