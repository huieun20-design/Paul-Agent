"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Pencil,
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

const DEFAULT_CATEGORIES = [
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

const PALETTE = [
  { bg: "bg-blue-50", text: "text-blue-600", active: "bg-blue-200 text-blue-800" },
  { bg: "bg-emerald-50", text: "text-emerald-600", active: "bg-emerald-200 text-emerald-800" },
  { bg: "bg-violet-50", text: "text-violet-600", active: "bg-violet-200 text-violet-800" },
  { bg: "bg-amber-50", text: "text-amber-600", active: "bg-amber-200 text-amber-800" },
  { bg: "bg-rose-50", text: "text-rose-600", active: "bg-rose-200 text-rose-800" },
  { bg: "bg-cyan-50", text: "text-cyan-600", active: "bg-cyan-200 text-cyan-800" },
  { bg: "bg-indigo-50", text: "text-indigo-600", active: "bg-indigo-200 text-indigo-800" },
  { bg: "bg-teal-50", text: "text-teal-600", active: "bg-teal-200 text-teal-800" },
  { bg: "bg-pink-50", text: "text-pink-600", active: "bg-pink-200 text-pink-800" },
  { bg: "bg-lime-50", text: "text-lime-600", active: "bg-lime-200 text-lime-800" },
  { bg: "bg-orange-50", text: "text-orange-600", active: "bg-orange-200 text-orange-800" },
  { bg: "bg-fuchsia-50", text: "text-fuchsia-600", active: "bg-fuchsia-200 text-fuchsia-800" },
  { bg: "bg-sky-50", text: "text-sky-600", active: "bg-sky-200 text-sky-800" },
  { bg: "bg-red-50", text: "text-red-600", active: "bg-red-200 text-red-800" },
  { bg: "bg-purple-50", text: "text-purple-600", active: "bg-purple-200 text-purple-800" },
];

const fixedCategoryStyles: Record<string, { bg: string; text: string; active: string }> = {
  ORDER: PALETTE[0], PAYMENT: PALETTE[1], INVOICE: PALETTE[2], SHIPPING: PALETTE[3],
  CLAIM: PALETTE[4], INQUIRY: PALETTE[5], QUOTATION: PALETTE[6], CONFIRMATION: PALETTE[7],
  GENERAL: { bg: "bg-gray-50", text: "text-gray-500", active: "bg-gray-200 text-gray-700" },
};

function getCategoryStyle(cat: string): { bg: string; text: string; active: string } {
  if (fixedCategoryStyles[cat]) return fixedCategoryStyles[cat];
  // Generate consistent color from category name
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// Dynamic getter
const categoryStyles: Record<string, { bg: string; text: string; active: string }> = new Proxy({} as Record<string, { bg: string; text: string; active: string }>, {
  get: (_, key: string) => getCategoryStyle(key),
});

const categoryColors: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_, key: string) => { const s = getCategoryStyle(key); return `${s.bg} ${s.text}`; },
});

