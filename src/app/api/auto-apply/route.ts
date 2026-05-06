import { requireAuth } from '@/lib/auth';

// GET: List auto-apply logs
export async function GET() {
  try {
    const user = await requireAuth();
    const logs = await db.autoApplyLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching auto-apply logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { url, appNumber } = body;

    if (!url && !appNumber) {
      return NextResponse.json({ error: 'url or appNumber is required' }, { status: 400 });
    }

    const targetUrl = url || '';
    let appNum = appNumber;

    // If no appNumber, we need to find or create one
    if (!appNum && targetUrl) {
      // Try to find existing application for this user with this URL
      const existing = await db.application.findFirst({
        where: { userId: user.id, url: targetUrl }
      });
      if (existing) appNum = existing.number;
    }

    const cvSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'cv' } }
    });
    const profileSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'profile' } }
    });
    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';

    if (!cv && !profile) {
      return NextResponse.json({ error: 'Please add your CV and profile in Settings first' }, { status: 400 });
    }

    // Log the auto-apply attempt
    const log = await db.autoApplyLog.create({
      data: {
        userId: user.id,
        appNumber: appNum,
        url: targetUrl,
        status: 'processing',
        result: 'Starting auto-apply process...',
      },
    });

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      // Step 1: Scrape the job page to understand the application process
      let applicationInstructions = '';
      try {
        const webReader = await zai.functions.invoke('web_reader' as any, { url: targetUrl });
        if (webReader && typeof webReader === 'object' && 'html' in webReader) {
          applicationInstructions = String(webReader.html).substring(0, 5000);
        }
      } catch {
        // Fallback to web search for application info
        try {
          const searchResult = await zai.functions.invoke('web_search', {
            query: `how to apply ${targetUrl} job application process`,
            num: 3,
          });
          if (Array.isArray(searchResult)) {
            applicationInstructions = searchResult.map((r: { snippet?: string }) => r.snippet).join('\n');
          }
        } catch { /* ignore */ }
      }

      // Step 2: Generate application materials
      let appData: Record<string, string> = {};
      if (appNum) {
        const app = await db.application.findUnique({
          where: { userId_number: { userId: user.id, number: appNum } }
        });
        if (app) {
          // Use the fill-form API logic
          const fields: Record<string, string> = {
            name: 'Full legal name',
            email: 'Professional email address',
            phone: 'Phone number with country code',
            linkedin: 'LinkedIn profile URL',
            portfolio: 'Portfolio or GitHub URL',
            cover_letter: 'Cover letter tailored to this specific role',
            salary_expectation: 'Salary expectation',
          };

          const fillResult = await zai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'You are an intelligent application form filler. Given form field descriptions and a candidate profile/CV, fill in appropriate values. Return ONLY a JSON object mapping each field name to its filled value. No markdown, no code fences.',
              },
              {
                role: 'user',
                content: `Fill these form fields:\n${Object.entries(fields).map(([k, v]) => `- "${k}": ${v}`).join('\n')}\n\n**Application Context:**\n- Company: ${app.company}\n- Role: ${app.role}\n- Location: ${app.location}\n\n${profile ? `**Profile:** ${profile}` : ''}\n${cv ? `**CV:** ${cv.substring(0, 2000)}` : ''}`,
              },
            ],
          });

          const rawOutput = fillResult.choices?.[0]?.message?.content || '{}';
          try {
            const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
            if (jsonMatch) appData = JSON.parse(jsonMatch[0]);
          } catch { /* fallback to empty */ }
        }
      }

      // Step 3: Generate the application link/action
      const applyCompletion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a job application assistant. Given a job URL and candidate info, provide a structured action plan for applying. Return JSON:
{
  "applyUrl": "the direct application URL if found, or the original URL",
  "method": "online_form" | "email" | "company_portal" | "linkedin_easy_apply",
  "steps": ["step 1", "step 2", ...],
  "filledFields": { "field_name": "value" },
  "coverLetter": "brief cover letter if needed",
  "tips": ["tip 1", "tip 2"]
}`,
          },
          {
            role: 'user',
            content: `Help me apply to this job:\nURL: ${targetUrl}\n\n${applicationInstructions ? `Page Content:\n${applicationInstructions.substring(0, 3000)}` : 'Could not scrape page content'}\n\nCandidate Data:\n${JSON.stringify(appData)}`,
          },
        ],
      });

      const applyRaw = applyCompletion.choices?.[0]?.message?.content || '{}';
      let applyResult: Record<string, unknown>;
      try {
        const jsonMatch = applyRaw.match(/\{[\s\S]*\}/);
        applyResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        applyResult = {};
      }

      // Update the log
      await db.autoApplyLog.update({
        where: { id: log.id },
        data: {
          status: 'completed',
          result: JSON.stringify(applyResult),
        },
      });

      // Mark application as auto-applied if we have one
      if (appNum) {
        await db.application.update({
          where: { userId_number: { userId: user.id, number: appNum } },
          data: { autoApplied: true },
        });
      }

      // Create notification
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'auto_apply',
          title: 'Auto-Apply Processed',
          message: `Application materials generated for ${targetUrl}. Method: ${applyResult.method || 'unknown'}`,
          link: String(applyResult.applyUrl || targetUrl),
        },
      });

      return NextResponse.json({
        success: true,
        applyResult,
        logId: log.id,
      });
    } catch (error) {
      await db.autoApplyLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          result: error instanceof Error ? error.message : 'Unknown error',
          attempts: { increment: 1 },
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('Error in auto-apply:', error);
    return NextResponse.json({ error: 'Auto-apply failed' }, { status: 500 });
  }
}
