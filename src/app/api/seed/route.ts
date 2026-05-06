import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { DEFAULT_WEIGHTS } from '@/lib/types';
import { requireAuth } from '@/lib/auth';

const DEMO_APPLICATIONS = [
  { number: 1, company: 'Anthropic', role: 'Senior AI Engineer', status: 'Interview', score: 4.5, url: 'https://anthropic.com/careers', location: 'San Francisco, CA', salary: '$250k-$400k', date: '2025-04-28', notes: 'Strong alignment with safety research. Had initial screen.' },
  { number: 2, company: 'OpenAI', role: 'ML Engineer', status: 'Applied', score: 4.2, url: 'https://openai.com/careers', location: 'San Francisco, CA', salary: '$230k-$380k', date: '2025-04-25', notes: 'Applied through referral. Exciting projects.' },
  { number: 3, company: 'Mistral', role: 'LLMOps Engineer', status: 'Screening', score: 3.8, url: 'https://mistral.ai/careers', location: 'Paris, France (Remote)', salary: '€120k-€180k', date: '2025-04-22', notes: 'Great European AI company. Remote option available.' },
  { number: 4, company: 'ElevenLabs', role: 'Voice AI Engineer', status: 'Offer', score: 4.0, url: 'https://elevenlabs.io/careers', location: 'New York, NY', salary: '$200k-$320k', date: '2025-04-18', notes: 'Received offer! Negotiating compensation.' },
  { number: 5, company: 'Retool', role: 'Full Stack Engineer', status: 'Rejected', score: 3.5, url: 'https://retool.com/careers', location: 'San Francisco, CA', salary: '$180k-$280k', date: '2025-04-15', notes: 'Rejected after final round. Good feedback though.' },
  { number: 6, company: 'Vercel', role: 'Developer Experience Engineer', status: 'Applied', score: 3.9, url: 'https://vercel.com/careers', location: 'Remote (US)', salary: '$170k-$260k', date: '2025-04-12', notes: 'Great DX culture. Waiting for response.' },
  { number: 7, company: 'Temporal', role: 'Platform Engineer', status: 'Waitlisted', score: 3.2, url: 'https://temporal.io/careers', location: 'Seattle, WA', salary: '$190k-$300k', date: '2025-04-10', notes: 'On waitlist after interview. May hear back.' },
  { number: 8, company: 'LangChain', role: 'Solutions Engineer', status: 'Interview', score: 4.1, url: 'https://langchain.com/careers', location: 'San Francisco, CA', salary: '$180k-$280k', date: '2025-04-08', notes: 'Scheduled for technical interview next week.' },
  { number: 9, company: 'Pinecone', role: 'Data Engineer', status: 'Rejected', score: 2.8, url: 'https://pinecone.io/careers', location: 'Tel Aviv (Remote)', salary: '$160k-$240k', date: '2025-04-05', notes: 'Not a good fit for the role they were hiring for.' },
  { number: 10, company: 'Cohere', role: 'Applied ML Scientist', status: 'Applied', score: 4.3, url: 'https://cohere.com/careers', location: 'Toronto, Canada', salary: 'C$180k-C$280k', date: '2025-04-03', notes: 'Strong research focus. Applied via website.' },
  { number: 11, company: 'n8n', role: 'Senior Backend Engineer', status: 'Screening', score: 3.6, url: 'https://n8n.io/careers', location: 'Berlin, Germany (Remote)', salary: '€100k-€150k', date: '2025-04-01', notes: 'Open-source automation platform. Interesting tech stack.' },
  { number: 12, company: 'Zapier', role: 'Automation Engineer', status: 'Applied', score: 3.4, url: 'https://zapier.com/careers', location: 'Remote (Global)', salary: '$150k-$220k', date: '2025-03-28', notes: 'Fully remote. Good WLB reputation.' },
  { number: 13, company: 'Gong', role: 'ML Platform Engineer', status: 'Rejected', score: 3.0, url: 'https://gong.io/careers', location: 'Tel Aviv / SF', salary: '$190k-$300k', date: '2025-03-25', notes: 'Role was put on hold after I applied.' },
  { number: 14, company: 'Salesforce', role: 'AI Architect', status: 'Offer', score: 4.4, url: 'https://salesforce.com/careers', location: 'Remote (US)', salary: '$220k-$350k', date: '2025-03-20', notes: 'Strong offer with great benefits. Considering.' },
  { number: 15, company: 'Dialpad', role: 'NLP Engineer', status: 'Waitlisted', score: 2.9, url: 'https://dialpad.com/careers', location: 'San Francisco, CA', salary: '$160k-$240k', date: '2025-03-15', notes: 'Waitlisted. Smaller team, interesting NLP work.' },
];

export async function POST() {
  try {
    const user = await requireAuth();
    // Clear user's existing applications
    await db.application.deleteMany({ where: { userId: user.id } });

    // Seed demo applications
    for (const app of DEMO_APPLICATIONS) {
      await db.application.create({
        data: {
          ...app,
          userId: user.id
        }
      });
    }

    // Seed default scoring weights if they don't exist for this user
    for (const w of DEFAULT_WEIGHTS) {
      await db.scoringWeight.upsert({
        where: { userId_dimension: { userId: user.id, dimension: w.dimension } },
        update: { label: w.label, weight: w.weight },
        create: { userId: user.id, dimension: w.dimension, label: w.label, weight: w.weight },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${DEMO_APPLICATIONS.length} demo applications and ${DEFAULT_WEIGHTS.length} scoring weights`,
      applicationCount: DEMO_APPLICATIONS.length,
      weightCount: DEFAULT_WEIGHTS.length,
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}
