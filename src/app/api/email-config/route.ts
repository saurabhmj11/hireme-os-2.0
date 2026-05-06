import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Fetch email configuration
export async function GET() {
  try {
    let config = await db.emailConfig.findFirst();
    if (!config) {
      config = await db.emailConfig.create({
        data: {
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPass: '',
          fromEmail: '',
          fromName: '',
          useTLS: true,
        },
      });
    }
    // Don't expose the password in the response
    return NextResponse.json({
      config: {
        ...config,
        smtpPass: config.smtpPass ? '••••••••' : '',
      },
    });
  } catch (error) {
    console.error('Error fetching email config:', error);
    return NextResponse.json({ error: 'Failed to fetch email config' }, { status: 500 });
  }
}

// PUT: Update email configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    let config = await db.emailConfig.findFirst();

    const updateData: Record<string, unknown> = {};
    if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) updateData.smtpPort = body.smtpPort;
    if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser;
    if (body.fromEmail !== undefined) updateData.fromEmail = body.fromEmail;
    if (body.fromName !== undefined) updateData.fromName = body.fromName;
    if (body.useTLS !== undefined) updateData.useTLS = body.useTLS;
    // Only update password if a new one is provided (not masked)
    if (body.smtpPass && body.smtpPass !== '••••••••') updateData.smtpPass = body.smtpPass;

    if (!config) {
      config = await db.emailConfig.create({
        data: {
          smtpHost: body.smtpHost || '',
          smtpPort: body.smtpPort || 587,
          smtpUser: body.smtpUser || '',
          smtpPass: body.smtpPass && body.smtpPass !== '••••••••' ? body.smtpPass : '',
          fromEmail: body.fromEmail || '',
          fromName: body.fromName || '',
          useTLS: body.useTLS ?? true,
        },
      });
    } else {
      config = await db.emailConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    }

    // Test connection if requested
    if (body.testConnection) {
      const testResult = await testSmtpConnection(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.useTLS);
      return NextResponse.json({
        config: { ...config, smtpPass: '••••••••' },
        testResult,
      });
    }

    return NextResponse.json({
      config: { ...config, smtpPass: '••••••••' },
    });
  } catch (error) {
    console.error('Error updating email config:', error);
    return NextResponse.json({ error: 'Failed to update email config' }, { status: 500 });
  }
}

async function testSmtpConnection(host: string, port: number, user: string, pass: string, useTLS: boolean) {
  try {
    if (!host) return { success: false, message: 'SMTP host is required' };

    // Dynamic import of nodemailer
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
      tls: useTLS ? { rejectUnauthorized: false } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    await transporter.verify();
    transporter.close();
    return { success: true, message: 'SMTP connection verified successfully' };
  } catch (error) {
    return {
      success: false,
      message: `SMTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// POST: Send a test email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, content } = body;

    const config = await db.emailConfig.findFirst();
    if (!config || !config.smtpHost || !config.fromEmail) {
      return NextResponse.json({ error: 'Email not configured. Set up SMTP in Settings first.' }, { status: 400 });
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: config.useTLS ? { rejectUnauthorized: false } : undefined,
    });

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject: subject || 'Hire Me OS Test Email',
      html: content || '<p>This is a test email from Hire Me OS 2.0 autopilot.</p>',
    });

    transporter.close();
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 });
  }
}
