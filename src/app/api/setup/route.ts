/**
 * Database Setup & Seed Endpoint
 *
 * This endpoint ensures the database schema is pushed and
 * optionally seeds initial data. Useful after first Render deploy
 * where prisma db push may have been skipped.
 *
 * Call once after deployment: GET /api/setup?secret=setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET && secret !== 'setup') {
    return NextResponse.json({ error: 'Invalid secret. Use ?secret=setup' }, { status: 401 });
  }

  const results: string[] = [];

  // Test DB connection
  try {
    await db.$connect();
    results.push('✅ Database connected');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push(`❌ Database connection failed: ${msg}`);
    return NextResponse.json({ success: false, results, hint: 'Check DATABASE_URL env var in Render Dashboard' }, { status: 500 });
  }

  // Check if tables exist by querying settings
  try {
    const settings = await db.setting.findMany();
    results.push(`✅ Settings table exists (${settings.length} rows)`);

    // Seed defaults if empty
    if (settings.length === 0) {
      await db.setting.upsert({ where: { key: 'env' }, update: {}, create: { key: 'env', value: '' } });
      await db.setting.upsert({ where: { key: 'cv' }, update: {}, create: { key: 'cv', value: '' } });
      await db.setting.upsert({ where: { key: 'profile' }, update: {}, create: { key: 'profile', value: '' } });
      await db.setting.upsert({ where: { key: 'portals' }, update: {}, create: { key: 'portals', value: 'linkedin,indeed,glassdoor,wellfound,naukri' } });
      await db.setting.upsert({ where: { key: 'proofs' }, update: {}, create: { key: 'proofs', value: '' } });
      results.push('✅ Seeded default settings (CV is empty — onboarding will show on first visit)');
    } else {
      const hasCV = settings.some(s => s.key === 'cv' && s.value.trim() !== '');
      if (hasCV) {
        results.push('✅ CV already configured — onboarding will be skipped');
      } else {
        results.push('ℹ️ No CV set — onboarding will show on first visit');
      }
    }

    // Check other tables
    const appCount = await db.application.count();
    results.push(`✅ Applications table exists (${appCount} rows)`);

    const reportCount = await db.evaluationReport.count();
    results.push(`✅ EvaluationReports table exists (${reportCount} rows)`);

    const configCount = await db.schedulerConfig.count();
    results.push(`✅ SchedulerConfig table exists (${configCount} rows)`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push(`❌ Tables may not exist: ${msg}`);
    results.push('💡 Run: npx prisma db push --accept-data-loss (from local or add to build)');
  }

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}
