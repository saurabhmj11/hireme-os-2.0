import { NextRequest, NextResponse } from 'next/server';
import { ARCHETYPES } from '@/lib/types';

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
    const { jd_text } = body;

    if (!jd_text) {
      return NextResponse.json({ error: 'jd_text is required' }, { status: 400 });
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const archetypeList = ARCHETYPES.map((a) => `- ${a.value}: ${a.label}`).join('\n');

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a role classification expert. Given a job description, classify the role into exactly ONE archetype from this list:
${archetypeList}

You MUST respond with ONLY a JSON object (no markdown, no code fences, no explanation):
{"archetype": "<value>", "confidence": <number between 0 and 1>}

The confidence reflects how clearly the JD matches the chosen archetype:
- 0.9-1.0: Very clear match, JD explicitly describes this archetype
- 0.7-0.9: Strong match, most responsibilities align
- 0.5-0.7: Moderate match, some ambiguity
- 0.3-0.5: Weak match, could fit multiple archetypes
- Below 0.3: Very uncertain classification`,
        },
        {
          role: 'user',
          content: `Classify this job description:\n\n${jd_text}`,
        },
      ],
    });

    const rawOutput = completion.choices?.[0]?.message?.content || '';
    const parsed = extractJSON(rawOutput);

    let archetype = 'general';
    let confidence = 0.5;

    if (parsed) {
      const validValues = ARCHETYPES.map((a) => a.value);
      const detectedArchetype =
        typeof parsed.archetype === 'string' ? parsed.archetype.toLowerCase() : '';
      if (validValues.includes(detectedArchetype)) {
        archetype = detectedArchetype;
      } else {
        // Try to find partial match
        const match = validValues.find((v) => detectedArchetype.includes(v));
        archetype = match || 'general';
      }

      if (typeof parsed.confidence === 'number') {
        confidence = Math.min(1, Math.max(0, parsed.confidence));
      }
    } else {
      // Fallback: try to extract archetype value from raw text
      const validValues = ARCHETYPES.map((a) => a.value);
      const textLower = rawOutput.toLowerCase().trim();
      const match = validValues.find((v) => textLower.includes(v));
      if (match) {
        archetype = match;
        confidence = 0.4; // Lower confidence for text-based fallback
      }
    }

    return NextResponse.json({ archetype, confidence });
  } catch (error) {
    console.error('Error detecting archetype:', error);
    return NextResponse.json({ error: 'Archetype detection failed' }, { status: 500 });
  }
}
