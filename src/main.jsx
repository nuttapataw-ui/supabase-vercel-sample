import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Download,
  FileText,
  FolderKanban,
  Gauge,
  HardHat,
  Plus,
  Save,
  Trash2,
  Upload
} from "lucide-react";
import "./styles.css";

const projectStorageKey = "engtrack.projects";
const selectedProjectKey = "engtrack.selectedProject";
const fileDbName = "engtrack-files";
const fileStoreName = "files";

const starterProject = {
  id: "demo-project",
  name: "Warehouse Extension",
  client: "Internal Engineering",
  stage: "Design",
  status: "On Track",
  progress: 42,
  startDate: "2026-06-01",
  targetDate: "2026-08-30",
  notes: "Track drawings, site reports, RFIs, procurement notes, and handover files in one workspace.",
  tasks: [
    {
      id: crypto.randomUUID(),
      title: "Approve structural calculation package",
      owner: "Engineering",
      dueDate: "2026-06-14",
      isComplete: false
    },
    {
      id: crypto.randomUUID(),
      title: "Issue revised foundation drawing",
      owner: "Design",
      dueDate: "2026-06-18",
      isComplete: true
    }
  ],
  files: []
};

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDraft, setProjectDraft] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedProjects = readProjects();
    const initialProjects = savedProjects.length ? savedProjects : [starterProject];
    const savedSelectedId = localStorage.getItem(selectedProjectKey);
    const initialSelectedId = initialProjects.some((project) => project.id === savedSelectedId)
      ? savedSelectedId
      : initialProjects[0].id;

    setProjects(initialProjects);
    setSelectedProjectId(initialSelectedId);
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (selectedProject) {
      setProjectDraft({ ...selectedProject });
      localStorage.setItem(selectedProjectKey, selectedProject.id);
    }
  }, [selectedProject?.id]);

  function persistProjects(nextProjects) {
    setProjects(nextProjects);
    localStorage.setItem(projectStorageKey, JSON.stringify(nextProjects));
  }

  function updateSelectedProject(updater) {
    const nextProjects = projects.map((project) => {
      if (project.id !== selectedProject.id) return project;
      return typeof updater === "function" ? updater(project) : updater;
    });
    persistProjects(nextProjects);
  }

  function createProject() {
    const project = {
      id: crypto.randomUUID(),
      name: "New Engineering Project",
      client: "",
      stage: "Planning",
      status: "On Track",
      progress: 0,
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: "",
      notes: "",
      tasks: [],
      files: []
    };

    persistProjects([project, ...projects]);
    setSelectedProjectId(project.id);
    setActiveView("overview");
  }

  function saveProjectDetails(event) {
    event.preventDefault();
    updateSelectedProject({
      ...selectedProject,
      ...projectDraft,
      progress: Number(projectDraft.progress) || 0
    });
  }

  function addTask(event) {
    event.preventDefault();
    const cleanTitle = taskTitle.trim();
    if (!cleanTitle) return;

    const task = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      owner: taskOwner.trim() || "Unassigned",
      dueDate: taskDueDate || "",
      isComplete: false
    };

    updateSelectedProject((project) => ({ ...project, tasks: [task, ...project.tasks] }));
    setTaskTitle("");
    setTaskOwner("");
    setTaskDueDate("");
  }

  function toggleTask(taskId) {
    updateSelectedProject((project) => ({
      ...project,
      tasks: project.tasks.map((task) =>
        task.id === taskId ? { ...task, isComplete: !task.isComplete } : task
      )
    }));
  }

  function deleteTask(taskId) {
    updateSelectedProject((project) => ({
      ...project,
      tasks: project.tasks.filter((task) => task.id !== taskId)
    }));
  }

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const uploadedFiles = [];

    for (const file of files) {
      const id = crypto.randomUUID();
      await saveFileBlob(id, file);
      uploadedFiles.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type || "Unknown",
        note: fileNote.trim(),
        uploadedAt: new Date().toISOString()
      });
    }

    updateSelectedProject((project) => ({ ...project, files: [...uploadedFiles, ...project.files] }));
    setFileNote("");
    event.target.value = "";
  }

  async function downloadFile(file) {
    const blob = await getFileBlob(file.id);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteFile(fileId) {
    await deleteFileBlob(fileId);
    updateSelectedProject((project) => ({
      ...project,
      files: project.files.filter((file) => file.id !== fileId)
    }));
  }

  if (!selectedProject || !projectDraft) {
    return null;
  }

  const completedTasks = selectedProject.tasks.filter((task) => task.isComplete).length;
  const taskCompletion = selectedProject.tasks.length
    ? Math.round((completedTasks / selectedProject.tasks.length) * 100)
    : 0;

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="sidebar">
          <div className="brand">
            <HardHat aria-hidden="true" />
            <div>
              <p>Engineering</p>
              <h1>ProjectTrack</h1>
            </div>
          </div>

          <button className="new-project-button" type="button" onClick={createProject}>
            <Plus aria-hidden="true" />
            New Project
          </button>

          <div className="project-list">
            {projects.map((project) => (
              <button
                className={project.id === selectedProject.id ? "selected" : ""}
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <FolderKanban aria-hidden="true" />
                <span>{project.name}</span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>

        <section className="main-panel">
          <header className="topbar">
            <div>
              <p className="eyebrow">{selectedProject.client || "Project Workspace"}</p>
              <h2>{selectedProject.name}</h2>
            </div>
            <div className={`status-pill ${selectedProject.status.toLowerCase().replaceAll(" ", "-")}`}>
              {selectedProject.status}
            </div>
          </header>

          <section className="summary-grid" aria-label="Project summary">
            <SummaryCard icon={<Gauge />} label="Project Progress" value={`${selectedProject.progress}%`} />
            <SummaryCard icon={<Check />} label="Task Completion" value={`${taskCompletion}%`} />
            <SummaryCard icon={<FileText />} label="Files Uploaded" value={selectedProject.files.length} />
          </section>

          <nav className="view-tabs" aria-label="Project views">
            {["overview", "tasks", "files"].map((view) => (
              <button
                className={activeView === view ? "selected" : ""}
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
              >
                {view}
              </button>
            ))}
          </nav>

          {activeView === "overview" ? (
            <ProjectOverview
              draft={projectDraft}
              setDraft={setProjectDraft}
              onSave={saveProjectDetails}
              taskCompletion={taskCompletion}
            />
          ) : null}

          {activeView === "tasks" ? (
            <TaskTracker
              tasks={selectedProject.tasks}
              title={taskTitle}
              owner={taskOwner}
              dueDate={taskDueDate}
              setTitle={setTaskTitle}
              setOwner={setTaskOwner}
              setDueDate={setTaskDueDate}
              onAdd={addTask}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          ) : null}

          {activeView === "files" ? (
            <FileTracker
              files={selectedProject.files}
              note={fileNote}
              setNote={setFileNote}
              inputRef={fileInputRef}
              onUpload={uploadFiles}
              onDownload={downloadFile}
              onDelete={deleteFile}
            />
          ) : null}
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <article className="summary-card">
      <div className="summary-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function ProjectOverview({ draft, setDraft, onSave, taskCompletion }) {
  return (
    <form className="overview-grid" onSubmit={onSave}>
      <label className="wide">
        <span>Project Name</span>
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </label>
      <label>
        <span>Client / Owner</span>
        <input value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value })} />
      </label>
      <label>
        <span>Stage</span>
        <select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })}>
          <option>Planning</option>
          <option>Design</option>
          <option>Procurement</option>
          <option>Construction</option>
          <option>Commissioning</option>
          <option>Handover</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
          <option>On Track</option>
          <option>At Risk</option>
          <option>Delayed</option>
          <option>Completed</option>
        </select>
      </label>
      <label>
        <span>Start Date</span>
        <input
          type="date"
          value={draft.startDate}
          onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
        />
      </label>
      <label>
        <span>Target Date</span>
        <input
          type="date"
          value={draft.targetDate}
          onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })}
        />
      </label>
      <label className="wide">
        <span>Progress: {draft.progress}%</span>
        <input
          type="range"
          min="0"
          max="100"
          value={draft.progress}
          onChange={(event) => setDraft({ ...draft, progress: event.target.value })}
        />
      </label>
      <label className="wide">
        <span>Engineering Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          rows="5"
        />
      </label>

      <div className="progress-comparison wide">
        <span>Task completion</span>
        <div>
          <i style={{ width: `${taskCompletion}%` }} />
        </div>
        <strong>{taskCompletion}%</strong>
      </div>

      <button className="primary-button" type="submit">
        <Save aria-hidden="true" />
        Save Project
      </button>
    </form>
  );
}

