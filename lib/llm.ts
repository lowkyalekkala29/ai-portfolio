import type { z } from "zod";

/**
 * Free-by-default LLM access.
 *  - LLM_PROVIDER=gemini (default): Google AI Studio free tier. Needs GEMINI_API_KEY.
 *    Model ids get deprecated, so set GEMINI_MODEL yourself if the default stops working.
 *  - LLM_PROVIDER=openai: any OpenAI-compatible endpoint (Groq, OpenRouter, Ollama...).
 *    Needs LLM_BASE_URL, LLM_MODEL and (except Ollama) LLM_API_KEY.
 *  - MOCK_AI=1: deterministic fixtures, no network. Used for tests and demos.
 */

export class LlmError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export const isMock = () => process.env.MOCK_AI === "1";

async function callGemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new LlmError("GEMINI_API_KEY is not set. Get a free key at aistudio.google.com, or set MOCK_AI=1.", 500);
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (res.status === 429) throw new LlmError("Free-tier rate limit reached. Wait a minute and retry.", 429);
  if (!res.ok) throw new LlmError(`Gemini error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new LlmError("The model returned an empty response.");
  return text;
}

async function callOpenAICompatible(system: string, user: string): Promise<string> {
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!base || !model) throw new LlmError("Set LLM_BASE_URL and LLM_MODEL for LLM_PROVIDER=openai.", 500);
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new LlmError("Rate limit reached. Wait a minute and retry.", 429);
  if (!res.ok) throw new LlmError(`LLM error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new LlmError("The model returned an empty response.");
  return text;
}

/** Pull a JSON object out of a model reply, tolerating code fences and chatter. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new LlmError("The model did not return JSON.");
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    throw new LlmError("The model returned malformed JSON.");
  }
}

export async function generateJson<T extends z.ZodTypeAny>(
  schema: T,
  system: string,
  user: string,
  mock: () => unknown,
): Promise<z.infer<T>> {
  if (isMock()) return schema.parse(mock());
  const call = process.env.LLM_PROVIDER === "openai" ? callOpenAICompatible : callGemini;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await call(system, attempt === 0 ? user : `${user}\n\nYour previous reply was invalid: ${lastError}. Return only valid JSON matching the schema.`);
    try {
      const parsed = schema.safeParse(extractJson(raw));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "invalid";
    }
  }
  throw new LlmError(`The model's output didn't match the expected shape (${lastError}). Try again.`);
}
