import { z } from "zod";

/** Facts fetched from GitHub. The LLM may only talk about what is in here. */
export interface RepoFact {
  name: string;
  url: string;
  description: string | null;
  stars: number;
  languages: string[];
  topics: string[];
  pushedAt: string;
  readme: string; // truncated
}

export interface GithubFacts {
  username: string;
  name: string | null;
  bio: string | null;
  profileUrl: string;
  repos: RepoFact[];
}

export const ProjectSchema = z.object({
  name: z.string().min(1),
  url: z.string().default(""),
  summary: z.string().min(1),
  highlights: z.array(z.string()).max(5).default([]),
  tech: z.array(z.string()).max(10).default([]),
});

export const PortfolioSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  about: z.string().min(1),
  skills: z.array(z.string()).max(30).default([]),
  projects: z.array(ProjectSchema).max(8),
  experience: z
    .array(
      z.object({
        role: z.string(),
        org: z.string().default(""),
        period: z.string().default(""),
        points: z.array(z.string()).max(5).default([]),
      }),
    )
    .max(6)
    .default([]),
  education: z.array(z.string()).max(4).default([]),
  contact: z
    .object({
      email: z.string().default(""),
      github: z.string().default(""),
      linkedin: z.string().default(""),
    })
    .default({ email: "", github: "", linkedin: "" }),
});
export type Portfolio = z.infer<typeof PortfolioSchema>;

export const ScriptSchema = z.object({
  scenes: z
    .array(z.object({ title: z.string(), text: z.string().min(1) }))
    .min(2)
    .max(8),
});
export type Script = z.infer<typeof ScriptSchema>;

export const scriptToText = (s: Script) => s.scenes.map((x) => x.text).join("\n\n");
