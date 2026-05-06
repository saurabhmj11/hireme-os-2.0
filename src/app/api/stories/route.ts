import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const stories = await db.interviewStory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { title, situation, task, action, result, reflection, tags, source } = body;

    if (!title || !situation) {
      return NextResponse.json({ error: 'title and situation are required' }, { status: 400 });
    }

    const story = await db.interviewStory.create({
      data: {
        userId: user.id,
        title,
        situation,
        task: task || '',
        action: action || '',
        result: result || '',
        reflection: reflection || '',
        tags: tags || '',
        source: source || null,
      },
    });

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
  }
}
