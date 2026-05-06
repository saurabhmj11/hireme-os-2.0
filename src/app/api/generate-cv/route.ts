import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appNumber, engine } = body;

    if (!appNumber) {
      return NextResponse.json({ error: 'appNumber is required' }, { status: 400 });
    }

    const app = await db.application.findUnique({ where: { number: appNumber } });
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Read the latest evaluation report for this app
    const report = await db.evaluationReport.findFirst({
      where: { appNumber },
      orderBy: { createdAt: 'desc' },
    });

    // Read user's base CV from Setting table
    const cvSetting = await db.setting.findUnique({ where: { key: 'cv' } });
    const cv = cvSetting?.value || '';

    // Read user's profile from Setting table
    const profileSetting = await db.setting.findUnique({ where: { key: 'profile' } });
    const profile = profileSetting?.value || '';

    // Get JD text from report or empty
    const jd = report?.jdText || `${app.company} - ${app.role}`;

    // Build evaluation insights
    const evaluation = report
      ? `Overall Grade: ${report.overallGrade}, Score: ${report.overallScore}/5
Archetype: ${report.archetype}
CV Match: ${report.block2}
Personalization Notes: ${report.block5}
Level Strategy: ${report.block3}`
      : 'No evaluation report available for this application.';

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert CV writer who creates ATS-optimized resumes. You take a candidate's base CV, a target job description, and evaluation insights, and produce a tailored, professional CV in HTML format.

Requirements:
- Generate a complete HTML document with professional styling (embedded CSS)
- Clean, single-column layout using system fonts (Arial, Helvetica, sans-serif)
- ATS-optimized: use standard section headers (Experience, Education, Skills, etc.)
- Inject relevant keywords from the JD naturally throughout the document
- Highlight and emphasize relevant experience that matches the job
- Include quantified achievements where possible
- Use proper HTML semantics (h1, h2, ul, li, etc.)
- Professional color scheme (dark text, subtle accents)
- Return the HTML as a complete document (<!DOCTYPE html> through </html>)
- Do NOT wrap in markdown code fences`,
        },
        {
          role: 'user',
          content: `Base CV:\n${cv || 'No CV on file. Please add your CV in Settings first.'}

Target Job:\n${jd}

Evaluation insights:\n${evaluation}

${profile ? `Candidate Profile:\n${profile}` : ''}

Generate an ATS-optimized, tailored CV in HTML format for the ${app.role} position at ${app.company}.
Engine: ${engine || 'GLM'}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';

    // Extract HTML — try to get clean HTML from the response
    let html = raw;

    // Remove markdown code fences if present
    const htmlFenceMatch = raw.match(/```(?:html)?\s*\n?([\s\S]*?)\n?```/);
    if (htmlFenceMatch) {
      html = htmlFenceMatch[1];
    }

    // Ensure it's a complete HTML document
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${app.role} at ${app.company}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { color: #2a2a2a; border-bottom: 1px solid #999; padding-bottom: 4px; margin-top: 20px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
    .section { margin-bottom: 16px; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
    }

    return NextResponse.json({ html, raw });
  } catch (error) {
    console.error('Error generating CV:', error);
    return NextResponse.json({ error: 'CV generation failed' }, { status: 500 });
  }
}
