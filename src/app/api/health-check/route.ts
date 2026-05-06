import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface HealthIssue {
  type: string;
  message: string;
  severity: 'warning' | 'error';
}

export async function GET() {
  try {
    const issues: HealthIssue[] = [];

    const apps = await db.application.findMany();
    const reports = await db.evaluationReport.findMany();

    // Check for applications missing scores (score = 0)
    const zeroScoreApps = apps.filter((a) => a.score === 0);
    if (zeroScoreApps.length > 0) {
      issues.push({
        type: 'missing_score',
        message: `${zeroScoreApps.length} application(s) with no score: ${zeroScoreApps.map((a) => `${a.company} - ${a.role}`).join(', ')}`,
        severity: 'warning',
      });
    }

    // Check for applications missing location
    const noLocationApps = apps.filter((a) => !a.location);
    if (noLocationApps.length > 0) {
      issues.push({
        type: 'missing_location',
        message: `${noLocationApps.length} application(s) missing location: ${noLocationApps.slice(0, 5).map((a) => `${a.company} - ${a.role}`).join(', ')}${noLocationApps.length > 5 ? ` and ${noLocationApps.length - 5} more` : ''}`,
        severity: 'warning',
      });
    }

    // Check for stale applications (status="Applied" for >30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const staleApps = apps.filter(
      (a) => a.status === 'Applied' && new Date(a.date) < thirtyDaysAgo
    );
    if (staleApps.length > 0) {
      issues.push({
        type: 'stale_application',
        message: `${staleApps.length} stale application(s) in "Applied" status for >30 days: ${staleApps.map((a) => `${a.company} - ${a.role} (since ${a.date})`).join('; ')}`,
        severity: 'warning',
      });
    }

    // Check for duplicate companies (same company appearing multiple times with same role)
    const seen = new Map<string, { number: number; company: string; role: string }[]>();
    for (const app of apps) {
      const key = `${app.company.toLowerCase()}|${app.role.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push({ number: app.number, company: app.company, role: app.role });
    }
    for (const [, entries] of seen) {
      if (entries.length > 1) {
        issues.push({
          type: 'duplicate_company_role',
          message: `Duplicate: ${entries[0].company} - ${entries[0].role} appears ${entries.length} times (apps #${entries.map((e) => e.number).join(', #')})`,
          severity: 'error',
        });
      }
    }

    // Check for missing salary data
    const noSalaryApps = apps.filter((a) => !a.salary);
    if (noSalaryApps.length > 0) {
      issues.push({
        type: 'missing_salary',
        message: `${noSalaryApps.length} application(s) missing salary data: ${noSalaryApps.slice(0, 5).map((a) => `${a.company} - ${a.role}`).join(', ')}${noSalaryApps.length > 5 ? ` and ${noSalaryApps.length - 5} more` : ''}`,
        severity: 'warning',
      });
    }

    // Check for orphaned reports (no linked application)
    const orphaned = reports.filter(
      (r) => r.appNumber && !apps.find((a) => a.number === r.appNumber)
    );
    if (orphaned.length > 0) {
      issues.push({
        type: 'orphaned_report',
        message: `${orphaned.length} orphaned evaluation report(s) with missing application link`,
        severity: 'warning',
      });
    }

    // Check for CV/settings
    const cv = await db.setting.findUnique({ where: { key: 'cv' } });
    if (!cv?.value) {
      issues.push({
        type: 'missing_cv',
        message: 'No CV configured — add your CV in Settings for better evaluation results',
        severity: 'warning',
      });
    }

    // Check for profile/settings
    const profile = await db.setting.findUnique({ where: { key: 'profile' } });
    if (!profile?.value) {
      issues.push({
        type: 'missing_profile',
        message: 'No profile configured — add your profile in Settings for personalized evaluations',
        severity: 'warning',
      });
    }

    // Check for scoring weights
    const weights = await db.scoringWeight.findMany();
    if (weights.length === 0) {
      issues.push({
        type: 'missing_weights',
        message: 'No scoring weights configured — evaluations will use default weights',
        severity: 'warning',
      });
    }

    return NextResponse.json({
      issues,
      healthy: issues.filter((i) => i.severity === 'error').length === 0,
      totalChecks: 8,
      warningCount: issues.filter((i) => i.severity === 'warning').length,
      errorCount: issues.filter((i) => i.severity === 'error').length,
    });
  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