function TaskTracker({ tasks, title, owner, dueDate, setTitle, setOwner, setDueDate, onAdd, onToggle, onDelete }) {
  return (
    <section>
      <form className="task-form" onSubmit={onAdd}>
        <label className="title-field">
          <span>Deliverable / Action</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Submit revised MEP layout"
            maxLength={140}
          />
        </label>
        <label>
          <span>Owner</span>
          <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Team / person" />
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

      <div className="task-list">
        {tasks.length ? (
          tasks.map((task) => (
            <article className={`task-item ${task.isComplete ? "complete" : ""}`} key={task.id}>
              <button className="check-button" type="button" onClick={() => onToggle(task.id)}>
                {task.isComplete ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
              </button>
              <div className="task-content">
                <p>{task.title}</p>
                <div className="task-meta">
                  <span>{task.owner}</span>
                  {task.dueDate ? (
                    <span>
                      <CalendarDays aria-hidden="true" />
                      {formatDate(task.dueDate)}
                    </span>
                  ) : null}
                </div>
              </div>
              <button className="delete-button" type="button" onClick={() => onDelete(task.id)}>
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))
        ) : (
          <EmptyState text="No deliverables yet." />
        )}
      </div>
    </section>
  );
}

function FileTracker({ files, note, setNote, inputRef, onUpload, onDownload, onDelete }) {
  return (
    <section>
      <div className="upload-zone">
        <div>
          <Upload aria-hidden="true" />
          <h3>Upload engineering files</h3>
          <p>Store drawings, reports, RFIs, inspection photos, schedules, and handover documents in this browser.</p>
        </div>
        <label>
          <span>File Note</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Drawing, RFI, report..." />
        </label>
        <input ref={inputRef} type="file" multiple onChange={onUpload} />
      </div>

      <div className="file-list">
        {files.length ? (
          files.map((file) => (
            <article className="file-item" key={file.id}>
              <FileText aria-hidden="true" />
              <div>
                <p>{file.name}</p>
                <span>
                  {formatFileSize(file.size)} · {file.note || "No note"} · {formatDate(file.uploadedAt)}
                </span>
              </div>
              <button type="button" onClick={() => onDownload(file)} aria-label="Download file" title="Download file">
                <Download aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onDelete(file.id)} aria-label="Delete file" title="Delete file">
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))
        ) : (
          <EmptyState text="No files uploaded yet." />
        )}
      </div>
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <FolderKanban aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

function readProjects() {
  try {
    return JSON.parse(localStorage.getItem(projectStorageKey) || "[]");
  } catch {
    return [];
  }
}

function openFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(fileDbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(fileStoreName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFileBlob(id, file) {
  const db = await openFileDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(fileStoreName, "readwrite");
    transaction.objectStore(fileStoreName).put(file, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getFileBlob(id) {
  const db = await openFileDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(fileStoreName, "readonly").objectStore(fileStoreName).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFileBlob(id) {
  const db = await openFileDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(fileStoreName, "readwrite");
    transaction.objectStore(fileStoreName).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

createRoot(document.getElementById("root")).render(<App />);
