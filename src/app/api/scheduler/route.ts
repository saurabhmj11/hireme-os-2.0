import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runSchedulerCycle, getProgress, isSchedulerRunning } from '@/lib/scheduler-worker';

// GET: Fetch scheduler config + current progress
export async function GET() {
  try {
    let config = await db.schedulerConfig.findFirst();
    if (!config) {
      config = await db.schedulerConfig.create({
        data: {
          name: 'default',
          enabled: false,
          scanIntervalMin: 60,
          followUpIntervalDays: 7,
          autoEvaluate: true,
          autoApply: false,
          minScoreToApply: 3.5,
          minGradeToApply: 'B',
          portals: 'linkedin,indeed,glassdoor,wellfound',
          searchQueries: 'AI Engineer,ML Engineer,LLM Engineer,Data Scientist',
          locationFilter: '',
        },
      });
    }
    return NextResponse.json({
      config,
      progress: getProgress(),
      isRunning: isSchedulerRunning(),
    });
  } catch (error) {
    console.error('Error fetching scheduler config:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduler config' }, { status: 500 });
  }
}

// PUT: Update scheduler config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    let config = await db.schedulerConfig.findFirst();

    if (!config) {
      config = await db.schedulerConfig.create({
        data: {
          name: 'default',
          enabled: body.enabled ?? false,
          scanIntervalMin: body.scanIntervalMin ?? 60,
          followUpIntervalDays: body.followUpIntervalDays ?? 7,
          autoEvaluate: body.autoEvaluate ?? true,
          autoApply: body.autoApply ?? false,
          minScoreToApply: body.minScoreToApply ?? 3.5,
          minGradeToApply: body.minGradeToApply ?? 'B',
          portals: body.portals ?? 'linkedin,indeed,glassdoor,wellfound',
          searchQueries: body.searchQueries ?? 'AI Engineer,ML Engineer,LLM Engineer,Data Scientist',
          locationFilter: body.locationFilter ?? '',
          notifyEmail: body.notifyEmail ?? '',
          notifyOnAutoApply: body.notifyOnAutoApply ?? true,
          notifyOnNewMatch: body.notifyOnNewMatch ?? true,
          notifyOnFollowUp: body.notifyOnFollowUp ?? true,
          notifyOnCycleComplete: body.notifyOnCycleComplete ?? true,
          notifyOnErrors: body.notifyOnErrors ?? true,
          notifyDigestMode: body.notifyDigestMode ?? 'instant',
        },
      });
    } else {
      config = await db.schedulerConfig.update({
        where: { id: config.id },
        data: {
          ...(body.enabled !== undefined && { enabled: body.enabled }),
          ...(body.scanIntervalMin !== undefined && { scanIntervalMin: body.scanIntervalMin }),
          ...(body.followUpIntervalDays !== undefined && { followUpIntervalDays: body.followUpIntervalDays }),
          ...(body.autoEvaluate !== undefined && { autoEvaluate: body.autoEvaluate }),
          ...(body.autoApply !== undefined && { autoApply: body.autoApply }),
          ...(body.minScoreToApply !== undefined && { minScoreToApply: body.minScoreToApply }),
          ...(body.minGradeToApply !== undefined && { minGradeToApply: body.minGradeToApply }),
          ...(body.portals !== undefined && { portals: body.portals }),
          ...(body.searchQueries !== undefined && { searchQueries: body.searchQueries }),
          ...(body.locationFilter !== undefined && { locationFilter: body.locationFilter }),
          ...(body.notifyEmail !== undefined && { notifyEmail: body.notifyEmail }),
          ...(body.notifyOnAutoApply !== undefined && { notifyOnAutoApply: body.notifyOnAutoApply }),
          ...(body.notifyOnNewMatch !== undefined && { notifyOnNewMatch: body.notifyOnNewMatch }),
          ...(body.notifyOnFollowUp !== undefined && { notifyOnFollowUp: body.notifyOnFollowUp }),
          ...(body.notifyOnCycleComplete !== undefined && { notifyOnCycleComplete: body.notifyOnCycleComplete }),
          ...(body.notifyOnErrors !== undefined && { notifyOnErrors: body.notifyOnErrors }),
          ...(body.notifyDigestMode !== undefined && { notifyDigestMode: body.notifyDigestMode }),
        },
      });
    }

    // If enabling, set nextRunAt to now so the server-side worker picks it up immediately
    if (body.enabled === true && !config.lastRunAt) {
      await db.schedulerConfig.update({
        where: { id: config.id },
        data: { nextRunAt: new Date().toISOString() },
      });
    }

    return NextResponse.json({
      config,
      progress: getProgress(),
      isRunning: isSchedulerRunning(),
    });
  } catch (error) {
    console.error('Error updating scheduler config:', error);
    return NextResponse.json({ error: 'Failed to update scheduler config' }, { status: 500 });
  }
}

// POST: Run the scheduler cycle using the shared worker
export async function POST(request?: NextRequest) {
  let triggeredBy = 'manual';
  if (request) {
    try {
      const body = await request.json();
      triggeredBy = body.triggeredBy || 'manual';
    } catch { /* no body or invalid */ }
  }

  try {
    // Check if already running
    if (isSchedulerRunning()) {
      return NextResponse.json({
        success: false,
        message: 'Cycle already in progress',
        progress: getProgress(),
      }, { status: 409 });
    }

    // Run using the shared worker (which updates progress in real-time)
    const result = await runSchedulerCycle(triggeredBy);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running scheduler cycle:', error);
    return NextResponse.json({ error: 'Scheduler cycle failed' }, { status: 500 });
  }
}
