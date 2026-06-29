"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, BrainCircuit, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed.");
      }

      showToast("Account created successfully! Please sign in.", "success");
      router.push("/login");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during registration.");
      showToast(err.message || "An error occurred during registration.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/[0.05] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center font-bold text-zinc-950 text-xl shadow-[0_0_24px_rgba(168,85,247,0.3)] mb-2">
            HM
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Create an account
          </h1>
          <p className="text-xs text-zinc-400">
            Join HireMind AI recruitment workspace
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 backdrop-blur-xl shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-white/5 bg-zinc-950/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-950 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-white/5 bg-zinc-950/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-950 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-white/5 bg-zinc-950/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-950 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-white/5 bg-zinc-950/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-950 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 border border-purple-500/30 shadow-[0_0_16px_rgba(168,85,247,0.2)] hover:shadow-[0_0_24px_rgba(168,85,247,0.3)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4" />
                  Register
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
