import { create } from 'zustand';
import type { Application, ApplicationMetrics, SettingsData, EvaluationReport, InterviewStory, ScoringWeight, SchedulerConfig, FollowUp, Notification, CycleHistoryEntry, AutoApplyLogEntry, EmailConfig, CycleProgress } from './types';

interface BatchResultItem {
  company: string;
  role: string;
  grade: string;
  score: number;
}

interface HealthIssueItem {
  type: string;
  message: string;
  severity: string;
}

interface JobPreferences {
  roles: string;
  locations: string;
  portals: string;
}

interface GettingStartedItem {
  id: string;
  label: string;
  completed: boolean;
}

interface HireMeOSStore {
  // Applications
  applications: Application[];
  metrics: ApplicationMetrics | null;
  isLoadingApplications: boolean;
  setApplications: (apps: Application[]) => void;
  setMetrics: (metrics: ApplicationMetrics) => void;
  setIsLoadingApplications: (loading: boolean) => void;

  // Filters
  searchQuery: string;
  statusFilter: string;
  sortBy: string;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setSortBy: (sort: string) => void;

  // Active tab (legacy, kept for compatibility)
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Active page (new sidebar navigation)
  activePage: string;
  setActivePage: (page: string) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (open: boolean) => void;

  // Settings
  settings: SettingsData;
  setSettings: (settings: SettingsData) => void;

  // Evaluate result
  evaluateResult: EvaluationReport | null;
  isEvaluating: boolean;
  setEvaluateResult: (result: EvaluationReport | null) => void;
  setIsEvaluating: (evaluating: boolean) => void;

  // AI Tool result
  aiToolResult: string | null;
  isRunningAI: boolean;
  setAiToolResult: (result: string | null) => void;
  setIsRunningAI: (running: boolean) => void;

  // Scanner result
  scanResult: string | null;
  isScanning: boolean;
  setScanResult: (result: string | null) => void;
  setIsScanning: (scanning: boolean) => void;

  // Tools result
  toolsResult: string | null;
  isRunningTool: boolean;
  setToolsResult: (result: string | null) => void;
  setIsRunningTool: (running: boolean) => void;

  // Reports
  reports: EvaluationReport[];
  isLoadingReports: boolean;
  setReports: (reports: EvaluationReport[]) => void;
  setIsLoadingReports: (loading: boolean) => void;

  // Stories
  stories: InterviewStory[];
  isLoadingStories: boolean;
  setStories: (stories: InterviewStory[]) => void;
  setIsLoadingStories: (loading: boolean) => void;

  // Weights
  weights: ScoringWeight[];
  setWeights: (weights: ScoringWeight[]) => void;

  // Health
  healthIssues: HealthIssueItem[];
  setHealthIssues: (issues: HealthIssueItem[]) => void;

  // Batch
  batchResults: BatchResultItem[];
  batchProgress: { current: number; total: number };
  isRunningBatch: boolean;
  setBatchResults: (results: BatchResultItem[]) => void;
  setBatchProgress: (progress: { current: number; total: number }) => void;
  setIsRunningBatch: (running: boolean) => void;

  // CV Generator
  cvHtml: string | null;
  isGeneratingCV: boolean;
  setCvHtml: (html: string | null) => void;
  setIsGeneratingCV: (generating: boolean) => void;

  // Auto Pipeline
  isAutoPipelining: boolean;
  setIsAutoPipelining: (running: boolean) => void;

  // ---- AUTONOMOUS FEATURES ----
  // Scheduler
  schedulerConfig: SchedulerConfig | null;
  isLoadingScheduler: boolean;
  isRunningCycle: boolean;
  lastCycleResult: Record<string, unknown> | null;
  setSchedulerConfig: (config: SchedulerConfig | null) => void;
  setIsLoadingScheduler: (loading: boolean) => void;
  setIsRunningCycle: (running: boolean) => void;
  setLastCycleResult: (result: Record<string, unknown> | null) => void;

