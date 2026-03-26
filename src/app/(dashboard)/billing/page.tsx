"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, FileText, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Invoice {
  id: string; invoiceNumber: string; type: string; status: string;
  amount: number; paidAmount: number; currency: string; dueDate: string | null;
  createdAt: string; notes: string | null;
  company: { id: string; name: string };
  vendor: { id: string; companyName: string } | null;
  customer: { id: string; companyName: string } | null;
  payments: { id: string; amount: number; date: string }[];
}

interface Claim {
  id: string; title: string; description: string | null; status: string;
  priority: string; createdAt: string;
  company: { id: string; name: string };
  order: { id: string; orderNumber: string } | null;
  sourceEmail: { id: string; subject: string; from: string } | null;
}

interface Summary {
  totalInvoiced: number; totalPaid: number; outstanding: number;
  overdueCount: number; openClaims: number; totalClaims: number;
}

const INV_STATUSES = ["All", "UNPAID", "PARTIAL", "PAID", "OVERDUE"];
const CLAIM_STATUSES = ["All", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalInvoiced: 0, totalPaid: 0, outstanding: 0, overdueCount: 0, openClaims: 0, totalClaims: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"invoices" | "claims">("invoices");
  const [invStatus, setInvStatus] = useState("All");
  const [claimStatus, setClaimStatus] = useState("All");
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddClaim, setShowAddClaim] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (invStatus !== "All") params.set("invoiceStatus", invStatus);
    if (claimStatus !== "All") params.set("claimStatus", claimStatus);
    const res = await fetch(`/api/billing?${params}`);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setClaims(data.claims || []);
    setSummary(data.summary || {});
    setLoading(false);
  }, [invStatus, claimStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateClaimStatus = async (id: string, status: string) => {
    await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-claim", id, status }) });
    fetchData(); setSelectedClaim(null);
  };

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-400 mt-0.5">Invoices & Claims</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowAddClaim(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><AlertTriangle className="h-4 w-4 text-gray-400" /> Claim</button>
          <button onClick={() => setShowAddInvoice(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Plus className="h-4 w-4 text-gray-400" /> Invoice</button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="card p-4"><p className="text-xs text-gray-400 font-semibold uppercase">Total Invoiced</p><p className="text-xl font-bold text-gray-900 mt-1">${summary.totalInvoiced.toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-400 font-semibold uppercase">Paid</p><p className="text-xl font-bold text-emerald-600 mt-1">${summary.totalPaid.toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-400 font-semibold uppercase">Outstanding</p><p className="text-xl font-bold text-rose-500 mt-1">${summary.outstanding.toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-400 font-semibold uppercase">Overdue</p><p className="text-xl font-bold text-amber-600 mt-1">{summary.overdueCount}</p></div>
        <div className="card p-4 col-span-2 md:col-span-1"><p className="text-xs text-gray-400 font-semibold uppercase">Open Claims</p><p className="text-xl font-bold text-orange-500 mt-1">{summary.openClaims}</p></div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-gray-200">
        <button onClick={() => setTab("invoices")} className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === "invoices" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600")}>
          <FileText className="h-4 w-4" /> Invoices <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">{invoices.length}</span>
        </button>
        <button onClick={() => setTab("claims")} className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === "claims" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600")}>
          <AlertTriangle className="h-4 w-4" /> Claims <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">{claims.length}</span>
        </button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div> : (
        <div className="mt-5">
          {/* INVOICES */}
          {tab === "invoices" && (
            <div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {INV_STATUSES.map(s => {
                  const colors: Record<string, string> = { UNPAID: "bg-rose-50 text-rose-600 hover:bg-rose-100", PARTIAL: "bg-amber-50 text-amber-600 hover:bg-amber-100", PAID: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100", OVERDUE: "bg-purple-50 text-purple-600 hover:bg-purple-100" };
                  return <button key={s} onClick={() => setInvStatus(s)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", invStatus === s ? "bg-gray-900 text-white" : colors[s] || "bg-gray-100 text-gray-500 hover:bg-gray-200")}>{s}</button>;
                })}
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200 bg-gray-50">
                    {["Invoice #", "Company", "Type", "Amount", "Paid", "Status", "Due Date"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No invoices</td></tr>
                    ) : invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{inv.company.name}</td>
                        <td className="px-4 py-3"><Badge variant={statusColors[inv.type]}>{inv.type}</Badge></td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">${inv.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm"><span className={inv.paidAmount >= inv.amount ? "text-emerald-600" : "text-gray-500"}>${inv.paidAmount.toLocaleString()}</span></td>
                        <td className="px-4 py-3"><Badge variant={statusColors[inv.status]}>{inv.status}</Badge></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CLAIMS */}
          {tab === "claims" && (
            <div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {CLAIM_STATUSES.map(s => {
                  const colors: Record<string, string> = { OPEN: "bg-amber-50 text-amber-600 hover:bg-amber-100", IN_PROGRESS: "bg-blue-50 text-blue-600 hover:bg-blue-100", RESOLVED: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100", CLOSED: "bg-gray-100 text-gray-500 hover:bg-gray-200" };
                  return <button key={s} onClick={() => setClaimStatus(s)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", claimStatus === s ? "bg-gray-900 text-white" : colors[s] || "bg-gray-100 text-gray-500 hover:bg-gray-200")}>{s === "All" ? "All" : s.replace("_", " ")}</button>;
                })}
              </div>
              <div className="space-y-2">
                {claims.length === 0 ? (
                  <div className="card p-12 text-center text-sm text-gray-400">No claims</div>
                ) : claims.map(c => (
                  <button key={c.id} onClick={() => setSelectedClaim(c)} className="w-full card p-4 text-left hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className={cn("h-4 w-4 flex-shrink-0", c.priority === "HIGH" ? "text-rose-500" : c.priority === "MEDIUM" ? "text-amber-500" : "text-emerald-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.company.name} · {new Date(c.createdAt).toLocaleDateString()} {c.order ? `· ${c.order.orderNumber}` : ""}</p>
                      </div>
                      <Badge variant={statusColors[c.priority]}>{c.priority}</Badge>
                      <Badge variant={statusColors[c.status]}>{c.status.replace("_", " ")}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Claim Detail */}
      <Modal isOpen={!!selectedClaim} onClose={() => setSelectedClaim(null)} title={selectedClaim?.title || ""} size="md">
        {selectedClaim && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400">Company</p><p className="text-sm font-medium">{selectedClaim.company.name}</p></div>
              <div><p className="text-xs text-gray-400">Priority</p><Badge variant={statusColors[selectedClaim.priority]}>{selectedClaim.priority}</Badge></div>
            </div>
            {selectedClaim.description && <div><p className="text-xs text-gray-400 mb-1">Description</p><p className="text-sm text-gray-700">{selectedClaim.description}</p></div>}
            <div>
              <p className="text-xs text-gray-400 mb-2">Status</p>
              <div className="flex gap-2 flex-wrap">
                {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(s => (
                  <button key={s} onClick={() => updateClaimStatus(selectedClaim.id, s)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", selectedClaim.status === s ? "bg-gray-900 text-white" : ({"OPEN":"bg-amber-50 text-amber-600 hover:bg-amber-100","IN_PROGRESS":"bg-blue-50 text-blue-600 hover:bg-blue-100","RESOLVED":"bg-emerald-50 text-emerald-600 hover:bg-emerald-100","CLOSED":"bg-gray-100 text-gray-500 hover:bg-gray-200"} as Record<string,string>)[s] || "bg-gray-100 text-gray-500 hover:bg-gray-200")}>{s.replace("_", " ")}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Invoice */}
      <Modal isOpen={showAddInvoice} onClose={() => setShowAddInvoice(false)} title="New Invoice" size="md">
        <FormAddInvoice onSuccess={() => { setShowAddInvoice(false); fetchData(); }} />
      </Modal>

      {/* Add Claim */}
      <Modal isOpen={showAddClaim} onClose={() => setShowAddClaim(false)} title="New Claim" size="md">
        <FormAddClaim onSuccess={() => { setShowAddClaim(false); fetchData(); }} />
      </Modal>
    </div>
  );
}

function FormAddInvoice({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ type: "VENDOR", invoiceNumber: "", amount: "", currency: "USD", dueDate: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-invoice", ...form }) }); setSaving(false); onSuccess(); };
  const inp = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inp}><option value="VENDOR">Vendor</option><option value="CUSTOMER">Customer</option></select></div>
        <div><label className="block text-sm font-medium text-gray-700">Invoice #</label><input type="text" value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})} className={inp} required /></div>
        <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inp} required /></div>
        <div><label className="block text-sm font-medium text-gray-700">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className={inp} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={inp} /></div>
      <div className="flex justify-end"><button type="submit" disabled={saving || !form.invoiceNumber || !form.amount} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Creating..." : "Create Invoice"}</button></div>
    </form>
  );
}

function FormAddClaim({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-claim", ...form }) }); setSaving(false); onSuccess(); };
  const inp = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp} required /></div>
      <div><label className="block text-sm font-medium text-gray-700">Priority</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inp}><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></div>
      <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className={inp} /></div>
      <div className="flex justify-end"><button type="submit" disabled={saving || !form.title} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Creating..." : "Create Claim"}</button></div>
    </form>
  );
}
