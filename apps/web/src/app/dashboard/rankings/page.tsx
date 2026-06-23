"use client";

import React from "react";
import { Lock, Sparkles, BrainCircuit, BarChart3, HelpCircle, ArrowUpRight } from "lucide-react";

export default function RankingsPage() {
  const mockLockedRankings = [
    { rank: 1, name: "Candidate 10243", title: "Senior Software Engineer", score: "96%", match: "Excellent", loyalty: "High" },
    { rank: 2, name: "Candidate 88402", title: "Staff Backend Architect", score: "91%", match: "Strong", loyalty: "Medium" },
    { rank: 3, name: "Candidate 41928", title: "Full Stack Engineer", score: "89%", match: "Strong", loyalty: "High" },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          AI Candidate Rankings
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Candidate ranking profiles matching staged job description semantics with recruiter persona weights.
        </p>
      </div>

      {/* Main Glass Lock Card */}
      <div className="relative rounded-2xl border border-purple-500/10 bg-purple-950/[0.03] overflow-hidden p-8 sm:p-12 text-center space-y-6">
        
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Lock Node */}
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)] animate-pulse-slow">
          <Lock className="w-7 h-7" />
        </div>

        <div className="max-w-md mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
            Coming in Phase 2
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100">Semantic AI In Progress</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The candidate ranking system is currently locked. In Phase 2, we will integrate PyTorch models and OpenAI/Sentence-Transformer embeddings to compute semantic similarity scores.
          </p>
        </div>

        {/* Locked list overlay demo */}
        <div className="max-w-2xl mx-auto rounded-xl border border-white/5 bg-zinc-950/40 divide-y divide-white/5 blur-xs select-none pointer-events-none">
          <div className="px-6 py-4 flex items-center justify-between text-xs text-zinc-500 font-bold bg-white/[0.01]">
            <span>Rank & Profile</span>
            <div className="flex gap-12">
              <span>Loyalty Match</span>
              <span>Semantic Score</span>
            </div>
          </div>
          {mockLockedRankings.map((mock) => (
            <div key={mock.rank} className="px-6 py-4 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="font-bold text-zinc-600">#{mock.rank}</span>
                <div className="text-left">
                  <div className="font-semibold text-zinc-300">{mock.name}</div>
                  <div className="text-[10px] text-zinc-500">{mock.title}</div>
                </div>
              </div>
              <div className="flex gap-16 items-center">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-[9px]">{mock.loyalty}</span>
                <span className="font-bold text-purple-400">{mock.score}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Highlights Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/5">
          <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 text-left space-y-2">
            <div className="p-2 rounded bg-zinc-950 border border-white/5 text-purple-400 w-fit">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Embedding Matching</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Match skills, roles, and profiles semantically rather than relying on exact keyword patterns.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 text-left space-y-2">
            <div className="p-2 rounded bg-zinc-950 border border-white/5 text-cyan-400 w-fit">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Recruiter Persona Weighting</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Tune loyalty importance, promotion speeds, tenure lengths, and skill coverages dynamically.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 text-left space-y-2">
            <div className="p-2 rounded bg-zinc-950 border border-white/5 text-indigo-400 w-fit">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Explainable AI Scores</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              See exact reasons why a candidate matches a job specification, with detailed feedback reports.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
