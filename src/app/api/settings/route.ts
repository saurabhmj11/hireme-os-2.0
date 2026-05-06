import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();
    const settings = await db.setting.findMany({
      where: { userId: user.id }
    });
    const data: Record<string, string> = {};
    for (const s of settings) {
      data[s.key] = s.value;
    }
    return NextResponse.json({
      env: data.env || '',
      cv: data.cv || '',
      profile: data.profile || '',
      portals: data.portals || '',
      proofs: data.proofs || '',
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { env, cv, profile, portals, proofs } = body;

    const updates = [
      { key: 'env', value: env || '' },
      { key: 'cv', value: cv || '' },
      { key: 'profile', value: profile || '' },
      { key: 'portals', value: portals || '' },
      { key: 'proofs', value: proofs || '' },
    ];

    for (const item of updates) {
      await db.setting.upsert({
        where: { userId_key: { userId: user.id, key: item.key } },
        update: { value: item.value },
        create: { userId: user.id, key: item.key, value: item.value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
