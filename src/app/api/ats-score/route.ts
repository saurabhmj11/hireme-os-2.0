/**
 * ATS Score Checker API
 *
 * Compares a resume against a job description and returns:
 * - Overall ATS compatibility score (0-100)
 * - Keyword match analysis
 * - Missing keywords
 * - Section analysis
 * - Fix suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume, jobDescription } = body;

    const cv = resume || (await db.setting.findUnique({ where: { key: 'cv' } }))?.value || '';
    const jd = jobDescription || '';

    if (!cv.trim()) {
      return NextResponse.json({ error: 'No resume provided. Add your CV in Settings first.' }, { status: 400 });
    }
    if (!jd.trim()) {
      return NextResponse.json({ error: 'No job description provided.' }, { status: 400 });
    }

    // Use AI to analyze ATS compatibility
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an ATS (Applicant Tracking System) expert. Analyze the resume against the job description and return a JSON object with:
{
  "overallScore": number (0-100),
  "keywordMatch": { "matched": string[], "missing": string[], "matchPercent": number },
  "sectionAnalysis": {
    "experience": { "score": number, "feedback": string },
    "skills": { "score": number, "feedback": string },
    "education": { "score": number, "feedback": string },
    "formatting": { "score": number, "feedback": string }
  },
  "suggestions": string[] (5-8 specific actionable improvements),
  "strengths": string[] (3-5 things done well),
  "atsReady": boolean (true if score >= 70)
}

Be strict but fair. Focus on ATS-specific issues like keyword matching, section headers, quantifiable achievements, and formatting compatibility.`,
        },
        {
          role: 'user',
          content: `RESUME:\n${cv}\n\nJOB DESCRIPTION:\n${jd}`,
        },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content || '{}';
    let result;
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch?.[0] || '{}');
    } catch {
      result = { overallScore: 50, error: 'Could not parse AI response', rawOutput };
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('ATS score error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'ATS analysis failed' }, { status: 500 });
  }
}
