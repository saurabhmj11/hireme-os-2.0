/**
 * Cover Letter Generator API
 *
 * Generates a personalized, company-specific cover letter
 * referencing the job, company mission, and user's fit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription, jobTitle, company, tone } = body;

    const cv = (await db.setting.findUnique({ where: { key: 'cv' } }))?.value || '';
    const profile = (await db.setting.findUnique({ where: { key: 'profile' } }))?.value || '';

    if (!cv.trim()) {
      return NextResponse.json({ error: 'No resume found. Add your CV in Settings first.' }, { status: 400 });
    }
    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: 'No job description provided.' }, { status: 400 });
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const selectedTone = tone || 'professional';

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert cover letter writer. Generate a compelling, personalized cover letter that:

1. Opens with a strong hook — NOT "I am writing to apply for..."
2. References specific details from the job description
3. Connects the applicant's experience directly to the role requirements
4. Shows knowledge of the company (infer from context)
5. Includes a specific example or achievement that proves fit
6. Closes with a confident call-to-action
7. Is concise (250-350 words) — hiring managers skim
8. Tone: ${selectedTone}

Return ONLY the cover letter text in clean format. No markdown headers, no "Dear Hiring Manager" (use a modern greeting).`,
        },
        {
          role: 'user',
          content: `MY RESUME:\n${cv}\n\n${profile ? `MY PROFILE:\n${profile}\n\n` : ''}TARGET JOB:\n${jobTitle || 'Role'}${company ? ` at ${company}` : ''}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
    });

    const coverLetter = completion.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      coverLetter,
      jobTitle: jobTitle || '',
      company: company || '',
      tone: selectedTone,
    });
  } catch (error) {
    console.error('Cover letter error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cover letter generation failed' }, { status: 500 });
  }
}
