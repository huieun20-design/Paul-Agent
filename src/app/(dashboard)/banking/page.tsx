"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Landmark, CreditCard, Wallet, Banknote, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface BankAccount {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  balance: number;
  currency: string;
  _count: { transactions: number; payments: number };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string | null;
  date: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  CHECKING: <Landmark className="h-5 w-5" />,
  CREDIT_CARD: <CreditCard className="h-5 w-5" />,
  CASH: <Wallet className="h-5 w-5" />,
  SAVINGS: <Banknote className="h-5 w-5" />,
};

const typeColors: Record<string, string> = {
  CHECKING: "bg-blue-100 text-blue-700",
  CREDIT_CARD: "bg-purple-100 text-purple-700",
  CASH: "bg-green-100 text-green-700",
  SAVINGS: "bg-yellow-100 text-yellow-700",
};

export default function BankingPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddTx, setShowAddTx] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/banking");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const selectAccount = async (id: string) => {
    setSelectedId(id);
    const res = await fetch(`/api/banking/${id}`);
    const data = await res.json();
    setTransactions(data.transactions || []);
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Total balance: <span className="font-semibold text-gray-900">${totalBalance.toLocaleString()}</span>
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Account
        </button>
      </div>

      {/* Account Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-12 text-gray-400">
            <Landmark className="h-12 w-12 mb-3" />
            <p className="text-sm">No accounts yet</p>
          </div>
        ) : (
          accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => selectAccount(account.id)}
              className={cn(
                "rounded-xl border p-5 text-left transition-all",
                selectedId === account.id
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", typeColors[account.type])}>
                  {typeIcons[account.type]}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-xs text-gray-500">{account.bankName || account.type}</p>
                </div>
              </div>
              <p className={cn("mt-4 text-2xl font-bold", account.balance >= 0 ? "text-gray-900" : "text-red-600")}>
                {account.currency} {account.balance.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-400">{account._count.transactions} transactions</p>
            </button>
          ))
        )}
      </div>

      {/* Transactions */}
      {selected && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selected.name} — Transactions
            </h2>
            <button
              onClick={() => setShowAddTx(true)}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" /> Add Transaction
            </button>
          </div>
          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No transactions yet</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 px-4 py-3">
                  {tx.type === "INCOMING" ? (
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <span className={cn("text-sm font-medium", tx.type === "INCOMING" ? "text-green-600" : "text-red-600")}>
                    {tx.type === "INCOMING" ? "+" : "-"}${tx.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">Bal: ${tx.balance.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Bank Account" size="md">
        <CreateAccountForm onSuccess={() => { setShowCreate(false); fetchAccounts(); }} />
      </Modal>

      {/* Add Transaction Modal */}
      <Modal isOpen={showAddTx} onClose={() => setShowAddTx(false)} title="Add Transaction" size="sm">
        {selectedId && (
          <AddTransactionForm
            accountId={selectedId}
            onSuccess={() => { setShowAddTx(false); selectAccount(selectedId); fetchAccounts(); }}
          />
        )}
      </Modal>
    </div>
  );
}

function CreateAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", type: "CHECKING", bankName: "", accountNumber: "", balance: "0", currency: "USD" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/banking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="CHECKING">Checking</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="CASH">Cash</option>
            <option value="SAVINGS">Savings</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bank Name</label>
          <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Initial Balance</label>
          <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !form.name} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Creating..." : "Add Account"}
        </button>
      </div>
    </form>
  );
}

function AddTransactionForm({ accountId, onSuccess }: { accountId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ type: "INCOMING", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/banking/${accountId}/transactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="INCOMING">Deposit / Income</option>
          <option value="OUTGOING">Withdrawal / Expense</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Amount</label>
        <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !form.amount} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Add Transaction"}
        </button>
      </div>
    </form>
  );
}
