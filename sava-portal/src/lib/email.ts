import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
}

export async function sendActivatorWelcomeEmail(
  email: string,
  callsign: string,
  password: string
): Promise<void> {
  const transporter = createTransport()
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@sava-contest.org',
    to: email,
    subject: 'Sava River Days – Activator Account Created',
    text: [
      `Dear ${callsign},`,
      '',
      'Your activator account for the Sava River Days contest portal has been created.',
      '',
      `Login URL: ${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/login`,
      `Callsign / Username: ${callsign}`,
      `Password: ${password}`,
      '',
      'Please change your password after first login.',
      '',
      '73 de Sava River Days Contest Committee',
    ].join('\n'),
  })
}
