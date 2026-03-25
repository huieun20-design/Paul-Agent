"use client";

import { useState, useEffect } from "react";
import {
  Package,
  FileText,
  AlertTriangle,
  CheckSquare,
  Mail,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Landmark,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardData {
  pendingOrders: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  overdueAmount: number;
  cashBalance: number;
  openTodos: number;
  urgentTodos: number;
  openClaims: number;
  recentEmails: number;
  incomingPayments30d: number;
  outgoingPayments30d: number;
  monthlyPayroll: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) return null;

  const netCashFlow = data.incomingPayments30d - data.outgoingPayments30d;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Business overview at a glance</p>

      {/* Alert Banner */}
      {(data.overdueInvoices > 0 || data.urgentTodos > 0 || data.openClaims > 0) && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Attention Required</span>
          </div>
          <div className="mt-2 flex gap-6 text-sm text-red-600">
            {data.overdueInvoices > 0 && (
              <span>{data.overdueInvoices} overdue invoice{data.overdueInvoices > 1 ? "s" : ""} (${data.overdueAmount.toLocaleString()})</span>
            )}
            {data.urgentTodos > 0 && (
              <span>{data.urgentTodos} urgent task{data.urgentTodos > 1 ? "s" : ""}</span>
            )}
            {data.openClaims > 0 && (
              <span>{data.openClaims} open claim{data.openClaims > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      )}

      {/* Primary Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Landmark className="h-5 w-5 text-blue-600" />}
          label="Cash Balance"
          value={`$${data.cashBalance.toLocaleString()}`}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-red-600" />}
          label="Unpaid Invoices"
          value={String(data.unpaidInvoices)}
          subtitle={data.overdueInvoices > 0 ? `${data.overdueInvoices} overdue` : undefined}
          bgColor="bg-red-50"
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-yellow-600" />}
          label="Pending Orders"
          value={String(data.pendingOrders)}
          bgColor="bg-yellow-50"
        />
        <StatCard
          icon={<Mail className="h-5 w-5 text-purple-600" />}
          label="Unread Emails"
          value={String(data.recentEmails)}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Cash Flow + Tasks */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cash Flow Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Cash Flow (30 days)
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Incoming</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-green-600">
                ${data.incomingPayments30d.toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium">Outgoing</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-red-600">
                ${data.outgoingPayments30d.toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Net</span>
              </div>
              <p className={cn("mt-1 text-2xl font-bold", netCashFlow >= 0 ? "text-green-600" : "text-red-600")}>
                ${netCashFlow.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Quick Stats
          </h3>
          <div className="mt-4 space-y-3">
            <QuickStat
              icon={<CheckSquare className="h-4 w-4 text-blue-500" />}
              label="Open Tasks"
              value={data.openTodos}
              urgent={data.urgentTodos}
            />
            <QuickStat
              icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
              label="Open Claims"
              value={data.openClaims}
            />
            <QuickStat
              icon={<Users className="h-4 w-4 text-green-500" />}
              label="Monthly Payroll"
              value={`$${data.monthlyPayroll.toLocaleString()}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bgColor)}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-red-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  urgent?: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {urgent != null && urgent > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
            {urgent} urgent
          </span>
        )}
      </div>
    </div>
  );
}
