# Project context (handoff)

@AGENTS.md

## What this is
A product that builds a developer portfolio from a GitHub username + resume, writes a
first-person video walkthrough script, and helps the user make a video of themselves
(teleprompter recording, or an AI avatar from their photo). Working name "AI Portfolio";
final product name not decided yet.

Owner: Lekkala Bhavya (github.com/lowkyalekkala29), fresher frontend dev in Chennai.
Goal: a portfolio piece for job hunting that can later earn revenue.

## Hard constraints
- **Everything must stay free** (free tiers / open source) until the product is monetized.
- Keys stay server-side. Never commit `.env.local`.
- The AI must never invent facts: only GitHub data + resume text go into prompts, and
  `groundPortfolio()` in `lib/prompts.ts` drops any project that isn't a real repo and
  overwrites URLs.
- All LLM/GitHub text in the exported HTML goes through `esc()`/`safeUrl()` in `lib/export.ts`.

## Stack and layout
Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, zod, unpdf, vitest.
Next 16 has breaking changes: read `node_modules/next/dist/docs/` before using unfamiliar APIs.
`cacheComponents` was deliberately turned off in `next.config.ts` (the app is fully dynamic).

- `lib/github.ts`: fetch the user's repos, README, and languages (`GITHUB_TOKEN` optional, free)
- `lib/llm.ts`: Gemini free tier by default; `LLM_PROVIDER=openai` for any OpenAI-compatible
  endpoint; `MOCK_AI=1` for fixtures; JSON extraction + zod validation + one retry
- `lib/prompts.ts`: system prompts, grounding pass
- `lib/export.ts`: self-contained `portfolio.html` export
- `lib/video.ts`: D-ID / HeyGen avatar adapters, OFF unless API keys are set
- `app/api/{portfolio,script,resume,video}/route.ts`: POST handlers
- `components/App.tsx`: the single-page flow; `components/Recorder.tsx`: teleprompter + MediaRecorder

## Commands
`npm run dev` · `MOCK_AI=1 npm run dev` (no keys) · `npm test` · `npm run lint` · `npm run build`

## Status (2026-10-28)
Verified: type-check, lint, build, 5 unit tests, all API routes in mock mode, PDF parsing, UI
flow in a headless browser.
**Never tested live:** GitHub API calls, Gemini calls, D-ID/HeyGen adapters (the D-ID auth
header and HeyGen status endpoint are unconfirmed). Test these first with real keys.

## Next steps (agreed direction)
1. Run with a real `GEMINI_API_KEY` + `GITHUB_TOKEN` against `lowkyalekkala29`; fix what breaks.
2. Redesign the UI so it looks like a real product, not default styling: step-by-step flow
   (details → portfolio → script → video), a full-height portfolio preview (it is currently
   cut off in a small iframe), and a stronger portfolio template.
3. Deploy free on Vercel.
4. Pick a product name (ideas floated: ShowMe.dev, Proofolio, RepoReel). Check name/domain availability.
5. Later: GitHub re-sync, multiple portfolio templates, hosted portfolio pages, then monetization.