  // Follow-ups
  followUps: FollowUp[];
  isLoadingFollowUps: boolean;
  setFollowUps: (followUps: FollowUp[]) => void;
  setIsLoadingFollowUps: (loading: boolean) => void;

  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  isLoadingNotifications: boolean;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadNotificationCount: (count: number) => void;
  setIsLoadingNotifications: (loading: boolean) => void;

  // Auto-apply timer (client-side interval for periodic scanning)
  autoScanIntervalId: ReturnType<typeof setInterval> | null;
  setAutoScanIntervalId: (id: ReturnType<typeof setInterval> | null) => void;

  // Cycle history
  cycleHistory: CycleHistoryEntry[];
  setCycleHistory: (history: CycleHistoryEntry[]) => void;

  // Auto-apply logs
  autoApplyLogs: AutoApplyLogEntry[];
  setAutoApplyLogs: (logs: AutoApplyLogEntry[]) => void;

  // Autopilot progress
  autopilotPhase: string;
  setAutopilotPhase: (phase: string) => void;
  autopilotProgress: number;
  setAutopilotProgress: (progress: number) => void;

  // Real-time cycle progress from SSE
  cycleProgress: CycleProgress | null;
  setCycleProgress: (progress: CycleProgress | null) => void;
  isServerSchedulerRunning: boolean;
  setIsServerSchedulerRunning: (running: boolean) => void;

  // Email config
  emailConfig: EmailConfig | null;
  setEmailConfig: (config: EmailConfig | null) => void;

  // ---- NEW UI UPGRADE STATE ----
  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // User preferences
  userName: string;
  setUserName: (name: string) => void;
  jobPreferences: JobPreferences;
  setJobPreferences: (prefs: JobPreferences) => void;
  // Onboarding
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;

  // Getting Started Checklist
  gettingStartedItems: GettingStartedItem[];
  setGettingStartedItem: (id: string, completed: boolean) => void;
  toggleGettingStartedItem: (id: string) => void;

  // User
  user: { id: string; email: string } | null;
  setUser: (user: { id: string; email: string } | null) => void;
}

