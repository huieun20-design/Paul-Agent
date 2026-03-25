"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, Landmark, CreditCard, Wallet, Banknote,
  ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown,
  DollarSign, Building2, ChevronDown, AlertCircle, Star,
  Calendar, Percent, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Company { id: string; name: string; balance: number; accountCount: number; _count: { bankAccounts: number }; }
interface BankAccount {
  id: string; name: string; type: string; bankName: string | null; accountNumber: string | null;
  balance: number; currency: string; companyId: string;
  creditLimit: number | null; dueDate: number | null; minimumPay: number | null; apr: number | null; statementDate: number | null;
  company: { id: string; name: string }; transactions: Transaction[]; _count: { transactions: number; payments: number };
}
interface Payment { id: string; type: string; amount: number; currency: string; date: string; description: string | null; reference: string | null; company: { id: string; name: string }; invoice: { id: string; invoiceNumber: string; amount: number } | null; bankAccount: { id: string; name: string } | null; }
interface Transaction { id: string; type: string; amount: number; balance: number; description: string | null; date: string; }
interface Summary { totalBalance: number; incoming: number; outgoing: number; net: number; }

const typeIcons: Record<string, React.ReactNode> = { CHECKING: <Landmark className="h-4 w-4" />, CREDIT_CARD: <CreditCard className="h-4 w-4" />, CASH: <Wallet className="h-4 w-4" />, SAVINGS: <Banknote className="h-4 w-4" /> };
const typeColors: Record<string, string> = { CHECKING: "bg-blue-100 text-blue-600", CREDIT_CARD: "bg-purple-100 text-purple-600", CASH: "bg-green-100 text-green-600", SAVINGS: "bg-amber-100 text-amber-600" };

const COMMON_BANKS = [
  "", "Bank of America", "Chase", "Wells Fargo", "Citibank", "US Bank",
  "Capital One", "PNC Bank", "TD Bank", "Truist", "American Express", "Discover",
  "KB Kookmin Bank", "Shinhan Bank", "Woori Bank", "Hana Bank", "NH Bank",
  "IBK", "Kakao Bank", "Toss Bank", "K Bank",
  "HSBC", "Barclays", "Deutsche Bank", "UBS", "Other",
];

// Credit card recommendation logic
function getCardRecommendation(cards: BankAccount[]): { card: BankAccount; reason: string }[] {
  if (cards.length === 0) return [];

  const recs: { card: BankAccount; reason: string; score: number }[] = cards.map(card => {
    const available = (card.creditLimit || 0) - Math.abs(card.balance);
    const utilization = card.creditLimit ? (Math.abs(card.balance) / card.creditLimit) * 100 : 0;
    let score = 0;
    let reason = "";

    // Lower utilization = better (keep under 30%)
    if (utilization < 30) { score += 3; reason = `Low utilization (${utilization.toFixed(0)}%)`; }
    else if (utilization < 50) { score += 2; reason = `Moderate utilization (${utilization.toFixed(0)}%)`; }
    else if (utilization < 75) { score += 1; reason = `High utilization (${utilization.toFixed(0)}%) — consider other cards`; }
    else { score += 0; reason = `Very high utilization (${utilization.toFixed(0)}%) — avoid using`; }

    // Lower APR = better
    if (card.apr && card.apr < 15) score += 2;
    else if (card.apr && card.apr < 20) score += 1;

    // More available credit = better
    if (available > 5000) score += 2;
    else if (available > 1000) score += 1;

    return { card, reason, score };
  });

  return recs.sort((a, b) => b.score - a.score).map(r => ({ card: r.card, reason: r.reason }));
}

