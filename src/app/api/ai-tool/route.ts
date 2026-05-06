import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, engine, input_text } = body;

    if (!mode || !input_text) {
      return NextResponse.json({ error: 'mode and input_text are required' }, { status: 400 });
    }

    const modePrompts: Record<string, string> = {
      contacto: 'Generate a professional contact/cover letter based on the following information. Make it compelling and tailored.',
      deep: 'Perform a deep analysis of the following. Provide detailed insights, trends, and actionable recommendations.',
      training: 'Create a personalized training/learning plan based on the following career goals and current skills.',
      project: 'Suggest relevant portfolio project ideas based on the following career direction and interests.',
    };

    const systemPrompt = modePrompts[mode] || modePrompts.contacted || 'Help with the following request.';

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Using ${engine || 'GLM'} engine:\n\n${input_text}`,
        },
      ],
    });

    const result = completion.choices?.[0]?.message?.content || 'No result';
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error running AI tool:', error);
    return NextResponse.json({ error: 'Failed to run AI tool' }, { status: 500 });
  }
}
