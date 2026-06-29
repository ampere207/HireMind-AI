import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Profile {
  name: string;
  title: string;
  location: string;
  email?: string;
  phone?: string;
  summary?: string;
}

export interface CareerItem {
  company: string;
  role: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  grad_year: number;
}

export interface RecruiterSignals {
  loyalty_score: number;
  promotion_speed: "fast" | "normal" | "slow";
  years_of_experience: number;
  recent_role_duration: number;
}

export interface Candidate {
  candidate_id: string;
  profile_json: Profile;
  career_json: CareerItem[];
  skills_json: string[];
  education_json: EducationItem[];
  signals_json: RecruiterSignals;
  created_at: string;
}

export interface JobDescription {
  id: number;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface RankingRun {
  id: number;
  job_id: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PARSING_JD" | "RETRIEVING" | "ENGINEERING_FEATURES" | "RERANKING" | "EXPLAINING";
  results_json?: any[];
  error_message?: string;
  created_at: string;
}

export interface BackgroundTask {
  id: string;
  task_name: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILURE";
  started_at: string;
  completed_at?: string;
}

export interface DashboardStats {
  total_candidates: number;
  uploaded_jobs: number;
  rankings_generated: number;
  system_status: string;
}

export interface DatasetStats {
  candidate_count: number;
  skill_distribution: Record<string, number>;
  experience_distribution: Record<string, number>;
}

// Fetch helper with error handling
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };

  try {
    const session = await getSession();
    if (session && (session as any).accessToken) {
      headers["Authorization"] = `Bearer ${(session as any).accessToken}`;
    }
  } catch (err) {
    console.warn("Could not retrieve session token for API request:", err);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    if (!res.ok) {
      if (res.status === 204) {
        return {} as T;
      }
      const errText = await res.text();
      throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
    }
    if (res.status === 204) {
      return {} as T;
    }
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch from ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => apiFetch<{ status: string; service: string }>("/health"),

  // Dashboard & Dataset Stats
  getDashboardStats: () => apiFetch<DashboardStats>("/dashboard/stats"),
  getDatasetStats: () => apiFetch<DatasetStats>("/dataset/stats"),
  rebuildDatasetStats: () => apiFetch<{ message: string; task_id: string }>("/dataset/stats/rebuild", { method: "POST" }),

  // Candidates
  getCandidates: (skip = 0, limit = 20) =>
    apiFetch<Candidate[]>(`/candidates?skip=${skip}&limit=${limit}`),
    
  searchCandidates: (params: {
    q?: string;
    skills?: string[];
    location?: string;
    role?: string;
    experience?: string;
    skip?: number;
    limit?: number;
  }) => {
    const queryParts = [];
    if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
    if (params.location) queryParts.push(`location=${encodeURIComponent(params.location)}`);
    if (params.role) queryParts.push(`role=${encodeURIComponent(params.role)}`);
    if (params.experience) queryParts.push(`experience=${encodeURIComponent(params.experience)}`);
    if (params.skip !== undefined) queryParts.push(`skip=${params.skip}`);
    if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
    
    if (params.skills && params.skills.length > 0) {
      params.skills.forEach(skill => {
        queryParts.push(`skills=${encodeURIComponent(skill)}`);
      });
    }
    
    const queryStr = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return apiFetch<{
      total: number;
      skip: number;
      limit: number;
      candidates: Candidate[];
    }>(`/candidates/search${queryStr}`);
  },
  
  getCandidate: (id: string) => apiFetch<Candidate>(`/candidates/${id}`),
  
  importCandidates: (filePath?: string) =>
    apiFetch<{ message: string; task_id: string; status: string }>("/candidates/import", {
      method: "POST",
      body: JSON.stringify({ file_path: filePath }),
    }),

  // Jobs
  getJobs: (skip = 0, limit = 100) =>
    apiFetch<JobDescription[]>(`/jobs?skip=${skip}&limit=${limit}`),
    
  getJob: (id: number) => apiFetch<JobDescription>(`/jobs/${id}`),
  
  createJob: (title: string, description: string, metadata?: Record<string, unknown>) =>
    apiFetch<JobDescription>("/jobs", {
      method: "POST",
      body: JSON.stringify({ title, description, metadata }),
    }),
    
  deleteJob: (id: number) =>
    apiFetch<void>(`/jobs/${id}`, { method: "DELETE" }),
    
  runRanking: (jobId: number) =>
    apiFetch<RankingRun>(`/jobs/${jobId}/rankings`, { method: "POST" }),

  // Tasks
  getTasks: (skip = 0, limit = 50) =>
    apiFetch<BackgroundTask[]>(`/tasks?skip=${skip}&limit=${limit}`),
    
  getTaskStatus: (id: string) =>
    apiFetch<BackgroundTask>(`/tasks/${id}`),

  // Rankings Engine
  getRankings: (jobId?: number, skip = 0, limit = 50) => {
    const query = jobId ? `?job_id=${jobId}&skip=${skip}&limit=${limit}` : `?skip=${skip}&limit=${limit}`;
    return apiFetch<RankingRun[]>(`/rank${query}`);
  },
  getRanking: (runId: number) => apiFetch<RankingRun>(`/rank/${runId}`),
  createRanking: (title: string, description: string, weights?: Record<string, number>, sync = false) =>
    apiFetch<RankingRun>(`/rank?sync=${sync}`, {
      method: "POST",
      body: JSON.stringify({ title, description, weights }),
    }),
  getExportUrl: (runId: number) => `${API_BASE_URL}/rank/${runId}/export`,
};
