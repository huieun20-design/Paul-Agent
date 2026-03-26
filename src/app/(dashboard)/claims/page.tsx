"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Claim {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  order: { id: string; orderNumber: string } | null;
  sourceEmail: { id: string; subject: string; from: string } | null;
}

const STATUSES = ["All", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Claim | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status);

    const res = await fetch(`/api/claims?${params}`);
    const data = await res.json();
    setClaims(data.claims || []);
    setLoading(false);
  }, [status]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchClaims();
    setSelected(null);
  };

  const columns = [
    {
      key: "priority",
      label: "",
      className: "w-8",
      render: (c: Claim) => (
        <AlertTriangle className={cn("h-4 w-4", c.priority === "HIGH" ? "text-red-500" : c.priority === "MEDIUM" ? "text-yellow-500" : "text-green-500")} />
      ),
    },
    { key: "title", label: "Title", render: (c: Claim) => <span className="font-medium">{c.title}</span> },
    { key: "status", label: "Status", render: (c: Claim) => <Badge variant={statusColors[c.status]}>{c.status.replace("_", " ")}</Badge> },
    { key: "priority", label: "Priority", render: (c: Claim) => <Badge variant={statusColors[c.priority]}>{c.priority}</Badge> },
    { key: "order", label: "Order", render: (c: Claim) => c.order?.orderNumber || "—" },
    { key: "source", label: "Source", render: (c: Claim) => c.sourceEmail ? "Email" : "Manual" },
    { key: "createdAt", label: "Created", render: (c: Claim) => new Date(c.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
          <p className="mt-1 text-sm text-gray-500">
            {claims.filter((c) => c.status === "OPEN").length} open · {claims.filter((c) => c.priority === "HIGH" && c.status !== "CLOSED").length} high priority
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Claim
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={cn("rounded-lg px-3 py-2 text-sm font-medium", status === s ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
            {s === "All" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <DataTable columns={columns} data={claims} onRowClick={setSelected} emptyMessage="No claims." />
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.title || ""} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Status</p><Badge variant={statusColors[selected.status]}>{selected.status.replace("_", " ")}</Badge></div>
              <div><p className="text-xs text-gray-500">Priority</p><Badge variant={statusColors[selected.priority]}>{selected.priority}</Badge></div>
              <div><p className="text-xs text-gray-500">Order</p><p className="text-sm">{selected.order?.orderNumber || "—"}</p></div>
              <div><p className="text-xs text-gray-500">Source</p><p className="text-sm">{selected.sourceEmail?.subject || "Manual"}</p></div>
            </div>
            {selected.description && (
              <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700">{selected.description}</p></div>
            )}
            <div>
              <p className="mb-2 text-xs text-gray-500">Update Status</p>
              <div className="flex gap-2">
                {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)} disabled={selected.status === s} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", selected.status === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Claim" size="md">
        <CreateClaimForm onSuccess={() => { setShowCreate(false); fetchClaims(); }} />
      </Modal>
    </div>
  );
}

function CreateClaimForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Priority</label>
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !form.title} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Creating..." : "Create Claim"}
        </button>
      </div>
    </form>
  );
}
