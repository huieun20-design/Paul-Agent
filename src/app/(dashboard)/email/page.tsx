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
  Plus,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

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
  emailAccount?: { id: string; email: string; provider: string };
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

const categoryStyles: Record<string, { bg: string; text: string; active: string }> = {
  ORDER: { bg: "bg-blue-50", text: "text-blue-600", active: "bg-blue-200 text-blue-800" },
  PAYMENT: { bg: "bg-emerald-50", text: "text-emerald-600", active: "bg-emerald-200 text-emerald-800" },
  INVOICE: { bg: "bg-violet-50", text: "text-violet-600", active: "bg-violet-200 text-violet-800" },
  SHIPPING: { bg: "bg-amber-50", text: "text-amber-600", active: "bg-amber-200 text-amber-800" },
  CLAIM: { bg: "bg-rose-50", text: "text-rose-600", active: "bg-rose-200 text-rose-800" },
  INQUIRY: { bg: "bg-cyan-50", text: "text-cyan-600", active: "bg-cyan-200 text-cyan-800" },
  QUOTATION: { bg: "bg-indigo-50", text: "text-indigo-600", active: "bg-indigo-200 text-indigo-800" },
  CONFIRMATION: { bg: "bg-teal-50", text: "text-teal-600", active: "bg-teal-200 text-teal-800" },
  GENERAL: { bg: "bg-gray-50", text: "text-gray-500", active: "bg-gray-200 text-gray-700" },
};

const categoryColors: Record<string, string> = Object.fromEntries(
  Object.entries(categoryStyles).map(([k, v]) => [k, `${v.bg} ${v.text}`])
);

export default function EmailPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [folder, setFolder] = useState("INBOX");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<{ id: string; email: string; provider: string; _count: { emails: number } }[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [replyMode, setReplyMode] = useState<"reply" | "forward" | null>(null);
  const [aiReply, setAiReply] = useState("");
  const [generatingReply, setGeneratingReply] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder, limit: "200" });
      if (search) params.set("search", search);
      if (category !== "All") params.set("category", category);
      if (filterAccount !== "all") params.set("accountId", filterAccount);

      const res = await fetch(`/api/email?${params}`);
      const data = await res.json();
      setEmails(data.emails || []);
    } catch {
      console.error("Failed to fetch emails");
    } finally {
      setLoading(false);
    }
  }, [folder, search, category, filterAccount]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/email/accounts");
      const data = await res.json();
      if (Array.isArray(data)) setEmailAccounts(data);
    } catch { /* ignore */ }
    setAccountsLoaded(true);
  }, []);

  useEffect(() => {
    fetchEmails();
    fetchAccounts();
  }, [fetchEmails, fetchAccounts]);

  // Auto-sync on first load if accounts exist but no emails
  useEffect(() => {
    if (accountsLoaded && emailAccounts.length > 0 && emails.length === 0 && !syncing && !loading) {
      handleSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsLoaded]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 100 }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Sync error: ${data.error}`);
      } else if (data.results) {
        const errors = data.results.filter((r: { error?: string }) => r.error);
        if (errors.length > 0) {
          alert(`Synced ${data.totalSynced} emails. Errors: ${errors.map((e: { email: string; error: string }) => `${e.email}: ${e.error}`).join(", ")}`);
        }
      }
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
    // Optimistic UI update first
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    if (selectedEmail?.id === emailId) setSelectedEmail(null);
    fetch(`/api/email/${emailId}`, { method: "DELETE" });
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
    <div className="flex h-[calc(100vh-3rem)] max-w-[1300px] mx-auto rounded-2xl overflow-hidden card">
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
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Account filter */}
          {emailAccounts.length > 1 && (
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none"
            >
              <option value="all">All Accounts</option>
              {emailAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.email}</option>
              ))}
            </select>
          )}

          <div className="flex-1" />

          <button
            onClick={() => setShowAccounts(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="Email accounts"
          >
            <Settings className="h-4 w-4" />
          </button>
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
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 px-4 py-2">
          {CATEGORIES.map((cat) => {
            const style = categoryStyles[cat];
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  cat === "All"
                    ? isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    : isActive ? style?.active : `${style?.bg} ${style?.text} hover:opacity-80`
                )}
              >
                {cat === "All" ? "All" : `# ${cat}`}
              </button>
            );
          })}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Mail className="h-12 w-12 mb-4" />
              {!accountsLoaded ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : emailAccounts.length === 0 ? (
                <>
                  <p className="text-sm font-medium text-gray-600">No email accounts connected</p>
                  <p className="text-xs text-gray-400 mt-1">Connect your Gmail or Outlook to get started</p>
                  <button
                    onClick={() => setShowAccounts(true)}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4" /> Connect Email Account
                  </button>
                </>
              ) : syncing ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-2" />
                  <p className="text-sm">Syncing emails...</p>
                </>
              ) : (
                <>
                  <p className="text-sm">No emails found</p>
                  <button onClick={handleSync} className="mt-3 flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
                    <RefreshCw className="h-3.5 w-3.5" /> Sync Now
                  </button>
                </>
              )}
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left transition-colors",
                  selectedEmail?.id === email.id
                    ? "bg-gray-100"
                    : "hover:bg-gray-50",
                  !email.isRead && "bg-gray-50/50"
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
                  {email.emailAccount && emailAccounts.length > 1 && (
                    <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {email.emailAccount.email.split("@")[0]}
                    </span>
                  )}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
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
                          <button
                            onClick={async () => {
                              await fetch(`/api/email/${selectedEmail.id}/execute-actions`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ actions: [action] }),
                              });
                              alert(`${action.type} created!`);
                            }}
                            className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700"
                          >
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                    <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
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

      {/* Accounts Modal */}
      <Modal isOpen={showAccounts} onClose={() => setShowAccounts(false)} title="Email Accounts" size="md">
        <AccountsManager accounts={emailAccounts} onRefresh={fetchAccounts} />
      </Modal>
    </div>
  );
}

