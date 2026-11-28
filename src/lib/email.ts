type EmailMessage = {
  to: string
  subject: string
  text: string
  html?: string
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim())
}

export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  if (!emailConfigured()) {
    console.info("Email delivery is not configured; message was not sent.")
    return { sent: false }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, ...message }),
  })

  if (!response.ok) {
    throw new Error(`Email delivery failed (HTTP ${response.status}).`)
  }
  return { sent: true }
}
