"use client";

import { useEffect, useState } from "react";
import Recorder from "./Recorder";
import { exportHtml } from "@/lib/export";
import { scriptToText, type Portfolio, type Script } from "@/lib/types";

const input = "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";
const btn = "rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

function download(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function App() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [resume, setResume] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [avatars, setAvatars] = useState<{ id: string; enabled: boolean }[]>([]);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [provider, setProvider] = useState("");
  const [videoState, setVideoState] = useState("");
  const [videoResult, setVideoResult] = useState("");
  const [videoHost, setVideoHost] = useState("");

  useEffect(() => {
    fetch("/api/video").then((r) => r.json()).then((d) => setAvatars(d.providers ?? [])).catch(() => {});
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  };

  async function onResumeFile(file: File | undefined) {
    if (!file) return;
    await run("Reading resume…", async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResume(data.text);
    });
  }

  const generate = () =>
    run("Reading your repos and writing your portfolio…", async () => {
      const { portfolio } = await post<{ portfolio: Portfolio }>("/api/portfolio", { username, resumeText: resume, targetRole: role });
      setPortfolio(portfolio);
      const { script } = await post<{ script: Script }>("/api/script", { portfolio, targetRole: role });
      setScriptText(scriptToText(script));
    });

  const regenScript = () =>
    run("Rewriting script…", async () => {
      if (!portfolio) return;
      const { script } = await post<{ script: Script }>("/api/script", { portfolio, targetRole: role });
      setScriptText(scriptToText(script));
    });

  const makeAvatar = () =>
    run("Starting avatar video…", async () => {
      const fd = new FormData();
      fd.append("provider", provider);
      fd.append("script", scriptText);
      fd.append("consent", String(consent));
      if (photo) fd.append("photo", photo);
      if (photoUrl) fd.append("photoUrl", photoUrl);
      const res = await fetch("/api/video", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoState("Rendering… this can take a few minutes.");
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await (await fetch(`/api/video?provider=${data.provider}&id=${encodeURIComponent(data.id)}`)).json();
        if (s.status === "done") {
          setVideoResult(s.url);
          setVideoState("Done.");
          return;
        }
        if (s.status === "error") throw new Error(s.error || "Render failed.");
      }
      throw new Error("Timed out waiting for the video.");
    });

  const enabledAvatars = avatars.filter((a) => a.enabled);

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-5 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">AI Portfolio + Video Walkthrough</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Paste your GitHub username and resume. You get a portfolio built from your real repos, a spoken script, and a video of you walking through it.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="s1">
        <h2 id="s1" className="text-xl font-medium">1. Your details</h2>
        <label className="block text-sm">GitHub username or profile URL
          <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="octocat" />
        </label>
        <label className="block text-sm">Role you&apos;re applying for (optional)
          <input className={input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Frontend developer" />
        </label>
        <label className="block text-sm">Resume (PDF or text file)
          <input type="file" accept=".pdf,.txt,.md" className="mt-1 block text-sm" onChange={(e) => onResumeFile(e.target.files?.[0])} />
        </label>
        <label className="block text-sm">…or paste resume text
          <textarea className={input} rows={5} value={resume} onChange={(e) => setResume(e.target.value)} />
        </label>
        <button className={btn} disabled={!username.trim() || !!busy} onClick={generate}>Build my portfolio</button>
        {busy && <p role="status" className="text-sm text-zinc-500">{busy}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </section>

      {portfolio && (
        <>
          <section className="space-y-3" aria-labelledby="s2">
            <h2 id="s2" className="text-xl font-medium">2. Your portfolio</h2>
            <p className="text-sm text-zinc-500">Check every line. The AI only had your repos and resume to work from, but it can still phrase things badly.</p>
            <iframe title="Portfolio preview" sandbox="" srcDoc={exportHtml(portfolio, videoHost)} className="h-[520px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700" />
            <label className="block text-sm">Hosted video URL to embed (optional, https)
              <input className={input} value={videoHost} onChange={(e) => setVideoHost(e.target.value)} placeholder="https://…/my-video.mp4" />
            </label>
            <button className={btn} onClick={() => download("portfolio.html", exportHtml(portfolio, videoHost), "text/html")}>
              Download portfolio.html
            </button>
            <p className="text-sm text-zinc-500">One self-contained file. Host it free on GitHub Pages, Netlify Drop or Cloudflare Pages.</p>
          </section>

          <section className="space-y-3" aria-labelledby="s3">
            <h2 id="s3" className="text-xl font-medium">3. Your script</h2>
            <textarea className={input} rows={10} value={scriptText} onChange={(e) => setScriptText(e.target.value)} aria-label="Video script" />
            <button className="rounded-md border border-zinc-400 px-4 py-2 text-sm" disabled={!!busy} onClick={regenScript}>Rewrite script</button>
          </section>

          <section className="space-y-3" aria-labelledby="s4">
            <h2 id="s4" className="text-xl font-medium">4. Your video</h2>
            <h3 className="font-medium">Option A: record yourself (free, private)</h3>
            <p className="text-sm text-zinc-500">Read the script off the teleprompter. Recording stays in your browser.</p>
            <Recorder text={scriptText} />

            <h3 className="pt-4 font-medium">Option B: AI avatar from your photo</h3>
            <details className="rounded-lg border border-zinc-300 p-4 text-sm dark:border-zinc-700" open={enabledAvatars.length === 0}>
              <summary className="cursor-pointer font-medium">Free ways to make one (no API key needed)</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Copy your script above.</li>
                <li>Use a free web tool such as HeyGen&apos;s or D-ID&apos;s free plan: upload your photo, paste the script, pick a voice. Free plans are limited (a few videos, lower resolution, watermark) and terms change, so check the current plan first.</li>
                <li>Or record just your voice in Option A and animate your photo with the open-source SadTalker model (free, needs a GPU such as a free Colab session).</li>
                <li>Upload the finished video anywhere that gives an https link, paste it in step 2, and re-download your portfolio.</li>
              </ol>
            </details>
            {enabledAvatars.length > 0 && (
              <div className="space-y-2 rounded-lg border border-zinc-300 p-4 text-sm dark:border-zinc-700">
                <p className="font-medium">Direct generation (uses your own provider key; may cost money)</p>
                <select className={input} value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="Provider">
                  <option value="">Choose provider</option>
                  {enabledAvatars.map((a) => <option key={a.id} value={a.id}>{a.id}</option>)}
                </select>
                <input type="file" accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                <input className={input} placeholder="Or public https photo URL (required for D-ID)" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>This is a photo of me, or I have the person&apos;s permission to make a video of them.</span>
                </label>
                <button className={btn} disabled={!provider || !consent || !!busy || !scriptText.trim()} onClick={makeAvatar}>Generate avatar video</button>
                {videoState && <p role="status">{videoState}</p>}
                {videoResult && <video src={videoResult} controls className="w-full rounded-lg" />}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
