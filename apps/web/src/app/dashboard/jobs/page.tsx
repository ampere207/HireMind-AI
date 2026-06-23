"use client";

import React, { useState, useEffect } from "react";
import { Upload, FileText, Trash2, Calendar, Play, FileSignature, Layers } from "lucide-react";
import { api, JobDescription } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function JobDescriptionsPage() {
  const { toast } = useToast();
  
  // Staged jobs list
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load jobs list
  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getJobs();
      setJobs(res);
      if (res.length > 0 && !selectedJob) {
        setSelectedJob(res[0]);
      }
    } catch (err) {
      console.error("Failed to load jobs list", err);
      toast({
        title: "Load Error",
        description: "Failed to fetch staged job descriptions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Save new job
  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title Required", description: "Please enter a job profile name.", variant: "destructive" });
      return;
    }

    let descriptionText = description;
    if (inputMode === "upload") {
      if (!uploadedFileName) {
        toast({ title: "File Staging Required", description: "Please drop or select a job specification file.", variant: "destructive" });
        return;
      }
      descriptionText = `[Uploaded Specification: ${uploadedFileName}]\n\nRequires experience in modern SaaS engineering, full-stack pipelines, and containerized scale.`;
    }

    if (!descriptionText.trim()) {
      toast({ title: "Description Required", description: "Please enter requirements details.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const newJob = await api.createJob(title, descriptionText, { source: inputMode });
      toast({
        title: "Job Profile Saved",
        description: `Staged: "${title}" in local database.`,
        variant: "success",
      });
      setTitle("");
      setDescription("");
      setUploadedFileName("");
      
      // Reload list and highlight new job
      const updatedJobs = await api.getJobs();
      setJobs(updatedJobs);
      setSelectedJob(newJob);
    } catch (err) {
      toast({
        title: "Submit Failed",
        description: "Could not create job description.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete job
  const handleDeleteJob = async (jobId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await api.deleteJob(jobId);
      toast({
        title: "Job Profile Deleted",
        description: "Successfully removed staged job description.",
        variant: "success",
      });
      
      const updatedJobs = jobs.filter(j => j.id !== jobId);
      setJobs(updatedJobs);
      
      if (selectedJob?.id === jobId) {
        setSelectedJob(updatedJobs.length > 0 ? updatedJobs[0] : null);
      }
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: "Could not delete job description.",
        variant: "destructive",
      });
    }
  };

  // Run Ranking
  const handleRunRanking = async (jobId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const run = await api.runRanking(jobId);
      toast({
        title: "Ranking Run Triggered",
        description: `Scheduled run ${run.id} in database (PENDING). AI scoring will trigger in Phase 2.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Trigger Failed",
        description: "Could not initialize ranking run.",
        variant: "destructive",
      });
    }
  };

  // Drag and drop mock handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFileName(e.dataTransfer.files[0].name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          Job Profiles
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Stage new job specifications or inspect existing records to launch ranking processes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Create Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-purple-400" />
              Stage New Profile
            </h3>
            
            <form onSubmit={handleSaveJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Job Profile Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead Devops Architect"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-zinc-200 focus:border-purple-500"
                />
              </div>

              {/* Mode Toggle */}
              <div>
                <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                      inputMode === "paste" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Paste Specification
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("upload")}
                    className={`py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                      inputMode === "upload" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Upload Document
                  </button>
                </div>
              </div>

              {/* Input details */}
              {inputMode === "paste" ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                    Core Specifications
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Enter requirements, expected experiences, coding targets..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg glass-input text-sm text-zinc-200 focus:border-purple-500 resize-none"
                  />
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border border-dashed border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500/30 transition-all bg-zinc-950/20"
                >
                  <input
                    type="file"
                    id="jobs-file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && setUploadedFileName(e.target.files[0].name)}
                  />
                  <label htmlFor="jobs-file" className="cursor-pointer block space-y-2">
                    <Upload className="w-8 h-8 text-zinc-500 mx-auto" />
                    <span className="text-xs text-zinc-300 block">
                      {uploadedFileName ? uploadedFileName : "Select or drag file here"}
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Staging..." : "Commit Job Profile"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List & Details */}
        <div className="lg:col-span-7 space-y-6">
          {isLoading ? (
            <div className="glass-card p-6 rounded-xl space-y-4">
              <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="glass-card p-12 rounded-xl text-center text-zinc-500 text-xs">
              No job profiles staged. Use the form on the left to add your first job specification.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* JDs List */}
              <div className="md:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedJob?.id === job.id
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                        : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                    }`}
                  >
                    <h4 className="text-xs font-semibold truncate">{job.title}</h4>
                    <span className="text-[9px] text-zinc-500 block mt-1">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Selected JD Details Panel */}
              <div className="md:col-span-7 glass-card p-5 rounded-xl space-y-4 h-full min-h-[300px] flex flex-col justify-between">
                {selectedJob ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="text-sm font-bold text-zinc-100">{selectedJob.title}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleRunRanking(selectedJob.id, e)}
                            className="p-1.5 rounded-lg border border-purple-500/20 bg-purple-950/20 text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer"
                            title="Mock Ranking Run"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteJob(selectedJob.id, e)}
                            className="p-1.5 rounded-lg border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-900/20 transition-colors cursor-pointer"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Staged: {new Date(selectedJob.created_at).toLocaleString()}
                      </div>

                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                          Description & Constraints
                        </span>
                        <p className="text-xs text-zinc-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap pr-1 bg-zinc-950/40 p-3 rounded border border-white/5">
                          {selectedJob.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-zinc-400" />
                        ID: {selectedJob.id}
                      </span>
                      <span>Target: Phase 2 AI scoring</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-zinc-500 text-xs py-20">
                    Select a job description to inspect details.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