export const useHireMeOSStore = create<HireMeOSStore>((set) => ({
  // Applications
  applications: [],
  metrics: null,
  isLoadingApplications: false,
  setApplications: (apps) => set({ applications: apps }),
  setMetrics: (metrics) => set({ metrics }),
  setIsLoadingApplications: (loading) => set({ isLoadingApplications: loading }),

  // Filters
  searchQuery: '',
  statusFilter: 'all',
  sortBy: 'date',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setSortBy: (sort) => set({ sortBy: sort }),

  // Active tab (legacy)
  activeTab: 'pipeline',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Active page (new sidebar navigation)
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Sidebar
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  sidebarMobileOpen: false,
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

  // Settings
  settings: {
    env: '',
    cv: '',
    profile: '',
    portals: '',
    proofs: '',
  },
  setSettings: (settings) => set({ settings }),

  // Evaluate
  evaluateResult: null,
  isEvaluating: false,
  setEvaluateResult: (result) => set({ evaluateResult: result }),
  setIsEvaluating: (evaluating) => set({ isEvaluating: evaluating }),

  // AI Tool
  aiToolResult: null,
  isRunningAI: false,
  setAiToolResult: (result) => set({ aiToolResult: result }),
  setIsRunningAI: (running) => set({ isRunningAI: running }),

  // Scanner
  scanResult: null,
  isScanning: false,
  setScanResult: (result) => set({ scanResult: result }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),

  // Tools
  toolsResult: null,
  isRunningTool: false,
  setToolsResult: (result) => set({ toolsResult: result }),
  setIsRunningTool: (running) => set({ isRunningTool: running }),

  // Reports
  reports: [],
  isLoadingReports: false,
  setReports: (reports) => set({ reports }),
  setIsLoadingReports: (loading) => set({ isLoadingReports: loading }),

  // Stories
  stories: [],
  isLoadingStories: false,
  setStories: (stories) => set({ stories }),
  setIsLoadingStories: (loading) => set({ isLoadingReports: loading }),

  // Weights
  weights: [],
  setWeights: (weights) => set({ weights }),

  // Health
  healthIssues: [],
  setHealthIssues: (issues) => set({ healthIssues: issues }),

  // Batch
  batchResults: [],
  batchProgress: { current: 0, total: 0 },
  isRunningBatch: false,
  setBatchResults: (results) => set({ batchResults: results }),
  setBatchProgress: (progress) => set({ batchProgress: progress }),
  setIsRunningBatch: (running) => set({ isRunningBatch: running }),

  // CV Generator
  cvHtml: null,
  isGeneratingCV: false,
  setCvHtml: (html) => set({ cvHtml: html }),
  setIsGeneratingCV: (generating) => set({ isGeneratingCV: generating }),

  // Auto Pipeline
  isAutoPipelining: false,
  setIsAutoPipelining: (running) => set({ isAutoPipelining: running }),

  // ---- AUTONOMOUS FEATURES ----
  // Scheduler
  schedulerConfig: null,
  isLoadingScheduler: false,
  isRunningCycle: false,
  lastCycleResult: null,
  setSchedulerConfig: (config) => set({ schedulerConfig: config }),
  setIsLoadingScheduler: (loading) => set({ isLoadingScheduler: loading }),
  setIsRunningCycle: (running) => set({ isRunningCycle: running }),
  setLastCycleResult: (result) => set({ lastCycleResult: result }),

  // Follow-ups
  followUps: [],
  isLoadingFollowUps: false,
  setFollowUps: (followUps) => set({ followUps }),
  setIsLoadingFollowUps: (loading) => set({ isLoadingFollowUps: loading }),

  // Notifications
  notifications: [],
  unreadNotificationCount: 0,
  isLoadingNotifications: false,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
  setIsLoadingNotifications: (loading) => set({ isLoadingNotifications: loading }),

  // Auto-scan interval
  autoScanIntervalId: null,
  setAutoScanIntervalId: (id) => set({ autoScanIntervalId: id }),

  // Cycle history
  cycleHistory: [],
  setCycleHistory: (history) => set({ cycleHistory: history }),

  // Auto-apply logs
  autoApplyLogs: [],
  setAutoApplyLogs: (logs) => set({ autoApplyLogs: logs }),

  // Autopilot progress
  autopilotPhase: '',
  setAutopilotPhase: (phase) => set({ autopilotPhase: phase }),
  autopilotProgress: 0,
  setAutopilotProgress: (progress) => set({ autopilotProgress: progress }),

  // Real-time cycle progress from SSE
  cycleProgress: null,
  setCycleProgress: (progress) => set({ cycleProgress: progress }),
  isServerSchedulerRunning: false,
  setIsServerSchedulerRunning: (running) => set({ isServerSchedulerRunning: running }),

  // Email config
  emailConfig: null,
  setEmailConfig: (config) => set({ emailConfig: config }),

  // ---- NEW UI UPGRADE STATE ----
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  userName: '',
  setUserName: (name) => set({ userName: name }),

  jobPreferences: { roles: '', locations: '', portals: 'linkedin,indeed,glassdoor,wellfound,naukri' },
  setJobPreferences: (prefs) => set({ jobPreferences: prefs }),

  onboardingStep: 1,
  setOnboardingStep: (step) => set({ onboardingStep: step }),

  gettingStartedItems: [
    { id: 'add-resume', label: 'Add your resume', completed: false },
    { id: 'first-eval', label: 'Evaluate your first job', completed: false },
    { id: 'run-autopipeline', label: 'Run Auto-Pipeline', completed: false },
    { id: 'enable-autopilot', label: 'Enable Autopilot 24/7', completed: false },
  ],
  setGettingStartedItem: (id, completed) =>
    set((state) => ({
      gettingStartedItems: state.gettingStartedItems.map((item) =>
        item.id === id ? { ...item, completed } : item
      ),
    })),
  toggleGettingStartedItem: (id) =>
    set((state) => ({
      gettingStartedItems: state.gettingStartedItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    })),

  user: null,
  setUser: (user) => set({ user }),
}));
