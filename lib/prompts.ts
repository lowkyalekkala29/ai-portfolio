import type { GithubFacts, Portfolio, Script } from "./types";

export const PORTFOLIO_SYSTEM = `You write developer portfolio content from supplied facts.
Rules:
- Use ONLY facts present in the GITHUB FACTS and RESUME TEXT. Never invent employers, dates, metrics, users, awards or technologies.
- If a number is not in the sources, do not state one.
- Each project must correspond to a repo in GITHUB FACTS (use its exact name). Describe what the README/description says it does.
- Write in first person, plain and specific, no buzzwords ("passionate", "rockstar", "cutting-edge").
- Reply with ONE JSON object only, matching:
{"name":string,"headline":string,"about":string,"skills":string[],"projects":[{"name":string,"url":string,"summary":string,"highlights":string[],"tech":string[]}],"experience":[{"role":string,"org":string,"period":string,"points":string[]}],"education":string[],"contact":{"email":string,"github":string,"linkedin":string}}`;

export function portfolioPrompt(facts: GithubFacts, resumeText: string, targetRole: string): string {
  const repos = facts.repos
    .map(
      (r) =>
        `### ${r.name} (${r.url})\nDescription: ${r.description ?? "none"}\nLanguages: ${r.languages.join(", ") || "unknown"}\nTopics: ${r.topics.join(", ") || "none"}\nStars: ${r.stars}\nREADME excerpt:\n${r.readme || "(no README)"}`,
    )
    .join("\n\n");
  return `TARGET ROLE: ${targetRole || "Software developer"}

GITHUB FACTS
Username: ${facts.username}\nName: ${facts.name ?? "unknown"}\nBio: ${facts.bio ?? "none"}
${repos}

RESUME TEXT
${resumeText.slice(0, 8000) || "(none provided)"}`;
}

export const SCRIPT_SYSTEM = `You write a spoken video walkthrough of a developer's portfolio, in first person, as the developer.
Rules:
- 4 to 6 scenes, about 150-220 spoken words in total (roughly 60-90 seconds).
- Scene 1: who I am. Middle scenes: my 2-3 strongest projects, naming what each does and the tech used, using only the supplied portfolio. Last scene: what I'm looking for and how to reach me.
- Conversational, short sentences, easy to read aloud. No URLs read out, no emojis, no markdown.
- Never add facts that are not in the portfolio JSON.
- Reply with ONE JSON object only: {"scenes":[{"title":string,"text":string}]}`;

export function scriptPrompt(p: Portfolio, targetRole: string): string {
  return `TARGET ROLE: ${targetRole || "Software developer"}\nPORTFOLIO JSON:\n${JSON.stringify(p)}`;
}

/**
 * Deterministic grounding pass: whatever the model wrote, project URLs and names
 * must come from real repos. Unknown projects are dropped; urls are overwritten.
 */
export function groundPortfolio(p: Portfolio, facts: GithubFacts): Portfolio {
  const byName = new Map(facts.repos.map((r) => [r.name.toLowerCase(), r]));
  const projects = p.projects
    .map((proj) => {
      const repo = byName.get(proj.name.toLowerCase());
      return repo ? { ...proj, name: repo.name, url: repo.url } : null;
    })
    .filter((x): x is Portfolio["projects"][number] => x !== null);
  return {
    ...p,
    projects,
    contact: { ...p.contact, github: facts.profileUrl },
  };
}

export type { Script };
