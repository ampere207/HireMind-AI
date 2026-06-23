"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  MapPin, 
  GraduationCap, 
  Sparkles, 
  Mail, 
  Phone, 
  Activity, 
  X,
  User,
  Clock
} from "lucide-react";
import { api, Candidate } from "@/lib/api";
import { useToast } from "@/components/Toast";

const COMMON_SKILLS = ["Python", "FastAPI", "TypeScript", "React", "Docker", "AWS", "SQL", "Kubernetes", "Go", "Rust"];

export default function CandidateExplorer() {
  const { toast } = useToast();
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [experienceBracket, setExperienceBracket] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalCandidates, setTotalCandidates] = useState(0);
  
  // Data state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Trigger search/filters
  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const skip = (currentPage - 1) * limit;
      const res = await api.searchCandidates({
        q: searchTerm || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        location: locationFilter || undefined,
        role: roleFilter || undefined,
        experience: experienceBracket || undefined,
        skip,
        limit
      });
      setCandidates(res.candidates);
      setTotalCandidates(res.total);
    } catch (err) {
      console.error("Error searching candidates", err);
      toast({
        title: "Search Failed",
        description: "Failed to query candidates database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [currentPage, experienceBracket, selectedSkills]); // reload on pages or fast dropdown toggles

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCandidates();
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedSkills([]);
    setLocationFilter("");
    setRoleFilter("");
    setExperienceBracket("");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCandidates / limit));

  return (
    <div className="space-y-6 relative min-h-screen pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          Candidate Explorer
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Search and query candidates using PostgreSQL full text search indexes and multi-attribute behavioral signals.
        </p>
      </div>

      {/* Search and filter panel */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Main search bar */}
          <div className="flex-1 relative">
            <Search className="w-4.5 h-4.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by candidate name, skills, title, location, summaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm text-zinc-100"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                showFilters || selectedSkills.length > 0 || locationFilter || roleFilter || experienceBracket
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                  : "border-white/5 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Filter className="w-4.5 h-4.5" />
              <span>Filters</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm shadow-md transition-colors"
            >
              Query Database
            </button>
          </div>
        </form>

        {/* Expandable Advanced Filters */}
        {(showFilters || selectedSkills.length > 0 || locationFilter || roleFilter || experienceBracket) && (
          <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Experience Bracket and Texts */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Experience Tier
                </label>
                <select
                  value={experienceBracket}
                  onChange={(e) => setExperienceBracket(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs text-zinc-300"
                >
                  <option value="">Any Experience</option>
                  <option value="0-2">Junior (0-2 years)</option>
                  <option value="3-5">Mid-level (3-5 years)</option>
                  <option value="6-10">Senior (6-10 years)</option>
                  <option value="10+">Principal (10+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Target Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, London"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-xs text-zinc-300"
                />
              </div>
            </div>

            {/* Role Filter & Clear buttons */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Current Role / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Backend Engineer"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-xs text-zinc-300"
                />
              </div>

              <div className="flex items-end h-full">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="w-full py-2.5 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-950/10 text-red-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Reset all Filters
                </button>
              </div>
            </div>

            {/* Quick Skills badges */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                Filter by Core Skills
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {COMMON_SKILLS.map(skill => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-300 shadow-sm shadow-cyan-500/10" 
                          : "bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main candidate list */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300 border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Experience</th>
                <th className="px-6 py-4">Key Skills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4.5"><div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" /></td>
                    <td className="px-6 py-4.5"><div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" /></td>
                    <td className="px-6 py-4.5"><div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" /></td>
                    <td className="px-6 py-4.5"><div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" /></td>
                    <td className="px-6 py-4.5"><div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-zinc-500 text-sm">
                    No candidates matched your search criteria. Try broadening your filters or importing more candidates.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr 
                    key={c.candidate_id} 
                    onClick={() => setSelectedCandidate(c)}
                    className="hover:bg-white/[0.01] transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4.5 font-semibold text-zinc-200 group-hover:text-purple-400 transition-colors">
                      {c.profile_json.name}
                    </td>
                    <td className="px-6 py-4.5 text-zinc-300">{c.profile_json.title}</td>
                    <td className="px-6 py-4.5 text-zinc-400 text-xs flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {c.profile_json.location}
                    </td>
                    <td className="px-6 py-4.5 text-xs text-zinc-400">
                      {c.signals_json.years_of_experience} yrs
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex flex-wrap gap-1">
                        {c.skills_json.slice(0, 3).map(skill => (
                          <span key={skill} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-[9px] text-zinc-400">
                            {skill}
                          </span>
                        ))}
                        {c.skills_json.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/20 border border-purple-500/10 text-[9px] text-purple-400">
                            +{c.skills_json.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalCandidates > 0 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCandidates)} of {totalCandidates} candidates
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-1.5 rounded border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900/60 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="font-semibold text-zinc-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || isLoading}
                className="p-1.5 rounded border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900/60 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide Candidate Detail Drawer */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/60 backdrop-blur-xs">
          {/* Overlay dismissal clickable area */}
          <div className="flex-1" onClick={() => setSelectedCandidate(null)} />
          
          {/* Drawer Panel */}
          <div className="w-full max-w-xl md:max-w-2xl h-full bg-zinc-950 border-l border-white/5 flex flex-col shadow-2xl relative animate-slide-in">
            {/* Header / Dismiss */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400">
                  {selectedCandidate.profile_json.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">{selectedCandidate.profile_json.name}</h2>
                  <p className="text-xs text-purple-400 font-medium">{selectedCandidate.profile_json.title}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="p-1.5 rounded-lg border border-white/10 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Location</span>
                  <span className="text-xs text-zinc-200 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedCandidate.profile_json.location}
                  </span>
                </div>
                
                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Experience</span>
                  <span className="text-xs text-zinc-200 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedCandidate.signals_json.years_of_experience} Years
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Email Address</span>
                  <span className="text-xs text-zinc-200 mt-1 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedCandidate.profile_json.email || "N/A"}
                  </span>
                </div>
                
                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Phone Number</span>
                  <span className="text-xs text-zinc-200 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedCandidate.profile_json.phone || "N/A"}
                  </span>
                </div>
              </div>

              {/* Bio summary */}
              {selectedCandidate.profile_json.summary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Candidate Bio</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-3 rounded-lg border border-white/5">
                    {selectedCandidate.profile_json.summary}
                  </p>
                </div>
              )}

              {/* Behavioral Signals */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  Recruiter Behavioral Signals
                </h4>
                
                <div className="p-4 rounded-xl border border-purple-500/10 bg-purple-950/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Loyalty score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Recruiter Loyalty Rating</span>
                      <span className="font-semibold text-cyan-400">
                        {Math.round(selectedCandidate.signals_json.loyalty_score * 100)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                        style={{ width: `${selectedCandidate.signals_json.loyalty_score * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Promotion speed */}
                  <div className="flex justify-between items-center text-xs bg-zinc-950/60 p-2.5 rounded-lg border border-white/5">
                    <span className="text-zinc-400">Promotion Speed</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                      selectedCandidate.signals_json.promotion_speed === "fast"
                        ? "bg-cyan-950 border border-cyan-500/20 text-cyan-400"
                        : selectedCandidate.signals_json.promotion_speed === "normal"
                        ? "bg-zinc-800 text-zinc-300"
                        : "bg-red-950/20 text-red-400 border border-red-500/10"
                    }`}>
                      {selectedCandidate.signals_json.promotion_speed}
                    </span>
                  </div>

                  {/* Avg job duration */}
                  <div className="flex justify-between items-center text-xs bg-zinc-950/60 p-2.5 rounded-lg border border-white/5">
                    <span className="text-zinc-400">Recent Role Tenure</span>
                    <span className="font-semibold text-zinc-200">
                      {selectedCandidate.signals_json.recent_role_duration} years
                    </span>
                  </div>
                  
                  {/* Years in CS */}
                  <div className="flex justify-between items-center text-xs bg-zinc-950/60 p-2.5 rounded-lg border border-white/5">
                    <span className="text-zinc-400">Field Seniority</span>
                    <span className="font-semibold text-zinc-200">
                      {selectedCandidate.signals_json.years_of_experience} yrs
                    </span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Indexed Skill Sets</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidate.skills_json.map(skill => (
                    <span 
                      key={skill} 
                      className="px-2.5 py-1 rounded bg-zinc-900 border border-white/5 text-xs text-zinc-200 font-medium hover:border-purple-500/30 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Career History */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Career History</h4>
                <div className="space-y-4">
                  {selectedCandidate.career_json.map((job, idx) => (
                    <div key={idx} className="relative pl-6 border-l border-zinc-800 space-y-1">
                      {/* Bullet node */}
                      <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-zinc-950 border-2 border-purple-500" />
                      
                      <div className="flex items-start justify-between">
                        <h5 className="text-sm font-semibold text-zinc-200">{job.role}</h5>
                        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded border border-white/5">
                          {job.start_date.split("-")[0]} - {job.end_date ? job.end_date.split("-")[0] : "Present"}
                        </span>
                      </div>
                      
                      <p className="text-xs text-purple-400 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        {job.company}
                      </p>
                      
                      {job.description && (
                        <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                          {job.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Education</h4>
                <div className="space-y-4">
                  {selectedCandidate.education_json.map((edu, idx) => (
                    <div key={idx} className="relative pl-6 border-l border-zinc-800 space-y-1">
                      <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-zinc-950 border-2 border-cyan-400" />
                      
                      <div className="flex items-start justify-between">
                        <h5 className="text-sm font-semibold text-zinc-200">{edu.degree}</h5>
                        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded border border-white/5">
                          Grad: {edu.grad_year}
                        </span>
                      </div>
                      
                      <p className="text-xs text-cyan-400 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {edu.institution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
