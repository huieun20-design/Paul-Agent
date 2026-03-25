"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Check, Undo2, Trash2, Loader2, Calendar, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, statusColors } from "@/components/ui/badge";

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
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (showCompleted) params.set("completed", "true");

    const res = await fetch(`/api/todos?${params}`);
    const data = await res.json();
    setTodos(data);
    setLoading(false);
  }, [showCompleted]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        priority: newPriority,
        dueDate: newDueDate || null,
      }),
    });
    setNewTitle("");
    setNewDueDate("");
    fetchTodos();
  };

  const toggleTodo = async (id: string, isCompleted: boolean) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !isCompleted }),
    });
    fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const stats = {
    total: todos.length,
    high: todos.filter((t) => t.priority === "HIGH" && !t.isCompleted).length,
    overdue: todos.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !t.isCompleted).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todo</h1>
          <p className="mt-1 text-sm text-gray-500">
            {stats.total} tasks · {stats.high} high priority · {stats.overdue} overdue
          </p>
        </div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            showCompleted ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {showCompleted ? "Show Active" : "Show Completed"}
        </button>
      </div>

      {/* Quick Add */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <Plus className="h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Add a new task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          className="flex-1 text-sm focus:outline-none"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
        >
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
        />
        <button
          onClick={addTodo}
          disabled={!newTitle.trim()}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Todo List */}
      <div className="mt-6 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Check className="h-12 w-12 mb-3" />
            <p className="text-sm">All caught up!</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors",
                todo.isCompleted && "opacity-60"
              )}
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.isCompleted)}
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                  todo.isCompleted
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 hover:border-blue-500"
                )}
              >
                {todo.isCompleted && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", todo.isCompleted && "line-through text-gray-400")}>
                  {todo.title}
                </p>
                {todo.description && (
                  <p className="mt-1 text-xs text-gray-500">{todo.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={statusColors[todo.priority]}>{todo.priority}</Badge>
                  {todo.dueDate && (
                    <span className={cn(
                      "flex items-center gap-1 text-xs",
                      new Date(todo.dueDate) < new Date() && !todo.isCompleted
                        ? "text-red-600 font-medium"
                        : "text-gray-500"
                    )}>
                      <Calendar className="h-3 w-3" />
                      {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {todo.source !== "MANUAL" && (
                    <span className="flex items-center gap-1 text-xs text-purple-600">
                      <Mail className="h-3 w-3" />
                      {todo.source}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
