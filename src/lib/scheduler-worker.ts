/**
 * Server-Side Scheduler Worker
 *
 * Runs independently of any browser — once the Next.js server starts,
 * this background loop checks SchedulerConfig and runs cycles automatically.
 * This is what makes Hire Me OS truly 24/7 autonomous.
 */

import { db } from './db';
import { createNotificationWithEmail, sendDailyDigest } from './notify-email';

// In-memory progress store shared with the SSE stream endpoint
export interface CycleProgress {
  phase: 'idle' | 'scanning' | 'evaluating' | 'applying' | 'followups' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  startedAt: number;
  currentCycle: string | null;
  scannedJobs: number;
  evaluatedJobs: number;
  autoAppliedJobs: number;
  followUpsScheduled: number;
  errors: string[];
}

const DEFAULT_PROGRESS: CycleProgress = {
  phase: 'idle',
  progress: 0,
  message: 'Idle',
  startedAt: 0,
  currentCycle: null,
  scannedJobs: 0,
  evaluatedJobs: 0,
  autoAppliedJobs: 0,
  followUpsScheduled: 0,
  errors: [],
};

// Global progress state map — shared with SSE endpoint
let progressStates: Record<string, CycleProgress> = {};
let activeCycles: Set<string> = new Set();
let workerStarted = false;

export function getProgress(userId: string): CycleProgress {
  return progressStates[userId] || { ...DEFAULT_PROGRESS };
}

export function isSchedulerRunning(userId: string): boolean {
  return activeCycles.has(userId);
}

function updateProgress(userId: string, partial: Partial<CycleProgress>) {
  progressStates[userId] = { ...(progressStates[userId] || DEFAULT_PROGRESS), ...partial };
}

function resetProgress(userId: string) {
  progressStates[userId] = { ...DEFAULT_PROGRESS };
}

/**
 * Run a single scheduler cycle — the full autonomous pipeline
 */
