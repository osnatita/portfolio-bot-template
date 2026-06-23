import { Resend } from "resend";

/**
 * Emails you when a visitor leaves their email address in the chat.
 * Optional: if RESEND_API_KEY or NOTIFICATION_EMAIL are not set, it just no-ops.
 */
export async function sendEmailNotification(email: string, message: string) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL) {
    console.log("[bot] Email notification skipped (RESEND_API_KEY or NOTIFICATION_EMAIL not set)");
    return;
  }

  // Create the client lazily, only after we know the key exists, so the build
  // doesn't fail when the key is unset.
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      // "onboarding@resend.dev" works out of the box. Swap for your own verified domain.
      from: "Portfolio Bot <onboarding@resend.dev>",
      to: process.env.NOTIFICATION_EMAIL,
      subject: "New lead from your portfolio bot",
      html: `
        <h2>New lead captured</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `,
    });
    console.log("[bot] Lead notification sent for:", email);
  } catch (error) {
    console.error("[bot] Failed to send lead notification:", error);
  }
}
