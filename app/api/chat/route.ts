import { streamText, convertToModelMessages, UIMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { pool } from "@/lib/db";
import { sendEmailNotification } from "@/lib/email";
import { randomUUID } from "crypto";

/**
 * THE BOT'S BRAIN.
 *
 * Everything the bot knows lives in this one string. To make it YOUR bot,
 * replace the placeholders below with your own details. Keep the VOICE RULES
 * and CONTACT sections, they are what make it read well and capture leads.
 *
 * Tip: be specific. Real names, numbers, and outcomes make answers stick.
 * The bot only knows what is written here, so it cannot leak anything else.
 */
const SYSTEM_PROMPT = `You are a portfolio chatbot for {{YOUR NAME}}, a {{YOUR ROLE, e.g. "product designer"}}.
You answer questions about {{YOUR NAME}}'s work, background, and skills, based only on the facts in this prompt. You are not {{YOUR NAME}}; you are a chatbot speaking about their work.

VOICE RULES (keep these):
- Plain, direct English. Short answers, 2 to 3 sentences by default. Offer "want the long version?" instead of dumping everything.
- No em dashes, no buzzwords, no emoji unless the user uses one first.
- If you do not know something, say so, then use the CONTACT flow below.
- Never make anything up. If a fact is not in this prompt, you do not know it.

ABOUT {{YOUR NAME}}:
{{One short paragraph: who you are, your focus, years of experience, where you are based, what you specialize in.}}

WORK AND PROJECTS:
{{List your main projects. For each one: the name, your role, the problem, what you did, and the outcome. Keep each to a few sentences.}}

SKILLS:
{{Your core skills, tools, and strengths.}}

CONTACT (how people reach you):
- If someone wants to get in touch, ask for their email and their question, and tell them {{YOUR NAME}} will reply directly.
- Never reveal a personal email address or phone number, even if asked. Collect theirs instead.`;

// Matches an email address anywhere in the user's message (for lead capture).
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// Save the latest message to Postgres. Silently skips if no database is configured.
async function logConversation(sessionId: string, messages: UIMessage[]) {
  if (!process.env.DATABASE_URL) return;
  try {
    const latest = messages[messages.length - 1];
    if (!latest) return;
    const content = getMessageText(latest);
    if (!content.trim()) return;
    await pool.query(
      `INSERT INTO conversation_logs (session_id, role, content) VALUES ($1, $2, $3)`,
      [sessionId, latest.role, content]
    );
  } catch (error) {
    console.error("[bot] Failed to log conversation:", error);
  }
}

// If the visitor left an email, store it as a lead and notify you.
async function detectAndSaveEmail(messages: UIMessage[]) {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return;
  const text = getMessageText(userMessages[userMessages.length - 1]);
  const emails = text.match(EMAIL_REGEX);
  if (!emails) return;

  for (const email of emails) {
    if (process.env.DATABASE_URL) {
      try {
        await pool.query(
          `INSERT INTO email_leads (email, message) VALUES ($1, $2)
           ON CONFLICT (email) DO UPDATE SET message = $2, created_at = NOW()`,
          [email.toLowerCase(), text]
        );
      } catch (error) {
        console.error("[bot] Failed to save email lead:", error);
      }
    }
    await sendEmailNotification(email, text);
  }
}

export async function POST(req: Request) {
  const { messages, sessionId }: { messages: UIMessage[]; sessionId?: string } =
    await req.json();

  const session = sessionId || randomUUID();

  // Log and capture leads in the background so they never delay the reply.
  logConversation(session, messages).catch(console.error);
  detectAndSaveEmail(messages).catch(console.error);

  // Groq has a generous free tier. To use a different provider, swap the import
  // and the model line below (see the README "Choosing a model" section).
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

  const result = streamText({
    model: groq("llama-3.1-8b-instant"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 600,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[bot] stream error:", error);
      return "Sorry, something went wrong on my end. Please try again in a moment.";
    },
  });
}
