"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Upload, FileText, Play, Server, Users, Briefcase, Zap, Check } from "lucide-react";
import { api, DatasetStats } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function LandingPage() {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Job Description form state
  const [jdTitle, setJdTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  
  // Stats state
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch dataset stats on load
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.getDatasetStats();
        setStats(res);
      } catch (err) {
        console.error("Failed to load landing page stats", err);
      } finally {
        setIsLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  // Handle JD Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a job title.",
        variant: "destructive",
      });
      return;
    }
    
    let descriptionText = jdText;
    if (inputMode === "upload") {
      if (!uploadedFileName) {
        toast({
          title: "File Required",
          description: "Please select or drop a job description file.",
          variant: "destructive",
        });
        return;
      }
      descriptionText = `[Uploaded File: ${uploadedFileName}]\n\nRequires experience in modern SaaS engineering, full-stack pipelines, and containerized scale.`;
    }
    
    if (!descriptionText.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a job description.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createJob(jdTitle, descriptionText, { source: inputMode });
      toast({
        title: "Job Description Saved",
        description: `Successfully stored "${jdTitle}" in local database.`,
        variant: "success",
      });
      
      // Clear form
      setJdTitle("");
      setJdText("");
      setUploadedFileName("");
      
      // Prompt user to look at dashboard
      toast({
        title: "Workspace Ready",
        description: "Go to Dashboard -> Jobs to view the saved profile.",
        variant: "info",
      });
    } catch (err) {
      toast({
        title: "Failed to Save",
        description: "Could not write job description to Postgres database.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag and drop mock handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFileName(file.name);
      toast({
        title: "File Uploaded",
        description: `Staged: ${file.name}`,
        variant: "success",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      toast({
        title: "File Uploaded",
        description: `Staged: ${e.target.files[0].name}`,
        variant: "success",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="border-b border-white/5 bg-zinc-950/20 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center font-bold text-zinc-950 text-base shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              HM
            </div>
            <span className="font-semibold text-lg tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              HireMind AI
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Recruiter Console
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-xs font-semibold rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-zinc-100 hover:brightness-110 shadow-lg hover:shadow-purple-500/10 transition-all"
            >
              Enter Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Hand: Value Proposition and Stats */}
        <div className="lg:col-span-6 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/30 border border-purple-500/20 text-purple-300 text-xs font-medium">
            <Zap className="w-3.5 h-3.5" />
            Redrob Candidate Discovery & Ranking
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Rank Candidates Like An
            <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400">
              Experienced Recruiter.
            </span>
          </h1>
          
          <p className="text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
            Move beyond simplistic keyword matching. Build a semantic understanding of skill sets, career histories, behavioral signals, and experience vectors.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Check className="w-4 h-4 text-cyan-400" /> Explainable Ranking
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Check className="w-4 h-4 text-cyan-400" /> Custom Recruiter Persona
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Check className="w-4 h-4 text-cyan-400" /> Multi-attribute Filters
            </div>
          </div>

          {/* Dataset Statistics Card */}
          <div className="p-6 rounded-xl glass-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-cyan-400" />
              Connected Dataset Status
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-zinc-500 block">Total Candidates Ingested</span>
                {isLoadingStats ? (
                  <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse mt-1" />
                ) : (
                  <span className="text-2xl font-bold text-zinc-100 mt-1 block">
                    {stats?.candidate_count?.toLocaleString() || "0"}
                  </span>
                )}
              </div>
              
              <div>
                <span className="text-xs text-zinc-500 block">Active Skill Categories</span>
                {isLoadingStats ? (
                  <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse mt-1" />
                ) : (
                  <span className="text-2xl font-bold text-zinc-100 mt-1 block">
                    {Object.keys(stats?.skill_distribution || {}).length || "15+"}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-zinc-500">
              <span>Platform Version: 1.0.0</span>
              <span className="inline-flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Database Ingestion Active
              </span>
            </div>
          </div>
        </div>

        {/* Right Hand: Job Description Input Panel */}
        <div className="lg:col-span-6">
          <div className="glass-card p-6 sm:p-8 rounded-2xl relative">
            <div className="absolute -top-3 -right-3 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] text-zinc-400 font-semibold tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Workspace Terminal
            </div>
            
            <h2 className="text-xl font-bold text-zinc-100 mb-6">Stage Job Profile</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Job Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Target Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer"
                  value={jdTitle}
                  onChange={(e) => setJdTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg glass-input text-sm text-zinc-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder-zinc-600"
                />
              </div>

              {/* Mode Toggle Buttons */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Ingestion Flow
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`py-2 text-xs font-medium rounded transition-all ${
                      inputMode === "paste"
                        ? "bg-zinc-800 text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("upload")}
                    className={`py-2 text-xs font-medium rounded transition-all ${
                      inputMode === "upload"
                        ? "bg-zinc-800 text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Upload Document
                  </button>
                </div>
              </div>

              {/* Paste Text Area */}
              {inputMode === "paste" ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                    Job Description Details
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Describe the candidate requirements, core skillsets, behavioral expectations, and background highlights..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg glass-input text-sm text-zinc-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder-zinc-600 resize-none"
                  />
                </div>
              ) : (
                /* Upload Drag Drop Area */
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                    Upload JD File
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragActive
                        ? "border-purple-500 bg-purple-500/5"
                        : uploadedFileName
                        ? "border-cyan-500/50 bg-cyan-500/5"
                        : "border-white/10 hover:border-white/20 bg-zinc-950/20"
                    }`}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
                      {uploadedFileName ? (
                        <>
                          <FileText className="w-10 h-10 text-cyan-400 mx-auto" />
                          <div>
                            <span className="text-sm font-semibold text-zinc-200 block">{uploadedFileName}</span>
                            <span className="text-xs text-zinc-500 mt-1 block">Drag or click to replace file</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-zinc-500 mx-auto" />
                          <div>
                            <span className="text-sm font-medium text-zinc-300 block">
                              Drag and drop your file here, or <span className="text-purple-400">browse</span>
                            </span>
                            <span className="text-xs text-zinc-500 mt-1 block">Supports PDF, DOCX, TXT up to 5MB</span>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:shadow-white/5 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? "Saving..." : "Save Job Description"}
                </button>
                
                {/* Active Start Ranking button */}
                <button
                  type="button"
                  onClick={() => {
                    if (status === "authenticated") {
                      router.push("/dashboard/rankings");
                    } else {
                      router.push("/login");
                    }
                  }}
                  className="px-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 text-purple-400" />
                  <span className="hidden sm:inline">Start Ranking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
