"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Payment {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  reference: string | null;
  invoice: { id: string; invoiceNumber: string; amount: number } | null;
  bankAccount: { id: string; name: string } | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("All");
  const [showCreate, setShowCreate] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== "All") params.set("type", type);

    const res = await fetch(`/api/payments?${params}`);
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  }, [type]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const incoming = payments.filter((p) => p.type === "INCOMING").reduce((s, p) => s + p.amount, 0);
  const outgoing = payments.filter((p) => p.type === "OUTGOING").reduce((s, p) => s + p.amount, 0);

  const columns = [
    {
      key: "type",
      label: "Type",
      render: (p: Payment) => (
        <div className="flex items-center gap-2">
          {p.type === "INCOMING" ? (
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          )}
          <Badge variant={statusColors[p.type]}>{p.type}</Badge>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (p: Payment) => (
        <span className={p.type === "INCOMING" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {p.type === "INCOMING" ? "+" : "-"}{p.currency} {p.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "invoice",
      label: "Invoice",
      render: (p: Payment) => p.invoice?.invoiceNumber || "—",
    },
    {
      key: "bankAccount",
      label: "Account",
      render: (p: Payment) => p.bankAccount?.name || "—",
    },
    {
      key: "description",
      label: "Description",
      render: (p: Payment) => p.description || "—",
    },
    {
      key: "date",
      label: "Date",
      render: (p: Payment) => new Date(p.date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Incoming</p>
          <p className="mt-1 text-2xl font-bold text-green-600">${incoming.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Outgoing</p>
          <p className="mt-1 text-2xl font-bold text-red-600">${outgoing.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Net</p>
          <p className={cn("mt-1 text-2xl font-bold", incoming - outgoing >= 0 ? "text-green-600" : "text-red-600")}>
            ${(incoming - outgoing).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        {["All", "INCOMING", "OUTGOING"].map((t) => (
          <button key={t} onClick={() => setType(t)} className={cn("rounded-lg px-3 py-2 text-sm font-medium", type === t ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <DataTable columns={columns} data={payments} emptyMessage="No payments recorded." />
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Record Payment" size="md">
        <CreatePaymentForm onSuccess={() => { setShowCreate(false); fetchPayments(); }} />
      </Modal>
    </div>
  );
}

function CreatePaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ type: "INCOMING", amount: "", currency: "USD", description: "", reference: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="INCOMING">Incoming</option>
            <option value="OUTGOING">Outgoing</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Reference</label>
          <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !form.amount} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Record Payment"}
        </button>
      </div>
    </form>
  );
}
