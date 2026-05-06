/**
 * Email Notification Sender
 *
 * Sends email notifications for all Hire Me OS events:
 * - Auto-apply confirmations
 * - New job matches found
 * - Follow-up reminders
 * - Cycle completion summaries
 * - Error alerts
 *
 * Uses the SMTP config from the EmailConfig table.
 * Falls back gracefully if SMTP is not configured.
 */

import { db } from './db';

interface NotificationEmail {
  to: string;
  subject: string;
  html: string;
  type: 'auto_apply' | 'job_match' | 'follow_up' | 'cycle_complete' | 'error';
}

/**
 * Send an email notification using the configured SMTP server.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendNotificationEmail(email: NotificationEmail): Promise<boolean> {
  try {
    const emailConfig = await db.emailConfig.findFirst();
    if (!emailConfig?.smtpHost || !emailConfig?.fromEmail) {
      console.log('[NotifyEmail] SMTP not configured — skipping email send');
      return false;
    }

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

    await transporter.sendMail({
      from: `"${emailConfig.fromName || 'Hire Me OS'}" <${emailConfig.fromEmail}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
    });

    transporter.close();
    console.log(`[NotifyEmail] Sent ${email.type} email to ${email.to}`);
    return true;
  } catch (error) {
    console.error('[NotifyEmail] Failed to send email:', error instanceof Error ? error.message : 'Unknown');
    return false;
  }
}

/**
 * Build HTML email for different notification types
 */
