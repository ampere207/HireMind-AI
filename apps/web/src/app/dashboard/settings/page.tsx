"use client";

import React, { useState, useEffect } from "react";
import { Server, Database, Activity, RefreshCw, Layers, CheckCircle2, Play } from "lucide-react";
import { api, DatasetStats, BackgroundTask } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const { toast } = useToast();
  
  // States
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);

  // Load configuration data
  const loadConfigData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.getDatasetStats(),
        api.getTasks(0, 10), // Get recent 10 tasks
      ]);
      setDatasetStats(statsRes);
      setTasks(tasksRes);
    } catch (err) {
      console.error("Failed to load settings data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigData();
    // Poll tasks status every 8 seconds
    const interval = setInterval(() => {
      loadConfigData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Trigger rebuild stats
  const handleRebuildStats = async () => {
    setIsRebuilding(true);
    try {
      const res = await api.rebuildDatasetStats();
      toast({
        title: "Stats Calculation Triggered",
        description: `Task ${res.task_id} staged in Celery backend.`,
        variant: "success",
      });
      loadConfigData(true);
    } catch (err) {
      toast({
        title: "Trigger Failed",
        description: "Could not trigger stats rebuild task.",
        variant: "destructive",
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  // Trigger candidate dataset import
  const handleImportMockCandidates = async () => {
    try {
      const res = await api.importCandidates();
      toast({
        title: "Ingestion Pipeline Started",
        description: `Import Task ID: ${res.task_id} running in Celery worker.`,
        variant: "success",
      });
      loadConfigData(true);
    } catch (err) {
      toast({
        title: "Ingestion Failed",
        description: "Could not start candidate database import.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          System Settings
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage dataset ingestion statistics, database configurations and inspect celery worker background logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Diagnostics and Dataset Status */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Connection status */}
          <div className="glass-card p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400 animate-pulse" />
              Service Connections
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-white/5 text-xs">
                <span className="flex items-center gap-2.5 text-zinc-400">
                  <Database className="w-4 h-4 text-purple-400" />
                  PostgreSQL Candidate Database
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 font-semibold tracking-wide">
                  Connected
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-white/5 text-xs">
                <span className="flex items-center gap-2.5 text-zinc-400">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Redis Cache / Celery Broker
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 font-semibold tracking-wide">
                  Operational
                </span>
              </div>
            </div>
          </div>

          {/* Dataset Status & Rebuild stats */}
          <div className="glass-card p-6 rounded-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Ingested Dataset Summary
              </h3>
              <button
                type="button"
                onClick={handleRebuildStats}
                disabled={isRebuilding}
                className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Rebuild stats cache"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin" : ""}`} />
              </button>
            </div>

            {isLoading ? (
              <div className="h-28 w-full bg-zinc-800 rounded animate-pulse" />
            ) : datasetStats && datasetStats.candidate_count > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-zinc-900/40 rounded border border-white/5 text-xs">
                    <span className="text-zinc-500 block">Total Ingested Records</span>
                    <span className="text-xl font-bold text-zinc-200 mt-1 block">
                      {datasetStats.candidate_count.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-900/40 rounded border border-white/5 text-xs">
                    <span className="text-zinc-500 block">Top Skills Counted</span>
                    <span className="text-xl font-bold text-zinc-200 mt-1 block">
                      {Object.keys(datasetStats.skill_distribution).length}
                    </span>
                  </div>
                </div>

                {/* Skill distribution chart / list */}
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Top Skills Frequency Distribution
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-zinc-400">
                    {Object.entries(datasetStats.skill_distribution).slice(0, 8).map(([skill, count]) => {
                      const percent = Math.min(100, Math.round((count / datasetStats.candidate_count) * 100));
                      return (
                        <div key={skill} className="p-2 bg-zinc-900/60 rounded border border-white/5 flex items-center justify-between gap-3">
                          <span className="truncate text-zinc-300 font-semibold">{skill}</span>
                          <span className="text-cyan-400 bg-cyan-950/20 px-1.5 py-0.5 rounded shrink-0">
                            {count.toLocaleString()} ({percent}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-white/5 rounded-lg text-xs space-y-3">
                <p className="text-zinc-500">PostgreSQL candidate tables are currently empty.</p>
                <button
                  type="button"
                  onClick={handleImportMockCandidates}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-zinc-100 rounded font-bold text-[11px] shadow flex items-center gap-1.5 mx-auto"
                >
                  <Play className="w-3.5 h-3.5" />
                  Import 100k Candidate Dataset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Background Task Log / Celery log */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-card p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Background Task Manager
            </h3>

            <div className="overflow-x-auto rounded-lg border border-white/5 bg-zinc-950/40">
              <table className="w-full text-left text-xs text-zinc-400 border-collapse">
                <thead>
                  <tr className="bg-white/[0.01] border-b border-white/5 text-zinc-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3">Task ID</th>
                    <th className="px-4 py-3">Job Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3.5"><div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" /></td>
                        <td className="px-4 py-3.5"><div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" /></td>
                        <td className="px-4 py-3.5"><div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" /></td>
                        <td className="px-4 py-3.5"><div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">
                        No background tasks recorded in database logs yet.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-white/[0.01]">
                        <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 truncate max-w-20" title={task.id}>
                          {task.id.split("-")[0]}...
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-300">
                          {task.task_name.replace("_task", "")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                            task.status === "SUCCESS"
                              ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                              : task.status === "RUNNING"
                              ? "bg-purple-950/40 border-purple-500/20 text-purple-400 animate-pulse"
                              : task.status === "FAILURE"
                              ? "bg-red-950/20 border-red-500/10 text-red-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400"
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-[10px]">
                          {new Date(task.started_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
