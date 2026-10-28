import type { GithubFacts, Portfolio, Script } from "./types";

export const MOCK_FACTS: GithubFacts = {
  username: "demo-dev",
  name: "Demo Developer",
  bio: "Frontend developer",
  profileUrl: "https://github.com/demo-dev",
  repos: [
    {
      name: "weather-dash",
      url: "https://github.com/demo-dev/weather-dash",
      description: "Weather dashboard with 5-day forecast",
      stars: 12,
      languages: ["TypeScript", "CSS"],
      topics: ["react", "weather"],
      pushedAt: "2026-09-01T00:00:00Z",
      readme: "A React dashboard that shows a 5-day forecast and saves favourite cities.",
    },
    {
      name: "todo-api",
      url: "https://github.com/demo-dev/todo-api",
      description: "REST API for tasks",
      stars: 3,
      languages: ["JavaScript"],
      topics: ["express"],
      pushedAt: "2026-08-01T00:00:00Z",
      readme: "Express REST API with JWT auth.",
    },
  ],
};

export function mockPortfolio(facts: GithubFacts): Portfolio {
  return {
    name: facts.name ?? facts.username,
    headline: "Frontend developer building clear, fast interfaces",
    about: `I'm a developer with projects on GitHub including ${facts.repos.map((r) => r.name).join(" and ")}. (Mock content: set GEMINI_API_KEY for real output.)`,
    skills: Array.from(new Set(facts.repos.flatMap((r) => r.languages))),
    projects: facts.repos.map((r) => ({
      name: r.name,
      url: r.url,
      summary: r.description ?? r.readme.slice(0, 120),
      highlights: [r.readme.slice(0, 100)].filter(Boolean),
      tech: r.languages,
    })),
    experience: [],
    education: [],
    contact: { email: "", github: facts.profileUrl, linkedin: "" },
  };
}

export function mockScript(p: Portfolio): Script {
  return {
    scenes: [
      { title: "Intro", text: `Hi, I'm ${p.name}. ${p.headline}.` },
      ...p.projects.slice(0, 2).map((x) => ({ title: x.name, text: `One project I'm proud of is ${x.name}. ${x.summary}` })),
      { title: "Close", text: "I'm looking for my first full-time role. You can find my code on GitHub. Thanks for watching." },
    ],
  };
}
