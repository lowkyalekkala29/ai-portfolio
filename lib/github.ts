import type { GithubFacts, RepoFact } from "./types";

const API = "https://api.github.com";
const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

export class GithubError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export function parseUsername(input: string): string {
  const trimmed = input.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/.*$/, "").replace(/^@/, "");
  if (!USERNAME_RE.test(trimmed)) throw new GithubError("That doesn't look like a valid GitHub username.", 400);
  return trimmed;
}

function headers(accept = "application/vnd.github+json"): HeadersInit {
  const h: Record<string, string> = { Accept: accept, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ai-portfolio" };
  // Free personal access token raises the limit from 60 to 5000 requests/hour.
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) throw new GithubError("GitHub user or repo not found.", 404);
  if (res.status === 403 || res.status === 429) {
    throw new GithubError("GitHub rate limit hit. Add a free GITHUB_TOKEN to .env.local, or try again later.", 429);
  }
  if (!res.ok) throw new GithubError(`GitHub returned ${res.status}.`);
  return (await res.json()) as T;
}

async function readme(owner: string, repo: string, max: number): Promise<string> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/readme`, {
    headers: headers("application/vnd.github.raw+json"),
    cache: "no-store",
  });
  if (!res.ok) return "";
  return (await res.text()).slice(0, max);
}

interface RawRepo {
  name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  topics?: string[];
  pushed_at: string;
}

/** Pick the repos worth showing: own, not archived, ranked by stars then recency. */
export function selectRepos(repos: RawRepo[], limit: number): RawRepo[] {
  return repos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || +new Date(b.pushed_at) - +new Date(a.pushed_at))
    .slice(0, limit);
}

export async function fetchGithubFacts(usernameInput: string, limit = 6): Promise<GithubFacts> {
  const username = parseUsername(usernameInput);
  const user = await gh<{ login: string; name: string | null; bio: string | null; html_url: string }>(`/users/${username}`);
  const all = await gh<RawRepo[]>(`/users/${username}/repos?per_page=100&sort=pushed`);
  const chosen = selectRepos(all, limit);

  const repos: RepoFact[] = await Promise.all(
    chosen.map(async (r) => {
      const [langs, rd] = await Promise.all([
        gh<Record<string, number>>(`/repos/${username}/${r.name}/languages`).catch(() => ({}) as Record<string, number>),
        readme(username, r.name, 3000).catch(() => ""),
      ]);
      return {
        name: r.name,
        url: r.html_url,
        description: r.description,
        stars: r.stargazers_count,
        languages: Object.entries(langs).sort((a, b) => b[1] - a[1]).map(([l]) => l).slice(0, 5),
        topics: r.topics ?? [],
        pushedAt: r.pushed_at,
        readme: rd,
      };
    }),
  );

  return { username: user.login, name: user.name, bio: user.bio, profileUrl: user.html_url, repos };
}
