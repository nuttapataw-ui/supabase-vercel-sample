import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Circle,
  Cloud,
  Database,
  ListChecks,
  Plus,
  RefreshCw,
  Trash2
} from "lucide-react";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const localStorageKey = "taskflow.tasks";

function App() {
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
  }, []);

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState("active");
  const [status, setStatus] = useState({
    type: supabase ? "syncing" : "local",
    text: supabase ? "Connecting to Supabase" : "Local device storage"
  });

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    if (!supabase) {
      setTasks(readLocalTasks());
      return;
    }

    setStatus({ type: "syncing", text: "Syncing tasks" });

    const { data, error } = await supabase.from("tasks").select("*").order("created_at", {
      ascending: false
    });

    if (error) {
      setTasks(readLocalTasks());
      setStatus({
        type: "error",
        text: "Supabase needs the tasks table. Using local storage."
      });
      return;
    }

    setTasks(data || []);
    setStatus({ type: "online", text: "Supabase connected" });
  }

  async function addTask(event) {
    event.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const newTask = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      priority,
      due_date: dueDate || null,
      is_complete: false,
      created_at: new Date().toISOString()
    };

    setTitle("");
    setDueDate("");

    if (!supabase || status.type === "error") {
      updateLocalTasks([newTask, ...tasks]);
      return;
    }

    const { data, error } = await supabase.from("tasks").insert(newTask).select().single();

    if (error) {
      setStatus({ type: "error", text: "Could not save to Supabase. Saved locally." });
      updateLocalTasks([newTask, ...tasks]);
      return;
    }

    setTasks([data, ...tasks]);
  }

  async function toggleTask(task) {
    const updated = { ...task, is_complete: !task.is_complete };
    applyTaskUpdate(updated);

    if (supabase && status.type !== "error") {
      const { error } = await supabase
        .from("tasks")
        .update({ is_complete: updated.is_complete })
        .eq("id", task.id);

      if (error) setStatus({ type: "error", text: "Update failed in Supabase. Local changes remain." });
    }
  }

  async function deleteTask(task) {
    const nextTasks = tasks.filter((item) => item.id !== task.id);
    updateTasks(nextTasks);

    if (supabase && status.type !== "error") {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) setStatus({ type: "error", text: "Delete failed in Supabase. Local changes remain." });
    }
  }

  function applyTaskUpdate(updatedTask) {
    updateTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  }

  function updateLocalTasks(nextTasks) {
    localStorage.setItem(localStorageKey, JSON.stringify(nextTasks));
    setTasks(nextTasks);
    setStatus({ type: "local", text: "Local device storage" });
  }

  function updateTasks(nextTasks) {
    if (!supabase || status.type === "error" || status.type === "local") {
      localStorage.setItem(localStorageKey, JSON.stringify(nextTasks));
    }

    setTasks(nextTasks);
  }

  const visibleTasks = tasks.filter((task) => {
    if (filter === "active") return !task.is_complete;
    if (filter === "done") return task.is_complete;
    return true;
  });

  const completedCount = tasks.filter((task) => task.is_complete).length;
  const activeCount = tasks.length - completedCount;

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Task Tracker</p>
            <h1>TaskFlow</h1>
          </div>
          <SyncStatus status={status} onRefresh={loadTasks} />
        </header>

        <section className="summary-grid" aria-label="Task summary">
          <SummaryCard label="Active" value={activeCount} tone="green" />
          <SummaryCard label="Done" value={completedCount} tone="blue" />
          <SummaryCard label="Total" value={tasks.length} tone="orange" />
        </section>

        <form className="task-form" onSubmit={addTask}>
          <label className="title-field">
            <span>Task</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add a new task"
              maxLength={120}
            />
          </label>

          <label>
            <span>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label>
            <span>Due</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>

          <button className="primary-button" type="submit">
            <Plus aria-hidden="true" />
            Add
          </button>
        </form>

        <div className="filters" role="tablist" aria-label="Task filters">
          {["active", "all", "done"].map((item) => (
            <button
              className={filter === item ? "selected" : ""}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <section className="task-list" aria-label="Tasks">
          {visibleTasks.length === 0 ? (
            <div className="empty-state">
              <ListChecks aria-hidden="true" />
              <p>No tasks in this view.</p>
            </div>
          ) : (
            visibleTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
            ))
          )}
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <article className={`summary-card ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function SyncStatus({ status, onRefresh }) {
  const Icon = status.type === "online" ? Database : status.type === "error" ? AlertCircle : Cloud;

  return (
    <div className={`sync-status ${status.type}`}>
      <Icon aria-hidden="true" />
      <span>{status.text}</span>
      <button type="button" onClick={onRefresh} aria-label="Refresh tasks" title="Refresh tasks">
        <RefreshCw aria-hidden="true" />
      </button>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  return (
    <article className={`task-item ${task.is_complete ? "complete" : ""}`}>
      <button
        className="check-button"
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.is_complete ? "Mark task active" : "Mark task done"}
        title={task.is_complete ? "Mark active" : "Mark done"}
      >
        {task.is_complete ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
      </button>

      <div className="task-content">
        <p>{task.title}</p>
        <div className="task-meta">
          <span className={`priority ${task.priority}`}>{task.priority}</span>
          {task.due_date ? (
            <span>
              <CalendarDays aria-hidden="true" />
              {formatDate(task.due_date)}
            </span>
          ) : null}
        </div>
      </div>

      <button
        className="delete-button"
        type="button"
        onClick={() => onDelete(task)}
        aria-label="Delete task"
        title="Delete task"
      >
        <Trash2 aria-hidden="true" />
      </button>
    </article>
  );
}

function readLocalTasks() {
  try {
    return JSON.parse(localStorage.getItem(localStorageKey) || "[]");
  } catch {
    return [];
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

createRoot(document.getElementById("root")).render(<App />);
