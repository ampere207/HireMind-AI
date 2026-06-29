"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Settings as SettingsIcon, 
  Menu, 
  X, 
  ChevronRight,
  LogOut
} from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState("Checking...");
  const [statusColor, setStatusColor] = useState("bg-yellow-400");

  // Protect route
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load system status periodically
  useEffect(() => {
    if (status !== "authenticated") return;
    async function checkStatus() {
      try {
        const res = await api.getDashboardStats();
        setSystemStatus(res.system_status);
        if (res.system_status === "Operational") {
          setStatusColor("bg-emerald-400");
        } else if (res.system_status.includes("Degraded")) {
          setStatusColor("bg-amber-400");
        } else {
          setStatusColor("bg-rose-500");
        }
      } catch (err) {
        setSystemStatus("Offline");
        setStatusColor("bg-rose-500");
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [status]);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/candidates", label: "Candidates", icon: Users },
    { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
    { href: "/dashboard/rankings", label: "Rankings", icon: TrendingUp },
    { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  ];

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 animate-spin flex items-center justify-center font-bold text-zinc-950 text-base shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            HM
          </div>
          <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest animate-pulse">Verifying Session...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex-1 flex min-h-screen relative bg-zinc-950">
      {/* Sidebar background decoration */}
      <div className="absolute top-0 left-0 w-80 h-screen bg-purple-500/[0.02] blur-[100px] pointer-events-none -z-10" />

      {/* Desktop Sidebar (Left Panel) */}
      <aside className="hidden md:flex md:w-64 xl:w-72 flex-col shrink-0 glass-sidebar sticky top-0 h-screen overflow-y-auto">
        {/* Brand header */}
        <div className="px-6 h-16 flex items-center gap-3 border-b border-white/5">
          <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center font-bold text-zinc-950 text-sm shadow-[0_0_12px_rgba(168,85,247,0.4)]">
            HM
          </div>
          <span className="font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
            HireMind AI
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-400"}`} />
                  <span>{link.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-400/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Profile & System status */}
        <div className="p-4 border-t border-white/5 bg-zinc-950/40 space-y-3">
          {session?.user && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0">
                  {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-200 truncate">{session.user.name || "Recruiter"}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{session.user.email}</div>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Log Out"
                className="p-1.5 rounded-md hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/5 text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              System Status
            </span>
            <span className="font-semibold text-zinc-300">{systemStatus}</span>
          </div>
        </div>
      </aside>

      {/* Main Panel Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center justify-between px-6 border-b border-white/5 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center font-bold text-zinc-950 text-xs shadow-md">
              HM
            </div>
            <span className="font-semibold text-zinc-200 text-sm tracking-wide">HireMind AI</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded bg-zinc-900 border border-white/10 text-zinc-400 hover:text-zinc-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="w-64 max-w-sm h-full bg-zinc-950 border-r border-white/5 flex flex-col py-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pb-6 flex items-center justify-between border-b border-white/5">
                <span className="font-bold text-zinc-200">Menu Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium border ${
                        isActive
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                          : "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-white/[0.02]"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-zinc-500"}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/5 space-y-3">
                {session?.user && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 border border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0">
                        {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{session.user.name || "Recruiter"}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{session.user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      title="Log Out"
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/5 text-xs text-zinc-400">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                    System Status
                  </span>
                  <span className="font-semibold text-zinc-300">{systemStatus}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Main Content area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
