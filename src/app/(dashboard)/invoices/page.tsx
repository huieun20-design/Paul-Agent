"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  amount: number;
  paidAmount: number;
  currency: string;
  dueDate: string | null;
  createdAt: string;
  vendor: { id: string; companyName: string } | null;
  customer: { id: string; companyName: string } | null;
  order: { id: string; orderNumber: string } | null;
  payments: { id: string; amount: number; date: string }[];
}

const STATUSES = ["All", "UNPAID", "PARTIAL", "PAID", "OVERDUE"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [showCreate, setShowCreate] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== "All") params.set("type", type);
    if (status !== "All") params.set("status", status);

    const res = await fetch(`/api/invoices?${params}`);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setLoading(false);
  }, [type, status]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const totals = {
    total: invoices.reduce((s, i) => s + i.amount, 0),
    paid: invoices.reduce((s, i) => s + i.paidAmount, 0),
    unpaid: invoices.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
  };

  const columns = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      render: (i: Invoice) => <span className="font-medium">{i.invoiceNumber}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (i: Invoice) => <Badge variant={statusColors[i.type]}>{i.type}</Badge>,
    },
    {
      key: "contact",
      label: "Vendor / Customer",
      render: (i: Invoice) => i.vendor?.companyName || i.customer?.companyName || "—",
    },
    {
      key: "amount",
      label: "Amount",
      render: (i: Invoice) => `${i.currency} ${i.amount.toLocaleString()}`,
    },
    {
      key: "paidAmount",
      label: "Paid",
      render: (i: Invoice) => (
        <span className={i.paidAmount >= i.amount ? "text-green-600" : "text-gray-600"}>
          {i.currency} {i.paidAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (i: Invoice) => <Badge variant={statusColors[i.status]}>{i.status}</Badge>,
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (i: Invoice) => i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "—",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: totals.total, color: "text-gray-900" },
          { label: "Paid", value: totals.paid, color: "text-green-600" },
          { label: "Outstanding", value: totals.unpaid, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>
              ${s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-3">
        {["All", "VENDOR", "CUSTOMER"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              type === t ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {t === "All" ? "All" : t}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-200" />
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium",
              status === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <DataTable columns={columns} data={invoices} emptyMessage="No invoices yet." />
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Invoice" size="lg">
        <CreateInvoiceForm onSuccess={() => { setShowCreate(false); fetchInvoices(); }} />
      </Modal>
    </div>
  );
}

function CreateInvoiceForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    type: "VENDOR",
    invoiceNumber: "",
    amount: "",
    currency: "USD",
    dueDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="VENDOR">Vendor Invoice</option>
            <option value="CUSTOMER">Customer Invoice</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
          <input type="text" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Due Date</label>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !form.invoiceNumber || !form.amount} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Creating..." : "Create Invoice"}
        </button>
      </div>
    </form>
  );
}
