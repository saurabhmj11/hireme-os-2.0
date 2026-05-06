import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const applications = await db.application.findMany({
      where: { userId: user.id },
      orderBy: { number: 'asc' },
    });

    // Compute metrics
    const total = applications.length;
    const byStatus: Record<string, number> = {};
    let totalScore = 0;

    for (const app of applications) {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      totalScore += app.score;
    }

    const responded = (byStatus['Interview'] || 0) + (byStatus['Offer'] || 0) + (byStatus['Rejected'] || 0) + (byStatus['Waitlisted'] || 0) + (byStatus['Screening'] || 0);
    const interviewed = byStatus['Interview'] || 0;
    const offered = byStatus['Offer'] || 0;

    const metrics = {
      total_applications: total,
      by_status: byStatus,
      avg_score: total > 0 ? Math.round((totalScore / total) * 100) / 100 : 0,
      response_rate: total > 0 ? Math.round((responded / total) * 1000) / 10 : 0,
      interview_rate: total > 0 ? Math.round((interviewed / total) * 1000) / 10 : 0,
      offer_rate: total > 0 ? Math.round((offered / total) * 1000) / 10 : 0,
    };

    return NextResponse.json({ applications, metrics });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
