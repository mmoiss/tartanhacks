"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [installData, setInstallData] = useState<InstallationData | null>(null);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
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
        setPermissionsLoading(true);
        fetch(`${API_BASE}/me/permissions`, { headers })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) setInstallData(data);
          })
          .finally(() => setPermissionsLoading(false));
      })
      .catch(() => {
        localStorage.removeItem("session");
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("session");
    router.replace("/");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <svg
          className="animate-spin h-6 w-6 text-zinc-500"
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
    <div className="relative flex min-h-screen items-center justify-center font-sans overflow-hidden bg-black px-6">
      <main className="relative z-10 w-full">
        <div className="flex flex-col items-center gap-10 py-20 px-10 bg-black/40 backdrop-blur-md rounded-[32px] border border-white/10 shadow-xl w-full max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-4">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  width={56}
                  height={56}
                  className="rounded-full ring-2 ring-white/20"
                />
              )}
              <div className="text-left">
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Welcome, {user.username}
                </h1>
                <p className="text-zinc-400 font-medium">
                  Signed in via GitHub
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex h-12 items-center justify-center rounded-full border border-white/10 px-6 text-base font-semibold text-white transition-all hover:bg-white/5 active:scale-95"
            >
              Sign out
            </button>
          </div>

          {permissionsLoading ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-8 w-full">
              <svg
                className="animate-spin h-6 w-6 text-zinc-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-zinc-400 font-medium">
                Checking installation status…
              </p>
            </div>
          ) : installData && installData.repositories.length > 0 ? (
            <div className="flex flex-col gap-6 w-full text-left">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  Repositories
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {installData.repositories.map((repo) => {
                  const isExpanded = expandedRepo === repo.name;
                  return (
                    <div
                      key={repo.name}
                      className="rounded-xl border border-white/5 bg-white/5 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedRepo(isExpanded ? null : repo.name)
                        }
                        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-zinc-100">
                            {repo.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              repo.private
                                ? "bg-zinc-800 text-zinc-300"
                                : "bg-emerald-900/30 text-emerald-400"
                            }`}
                          >
                            {repo.private ? "private" : "public"}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/5 px-5 py-4 bg-white/5">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {Object.entries(repo.permissions).map(
                              ([scope, level]) => (
                                <div
                                  key={scope}
                                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                                >
                                  <span className="text-xs font-medium text-zinc-400">
                                    {scope.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-xs font-bold text-white uppercase">
                                    {level}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-8 w-full">
              <h2 className="text-xl font-semibold text-white">
                App Not Installed
              </h2>
              <p className="text-sm text-zinc-400 font-medium max-w-sm">
                Install the GitHub App on your account to grant repository
                permissions and start automating your workflow.
              </p>
              <a
                href="https://github.com/apps/tartan-hacks/installations/new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition-all hover:opacity-80 active:scale-95"
              >
                Install App on GitHub
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
