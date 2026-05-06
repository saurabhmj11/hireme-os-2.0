/**
 * Cron Trigger API Endpoint
 *
 * This endpoint is called by Vercel Cron (or any external cron service)
 * to run the autonomous scheduler cycle. It replaces the setInterval-based
 * background worker which doesn't work in serverless environments.
 *
 * Security: Requires CRON_SECRET to prevent unauthorized triggers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSchedulerCycle } from '@/lib/scheduler-worker';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Triggered scheduler cycle at', new Date().toISOString());
    const result = await runSchedulerCycle('cron');

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      results: result.results,
    });
  } catch (error) {
    console.error('[Cron] Error running scheduler cycle:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Also support POST for manual triggers from external services
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const triggeredBy = body.triggeredBy || 'manual-api';
    console.log(`[Cron] Manual trigger (${triggeredBy}) at`, new Date().toISOString());
    const result = await runSchedulerCycle(triggeredBy);

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      results: result.results,
    });
  } catch (error) {
    console.error('[Cron] Error in manual trigger:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
