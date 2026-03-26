// Keyword-based email categorizer

const DEFAULT_KEYWORDS: Record<string, string[]> = {
  ORDER: ["order", "purchase", "po #", "po#", "purchase order", "ordered", "order confirmation", "order number", "tracking number"],
  PAYMENT: ["payment", "paid", "pay", "remittance", "wire transfer", "bank transfer", "venmo", "zelle", "paypal", "transaction"],
  INVOICE: ["invoice", "inv #", "inv#", "bill", "billing", "statement", "amount due", "balance due", "net 30", "net 60"],
  SHIPPING: ["shipping", "shipped", "delivery", "tracking", "fedex", "ups", "usps", "dhl", "carrier", "freight", "in transit", "delivered"],
  CLAIM: ["claim", "complaint", "damaged", "defective", "return", "refund", "dispute", "issue", "problem", "wrong item"],
  INQUIRY: ["inquiry", "question", "quote", "pricing", "availability", "catalog", "interested", "information", "request for"],
  QUOTATION: ["quotation", "quote", "estimate", "proposal", "bid", "rfq", "request for quote", "pricing"],
};

export function categorizeEmail(
  subject: string,
  bodyText: string | null,
  customCategories?: Record<string, string[]>
): string | null {
  const text = `${subject} ${bodyText || ""}`.toLowerCase();

  // Merge default + custom keywords
  const allKeywords = { ...DEFAULT_KEYWORDS, ...(customCategories || {}) };

  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(allKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : "GENERAL";
}
