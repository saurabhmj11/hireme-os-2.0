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

    // Get JD text from report or fallback
    const jd = report?.jdText || `${app.company} - ${app.role}`;

    // Build evaluation insights
    const evaluation = report
      ? `Overall Grade: ${report.overallGrade}, Score: ${report.overallScore}/5
Archetype: ${report.archetype}
CV Match: ${report.block2}
Personalization Notes: ${report.block5}
Level Strategy: ${report.block3}
Comp Research: ${report.block4}`
      : 'No evaluation report available for this application.';

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a LaTeX resume expert. Generate a professional, ATS-optimized resume in LaTeX source code based on the candidate's base CV, target job description, and evaluation insights.

Requirements:
- Use a clean, modern LaTeX template (e.g., with article class or a standard resume class)
- Include proper LaTeX document structure (\\documentclass through \\end{document})
- ATS-optimized: use standard section headers (Experience, Education, Skills, etc.)
- Inject relevant keywords from the JD naturally
- Highlight and emphasize relevant experience that matches the job
- Include quantified achievements where possible
- Use proper LaTeX formatting (\\textbf, \\textit, itemize, etc.)
- Professional layout with proper spacing
- Return ONLY the LaTeX source code — no markdown, no code fences, no explanations
- Do NOT use \\usepackage commands that require external packages not in standard TeX distributions
- Use standard LaTeX packages only (geometry, enumitem, hyperref, xcolor, fontawesome5 is ok if available)`,
        },
        {
          role: 'user',
          content: `Generate a LaTeX resume for:

**Company:** ${app.company}
**Role:** ${app.role}
**Location:** ${app.location || 'Not specified'}

**Target Job Description:**
${jd}

**Evaluation Insights:**
${evaluation}

${cv ? `**Base CV:**\n${cv}` : '**No CV on file — please add your CV in Settings first**'}

${profile ? `**Candidate Profile:**\n${profile.substring(0, 2000)}` : ''}

Engine: ${engine || 'GLM'}`,
        },
      ],
    });

    let latex = completion.choices?.[0]?.message?.content || '% LaTeX generation failed';

    // Remove markdown code fences if present
    const fenceMatch = latex.match(/```(?:latex|tex)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      latex = fenceMatch[1];
    }

    return NextResponse.json({ latex });
  } catch (error) {
    console.error('Error generating LaTeX:', error);
    return NextResponse.json({ error: 'LaTeX generation failed' }, { status: 500 });
  }
}
