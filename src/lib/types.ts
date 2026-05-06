export interface Application {
  number: number;
  company: string;
  role: string;
  status: string;
  score: number;
  url: string;
  location: string;
  salary: string;
  date: string;
  notes: string;
  recruiterEmail?: string;
  recruiterName?: string;
  jobType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationMetrics {
  total_applications: number;
  by_status: Record<string, number>;
  avg_score: number;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
}

export interface ApplicationsResponse {
  applications: Application[];
  metrics: ApplicationMetrics;
}

export interface CreateApplicationInput {
  company: string;
  role: string;
  status?: string;
  score?: number;
  url?: string;
  location?: string;
  salary?: string;
  date?: string;
  notes?: string;
}

export interface UpdateStatusInput {
  new_status: string;
}

export interface EvaluateInput {
  jd_text: string;
  engine: string;
}

export interface EvaluateResult {
  score: number;
  summary: string;
  pros: string[];
  cons: string[];
  recommendation: string;
}

export interface DimensionScore {
  dimension: string;
  label: string;
  score: number;
  weight: number;
}

export interface EvaluationReport {
  id: string;
  appNumber: number | null;
  company: string;
  role: string;
  archetype: string;
  overallGrade: string;
  overallScore: number;
  block1: string;
  block2: string;
  block3: string;
  block4: string;
  block5: string;
  block6: string;
  dimensions: string;
  rawOutput: string | null;
  jdText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewStory {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  tags: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoringWeight {
  id: string;
  dimension: string;
  label: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface HealthIssue {
  type: string;
  message: string;
  severity: string;
}

export interface AIToolInput {
  mode: string;
  engine: string;
  input_text: string;
}

export interface SettingsData {
  env: string;
  cv: string;
  profile: string;
  portals: string;
  proofs: string;
}

export type StatusType = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected' | 'Waitlisted';

export const STATUS_COLORS: Record<StatusType, string> = {
  Applied: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  Screening: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Interview: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Offer: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  Waitlisted: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export const ALL_STATUSES: StatusType[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Waitlisted'];

export const AI_MODES = [
  { value: 'contacto', label: 'Contact Letter' },
  { value: 'deep', label: 'Deep Analysis' },
  { value: 'training', label: 'Training Plan' },
  { value: 'project', label: 'Project Ideas' },
];

export const AI_ENGINES = [
  { value: 'glm', label: 'GLM' },
  { value: 'gemini', label: 'Gemini' },
];

export const ARCHETYPES = [
  { value: 'llmops', label: 'LLMOps' },
  { value: 'agentic', label: 'Agentic AI' },
  { value: 'pm', label: 'Product Manager' },
  { value: 'sa', label: 'Solutions Architect' },
  { value: 'fde', label: 'Forward Deployed Engineer' },
  { value: 'transformation', label: 'Transformation' },
  { value: 'backend', label: 'Backend Engineer' },
  { value: 'frontend', label: 'Frontend Engineer' },
  { value: 'data', label: 'Data Engineer' },
  { value: 'general', label: 'General' },
];

export const DEFAULT_WEIGHTS: { dimension: string; label: string; weight: number }[] = [
  { dimension: 'culture_fit', label: 'Culture Fit', weight: 0.12 },
  { dimension: 'tech_match', label: 'Technical Match', weight: 0.15 },
  { dimension: 'growth', label: 'Growth Potential', weight: 0.10 },
  { dimension: 'compensation', label: 'Compensation', weight: 0.12 },
  { dimension: 'work_life', label: 'Work-Life Balance', weight: 0.08 },
  { dimension: 'team_quality', label: 'Team Quality', weight: 0.08 },
  { dimension: 'product_impact', label: 'Product Impact', weight: 0.10 },
  { dimension: 'learning', label: 'Learning Opportunity', weight: 0.08 },
  { dimension: 'stability', label: 'Company Stability', weight: 0.07 },
  { dimension: 'location_fit', label: 'Location Fit', weight: 0.10 },
];

export const GRADE_COLORS: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  B: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  C: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export interface SchedulerConfig {
  id: string;
  name: string;
  enabled: boolean;
  scanIntervalMin: number;
  followUpIntervalDays: number;
  autoEvaluate: boolean;
  autoApply: boolean;
  minScoreToApply: number;
  minGradeToApply: string;
  portals: string;
  searchQueries: string;
  locationFilter: string;
  lastRunAt: string;
  nextRunAt: string;
  // Email notification settings
  notifyEmail: string;
  notifyOnAutoApply: boolean;
  notifyOnNewMatch: boolean;
  notifyOnFollowUp: boolean;
  notifyOnCycleComplete: boolean;
  notifyOnErrors: boolean;
  notifyDigestMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  appNumber: number;
  type: string;
  content: string;
  sentAt: string;
  scheduledAt: string;
  status: string;
  company?: string;
  role?: string;
  appStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string;
  createdAt: string;
}

export interface AutoApplyLog {
  id: string;
  appNumber: number | null;
  url: string;
  status: string;
  result: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerCycleResult {
  scannedJobs: number;
  evaluatedJobs: number;
  autoAppliedJobs: number;
  followUpsScheduled: number;
  followUpsSent: number;
  newApplications: number;
  errors: string[];
  startTime: string;
  duration?: number;
  triggeredBy?: string;
}

export interface CycleHistoryEntry {
  id: string;
  scannedJobs: number;
  evaluatedJobs: number;
  autoAppliedJobs: number;
  followUpsScheduled: number;
  followUpsSent: number;
  newApplications: number;
  errors: string;
  triggeredBy: string;
  duration: number;
  createdAt: string;
}

export interface AutoApplyLogEntry {
  id: string;
  appNumber: number | null;
  url: string;
  status: string;
  result: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfig {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  useTLS: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CycleProgress {
  phase: 'idle' | 'scanning' | 'evaluating' | 'applying' | 'followups' | 'complete' | 'error';
  progress: number;
  message: string;
  startedAt: number;
  currentCycle: string | null;
  scannedJobs: number;
  evaluatedJobs: number;
  autoAppliedJobs: number;
  followUpsScheduled: number;
  errors: string[];
}

export interface ATSResult {
  overallScore: number;
  keywordMatch: {
    matched: string[];
    missing: string[];
    matchPercent: number;
  };
  sectionAnalysis: Record<string, {
    score: number;
    feedback: string;
  }>;
  suggestions: string[];
  strengths: string[];
  atsReady: boolean;
}
