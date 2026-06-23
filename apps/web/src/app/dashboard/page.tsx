"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Briefcase, TrendingUp, Cpu, Calendar, Plus, RefreshCw, ChevronRight } from "lucide-react";
import { api, DashboardStats, JobDescription } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function DashboardOverview() {
  const { toast } = useToast();
  
  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats>({
    total_candidates: 0,
    uploaded_jobs: 0,
    rankings_generated: 0,
    system_status: "Offline",
  });
  
  // Recent jobs
  const [recentJobs, setRecentJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load dashboard data
  const loadDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const [statsRes, jobsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getJobs(0, 5), // Fetch top 5 recent jobs
      ]);
      
      setStats(statsRes);
      setRecentJobs(jobsRes);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      toast({
        title: "Sync Error",
        description: "Failed to connect to HireMind API backend.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            Recruiter Workspace
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Overview of ingested candidate databases, candidate discoverability pipelines and job profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
          </button>
          
          <Link
            href="/dashboard/jobs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-zinc-100 hover:brightness-110 shadow-lg hover:shadow-purple-500/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Stage Job Profile
          </Link>
        </div>
      </div>

      {/* Grid of stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Candidates */}
        <div className="p-6 rounded-xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Candidates</span>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-9 w-24 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <span className="text-3xl font-extrabold text-zinc-100">
                {stats.total_candidates.toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-zinc-500 block mt-2">Active database entries</span>
          </div>
        </div>

        {/* Uploaded Jobs */}
        <div className="p-6 rounded-xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Uploaded Jobs</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-9 w-16 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <span className="text-3xl font-extrabold text-zinc-100">{stats.uploaded_jobs}</span>
            )}
            <span className="text-[10px] text-zinc-500 block mt-2">Job descriptions staged</span>
          </div>
        </div>

        {/* Rankings Generated */}
        <div className="p-6 rounded-xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rankings Generated</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-9 w-16 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <span className="text-3xl font-extrabold text-zinc-100">{stats.rankings_generated}</span>
            )}
            <span className="text-[10px] text-zinc-500 block mt-2">Active rating triggers</span>
          </div>
        </div>

        {/* System Status */}
        <div className="p-6 rounded-xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">System Status</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-9 w-28 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <span className="text-xl font-bold text-zinc-100 block py-1">
                {stats.system_status}
              </span>
            )}
            <span className="text-[10px] text-zinc-500 block mt-1.5">DB + Redis broker health</span>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table and Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Jobs Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-200">Recent Job Profiles</h3>
            <Link
              href="/dashboard/jobs"
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              Manage all Jobs
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Job Name</th>
                    <th className="px-6 py-4">Created At</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    // Skeleton rows
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4">
                          <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : recentJobs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 text-xs">
                        No job descriptions staged yet. Start by uploading one!
                      </td>
                    </tr>
                  ) : (
                    recentJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-200">{job.title}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(job.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 font-medium">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Info Card / Phase 2 Promo */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-xl glass-card bg-gradient-to-br from-zinc-900/60 to-purple-950/20 border-purple-500/10">
            <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Cpu className="w-4.5 h-4.5 text-purple-400 animate-pulse" />
              Phase 2 Preview: Ranking Engine
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mt-3">
              In Phase 2, we will enable AI-powered embeddings using PyTorch, loading candidate profiles and matching job description semantics. Candidates will be ranked based on skills coverage, behavioral loyalty, career progressions, and location constraints.
            </p>
            <div className="mt-5 p-3 rounded-lg bg-purple-950/40 border border-purple-500/20 text-[10px] text-purple-300 font-mono">
              ✓ Ingest Candidate Dataset (Phase 1)
              <br />
              ✓ PostgreSQL GIN Full-Text Index (Phase 1)
              <br />
              ⚙ Semantic Embeddings Matcher (Phase 2)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
