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
  metadata?: Record<string, any>;
  created_at: string;
}

export interface RankingRun {
  id: number;
  job_id: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
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
