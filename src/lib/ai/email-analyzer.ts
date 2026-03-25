import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface EmailAnalysis {
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  extractedData: {
    amounts?: { value: number; currency: string }[];
    poNumbers?: string[];
    skuNumbers?: string[];
    trackingNumbers?: string[];
    dates?: { type: string; date: string }[];
    companyNames?: string[];
    contactNames?: string[];
  };
  suggestedActions: {
    type: "TODO" | "ORDER" | "PAYMENT" | "INVOICE" | "CLAIM" | "REPLY" | "FOLLOW_UP";
    title: string;
    description: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }[];
}

export async function analyzeEmail(
  subject: string,
  body: string,
  from: string
): Promise<EmailAnalysis> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Analyze this business email and return a JSON response.

From: ${from}
Subject: ${subject}
Body:
${body?.substring(0, 3000) || "(empty)"}

Return ONLY valid JSON with this structure:
{
  "category": "ORDER" | "PAYMENT" | "INVOICE" | "SHIPPING" | "CLAIM" | "INQUIRY" | "QUOTATION" | "CONFIRMATION" | "GENERAL",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "summary": "Brief 1-2 sentence summary",
  "extractedData": {
    "amounts": [{"value": number, "currency": "USD"}],
    "poNumbers": ["PO-12345"],
    "skuNumbers": ["SKU-001"],
    "trackingNumbers": ["1Z999..."],
    "dates": [{"type": "delivery|payment|due", "date": "2024-01-15"}],
    "companyNames": ["Company Inc"],
    "contactNames": ["John Doe"]
  },
  "suggestedActions": [
    {
      "type": "TODO" | "ORDER" | "PAYMENT" | "INVOICE" | "CLAIM" | "REPLY" | "FOLLOW_UP",
      "title": "Action title",
      "description": "What needs to be done",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}

Only include fields that have actual data. Return empty arrays for fields with no data.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonText = content.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  return JSON.parse(jsonText) as EmailAnalysis;
}

export async function generateReply(
  originalEmail: { from: string; subject: string; body: string },
  tone: "friendly" | "formal" | "firm" | "negotiation" = "formal",
  instructions?: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Generate a professional email reply.

Original email:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body?.substring(0, 2000) || "(empty)"}

Tone: ${tone}
${instructions ? `Additional instructions: ${instructions}` : ""}

Write ONLY the reply body (no subject line, no greeting prefix like "RE:"). Keep it concise and professional.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  return content.text.trim();
}
