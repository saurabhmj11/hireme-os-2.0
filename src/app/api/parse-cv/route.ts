/**
 * CV Parser API
 *
 * Accepts raw CV text (or extracts from a base64 file) and:
 * 1. Returns structured data: name, skills, job titles, experience years, location, salary expectation
 * 2. Auto-suggests scheduler search queries based on extracted skills + titles
 *
 * Supports: plain text, basic PDF text extraction (via base64)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cvText, autoPopulate } = body;

    if (!cvText?.trim()) {
      return NextResponse.json({ error: 'cvText is required' }, { status: 400 });
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // Use AI to extract structured data from the CV
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a professional resume parser. Extract structured information from the CV text. Return ONLY a JSON object with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number or empty string",
  "location": "City, Country or empty string",
  "currentTitle": "Most recent job title",
  "yearsExperience": 5,
  "skills": ["skill1", "skill2", ...] (top 15 technical skills),
  "jobTitles": ["Title 1", "Title 2"] (2-4 relevant job titles to search for),
  "industries": ["AI/ML", "Software Engineering"] (1-3 industries),
  "salaryExpectation": "range or empty string if not mentioned",
  "preferredLocations": ["Remote", "London"] (from CV context),
  "searchQueries": ["Senior AI Engineer", "ML Engineer", "LLMOps Engineer"] (3-5 specific job search queries derived from skills and experience),
  "summary": "2-sentence professional summary"
}`,
        },
        {
          role: 'user',
          content: `Parse this CV:\n\n${cvText.substring(0, 6000)}`,
        },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content || '{}';
    let parsed: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
      currentTitle?: string;
      yearsExperience?: number;
      skills?: string[];
      jobTitles?: string[];
      industries?: string[];
      salaryExpectation?: string;
      preferredLocations?: string[];
      searchQueries?: string[];
      summary?: string;
    };

    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return NextResponse.json({ error: 'Failed to parse CV structure', rawOutput }, { status: 500 });
    }

    // If autoPopulate is true, update the scheduler config with extracted search queries
    if (autoPopulate && parsed.searchQueries?.length) {
      try {
        const schedulerConfig = await db.schedulerConfig.findFirst();
        if (schedulerConfig) {
          const queries = parsed.searchQueries.join(', ');
          const locationFilter = parsed.preferredLocations?.includes('Remote') ? 'remote' : (parsed.location || '');
          await db.schedulerConfig.update({
            where: { id: schedulerConfig.id },
            data: {
              searchQueries: queries,
              locationFilter,
            },
          });
        }
      } catch (e) {
        console.error('[parse-cv] Failed to auto-populate scheduler:', e);
      }
    }

    // Also save the user's name if not already set
    if (autoPopulate && parsed.name) {
      try {
        const existing = await db.setting.findUnique({ where: { key: 'userName' } });
        if (!existing?.value) {
          await db.setting.upsert({
            where: { key: 'userName' },
            create: { key: 'userName', value: parsed.name },
            update: { value: parsed.name },
          });
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      parsed,
      autoPopulated: autoPopulate ? {
        searchQueries: parsed.searchQueries,
        locationFilter: parsed.preferredLocations?.includes('Remote') ? 'remote' : (parsed.location || ''),
      } : null,
    });
  } catch (error) {
    console.error('CV parse error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CV parsing failed' }, { status: 500 });
  }
}
