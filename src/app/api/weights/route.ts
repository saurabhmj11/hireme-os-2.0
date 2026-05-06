import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    let weights = await db.scoringWeight.findMany({
      where: { userId: user.id },
      orderBy: { dimension: 'asc' },
    });

    if (weights.length === 0) {
      // Seed defaults from DEFAULT_WEIGHTS constant for this user
      for (const d of DEFAULT_WEIGHTS) {
        await db.scoringWeight.create({
          data: { ...d, userId: user.id }
        });
      }
      weights = await db.scoringWeight.findMany({
        where: { userId: user.id },
        orderBy: { dimension: 'asc' }
      });
    }

    return NextResponse.json({ weights });
  } catch (error) {
    console.error('Error fetching weights:', error);
    return NextResponse.json({ error: 'Failed to fetch weights' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { weights } = body as { weights: Array<{ dimension: string; label: string; weight: number }> };

    if (!weights || !Array.isArray(weights)) {
      return NextResponse.json({ error: 'weights array is required' }, { status: 400 });
    }

    // Normalize weights to sum to 1
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    const normalized = weights.map((w) => ({
      ...w,
      weight: total > 0 ? Math.round((w.weight / total) * 1000) / 1000 : 0,
    }));

    for (const w of normalized) {
      await db.scoringWeight.upsert({
        where: { userId_dimension: { userId: user.id, dimension: w.dimension } },
        update: { label: w.label, weight: w.weight },
        create: { userId: user.id, dimension: w.dimension, label: w.label, weight: w.weight },
      });
    }

    return NextResponse.json({ weights: normalized, success: true });
  } catch (error) {
    console.error('Error updating weights:', error);
    return NextResponse.json({ error: 'Failed to update weights' }, { status: 500 });
  }
}