function AccountsManager({ accounts, onRefresh }: { accounts: { id: string; email: string; provider: string; _count: { emails: number } }[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ provider: "GMAIL", email: "" });
  const [saving, setSaving] = useState(false);

  const handleGoogleConnect = () => {
    window.location.href = "/api/email/connect/google";
  };

  const handleManualAdd = async () => {
    if (!form.email) return;
    setSaving(true);
    await fetch("/api/email/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ provider: "GMAIL", email: "" });
    onRefresh();
  };

  const providerIcons: Record<string, React.ReactNode> = {
    GMAIL: <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
    OUTLOOK: <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z" fill="#00A4EF"/></svg>,
    YAHOO: <Mail className="h-5 w-5 text-purple-600" />,
    ICLOUD: <Mail className="h-5 w-5 text-blue-500" />,
    CUSTOM: <Mail className="h-5 w-5 text-gray-500" />,
  };

  return (
    <div className="space-y-4">
      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Connected</h4>
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
              {providerIcons[acc.provider] || <Mail className="h-5 w-5 text-gray-400" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{acc.email}</p>
                <p className="text-[11px] text-gray-400">{acc.provider} · {acc._count.emails} emails synced</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">Connected</span>
              <button
                onClick={() => {
                  fetch(`/api/email/accounts/${acc.id}`, { method: "DELETE" }).then(() => onRefresh());
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Disconnect"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Connect buttons */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Account</h4>
        <button onClick={handleGoogleConnect} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          {providerIcons.GMAIL}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900">Gmail</p>
            <p className="text-[11px] text-gray-400">Connect with Google OAuth</p>
          </div>
          <Plus className="h-4 w-4 text-gray-400" />
        </button>
        <button onClick={() => { setShowAdd(true); setForm({ provider: "OUTLOOK", email: "" }); }} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          {providerIcons.OUTLOOK}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900">Outlook / Microsoft</p>
            <p className="text-[11px] text-gray-400">Connect with Microsoft OAuth</p>
          </div>
          <Plus className="h-4 w-4 text-gray-400" />
        </button>
        <button onClick={() => { setShowAdd(true); setForm({ provider: "CUSTOM", email: "" }); }} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          {providerIcons.CUSTOM}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900">Other (IMAP)</p>
            <p className="text-[11px] text-gray-400">Yahoo, iCloud, or custom IMAP</p>
          </div>
          <Plus className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Manual add form */}
      {showAdd && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Connect {form.provider} Account</h4>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@email.com" className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" required />
          </div>
          <p className="text-[11px] text-gray-400">
            {form.provider === "GMAIL" ? "You'll need to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env for full OAuth." :
             form.provider === "OUTLOOK" ? "You'll need to set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env." :
             "IMAP credentials can be configured after adding the account."}
          </p>
          <div className="flex justify-end">
            <button onClick={handleManualAdd} disabled={saving || !form.email} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Connecting..." : "Connect Account"}
            </button>
          </div>
        </div>
      )}
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
      <div className="w-full max-w-lg card shadow-2xl">
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
            className="w-full border-b border-gray-200 pb-2 text-sm focus:border-gray-400 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Cc"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:border-gray-400 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:border-gray-400 focus:outline-none"
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
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
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
