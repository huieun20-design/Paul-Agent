"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Check, Trash2, Loader2, Calendar, Mail, Pencil, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, statusColors } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  isCompleted: boolean;
  source: string;
  createdAt: string;
  sourceEmail: { id: string; subject: string; from: string } | null;
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "followup" | "completed">("active");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "completed") params.set("completed", "true");
    const res = await fetch(`/api/todos?${params}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setTodos(data);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const addTodo = async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: newPriority,
          dueDate: newDueDate || null,
        }),
      });
      setNewTitle("");
      setNewDueDate("");
      await fetchTodos();
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  };

  const toggleTodo = async (id: string, isCompleted: boolean) => {
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !isCompleted } : t));
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !isCompleted }),
    });
  };

  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await fetchTodos();
    setEditingTodo(null);
  };

  // Create follow-up from completed todo
  const createFollowUp = async (todo: Todo) => {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Follow-up: ${todo.title}`,
        description: `Follow-up from completed task on ${new Date().toLocaleDateString()}`,
        priority: todo.priority,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        source: "AI_FOLLOWUP",
      }),
    });
    await fetchTodos();
  };

  // Filtered todos
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredTodos = (() => {
    if (filter === "completed") return todos.filter(t => t.isCompleted);
    if (filter === "followup") return todos.filter(t =>
      !t.isCompleted && (
        t.source === "AI_FOLLOWUP" ||
        (t.dueDate && new Date(t.dueDate) <= today) ||
        (t.isCompleted === false && t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString())
      )
    );
    return todos.filter(t => !t.isCompleted);
  })();

  const stats = {
    active: todos.filter(t => !t.isCompleted).length,
    followup: todos.filter(t => !t.isCompleted && (t.source === "AI_FOLLOWUP" || (t.dueDate && new Date(t.dueDate) <= today))).length,
    high: todos.filter(t => t.priority === "HIGH" && !t.isCompleted).length,
  };

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todo</h1>
          <p className="mt-1 text-sm text-gray-400">
            {stats.active} active · {stats.high} high priority · {stats.followup} need follow-up
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-5 flex items-center gap-2 border-b border-gray-200">
        <button onClick={() => setFilter("active")} className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", filter === "active" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600")}>
          Active <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">{stats.active}</span>
        </button>
        <button onClick={() => setFilter("followup")} className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", filter === "followup" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600")}>
          Follow-up {stats.followup > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-1">{stats.followup}</span>}
        </button>
        <button onClick={() => setFilter("completed")} className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors", filter === "completed" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600")}>
          Completed
        </button>
      </div>

      {/* Quick Add */}
      <div className="mt-5 flex items-center gap-3 card p-4">
        <Plus className="h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a new task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo(); } }}
          className="flex-1 text-sm focus:outline-none bg-transparent"
          disabled={adding}
        />
        <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs" />
        <button onClick={addTodo} disabled={!newTitle.trim() || adding} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add</>}
        </button>
      </div>

      {/* Todo List */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Check className="h-12 w-12 mb-3" />
            <p className="text-sm">{filter === "followup" ? "No follow-ups needed" : filter === "completed" ? "No completed tasks" : "All caught up!"}</p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.isCompleted;
            const isFollowUp = todo.source === "AI_FOLLOWUP";
            const isDueToday = todo.dueDate && new Date(todo.dueDate).toDateString() === today.toDateString();

            return (
              <div
                key={todo.id}
                className={cn(
                  "flex items-start gap-3 card p-4 transition-all",
                  todo.isCompleted && "opacity-50",
                  isOverdue && "border-rose-200 bg-rose-50/30",
                  isFollowUp && !isOverdue && "border-amber-200 bg-amber-50/30",
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id, todo.isCompleted)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                    todo.isCompleted ? "border-green-500 bg-green-500 text-white" : "border-gray-300 hover:border-gray-900"
                  )}
                >
                  {todo.isCompleted && <Check className="h-3 w-3" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", todo.isCompleted && "line-through text-gray-400")}>
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="mt-1 text-xs text-gray-500">{todo.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge variant={statusColors[todo.priority]}>{todo.priority}</Badge>
                    {todo.dueDate && (
                      <span className={cn("flex items-center gap-1 text-xs",
                        isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-amber-600 font-medium" : "text-gray-500"
                      )}>
                        <Calendar className="h-3 w-3" />
                        {isOverdue ? "OVERDUE · " : isDueToday ? "TODAY · " : ""}
                        {new Date(todo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {isFollowUp && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 font-medium">
                        <RotateCcw className="h-3 w-3" /> Follow-up
                      </span>
                    )}
                    {todo.source === "AI_EMAIL" && (
                      <span className="flex items-center gap-1 text-xs text-purple-600">
                        <Mail className="h-3 w-3" /> From Email
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Mark as follow-up (active tasks) */}
                  {!todo.isCompleted && !isFollowUp && (
                    <button onClick={() => updateTodo(todo.id, { source: "AI_FOLLOWUP" } as Partial<Todo>)} className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-500" title="Mark as follow-up">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Create new follow-up from completed */}
                  {todo.isCompleted && (
                    <button onClick={() => createFollowUp(todo)} className="rounded p-1.5 text-amber-500 hover:bg-amber-50" title="Create follow-up task">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Edit */}
                  <button onClick={() => setEditingTodo(todo)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {/* Delete */}
                  <button onClick={() => deleteTodo(todo.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editingTodo} onClose={() => setEditingTodo(null)} title="Edit Task" size="md">
        {editingTodo && <EditTodoForm todo={editingTodo} onSave={updateTodo} onCancel={() => setEditingTodo(null)} />}
      </Modal>
    </div>
  );
}

function EditTodoForm({ todo, onSave, onCancel }: { todo: Todo; onSave: (id: string, updates: Partial<Todo>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || "");
  const [priority, setPriority] = useState(todo.priority);
  const [dueDate, setDueDate] = useState(todo.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(todo.id, {
      title,
      description: description || null,
      priority,
      dueDate: dueDate || null,
    });
    setSaving(false);
  };

  const inp = "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inp} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inp} placeholder="Add notes or details..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className={inp}>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button onClick={handleSave} disabled={saving || !title.trim()} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
