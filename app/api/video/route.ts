import { NextRequest, NextResponse } from "next/server";
import { providers } from "@/lib/video";

const MAX_PHOTO = 5 * 1024 * 1024;

/** GET /api/video -> which avatar providers are configured. GET ?provider=&id= -> job status. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider");
  const id = searchParams.get("id");
  if (!provider || !id) {
    return NextResponse.json({ providers: Object.values(providers).map((p) => ({ id: p.id, enabled: p.enabled() })) });
  }
  const p = providers[provider];
  if (!p || !p.enabled()) return NextResponse.json({ error: "Provider not configured." }, { status: 400 });
  return NextResponse.json(await p.status(id));
}

/** POST multipart: provider, script, consent=true, photo (file) or photoUrl. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const p = providers[String(form.get("provider"))];
  if (!p || !p.enabled()) {
    return NextResponse.json({ error: "No avatar provider is configured. Use the free options in the guide." }, { status: 400 });
  }
  if (form.get("consent") !== "true") {
    return NextResponse.json({ error: "Confirm that the photo is of you, or that you have permission to use it." }, { status: 400 });
  }
  const script = String(form.get("script") ?? "").trim();
  if (!script) return NextResponse.json({ error: "Script is empty." }, { status: 400 });
  const photo = form.get("photo");
  let photoBytes: Buffer | undefined;
  let photoType: string | undefined;
  if (photo instanceof File) {
    if (photo.size > MAX_PHOTO || !/^image\/(jpeg|png)$/.test(photo.type)) {
      return NextResponse.json({ error: "Photo must be a JPEG or PNG under 5 MB." }, { status: 400 });
    }
    photoBytes = Buffer.from(await photo.arrayBuffer());
    photoType = photo.type;
  }
  try {
    const job = await p.create({ script, photoBytes, photoType, photoUrl: String(form.get("photoUrl") ?? "") || undefined });
    return NextResponse.json({ provider: p.id, id: job.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Video request failed." }, { status: 502 });
  }
}