export function buildNotificationHTML(type: string, data: Record<string, unknown>): string {
  const baseStyles = `
    <body style="margin:0;padding:0;background:#1e1e2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#181825;border:1px solid #313244;border-radius:12px;overflow:hidden;">
  `;

  const headerColor: Record<string, string> = {
    auto_apply: '#34d399',
    job_match: '#38bdf8',
    follow_up: '#fbbf24',
    cycle_complete: '#2dd4bf',
    error: '#f87171',
  };

  const headerEmoji: Record<string, string> = {
    auto_apply: '🚀',
    job_match: '🎯',
    follow_up: '📧',
    cycle_complete: '✅',
    error: '⚠️',
  };

  const color = headerColor[type] || '#38bdf8';
  const emoji = headerEmoji[type] || '🔔';

  let body = '';

  switch (type) {
    case 'auto_apply':
      body = `
        <h2 style="color:${color};margin:0;">${emoji} Auto-Applied to Job</h2>
        <p style="color:#cdd6f4;font-size:16px;margin:12px 0 0;">
          Hire Me OS automatically applied to a job matching your criteria:
        </p>
        <div style="background:#11111b;border:1px solid #313244;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="color:#cdd6f4;margin:0 0 8px;font-size:16px;"><strong>${data.company || 'Company'}</strong></p>
          <p style="color:#a6adc8;margin:0 0 8px;">${data.role || 'Role'}</p>
          <p style="color:${color};margin:0;font-size:14px;">Score: ${data.score || 'N/A'}/5 | Grade: ${data.grade || 'N/A'}</p>
          ${data.url ? `<a href="${data.url}" style="color:#89b4fa;text-decoration:none;font-size:14px;">View Job Posting →</a>` : ''}
        </div>
        <p style="color:#a6adc8;font-size:14px;margin:0;">
          ${data.summary || 'This application was automatically created based on your auto-apply threshold.'}
        </p>
      `;
      break;

    case 'job_match':
      body = `
        <h2 style="color:${color};margin:0;">${emoji} New Job Match Found</h2>
        <p style="color:#cdd6f4;font-size:16px;margin:12px 0 0;">
          A new job matches your profile but didn't meet your auto-apply threshold:
        </p>
        <div style="background:#11111b;border:1px solid #313244;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="color:#cdd6f4;margin:0 0 8px;font-size:16px;"><strong>${data.company || 'Company'}</strong></p>
          <p style="color:#a6adc8;margin:0 0 8px;">${data.role || 'Role'}</p>
          <p style="color:${color};margin:0;font-size:14px;">Score: ${data.score || 'N/A'}/5 | Grade: ${data.grade || 'N/A'}</p>
          ${data.url ? `<a href="${data.url}" style="color:#89b4fa;text-decoration:none;font-size:14px;">View & Apply →</a>` : ''}
        </div>
        <p style="color:#a6adc8;font-size:14px;margin:0;">
          ${data.summary || 'Review this match and decide if you want to apply manually.'}
        </p>
      `;
      break;

    case 'follow_up':
      body = `
        <h2 style="color:${color};margin:0;">${emoji} Follow-Up Reminder</h2>
        <p style="color:#cdd6f4;font-size:16px;margin:12px 0 0;">
          It's time to follow up on your application:
        </p>
        <div style="background:#11111b;border:1px solid #313244;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="color:#cdd6f4;margin:0 0 8px;font-size:16px;"><strong>${data.company || 'Company'}</strong></p>
          <p style="color:#a6adc8;margin:0 0 8px;">${data.role || 'Role'}</p>
          <p style="color:#a6adc8;margin:0;font-size:14px;">Status: ${data.status || 'Applied'}</p>
        </div>
        <p style="color:#a6adc8;font-size:14px;margin:0;">
          Go to the Follow-Ups tab in Hire Me OS to generate and send a follow-up email.
        </p>
      `;
      break;

    case 'cycle_complete':
      body = `
        <h2 style="color:${color};margin:0;">${emoji} Cycle Complete</h2>
        <p style="color:#cdd6f4;font-size:16px;margin:12px 0 0;">
          Autopilot cycle finished successfully:
        </p>
        <div style="background:#11111b;border:1px solid #313244;border-radius:8px;padding:16px;margin:16px 0;">
          <table style="width:100%;color:#cdd6f4;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#38bdf8;">🔍 Scanned</td><td style="text-align:right;padding:6px 0;font-weight:bold;">${data.scannedJobs || 0} jobs</td></tr>
            <tr><td style="padding:6px 0;color:#2dd4bf;">🧠 Evaluated</td><td style="text-align:right;padding:6px 0;font-weight:bold;">${data.evaluatedJobs || 0} jobs</td></tr>
            <tr><td style="padding:6px 0;color:#34d399;">🚀 Auto-Applied</td><td style="text-align:right;padding:6px 0;font-weight:bold;">${data.autoAppliedJobs || 0} jobs</td></tr>
            <tr><td style="padding:6px 0;color:#fbbf24;">📧 Follow-Ups</td><td style="text-align:right;padding:6px 0;font-weight:bold;">${data.followUpsScheduled || 0}</td></tr>
            <tr><td style="padding:6px 0;color:#a6adc8;">⏱ Duration</td><td style="text-align:right;padding:6px 0;">${data.duration ? `${Math.round(Number(data.duration) / 1000)}s` : 'N/A'}</td></tr>
          </table>
        </div>
        <p style="color:#a6adc8;font-size:14px;margin:0;">
          Triggered by: ${data.triggeredBy || 'auto'} | Next cycle runs automatically.
        </p>
      `;
      break;

    case 'error':
      body = `
        <h2 style="color:${color};margin:0;">${emoji} Autopilot Error</h2>
        <p style="color:#cdd6f4;font-size:16px;margin:12px 0 0;">
          An error occurred during the autopilot cycle:
        </p>
        <div style="background:#11111b;border:1px solid #313244;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="color:#f87171;margin:0;font-size:14px;font-family:monospace;word-break:break-all;">${data.error || 'Unknown error'}</p>
        </div>
        <p style="color:#a6adc8;font-size:14px;margin:0;">
          The autopilot will retry on the next cycle. Check the dashboard for details.
        </p>
      `;
      break;

    default:
      body = `
        <h2 style="color:${color};margin:0;">🔔 Hire Me OS Notification</h2>
        <p style="color:#cdd6f4;font-size:16px;margin:12px 0 0;">${data.message || 'You have a new notification.'}</p>
      `;
  }

  return `
    ${baseStyles}
      <div style="background:${color}20;padding:20px 24px;border-bottom:1px solid #313244;">
        <h1 style="color:${color};margin:0;font-size:14px;letter-spacing:1px;">HIRE ME OS 2.0</h1>
      </div>
      <div style="padding:24px;">
        ${body}
      </div>
      <div style="padding:16px 24px;background:#11111b;border-top:1px solid #313244;">
        <p style="color:#585b70;font-size:12px;margin:0;">
          Hire Me OS Autonomous Job Pipeline • 
          <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}" style="color:#89b4fa;">Open Dashboard</a>
        </p>
      </div>
    </div>
    </div>
    </body>
  `;
}

/**
 * Main function: Create a notification AND optionally send it via email.
 * Called from the scheduler worker whenever an event occurs.
 */
