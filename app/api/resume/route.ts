import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a PDF or text file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is over 5 MB." }, { status: 413 });
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return NextResponse.json({ text: new TextDecoder().decode(bytes).slice(0, 40000) });
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const out = (Array.isArray(text) ? text.join("\n") : text).trim();
    if (!out) return NextResponse.json({ error: "No text found. Is this a scanned PDF? Paste the text instead." }, { status: 422 });
    return NextResponse.json({ text: out.slice(0, 40000) });
  } catch {
    return NextResponse.json({ error: "Couldn't read that file. Paste your resume text instead." }, { status: 422 });
  }
}
