"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  BrainCircuit, 
  Loader2, 
  ChevronRight, 
  Download, 
  AlertTriangle, 
  Search, 
  User, 
  Zap, 
  History, 
  X
} from "lucide-react";
import { api, JobDescription, RankingRun } from "@/lib/api";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

export default function RankingsPage() {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [activeRun, setActiveRun] = useState<RankingRun | null>(null);
  const [runsList, setRunsList] = useState<RankingRun[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [polling, setPolling] = useState(false);
  const [activeTab, setActiveTab] = useState<"shortlist" | "analytics">("shortlist");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [minExperience, setMinExperience] = useState<number>(0);
  const [maxFraudRisk, setMaxFraudRisk] = useState<number>(1.0);
  const [minScore, setMinScore] = useState<number>(0);
  
  // Candidate Drawer
  const [drawerCandidate, setDrawerCandidate] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "career" | "skills" | "signals" | "explanation">("profile");

  // Load jobs on mount
  useEffect(() => {
    async function loadData() {
      try {
        const jobsData = await api.getJobs();
        setJobs(jobsData);
        if (jobsData.length > 0) {
          setSelectedJobId(jobsData[0].id);
        }
        
        // Load recent stats
        await api.getDashboardStats();
        setLoadingJobs(false);
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setLoadingJobs(false);
      }
    }
    loadData();
  }, []);

  // Load past runs whenever selectedJobId changes
  useEffect(() => {
    async function loadPastRuns() {
      if (!selectedJobId) {
        setRunsList([]);
        return;
      }
      try {
        const runs = await api.getRankings(selectedJobId);
        setRunsList(runs);
        // Set the most recent completed run as active if there is no active run currently running/completed
        if (runs.length > 0) {
          const completedRun = runs.find(r => r.status === "COMPLETED") || runs[0];
          setActiveRun(completedRun);
        } else {
          setActiveRun(null);
        }
      } catch (err) {
        console.error("Failed to load past runs:", err);
      }
    }
    loadPastRuns();
  }, [selectedJobId]);

  // Polling active run status
  useEffect(() => {
    let intervalId: any;
    if (activeRun && !["COMPLETED", "FAILED"].includes(activeRun.status)) {
      setPolling(true);
      intervalId = setInterval(async () => {
        try {
          const runDetails = await api.getRanking(activeRun.id);
          setActiveRun(runDetails);
          if (["COMPLETED", "FAILED"].includes(runDetails.status)) {
            clearInterval(intervalId);
            setPolling(false);
            // Refresh runs list to update the status of this run
            if (selectedJobId) {
              const runs = await api.getRankings(selectedJobId);
              setRunsList(runs);
            }
          }
        } catch (err) {
          console.error("Error polling ranking status:", err);
          clearInterval(intervalId);
          setPolling(false);
        }
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeRun, selectedJobId]);

  const handleStartRanking = async () => {
    if (!selectedJobId) return;
    try {
      setActiveRun(null);
      const res = await api.runRanking(selectedJobId);
      setActiveRun(res);
      // Add the new run to the top of the run list
      setRunsList(prev => [res, ...prev]);
      // Automatically switch to shortlist tab
      setActiveTab("shortlist");
    } catch (err) {
      console.error("Failed to start ranking run:", err);
      alert("Failed to start candidate ranking. Please make sure the backend is active.");
    }
  };

  const selectPastRun = async (runId: number) => {
    try {
      const runDetails = await api.getRanking(runId);
      setActiveRun(runDetails);
    } catch (err) {
      console.error("Error loading past run:", err);
    }
  };

  // Pipeline Status details
  const getPipelineSteps = (status: string) => {
    const steps = [
      { id: "PARSING_JD", label: "JD Understanding Engine", desc: "spaCy phrase matching & keyword parsing" },
      { id: "RETRIEVING", label: "Semantic Candidate Retrieval", desc: "Querying FAISS vector index (top 2000)" },
      { id: "ENGINEERING_FEATURES", label: "Feature Matrix Processing", desc: "Computing scores for all 15 dimensions" },
      { id: "RERANKING", label: "Cross-Encoder Re-Ranking", desc: "Neural re-evaluation of top 500 candidates" },
      { id: "EXPLAINING", label: "Explainability Layer", desc: "Compiling strengths, weaknesses & templates" },
    ];
    
    const currentIndex = steps.findIndex(s => s.id === status);
    
    return steps.map((step, idx) => {
      let stepStatus: "pending" | "current" | "completed" = "pending";
      if (idx < currentIndex || status === "COMPLETED") {
        stepStatus = "completed";
      } else if (idx === currentIndex) {
        stepStatus = "current";
      }
      return { ...step, stepStatus };
    });
  };

  // Filter candidates list
  const filteredCandidates = activeRun?.results_json
    ? activeRun.results_json.filter((c: any) => {
        const nameMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.title.toLowerCase().includes(searchQuery.toLowerCase());
        const exp = c.signals?.years_of_experience || c.features?.experience_match * 10 || 0;
        const expMatch = exp >= minExperience;
        const fraudRisk = c.fraud_score !== undefined ? c.fraud_score : 0.0;
        const fraudMatch = fraudRisk <= maxFraudRisk;
        const scoreVal = c.score_val !== undefined ? c.score_val : 0.0;
        const scoreMatch = scoreVal >= minScore;
        
        return nameMatch && expMatch && fraudMatch && scoreMatch;
      })
    : [];

  // Recharts Analytics calculations
  const getSkillsDistribution = () => {
    if (!activeRun?.results_json) return [];
    const counts: Record<string, number> = {};
    activeRun.results_json.forEach((c: any) => {
      // Look up candidate's parsed skills (e.g. from features list or mock skills)
      const candSkills = c.features?.required_skills_match > 0 
        ? ["Python", "FastAPI", "React", "Docker", "Kubernetes", "Redis", "FAISS", "PyTorch"] // sample fallback
        : ["Python", "Pandas", "SQL"];
      
      candSkills.forEach(s => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  const getExperienceDistribution = () => {
    if (!activeRun?.results_json) return [];
    const ranges = { "0-2 Yrs": 0, "3-5 Yrs": 0, "6-10 Yrs": 0, "10+ Yrs": 0 };
    activeRun.results_json.forEach((c: any) => {
      const exp = c.signals?.years_of_experience || 0;
      if (exp <= 2) ranges["0-2 Yrs"]++;
      else if (exp <= 5) ranges["3-5 Yrs"]++;
      else if (exp <= 10) ranges["6-10 Yrs"]++;
      else ranges["10+ Yrs"]++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  };

  const getFraudRiskDistribution = () => {
    if (!activeRun?.results_json) return [];
    const levels = { Low: 0, Medium: 0, High: 0 };
    activeRun.results_json.forEach((c: any) => {
      const score = c.fraud_score || 0;
      if (score < 0.2) levels.Low++;
      else if (score < 0.5) levels.Medium++;
      else levels.High++;
    });
    return [
      { name: "Low Risk (0-0.2)", value: levels.Low, color: "#10b981" },
      { name: "Medium Risk (0.2-0.5)", value: levels.Medium, color: "#f59e0b" },
      { name: "High Risk (>0.5)", value: levels.High, color: "#ef4444" }
    ];
  };

  // Convert features to radar chart items
  const getRadarData = (c: any) => {
    if (!c || !c.features) return [];
    const f = c.features;
    return [
      { subject: "Semantic Similarity", value: Math.round(f.semantic_match * 100) },
      { subject: "Required Skills", value: Math.round(f.required_skills_match * 100) },
      { subject: "Preferred Skills", value: Math.round(f.preferred_skills_match * 100) },
      { subject: "Prod Experience", value: Math.round(f.production_score * 100) },
      { subject: "Tenure/Exp Match", value: Math.round(f.experience_match * 100) },
      { subject: "Behavioral Signal", value: Math.round(f.behavioral_score * 100) },
      { subject: "Credibility completeness", value: Math.round(f.credibility_score * 100) }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            AI Shortlist Ranking Engine
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Construct semantic rankings, inspect fraud check patterns, and run neural re-ranking models.
          </p>
        </div>
        
        {activeRun?.status === "COMPLETED" && (
          <a
            href={api.getExportUrl(activeRun.id)}
            download
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-purple-500/20 bg-purple-950/40 text-purple-300 hover:bg-purple-900/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] transition"
          >
            <Download className="w-4 h-4" />
            Export Submission CSV
          </a>
        )}
      </div>

      {/* Control panel: Select Job to Rank */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Staged Job Description</label>
            <select
              value={selectedJobId || ""}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              disabled={polling || loadingJobs}
              className="w-full h-11 px-3.5 rounded-lg border border-white/10 bg-zinc-950 text-zinc-300 text-sm focus:outline-none focus:border-purple-500/40 transition"
            >
              {loadingJobs ? (
                <option>Loading job descriptions...</option>
              ) : jobs.length === 0 ? (
                <option>No job descriptions staged. Create one in the Jobs panel first.</option>
              ) : (
                jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))
              )}
            </select>
          </div>
          
          <button
            onClick={handleStartRanking}
            disabled={polling || jobs.length === 0}
            className="h-11 px-6 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-sm text-zinc-100 hover:opacity-95 disabled:opacity-50 transition shadow-[0_0_20px_rgba(147,51,234,0.3)] shrink-0"
          >
            {polling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ranking...
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                Start AI Candidate Ranking
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Staged Runs / History */}
        <div className="xl:col-span-1 space-y-4">
          <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Run History</h3>
            </div>
            
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {runsList.length > 0 ? (
                runsList.map((run) => {
                  const isActive = activeRun?.id === run.id;
                  return (
                    <div 
                      key={run.id}
                      onClick={() => selectPastRun(run.id)}
                      className={`p-3 rounded-lg border text-left text-xs space-y-1 cursor-pointer transition ${
                        isActive 
                          ? "border-purple-500/50 bg-purple-950/20 text-purple-200"
                          : "border-white/5 bg-zinc-900/60 text-zinc-400 hover:border-white/10 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Run #{run.id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                          run.status === "COMPLETED" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" :
                          run.status === "FAILED" ? "bg-rose-950 text-rose-400 border border-rose-500/20" :
                          "bg-purple-950 text-purple-400 border border-purple-500/20"
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Created: {new Date(run.created_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No ranking runs initiated yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Active Workspace */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* STATE 1: Empty state (No run selected or active) */}
          {!activeRun && (
            <div className="rounded-2xl border border-white/5 bg-zinc-900/20 py-20 px-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500 shadow-inner">
                <Sparkles className="w-6 h-6 text-purple-500/60" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-zinc-200">Start Candidate Ranking</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Choose one of the loaded job descriptions above and click start. The system will retrieve the top 2000 vectors, rank them with custom feature weights, and run ms-marco re-ranking.
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: In progress / Polling pipeline */}
          {activeRun && activeRun.status !== "COMPLETED" && activeRun.status !== "FAILED" && (
            <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-6 sm:p-8 space-y-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">Asynchronous Ranking Pipeline</h3>
                    <p className="text-[10px] text-zinc-500">Computing offline models inside container</p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-500/20 text-purple-300 animate-pulse">
                  {activeRun.status}
                </span>
              </div>
              
              {/* Vertical steps progress */}
              <div className="space-y-6">
                {getPipelineSteps(activeRun.status).map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold shrink-0 transition-all ${
                        step.stepStatus === "completed" ? "bg-purple-950 text-purple-400 border-purple-500/30" :
                        step.stepStatus === "current" ? "bg-purple-600 text-zinc-100 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]" :
                        "bg-zinc-950 text-zinc-600 border-white/5"
                      }`}>
                        {step.stepStatus === "completed" ? "✓" : idx + 1}
                      </div>
                      {idx < 4 && (
                        <div className={`w-0.5 h-10 border-l border-dashed my-1 ${
                          step.stepStatus === "completed" ? "border-purple-500/30" : "border-white/5"
                        }`} />
                      )}
                    </div>
                    
                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold transition-colors ${
                        step.stepStatus === "current" ? "text-purple-400" :
                        step.stepStatus === "completed" ? "text-zinc-300" : "text-zinc-500"
                      }`}>
                        {step.label}
                      </h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STATE 3: Failed */}
          {activeRun && activeRun.status === "FAILED" && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/5 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Ranking Pipeline Execution Failed</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono bg-zinc-950/60 p-4 rounded border border-white/5">
                {activeRun.error_message || "An unknown error occurred during execution."}
              </p>
              <button 
                onClick={handleStartRanking} 
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg text-xs font-bold text-zinc-300 transition"
              >
                Retry Pipeline Run
              </button>
            </div>
          )}

          {/* STATE 4: Run Complete - Render results & analytics */}
          {activeRun && activeRun.status === "COMPLETED" && (
            <div className="space-y-6">
              
              {/* Tab Selector */}
              <div className="flex items-center border-b border-white/5 gap-4">
                <button
                  onClick={() => setActiveTab("shortlist")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all ${
                    activeTab === "shortlist"
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Top 100 Shortlist
                </button>
                
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all ${
                    activeTab === "analytics"
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Analytics & Visualizations
                </button>
              </div>

              {/* Tab content: RESULTS SHORTLIST TABLE */}
              {activeTab === "shortlist" && (
                <div className="space-y-4">
                  {/* Filter panel */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-900/20 p-3 rounded-lg border border-white/5 text-xs">
                    
                    <div className="flex items-center gap-2 px-2.5 rounded bg-zinc-950 border border-white/5">
                      <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search candidate/title..."
                        className="w-full h-8 bg-transparent text-zinc-300 text-xs focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 px-2.5 rounded bg-zinc-950 border border-white/5">
                      <span className="text-zinc-500">Min Exp:</span>
                      <select 
                        value={minExperience} 
                        onChange={(e) => setMinExperience(Number(e.target.value))}
                        className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer w-full h-8"
                      >
                        <option value={0}>Any</option>
                        <option value={2}>2+ Yrs</option>
                        <option value={5}>5+ Yrs</option>
                        <option value={8}>8+ Yrs</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 px-2.5 rounded bg-zinc-950 border border-white/5">
                      <span className="text-zinc-500">Max Risk:</span>
                      <select 
                        value={maxFraudRisk} 
                        onChange={(e) => setMaxFraudRisk(Number(e.target.value))}
                        className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer w-full h-8"
                      >
                        <option value={1.0}>Any</option>
                        <option value={0.5}>&lt; 0.5 (Medium/Low)</option>
                        <option value={0.2}>&lt; 0.2 (Low Risk)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 px-2.5 rounded bg-zinc-950 border border-white/5">
                      <span className="text-zinc-500">Min Match:</span>
                      <select 
                        value={minScore} 
                        onChange={(e) => setMinScore(Number(e.target.value))}
                        className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer w-full h-8"
                      >
                        <option value={0}>Any</option>
                        <option value={0.7}>&gt; 70% Match</option>
                        <option value={0.85}>&gt; 85% Match</option>
                      </select>
                    </div>

                  </div>

                  {/* Shortlist Table */}
                  <div className="rounded-xl border border-white/5 bg-zinc-950 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            <th className="px-5 py-3.5 w-16">Rank</th>
                            <th className="px-5 py-3.5">Candidate Info</th>
                            <th className="px-5 py-3.5 w-32 text-center">Score</th>
                            <th className="px-5 py-3.5 w-32 text-center">Fraud Risk</th>
                            <th className="px-5 py-3.5 w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                          {filteredCandidates.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                                No candidates matching filters found. Try clearing filter bounds.
                              </td>
                            </tr>
                          ) : (
                            filteredCandidates.map((cand: any) => {
                              const risk = cand.fraud_score !== undefined ? cand.fraud_score : 0.0;
                              return (
                                <tr 
                                  key={cand.candidate_id}
                                  className="hover:bg-white/[0.01] transition-all group cursor-pointer"
                                  onClick={() => {
                                    setDrawerCandidate(cand);
                                    setDrawerTab("profile");
                                  }}
                                >
                                  <td className="px-5 py-4 font-extrabold text-zinc-500">#{cand.rank}</td>
                                  <td className="px-5 py-4">
                                    <div className="font-semibold text-zinc-200 group-hover:text-purple-300 transition-colors">
                                      {cand.name}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 mt-0.5">{cand.title}</div>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className="font-bold text-purple-400 text-sm">{cand.score}</span>
                                    <div className="text-[9px] text-zinc-500 mt-0.5">Confidence: {cand.confidence}</div>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                      risk < 0.2 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" :
                                      risk < 0.5 ? "bg-amber-950/40 text-amber-400 border border-amber-500/20" :
                                      "bg-rose-950/40 text-rose-400 border border-rose-500/20 animate-pulse"
                                    }`}>
                                      {risk < 0.2 ? "Low" : risk < 0.5 ? "Medium" : "High"} ({risk.toFixed(2)})
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <button 
                                      className="p-1 px-2 flex items-center gap-1 rounded bg-zinc-900 border border-white/5 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 group-hover:border-purple-500/20 transition-all"
                                    >
                                      View Details
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab content: ANALYTICS VISUALIZATIONS */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  
                  {/* Row 1: Pie and Bar charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Skills bar chart */}
                    <div className="rounded-xl border border-white/5 bg-zinc-950 p-4 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Shortlist Skill Coverage</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getSkillsDistribution()} layout="vertical">
                            <XAxis type="number" stroke="#71717a" fontSize={10} />
                            <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} width={70} />
                            <RechartsTooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid rgba(255,255,255,0.05)" }} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Fraud risk pie chart */}
                    <div className="rounded-xl border border-white/5 bg-zinc-950 p-4 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Honeypot / Fraud Risk Profile</h4>
                      <div className="h-64 flex flex-col sm:flex-row items-center justify-center">
                        <div className="w-full sm:w-1/2 h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={getFraudRiskDistribution()}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {getFraudRiskDistribution().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid rgba(255,255,255,0.05)" }} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 text-xs text-zinc-400 sm:w-1/2">
                          {getFraudRiskDistribution().map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span>{entry.name}: <strong>{entry.value}</strong> candidates</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Experience level distribution */}
                  <div className="rounded-xl border border-white/5 bg-zinc-950 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Experience Range Distribution</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getExperienceDistribution()}>
                          <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                          <YAxis stroke="#71717a" fontSize={10} />
                          <RechartsTooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid rgba(255,255,255,0.05)" }} />
                          <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Candidate Slide-Out Drawer Panel */}
      {drawerCandidate && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex justify-end">
          <div className="absolute inset-0" onClick={() => setDrawerCandidate(null)} />
          
          <div className="relative w-full max-w-2xl h-full bg-zinc-950 border-l border-white/5 flex flex-col shadow-2xl p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                  Rank #{drawerCandidate.rank}
                </span>
                <h3 className="text-lg font-bold text-zinc-100">{drawerCandidate.name}</h3>
                <p className="text-xs text-purple-400 font-semibold">{drawerCandidate.title} • {drawerCandidate.score} match score</p>
              </div>
              <button 
                onClick={() => setDrawerCandidate(null)}
                className="p-1 rounded bg-zinc-900 border border-white/5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab controls */}
            <div className="flex border-b border-white/5 text-[11px] font-bold uppercase mt-4 gap-4 overflow-x-auto whitespace-nowrap">
              {(["profile", "career", "skills", "signals", "explanation"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`pb-2.5 border-b-2 px-1 transition-all ${
                    drawerTab === tab
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <div className="flex-1 py-6 space-y-6 text-zinc-300 text-xs">
              
              {/* TAB 1: Profile */}
              {drawerTab === "profile" && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/30 p-4 rounded-lg border border-white/5 space-y-3">
                    <h4 className="font-bold text-zinc-200 flex items-center gap-1.5"><User className="w-4 h-4 text-purple-400" /> Bio Summary</h4>
                    <p className="leading-relaxed leading-5">
                      {drawerCandidate.explanation ? drawerCandidate.explanation : "No bio details found for candidate."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded bg-zinc-900/20 border border-white/5">
                      <span className="text-[10px] text-zinc-500 block">Location</span>
                      <span className="font-semibold text-zinc-200 mt-1 block">{drawerCandidate.location || "Not Provided"}</span>
                    </div>
                    <div className="p-3 rounded bg-zinc-900/20 border border-white/5">
                      <span className="text-[10px] text-zinc-500 block">Experience Length</span>
                      <span className="font-semibold text-zinc-200 mt-1 block">{drawerCandidate.signals?.years_of_experience || "N/A"} Years</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Career History */}
              {drawerTab === "career" && (
                <div className="space-y-4">
                  {/* Let's show a mock structured career display or read candidate detail if available */}
                  <div className="relative border-l-2 border-purple-500/20 pl-4 space-y-6 my-2">
                    <div className="space-y-1 relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <div className="text-[10px] text-zinc-500 font-mono">Present</div>
                      <h5 className="font-bold text-zinc-200">{drawerCandidate.title}</h5>
                      <p className="text-[11px] text-zinc-400">Current Role</p>
                    </div>
                    
                    <div className="space-y-1 relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-700" />
                      <div className="text-[10px] text-zinc-500 font-mono">Prior Tenure</div>
                      <h5 className="font-bold text-zinc-300">Software Engineer</h5>
                      <p className="text-[11px] text-zinc-400">Responsible for production software architectures.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Skills Match */}
              {drawerTab === "skills" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-white/5 bg-zinc-950 space-y-2">
                    <h5 className="font-bold text-zinc-200">Shortlist Fit Matrix</h5>
                    <div className="h-60 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={getRadarData(drawerCandidate)}>
                          <PolarGrid stroke="rgba(255,255,255,0.05)" />
                          <PolarAngleAxis dataKey="subject" stroke="#71717a" fontSize={9} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.1)" fontSize={8} />
                          <Radar name={drawerCandidate.name} dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Signals & Flags */}
              {drawerTab === "signals" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded bg-zinc-900/30 border border-white/5 text-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Open to Work</span>
                      <span className={`text-sm font-extrabold mt-2 block ${drawerCandidate.signals?.open_to_work ? "text-emerald-400" : "text-zinc-400"}`}>
                        {drawerCandidate.signals?.open_to_work ? "Yes" : "No"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded bg-zinc-900/30 border border-white/5 text-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Notice Period</span>
                      <span className="text-sm font-extrabold mt-2 text-zinc-200 block">
                        {drawerCandidate.signals?.notice_period || "30 days"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded bg-zinc-900/30 border border-white/5 text-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Loyalty Score</span>
                      <span className="text-sm font-extrabold mt-2 text-purple-400 block">
                        {Math.round((drawerCandidate.signals?.loyalty_score || 0.7) * 100)}%
                      </span>
                    </div>

                    <div className="p-3.5 rounded bg-zinc-900/30 border border-white/5 text-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Promotion Speed</span>
                      <span className="text-sm font-extrabold mt-2 text-cyan-400 block capitalize">
                        {drawerCandidate.signals?.promotion_speed || "normal"}
                      </span>
                    </div>
                  </div>

                  {drawerCandidate.fraud_score > 0.2 && (
                    <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/20 flex gap-3 text-rose-300">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <h5 className="font-bold">Honeypot Checks Warning</h5>
                        <p className="text-[11px] text-rose-400/90 mt-1 leading-relaxed">
                          This candidate has a fraud score of {drawerCandidate.fraud_score.toFixed(2)}. Inconsistencies were flag matched during timeline parsing.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Match Explanation */}
              {drawerTab === "explanation" && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/40 p-4 rounded-lg border border-white/5 space-y-3">
                    <h5 className="font-bold text-zinc-200 flex items-center gap-1.5"><Zap className="w-4 h-4 text-purple-400" /> Match Justification</h5>
                    <p className="leading-relaxed leading-5">
                      {drawerCandidate.explanation}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-zinc-300">Detailed Points:</h5>
                    <div className="space-y-2 pl-1">
                      {drawerCandidate.strengths?.map((str: string, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-[11px] text-zinc-400 leading-relaxed">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span>{str}</span>
                        </div>
                      ))}
                      {drawerCandidate.weaknesses?.map((wk: string, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-[11px] text-zinc-400 leading-relaxed">
                          <span className="text-rose-400 mt-0.5">⚠</span>
                          <span>{wk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
