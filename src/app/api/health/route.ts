/**
 * Lightweight Health Check Endpoint for Render
 *
 * This is intentionally simple — it just confirms the Next.js server is alive.
 * The more detailed /api/health-check endpoint queries the database and
 * performs application-level checks, which can fail during initial deploy
 * before Prisma migrations have run.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Hire Me OS 2.0',
    timestamp: new Date().toISOString(),
  });
}
