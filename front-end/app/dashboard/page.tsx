"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

interface User {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string | null;
  has_vercel_token?: boolean;
}

interface AppEntry {
  id: number;
  repo_owner: string;
  repo_name: string;
  full_name: string;
  status: string;
  private: boolean;
  live_url: string | null;
  instrumented: boolean;
  unresolved_count?: number;
  created_at: string | null;
}

interface GitHubRepo {
  full_name: string;
  name: string;
  private: boolean;
  url: string;
}

function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [deletingApp, setDeletingApp] = useState<number | null>(null);
  const [showRepoDialog, setShowRepoDialog] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [connectingRepo, setConnectingRepo] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [vercelTokenInput, setVercelTokenInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const connectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showConnectMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (connectMenuRef.current && !connectMenuRef.current.contains(e.target as Node)) {
        setShowConnectMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConnectMenu]);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem("session");
    if (!token) {
      router.replace("/");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_BASE}/me`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setAppsLoading(true);
        fetch(`${API_BASE}/apps`, { headers })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => setApps(data))
          .finally(() => setAppsLoading(false));
      })
      .catch(() => {
        localStorage.removeItem("session");
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router, mounted]);

  const handleLogout = () => {
    localStorage.removeItem("session");
    router.replace("/");
  };

  const handleDeleteApp = async (appId: number) => {
    const token = localStorage.getItem("session");
    if (!token) return;
    setDeletingApp(appId);
    try {
      const res = await fetch(`${API_BASE}/apps/${appId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setApps((prev) => prev.filter((a) => a.id !== appId));
      }
    } finally {
      setDeletingApp(null);
    }
  };

  const openRepoDialog = async () => {
    const token = localStorage.getItem("session");
    if (!token) return;
    setShowRepoDialog(true);
    setReposLoading(true);
    setRepoSearch("");
    try {
      const res = await fetch(`${API_BASE}/me/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableRepos(data);
      }
    } finally {
      setReposLoading(false);
    }
  };

  const saveVercelToken = async (tokenValue: string) => {
    const session = localStorage.getItem("session");
    if (!session) return;
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const res = await fetch(`${API_BASE}/me/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vercel_token: tokenValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => prev ? { ...prev, has_vercel_token: data.has_vercel_token } : prev);
        setSettingsMsg({ type: "ok", text: tokenValue ? "Saved Successfully" : "Token Removed" });
        setVercelTokenInput("");
        setShowSettingsModal(false);
      } else {
        setSettingsMsg({ type: "err", text: "Failed to Save" });
      }
    } catch {
      setSettingsMsg({ type: "err", text: "Network Error" });
    } finally {
      setSavingSettings(false);
    }
  };

  const connectRepo = async (fullName: string) => {
    const token = localStorage.getItem("session");
    if (!token) return;
    setConnectingRepo(fullName);
    try {
      const connectRes = await fetch(`${API_BASE}/apps/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (!connectRes.ok) return;
      const connectData = await connectRes.json();
      router.push(`/dashboard/${connectData.id}`);
    } finally {
      setConnectingRepo(null);
    }
  };

  const statusDot = (status: string) => {
    const s = status?.toLowerCase() ?? "pending";
    const color: Record<string, string> = {
      ready: "bg-emerald-500",
      active: "bg-emerald-500",
      deploying: "bg-yellow-500 animate-pulse",
      building: "bg-yellow-500 animate-pulse",
      error: "bg-red-500",
      pending: "bg-zinc-500",
    };
    const label: Record<string, string> = {
      ready: "Ready",
      active: "Active",
      deploying: "Building",
      building: "Building",
      error: "Error",
      pending: "Pending",
    };
    return (
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color[s] ?? color.pending}`} />
        <span className="text-xs text-zinc-400">{label[s] ?? s}</span>
      </span>
    );
  };

  if (!mounted || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <svg
          className="animate-spin h-5 w-5 text-zinc-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans">
      {/* Top navigation bar */}
      <nav className="border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Left: avatar + breadcrumb */}
            <div className="flex items-center gap-3">
              {user.avatar_url && (
                <div
                  className="relative group/pfp cursor-pointer"
                  onClick={() => { setShowSettingsModal(true); setSettingsMsg(null); }}
                >
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    width={28}
                    height={28}
                    className="rounded-full ring-1 ring-white/10"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70 opacity-0 group-hover/pfp:opacity-100 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              )}
              <span className="text-sm text-zinc-400">/</span>
              <span className="text-sm text-white">{user.username}</span>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <div className="relative" ref={connectMenuRef}>
                <button
                  onClick={() => setShowConnectMenu((v) => !v)}
                  className="flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-[13px] text-black transition-colors hover:bg-zinc-200 active:bg-zinc-300 font-accent"
                >
                  Connect Apps
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform ${showConnectMenu ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showConnectMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-white/[0.08] bg-[#111] shadow-2xl overflow-hidden z-50">
                    <a
                      href="https://github.com/apps/tartan-hacks/installations/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowConnectMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      GitHub
                    </a>
                    <div className="border-t border-white/[0.06]" />
                    <a
                      href="https://github.com/marketplace/coderabbitai"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowConnectMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.5 2a6.5 6.5 0 00-5.28 10.28L3 21l4.5-2.5L12 21l4.5-2.5L21 21l-1.22-8.72A6.5 6.5 0 0014.5 2h-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="9.5" cy="8.5" r="1" fill="currentColor" />
                        <circle cx="14.5" cy="8.5" r="1" fill="currentColor" />
                      </svg>
                      CodeRabbit
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md border border-white/[0.08] px-3.5 py-1.5 text-[13px] text-zinc-400 transition-colors hover:text-white hover:border-white/[0.15] font-accent"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-white tracking-tight">Projects</h2>
          <button
            onClick={openRepoDialog}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-3.5 py-1.5 text-[13px] text-zinc-400 transition-colors hover:text-white hover:border-white/[0.15] hover:bg-white/[0.02]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Add New
          </button>
        </div>

        {appsLoading ? (
          <div className="flex items-center gap-3 py-24 justify-center">
            <svg
              className="animate-spin h-4 w-4 text-zinc-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-zinc-500">Syncing with GitHub...</span>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/[0.08]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-600">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No projects yet</p>
            <button
              onClick={openRepoDialog}
              className="text-sm text-white hover:underline"
            >
              Import a repository to get started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <div
                key={app.id}
                onClick={() => router.push(`/dashboard/${app.id}`)}
                className="group relative rounded-lg border border-white/[0.06] bg-white/[0.01] p-5 cursor-pointer transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.02]"
              >
                {/* Delete button — top right, visible on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteApp(app.id);
                  }}
                  disabled={deletingApp === app.id}
                  className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5"
                  title="Remove project"
                >
                  {deletingApp === app.id ? (
                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Repo name + visibility */}
                <div className="flex items-center gap-2.5 mb-4 pr-6">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400">
                      <path d="M15 22v-4a4.8 4.8 0 00-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 004 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 18c-4.51 2-5-2-7-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{app.repo_name}</p>
                    <p className="text-xs text-zinc-500 truncate font-accent">{app.full_name}</p>
                  </div>
                </div>

                {/* Live URL */}
                <div className="mb-4">
                  {app.live_url ? (
                    <a
                      href={app.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors truncate max-w-full font-accent"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {app.live_url.replace("https://", "")}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-600 font-accent">No deployment</span>
                  )}
                </div>

                {/* Footer: status + incidents */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                  {statusDot(app.status)}
                  <div className="flex items-center gap-1.5">
                    {(app.unresolved_count ?? 0) > 0 ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span className="text-xs text-zinc-400">
                          {app.unresolved_count} incident{app.unresolved_count !== 1 ? "s" : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-600">No incidents</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add project card */}
            <button
              onClick={openRepoDialog}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.06] p-5 cursor-pointer transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.01] min-h-[180px]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-500">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-zinc-500">Import Project</span>
            </button>
          </div>
        )}
      </main>

      {/* Settings modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-lg border border-white/[0.08] bg-[#111] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs text-zinc-400 mb-2">
                  Vercel Auth Token
                </label>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  Provide your own Vercel token to deploy under your account.
                  {user.has_vercel_token && (
                    <span className="block mt-1.5 text-emerald-500 text-[11px] font-accent">Active token detected</span>
                  )}
                </p>
                <input
                  type="password"
                  placeholder="Enter token..."
                  value={vercelTokenInput}
                  onChange={(e) => setVercelTokenInput(e.target.value)}
                  className="w-full bg-black border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/[0.2] transition-colors"
                />
              </div>

              {settingsMsg && (
                <p className={`text-xs ${settingsMsg.type === "ok" ? "text-emerald-500" : "text-red-500"}`}>
                  {settingsMsg.text}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => saveVercelToken(vercelTokenInput)}
                  disabled={savingSettings || !vercelTokenInput.trim()}
                  className="rounded-md bg-white px-4 py-1.5 text-[13px] text-black transition-colors hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {savingSettings ? "Saving..." : "Save"}
                </button>
                {user.has_vercel_token && (
                  <button
                    onClick={() => saveVercelToken("")}
                    disabled={savingSettings}
                    className="rounded-md border border-white/[0.08] px-4 py-1.5 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repo selection dialog */}
      {showRepoDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowRepoDialog(false)}
        >
          <div
            className="w-full max-w-2xl mx-4 rounded-lg border border-white/[0.08] bg-[#111] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">Import Repository</h3>
              <button
                onClick={() => setShowRepoDialog(false)}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="relative">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full bg-black border border-white/[0.08] rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/[0.2] transition-colors"
                />
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {reposLoading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <svg
                    className="animate-spin h-4 w-4 text-zinc-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm text-zinc-500">Loading repositories...</span>
                </div>
              ) : availableRepos.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-500">No repositories found</p>
                </div>
              ) : (
                availableRepos
                  .filter((r) =>
                    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
                  )
                  .map((repo) => (
                    <div
                      key={repo.full_name}
                      className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-500 shrink-0">
                          <path d="M15 22v-4a4.8 4.8 0 00-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 004 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 18c-4.51 2-5-2-7-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-sm text-white truncate">
                          {repo.full_name}
                        </span>
                        {repo.private && (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-zinc-500 border border-white/[0.06]">
                            Private
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => connectRepo(repo.full_name)}
                        disabled={connectingRepo === repo.full_name}
                        className="shrink-0 rounded-md bg-white px-3 py-1 text-xs text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {connectingRepo === repo.full_name ? "Importing..." : "Import"}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(Dashboard), { ssr: false });
