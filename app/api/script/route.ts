import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJson, LlmError } from "@/lib/llm";
import { mockScript } from "@/lib/mock";
import { SCRIPT_SYSTEM, scriptPrompt } from "@/lib/prompts";
import { PortfolioSchema, ScriptSchema } from "@/lib/types";

const Body = z.object({ portfolio: PortfolioSchema, targetRole: z.string().max(100).default("") });

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid portfolio." }, { status: 400 });
  const { portfolio, targetRole } = parsed.data;
  try {
    const script = await generateJson(ScriptSchema, SCRIPT_SYSTEM, scriptPrompt(portfolio, targetRole), () => mockScript(portfolio));
    return NextResponse.json({ script });
  } catch (e) {
    if (e instanceof LlmError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