export async function runSchedulerCycle(userId: string, triggeredBy: string = 'auto'): Promise<{
  success: boolean;
  results: {
    scannedJobs: number;
    evaluatedJobs: number;
    autoAppliedJobs: number;
    followUpsScheduled: number;
    followUpsSent: number;
    newApplications: number;
    errors: string[];
    startTime: string;
    triggeredBy: string;
    duration?: number;
  };
}> {
  if (activeCycles.has(userId)) {
    return {
      success: false,
      results: {
        scannedJobs: 0, evaluatedJobs: 0, autoAppliedJobs: 0,
        followUpsScheduled: 0, followUpsSent: 0, newApplications: 0,
        errors: ['Cycle already in progress for this user'], startTime: new Date().toISOString(), triggeredBy,
      },
    };
  }

  activeCycles.add(userId);
  const cycleStartTime = Date.now();

  updateProgress(userId, {
    phase: 'scanning',
    progress: 5,
    message: 'Starting cycle — scanning job portals...',
    startedAt: cycleStartTime,
    currentCycle: `cycle-${Date.now()}`,
    scannedJobs: 0,
    evaluatedJobs: 0,
    autoAppliedJobs: 0,
    followUpsScheduled: 0,
    errors: [],
  });

  const results = {
    scannedJobs: 0,
    evaluatedJobs: 0,
    autoAppliedJobs: 0,
    followUpsScheduled: 0,
    followUpsSent: 0,
    newApplications: 0,
    errors: [] as string[],
    startTime: new Date().toISOString(),
    triggeredBy,
  };

  try {
    const config = await db.schedulerConfig.findFirst({
      where: { userId }
    });
    if (!config || !config.enabled) {
      resetProgress(userId);
      activeCycles.delete(userId);
      results.errors.push(config ? 'Autopilot is disabled' : 'No scheduler config found');
      return { success: false, results };
    }

    // =================== PHASE 1: SCAN ===================
    updateProgress({
      phase: 'scanning',
      progress: 10,
      message: 'Scanning job portals with web search...',
    });

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const queries = config.searchQueries.split(',').map(q => q.trim()).filter(Boolean);
    const portals = config.portals.split(',').map(p => p.trim()).filter(Boolean);

    const allFoundJobs: { title: string; company: string; url: string; snippet: string }[] = [];
    const totalSearches = queries.length * portals.length;
    let completedSearches = 0;

    for (const query of queries) {
      for (const portal of portals) {
        try {
          updateProgress({
            message: `Scanning ${portal} for "${query}"...`,
            progress: 10 + Math.floor((completedSearches / totalSearches) * 25),
          });

          const searchResult = await zai.functions.invoke('web_search', {
            query: `${query} site:${portal}.com ${config.locationFilter}`,
            num: 10,
          });

          if (Array.isArray(searchResult)) {
            for (const item of searchResult) {
              // Deduplicate by URL
              if (!allFoundJobs.some(j => j.url === item.url)) {
                allFoundJobs.push({
                  title: item.name || query,
                  company: item.host_name || portal,
                  url: item.url,
                  snippet: item.snippet || '',
                });
              }
            }
          }
        } catch (e) {
          results.errors.push(`Scan error for ${query} on ${portal}: ${e instanceof Error ? e.message : 'Unknown'}`);
        }
        completedSearches++;
      }
    }

    results.scannedJobs = allFoundJobs.length;
    updateProgress({
      phase: 'scanning',
      progress: 35,
      message: `Found ${allFoundJobs.length} jobs across ${portals.length} portals`,
      scannedJobs: allFoundJobs.length,
    });

    // =================== PHASE 2: EVALUATE ===================
    if (config.autoEvaluate && allFoundJobs.length > 0) {
      updateProgress(userId, {
        phase: 'evaluating',
        progress: 40,
        message: 'Evaluating job matches against your CV...',
      });

      const cvSetting = await db.setting.findUnique({
        where: { userId_key: { userId, key: 'cv' } }
      });
      const profileSetting = await db.setting.findUnique({
        where: { userId_key: { userId, key: 'profile' } }
      });
      const cv = cvSetting?.value || '';
      const profile = profileSetting?.value || '';

      const jobsToEval = allFoundJobs.slice(0, 20); // Limit per cycle
      let evalCompleted = 0;

      for (const job of jobsToEval) {
        try {
          updateProgress(userId, {
            message: `Evaluating: ${job.title} at ${job.company}`,
            progress: 40 + Math.floor((evalCompleted / jobsToEval.length) * 25),
          });

          // Check if already in pipeline for this user
          const existingByUrl = job.url ? await db.application.findFirst({
            where: { userId, url: job.url },
          }) : null;
          const existingByName = !existingByUrl ? await db.application.findFirst({
            where: {
              userId,
              company: { contains: job.company, mode: 'insensitive' },
              role: { contains: job.title, mode: 'insensitive' },
            },
          }) : null;
          if (existingByUrl || existingByName) {
            evalCompleted++;
            continue;
          }

          // Fix 1: Fetch full JD text for higher-quality evaluation
          let fullJDText = job.snippet;
          if (job.url) {
            try {
              updateProgress({ message: `Fetching full JD: ${job.title} at ${job.company}...` });
              const webReader = await zai.functions.invoke('web_reader' as any, { url: job.url });
              if (webReader && typeof webReader === 'object' && 'html' in webReader) {
                const rawText = String(webReader.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (rawText.length > 200) fullJDText = rawText.substring(0, 4000);
              }
            } catch {
              // Fall back to snippet — not fatal
            }
          }

          // AI evaluation using full JD text (or snippet fallback)
          const completion = await zai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'You are a job fit evaluator. Given a job description, evaluate if the candidate should apply. Also, look for the recruiter or hiring manager name and email address if present in the text. Return JSON: { "score": 1-5, "grade": "A"|"B"|"C"|"D"|"F", "summary": "brief reason (max 100 chars)", "shouldApply": true/false, "keySkillsMatched": ["skill1", "skill2"], "recruiterName": "name or empty", "recruiterEmail": "email or empty" }. Be concise.',
              },
              {
                role: 'user',
                content: `Evaluate this job for me:\nTitle: ${job.title}\nCompany: ${job.company}\nJob Description:\n${fullJDText}\n\n${cv ? `My CV:\n${cv.substring(0, 2000)}` : ''}\n${profile ? `My Profile:\n${profile.substring(0, 800)}` : ''}`,
              },
            ],
          });

          const rawOutput = completion.choices?.[0]?.message?.content || '{}';
          let evalResult: { score: number; grade: string; summary: string; shouldApply: boolean; keySkillsMatched?: string[]; recruiterName?: string; recruiterEmail?: string };

          try {
            const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
            evalResult = JSON.parse(jsonMatch?.[0] || '{}');
          } catch {
            evalResult = { score: 2.5, grade: 'C', summary: 'Could not parse evaluation', shouldApply: false };
          }

          results.evaluatedJobs++;
          evalCompleted++;

          // =================== PHASE 3: AUTO-APPLY ===================
          const meetsThreshold = evalResult.score >= config.minScoreToApply && ['A', 'B'].includes(evalResult.grade);
          if (config.autoApply && evalResult.shouldApply && meetsThreshold) {
            updateProgress({
              phase: 'applying',
              message: `Tailoring resume for ${job.title} at ${job.company}...`,
              evaluatedJobs: results.evaluatedJobs,
            });

            // Fix 2: Auto-tailor resume before applying
            let tailoredResume = cv;
            if (cv && fullJDText) {
              try {
                const tailorCompletion = await zai.chat.completions.create({
                  messages: [
                    {
                      role: 'system',
                      content: 'You are an expert resume writer. Rewrite the candidate\'s resume to be optimally tailored for the specific job description. Keep all facts true — only reorder, emphasize, and rephrase to match the JD keywords and requirements. Return only the tailored resume text, no preamble.',
                    },
                    {
                      role: 'user',
                      content: `ORIGINAL RESUME:\n${cv.substring(0, 3000)}\n\nJOB DESCRIPTION:\n${fullJDText.substring(0, 2000)}\n\nRole: ${job.title} at ${job.company}\n\nRewrite the resume to be the perfect match for this role.`,
                    },
                  ],
                });
                const tailored = tailorCompletion.choices?.[0]?.message?.content || '';
                if (tailored.length > 200) tailoredResume = tailored;
              } catch {
                // Fall back to original CV
              }
            }

            updateProgress({ message: `Auto-applying to ${job.title} at ${job.company}...` });

            const lastApp = await db.application.findFirst({ orderBy: { number: 'desc' } });
            const nextNumber = (lastApp?.number ?? 0) + 1;

            await db.application.create({
              data: {
                number: nextNumber,
                company: job.company,
                role: job.title,
                score: evalResult.score,
                url: job.url,
                notes: `Auto-applied | ${evalResult.summary}${evalResult.keySkillsMatched?.length ? ` | Matched: ${evalResult.keySkillsMatched.slice(0, 3).join(', ')}` : ''}`,
                autoApplied: true,
                recruiterName: evalResult.recruiterName || '',
                recruiterEmail: evalResult.recruiterEmail || '',
                date: new Date().toISOString().split('T')[0],
              },
            });

            await db.autoApplyLog.create({
              data: {
                appNumber: nextNumber,
                url: job.url,
                status: 'applied',
                result: JSON.stringify({
                  score: evalResult.score,
                  grade: evalResult.grade,
                  summary: evalResult.summary,
                  tailored: tailoredResume !== cv,
                  tailoredResume: tailoredResume !== cv ? tailoredResume.substring(0, 500) : null,
                }),
              },
            });

            results.autoAppliedJobs++;
            results.newApplications++;

            await createNotificationWithEmail({
              type: 'auto_apply',
              title: 'Auto-Applied to Job',
              message: `Applied to ${job.title} at ${job.company} (Score: ${evalResult.score}/5, Grade: ${evalResult.grade}) — Resume tailored: ${tailoredResume !== cv ? 'Yes ✓' : 'No'}`,
              link: job.url,
              emailData: { company: job.company, role: job.title, score: evalResult.score, grade: evalResult.grade, url: job.url, summary: evalResult.summary },
            });

            updateProgress({
              autoAppliedJobs: results.autoAppliedJobs,
              progress: 65 + Math.floor((results.autoAppliedJobs / Math.max(results.evaluatedJobs, 1)) * 15),
            });
          } else if (evalResult.score >= 3.0) {
            await createNotificationWithEmail({
              type: 'job_match',
              title: 'New Job Match Found',
              message: `${job.title} at ${job.company} — Score: ${evalResult.score}/5 (${evalResult.grade}). ${evalResult.summary}`,
              link: job.url,
              emailData: { company: job.company, role: job.title, score: evalResult.score, grade: evalResult.grade, url: job.url, summary: evalResult.summary },
            });
          }
        } catch (e) {
          results.errors.push(`Eval error for ${job.title}: ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }

      updateProgress({
        evaluatedJobs: results.evaluatedJobs,
        progress: 80,
      });
    }

    // =================== PHASE 4: FOLLOW-UPS ===================
    updateProgress({
      phase: 'followups',
      progress: 82,
      message: 'Checking for follow-ups due...',
    });

    const appsNeedingFollowUp = await db.application.findMany({
      where: {
        status: { in: ['Applied', 'Screening'] },
        nextFollowUp: { lte: new Date().toISOString() },
      },
    });

    let fuCompleted = 0;
    for (const app of appsNeedingFollowUp) {
      try {
        updateProgress({
          message: `Scheduling follow-up for ${app.role} at ${app.company}...`,
          progress: 82 + Math.floor((fuCompleted / Math.max(appsNeedingFollowUp.length, 1)) * 15),
        });

        const followUpDate = new Date();
        await db.followUp.create({
          data: {
            appNumber: app.number,
            type: 'check_in',
            content: `Follow up on ${app.role} application at ${app.company}`,
            scheduledAt: followUpDate.toISOString(),
            status: 'generated',
          },
        });

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + config.followUpIntervalDays);
        await db.application.update({
          where: { number: app.number },
          data: {
            lastFollowUp: followUpDate.toISOString(),
            nextFollowUp: nextDate.toISOString(),
          },
        });

        results.followUpsScheduled++;

        await createNotificationWithEmail({
          type: 'follow_up',
          title: 'Follow-Up Due',
          message: `Time to follow up on your ${app.role} application at ${app.company}`,
          emailData: { company: app.company, role: app.role, status: app.status },
        });

        fuCompleted++;
      } catch (e) {
        results.errors.push(`Follow-up error for App #${app.number}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    updateProgress({
      followUpsScheduled: results.followUpsScheduled,
    });

    // Update scheduler last run
    const nextRun = new Date();
    nextRun.setMinutes(nextRun.getMinutes() + config.scanIntervalMin);
    await db.schedulerConfig.update({
      where: { id: config.id },
      data: {
        lastRunAt: new Date().toISOString(),
        nextRunAt: nextRun.toISOString(),
      },
    });

    // Save cycle history
    const cycleDuration = Date.now() - cycleStartTime;
    try {
      await db.cycleHistory.create({
        data: {
          scannedJobs: results.scannedJobs,
          evaluatedJobs: results.evaluatedJobs,
          autoAppliedJobs: results.autoAppliedJobs,
          followUpsScheduled: results.followUpsScheduled,
          followUpsSent: results.followUpsSent,
          newApplications: results.newApplications,
          errors: JSON.stringify(results.errors),
          triggeredBy: results.triggeredBy,
          duration: cycleDuration,
        },
      });
    } catch (e) {
      console.error('[SchedulerWorker] Error saving cycle history:', e);
    }

    // =================== PHASE 5: COMPLETE ===================
    updateProgress(userId, {
      phase: 'complete',
      progress: 100,
      message: `Cycle complete! ${results.scannedJobs} scanned, ${results.evaluatedJobs} evaluated, ${results.autoAppliedJobs} applied, ${results.followUpsScheduled} follow-ups`,
    });

    // Send cycle completion notification email
    await createNotificationWithEmail({
      type: 'cycle_complete',
      title: 'Autopilot Cycle Complete',
      message: `Scanned: ${results.scannedJobs}, Evaluated: ${results.evaluatedJobs}, Applied: ${results.autoAppliedJobs}, Follow-ups: ${results.followUpsScheduled}${results.errors.length > 0 ? `, Errors: ${results.errors.length}` : ''}`,
      emailData: { scannedJobs: results.scannedJobs, evaluatedJobs: results.evaluatedJobs, autoAppliedJobs: results.autoAppliedJobs, followUpsScheduled: results.followUpsScheduled, duration: cycleDuration, triggeredBy },
    });

    // Send error notification if there were errors
    if (results.errors.length > 0) {
      await createNotificationWithEmail({
        type: 'error',
        title: 'Autopilot Cycle Errors',
        message: `${results.errors.length} errors occurred: ${results.errors.slice(0, 3).join('; ')}${results.errors.length > 3 ? '...' : ''}`,
        emailData: { error: results.errors.join('\n') },
      });
    }

    return { success: true, results: { ...results, duration: cycleDuration } };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.errors.push(`Cycle error: ${errorMsg}`);
    updateProgress(userId, {
      phase: 'error',
      progress: 0,
      message: `Cycle failed: ${errorMsg}`,
      errors: results.errors,
    });
    return { success: false, results };
  } finally {
    activeCycles.delete(userId);
    // Keep progress visible for 10 seconds, then reset
    setTimeout(() => { resetProgress(userId); }, 10000);
  }
}

