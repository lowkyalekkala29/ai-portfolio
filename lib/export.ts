import type { Portfolio } from "./types";

/** Every string from the LLM or GitHub goes through this before touching HTML. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) links are allowed; anything else (javascript:, data:) is dropped. */
export function safeUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function link(label: string, url: string): string {
  const safe = safeUrl(url);
  return safe ? `<a href="${esc(safe)}" rel="noopener noreferrer">${esc(label)}</a>` : "";
}

/** videoUrl: optional http(s) URL of a hosted video; local recordings are downloaded and uploaded by the user. */
export function exportHtml(p: Portfolio, videoUrl = ""): string {
  const video = safeUrl(videoUrl);
  const projects = p.projects
    .map(
      (x) => `<article><h3>${esc(x.name)}</h3><p>${esc(x.summary)}</p>${
        x.highlights.length ? `<ul>${x.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""
      }<p class="tags">${x.tech.map((t) => `<span>${esc(t)}</span>`).join("")}</p><p>${link("View code", x.url)}</p></article>`,
    )
    .join("");
  const exp = p.experience
    .map((x) => `<article><h3>${esc(x.role)}${x.org ? ` · ${esc(x.org)}` : ""}</h3><p class="muted">${esc(x.period)}</p><ul>${x.points.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></article>`)
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.name)} · Portfolio</title>
<meta name="description" content="${esc(p.headline)}">
<style>
:root{--bg:#fff;--fg:#18181b;--muted:#71717a;--card:#f4f4f5;--accent:#4f46e5}
@media(prefers-color-scheme:dark){:root{--bg:#0b0b0d;--fg:#ececf0;--muted:#a1a1aa;--card:#18181b;--accent:#a5b4fc}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:48px 20px}
h1{font-size:2.2rem;margin:0}h2{margin-top:2.5rem;border-bottom:1px solid var(--card);padding-bottom:.3rem}
.muted{color:var(--muted)}a{color:var(--accent)}
article{background:var(--card);border-radius:12px;padding:16px 20px;margin:12px 0}article h3{margin:.2rem 0}
.tags span{display:inline-block;margin:0 6px 6px 0;padding:2px 10px;border-radius:99px;border:1px solid var(--muted);font-size:.8rem}
video{width:100%;border-radius:12px;margin-top:1rem}
</style></head><body><main>
<h1>${esc(p.name)}</h1><p class="muted">${esc(p.headline)}</p>
${video ? `<video controls preload="metadata" src="${esc(video)}"></video>` : ""}
<h2>About</h2><p>${esc(p.about)}</p>
${p.skills.length ? `<h2>Skills</h2><p class="tags">${p.skills.map((s) => `<span>${esc(s)}</span>`).join("")}</p>` : ""}
<h2>Projects</h2>${projects}
${exp ? `<h2>Experience</h2>${exp}` : ""}
${p.education.length ? `<h2>Education</h2><ul>${p.education.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
<h2>Contact</h2><p>${[link("GitHub", p.contact.github), link("LinkedIn", p.contact.linkedin), p.contact.email ? `<a href="mailto:${esc(encodeURIComponent(p.contact.email).replace(/%40/g, "@"))}">${esc(p.contact.email)}</a>` : ""].filter(Boolean).join(" · ")}</p>
</main></body></html>`;
}
