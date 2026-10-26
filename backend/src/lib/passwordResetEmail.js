import nodemailer from 'nodemailer';

function getEmailSettings() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM?.trim();
  const appUrl = process.env.PASSWORD_RESET_APP_URL?.trim()
    || process.env.CLIENT_ORIGIN?.split(',')[0]?.trim()
    || 'http://localhost:5173';

  if (!host || !user || !password || !from) {
    return null;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a whole number between 1 and 65535.');
  }

  let resetUrl;
  try {
    resetUrl = new URL(appUrl);
  } catch {
    throw new Error('PASSWORD_RESET_APP_URL must be a valid absolute URL.');
  }
  if (!['http:', 'https:'].includes(resetUrl.protocol)) {
    throw new Error('PASSWORD_RESET_APP_URL must use HTTP or HTTPS.');
  }

  return { host, port, user, password, from, appUrl: resetUrl.toString() };
}

export function isPasswordResetEmailConfigured() {
  const hasCredentials = Boolean(
    process.env.SMTP_HOST?.trim()
    && process.env.SMTP_USER?.trim()
    && process.env.SMTP_PASSWORD
    && process.env.EMAIL_FROM?.trim(),
  );
  if (!hasCredentials) return false;
  getEmailSettings();
  return true;
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const settings = getEmailSettings();
  if (!settings) {
    throw new Error('Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM in backend/.env.');
  }

  const resetUrl = new URL(settings.appUrl);
  resetUrl.searchParams.set('resetToken', token);
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    requireTLS: settings.port !== 465,
    auth: { user: settings.user, pass: settings.password },
  });

  await transporter.sendMail({
    from: settings.from,
    to,
    subject: 'Reset your ClientFlow password',
    text: [
      `Hi ${name},`,
      '',
      'We received a request to reset your ClientFlow password.',
      `Use this one-time link within 30 minutes: ${resetUrl.toString()}`,
      '',
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n'),
  });
}
