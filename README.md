# AI Portfolio + Video Walkthrough

Enter a GitHub username and resume. Get:
1. A portfolio built from your real repos (README, languages, topics) and resume, downloadable as one static `portfolio.html`.
2. A 60-90 second first-person script grounded in that portfolio.
3. A video: a free in-browser teleprompter recorder, or an AI avatar of your photo.

Stack: Next.js 16, TypeScript, Tailwind v4, zod.

## Run it (free)
```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free) and GITHUB_TOKEN (free, no scopes)
npm run dev                  # http://localhost:3000
```
No keys? `MOCK_AI=1 npm run dev` runs with fixtures.

`npm test` runs unit tests. `npm run build` builds for production.

## How it avoids made-up content
- The prompt only contains fetched repo data and resume text, with explicit "never invent" rules.
- After generation, every project is matched to a real repo by name; unknown projects are dropped and URLs are overwritten with the real GitHub URLs.
- The exported HTML escapes all text and only allows http(s) links.
- You edit the script before recording. Review the portfolio before publishing.

## "Proper AI video" without paying
- Option A (built in): record yourself with the teleprompter. Free, private, nothing uploaded.
- Option B (free web tools): HeyGen / D-ID free plans (limited, watermarked, terms change) or open-source SadTalker with your own recorded voice.
- Option C (later, when you earn): set `DID_API_KEY` or `HEYGEN_API_KEY`; the "Direct generation" panel appears. Those adapters are **untested against the live APIs**; verify before relying on them.

## Known limits
- Gemini free tier is rate limited and Google may use free-tier data to improve products. Don't paste anything confidential.
- Unauthenticated GitHub allows 60 requests/hour; each portfolio uses about 14. Add `GITHUB_TOKEN`.
- The photo consent checkbox is an honour-system check, not identity verification.
- Scanned (image-only) PDFs are not read; paste the text.
