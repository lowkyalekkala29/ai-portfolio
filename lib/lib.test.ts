import { describe, expect, it } from "vitest";
import { esc, exportHtml, safeUrl } from "./export";
import { parseUsername, selectRepos } from "./github";
import { extractJson } from "./llm";
import { MOCK_FACTS, mockPortfolio } from "./mock";
import { groundPortfolio } from "./prompts";

describe("github", () => {
  it("parses usernames and urls", () => {
    expect(parseUsername("https://github.com/octocat/hello")).toBe("octocat");
    expect(parseUsername("@octocat")).toBe("octocat");
    expect(() => parseUsername("bad name!")).toThrow();
  });
  it("drops forks/archived and ranks by stars", () => {
    const r = (name: string, stars: number, fork = false, archived = false) => ({
      name, html_url: "", description: null, fork, archived, stargazers_count: stars, pushed_at: "2026-01-01T00:00:00Z",
    });
    expect(selectRepos([r("a", 1), r("b", 5), r("c", 9, true), r("d", 7, false, true)], 5).map((x) => x.name)).toEqual(["b", "a"]);
  });
});

describe("llm json", () => {
  it("extracts fenced and chatty json", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson("no json")).toThrow();
  });
});

describe("grounding", () => {
  it("drops invented projects and overwrites urls", () => {
    const p = mockPortfolio(MOCK_FACTS);
    p.projects.push({ name: "made-up", url: "https://evil.example", summary: "x", highlights: [], tech: [] });
    p.projects[0].url = "https://wrong.example";
    const g = groundPortfolio(p, MOCK_FACTS);
    expect(g.projects.map((x) => x.name)).toEqual(["weather-dash", "todo-api"]);
    expect(g.projects[0].url).toBe("https://github.com/demo-dev/weather-dash");
  });
});

describe("export safety", () => {
  it("escapes html and blocks bad urls", () => {
    expect(esc('<img src=x onerror="a()">')).not.toContain("<img");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    const p = mockPortfolio(MOCK_FACTS);
    p.name = "<script>alert(1)</script>";
    p.projects[0].url = "javascript:alert(1)";
    p.contact.email = '"><script>x</script>';
    const html = exportHtml(p, "javascript:alert(1)");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
  });
});
