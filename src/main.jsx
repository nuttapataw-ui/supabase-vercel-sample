import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";
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
  LogOut,
  Mail,
  Plus,
  Presentation,
  Save,
  Trash2,
  Upload,
  User
} from "lucide-react";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
const cloudBucket = "engineering-files";
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
  lastUpdate: "Ready for file submissions",
  pptxExtracts: [],
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
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
  }, []);

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDraft, setProjectDraft] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [activeView, setActiveView] = useState("overview");
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [cloudStatus, setCloudStatus] = useState(supabase ? "Cloud ready" : "Local only");
  const cloudSaveTimer = useRef(null);
  const cloudLoadedRef = useRef(false);
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

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadCloudProfile(data.session.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        loadCloudProfile(nextSession.user);
      } else {
        cloudLoadedRef.current = false;
        setCloudStatus("Signed out");
      }
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

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
    queueCloudSave(nextProjects);
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
      lastUpdate: "Project created",
      pptxExtracts: [],
      tasks: [],
      files: []
    };

    persistProjects([project, ...projects]);
    setSelectedProjectId(project.id);
    setActiveView("overview");
  }

  function saveProjectDetails(event) {
    event.preventDefault();
    const savedProject = {
      ...selectedProject,
      ...projectDraft,
      progress: Number(projectDraft.progress) || 0
    };
    updateSelectedProject({
      ...savedProject,
      progress: calculateAutoProgress(savedProject)
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
    updateSelectedProject((project) => {
      const updatedProject = {
        ...project,
        tasks: project.tasks.map((task) =>
        task.id === taskId ? { ...task, isComplete: !task.isComplete } : task
      )
      };

      return {
        ...updatedProject,
        progress: calculateAutoProgress(updatedProject),
        lastUpdate: "Progress recalculated from deliverables"
      };
    });
  }

  function deleteTask(taskId) {
    updateSelectedProject((project) => ({
      ...project,
      tasks: project.tasks.filter((task) => task.id !== taskId)
    }));
  }

  function selectFiles(event) {
    setPendingFiles(Array.from(event.target.files || []));
  }

  async function submitFiles(event) {
    event.preventDefault();
    if (!pendingFiles.length) return;

    const uploadedFiles = [];

    for (const file of pendingFiles) {
      const id = crypto.randomUUID();
      const storagePath = await saveUploadedFile(id, file);
      uploadedFiles.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type || "Unknown",
        note: fileNote.trim(),
        storagePath,
        uploadedAt: new Date().toISOString()
      });
    }

    updateSelectedProject((project) => {
      const updatedProject = {
        ...project,
        files: [...uploadedFiles, ...project.files],
        lastUpdate: `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} submitted`
      };

      return {
        ...updatedProject,
        progress: calculateAutoProgress(updatedProject)
      };
    });
    setFileNote("");
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function downloadFile(file) {
    if (file.storagePath && supabase && session) {
      const { data, error } = await supabase.storage
        .from(cloudBucket)
        .createSignedUrl(file.storagePath, 60);

      if (!error && data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

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
    const file = selectedProject.files.find((item) => item.id === fileId);
    if (file?.storagePath && supabase && session) {
      await supabase.storage.from(cloudBucket).remove([file.storagePath]);
    }

    await deleteFileBlob(fileId);
    updateSelectedProject((project) => {
      const updatedProject = {
        ...project,
        files: project.files.filter((file) => file.id !== fileId),
        lastUpdate: "File removed"
      };

      return {
        ...updatedProject,
        progress: calculateAutoProgress(updatedProject)
      };
    });
  }

  async function extractPowerPoint(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const extraction = await extractPptxData(file);
      updateSelectedProject((project) => {
        const updatedProject = {
          ...project,
          pptxExtracts: [extraction, ...(project.pptxExtracts || [])],
          lastUpdate: `PowerPoint extracted: ${extraction.fileName}`
        };

        return {
          ...updatedProject,
          progress: calculateAutoProgress(updatedProject)
        };
      });
    } catch (error) {
      updateSelectedProject((project) => ({
        ...project,
        lastUpdate: `PowerPoint extraction failed: ${error.message || "unknown error"}`
      }));
    } finally {
      event.target.value = "";
    }
  }

  async function saveUploadedFile(id, file) {
    if (supabase && session) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${session.user.id}/${selectedProject.id}/${id}-${safeName}`;
      const { error } = await supabase.storage.from(cloudBucket).upload(storagePath, file, {
        upsert: true
      });

      if (!error) return storagePath;
      setCloudStatus("Storage upload failed; saved file locally");
    }

    await saveFileBlob(id, file);
    return "";
  }

  async function handlePasswordAuth(event) {
    event.preventDefault();
    if (!supabase || !email.trim() || !password) return;

    setCloudStatus(authMode === "sign-up" ? "Creating account" : "Signing in");
    const authRequest =
      authMode === "sign-up"
        ? supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: appUrl }
          })
        : supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });

    const { error } = await authRequest;
    setCloudStatus(error ? error.message : authMode === "sign-up" ? "Account created. Check email if confirmation is required." : "Signed in");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function loadCloudProfile(user) {
    if (!supabase || !user) return;

    setCloudStatus("Loading profile");
    const { data, error } = await supabase
      .from("user_profiles")
      .select("display_name, project_data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setCloudStatus("Run Supabase profile schema to enable sync");
      return;
    }

    const profileProjects = data?.project_data?.projects;
    const localProjects = readProjects();
    const fallbackProjects = localProjects.length ? localProjects : [starterProject];
    const nextProjects = Array.isArray(profileProjects) && profileProjects.length ? profileProjects : fallbackProjects;
    setDisplayName(data?.display_name || user.email || "");
    setProjects(nextProjects);
    localStorage.setItem(projectStorageKey, JSON.stringify(nextProjects));
    setSelectedProjectId(nextProjects[0].id);
    cloudLoadedRef.current = true;

    if (!data) {
      await saveCloudProfile(nextProjects, data?.display_name || user.email || "");
    }

    setCloudStatus("Profile synced");
  }

  function queueCloudSave(nextProjects) {
    if (!supabase || !session || !cloudLoadedRef.current) return;
    window.clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = window.setTimeout(() => {
      saveCloudProfile(nextProjects, displayName || session.user.email || "");
    }, 650);
  }

  async function saveCloudProfile(nextProjects = projects, nextDisplayName = displayName) {
    if (!supabase || !session) return;

    setCloudStatus("Saving profile");
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: session.user.id,
      display_name: nextDisplayName,
      project_data: { projects: nextProjects },
      updated_at: new Date().toISOString()
    });

    setCloudStatus(error ? "Profile save failed" : "Profile synced");
  }

  async function saveProfileName(event) {
    event.preventDefault();
    await saveCloudProfile(projects, displayName);
  }

  if (!selectedProject || !projectDraft) {
    return (
      <main className="app-shell">
        <section className="loading-panel">
          <HardHat aria-hidden="true" />
          <h1>ProjectTrack</h1>
          <p>Loading your profile workspace...</p>
          <button type="button" onClick={() => window.location.assign(window.location.origin)}>
            Reload App
          </button>
        </section>
      </main>
    );
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

          <ProfilePanel
            supabase={supabase}
            session={session}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            authMode={authMode}
            setAuthMode={setAuthMode}
            displayName={displayName}
            setDisplayName={setDisplayName}
            status={cloudStatus}
            onAuthSubmit={handlePasswordAuth}
            onSignOut={signOut}
            onSaveName={saveProfileName}
          />

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
            <SummaryCard
              icon={<Presentation />}
              label="Decks Extracted"
              value={(selectedProject.pptxExtracts || []).length}
            />
            <SummaryCard
              icon={<Upload />}
              label="Latest Update"
              value={selectedProject.lastUpdate || "No updates"}
              wide
            />
          </section>

          <nav className="view-tabs" aria-label="Project views">
            {["overview", "tasks", "files", "pptx"].map((view) => (
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
              pendingFiles={pendingFiles}
              inputRef={fileInputRef}
              onSelect={selectFiles}
              onSubmit={submitFiles}
              onDownload={downloadFile}
              onDelete={deleteFile}
            />
          ) : null}

          {activeView === "pptx" ? (
            <PowerPointExtractor
              extracts={selectedProject.pptxExtracts || []}
              onExtract={extractPowerPoint}
            />
          ) : null}
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value, wide = false }) {
  return (
    <article className={`summary-card ${wide ? "wide-summary" : ""}`}>
      <div className="summary-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function ProfilePanel({
  supabase,
  session,
  email,
  setEmail,
  password,
  setPassword,
  authMode,
  setAuthMode,
  displayName,
  setDisplayName,
  status,
  onAuthSubmit,
  onSignOut,
  onSaveName
}) {
  if (!supabase) {
    return (
      <section className="profile-panel">
        <div className="profile-heading">
          <User aria-hidden="true" />
          <div>
            <p>Profile</p>
            <strong>Local mode</strong>
          </div>
        </div>
        <span className="cloud-status">Add Supabase env vars for multi-device sync.</span>
      </section>
    );
  }

  if (!session) {
    return (
      <form className="profile-panel" onSubmit={onAuthSubmit}>
        <div className="profile-heading">
          <Mail aria-hidden="true" />
          <div>
            <p>Profile</p>
            <strong>{authMode === "sign-up" ? "Create profile" : "Sign in to sync"}</strong>
          </div>
        </div>
        <div className="auth-mode-toggle">
          <button
            className={authMode === "sign-in" ? "selected" : ""}
            type="button"
            onClick={() => setAuthMode("sign-in")}
          >
            Sign In
          </button>
          <button
            className={authMode === "sign-up" ? "selected" : ""}
            type="button"
            onClick={() => setAuthMode("sign-up")}
          >
            Sign Up
          </button>
        </div>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          minLength="6"
        />
        <button className="profile-button" type="submit">
          {authMode === "sign-up" ? "Create Account" : "Sign In"}
        </button>
        <span className="cloud-status">{status}</span>
      </form>
    );
  }

  return (
    <section className="profile-panel">
      <div className="profile-heading">
        <User aria-hidden="true" />
        <div>
          <p>Profile</p>
          <strong>{session.user.email}</strong>
        </div>
      </div>
      <form className="profile-name-form" onSubmit={onSaveName}>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Profile name"
        />
        <button className="profile-button" type="submit">
          Save
        </button>
      </form>
      <button className="profile-button secondary" type="button" onClick={onSignOut}>
        <LogOut aria-hidden="true" />
        Sign Out
      </button>
      <span className="cloud-status">{status}</span>
    </section>
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
      <p className="auto-progress-note wide">
        Progress auto-updates from completed deliverables plus submitted files. Saving project details also
        recalculates it.
      </p>
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

function FileTracker({ files, note, setNote, pendingFiles, inputRef, onSelect, onSubmit, onDownload, onDelete }) {
  return (
    <section>
      <form className="upload-zone" onSubmit={onSubmit}>
        <div>
          <Upload aria-hidden="true" />
          <h3>Upload engineering files</h3>
          <p>Select files, add a note, then submit to update the project tracker.</p>
        </div>
        <label>
          <span>File Note</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Drawing, RFI, report..." />
        </label>
        <label>
          <span>Files</span>
          <input ref={inputRef} type="file" multiple onChange={onSelect} />
        </label>
        <div className="pending-files">
          <span>{pendingFiles.length} selected</span>
          <button className="primary-button" type="submit" disabled={!pendingFiles.length}>
            <Upload aria-hidden="true" />
            Submit Files
          </button>
        </div>
      </form>

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

function PowerPointExtractor({ extracts, onExtract }) {
  return (
    <section>
      <div className="pptx-zone">
        <div>
          <Presentation aria-hidden="true" />
          <h3>Extract PowerPoint data</h3>
          <p>Upload a `.pptx` file to extract slide titles, slide text, and table-like rows into this project.</p>
        </div>
        <label>
          <span>PowerPoint File</span>
          <input type="file" accept=".pptx" onChange={onExtract} />
        </label>
      </div>

      <div className="extract-list">
        {extracts.length ? (
          extracts.map((extract) => (
            <article className="extract-item" key={extract.id}>
              <header>
                <div>
                  <p>{extract.fileName}</p>
                  <span>
                    {extract.slides.length} slides · {extract.tables.length} table-like rows ·{" "}
                    {formatDate(extract.createdAt)}
                  </span>
                </div>
              </header>
              <div className="slide-results">
                {extract.slides.map((slide) => (
                  <details key={slide.number}>
                    <summary>
                      Slide {slide.number}: {slide.title || "Untitled"}
                    </summary>
                    <ul>
                      {slide.text.length ? (
                        slide.text.map((line, index) => <li key={`${slide.number}-${index}`}>{line}</li>)
                      ) : (
                        <li>No readable text found.</li>
                      )}
                    </ul>
                  </details>
                ))}
              </div>
              {extract.tables.length ? (
                <div className="table-results">
                  <h4>Extracted table rows</h4>
                  {extract.tables.map((row) => (
                    <p key={`${row.slideNumber}-${row.rowIndex}`}>
                      <strong>Slide {row.slideNumber}</strong>
                      {row.cells.join(" | ")}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <EmptyState text="No PowerPoint files extracted yet." />
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

function calculateAutoProgress(project) {
  const tasks = project.tasks || [];
  const files = project.files || [];
  const decks = project.pptxExtracts || [];
  const taskScore = tasks.length
    ? Math.round((tasks.filter((task) => task.isComplete).length / tasks.length) * 70)
    : 0;
  const fileScore = Math.min(files.length * 5 + decks.length * 5, 30);

  return Math.min(100, taskScore + fileScore);
}

async function extractPptxData(file) {
  const zip = await JSZip.loadAsync(file);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => getSlideNumber(a) - getSlideNumber(b));

  if (!slidePaths.length) {
    throw new Error("No slides found");
  }

  const slides = [];
  const tables = [];

  for (const path of slidePaths) {
    const xmlText = await zip.files[path].async("text");
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const textLines = Array.from(xml.getElementsByTagName("a:t"))
      .map((node) => cleanText(node.textContent))
      .filter(Boolean);
    const uniqueLines = [...new Set(textLines)];
    const title = uniqueLines[0] || "";
    const tableRows = extractTableRows(xml, getSlideNumber(path));

    tables.push(...tableRows);
    slides.push({
      number: getSlideNumber(path),
      title,
      text: uniqueLines,
      tableRows
    });
  }

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    createdAt: new Date().toISOString(),
    slides,
    tables
  };
}

function extractTableRows(xml, slideNumber) {
  return Array.from(xml.getElementsByTagName("a:tr")).map((row, rowIndex) => {
    const cells = Array.from(row.getElementsByTagName("a:tc")).map((cell) =>
      Array.from(cell.getElementsByTagName("a:t"))
        .map((node) => cleanText(node.textContent))
        .filter(Boolean)
        .join(" ")
    );

    return {
      slideNumber,
      rowIndex: rowIndex + 1,
      cells: cells.filter(Boolean)
    };
  }).filter((row) => row.cells.length);
}

function getSlideNumber(path) {
  return Number(path.match(/slide(\d+)\.xml/)?.[1] || 0);
}

function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
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
