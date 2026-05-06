import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List cycle history (most recent first)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const history = await db.cycleHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get summary stats
    const totalCycles = await db.cycleHistory.count();
    const last24h = await db.cycleHistory.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      },
    });

    const summary = {
      totalCycles,
      cyclesLast24h: last24h.length,
      totalJobsScanned: last24h.reduce((sum, c) => sum + c.scannedJobs, 0),
      totalJobsEvaluated: last24h.reduce((sum, c) => sum + c.evaluatedJobs, 0),
      totalAutoApplied: last24h.reduce((sum, c) => sum + c.autoAppliedJobs, 0),
      totalFollowUps: last24h.reduce((sum, c) => sum + c.followUpsScheduled, 0),
      avgDuration: last24h.length > 0 ? Math.round(last24h.reduce((sum, c) => sum + c.duration, 0) / last24h.length) : 0,
    };

    return NextResponse.json({ history, summary });
  } catch (error) {
    console.error('Error fetching cycle history:', error);
    return NextResponse.json({ error: 'Failed to fetch cycle history' }, { status: 500 });
  }
}

// DELETE: Clear all cycle history
export async function DELETE() {
  try {
    await db.cycleHistory.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing cycle history:', error);
    return NextResponse.json({ error: 'Failed to clear cycle history' }, { status: 500 });
  }
}
