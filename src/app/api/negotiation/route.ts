import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appNumber, engine, offerDetails } = body;

    if (!appNumber) {
      return NextResponse.json({ error: 'appNumber is required' }, { status: 400 });
    }

    const app = await db.application.findUnique({ where: { number: appNumber } });
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const report = await db.evaluationReport.findFirst({
      where: { appNumber },
      orderBy: { createdAt: 'desc' },
    });

    const cvSetting = await db.setting.findUnique({ where: { key: 'cv' } });
    const profileSetting = await db.setting.findUnique({ where: { key: 'profile' } });
    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert salary and offer negotiator. Generate practical, actionable negotiation scripts and strategies in Markdown format. You MUST include all of the following sections:

## 1. Salary Negotiation Framework
- Specific phrases to use when discussing salary
- Anchoring strategy with exact numbers
- How to respond to lowball offers
- Market data-driven counter arguments

## 2. Geographic Discount Pushback
- How to push back on location-based salary adjustments
- Scripts for remote work compensation fairness
- Data-driven arguments against geographic discounts

## 3. Competing Offer Leverage
- How to create and use competing offers effectively
- Professional language for referencing other opportunities
- Timing strategy for maximum leverage

## 4. Equity Negotiation Tips
- Understanding equity types (options, RSUs, etc.)
- Key questions to ask about equity
- Negotiation scripts for equity components
- Vesting schedule considerations

## 5. Benefits & Perks Negotiation
- Non-salary items to negotiate
- Professional scripts for each benefit category

## 6. Communication Templates
- Email templates for each stage of negotiation
- Phone call scripts with suggested responses

Be specific, actionable, and personalized. Use the candidate's CV, profile, and evaluation data to tailor the advice. Include exact phrases and scripts the candidate can use verbatim.`,
        },
        {
          role: 'user',
          content: `Generate negotiation scripts for:

**Company:** ${app.company}
**Role:** ${app.role}
**Location:** ${app.location || 'Not specified'}
**Current Salary Data:** ${app.salary || 'Not specified'}
**Application Status:** ${app.status}
${offerDetails ? `**Offer Details:** ${offerDetails}` : '**No offer details yet — generate preemptive negotiation preparation**'}

${report ? `**Evaluation Insights:**
- Overall Grade: ${report.overallGrade}, Score: ${report.overallScore}/5
- Archetype: ${report.archetype}
- Comp Research: ${report.block4}
- Level Strategy: ${report.block3}` : '**No evaluation report available**'}

${cv ? `**Candidate CV:**\n${cv.substring(0, 2000)}` : '**No CV on file**'}
${profile ? `**Candidate Profile:**\n${profile.substring(0, 1000)}` : ''}

Engine: ${engine || 'GLM'}`,
        },
      ],
    });

    const scripts = completion.choices?.[0]?.message?.content || '';
    return NextResponse.json({ scripts, result: scripts });
  } catch (error) {
    console.error('Error in negotiation:', error);
    return NextResponse.json({ error: 'Negotiation script generation failed' }, { status: 500 });
  }
}
