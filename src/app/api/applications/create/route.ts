import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { company, role, status, score, url, location, salary, date, notes, recruiterEmail, recruiterName, jobType } = body;

    if (!company || !role) {
      return NextResponse.json({ error: 'company and role are required' }, { status: 400 });
    }

    // Get the max number to auto-increment FOR THIS USER
    const maxApp = await db.application.findFirst({
      where: { userId: user.id },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const nextNumber = (maxApp?.number || 0) + 1;

    const application = await db.application.create({
      data: {
        userId: user.id,
        number: nextNumber,
        company,
        role,
        status: status || 'Applied',
        score: score ?? 0,
        url: url || '',
        location: location || '',
        salary: salary || '',
        date: date || new Date().toISOString().split('T')[0],
        notes: notes || '',
        recruiterEmail: recruiterEmail || '',
        recruiterName: recruiterName || '',
        jobType: jobType || '',
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}
