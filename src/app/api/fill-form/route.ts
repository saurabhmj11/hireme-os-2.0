import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // continue
    }
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // continue
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appNumber, fields } = body;

    if (!appNumber) {
      return NextResponse.json({ error: 'appNumber is required' }, { status: 400 });
    }

    if (!fields || typeof fields !== 'object') {
      return NextResponse.json({ error: 'fields (Record<string, string>) is required' }, { status: 400 });
    }

    const app = await db.application.findUnique({ where: { number: appNumber } });
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Read user's CV and profile from settings
    const cvSetting = await db.setting.findUnique({ where: { key: 'cv' } });
    const profileSetting = await db.setting.findUnique({ where: { key: 'profile' } });
    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';

    // Read evaluation report if available
    const report = await db.evaluationReport.findFirst({
      where: { appNumber },
      orderBy: { createdAt: 'desc' },
    });

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const fieldList = Object.entries(fields as Record<string, string>)
      .map(([key, description]) => `- "${key}": ${description || '(no description)'}`)
      .join('\n');

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an intelligent application form filler. Given a set of form field names/descriptions and a candidate's profile and CV, fill in appropriate values for each field.

Rules:
- Read each field name/description carefully and provide the most appropriate value from the candidate's data
- For name fields, use the candidate's full name from CV/profile
- For email fields, use a professional email from profile
- For phone fields, use phone from profile
- For experience/role fields, tailor to the specific job application
- For cover letter or "why this company" fields, write a concise, compelling response based on the evaluation insights
- For salary expectations, use compensation data from evaluation if available
- For availability/start date, provide a reasonable default (e.g., "2 weeks notice" or "Immediate")
- If you cannot determine a value, leave it as an empty string

Return ONLY a JSON object mapping each field name to its filled value. No markdown, no code fences, no explanations.`,
        },
        {
          role: 'user',
          content: `Fill these form fields:
${fieldList}

**Application Context:**
- Company: ${app.company}
- Role: ${app.role}
- Location: ${app.location || 'Not specified'}

${profile ? `**Candidate Profile:**\n${profile}` : '**No profile on file**'}

${cv ? `**Candidate CV:**\n${cv.substring(0, 3000)}` : '**No CV on file**'}

${report ? `**Evaluation Insights:**\n- Grade: ${report.overallGrade}, Score: ${report.overallScore}/5\n- Key highlights: ${report.block5}\n- Level strategy: ${report.block3}` : '**No evaluation report**'}`,
        },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content || '{}';
    const parsed = extractJSON(rawOutput);

    const filledFields: Record<string, string> = {};
    if (parsed) {
      for (const key of Object.keys(fields as Record<string, string>)) {
        filledFields[key] =
          typeof parsed[key] === 'string' ? (parsed[key] as string) : String(parsed[key] ?? '');
      }
    }

    return NextResponse.json({ filledFields });
  } catch (error) {
    console.error('Error filling form:', error);
    return NextResponse.json({ error: 'Form filling failed' }, { status: 500 });
  }
}
