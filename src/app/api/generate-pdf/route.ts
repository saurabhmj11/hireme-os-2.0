import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appNumber, format } = body;

    if (!appNumber) {
      return NextResponse.json({ error: 'appNumber is required' }, { status: 400 });
    }

    const app = await db.application.findUnique({ where: { number: appNumber } });
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const cvSetting = await db.setting.findUnique({ where: { key: 'cv' } });
    const profileSetting = await db.setting.findUnique({ where: { key: 'profile' } });
    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';

    const report = await db.evaluationReport.findFirst({
      where: { appNumber },
      orderBy: { createdAt: 'desc' },
    });

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const outputFormat = format || 'pdf-html';

    if (outputFormat === 'pdf-html') {
      // Generate ATS-optimized HTML that can be printed to PDF
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a professional CV/resume generator. Create a clean, ATS-optimized resume in HTML format.

Requirements:
- Use clean, semantic HTML5 with inline CSS
- Single column layout (ATS-friendly)
- Font: Arial/Helvetica, size 11pt body, 14pt headers
- Black text on white background only
- No images, graphics, tables with merged cells, or complex layouts
- Include: Name, Contact Info, Summary, Experience, Education, Skills, Certifications
- Tailor content to the specific job role and company
- Use keywords from the job description
- Keep it to 1-2 pages maximum
- Add print-friendly CSS: @media print { no margins, no backgrounds }

Return ONLY the HTML code. No markdown fences, no explanations.`,
          },
          {
            role: 'user',
            content: `Generate a tailored PDF-ready resume for:

**Target Company:** ${app.company}
**Target Role:** ${app.role}
**Location:** ${app.location || 'Not specified'}

${cv ? `**Candidate CV/Resume Data:**\n${cv}` : '**No CV data available**'}
${profile ? `**Candidate Profile:**\n${profile}` : ''}

${report ? `**Evaluation Insights for Tailoring:**
- Key skills to highlight: ${report.block2?.substring(0, 300)}
- Level strategy: ${report.block3?.substring(0, 200)}
- Key selling points: ${report.block5?.substring(0, 200)}` : ''}`,
          },
        ],
      });

      const htmlContent = completion.choices?.[0]?.message?.content || '';

      return NextResponse.json({
        html: htmlContent,
        format: 'pdf-html',
        filename: `${app.company}_${app.role}_CV.html`.replace(/[^a-zA-Z0-9_]/g, '_'),
      });
    }

    // LaTeX format
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a LaTeX resume generator. Create a clean, ATS-optimized resume in LaTeX format using the article class. Return ONLY LaTeX code.',
        },
        {
          role: 'user',
          content: `Generate a LaTeX resume for ${app.role} at ${app.company}.\n\n${cv ? `CV Data: ${cv.substring(0, 2000)}` : ''}\n${profile ? `Profile: ${profile.substring(0, 1000)}` : ''}`,
        },
      ],
    });

    const latexContent = completion.choices?.[0]?.message?.content || '';
    return NextResponse.json({
      latex: latexContent,
      format: 'latex',
      filename: `${app.company}_${app.role}_CV.tex`.replace(/[^a-zA-Z0-9_]/g, '_'),
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
