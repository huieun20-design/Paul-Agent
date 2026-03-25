"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Employee {
  id: string;
  name: string;
  position: string | null;
  salary: number;
  currency: string;
  startDate: string;
  isActive: boolean;
  _count: { payrolls: number };
  payrolls: { paidAt: string; amount: number }[];
}

interface PayrollRecord {
  id: string;
  amount: number;
  currency: string;
  period: string;
  paidAt: string;
  employee: { name: string; position: string | null };
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"employees" | "records">("employees");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showPayroll, setShowPayroll] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [empRes, recRes] = await Promise.all([
      fetch("/api/payroll/employees"),
      fetch("/api/payroll/records"),
    ]);
    setEmployees(await empRes.json());
    setRecords(await recRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeEmployees = employees.filter((e) => e.isActive);
  const monthlyTotal = activeEmployees.reduce((s, e) => s + e.salary, 0);
  const totalPaid = records.reduce((s, r) => s + r.amount, 0);

  const employeeColumns = [
    {
      key: "name",
      label: "Name",
      render: (e: Employee) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {e.name[0]}
          </div>
          <div>
            <p className="font-medium">{e.name}</p>
            <p className="text-xs text-gray-500">{e.position || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "salary",
      label: "Salary",
      render: (e: Employee) => `${e.currency} ${e.salary.toLocaleString()}/mo`,
    },
    {
      key: "status",
      label: "Status",
      render: (e: Employee) => (
        <Badge variant={e.isActive ? "green" : "default"}>
          {e.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (e: Employee) => new Date(e.startDate).toLocaleDateString(),
    },
    {
      key: "payrolls",
      label: "Last Paid",
      render: (e: Employee) =>
        e.payrolls[0] ? new Date(e.payrolls[0].paidAt).toLocaleDateString() : "Never",
    },
  ];

  const recordColumns = [
    {
      key: "employee",
      label: "Employee",
      render: (r: PayrollRecord) => (
        <div>
          <p className="font-medium">{r.employee.name}</p>
          <p className="text-xs text-gray-500">{r.employee.position || ""}</p>
        </div>
      ),
    },
    {
      key: "period",
      label: "Period",
      render: (r: PayrollRecord) => r.period,
    },
    {
      key: "amount",
      label: "Amount",
      render: (r: PayrollRecord) => `${r.currency} ${r.amount.toLocaleString()}`,
    },
    {
      key: "paidAt",
      label: "Paid",
      render: (r: PayrollRecord) => new Date(r.paidAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPayroll(true)} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            <DollarSign className="h-4 w-4" /> Run Payroll
          </button>
          <button onClick={() => setShowAddEmployee(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500"><Users className="h-4 w-4" /><span className="text-sm">Employees</span></div>
          <p className="mt-1 text-2xl font-bold">{activeEmployees.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500"><DollarSign className="h-4 w-4" /><span className="text-sm">Monthly Cost</span></div>
          <p className="mt-1 text-2xl font-bold">${monthlyTotal.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500"><DollarSign className="h-4 w-4" /><span className="text-sm">Total Paid</span></div>
          <p className="mt-1 text-2xl font-bold">${totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        <button onClick={() => setTab("employees")} className={cn("rounded-lg px-4 py-2 text-sm font-medium", tab === "employees" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
          Employees
        </button>
        <button onClick={() => setTab("records")} className={cn("rounded-lg px-4 py-2 text-sm font-medium", tab === "records" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
          Pay Records
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : tab === "employees" ? (
          <DataTable columns={employeeColumns} data={employees} emptyMessage="No employees yet." />
        ) : (
          <DataTable columns={recordColumns} data={records} emptyMessage="No payroll records." />
        )}
      </div>

      {/* Add Employee */}
      <Modal isOpen={showAddEmployee} onClose={() => setShowAddEmployee(false)} title="Add Employee" size="md">
        <AddEmployeeForm onSuccess={() => { setShowAddEmployee(false); fetchData(); }} />
      </Modal>

      {/* Run Payroll */}
      <Modal isOpen={showPayroll} onClose={() => setShowPayroll(false)} title="Run Payroll" size="md">
        <RunPayrollForm employees={activeEmployees} onSuccess={() => { setShowPayroll(false); fetchData(); }} />
      </Modal>
    </div>
  );
}

function AddEmployeeForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", position: "", salary: "", currency: "USD" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/payroll/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
          <label className="block text-sm font-medium text-gray-700">Position</label>
          <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Monthly Salary</label>
          <input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !form.name || !form.salary} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Adding..." : "Add Employee"}
        </button>
      </div>
    </form>
  );
}

function RunPayrollForm({ employees, onSuccess }: { employees: Employee[]; onSuccess: () => void }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    for (const emp of employees) {
      await fetch("/api/payroll/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          amount: emp.salary,
          currency: emp.currency,
          period,
        }),
      });
    }
    setRunning(false);
    onSuccess();
  };

  const total = employees.reduce((s, e) => s + e.salary, 0);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Period</label>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-600">{employees.length} employees</p>
        <p className="mt-1 text-xl font-bold">Total: ${total.toLocaleString()}</p>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {employees.map((emp) => (
          <div key={emp.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
            <span>{emp.name}</span>
            <span className="font-medium">${emp.salary.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleRun} disabled={running || employees.length === 0} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
          {running ? "Processing..." : `Pay ${employees.length} employees`}
        </button>
      </div>
    </div>
  );
}
