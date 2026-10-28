import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchGithubFacts, GithubError } from "@/lib/github";
import { generateJson, isMock, LlmError } from "@/lib/llm";
import { mockPortfolio, MOCK_FACTS } from "@/lib/mock";
import { groundPortfolio, PORTFOLIO_SYSTEM, portfolioPrompt } from "@/lib/prompts";
import { PortfolioSchema } from "@/lib/types";

const Body = z.object({
  username: z.string().min(1).max(100),
  resumeText: z.string().max(40000).default(""),
  targetRole: z.string().max(100).default(""),
});

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a GitHub username." }, { status: 400 });
  const { username, resumeText, targetRole } = parsed.data;
  try {
    const facts = isMock() ? MOCK_FACTS : await fetchGithubFacts(username);
    if (facts.repos.length === 0) {
      return NextResponse.json({ error: "No public, non-fork repositories found for that user." }, { status: 422 });
    }
    const raw = await generateJson(PortfolioSchema, PORTFOLIO_SYSTEM, portfolioPrompt(facts, resumeText, targetRole), () => mockPortfolio(facts));
    const portfolio = groundPortfolio(raw, facts);
    return NextResponse.json({ portfolio, repos: facts.repos.map((r) => r.name) });
  } catch (e) {
    if (e instanceof GithubError || e instanceof LlmError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
