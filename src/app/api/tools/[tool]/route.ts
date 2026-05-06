import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
) {
  try {
    const { tool } = await params;

    if (tool === 'dedup') {
      return await handleDedup();
    } else if (tool === 'merge') {
      return await handleMerge();
    } else if (tool === 'normalize') {
      return await handleNormalize();
    }

    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  } catch (error) {
    console.error('Error running tool:', error);
    return NextResponse.json({ error: 'Failed to run tool' }, { status: 500 });
  }
}

async function handleDedup() {
  const apps = await db.application.findMany({ orderBy: { number: 'asc' } });
  const seen = new Map<string, number[]>();
  const duplicates: { key: string; numbers: number[]; company: string; role: string }[] = [];

  for (const app of apps) {
    const key = `${app.company.toLowerCase().trim()}|${app.role.toLowerCase().trim()}`;
    if (seen.has(key)) {
      seen.get(key)!.push(app.number);
    } else {
      seen.set(key, [app.number]);
    }
  }

  let removedCount = 0;
  for (const [key, numbers] of seen) {
    if (numbers.length > 1) {
      const [company, role] = key.split('|');
      duplicates.push({ key, numbers, company, role });
      // Keep the most recent one (highest number), remove older duplicates
      const toRemove = numbers.slice(0, -1);
      for (const num of toRemove) {
        // Delete related evaluation reports first
        await db.evaluationReport.deleteMany({ where: { appNumber: num } });
        await db.application.delete({ where: { number: num } });
        removedCount++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Deduplication completed',
    details: duplicates.length > 0
      ? `Found and removed ${removedCount} duplicate application(s). ${duplicates.map(d => `"${d.company} - ${d.role}" had ${d.numbers.length} entries`).join('; ')}.`
      : 'Scanned all applications and found 0 duplicate entries. Your pipeline is clean!',
    duplicatesFound: duplicates.length,
    removedCount,
  });
}

async function handleMerge() {
  const apps = await db.application.findMany({ orderBy: { number: 'asc' } });
  let mergedCount = 0;
  const mergeActions: string[] = [];

  // Group by company+role for potential merges
  const grouped = new Map<string, typeof apps>();
  for (const app of apps) {
    const key = `${app.company.toLowerCase().trim()}|${app.role.toLowerCase().trim()}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(app);
  }

  for (const [key, group] of grouped) {
    if (group.length <= 1) continue;
    const [company, role] = key.split('|');

    // Merge: keep the most advanced status, highest score, richest data
    const statusPriority: Record<string, number> = { Applied: 1, Screening: 2, Interview: 3, Waitlisted: 3, Offer: 4, Rejected: 0 };
    const best = group.reduce((a, b) => {
      const aP = statusPriority[a.status] ?? 0;
      const bP = statusPriority[b.status] ?? 0;
      if (bP > aP) return b;
      if (bP === aP && b.score > a.score) return b;
      return a;
    });

    // Update the best one with merged data
    const mergedNotes = group
      .map(a => a.notes ? `[App #${a.number}] ${a.notes}` : '')
      .filter(Boolean)
      .join('\n');
    const mergedUrl = group.find(a => a.url)?.url || best.url;
    const mergedLocation = group.find(a => a.location)?.location || best.location;
    const mergedSalary = group.find(a => a.salary)?.salary || best.salary;

    await db.application.update({
      where: { number: best.number },
      data: {
        notes: mergedNotes || best.notes,
        url: mergedUrl,
        location: mergedLocation,
        salary: mergedSalary,
        score: Math.max(...group.map(a => a.score)),
      },
    });

    // Remove the others
    for (const app of group) {
      if (app.number !== best.number) {
        await db.evaluationReport.deleteMany({ where: { appNumber: app.number } });
        await db.application.delete({ where: { number: app.number } });
        mergedCount++;
      }
    }
    mergeActions.push(`Merged ${group.length} entries for "${company} - ${role}" into App #${best.number}`);
  }

  return NextResponse.json({
    success: true,
    message: 'Merge completed',
    details: mergedCount > 0
      ? `Merged ${mergedCount} application(s). ${mergeActions.join('; ')}.`
      : 'No applications needed merging. All records are unique and consistent.',
    mergedCount,
  });
}

async function handleNormalize() {
  const apps = await db.application.findMany();
  let normalizedCount = 0;
  const actions: string[] = [];

  // Status normalization map
  const statusMap: Record<string, string> = {
    applied: 'Applied',
    screening: 'Screening',
    interview: 'Interview',
    interviewing: 'Interview',
    'phone screen': 'Screening',
    onsite: 'Interview',
    technical: 'Interview',
    offer: 'Offer',
    offered: 'Offer',
    'offer received': 'Offer',
    rejected: 'Rejected',
    declined: 'Rejected',
    no: 'Rejected',
    waitlisted: 'Waitlisted',
    hold: 'Waitlisted',
    waitlist: 'Waitlisted',
  };

  for (const app of apps) {
    const updates: Record<string, string> = {};
    const normalizedStatus = statusMap[app.status.toLowerCase().trim()];
    if (normalizedStatus && normalizedStatus !== app.status) {
      updates.status = normalizedStatus;
    }

    // Normalize company name: trim, title case for known patterns
    const trimmedCompany = app.company.trim();
    if (trimmedCompany !== app.company) {
      updates.company = trimmedCompany;
    }

    // Normalize role: trim whitespace
    const trimmedRole = app.role.trim();
    if (trimmedRole !== app.role) {
      updates.role = trimmedRole;
    }

    // Normalize date format
    if (app.date) {
      try {
        const parsed = new Date(app.date);
        if (!isNaN(parsed.getTime())) {
          const isoDate = parsed.toISOString().split('T')[0];
          if (isoDate !== app.date) {
            updates.date = isoDate;
          }
        }
      } catch { /* skip invalid dates */ }
    }

    if (Object.keys(updates).length > 0) {
      await db.application.update({ where: { number: app.number }, data: updates });
      normalizedCount++;
      const changes = Object.entries(updates).map(([k, v]) => `${k}: "${v}"`).join(', ');
      actions.push(`App #${app.number} (${app.company}): ${changes}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Normalization completed',
    details: normalizedCount > 0
      ? `Standardized ${normalizedCount} record(s). ${actions.slice(0, 5).join('; ')}${actions.length > 5 ? ` and ${actions.length - 5} more` : ''}.`
      : 'All applications already follow standard formats. 0 records needed normalization.',
    normalizedCount,
  });
}
