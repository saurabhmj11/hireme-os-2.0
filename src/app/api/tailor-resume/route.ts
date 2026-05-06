/**
 * Auto-Tailored Resume API
 *
 * Takes a job description and rewrites the user's resume
 * to be perfectly tailored for that specific role.
 * Highlights relevant skills, reorders experience, matches keywords.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription, jobTitle, company } = body;

    const cv = (await db.setting.findUnique({ where: { key: 'cv' } }))?.value || '';
    const profile = (await db.setting.findUnique({ where: { key: 'profile' } }))?.value || '';
    const proofs = (await db.setting.findUnique({ where: { key: 'proofs' } }))?.value || '';

    if (!cv.trim()) {
      return NextResponse.json({ error: 'No resume found. Add your CV in Settings first.' }, { status: 400 });
    }
    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: 'No job description provided.' }, { status: 400 });
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert resume writer who specializes in tailoring resumes for specific job postings. Given a base resume and a job description, rewrite the resume to:

1. Reorder experience to put the most relevant roles first
2. Rewrite bullet points to mirror the job description's language and keywords
3. Highlight skills that match the job requirements
4. Quantify achievements where possible
5. Add relevant keywords from the JD naturally
6. Keep the SAME person's name, contact info, and education
7. Make it ATS-friendly with standard section headers
8. Do NOT invent fake experience — only rephrase and reorganize existing content

Return the tailored resume in clean markdown format.`,
        },
        {
          role: 'user',
          content: `MY BASE RESUME:\n${cv}\n\n${profile ? `MY PROFILE:\n${profile}\n\n` : ''}${proofs ? `MY PROOF POINTS:\n${proofs}\n\n` : ''}TARGET JOB:\n${jobTitle ? `${jobTitle}` : ''}${company ? ` at ${company}` : ''}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
    });

    const tailoredResume = completion.choices?.[0]?.message?.content || '';

    // Also generate a brief summary of changes
    const changesCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a resume coach. In 3-5 bullet points, summarize what was changed in the tailored resume vs the original. Be specific about keyword additions, reordering, and emphasis changes.',
        },
        {
          role: 'user',
          content: `ORIGINAL:\n${cv.substring(0, 1000)}\n\nTAILORED:\n${tailoredResume.substring(0, 1000)}`,
        },
      ],
    });

    const changes = changesCompletion.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      tailoredResume,
      changes,
      jobTitle: jobTitle || '',
      company: company || '',
    });
  } catch (error) {
    console.error('Tailor resume error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Resume tailoring failed' }, { status: 500 });
  }
}
