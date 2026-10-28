/**
 * Optional AI-avatar providers. Both are OFF unless their API key is in the env,
 * so the app costs nothing by default. UNTESTED against the live services
 * (no keys in the build environment) - written from the public docs.
 */

export interface VideoJob {
  id: string;
}
export interface VideoStatus {
  status: "pending" | "done" | "error";
  url?: string;
  error?: string;
}
export interface VideoProvider {
  id: "did" | "heygen";
  enabled(): boolean;
  create(input: { script: string; photoUrl?: string; photoBytes?: Buffer; photoType?: string }): Promise<VideoJob>;
  status(id: string): Promise<VideoStatus>;
}

const MAX_SCRIPT = 3000;

export const did: VideoProvider = {
  id: "did",
  enabled: () => !!process.env.DID_API_KEY,
  async create({ script, photoUrl }) {
    // D-ID needs a publicly hosted image URL.
    if (!photoUrl || !/^https:\/\//.test(photoUrl)) throw new Error("D-ID needs a public https photo URL.");
    const res = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${process.env.DID_API_KEY}` },
      body: JSON.stringify({
        source_url: photoUrl,
        script: { type: "text", input: script.slice(0, MAX_SCRIPT), provider: { type: "microsoft", voice_id: process.env.DID_VOICE_ID || "en-US-JennyNeural" } },
      }),
    });
    if (!res.ok) throw new Error(`D-ID error ${res.status}`);
    const data = (await res.json()) as { id: string };
    return { id: data.id };
  },
  async status(id) {
    const res = await fetch(`https://api.d-id.com/talks/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Basic ${process.env.DID_API_KEY}` },
    });
    if (!res.ok) return { status: "error", error: `D-ID error ${res.status}` };
    const d = (await res.json()) as { status: string; result_url?: string };
    if (d.status === "done") return { status: "done", url: d.result_url };
    if (d.status === "error" || d.status === "rejected") return { status: "error", error: "D-ID could not render the video." };
    return { status: "pending" };
  },
};

export const heygen: VideoProvider = {
  id: "heygen",
  enabled: () => !!process.env.HEYGEN_API_KEY && !!process.env.HEYGEN_VOICE_ID,
  async create({ script, photoBytes, photoType }) {
    if (!photoBytes) throw new Error("HeyGen needs an uploaded photo.");
    const key = process.env.HEYGEN_API_KEY as string;
    const up = await fetch("https://upload.heygen.com/v1/talking_photo", {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": photoType || "image/jpeg" },
      body: new Uint8Array(photoBytes),
    });
    if (!up.ok) throw new Error(`HeyGen upload error ${up.status}`);
    const photoId = ((await up.json()) as { data: { talking_photo_id: string } }).data.talking_photo_id;
    const res = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: "talking_photo", talking_photo_id: photoId },
            voice: { type: "text", input_text: script.slice(0, MAX_SCRIPT), voice_id: process.env.HEYGEN_VOICE_ID },
            background: { type: "color", value: "#ffffff" },
          },
        ],
        dimension: { width: 1280, height: 720 },
      }),
    });
    if (!res.ok) throw new Error(`HeyGen error ${res.status}`);
    return { id: ((await res.json()) as { data: { video_id: string } }).data.video_id };
  },
  async status(id) {
    const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(id)}`, {
      headers: { "X-Api-Key": process.env.HEYGEN_API_KEY as string },
    });
    if (!res.ok) return { status: "error", error: `HeyGen error ${res.status}` };
    const d = ((await res.json()) as { data: { status: string; video_url?: string } }).data;
    if (d.status === "completed") return { status: "done", url: d.video_url };
    if (d.status === "failed") return { status: "error", error: "HeyGen could not render the video." };
    return { status: "pending" };
  },
};

export const providers: Record<string, VideoProvider> = { did, heygen };
