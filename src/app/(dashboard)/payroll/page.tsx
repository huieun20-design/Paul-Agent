"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Users, DollarSign, Banknote, CreditCard, Pencil, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Employee {
  id: string; name: string; position: string | null; salary: number;
  payType: string; wageType: string; hourlyRate: number | null; hoursPerWeek: number | null;
  cashAmount: number | null; payrollAmount: number | null;
  payFrequency: string; currency: string; startDate: string; isActive: boolean; notes: string | null;
  _count: { payrolls: number };
  payrolls: { paidAt: string; amount: number; cashAmount: number; payrollAmount: number }[];
}

interface PayrollRecord {
  id: string; amount: number; cashAmount: number; payrollAmount: number;
  hours: number | null; hourlyRate: number | null;
  currency: string; period: string; status: string; notes: string | null; paidAt: string;
  employee: { name: string; position: string | null };
}

const payTypeColors: Record<string, string> = { PAYROLL: "blue", CASH: "green", MIXED: "purple" };
const payTypeLabels: Record<string, string> = { PAYROLL: "Payroll Only", CASH: "Cash Only", MIXED: "Cash + Payroll" };
const wageTypeLabels: Record<string, string> = { SALARY: "Salary", HOURLY: "Hourly" };

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"employees" | "records">("employees");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showPayroll, setShowPayroll] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [empRes, recRes] = await Promise.all([fetch("/api/payroll/employees"), fetch("/api/payroll/records")]);
    const empData = await empRes.json();
    const recData = await recRes.json();
    if (Array.isArray(empData)) setEmployees(empData);
    if (Array.isArray(recData)) setRecords(recData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const active = employees.filter(e => e.isActive);
  const totalSalary = active.reduce((s, e) => s + e.salary, 0);
  const totalCash = active.reduce((s, e) => s + (e.cashAmount || 0), 0);
  const totalPayroll = active.reduce((s, e) => s + (e.payrollAmount || 0), 0);
  const totalPaid = records.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-400 mt-0.5">Employee salary management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowPayroll(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <DollarSign className="h-4 w-4 text-gray-400" /> Run Payroll
          </button>
          <button onClick={() => setShowAddEmployee(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Plus className="h-4 w-4 text-gray-400" /> Add Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500"><Users className="h-4 w-4" /><span className="text-xs uppercase font-semibold">Employees</span></div>
          <p className="mt-1 text-2xl font-bold">{active.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500"><DollarSign className="h-4 w-4" /><span className="text-xs uppercase font-semibold">Monthly Total</span></div>
          <p className="mt-1 text-2xl font-bold">${totalSalary.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-emerald-600"><Banknote className="h-4 w-4" /><span className="text-xs uppercase font-semibold">Cash</span></div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">${totalCash.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-blue-600"><CreditCard className="h-4 w-4" /><span className="text-xs uppercase font-semibold">Payroll</span></div>
          <p className="mt-1 text-2xl font-bold text-blue-600">${totalPayroll.toLocaleString()}</p>
        </div>
        <div className="card p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-gray-500"><DollarSign className="h-4 w-4" /><span className="text-xs uppercase font-semibold">Total Paid</span></div>
          <p className="mt-1 text-2xl font-bold">${totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-gray-200">
        <button onClick={() => setTab("employees")} className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === "employees" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600")}>
          Employees <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">{employees.length}</span>
        </button>
        <button onClick={() => setTab("records")} className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", tab === "records" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600")}>
          Pay Records <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">{records.length}</span>
        </button>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : tab === "employees" ? (
          <div className="space-y-2">
            {employees.length === 0 ? (
              <div className="card p-12 text-center text-sm text-gray-400">No employees yet</div>
            ) : employees.map(emp => (
              <div key={emp.id} className={cn("card p-4", !emp.isActive && "opacity-50")}>
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 flex-shrink-0">{emp.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                        <Badge variant={emp.isActive ? "green" : "default"}>{emp.isActive ? "Active" : "Inactive"}</Badge>
                        <Badge variant={payTypeColors[emp.payType]}>{payTypeLabels[emp.payType]}</Badge>
                        {emp.wageType === "HOURLY" && <Badge variant="orange">Hourly ${emp.hourlyRate}/hr</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {emp.position || "No position"} · Since {new Date(emp.startDate).toLocaleDateString()} · {emp.payFrequency}
                        {emp.wageType === "HOURLY" && emp.hoursPerWeek ? ` · ${emp.hoursPerWeek}h/wk` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Pay breakdown */}
                  <div className="flex items-center gap-4 text-right ml-13 md:ml-0">
                    {(emp.payType === "CASH" || emp.payType === "MIXED") && (
                      <div>
                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 justify-end"><Banknote className="h-3 w-3" />Cash</p>
                        <p className="text-sm font-bold text-emerald-600">${(emp.cashAmount || 0).toLocaleString()}</p>
                      </div>
                    )}
                    {(emp.payType === "PAYROLL" || emp.payType === "MIXED") && (
                      <div>
                        <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 justify-end"><CreditCard className="h-3 w-3" />Payroll</p>
                        <p className="text-sm font-bold text-blue-600">${(emp.payrollAmount || 0).toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400 font-semibold">Total</p>
                      <p className="text-base font-bold text-gray-900">${emp.salary.toLocaleString()}</p>
                    </div>
                  </div>

                  <button onClick={() => setEditingEmployee(emp)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                {emp.notes && <p className="mt-2 ml-14 text-xs text-gray-400">{emp.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200 bg-gray-50">
                {["Employee", "Period", "Cash", "Payroll", "Total", "Status", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No records</td></tr>
                ) : records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="text-sm font-medium">{r.employee.name}</p><p className="text-xs text-gray-400">{r.employee.position}</p></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.period}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600">{r.cashAmount > 0 ? `$${r.cashAmount.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{r.payrollAmount > 0 ? `$${r.payrollAmount.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">${r.amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant={r.status === "PAID" ? "green" : r.status === "PARTIAL" ? "orange" : "yellow"}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.paidAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showAddEmployee} onClose={() => setShowAddEmployee(false)} title="Add Employee" size="lg">
        <EmployeeForm onSuccess={() => { setShowAddEmployee(false); fetchData(); }} />
      </Modal>

      <Modal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title="Edit Employee" size="lg">
        {editingEmployee && <EmployeeForm employee={editingEmployee} onSuccess={() => { setEditingEmployee(null); fetchData(); }} />}
      </Modal>

      <Modal isOpen={showPayroll} onClose={() => setShowPayroll(false)} title="Run Payroll" size="lg">
        <RunPayrollForm employees={active} onSuccess={() => { setShowPayroll(false); fetchData(); }} />
      </Modal>
    </div>
  );
}

function EmployeeForm({ employee, onSuccess }: { employee?: Employee; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: employee?.name || "",
    position: employee?.position || "",
    wageType: employee?.wageType || "SALARY",
    payType: employee?.payType || "PAYROLL",
    salary: employee?.salary?.toString() || "",
    hourlyRate: employee?.hourlyRate?.toString() || "",
    hoursPerWeek: employee?.hoursPerWeek?.toString() || "40",
    cashAmount: employee?.cashAmount?.toString() || "",
    payrollAmount: employee?.payrollAmount?.toString() || "",
    payFrequency: employee?.payFrequency || "MONTHLY",
    currency: employee?.currency || "USD",
    notes: employee?.notes || "",
    isActive: employee?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const isHourly = form.wageType === "HOURLY";
  const hourly = parseFloat(form.hourlyRate) || 0;
  const hpw = parseFloat(form.hoursPerWeek) || 0;
  const estimatedMonthly = isHourly ? hourly * hpw * 4.33 : 0; // 4.33 weeks/month

  // Auto-calculate total
  const cash = parseFloat(form.cashAmount) || 0;
  const payroll = parseFloat(form.payrollAmount) || 0;
  const baseSalary = isHourly ? estimatedMonthly : parseFloat(form.salary) || 0;
  const autoTotal = form.payType === "MIXED" ? cash + payroll : baseSalary;

  // When pay type changes, adjust amounts
  const handlePayTypeChange = (type: string) => {
    const sal = isHourly ? estimatedMonthly.toFixed(0) : form.salary;
    if (type === "CASH") {
      setForm({ ...form, payType: type, cashAmount: sal, payrollAmount: "0" });
    } else if (type === "PAYROLL") {
      setForm({ ...form, payType: type, cashAmount: "0", payrollAmount: sal });
    } else {
      setForm({ ...form, payType: type });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const salary = form.payType === "MIXED" ? cash + payroll : baseSalary;
    const body = {
      ...form, salary,
      hourlyRate: isHourly ? hourly : null,
      hoursPerWeek: isHourly ? hpw : null,
      cashAmount: form.payType === "PAYROLL" ? 0 : cash,
      payrollAmount: form.payType === "CASH" ? 0 : payroll || salary,
    };

    if (employee) {
      await fetch(`/api/payroll/employees/${employee.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/payroll/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    onSuccess();
  };

  const inp = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700">Name <span className="text-rose-400">*</span></label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} required /></div>
        <div><label className="block text-sm font-medium text-gray-700">Position</label><input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className={inp} placeholder="e.g. Sales Manager" /></div>
      </div>

      {/* Wage Type — Salary vs Hourly */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wage Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setForm({ ...form, wageType: "SALARY" })}
            className={cn("rounded-xl border-2 p-3 text-left transition-all", form.wageType === "SALARY" ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300")}>
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-blue-500" /><span className="text-sm font-semibold">Salary</span></div>
            <p className="text-[11px] text-gray-400">Fixed monthly/weekly pay</p>
          </button>
          <button type="button" onClick={() => setForm({ ...form, wageType: "HOURLY" })}
            className={cn("rounded-xl border-2 p-3 text-left transition-all", form.wageType === "HOURLY" ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300")}>
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-orange-500" /><span className="text-sm font-semibold">Hourly</span></div>
            <p className="text-[11px] text-gray-400">Paid per hour worked</p>
          </button>
        </div>
      </div>

      {/* Hourly fields */}
      {isHourly && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hourly Rate <span className="text-rose-400">*</span></label>
            <input type="number" step="0.01" value={form.hourlyRate} onChange={e => setForm({...form, hourlyRate: e.target.value})} className={inp} placeholder="e.g. 18.00" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hours / Week</label>
            <input type="number" step="0.5" value={form.hoursPerWeek} onChange={e => setForm({...form, hoursPerWeek: e.target.value})} className={inp} placeholder="40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Est. Monthly</label>
            <div className="mt-1 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
              ${estimatedMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}

      {/* Pay Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pay Method</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(["PAYROLL", "CASH", "MIXED"] as const).map(type => (
            <button key={type} type="button" onClick={() => handlePayTypeChange(type)}
              className={cn("rounded-xl border-2 p-3 text-left transition-all",
                form.payType === type ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
              )}>
              <div className="flex items-center gap-2 mb-1">
                {type === "PAYROLL" ? <CreditCard className="h-4 w-4 text-blue-500" /> : type === "CASH" ? <Banknote className="h-4 w-4 text-emerald-500" /> : <DollarSign className="h-4 w-4 text-purple-500" />}
                <span className="text-sm font-semibold">{payTypeLabels[type]}</span>
              </div>
              <p className="text-[11px] text-gray-400">
                {type === "PAYROLL" ? "Standard payroll check" : type === "CASH" ? "Paid in cash only" : "Split between cash & payroll"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Amount fields based on pay type */}
      <div className="grid grid-cols-2 gap-4">
        {form.payType === "MIXED" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1"><Banknote className="h-3.5 w-3.5 text-emerald-500" />Cash Amount</label>
              <input type="number" step="0.01" value={form.cashAmount} onChange={e => setForm({...form, cashAmount: e.target.value})} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-blue-500" />Payroll Amount</label>
              <input type="number" step="0.01" value={form.payrollAmount} onChange={e => setForm({...form, payrollAmount: e.target.value})} className={inp} placeholder="0.00" />
            </div>
            <div className="col-span-2 rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Monthly Salary</span>
              <span className="text-lg font-bold text-gray-900">${autoTotal.toLocaleString()}</span>
            </div>
          </>
        ) : !isHourly ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">Monthly Salary <span className="text-rose-400">*</span></label>
            <input type="number" step="0.01" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} className={inp} required />
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-gray-700">Pay Frequency</label>
          <select value={form.payFrequency} onChange={e => setForm({...form, payFrequency: e.target.value})} className={inp}>
            <option value="WEEKLY">Weekly</option>
            <option value="BI_WEEKLY">Bi-Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={inp} placeholder="Payment instructions, bank details, etc." />
      </div>

      {employee && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
          <label htmlFor="isActive" className="text-sm text-gray-600">Active employee</label>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving || !form.name} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {saving ? "Saving..." : employee ? "Save Changes" : "Add Employee"}
        </button>
      </div>
    </form>
  );
}

function RunPayrollForm({ employees, onSuccess }: { employees: Employee[]; onSuccess: () => void }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [running, setRunning] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { cash: string; payroll: string; hours: string }>>({});

  useEffect(() => {
    const init: Record<string, { cash: string; payroll: string; hours: string }> = {};
    employees.forEach(emp => {
      const defaultHours = emp.wageType === "HOURLY" ? ((emp.hoursPerWeek || 40) * 4.33).toFixed(0) : "";
      const defaultPay = emp.wageType === "HOURLY"
        ? ((emp.hourlyRate || 0) * (emp.hoursPerWeek || 40) * 4.33).toFixed(0)
        : (emp.payrollAmount || emp.salary || 0).toString();
      init[emp.id] = {
        cash: (emp.cashAmount || 0).toString(),
        payroll: emp.payType === "CASH" ? "0" : defaultPay,
        hours: defaultHours,
      };
    });
    setOverrides(init);
  }, [employees]);

  // Recalculate hourly employee pay when hours change
  const updateHours = (empId: string, hours: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const h = parseFloat(hours) || 0;
    const total = h * (emp.hourlyRate || 0);
    const o = overrides[empId];
    if (emp.payType === "MIXED") {
      // Keep ratio
      const ratio = emp.cashAmount && emp.salary ? emp.cashAmount / emp.salary : 0;
      setOverrides({ ...overrides, [empId]: { ...o, hours, cash: (total * ratio).toFixed(0), payroll: (total * (1 - ratio)).toFixed(0) } });
    } else if (emp.payType === "CASH") {
      setOverrides({ ...overrides, [empId]: { ...o, hours, cash: total.toFixed(0), payroll: "0" } });
    } else {
      setOverrides({ ...overrides, [empId]: { ...o, hours, cash: "0", payroll: total.toFixed(0) } });
    }
  };

  const getTotal = (empId: string) => {
    const o = overrides[empId];
    if (!o) return 0;
    return (parseFloat(o.cash) || 0) + (parseFloat(o.payroll) || 0);
  };

  const grandCash = Object.values(overrides).reduce((s, o) => s + (parseFloat(o.cash) || 0), 0);
  const grandPayroll = Object.values(overrides).reduce((s, o) => s + (parseFloat(o.payroll) || 0), 0);
  const grandTotal = grandCash + grandPayroll;

  const handleRun = async () => {
    setRunning(true);
    for (const emp of employees) {
      const o = overrides[emp.id] || { cash: "0", payroll: emp.salary.toString(), hours: "" };
      const cashAmt = parseFloat(o.cash) || 0;
      const payrollAmt = parseFloat(o.payroll) || 0;
      const hours = parseFloat(o.hours) || null;
      await fetch("/api/payroll/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          amount: cashAmt + payrollAmt,
          cashAmount: cashAmt,
          payrollAmount: payrollAmt,
          hours,
          hourlyRate: emp.hourlyRate,
          currency: emp.currency,
          period,
        }),
      });
    }
    setRunning(false);
    onSuccess();
  };

  const inp = "w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-right";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Period</label>
        <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
      </div>

      {/* Employee list with editable amounts */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Employee</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-orange-500 uppercase">Hours</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 uppercase">Cash</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-blue-600 uppercase">Payroll</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map(emp => {
              const o = overrides[emp.id] || { cash: "0", payroll: "0", hours: "" };
              const isH = emp.wageType === "HOURLY";
              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant={payTypeColors[emp.payType]}>{emp.payType}</Badge>
                      {isH && <Badge variant="orange">${emp.hourlyRate}/hr</Badge>}
                      <span className="text-[10px] text-gray-400">{emp.position}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 w-20">
                    {isH ? (
                      <input type="number" step="0.5" value={o.hours} onChange={e => updateHours(emp.id, e.target.value)} className={cn(inp, "text-orange-600")} placeholder="hrs" />
                    ) : (
                      <span className="text-xs text-gray-300 block text-right">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 w-24">
                    <input type="number" step="0.01" value={o.cash} onChange={e => setOverrides({...overrides, [emp.id]: {...o, cash: e.target.value}})} className={cn(inp, "text-emerald-600")} />
                  </td>
                  <td className="px-3 py-2 w-24">
                    <input type="number" step="0.01" value={o.payroll} onChange={e => setOverrides({...overrides, [emp.id]: {...o, payroll: e.target.value}})} className={cn(inp, "text-blue-600")} />
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-gray-900 w-24">${getTotal(emp.id).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="bg-gray-50 border-t border-gray-200">
            <td className="px-3 py-2 text-sm font-semibold text-gray-700" colSpan={2}>Total ({employees.length})</td>
            <td className="px-3 py-2 text-right text-sm font-bold text-emerald-600">${grandCash.toLocaleString()}</td>
            <td className="px-3 py-2 text-right text-sm font-bold text-blue-600">${grandPayroll.toLocaleString()}</td>
            <td className="px-3 py-2 text-right text-base font-bold text-gray-900">${grandTotal.toLocaleString()}</td>
          </tr></tfoot>
        </table>
      </div>

      <div className="flex justify-end">
        <button onClick={handleRun} disabled={running || employees.length === 0} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <DollarSign className="h-4 w-4 text-gray-400" />
          {running ? "Processing..." : `Pay ${employees.length} employees`}
        </button>
      </div>
    </div>
  );
}
