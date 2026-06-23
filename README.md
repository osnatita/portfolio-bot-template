# Portfolio Bot

A small, customizable AI chatbot for your portfolio site. Visitors (recruiters, clients, fellow designers) can ask questions about your work and get instant, on-brand answers. It optionally logs conversations and captures email leads.

Built with Next.js, the Vercel AI SDK, and Groq (free tier). Deploys to Vercel in a few minutes.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fosnatita%2Fportfolio-bot-template&env=GROQ_API_KEY&envDescription=Free%20Groq%20API%20key&envLink=https%3A%2F%2Fconsole.groq.com%2Fkeys)

> One-click deploy sets up the app and asks for your `GROQ_API_KEY`. After it's live, edit the system prompt (see below) to make it yours.

---

## How it works

The whole bot is one idea: a **system prompt** that contains everything the bot knows about you, sent to a language model on every message.

```
Visitor types a question
        │
        ▼
/api/chat  (app/api/chat/route.ts)
        │   1. (optional) log the message to Postgres
        │   2. (optional) if the message contains an email, save it as a lead + email you
        │   3. send your system prompt + the conversation to the model
        ▼
Model streams a short, on-brand answer back to the chat UI (app/page.tsx)
```

- **Frontend:** `app/page.tsx`, a single-file chat UI using the AI SDK's `useChat` hook. Styling is in `app/globals.css`.
- **Backend:** `app/api/chat/route.ts`, a Next.js route handler that streams the model's reply.
- **The bot's knowledge:** the `SYSTEM_PROMPT` string at the top of `route.ts`. This is the only place the bot's facts live, so it can't leak anything you don't put there.
- **Data layer (optional):** `lib/db.ts` (Postgres) and `lib/email.ts` (Resend). Both are skipped automatically if you don't set their environment variables.

## Tech stack

| Piece | What it does |
|---|---|
| [Next.js](https://nextjs.org) (App Router) | The app and the API route |
| [Vercel AI SDK](https://ai-sdk.dev) | Streaming chat, model abstraction |
| [Groq](https://groq.com) | The language model (fast, free tier) |
| [Postgres](https://neon.tech) (optional) | Conversation logs + email leads |
| [Resend](https://resend.com) (optional) | Emails you when someone leaves their address |

---

## Quick start

### 1. Clone and install

Use the green **"Use this template"** button on GitHub to make your own copy, or clone directly:

```bash
git clone https://github.com/osnatita/portfolio-bot-template.git
cd portfolio-bot-template
npm install
```

### 2. Add your Groq key

```bash
cp .env.example .env.local
```

Get a free key at [console.groq.com/keys](https://console.groq.com/keys) and put it in `.env.local`:

```
GROQ_API_KEY=gsk_your_key_here
```

That is the only required variable. The database and email pieces are optional (see below).

### 3. Make it yours

Open `app/api/chat/route.ts` and replace the `{{placeholders}}` in `SYSTEM_PROMPT` with your real bio, projects, and skills. Be specific: names, numbers, and outcomes make the answers good.

Then open `app/page.tsx` and edit the three constants at the top (`BOT_NAME`, `PORTFOLIO_URL`, `SUGGESTED`).

<details>
<summary><strong>Example: what a filled-in prompt looks like</strong></summary>

For a fictional designer, so you can see the shape:

```
You are a portfolio chatbot for Sam Rivera, a product designer.

ABOUT Sam Rivera:
Product designer with 8 years in fintech and health apps, based in Lisbon.
Specializes in onboarding flows and design systems.

WORK AND PROJECTS:
- PayFlow onboarding: redesigned the signup flow for a payments app. Led
  research and UI. Drop-off fell by about a third.
- ClinicOS design system: built the component library for a clinic tool,
  now used across 6 product teams.

SKILLS:
User research, interaction design, design systems, Figma, prototyping.

CONTACT:
If someone wants to reach Sam, ask for their email and their question, and
tell them Sam will reply directly. Never reveal Sam's own email.
```

</details>

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask it something.

### 5. Deploy

Push to GitHub, then import the repo at [vercel.com/new](https://vercel.com/new). Add `GROQ_API_KEY` (and any optional variables) under **Settings → Environment Variables**, and deploy. Every push to `main` redeploys automatically.

---

## Choosing a model

The template uses Groq's `llama-3.1-8b-instant`, which is fast and has a generous free tier. Groq's free tier has per-day token limits, so a long system prompt uses up your daily budget faster. Keep the prompt focused.

To switch providers, install the SDK package and change two lines in `route.ts`. The Vercel AI SDK makes the rest identical.

```ts
// Groq (default)
import { createGroq } from "@ai-sdk/groq";
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
// model: groq("llama-3.1-8b-instant")  or  groq("llama-3.3-70b-versatile")

// OpenAI  (npm i @ai-sdk/openai)
import { createOpenAI } from "@ai-sdk/openai";
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
// model: openai("gpt-4o-mini")

// Anthropic  (npm i @ai-sdk/anthropic)
import { createAnthropic } from "@ai-sdk/anthropic";
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// model: anthropic("claude-haiku-4-5")
```

Groq is free but rate-limited. OpenAI and Anthropic are paid (cheap) and have no small daily cap, so they suit higher traffic. Pick whatever fits your budget and volume.

---

## Optional: logging and lead capture

Both are off by default. Turn them on by setting the matching environment variables.

### Conversation logs + leads (Postgres)

If you deploy on Vercel, the easiest path is Vercel's built-in Postgres (Neon). This is how the original was set up:

1. In your Vercel project, open the **Storage** tab → **Create Database** → **Neon (Postgres)**.
2. Vercel provisions the database and **automatically injects the connection variables into every environment** (`DATABASE_URL`, plus extras like `POSTGRES_URL`, `PGHOST`, etc.). You don't copy anything by hand. This template reads `DATABASE_URL`.
3. Open the query editor (Vercel's Storage tab, or the Neon dashboard) and paste in [`schema.sql`](schema.sql) to create the two tables.

Prefer to do it manually or deploy elsewhere? Create any Postgres database (Neon, Supabase, Railway, your own), run `schema.sql`, and set `DATABASE_URL` yourself.

Either way you get two tables:
- **`conversation_logs`** — one row per message: `session_id`, `role`, `content`, `created_at`.
- **`email_leads`** — one row per captured email: `email`, `message`, `created_at`.

**To read your logs**, run SQL in the Neon (or Vercel Storage) query editor:

```sql
SELECT * FROM conversation_logs ORDER BY created_at DESC;
SELECT * FROM email_leads ORDER BY created_at DESC;
```

### Lead notification emails (Resend)

1. Get a [Resend](https://resend.com) API key.
2. Set `RESEND_API_KEY` and `NOTIFICATION_EMAIL`.

Now you get an email whenever someone leaves their address in the chat.

---

## Customization tips

- **Keep answers short.** The system prompt tells the bot to default to 2-3 sentences. Long answers cost more tokens and read worse.
- **Add a contact flow.** The template prompt asks visitors for their email instead of revealing yours. Leave that in.
- **Style it.** All the visual styling lives in `app/globals.css` under the `.pbot-*` classes.

## License

MIT. See [LICENSE](LICENSE). Use it, change it, ship it.
