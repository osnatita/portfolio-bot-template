# Portfolio Bot

A small, customizable AI chatbot for your portfolio site. Visitors (recruiters, clients, fellow designers) can ask questions about your work and get instant, on-brand answers. It optionally logs conversations and captures email leads.

Built with Next.js, the Vercel AI SDK, and Groq (free tier). Deploys to Vercel in a few minutes.

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

```bash
git clone https://github.com/YOUR_USERNAME/portfolio-bot.git
cd portfolio-bot
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

1. Create a free Postgres database (e.g. [Neon](https://neon.tech)).
2. Run `schema.sql` against it (the Neon dashboard has a SQL editor).
3. Set `DATABASE_URL` in your environment.

Then every message is logged to `conversation_logs`, and any email a visitor types is saved to `email_leads`. Query them with the snippets at the bottom of `schema.sql`.

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
