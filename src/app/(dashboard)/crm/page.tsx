"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Loader2, Building2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Contact {
  id: string;
  type: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  vendorScore: number | null;
  createdAt: string;
  _count: { vendorOrders: number; customerOrders: number; invoicesAsVendor: number; invoicesAsCustomer: number };
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== "All") params.set("type", type);
    if (search) params.set("search", search);

    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }, [type, search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const columns = [
    {
      key: "companyName",
      label: "Company",
      render: (c: Contact) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {c.companyName[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{c.companyName}</p>
            {c.contactName && <p className="text-xs text-gray-500">{c.contactName}</p>}
          </div>
        </div>
      ),
    },
    { key: "type", label: "Type", render: (c: Contact) => <Badge variant={statusColors[c.type]}>{c.type}</Badge> },
    { key: "email", label: "Email", render: (c: Contact) => c.email || "—" },
    { key: "phone", label: "Phone", render: (c: Contact) => c.phone || "—" },
    {
      key: "orders",
      label: "Orders",
      render: (c: Contact) => c._count.vendorOrders + c._count.customerOrders,
    },
    {
      key: "invoices",
      label: "Invoices",
      render: (c: Contact) => c._count.invoicesAsVendor + c._count.invoicesAsCustomer,
    },
    {
      key: "vendorScore",
      label: "Score",
      render: (c: Contact) =>
        c.vendorScore != null ? (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{c.vendorScore.toFixed(1)}</span>
          </div>
        ) : "—",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="mt-1 text-sm text-gray-500">{contacts.length} contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        {["All", "VENDOR", "CUSTOMER", "BOTH"].map((t) => (
          <button key={t} onClick={() => setType(t)} className={cn("rounded-lg px-3 py-2 text-sm font-medium", type === t ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <DataTable columns={columns} data={contacts} onRowClick={setSelected} emptyMessage="No contacts yet." />
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.companyName || ""} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Type</p><Badge variant={statusColors[selected.type]}>{selected.type}</Badge></div>
              <div><p className="text-xs text-gray-500">Contact</p><p className="text-sm">{selected.contactName || "—"}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p className="text-sm">{selected.email || "—"}</p></div>
              <div><p className="text-xs text-gray-500">Phone</p><p className="text-sm">{selected.phone || "—"}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Address</p><p className="text-sm">{selected.address || "—"}</p></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold">{selected._count.vendorOrders + selected._count.customerOrders}</p>
                <p className="text-xs text-gray-500">Orders</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold">{selected._count.invoicesAsVendor + selected._count.invoicesAsCustomer}</p>
                <p className="text-xs text-gray-500">Invoices</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold">{selected.vendorScore?.toFixed(1) || "—"}</p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold">{new Date(selected.createdAt).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500">Since</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Contact" size="md">
        <CreateContactForm onSuccess={() => { setShowCreate(false); fetchContacts(); }} />
      </Modal>
    </div>
  );
}

function CreateContactForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ type: "VENDOR", companyName: "", contactName: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="VENDOR">Vendor</option>
            <option value="CUSTOMER">Customer</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Company Name</label>
          <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Name</label>
          <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !form.companyName} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Add Contact"}
        </button>
      </div>
    </form>
  );
}
