"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Search,
  RefreshCw,
  Star,
  Paperclip,
  ChevronLeft,
  Send,
  Sparkles,
  Trash2,
  Reply,
  Forward,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  messageId: string;
  threadId: string | null;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  date: string;
  isRead: boolean;
  folder: string;
  hasAttachments: boolean;
  category: string | null;
  priority: string | null;
  aiSummary: string | null;
  extractedData: Record<string, unknown> | null;
  suggestedActions: Record<string, unknown>[] | null;
  attachments: { id: string; filename: string; mimeType: string; size: number }[];
}

interface EmailAnalysis {
  category: string;
  priority: string;
  summary: string;
  extractedData: Record<string, unknown>;
  suggestedActions: { type: string; title: string; description: string; priority: string }[];
}

const FOLDERS = [
  { key: "INBOX", label: "Inbox" },
  { key: "SENT", label: "Sent" },
  { key: "TRASH", label: "Trash" },
];

const CATEGORIES = [
  "All",
  "ORDER",
  "PAYMENT",
  "INVOICE",
  "SHIPPING",
  "CLAIM",
  "INQUIRY",
  "QUOTATION",
  "GENERAL",
];

// Extract display name from email
function extractName(email: string): string {
  const match = email.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return email.split("@")[0];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

const categoryColors: Record<string, string> = {
  ORDER: "bg-blue-100 text-blue-700",
  PAYMENT: "bg-green-100 text-green-700",
  INVOICE: "bg-purple-100 text-purple-700",
  SHIPPING: "bg-orange-100 text-orange-700",
  CLAIM: "bg-red-100 text-red-700",
  INQUIRY: "bg-cyan-100 text-cyan-700",
  QUOTATION: "bg-indigo-100 text-indigo-700",
  CONFIRMATION: "bg-emerald-100 text-emerald-700",
  GENERAL: "bg-gray-100 text-gray-700",
};

export default function EmailPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [folder, setFolder] = useState("INBOX");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyMode, setReplyMode] = useState<"reply" | "forward" | null>(null);
  const [aiReply, setAiReply] = useState("");
  const [generatingReply, setGeneratingReply] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder });
      if (search) params.set("search", search);
      if (category !== "All") params.set("category", category);

      const res = await fetch(`/api/email?${params}`);
      const data = await res.json();
      setEmails(data.emails || []);
    } catch {
      console.error("Failed to fetch emails");
    } finally {
      setLoading(false);
    }
  }, [folder, search, category]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 50 }),
      });
      await fetchEmails();
    } catch {
      console.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleAnalyze = async (emailId: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/email/${emailId}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      // Update email in list
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, ...data.email } : e))
      );
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, ...data.email });
      }
    } catch {
      console.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateReply = async (
    emailId: string,
    tone: string = "formal"
  ) => {
    setGeneratingReply(true);
    try {
      const res = await fetch(`/api/email/${emailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      });
      const data = await res.json();
      setAiReply(data.reply);
      setReplyMode("reply");
    } catch {
      console.error("Reply generation failed");
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleDelete = async (emailId: string) => {
    await fetch(`/api/email/${emailId}`, { method: "DELETE" });
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    if (selectedEmail?.id === emailId) setSelectedEmail(null);
  };

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setAnalysis(null);
    setReplyMode(null);
    setAiReply("");

    // Mark as read
    if (!email.isRead) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
      );
    }

    // Fetch full email
    const res = await fetch(`/api/email/${email.id}`);
    const full = await res.json();
    setSelectedEmail(full);

    // Load existing analysis
    if (full.aiSummary) {
      setAnalysis({
        category: full.category,
        priority: full.priority,
        summary: full.aiSummary,
        extractedData: full.extractedData || {},
        suggestedActions: (full.suggestedActions as EmailAnalysis["suggestedActions"]) || [],
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 bg-white">
      {/* Left Panel — Email List */}
      <div
        className={cn(
          "flex flex-col border-r border-gray-200",
          selectedEmail ? "w-[400px]" : "flex-1"
        )}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          {/* Folder tabs */}
          <div className="flex gap-1">
            {FOLDERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFolder(f.key);
                  setSelectedEmail(null);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  folder === f.key
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            title="Sync emails"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-200 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 px-4 py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Mail className="h-12 w-12 mb-3" />
              <p className="text-sm">No emails found</p>
              <button
                onClick={handleSync}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                Sync your emails
              </button>
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left transition-colors",
                  selectedEmail?.id === email.id
                    ? "bg-blue-50"
                    : "hover:bg-gray-50",
                  !email.isRead && "bg-blue-50/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      !email.isRead ? "font-semibold text-gray-900" : "text-gray-700"
                    )}
                  >
                    {extractName(email.from)}
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatDate(email.date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      !email.isRead ? "font-medium text-gray-900" : "text-gray-600"
                    )}
                  >
                    {email.subject || "(no subject)"}
                  </span>
                  {email.hasAttachments && (
                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-xs text-gray-400">
                    {email.bodyText?.substring(0, 80) || ""}
                  </span>
                  {email.category && (
                    <span
                      className={cn(
                        "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        categoryColors[email.category] || "bg-gray-100 text-gray-600"
                      )}
                    >
                      {email.category}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Email Detail */}
      {selectedEmail && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Detail Header */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-3">
            <button
              onClick={() => {
                setSelectedEmail(null);
                setAnalysis(null);
              }}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => handleAnalyze(selectedEmail.id)}
              disabled={analyzing}
              className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Analyze
            </button>
            <button
              onClick={() => {
                setReplyMode("reply");
                setAiReply("");
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
            <button
              onClick={() => {
                setReplyMode("forward");
                setAiReply("");
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Forward className="h-4 w-4" />
              Forward
            </button>
            <button
              onClick={() => handleDelete(selectedEmail.id)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              {/* Subject */}
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedEmail.subject || "(no subject)"}
              </h2>

              {/* Badges */}
              <div className="mt-2 flex items-center gap-2">
                {selectedEmail.category && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      categoryColors[selectedEmail.category] ||
                        "bg-gray-100 text-gray-600"
                    )}
                  >
                    {selectedEmail.category}
                  </span>
                )}
                {selectedEmail.priority && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      priorityColors[selectedEmail.priority]
                    )}
                  >
                    {selectedEmail.priority}
                  </span>
                )}
              </div>

              {/* Sender info */}
              <div className="mt-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {extractName(selectedEmail.from)[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {extractName(selectedEmail.from)}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(selectedEmail.date).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    To: {selectedEmail.to.join(", ")}
                  </p>
                  {selectedEmail.cc.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Cc: {selectedEmail.cc.join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {analysis && (
                <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-800">
                      AI Analysis
                    </span>
                  </div>
                  <p className="text-sm text-purple-900">{analysis.summary}</p>

                  {/* Extracted Data */}
                  {analysis.extractedData && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(analysis.extractedData.amounts as { value: number; currency: string }[] | undefined)?.map(
                        (a, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
                          >
                            {a.currency} {a.value.toLocaleString()}
                          </span>
                        )
                      )}
                      {(analysis.extractedData.poNumbers as string[] | undefined)?.map((po, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                        >
                          PO: {po}
                        </span>
                      ))}
                      {(analysis.extractedData.trackingNumbers as string[] | undefined)?.map(
                        (tn, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700"
                          >
                            Tracking: {tn}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {analysis.suggestedActions?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-purple-700">
                        Suggested Actions:
                      </p>
                      {analysis.suggestedActions.map((action, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-white p-2"
                        >
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold",
                              categoryColors[action.type] || "bg-gray-100 text-gray-700"
                            )}
                          >
                            {action.type}
                          </span>
                          <span className="flex-1 text-sm text-gray-800">
                            {action.title}
                          </span>
                          <button className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700">
                            Execute
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {selectedEmail.attachments?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedEmail.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {att.filename}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Email Body */}
              <div className="mt-6 border-t border-gray-100 pt-6">
                {selectedEmail.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: selectedEmail.bodyHtml,
                    }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {selectedEmail.bodyText}
                  </pre>
                )}
              </div>
            </div>

            {/* Reply/Forward Section */}
            {replyMode && (
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {replyMode === "reply" ? "Reply" : "Forward"}
                    </span>
                    <div className="flex gap-2">
                      {["friendly", "formal", "firm", "negotiation"].map(
                        (tone) => (
                          <button
                            key={tone}
                            onClick={() =>
                              handleGenerateReply(selectedEmail.id, tone)
                            }
                            disabled={generatingReply}
                            className="flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3" />
                            {tone}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <textarea
                    value={aiReply}
                    onChange={(e) => setAiReply(e.target.value)}
                    rows={6}
                    placeholder={
                      generatingReply
                        ? "Generating AI reply..."
                        : "Write your reply or click an AI tone above..."
                    }
                    className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setReplyMode(null);
                        setAiReply("");
                      }}
                      className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}
    </div>
  );
}

function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.split(",").map((s) => s.trim()),
          cc: cc ? cc.split(",").map((s) => s.trim()) : [],
          subject,
          body,
        }),
      });
      onClose();
    } catch {
      console.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">New Message</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            type="text"
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Cc"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <textarea
            placeholder="Compose email..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full resize-none text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <button
            onClick={handleSend}
            disabled={sending || !to || !subject}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