function getDaysUntilDue(dueDate: number | null): number | null {
  if (!dueDate) return null;
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDate);
  if (thisMonth <= today) thisMonth.setMonth(thisMonth.getMonth() + 1);
  return Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function FinancePage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalBalance: 0, incoming: 0, outgoing: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [tab, setTab] = useState<"overview" | "credit-cards" | "payments" | "transactions">("overview");
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCompany !== "all") params.set("companyId", selectedCompany);
    if (paymentFilter !== "All") params.set("type", paymentFilter);
    const res = await fetch(`/api/finance?${params}`);
    const data = await res.json();
    setAccounts(data.accounts || []);
    setPayments(data.payments || []);
    setCompanies(data.companies || []);
    setSummary(data.summary || { totalBalance: 0, incoming: 0, outgoing: 0, net: 0 });
    setLoading(false);
  }, [selectedCompany, paymentFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = selectedCompany === "all" ? accounts : accounts.filter(a => a.companyId === selectedCompany);
  const bankAccounts = filtered.filter(a => a.type !== "CREDIT_CARD");
  const creditCards = filtered.filter(a => a.type === "CREDIT_CARD");
  const totalCreditUsed = creditCards.reduce((s, c) => s + Math.abs(c.balance), 0);
  const totalCreditLimit = creditCards.reduce((s, c) => s + (c.creditLimit || 0), 0);
  const cardRecs = getCardRecommendation(creditCards);

  return (
    <div className="max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-400 mt-0.5">Banking, Credit Cards & Payments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={selectedCompany} onChange={e => { setSelectedCompany(e.target.value); setSelectedAccount(null); }}
              className="appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:outline-none">
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={() => setShowAddCompany(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Building2 className="h-4 w-4 text-gray-400" /> Company</button>
          <button onClick={() => setShowAddAccount(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Plus className="h-4 w-4 text-gray-400" /> Account</button>
          <button onClick={() => setShowAddPayment(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Plus className="h-4 w-4 text-gray-400" /> Payment</button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-5 gap-4">
        <SumCard icon={<Landmark className="h-4 w-4 text-blue-500" />} label="Bank Balance" value={`$${summary.totalBalance.toLocaleString()}`} sub={`${bankAccounts.length} accounts`} />
        <SumCard icon={<CreditCard className="h-4 w-4 text-purple-500" />} label="Credit Used" value={`$${totalCreditUsed.toLocaleString()}`} sub={totalCreditLimit > 0 ? `of $${totalCreditLimit.toLocaleString()} limit` : `${creditCards.length} cards`} />
        <SumCard icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} label="Income" value={`$${summary.incoming.toLocaleString()}`} color="text-emerald-600" />
        <SumCard icon={<TrendingDown className="h-4 w-4 text-rose-500" />} label="Expense" value={`$${summary.outgoing.toLocaleString()}`} color="text-rose-500" />
        <SumCard icon={<DollarSign className="h-4 w-4 text-violet-500" />} label="Net" value={`$${summary.net.toLocaleString()}`} color={summary.net >= 0 ? "text-emerald-600" : "text-rose-500"} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-1 border-b border-gray-200">
        {(["overview", "credit-cards", "payments", "transactions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors",
            tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
          )}>{t === "credit-cards" ? "Credit Cards" : t}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div> : (
        <div className="mt-6">

          {/* ====== OVERVIEW ====== */}
          {tab === "overview" && (
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank Accounts</h3>
                {bankAccounts.length === 0 ? <div className="card p-8 text-center text-sm text-gray-400">No bank accounts</div> : bankAccounts.map(a => (
                  <AccountCard key={a.id} account={a} onClick={() => { setSelectedAccount(a); setTab("transactions"); }} />
                ))}
                {creditCards.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">Credit Cards</h3>
                    {creditCards.slice(0, 3).map(c => (
                      <CreditCardMini key={c.id} card={c} onClick={() => setTab("credit-cards")} />
                    ))}
                  </>
                )}
              </div>
              <div className="col-span-7">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Payments</h3>
                <PaymentList payments={payments.slice(0, 10)} />
              </div>
            </div>
          )}

          {/* ====== CREDIT CARDS ====== */}
          {tab === "credit-cards" && (
            <div className="space-y-6">
              {/* Recommendation */}
              {cardRecs.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Card Recommendation — Use This First</h3>
                  </div>
                  <div className="space-y-2">
                    {cardRecs.map(({ card, reason }, i) => {
                      const available = (card.creditLimit || 0) - Math.abs(card.balance);
                      const utilization = card.creditLimit ? (Math.abs(card.balance) / card.creditLimit) * 100 : 0;
                      return (
                        <div key={card.id} className={cn("flex items-center gap-4 rounded-xl p-3", i === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50")}>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 text-xs font-bold">#{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{card.name}</p>
                              {card.bankName && <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{card.bankName}</span>}
                              {i === 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">BEST</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{reason}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600">${available.toLocaleString()} available</p>
                            <p className="text-[10px] text-gray-400">{card.apr ? `${card.apr}% APR` : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Credit Card Grid */}
              {creditCards.length === 0 ? (
                <div className="card p-12 text-center text-sm text-gray-400">No credit cards. Click "+ Account" and select Credit Card type.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {creditCards.map(card => {
                    const available = (card.creditLimit || 0) - Math.abs(card.balance);
                    const utilization = card.creditLimit ? (Math.abs(card.balance) / card.creditLimit) * 100 : 0;
                    const daysUntil = getDaysUntilDue(card.dueDate);
                    const isUrgent = daysUntil !== null && daysUntil <= 5;

                    return (
                      <div key={card.id} className="card p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600"><CreditCard className="h-5 w-5" /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{card.name}</p>
                                {card.bankName && <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{card.bankName}</span>}
                              </div>
                              <p className="text-[11px] text-gray-400">{card.company.name}{card.accountNumber ? ` · ****${card.accountNumber.slice(-4)}` : ""}</p>
                            </div>
                          </div>
                        </div>

                        {/* Balance / Limit */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Used ${Math.abs(card.balance).toLocaleString()}</span>
                            <span>Limit ${(card.creditLimit || 0).toLocaleString()}</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", utilization > 75 ? "bg-rose-500" : utilization > 50 ? "bg-amber-500" : utilization > 30 ? "bg-blue-500" : "bg-emerald-500")}
                              style={{ width: `${Math.min(utilization, 100)}%` }} />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={cn("text-xs font-medium", utilization > 75 ? "text-rose-500" : utilization > 50 ? "text-amber-500" : "text-emerald-600")}>
                              {utilization.toFixed(0)}% used
                            </span>
                            <span className="text-sm font-bold text-emerald-600">${available.toLocaleString()} available</span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {card.dueDate && (
                            <div className={cn("rounded-lg p-2.5", isUrgent ? "bg-rose-50" : "bg-gray-50")}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">Due Date</span>
                              </div>
                              <p className={cn("text-sm font-semibold", isUrgent ? "text-rose-600" : "text-gray-800")}>
                                {card.dueDate}th
                                {daysUntil !== null && <span className="text-[10px] font-normal ml-1">({daysUntil}d left)</span>}
                              </p>
                            </div>
                          )}
                          {card.minimumPay && (
                            <div className="rounded-lg bg-gray-50 p-2.5">
                              <div className="flex items-center gap-1 mb-0.5">
                                <DollarSign className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">Min Payment</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-800">${card.minimumPay.toLocaleString()}</p>
                            </div>
                          )}
                          {card.apr && (
                            <div className="rounded-lg bg-gray-50 p-2.5">
                              <div className="flex items-center gap-1 mb-0.5">
                                <Percent className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">APR</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-800">{card.apr}%</p>
                            </div>
                          )}
                          {card.statementDate && (
                            <div className="rounded-lg bg-gray-50 p-2.5">
                              <div className="flex items-center gap-1 mb-0.5">
                                <Shield className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">Statement</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-800">{card.statementDate}th</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ====== PAYMENTS ====== */}
          {tab === "payments" && (
            <div>
              <div className="flex gap-2 mb-4">
                {(["All", "INCOMING", "OUTGOING"] as const).map(t => {
                  const inactiveStyle = t === "INCOMING" ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : t === "OUTGOING" ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200";
                  return <button key={t} onClick={() => setPaymentFilter(t)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", paymentFilter === t ? "bg-gray-900 text-white" : inactiveStyle)}>{t}</button>;
                })}
              </div>
              <PaymentList payments={payments} showCompany />
            </div>
          )}

          {/* ====== TRANSACTIONS ====== */}
          {tab === "transactions" && (
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Accounts</h3>
                {filtered.map(a => (
                  <button key={a.id} onClick={() => setSelectedAccount(a)} className={cn("w-full rounded-xl border p-3 text-left transition-all", selectedAccount?.id === a.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300")}>
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", typeColors[a.type])}>{typeIcons[a.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                        <p className="text-[10px] text-gray-400">{a.company.name}{a.bankName ? ` · ${a.bankName}` : ""}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">${Math.abs(a.balance).toLocaleString()}</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => setShowAddTx(true)} disabled={!selectedAccount} className="w-full rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-400 hover:border-gray-400 disabled:opacity-40"><Plus className="h-4 w-4 inline mr-1" /> Transaction</button>
              </div>
              <div className="col-span-8">
                {selectedAccount ? (
                  <>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{selectedAccount.name} · {selectedAccount.company.name}</h3>
                    <div className="card divide-y divide-gray-100">
                      {selectedAccount.transactions.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No transactions</div> : selectedAccount.transactions.map(tx => (
                        <div key={tx.id} className="flex items-center gap-4 px-4 py-3">
                          {tx.type === "INCOMING" ? <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> : <ArrowUpRight className="h-4 w-4 text-rose-500" />}
                          <div className="flex-1"><p className="text-sm text-gray-700">{tx.description || tx.type}</p><p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p></div>
                          <span className={cn("text-sm font-semibold", tx.type === "INCOMING" ? "text-emerald-600" : "text-rose-500")}>{tx.type === "INCOMING" ? "+" : "-"}${tx.amount.toLocaleString()}</span>
                          <span className="text-xs text-gray-400 w-24 text-right">Bal: ${tx.balance.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="flex justify-center py-16 text-sm text-gray-400">Select an account</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showAddCompany} onClose={() => setShowAddCompany(false)} title="Add Company" size="sm">
        <QuickForm fields={[{ name: "name", label: "Company Name", required: true }]} action="add-company" api="/api/finance" onSuccess={() => { setShowAddCompany(false); fetchData(); }} />
      </Modal>
      <Modal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} title="Add Account / Credit Card" size="lg">
        <FormAddAccount companies={companies} onSuccess={() => { setShowAddAccount(false); fetchData(); }} />
      </Modal>
      <Modal isOpen={showAddPayment} onClose={() => setShowAddPayment(false)} title="Record Payment" size="md">
        <FormAddPayment companies={companies} accounts={accounts} onSuccess={() => { setShowAddPayment(false); fetchData(); }} />
      </Modal>
      <Modal isOpen={showAddTx} onClose={() => setShowAddTx(false)} title="Add Transaction" size="sm">
        {selectedAccount && <FormAddTransaction accountId={selectedAccount.id} companyId={selectedAccount.companyId} onSuccess={() => { setShowAddTx(false); fetchData(); }} />}
      </Modal>
    </div>
  );
}

// ============ Sub Components ============

function SumCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[11px] text-gray-400 font-semibold uppercase">{label}</span></div>
      <p className={cn("text-xl font-bold", color || "text-gray-900")}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function AccountCard({ account: a, onClick }: { account: BankAccount; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full card p-4 text-left hover:border-gray-300 transition-all">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", typeColors[a.type])}>{typeIcons[a.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
            {a.bankName && <span className="text-[10px] font-medium bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{a.bankName}</span>}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">{a.company.name} · {a.type.replace("_", " ")}{a.accountNumber ? ` · ****${a.accountNumber.slice(-4)}` : ""}</p>
        </div>
        <div className="text-right">
          <p className={cn("text-lg font-bold", a.balance >= 0 ? "text-gray-900" : "text-rose-500")}>${a.balance.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">{a.currency}</p>
        </div>
      </div>
    </button>
  );
}

function CreditCardMini({ card, onClick }: { card: BankAccount; onClick: () => void }) {
  const available = (card.creditLimit || 0) - Math.abs(card.balance);
  const utilization = card.creditLimit ? (Math.abs(card.balance) / card.creditLimit) * 100 : 0;
  const daysUntil = getDaysUntilDue(card.dueDate);

  return (
    <button onClick={onClick} className="w-full card p-4 text-left hover:border-gray-300 transition-all">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600"><CreditCard className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{card.name}</p>
            {card.bankName && <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{card.bankName}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", utilization > 75 ? "bg-rose-500" : utilization > 30 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(utilization, 100)}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{utilization.toFixed(0)}%</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-emerald-600">${available.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">{daysUntil !== null ? `${daysUntil}d til due` : ""}</p>
        </div>
      </div>
    </button>
  );
}

function PaymentList({ payments, showCompany }: { payments: Payment[]; showCompany?: boolean }) {
  return (
    <div className="card divide-y divide-gray-100">
      {payments.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No payments</div> : payments.map(p => (
        <div key={p.id} className="flex items-center gap-4 px-4 py-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", p.type === "INCOMING" ? "bg-emerald-50" : "bg-rose-50")}>
            {p.type === "INCOMING" ? <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> : <ArrowUpRight className="h-4 w-4 text-rose-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 truncate">{p.description || p.type}</p>
            <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString()}{showCompany ? ` · ${p.company.name}` : ""}{p.bankAccount ? ` · ${p.bankAccount.name}` : ""}</p>
          </div>
          <span className={cn("text-sm font-semibold", p.type === "INCOMING" ? "text-emerald-600" : "text-rose-500")}>{p.type === "INCOMING" ? "+" : "-"}${p.amount.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ============ Forms ============

function FormAddAccount({ companies, onSuccess }: { companies: Company[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ companyId: companies[0]?.id || "", name: "", type: "CHECKING", bankName: "", customBankName: "", accountNumber: "", balance: "0", currency: "USD", creditLimit: "", dueDate: "", minimumPay: "", apr: "", statementDate: "" });
  const [saving, setSaving] = useState(false);
  const isCreditCard = form.type === "CREDIT_CARD";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const bankName = form.bankName === "Other" ? form.customBankName : form.bankName;
    await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-account", ...form, bankName }) });
    setSaving(false); onSuccess();
  };
  const inp = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700">Company</label><select value={form.companyId} onChange={e => setForm({...form, companyId: e.target.value})} className={inp}>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inp}><option value="CHECKING">Checking</option><option value="SAVINGS">Savings</option><option value="CREDIT_CARD">Credit Card</option><option value="CASH">Cash</option></select></div>
        <div><label className="block text-sm font-medium text-gray-700">Name <span className="text-rose-400">*</span></label><input type="text" placeholder={isCreditCard ? "e.g. Chase Sapphire" : "e.g. Main Operating"} value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} required /></div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{isCreditCard ? "Card Issuer" : "Bank"} <span className="text-rose-400">*</span></label>
          <select value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} className={inp} required>
            <option value="" disabled>Select...</option>
            {COMMON_BANKS.filter(b => b).map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {form.bankName === "Other" && <div><label className="block text-sm font-medium text-gray-700">{isCreditCard ? "Issuer" : "Bank"} Name</label><input type="text" value={form.customBankName} onChange={e => setForm({...form, customBankName: e.target.value})} className={inp} required /></div>}
        <div><label className="block text-sm font-medium text-gray-700">Account / Card #</label><input type="text" placeholder="Optional (last 4 shown)" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} className={inp} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Currency</label><select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className={inp}><option value="USD">USD</option><option value="KRW">KRW</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="JPY">JPY</option></select></div>
        {!isCreditCard && <div><label className="block text-sm font-medium text-gray-700">Balance</label><input type="number" step="0.01" value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} className={inp} /></div>}
      </div>

      {isCreditCard && (
        <>
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-purple-500" /> Credit Card Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Credit Limit <span className="text-rose-400">*</span></label><input type="number" step="0.01" placeholder="e.g. 10000" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: e.target.value})} className={inp} required /></div>
              <div><label className="block text-sm font-medium text-gray-700">Current Balance</label><input type="number" step="0.01" placeholder="Amount owed" value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} className={inp} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Due Date (day of month)</label><input type="number" min="1" max="31" placeholder="e.g. 15" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className={inp} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Minimum Payment</label><input type="number" step="0.01" placeholder="e.g. 25" value={form.minimumPay} onChange={e => setForm({...form, minimumPay: e.target.value})} className={inp} /></div>
              <div><label className="block text-sm font-medium text-gray-700">APR %</label><input type="number" step="0.01" placeholder="e.g. 19.99" value={form.apr} onChange={e => setForm({...form, apr: e.target.value})} className={inp} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Statement Date (day)</label><input type="number" min="1" max="31" placeholder="e.g. 1" value={form.statementDate} onChange={e => setForm({...form, statementDate: e.target.value})} className={inp} /></div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end pt-2"><button type="submit" disabled={saving || !form.name || !form.bankName} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Creating..." : isCreditCard ? "Add Credit Card" : "Add Account"}</button></div>
    </form>
  );
}

function FormAddPayment({ companies, accounts, onSuccess }: { companies: Company[]; accounts: BankAccount[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ companyId: companies[0]?.id || "", type: "INCOMING", amount: "", bankAccountId: "", description: "", reference: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const filteredAccounts = accounts.filter(a => a.companyId === form.companyId);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-payment", ...form }) }); setSaving(false); onSuccess(); };
  const inp = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700">Company</label><select value={form.companyId} onChange={e => setForm({...form, companyId: e.target.value, bankAccountId: ""})} className={inp}>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700">Account</label><select value={form.bankAccountId} onChange={e => setForm({...form, bankAccountId: e.target.value})} className={inp}><option value="">— None —</option>{filteredAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type.replace("_"," ")})</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inp}><option value="INCOMING">Incoming</option><option value="OUTGOING">Outgoing</option></select></div>
        <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inp} required /></div>
        <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={inp} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Reference</label><input type="text" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} className={inp} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp} /></div>
      <div className="flex justify-end"><button type="submit" disabled={saving || !form.amount} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving..." : "Record Payment"}</button></div>
    </form>
  );
}

function FormAddTransaction({ accountId, companyId, onSuccess }: { accountId: string; companyId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ type: "INCOMING", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-transaction", bankAccountId: accountId, companyId, ...form }) }); setSaving(false); onSuccess(); };
  const inp = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inp}><option value="INCOMING">Deposit</option><option value="OUTGOING">Withdrawal</option></select></div>
      <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inp} required /></div>
      <div><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp} /></div>
      <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={inp} /></div>
      <div className="flex justify-end"><button type="submit" disabled={saving || !form.amount} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving..." : "Add"}</button></div>
    </form>
  );
}

function QuickForm({ fields, action, api, onSuccess }: { fields: { name: string; label: string; required?: boolean }[]; action: string; api: string; onSuccess: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...form }) }); setSaving(false); onSuccess(); };
  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map(f => <div key={f.name}><label className="block text-sm font-medium text-gray-700">{f.label}</label><input type="text" value={form[f.name] || ""} onChange={e => setForm({...form, [f.name]: e.target.value})} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" required={f.required} /></div>)}
      <div className="flex justify-end"><button type="submit" disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving..." : "Create"}</button></div>
    </form>
  );
}