export default function EmailPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [folder, setFolder] = useState("INBOX");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [showCategoryEdit, setShowCategoryEdit] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryKeywords, setCategoryKeywords] = useState<Record<string, string[]>>({});
  const [dragCat, setDragCat] = useState<string | null>(null);
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

  const fetchEmails = useCallback(async (retry = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder, limit: "200" });
      if (search) params.set("search", search);
      if (category !== "All") params.set("category", category);
      if (filterAccount !== "all") params.set("accountId", filterAccount);

      const res = await fetch(`/api/email?${params}`);
      if (res.status === 401 && retry < 2) {
        await new Promise(r => setTimeout(r, 1500));
        return fetchEmails(retry + 1);
      }
      const data = await res.json();
      setEmails(data.emails || []);
    } catch {
      if (retry < 2) {
        await new Promise(r => setTimeout(r, 1500));
        return fetchEmails(retry + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [folder, search, category, filterAccount]);

  const fetchAccounts = useCallback(async (retry = 0) => {
    try {
      const res = await fetch("/api/email/accounts");
      if (res.status === 401 && retry < 2) {
        // Session might not be ready yet, retry
        await new Promise(r => setTimeout(r, 1500));
        return fetchAccounts(retry + 1);
      }
      const data = await res.json();
      if (Array.isArray(data)) setEmailAccounts(data);
    } catch {
      if (retry < 2) {
        await new Promise(r => setTimeout(r, 1500));
        return fetchAccounts(retry + 1);
      }
    }
    setAccountsLoaded(true);
  }, []);

  // Load custom categories + keywords from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("emailCategories");
      if (saved) setCategories(JSON.parse(saved));
      const savedKw = localStorage.getItem("categoryKeywords");
      if (savedKw) setCategoryKeywords(JSON.parse(savedKw));
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    fetchAccounts();

    // If redirected from OAuth callback, refetch after a short delay
    if (typeof window !== "undefined" && window.location.search.includes("connected=true")) {
      setTimeout(() => {
        fetchAccounts();
        fetchEmails();
      }, 1000);
      // Clean URL
      window.history.replaceState({}, "", "/email");
    }
  }, [fetchEmails, fetchAccounts]);

  // Auto-sync on first load if accounts exist but no emails
  useEffect(() => {
    if (accountsLoaded && emailAccounts.length > 0 && emails.length === 0 && !syncing && !loading) {
      handleSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsLoaded]);

  const handleSync = async (recategorizeOnly = false) => {
    setSyncing(true);
    try {
      const payload = recategorizeOnly
        ? { recategorize: true, customCategories: categoryKeywords }
        : { maxResults: 100, customCategories: categoryKeywords };

      const res = await fetch("/api/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.recategorized) {
        // Re-categorize done
      } else if (data.error) {
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
          selectedEmail ? "hidden" : "flex-1"
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
            onClick={() => handleSync()}
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

        {/* Category tabs — draggable */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 py-2">
          {["All", ...categories].map((cat) => {
            const style = categoryStyles[cat];
            const isActive = category === cat;
            const isDraggable = cat !== "All";
            return (
              <button
                key={cat}
                draggable={isDraggable}
                onDragStart={() => isDraggable && setDragCat(cat)}
                onDragOver={(e) => { if (isDraggable && dragCat && dragCat !== cat) e.preventDefault(); }}
                onDrop={() => {
                  if (!dragCat || dragCat === cat || cat === "All") return;
                  const fromIdx = categories.indexOf(dragCat);
                  const toIdx = categories.indexOf(cat);
                  if (fromIdx === -1 || toIdx === -1) return;
                  const updated = [...categories];
                  updated.splice(fromIdx, 1);
                  updated.splice(toIdx, 0, dragCat);
                  setCategories(updated);
                  localStorage.setItem("emailCategories", JSON.stringify(updated));
                  setDragCat(null);
                }}
                onDragEnd={() => setDragCat(null)}
                onClick={() => setCategory(cat)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  isDraggable && "cursor-grab active:cursor-grabbing",
                  dragCat === cat && "opacity-40 scale-95",
                  cat === "All"
                    ? isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    : isActive ? (style?.active || "bg-gray-300 text-gray-800") : `${style?.bg || "bg-gray-50"} ${style?.text || "text-gray-500"} hover:opacity-80`
                )}
              >
                {cat === "All" ? "All" : `# ${cat}`}
              </button>
            );
          })}
          <button
            onClick={() => setShowCategoryEdit(true)}
            className="ml-1 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex-shrink-0"
            title="Edit categories"
          >
            <Pencil className="h-3 w-3" />
          </button>
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
                  <button onClick={() => handleSync()} className="mt-3 flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
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
                // Mark as unread locally + sync to Gmail
                setEmails(prev => prev.map(e => e.id === selectedEmail.id ? { ...e, isRead: false } : e));
                fetch(`/api/email/${selectedEmail.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isRead: false }),
                });
                setSelectedEmail(null);
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Mail className="h-4 w-4" />
              Unread
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

              {/* Category selector */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {categories.map(cat => {
                  const style = categoryStyles[cat];
                  const isActive = selectedEmail.category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        const newCat = isActive ? null : cat;
                        fetch(`/api/email/${selectedEmail.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ category: newCat }),
                        });
                        setSelectedEmail({ ...selectedEmail, category: newCat });
                        setEmails(prev => prev.map(e => e.id === selectedEmail.id ? { ...e, category: newCat } : e));
                      }}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all",
                        isActive ? style?.active : `${style?.bg} ${style?.text} opacity-50 hover:opacity-100`
                      )}
                    >
                      # {cat}
                    </button>
                  );
                })}
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

              {/* Email Body */}
              <div className="mt-6 border-t border-gray-100 pt-6">
                {selectedEmail.bodyHtml ? (() => {
                  // Replace CID placeholders with actual attachment proxy URLs
                  let html = selectedEmail.bodyHtml!;
                  html = html.replace(/CID_PLACEHOLDER_([a-zA-Z0-9_-]+)/g, (_, attId) =>
                    `/api/email/${selectedEmail.id}/attachment?attachmentId=${attId}`
                  );
                  return <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="script-src 'none'"><base target="_blank"><style>body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#333;margin:0;padding:0;line-height:1.6;overflow-x:hidden}img{max-width:100%!important;height:auto!important;min-width:60px!important;min-height:60px!important}img[style*="40px"]{width:80px!important;height:80px!important}a{color:#2563eb}table{max-width:100%!important}*{box-sizing:border-box}</style></head><body>${html}</body></html>`}
                    className="w-full border-0"
                    style={{ minHeight: "200px" }}
                    onLoad={(e) => {
                      const iframe = e.target as HTMLIFrameElement;
                      const resize = () => {
                        if (iframe.contentDocument?.body) {
                          const h = iframe.contentDocument.body.scrollHeight;
                          iframe.style.height = (h + 20) + "px";
                        }
                      };
                      resize();
                      setTimeout(resize, 1000);
                      setTimeout(resize, 2000);
                      setTimeout(resize, 4000);
                    }}
                  />;
                })() : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {selectedEmail.bodyText}
                  </pre>
                )}
              </div>

              {/* Attachments */}
              {selectedEmail.attachments?.length > 0 && (
                <AttachmentSection emailId={selectedEmail.id} attachments={selectedEmail.attachments} />
              )}
            </div>

            {/* Reply/Forward Section */}
            {replyMode && <ReplySection
              email={selectedEmail}
              mode={replyMode}
              aiReply={aiReply}
              setAiReply={setAiReply}
              generatingReply={generatingReply}
              onGenerateReply={(tone) => handleGenerateReply(selectedEmail.id, tone)}
              onCancel={() => { setReplyMode(null); setAiReply(""); }}
              onSent={() => { setReplyMode(null); setAiReply(""); }}
              emailAccounts={emailAccounts}
            />}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}

      {/* Accounts Modal */}
      <Modal isOpen={showAccounts} onClose={() => { setShowAccounts(false); fetchAccounts(); fetchEmails(); }} title="Email Accounts" size="md">
        <AccountsManager accounts={emailAccounts} onRefresh={fetchAccounts} />
      </Modal>

      {/* Category Edit Modal */}
      <Modal isOpen={showCategoryEdit} onClose={() => setShowCategoryEdit(false)} title="Edit Categories" size="md">
        <div className="space-y-3">
          {categories.map((cat) => {
            const style = getCategoryStyle(cat);
            const kw = categoryKeywords[cat] || [];
            return (
              <div key={cat} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", style.bg, style.text)}>
                    # {cat}
                  </span>
                  <div className="flex-1" />
                  {!DEFAULT_CATEGORIES.includes(cat) && (
                    <button
                      onClick={() => {
                        const updated = categories.filter(c => c !== cat);
                        setCategories(updated);
                        localStorage.setItem("emailCategories", JSON.stringify(updated));
                        const updatedKw = { ...categoryKeywords };
                        delete updatedKw[cat];
                        setCategoryKeywords(updatedKw);
                        localStorage.setItem("categoryKeywords", JSON.stringify(updatedKw));
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Keywords (comma separated)..."
                  defaultValue={kw.join(", ")}
                  onBlur={(e) => {
                    const keywords = e.target.value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
                    const updatedKw = { ...categoryKeywords, [cat]: keywords };
                    setCategoryKeywords(updatedKw);
                    localStorage.setItem("categoryKeywords", JSON.stringify(updatedKw));
                  }}
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
                />
              </div>
            );
          })}

          {/* Add new category */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <input
              type="text"
              placeholder="NEW_CATEGORY"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCategoryName && !categories.includes(newCategoryName)) {
                  const updated = [...categories, newCategoryName];
                  setCategories(updated);
                  localStorage.setItem("emailCategories", JSON.stringify(updated));
                  setNewCategoryName("");
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                if (!newCategoryName || categories.includes(newCategoryName)) return;
                const updated = [...categories, newCategoryName];
                setCategories(updated);
                localStorage.setItem("emailCategories", JSON.stringify(updated));
                setNewCategoryName("");
              }}
              disabled={!newCategoryName}
              className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {/* Re-categorize button */}
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => { setShowCategoryEdit(false); handleSync(true); }}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4 text-gray-400", syncing && "animate-spin")} />
              Re-categorize All Emails
            </button>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Re-classifies all emails using current keywords</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AttachmentSection({ emailId, attachments }: { emailId: string; attachments: { id: string; filename: string; mimeType: string; size: number; url?: string }[] }) {
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);

  const getAttachmentUrl = (att: { url?: string }) => {
    return `/api/email/${emailId}/attachment?attachmentId=${att.url}`;
  };

  return (
    <>
      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Attachments ({attachments.length})
        </p>

        {/* Image attachments — inline preview */}
        {attachments.filter(a => a.mimeType.startsWith("image/")).length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {attachments.filter(a => a.mimeType.startsWith("image/")).map(att => (
              <button key={att.id} onClick={() => setPreview({ url: getAttachmentUrl(att), type: att.mimeType, name: att.filename })}
                className="rounded-xl overflow-hidden border border-gray-200 hover:border-gray-400 transition-all">
                <img src={getAttachmentUrl(att)} alt={att.filename} className="w-full aspect-square object-cover" loading="lazy" />
                <div className="px-2 py-1.5 bg-white">
                  <p className="text-[11px] text-gray-600 truncate">{att.filename}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* All attachments list */}
        <div className="space-y-1.5">
          {attachments.map(att => {
            const isImage = att.mimeType.startsWith("image/");
            const isPdf = att.mimeType === "application/pdf";
            const ext = att.filename.split(".").pop()?.toUpperCase() || "FILE";
            return (
              <div key={att.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 hover:bg-gray-50 transition-colors group">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold flex-shrink-0",
                  isImage ? "bg-pink-100 text-pink-600" : isPdf ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                )}>
                  {isImage ? "IMG" : isPdf ? "PDF" : ext}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{att.filename}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(isImage || isPdf) && (
                    <button onClick={() => setPreview({ url: getAttachmentUrl(att), type: att.mimeType, name: att.filename })}
                      className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-200">Preview</button>
                  )}
                  <a href={getAttachmentUrl(att)} download={att.filename} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-200">Download</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-screen preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreview(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm flex items-center gap-1">
              <X className="h-4 w-4" /> Close
            </button>
            <p className="absolute -top-10 left-0 text-white/70 text-sm truncate max-w-md">{preview.name}</p>
            {preview.type.startsWith("image/") ? (
              <img src={preview.url} alt={preview.name} className="w-full max-h-[85vh] object-contain rounded-xl" />
            ) : preview.type === "application/pdf" ? (
              <iframe src={preview.url} className="w-full h-[85vh] rounded-xl bg-white" />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function ContactInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [suggestions, setSuggestions] = useState<{ email: string; name: string }[]>([]);
  const [show, setShow] = useState(false);

  const search = async (q: string) => {
    if (q.length < 1) { setSuggestions([]); setShow(false); return; }
    const res = await fetch(`/api/email/contacts?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) { setSuggestions(data); setShow(true); } else { setShow(false); }
  };

  return (
    <div className="flex-1 relative">
      <input type="text" value={value}
        onChange={e => { onChange(e.target.value); const parts = e.target.value.split(","); search(parts[parts.length - 1].trim()); }}
        onFocus={() => { if (suggestions.length > 0) setShow(true); }}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent px-1 py-0.5 text-sm text-gray-800 focus:outline-none" />
      {show && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(c => (
            <button key={c.email} type="button" onMouseDown={() => {
              const parts = value.split(",").map(s => s.trim()).filter(Boolean);
              parts[parts.length - 1] = c.email;
              onChange(parts.join(", ") + ", ");
              setShow(false);
            }} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 text-left">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">{c.name[0]?.toUpperCase()}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 truncate">{c.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReplySection({ email, mode, aiReply, setAiReply, generatingReply, onGenerateReply, onCancel, onSent, emailAccounts }: {
  email: Email; mode: "reply" | "forward"; aiReply: string; setAiReply: (v: string) => void;
  generatingReply: boolean; onGenerateReply: (tone: string) => void; onCancel: () => void; onSent: () => void;
  emailAccounts: { id: string; email: string }[];
}) {
  const [forwardTo, setForwardTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(`${mode === "reply" ? "Re" : "Fwd"}: ${email.subject}`);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    const match = emailAccounts.find(a => email.to.some(t => t.toLowerCase().includes(a.email.toLowerCase())));
    return match?.id || emailAccounts[0]?.id || "";
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = emailAccounts.find(a => a.id === selectedAccountId);

  // Update editor when AI generates reply
  useEffect(() => {
    if (editorRef.current && aiReply && editorRef.current.innerHTML !== aiReply) {
      editorRef.current.innerHTML = aiReply;
    }
  }, [aiReply]);

  // execCommand wrapper — prevent toolbar from stealing focus
  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const handleLink = () => {
    const url = prompt("Enter URL:");
    if (url) { editorRef.current?.focus(); document.execCommand("createLink", false, url); }
  };

  const handleSend = async () => {
    const content = editorRef.current?.innerHTML || "";
    if (!content.trim() || content === "<br>") return;
    if (mode === "forward" && !forwardTo.trim()) { alert("Enter recipient email"); return; }
    setSending(true);
    try {
      // Split files: small (<3MB) as Gmail attachment, large as Supabase link
      const LIMIT = 3 * 1024 * 1024; // 3MB
      const smallFiles = attachments.filter(f => f.size <= LIMIT);
      const largeFiles = attachments.filter(f => f.size > LIMIT);

      // Upload large files to Supabase Storage and get links
      let linkHtml = "";
      if (largeFiles.length > 0) {
        const uploadResults = await Promise.all(largeFiles.map(async (file) => {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/email/upload-attachment", { method: "POST", body: form });
          return res.json();
        }));
        const links = uploadResults.filter(r => r.url);
        if (links.length > 0) {
          linkHtml = '<br><br><div style="padding:12px;background:#f5f5f5;border-radius:8px;font-size:13px"><b>Attached Files:</b><br>' +
            links.map(l => `<a href="${l.url}" target="_blank" style="color:#2563eb">${l.name} (${(l.size / 1024 / 1024).toFixed(1)}MB)</a>`).join("<br>") +
            "</div>";
        }
      }

      const finalBody = content + linkHtml;

      const formData = new FormData();
      formData.append("accountId", selectedAccountId);
      formData.append("to", mode === "reply" ? email.from.replace(/.*<(.+)>.*/, "$1") : forwardTo);
      formData.append("cc", cc);
      formData.append("bcc", bcc);
      formData.append("subject", subject);
      formData.append("body", finalBody);
      if (mode === "reply") {
        formData.append("inReplyTo", email.messageId);
        if (email.threadId) formData.append("threadId", email.threadId);
      }
      smallFiles.forEach(file => formData.append("attachments", file));

      const res = await fetch("/api/email/send", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { alert(`Send failed: ${data.error}`); } else { onSent(); }
    } catch {
      alert("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);

  return (
    <div className="border-t border-gray-200">
      <div className="bg-white">
        {/* Header fields */}
        <div className="border-b border-gray-100 px-6 py-1">
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="text-sm text-gray-400 w-14">To:</span>
            {mode === "reply" ? (
              <span className="text-sm text-gray-800">{email.from}</span>
            ) : (
              <ContactInput value={forwardTo} onChange={setForwardTo} placeholder="Type name or email..." />
            )}
          </div>
          {showCc && (
            <div className="flex items-center py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-400 w-14">Cc:</span>
              <ContactInput value={cc} onChange={setCc} placeholder="Type name or email..." />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-400 w-14">Bcc:</span>
              <ContactInput value={bcc} onChange={setBcc} placeholder="Type name or email..." />
            </div>
          )}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="text-sm text-gray-400 w-14">Subject:</span>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-gray-800 focus:outline-none" />
            <div className="flex gap-2 ml-2">
              {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-gray-400 hover:text-gray-600">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-gray-400 hover:text-gray-600">Bcc</button>}
            </div>
          </div>
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="text-sm text-gray-400 w-14">From:</span>
            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}
              className="border-0 bg-transparent text-sm text-gray-800 focus:outline-none cursor-pointer">
              {emailAccounts.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
            </select>
          </div>
        </div>

        {/* Toolbar — Gmail style */}
        <div className="flex flex-wrap items-center gap-0.5 px-4 py-1 border-b border-gray-100 bg-gray-50/50">
          {/* AI tone */}
          {["friendly", "formal", "firm", "negotiation"].map(tone => (
            <button key={tone} onClick={() => onGenerateReply(tone)} disabled={generatingReply}
              className="flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
              <Sparkles className="h-2.5 w-2.5" />{tone}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1.5" />

          {/* Font family */}
          <select onChange={e => exec("fontName", e.target.value)} defaultValue=""
            className="h-7 rounded border border-gray-200 bg-white px-1 text-[11px] text-gray-600 focus:outline-none w-24" title="Font">
            <option value="" disabled>Font</option>
            <option value="Arial" style={{fontFamily:"Arial"}}>Arial</option>
            <option value="Helvetica" style={{fontFamily:"Helvetica"}}>Helvetica</option>
            <option value="Georgia" style={{fontFamily:"Georgia"}}>Georgia</option>
            <option value="Times New Roman" style={{fontFamily:"Times New Roman"}}>Times</option>
            <option value="Courier New" style={{fontFamily:"Courier New"}}>Courier</option>
            <option value="Verdana" style={{fontFamily:"Verdana"}}>Verdana</option>
            <option value="Trebuchet MS" style={{fontFamily:"Trebuchet MS"}}>Trebuchet</option>
          </select>

          {/* Font size */}
          <select onChange={e => exec("fontSize", e.target.value)} defaultValue=""
            className="h-7 rounded border border-gray-200 bg-white px-1 text-[11px] text-gray-600 focus:outline-none w-14" title="Size">
            <option value="" disabled>Size</option>
            <option value="1">Small</option>
            <option value="2">Normal</option>
            <option value="3">Medium</option>
            <option value="4">Large</option>
            <option value="5">Huge</option>
          </select>
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Format buttons — onMouseDown prevents focus loss */}
          {[
            { cmd: "bold", label: "B", cls: "font-bold", title: "Bold" },
            { cmd: "italic", label: "I", cls: "italic", title: "Italic" },
            { cmd: "underline", label: "U", cls: "underline", title: "Underline" },
            { cmd: "strikeThrough", label: "S", cls: "line-through", title: "Strikethrough" },
          ].map(b => (
            <button key={b.cmd} onMouseDown={e => { e.preventDefault(); exec(b.cmd); }}
              className={`rounded w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs ${b.cls}`} title={b.title}>{b.label}</button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Text color */}
          <label className="relative cursor-pointer" title="Text color">
            <input type="color" onChange={e => { editorRef.current?.focus(); exec("foreColor", e.target.value); }} className="absolute inset-0 w-7 h-7 opacity-0 cursor-pointer" />
            <div className="rounded w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold">A<div className="h-0.5 w-3.5 bg-red-500 -mt-0.5" /></div>
          </label>

          {/* Highlight color */}
          <label className="relative cursor-pointer" title="Highlight">
            <input type="color" defaultValue="#ffff00" onChange={e => { editorRef.current?.focus(); exec("hiliteColor", e.target.value); }} className="absolute inset-0 w-7 h-7 opacity-0 cursor-pointer" />
            <div className="rounded w-7 h-7 flex items-center justify-center hover:bg-gray-200 text-xs font-bold"><span className="bg-yellow-200 px-1">A</span></div>
          </label>
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Alignment + Lists + Indent + Quote + Link + Clear */}
          {[
            { cmd: "justifyLeft", label: "⫷", title: "Align left" },
            { cmd: "justifyCenter", label: "⫸", title: "Center" },
            { cmd: "justifyRight", label: "⫸", title: "Align right" },
          ].map(b => (
            <button key={b.cmd} onMouseDown={e => { e.preventDefault(); exec(b.cmd); }}
              className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-[10px]" title={b.title}>{b.label}</button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList"); }} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs" title="Bullet list">•≡</button>
          <button onMouseDown={e => { e.preventDefault(); exec("insertOrderedList"); }} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs" title="Number list">1≡</button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onMouseDown={e => { e.preventDefault(); exec("indent"); }} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs" title="Indent">→≡</button>
          <button onMouseDown={e => { e.preventDefault(); exec("outdent"); }} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs" title="Outdent">←≡</button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onMouseDown={e => { e.preventDefault(); exec("formatBlock", "blockquote"); }} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs" title="Quote">❝</button>
          <button onMouseDown={e => { e.preventDefault(); handleLink(); }} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs" title="Link">🔗</button>
          <button onMouseDown={e => { e.preventDefault(); exec("removeFormat"); }} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-xs" title="Clear">T̸</button>
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Attach */}
          <button onClick={() => fileInputRef.current?.click()} className="rounded w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200" title="Attach files">
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => {
              const files = e.target.files;
              if (files && files.length > 0) {
                const newFiles = Array.from(files);
                setAttachments(current => [...current, ...newFiles]);
              }
              if (fileInputRef.current) fileInputRef.current.value = "";
            }} />
        </div>

        {/* Rich text editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { if (editorRef.current) setAiReply(editorRef.current.innerHTML); }}
          className="px-6 py-4 min-h-[200px] text-sm text-gray-800 leading-relaxed focus:outline-none"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          data-placeholder={generatingReply ? "Generating AI reply..." : "Compose your message..."}
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-6 pb-3">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, i) => {
                const isLarge = file.size > 3 * 1024 * 1024;
                const sizeStr = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : `${(file.size / 1024).toFixed(0)}KB`;
                const isImage = file.type.startsWith("image/");
                const preview = isImage ? URL.createObjectURL(file) : null;
                return (
                  <div key={i} className={cn("rounded-lg border overflow-hidden", isLarge ? "border-amber-200" : "border-gray-200")}>
                    {preview && (
                      <button onClick={() => setPreviewFile({ url: preview, type: file.type, name: file.name })} className="block">
                        <img src={preview} alt={file.name} className="w-20 h-16 object-cover" />
                      </button>
                    )}
                    <div className={cn("flex items-center gap-1.5 px-2 py-1", isLarge ? "bg-amber-50" : "bg-gray-50")}>
                      <Paperclip className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                      <span className="text-[11px] text-gray-600 max-w-24 truncate">{file.name}</span>
                      <span className="text-[9px] text-gray-400">{sizeStr}</span>
                      {isLarge && <span className="text-[8px] text-amber-600 font-medium">link</span>}
                      <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-auto"><X className="h-2.5 w-2.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* File preview modal */}
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewFile(null)}>
            <div className="relative max-w-3xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPreviewFile(null)} className="absolute -top-8 right-0 text-white text-sm flex items-center gap-1"><X className="h-4 w-4" />Close</button>
              <p className="absolute -top-8 left-0 text-white/70 text-sm truncate max-w-md">{previewFile.name}</p>
              {previewFile.type.startsWith("image/") ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-h-[80vh] rounded-xl" />
              ) : previewFile.type === "application/pdf" ? (
                <iframe src={previewFile.url} className="w-[700px] h-[80vh] rounded-xl bg-white" />
              ) : null}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Discard</button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 rounded-full bg-gray-900 pl-5 pr-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 shadow-sm">
            <Send className="h-4 w-4" />{sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
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