export async function createNotificationWithEmail(params: {
  type: string;
  title: string;
  message: string;
  link?: string;
  emailData?: Record<string, unknown>;
}): Promise<void> {
  // 1. Always create the in-app notification
  await db.notification.create({
    data: {
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || '',
    },
  });

  // 2. Check if email notification should be sent
  try {
    const config = await db.schedulerConfig.findFirst();
    if (!config || !config.notifyEmail) return; // No notification email configured

    // Check if this notification type is enabled
    const typeEnabled: Record<string, boolean> = {
      auto_apply: config.notifyOnAutoApply,
      job_match: config.notifyOnNewMatch,
      follow_up: config.notifyOnFollowUp,
      cycle_complete: config.notifyOnCycleComplete,
      error: config.notifyOnErrors,
    };

    if (!typeEnabled[params.type]) return; // This notification type is disabled

    // Check digest mode
    if (config.notifyDigestMode === 'digest') {
      // In digest mode, we just create the in-app notification
      // The digest is sent separately by the digest worker
      return;
    }

    // Instant mode — send email now
    const subject = `Hire Me OS: ${params.title}`;
    const html = buildNotificationHTML(params.type, params.emailData || {
      company: params.message.match(/at\s+(.+?)(?:\s|$)/)?.[1] || '',
      role: params.message.match(/(?:to|on)\s+(.+?)\s+at/)?.[1] || '',
      message: params.message,
      error: params.message,
    });

    await sendNotificationEmail({
      to: config.notifyEmail,
      subject,
      html,
      type: params.type as NotificationEmail['type'],
    });
  } catch (error) {
    console.error('[NotifyEmail] Error in notification email flow:', error);
    // Don't fail the notification creation if email fails
  }
}

/**
 * Send a daily digest email summarizing all notifications from the last 24 hours.
 */
export async function sendDailyDigest(): Promise<boolean> {
  try {
    const config = await db.schedulerConfig.findFirst();
    if (!config || !config.notifyEmail || config.notifyDigestMode !== 'digest') return false;

    const emailConfig = await db.emailConfig.findFirst();
    if (!emailConfig?.smtpHost || !emailConfig?.fromEmail) return false;

    // Get unread notifications from last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifications = await db.notification.findMany({
      where: {
        createdAt: { gte: yesterday },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (notifications.length === 0) return false; // Nothing to digest

    // Group by type
    const grouped: Record<string, typeof notifications> = {};
    for (const n of notifications) {
      if (!grouped[n.type]) grouped[n.type] = [];
      grouped[n.type].push(n);
    }

    const typeLabels: Record<string, string> = {
      auto_apply: '🚀 Auto-Applied',
      job_match: '🎯 New Matches',
      follow_up: '📧 Follow-Ups',
      cycle_complete: '✅ Cycles Completed',
      error: '⚠️ Errors',
    };

    const sections = Object.entries(grouped).map(([type, items]) => `
      <div style="margin-bottom:20px;">
        <h3 style="color:#cdd6f4;font-size:16px;margin:0 0 8px;">${typeLabels[type] || type} (${items.length})</h3>
        ${items.map(n => `
          <div style="background:#11111b;border:1px solid #313244;border-radius:6px;padding:10px 14px;margin-bottom:6px;">
            <p style="color:#cdd6f4;margin:0;font-size:14px;"><strong>${n.title}</strong></p>
            <p style="color:#a6adc8;margin:4px 0 0;font-size:13px;">${n.message}</p>
          </div>
        `).join('')}
      </div>
    `).join('');

    const html = `
      <body style="margin:0;padding:0;background:#1e1e2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#181825;border:1px solid #313244;border-radius:12px;overflow:hidden;">
        <div style="background:#2dd4bf20;padding:20px 24px;border-bottom:1px solid #313244;">
          <h1 style="color:#2dd4bf;margin:0;font-size:14px;letter-spacing:1px;">HIRE ME OS 2.0 DAILY DIGEST</h1>
          <p style="color:#a6adc8;margin:6px 0 0;font-size:14px;">${notifications.length} notifications in the last 24 hours</p>
        </div>
        <div style="padding:24px;">
          ${sections}
        </div>
        <div style="padding:16px 24px;background:#11111b;border-top:1px solid #313244;">
          <p style="color:#585b70;font-size:12px;margin:0;">
            Hire Me OS Autonomous Job Pipeline • 
            <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}" style="color:#89b4fa;">Open Dashboard</a>
          </p>
        </div>
      </div>
      </div>
      </body>
    `;

    return await sendNotificationEmail({
      to: config.notifyEmail,
      subject: `Hire Me OS Daily Digest: ${notifications.length} updates`,
      html,
      type: 'cycle_complete',
    });
  } catch (error) {
    console.error('[NotifyEmail] Error sending daily digest:', error);
    return false;
  }
}
