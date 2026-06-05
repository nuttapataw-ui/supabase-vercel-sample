import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Cloud, Database, Github, Loader2, Rocket, ShieldAlert } from "lucide-react";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function App() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Add Supabase environment variables to test the connection.");

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
  }, []);

  useEffect(() => {
    async function checkConnection() {
      if (!supabase) {
        setStatus("missing");
        return;
      }

      setStatus("loading");

      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;

        setStatus("connected");
        setMessage("Supabase client initialized successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(error.message || "Could not connect to Supabase.");
      }
    }

    checkConnection();
  }, [supabase]);

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">GitHub + Vercel + Supabase</p>
          <h1>Deployable sample web app</h1>
          <p className="lede">
            Push this project to GitHub, import it in Vercel, add Supabase environment variables,
            and confirm the production deployment works.
          </p>
        </div>
        <StatusPanel status={status} message={message} />
      </section>

      <section className="steps" aria-label="Deployment steps">
        <Step icon={<Github />} title="1. Push to GitHub" text="Create a new repository and push this folder." />
        <Step icon={<Cloud />} title="2. Import in Vercel" text="Add a new Vercel project from your GitHub repo." />
        <Step icon={<Database />} title="3. Add Supabase env" text="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." />
        <Step icon={<Rocket />} title="4. Deploy" text="Vercel builds the app and gives you a public URL." />
      </section>
    </main>
  );
}

function StatusPanel({ status, message }) {
  const state = {
    idle: { label: "Waiting", className: "neutral", icon: <Loader2 /> },
    loading: { label: "Checking", className: "neutral spinning", icon: <Loader2 /> },
    missing: { label: "Env vars missing", className: "warning", icon: <ShieldAlert /> },
    connected: { label: "Connected", className: "success", icon: <CheckCircle2 /> },
    error: { label: "Connection error", className: "warning", icon: <ShieldAlert /> }
  }[status];

  return (
    <aside className="status-panel">
      <div className={`status-icon ${state.className}`}>{state.icon}</div>
      <div>
        <p className="status-label">{state.label}</p>
        <p className="status-message">{message}</p>
      </div>
    </aside>
  );
}

function Step({ icon, title, text }) {
  return (
    <article className="step">
      <div className="step-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
