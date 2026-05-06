import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const body = await request.json();
    const { jdTexts, engine } = body;

    if (!jdTexts || !Array.isArray(jdTexts) || jdTexts.length === 0) {
      return NextResponse.json({ error: 'jdTexts array is required' }, { status: 400 });
    }

    const cvSetting = await db.setting.findUnique({ where: { key: 'cv' } });
    const profileSetting = await db.setting.findUnique({ where: { key: 'profile' } });
    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';
    const weights = await db.scoringWeight.findMany();
    const dimensionList = weights
      .map((w) => `${w.dimension} (${w.label}, weight: ${w.weight})`)
      .join(', ');

    const results: Array<{
      company: string;
      role: string;
      grade: string;
      score: number;
      reportId: string;
      error?: string;
    }> = [];

    for (const jdText of jdTexts) {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();

        const systemPrompt = `You are a senior career evaluation expert. Analyze the JD and return ONLY valid JSON (no markdown, no code fences) in this format:
{
  "archetype": "<one of: llmops, agentic, pm, sa, fde, transformation, backend, frontend, data, general>",
  "company": "<company name>",
  "role": "<role title>",
  "dimensions": { ${weights.map((w) => `"${w.dimension}": <0-5>`).join(', ')} },
  "blocks": {
    "block1": "## Role Summary\\n...",
    "block2": "## CV Match Analysis\\n...",
    "block3": "## Level Strategy\\n...",
    "block4": "## Comp Research\\n...",
    "block5": "## Personalization Notes\\n...",
    "block6": "## Interview Prep (STAR+R)\\n..."
  }
}
Dimensions: ${dimensionList}`;

        const cvSec = cv
          ? `\n\nCANDIDATE'S CV:\n${cv}`
          : '\n\n⚠️ No CV on file — add your CV in Settings for accurate match analysis';
        const profSec = profile ? `\n\nCANDIDATE'S PROFILE:\n${profile}` : '';

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Evaluate (${engine || 'GLM'}):\n\n${jdText}${cvSec}${profSec}`,
            },
          ],
        });

        const rawOutput = completion.choices?.[0]?.message?.content || '';
        const parsed = extractJSON(rawOutput);

        if (!parsed) {
          results.push({
            company: 'Unknown',
            role: 'Unknown',
            grade: 'F',
            score: 0,
            reportId: '',
            error: 'Failed to parse AI response',
          });
          continue;
        }

        const blocks = (parsed.blocks || parsed) as Record<string, unknown>;
        const dimScores = (parsed.dimensions || {}) as Record<string, number>;
        let overallScore = 0;
        for (const w of weights) {
          overallScore += (dimScores[w.dimension] ?? 3) * w.weight;
        }
        overallScore = Math.round(overallScore * 100) / 100;

        const company = (parsed.company as string) || 'Unknown';
        const role = (parsed.role as string) || 'Unknown';
        const archetype = (parsed.archetype as string) || 'general';
        const grade = scoreToGrade(overallScore);

        // Try to link to existing application
        const existingApp = await db.application.findFirst({ where: { company, role } });

        const report = await db.evaluationReport.create({
          data: {
            appNumber: existingApp?.number ?? null,
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

        results.push({
          company,
          role,
          grade,
          score: overallScore,
          reportId: report.id,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({
          company: 'Unknown',
          role: 'Unknown',
          grade: 'F',
          score: 0,
          reportId: '',
          error: `Failed to evaluate: ${errorMsg}`,
        });
      }
    }

    return NextResponse.json({ results, total: jdTexts.length });
  } catch (error) {
    console.error('Error in batch:', error);
    return NextResponse.json({ error: 'Batch processing failed' }, { status: 500 });
  }
}
