import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || `Gharpayy <${SMTP_USER}>`;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[EMAIL] SMTP not configured — skipping email send. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendInvitationEmail(
  to: string,
  name: string,
  loginEmail: string,
  password: string,
  role: string,
  loginUrl?: string
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const url = loginUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const authUrl = `${url}/auth`;

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background:#18181b;padding:32px 24px;text-align:center;">
          <div style="display:inline-block;width:40px;height:40px;border-radius:12px;background:#f97316;line-height:40px;text-align:center;">
            <span style="color:#fff;font-weight:bold;font-size:18px;">G</span>
          </div>
          <h1 style="color:#ffffff;font-size:20px;margin:12px 0 4px;font-weight:700;">Welcome to Gharpayy</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Lead Management CRM</p>
        </div>

        <!-- Body -->
        <div style="padding:32px 24px;">
          <p style="color:#18181b;font-size:15px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 24px;">
            You have been invited to join Gharpayy as a <strong>${roleLabel}</strong>. 
            Here are your login credentials:
          </p>

          <!-- Credentials Box -->
          <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin:0 0 24px;">
            <div style="margin-bottom:12px;">
              <span style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Email</span>
              <p style="color:#18181b;font-size:14px;font-weight:600;margin:4px 0 0;">${loginEmail}</p>
            </div>
            <div>
              <span style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Password</span>
              <p style="color:#18181b;font-size:14px;font-weight:600;margin:4px 0 0;font-family:monospace;">${password}</p>
            </div>
          </div>

          <!-- CTA Button -->
          <a href="${authUrl}" style="display:block;text-align:center;background:#f97316;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:600;">
            Sign In to Gharpayy
          </a>

          <p style="color:#a1a1aa;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
            You can change your password after logging in from the login page using "Change Password".
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid #f4f4f5;padding:16px 24px;text-align:center;">
          <p style="color:#a1a1aa;font-size:11px;margin:0;">© 2026 Gharpayy. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: `Welcome to Gharpayy — Your ${roleLabel} Account`,
      html,
    });
    console.log(`[EMAIL] Invitation sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send invitation:', error);
    return false;
  }
}
