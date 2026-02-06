"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

interface User {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string | null;
}

interface Repository {
  name: string;
  private: boolean;
  url: string;
  permissions: Record<string, string>;
  events: string[];
}

interface InstallationData {
  repositories: Repository[];
  repository_selection: string;
  installation_url: string | null;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [installData, setInstallData] = useState<InstallationData | null>(null);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get("session");
    if (sessionFromUrl) {
      localStorage.setItem("session", sessionFromUrl);
      window.history.replaceState({}, "", "/");
    }

    const token = localStorage.getItem("session");
    if (!token) {
      setLoading(false);
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
        // Fetch permissions separately — don't fail login if this errors
        fetch(`${API_BASE}/me/permissions`, { headers })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => { if (data) setInstallData(data); });
      })
      .catch(() => {
        localStorage.removeItem("session");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/github`;
  };

  const handleLogout = () => {
    localStorage.removeItem("session");
    setUser(null);
    setInstallData(null);
    setExpandedRepo(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-10 py-32 px-16 bg-white dark:bg-black sm:items-start">
        {user ? (
          <>
            <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
              <div className="flex items-center gap-4">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                    Welcome, {user.username}
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Signed in via GitHub
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-6 text-base font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
              >
                Sign out
              </button>
            </div>

            {installData && installData.repositories.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                    Repositories
                    {installData.repository_selection === "all" && (
                      <span className="ml-2 text-sm font-normal text-zinc-500">
                        (all repositories)
                      </span>
                    )}
                  </h2>
                  {installData.repository_selection === "selected" &&
                    installData.installation_url && (
                      <a
                        href={installData.installation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 items-center gap-1.5 rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          width="14"
                          height="14"
                          fill="currentColor"
                        >
                          <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
                        </svg>
                        Add repository
                      </a>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                  {installData.repositories.map((repo) => {
                    const isExpanded = expandedRepo === repo.name;
                    return (
                      <div
                        key={repo.name}
                        className="rounded-lg border border-black/[.08] dark:border-white/[.145]"
                      >
                        <button
                          onClick={() =>
                            setExpandedRepo(isExpanded ? null : repo.name)
                          }
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <div className="flex items-center gap-3">
                            <svg
                              viewBox="0 0 16 16"
                              width="16"
                              height="16"
                              className="text-zinc-400"
                              fill="currentColor"
                            >
                              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                            </svg>
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              {repo.name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                repo.private
                                  ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}
                            >
                              {repo.private ? "private" : "public"}
                            </span>
                          </div>
                          <svg
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            fill="currentColor"
                            className={`text-zinc-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          >
                            <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-black/[.08] px-4 py-3 dark:border-white/[.145]">
                            <div className="mb-3 flex items-center justify-between">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Permissions
                              </h3>
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-300"
                              >
                                View on GitHub
                              </a>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                              {Object.entries(repo.permissions).map(
                                ([scope, level]) => (
                                  <div
                                    key={scope}
                                    className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
                                  >
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                      {scope.replace(/_/g, " ")}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        level === "write"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      }`}
                                    >
                                      {level}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>

                            {repo.events.length > 0 && (
                              <>
                                <h3 className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Subscribed Events
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                  {repo.events.map((event) => (
                                    <span
                                      key={event}
                                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                    >
                                      {event}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-6 dark:border-white/[.145]">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                  App Not Installed
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Install the GitHub App on your account to grant repository
                  permissions and see them here.
                </p>
                <a
                  href="https://github.com/apps/tartan-hacks/installations/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-fit items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                >
                  Install App on GitHub
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              Patchwork
            </h1>
            <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Sign in with GitHub to get started.
            </p>
            <button
              onClick={handleLogin}
              className="flex h-12 items-center gap-3 rounded-full bg-foreground px-6 text-background text-base font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              <svg
                viewBox="0 0 16 16"
                width="20"
                height="20"
                fill="currentColor"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Sign in with GitHub
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
