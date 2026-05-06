import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List all follow-ups
export async function GET() {
  try {
    const followUps = await db.followUp.findMany({
      orderBy: { scheduledAt: 'desc' },
    });

    // Enrich with application data
    const enriched = await Promise.all(
      followUps.map(async (fu) => {
        const app = await db.application.findUnique({ where: { number: fu.appNumber } });
        return {
          ...fu,
          company: app?.company || 'Unknown',
          role: app?.role || 'Unknown',
          appStatus: app?.status || 'Unknown',
          appUrl: app?.url || '',
        };
      })
    );

    return NextResponse.json({ followUps: enriched });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}

// POST: Generate follow-up email content using AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appNumber, type, autoSend } = body;

    if (!appNumber) {
      return NextResponse.json({ error: 'appNumber is required' }, { status: 400 });
    }

    const app = await db.application.findUnique({ where: { number: appNumber } });
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const cvSetting = await db.setting.findUnique({ where: { key: 'cv' } });
    const profileSetting = await db.setting.findUnique({ where: { key: 'profile' } });
    const cv = cvSetting?.value || '';
    const profile = profileSetting?.value || '';

    const report = await db.evaluationReport.findFirst({
      where: { appNumber },
      orderBy: { createdAt: 'desc' },
    });

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const followUpType = type || 'check_in';
    const promptMap: Record<string, string> = {
      check_in: `Write a professional follow-up email checking on the status of my application. Be polite, brief, and reiterate my interest.`,
      thank_you: `Write a thank-you email after an interview. Reference specific topics discussed and reiterate why I'm a great fit.`,
      additional_info: `Write an email providing additional information that strengthens my candidacy. Mention a recent achievement or relevant project.`,
      counter_offer: `Write a professional counter-offer email negotiating the compensation package. Be respectful but firm.`,
    };

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a professional job application follow-up email writer. Write a complete, ready-to-send email. Include subject line. Be professional, concise, and compelling. Use the candidate's CV and profile data to personalize.

${promptMap[followUpType] || promptMap.check_in}

Return the email in this format:
Subject: [subject line]

[email body]`,
        },
        {
          role: 'user',
          content: `Generate a follow-up email for:

**Company:** ${app.company}
**Role:** ${app.role}
**Location:** ${app.location || 'Not specified'}
**Status:** ${app.status}
**Applied Date:** ${app.date}
**Follow-up Type:** ${followUpType}

${report ? `**Evaluation Insights:**
- Grade: ${report.overallGrade}, Score: ${report.overallScore}/5
- Role Summary: ${report.block1?.substring(0, 200)}
- CV Match: ${report.block2?.substring(0, 200)}` : '**No evaluation report**'}

${cv ? `**My CV:**\n${cv.substring(0, 2000)}` : '**No CV on file**'}
${profile ? `**My Profile:**\n${profile.substring(0, 1000)}` : ''}`,
        },
      ],
    });

    const emailContent = completion.choices?.[0]?.message?.content || '';

    // Extract subject from content
    const subjectMatch = emailContent.match(/^Subject:\s*(.+)$/m);
    const subject = subjectMatch ? subjectMatch[1] : `Follow-up: ${app.role} at ${app.company}`;
    const bodyWithoutSubject = emailContent.replace(/^Subject:.*\n?/, '').trim();

    // Save the follow-up
    const followUp = await db.followUp.create({
      data: {
        appNumber: app.number,
        type: followUpType,
        content: emailContent,
        scheduledAt: new Date().toISOString(),
        status: 'generated',
      },
    });

    // Update application follow-up dates
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    await db.application.update({
      where: { number: app.number },
      data: {
        lastFollowUp: new Date().toISOString(),
        nextFollowUp: nextDate.toISOString(),
      },
    });

    // If autoSend is true and email is configured, actually send the email
    let emailSent = false;
    let emailError = '';
    if (autoSend) {
      try {
        const emailConfig = await db.emailConfig.findFirst();
        if (emailConfig?.smtpHost && emailConfig?.fromEmail) {
          // Find recipient - try to find recruiter/hiring manager email
          // For now, we'll generate a mailto: link as primary method
          // and attempt SMTP if configured
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.createTransport({
            host: emailConfig.smtpHost,
            port: emailConfig.smtpPort,
            secure: emailConfig.smtpPort === 465,
            auth: {
              user: emailConfig.smtpUser,
              pass: emailConfig.smtpPass,
            },
            tls: emailConfig.useTLS ? { rejectUnauthorized: false } : undefined,
          });

          // We need a "to" address — for auto-send, we need to find or use a configured address
          // This is a placeholder: in production, you'd extract recruiter email from the application data
          const toEmail = app.notes?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
          if (toEmail) {
            await transporter.sendMail({
              from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
              to: toEmail,
              subject,
              text: bodyWithoutSubject,
              html: `<pre style="font-family: inherit; white-space: pre-wrap;">${bodyWithoutSubject}</pre>`,
            });
            emailSent = true;
            transporter.close();

            // Mark as sent
            await db.followUp.update({
              where: { id: followUp.id },
              data: { status: 'sent', sentAt: new Date().toISOString() },
            });
          } else {
            emailError = 'No recipient email found for this application';
          }
        } else {
          emailError = 'SMTP not configured';
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : 'Unknown email error';
      }
    }

    // Generate mailto: link as fallback/primary method
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyWithoutSubject)}`;

    return NextResponse.json({
      followUp,
      emailContent,
      subject,
      body: bodyWithoutSubject,
      mailtoLink,
      emailSent,
      emailError,
    });
  } catch (error) {
    console.error('Error generating follow-up:', error);
    return NextResponse.json({ error: 'Follow-up generation failed' }, { status: 500 });
  }
}

// PATCH: Mark follow-up as sent
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { followUpId } = body;

    if (!followUpId) {
      return NextResponse.json({ error: 'followUpId is required' }, { status: 400 });
    }

    const followUp = await db.followUp.update({
      where: { id: followUpId },
      data: { status: 'sent', sentAt: new Date().toISOString() },
    });

    return NextResponse.json({ followUp });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
  }
}