/**
 * Start the server-side scheduler worker
 * Called from instrumentation.ts on server startup
 */
export function startSchedulerWorker() {
  if (workerStarted) return;
  workerStarted = true;

  console.log('[SchedulerWorker] Starting server-side scheduler worker...');

  // Check every 60 seconds if a cycle should run
  const CHECK_INTERVAL = 60 * 1000;

  // Daily digest — sent once per day at 9 AM (check every hour)
  let lastDigestDate = '';
  setInterval(async () => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const hour = now.getHours();

      // Send digest at ~9 AM local time
      if (hour === 9 && todayStr !== lastDigestDate) {
        const sent = await sendDailyDigest();
        if (sent) {
          lastDigestDate = todayStr;
          console.log(`[SchedulerWorker] Daily digest sent at ${now.toISOString()}`);
        }
      }
    } catch (error) {
      console.error('[SchedulerWorker] Daily digest error:', error);
    }
  }, 60 * 60 * 1000);

  setInterval(async () => {
    try {
      const configs = await db.schedulerConfig.findMany({
        where: { enabled: true }
      });
      
      for (const config of configs) {
        if (activeCycles.has(config.userId)) continue; // Skip if already running for this user

        // Check if it's time for the next cycle
        let shouldRun = false;
        if (config.nextRunAt) {
          const nextRun = new Date(config.nextRunAt).getTime();
          if (Date.now() >= nextRun) shouldRun = true;
        } else if (config.lastRunAt) {
          const lastRun = new Date(config.lastRunAt).getTime();
          const elapsed = Date.now() - lastRun;
          if (elapsed >= config.scanIntervalMin * 60 * 1000) shouldRun = true;
        } else {
          shouldRun = true; // Never run before
        }

        if (shouldRun) {
          console.log(`[SchedulerWorker] Running scheduled cycle (auto) for user ${config.userId} at ${new Date().toISOString()}`);
          runSchedulerCycle(config.userId, 'auto').then(result => {
            if (result.success) {
              console.log(`[SchedulerWorker] Cycle completed for user ${config.userId}: ${result.results.scannedJobs} scanned, ${result.results.evaluatedJobs} evaluated`);
            } else {
              console.error(`[SchedulerWorker] Cycle failed for user ${config.userId}:`, result.results.errors);
            }
          });
        }
      }
    } catch (error) {
      console.error('[SchedulerWorker] Worker check error:', error);
    }
  }, CHECK_INTERVAL);

  console.log('[SchedulerWorker] Worker started — will run cycles automatically when enabled');
}
