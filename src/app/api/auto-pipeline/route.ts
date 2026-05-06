import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

function scoreToGrade(score: number): string {
  if (score >= 4.5) return 'A';
  if (score >= 3.5) return 'B';
  if (score >= 2.5) return 'C';
  if (score >= 1.5) return 'D';
  return 'F';
}

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
    const user = await requireAuth();
    const body = await request.json();
    const { url, engine } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Step 1: Try to fetch/scrape the URL content
    let jdText = '';

    // First attempt: direct fetch + extract text
    try {
      const fetchRes = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CareerOps/1.0)',
        },
      });
      if (fetchRes.ok) {
        const html = await fetchRes.text();
        const textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
        if (textContent.length > 200) {
          jdText = textContent.substring(0, 8000);
        }
      }
    } catch {
      // Direct fetch failed, fall through to web search
    }

    // Second attempt: use z-ai-web-dev-sdk web_search if direct fetch failed
    if (!jdText) {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const searchResult = await zai.functions.invoke('web_search', {
          query: url,
          num: 5,
        });
        const results = (
          searchResult as {
            results?: Array<{ snippet?: string; title?: string }>;
          }
        ).results;
        if (results && results.length > 0) {
          jdText = results
            .map((r) => `${r.title || ''}\n${r.snippet || ''}`)
            .join('\n\n');
        }
      } catch {
        // Search also failed
      }
    }

    // Third attempt: try z-ai-web-dev-sdk web-reader
    if (!jdText) {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const readerResult = await zai.functions.invoke('web_reader', {
          url,
        });
        if (readerResult && typeof readerResult === 'object') {
          const reader = readerResult as { content?: string; text?: string; html?: string };
          const extracted = reader.content || reader.text || reader.html || '';
          if (extracted.length > 100) {
            const cleanText = extracted
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            jdText = cleanText.substring(0, 8000);
          }
        }
      } catch {
        // Reader also failed
      }
    }

    if (!jdText) {
      return NextResponse.json(
        { error: 'Could not extract job description from URL' },
        { status: 400 }
      );
    }

    // Step 2: Run structured evaluation (same logic as /api/evaluate)
    const cvSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'cv' } }
    });
    const profileSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'profile' } }
    });
    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';
    const weights = await db.scoringWeight.findMany({
      where: { userId: user.id }
    });
    const dimensionList = weights
      .map((w) => `${w.dimension} (${w.label}, weight: ${w.weight})`)
      .join(', ');

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // Detect archetype first
    const archetypePrompt = `You are a career classification expert. Given a job description, classify it into exactly ONE archetype from this list:
- llmops: LLMOps (LLM operations, deployment, monitoring)
- agentic: Agentic AI (autonomous agents, multi-agent systems)
- pm: Product Manager (product strategy, roadmap, user research)
- sa: Solutions Architect (system design, technical architecture)
- fde: Forward Deployed Engineer (customer-facing engineering)
- transformation: Transformation (change management, process redesign)
- backend: Backend Engineer (APIs, databases, server-side)
- frontend: Frontend Engineer (UI, React, web development)
- data: Data Engineer (pipelines, ETL, data infrastructure)
- general: General (doesn't fit above categories)

Respond with ONLY a JSON object: {"archetype": "<value>", "confidence": <0-1>}
No markdown, no explanation, just the JSON.`;

    const archetypeCompletion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: archetypePrompt },
        { role: 'user', content: `Classify this job description:\n\n${jdText}` },
      ],
    });

    const archetypeRaw = archetypeCompletion.choices?.[0]?.message?.content || '';
    let detectedArchetype = 'general';
    let archetypeConfidence = 0.5;

    const archetypeParsed = extractJSON(archetypeRaw);
    if (archetypeParsed?.archetype && typeof archetypeParsed.archetype === 'string') {
      const validArchetypes = [
        'llmops',
        'agentic',
        'pm',
        'sa',
        'fde',
        'transformation',
        'backend',
        'frontend',
        'data',
        'general',
      ];
      if (validArchetypes.includes(archetypeParsed.archetype)) {
        detectedArchetype = archetypeParsed.archetype;
        archetypeConfidence =
          typeof archetypeParsed.confidence === 'number' ? archetypeParsed.confidence : 0.5;
      }
    }

    // Full evaluation prompt (same as /api/evaluate)
    const systemPrompt = `You are a senior career evaluation expert. Analyze job descriptions and produce a structured evaluation with 6 blocks and 10 dimension scores.

Detected archetype: ${detectedArchetype}

Evaluate across 10 dimensions (score each 0-5): ${dimensionList}

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "archetype": "${detectedArchetype}",
  "company": "<company name from JD>",
  "role": "<role title from JD>",
  "dimensions": {
    ${weights.map((w) => `"${w.dimension}": <score 0-5>`).join(',\n    ')}
  },
  "blocks": {
    "block1": "## Role Summary\\nWhat this role does, team structure, reporting lines, key responsibilities...",
    "block2": "## CV Match Analysis\\nMatching skills, gaps, transferable experience. Be specific about which skills match and which are missing.",
    "block3": "## Level Strategy\\nIC vs manager scope, seniority positioning, what level to target and how to present yourself.",
    "block4": "## Comp Research\\nEstimated salary range, equity expectations, market comparison for this role and location.",
    "block5": "## Personalization Notes\\nWhat to emphasize in applications, which projects to highlight, key talking points for networking.",
    "block6": "## Interview Prep (STAR+R)\\n3-5 STAR+Reflection stories tailored to JD requirements. Include Situation, Task, Action, Result, and Reflection for each."
  }
}`;

    const cvSection = cv
      ? `\n\nCANDIDATE'S CV:\n${cv}`
      : '\n\n⚠️ No CV on file — add your CV in Settings for accurate match analysis';
    const profileSection = profile ? `\n\nCANDIDATE'S PROFILE:\n${profile}` : '';

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Evaluate this job description (using ${engine || 'GLM'} engine):\n\n${jdText}${cvSection}${profileSection}`,
        },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content || '';
    const parsed = extractJSON(rawOutput);

    if (!parsed) {
      return NextResponse.json(
        { error: 'Failed to parse AI evaluation response', rawOutput },
        { status: 500 }
      );
    }

    const blocks = (parsed.blocks || parsed) as Record<string, unknown>;
    const dimScores = (parsed.dimensions || {}) as Record<string, number>;
    let overallScore = 0;
    for (const w of weights) {
      overallScore += (dimScores[w.dimension] ?? 3) * w.weight;
    }
    overallScore = Math.round(overallScore * 100) / 100;

    const grade = scoreToGrade(overallScore);
    const company = (parsed.company as string) || 'Unknown';
    const role = (parsed.role as string) || 'Unknown';
    const archetype = (parsed.archetype as string) || detectedArchetype;

    // Step 3: Auto-create application if not exists (check user's applications)
    let application = await db.application.findFirst({
      where: { userId: user.id, company, role }
    });
    if (!application) {
      const maxApp = await db.application.findFirst({
        where: { userId: user.id },
        orderBy: { number: 'desc' }
      });
      const nextNumber = (maxApp?.number ?? 0) + 1;
      application = await db.application.create({
        data: {
          userId: user.id,
          number: nextNumber,
          company,
          role,
          status: 'Applied',
          score: overallScore,
          url,
          date: new Date().toISOString().split('T')[0],
          notes: `Auto-pipeline: ${grade} grade, ${archetype} archetype`,
        },
      });
    }

    // Step 4: Create evaluation report linked to application via userId+appNumber
    const report = await db.evaluationReport.create({
      data: {
        userId: user.id,
        appNumber: application.number,
        company,
        role,
        archetype,
        overallGrade: grade,
        overallScore,
        block1: (blocks.block1 as string) || '',
        block2: cv
          ? ((blocks.block2 as string) || '')
          : `⚠️ No CV on file — add your CV in Settings for accurate match analysis\n\n${(blocks.block2 as string) || ''}`,
        block3: (blocks.block3 as string) || '',
        block4: (blocks.block4 as string) || '',
        block5: (blocks.block5 as string) || '',
        block6: (blocks.block6 as string) || '',
        dimensions: JSON.stringify(dimScores),
        rawOutput,
        jdText,
      },
    });

    // Step 5: Return evaluation, application, and reportId
    const evaluation = {
      archetype,
      archetypeConfidence,
      overallGrade: grade,
      overallScore,
      dimensions: dimScores,
      blocks: {
        block1: report.block1,
        block2: report.block2,
        block3: report.block3,
        block4: report.block4,
        block5: report.block5,
        block6: report.block6,
      },
    };

    return NextResponse.json({
      evaluation,
      application: {
        number: application.number,
        company: application.company,
        role: application.role,
        status: application.status,
        score: application.score,
        url: application.url,
        location: application.location,
        salary: application.salary,
        date: application.date,
        notes: application.notes,
      },
      reportId: report.id,
    });
  } catch (error) {
    console.error('Error in auto-pipeline:', error);
    return NextResponse.json({ error: 'Auto-pipeline failed' }, { status: 500 });
  }
}
