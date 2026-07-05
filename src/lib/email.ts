/**
 * Optional email delivery via Resend REST API.
 * Set RESEND_API_KEY and RESEND_FROM in env to enable.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendNotificationEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) {
      console.error("sendNotificationEmail failed:", await res.text());
    }
  } catch (err) {
    console.error("sendNotificationEmail error:", err);
  }
}
