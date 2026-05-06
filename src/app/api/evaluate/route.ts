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
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  // Try extracting from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // continue
    }
  }

  // Try to find raw JSON object
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
    const { jd_text, engine } = body;

    if (!jd_text) {
      return NextResponse.json({ error: 'jd_text is required' }, { status: 400 });
    }

    // 1. Read user's CV and profile from user's settings
    const cvSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'cv' } }
    });
    const profileSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'profile' } }
    });

    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';

    // 2. Read scoring weights for THIS user
    const weights = await db.scoringWeight.findMany({
      where: { userId: user.id }
    });
    const weightMap: Record<string, { label: string; weight: number }> = {};
    for (const w of weights) {
      weightMap[w.dimension] = { label: w.label, weight: w.weight };
    }

    const dimensionList = weights
      .map((w) => `${w.dimension} (${w.label}, weight: ${w.weight})`)
      .join(', ');

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // 3. First call AI to detect archetype
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
        { role: 'user', content: `Classify this job description:\n\n${jd_text}` },
      ],
    });

    const archetypeRaw = archetypeCompletion.choices?.[0]?.message?.content || '';
    let detectedArchetype = 'general';

    const archetypeParsed = extractJSON(archetypeRaw);
    if (archetypeParsed?.archetype && typeof archetypeParsed.archetype === 'string') {
      const validArchetypes = ['llmops', 'agentic', 'pm', 'sa', 'fde', 'transformation', 'backend', 'frontend', 'data', 'general'];
      if (validArchetypes.includes(archetypeParsed.archetype)) {
        detectedArchetype = archetypeParsed.archetype;
      }
    }

    // 4. Call AI with structured prompt to produce 6 blocks + 10 dimension scores
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

    const userPrompt = `Evaluate this job description (using ${engine || 'GLM'} engine):\n\n${jd_text}${cvSection}${profileSection}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content || '';

    // 5. Parse the JSON response
    const parsed = extractJSON(rawOutput);

    if (!parsed) {
      // Fallback: create a basic report from raw text
      const fallbackScore = 3.0;
      const fallbackGrade = scoreToGrade(fallbackScore);
      const report = await db.evaluationReport.create({
        data: {
          userId: user.id,
          company: 'Unknown',
          role: 'Unknown',
          archetype: detectedArchetype,
          overallGrade: fallbackGrade,
          overallScore: fallbackScore,
          block1: rawOutput,
          block2: '⚠️ Unable to parse structured evaluation. Raw output shown in Block 1.',
          block3: '',
          block4: '',
          block5: '',
          block6: '',
          dimensions: '{}',
          rawOutput,
          jdText: jd_text,
        },
      });
      return NextResponse.json({ report });
    }

    // Extract blocks - handle both flat and nested structure
    const blocks = (parsed.blocks || parsed) as Record<string, unknown>;
    const dimScores = (parsed.dimensions || {}) as Record<string, number>;
    const company = (parsed.company as string) || 'Unknown';
    const role = (parsed.role as string) || 'Unknown';
    const archetype = (parsed.archetype as string) || detectedArchetype;

    // 6. Calculate weighted overall score
    let overallScore = 0;
    for (const w of weights) {
      const s = dimScores[w.dimension] ?? 3;
      overallScore += s * w.weight;
    }
    overallScore = Math.round(overallScore * 100) / 100;

    // 7. Map to letter grade
    const overallGrade = scoreToGrade(overallScore);

    // Try to find existing application for this user by company+role
    const existingApp = await db.application.findFirst({
      where: { userId: user.id, company, role },
    });

    // 8. Save as EvaluationReport
    const report = await db.evaluationReport.create({
      data: {
        userId: user.id,
        appNumber: existingApp?.number ?? null,
        company,
        role,
        archetype,
        overallGrade,
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
        jdText: jd_text,
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error evaluating job:', error);
    return NextResponse.json({ error: 'Failed to evaluate job description' }, { status: 500 });
  }
}
