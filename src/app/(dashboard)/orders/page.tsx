"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Plus, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmount: number | null;
  currency: string;
  trackingNumber: string | null;
  orderDate: string;
  expectedDate: string | null;
  vendor: { id: string; companyName: string } | null;
  customer: { id: string; companyName: string } | null;
  _count: { invoices: number; claims: number };
}

const STATUSES = ["All", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "PAID", "CANCELLED"];
const TYPES = ["All", "VENDOR", "CUSTOMER"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== "All") params.set("type", type);
    if (status !== "All") params.set("status", status);
    if (search) params.set("search", search);

    const res = await fetch(`/api/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }, [type, status, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
    setSelectedOrder(null);
  };

  const columns = [
    {
      key: "orderNumber",
      label: "Order #",
      render: (o: Order) => <span className="font-medium">{o.orderNumber}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (o: Order) => <Badge variant={statusColors[o.type]}>{o.type}</Badge>,
    },
    {
      key: "contact",
      label: "Vendor / Customer",
      render: (o: Order) => o.vendor?.companyName || o.customer?.companyName || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (o: Order) => <Badge variant={statusColors[o.status]}>{o.status}</Badge>,
    },
    {
      key: "totalAmount",
      label: "Amount",
      render: (o: Order) =>
        o.totalAmount ? `${o.currency} ${o.totalAmount.toLocaleString()}` : "—",
    },
    {
      key: "orderDate",
      label: "Date",
      render: (o: Order) => new Date(o.orderDate).toLocaleDateString(),
    },
    {
      key: "trackingNumber",
      label: "Tracking",
      render: (o: Order) => o.trackingNumber || "—",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">{orders.length} orders</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                type === t ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {t === "All" ? "All Types" : t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium",
                status === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {s === "All" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={orders}
            onRowClick={setSelectedOrder}
            emptyMessage="No orders yet. Create your first order."
          />
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order ${selectedOrder?.orderNumber || ""}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <Badge variant={statusColors[selectedOrder.type]}>{selectedOrder.type}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={statusColors[selectedOrder.status]}>{selectedOrder.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact</p>
                <p className="text-sm font-medium">{selectedOrder.vendor?.companyName || selectedOrder.customer?.companyName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-medium">{selectedOrder.totalAmount ? `${selectedOrder.currency} ${selectedOrder.totalAmount.toLocaleString()}` : "—"}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-gray-500">Update Status</p>
              <div className="flex gap-2">
                {STATUSES.filter((s) => s !== "All").map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selectedOrder.id, s)}
                    disabled={selectedOrder.status === s}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium",
                      selectedOrder.status === s
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Order" size="lg">
        <CreateOrderForm onSuccess={() => { setShowCreate(false); fetchOrders(); }} />
      </Modal>
    </div>
  );
}

function CreateOrderForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    type: "VENDOR",
    orderNumber: "",
    totalAmount: "",
    currency: "USD",
    expectedDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/orders", {
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
            <option value="VENDOR">Vendor Order</option>
            <option value="CUSTOMER">Customer Order</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Order Number</label>
          <input
            type="text"
            value={form.orderNumber}
            onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            step="0.01"
            value={form.totalAmount}
            onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Expected Date</label>
          <input
            type="date"
            value={form.expectedDate}
            onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={saving || !form.orderNumber}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Order"}
        </button>
      </div>
    </form>
  );
}
