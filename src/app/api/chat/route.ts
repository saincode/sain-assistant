import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddings } from "@/utils/embeddings";

export const dynamic = "force-dynamic";

// --- Call Google Gemini directly (primary - free, generous limits) ---
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userQuestion: string
): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userQuestion }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.warn(`⚠️ Gemini error (${res.status}):`, err);
    return null;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.warn("⚠️ Gemini returned empty response");
    return null;
  }

  console.log(`✅ Response from Gemini (${model})`);
  return text;
}

// --- OpenRouter fallback models (free tier) ---
const OPENROUTER_FALLBACKS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "qwen/qwen3-14b:free",
  "qwen/qwen3-8b:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-3-12b-it:free",
  "microsoft/phi-3-mini-128k-instruct:free",
];

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userQuestion: string
): Promise<string | null> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sain-assistant.vercel.app",
      "X-Title": "sAIn Assistant",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuestion },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  const txt = await res.text();

  if (!res.ok) {
    console.warn(`⚠️ OpenRouter model ${model} failed (${res.status})`);
    return null; // Try next model
  }

  const data = JSON.parse(txt);
  const answer =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    null;

  if (!answer) return null;

  console.log(`✅ Response from OpenRouter model: ${model}`);
  return answer;
}

// --- Chat Route Handler ---
export async function POST(req: NextRequest) {
  try {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    const PINECONE_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_INDEX = process.env.PINECONE_INDEX_NAME;

    if (!PINECONE_KEY || !PINECONE_INDEX) {
      return NextResponse.json(
        { error: "Server configuration missing (Pinecone)" },
        { status: 500 }
      );
    }

    if (!GEMINI_KEY && !OPENROUTER_KEY) {
      return NextResponse.json(
        { error: "No AI API key configured (GEMINI_API_KEY or OPENROUTER_API_KEY)" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const question = lastMessage?.content?.trim();

    if (!question) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }

    console.log("🧠 Question:", question);

    // 1️⃣ Generate embedding
    let qEmb: number[];
    try {
      qEmb = await getEmbeddings(question);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("❌ Embedding failed:", msg);
      return NextResponse.json({ error: `Embedding failed: ${msg}` }, { status: 500 });
    }

    // 2️⃣ Query Pinecone
    const pinecone = new Pinecone({ apiKey: PINECONE_KEY });
    const index = pinecone.index(PINECONE_INDEX);

    const queryRes = await index.query({
      vector: qEmb,
      topK: 5,
      includeMetadata: true,
    });

    const matches = queryRes.matches ?? [];
    console.log(`📘 Found ${matches.length} context chunks.`);

    const context = matches
      .map(
        (m: { metadata?: { text?: string } }, i: number) =>
          `Chunk ${i + 1}:\n${m.metadata?.text ?? ""}`
      )
      .join("\n\n");

    // 3️⃣ Build system prompt
    const systemPrompt = context
      ? `You are sAIn, a helpful AI assistant that answers questions using the provided document context.
If the answer isn't clearly in the context, say so honestly but try to help with what you know.

Document Context:
${context}`
      : `You are sAIn, a helpful AI assistant. No document has been uploaded yet.
Encourage the user to upload a PDF, DOCX, or TXT document using the paperclip button, then ask questions about it.
You can also answer general knowledge questions.`;

    // 4️⃣ Try Gemini first (primary — free, reliable)
    let answer: string | null = null;

    if (GEMINI_KEY) {
      console.log("🚀 Trying Gemini...");
      answer = await callGemini(GEMINI_KEY, systemPrompt, question);
    }

    // 5️⃣ Fallback to OpenRouter models
    if (!answer && OPENROUTER_KEY) {
      console.log("🔄 Falling back to OpenRouter...");
      for (const model of OPENROUTER_FALLBACKS) {
        answer = await callOpenRouter(OPENROUTER_KEY, model, systemPrompt, question);
        if (answer) break;
      }
    }

    if (!answer) {
      return NextResponse.json(
        { error: "All AI models are unavailable right now. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json({ response: answer });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Chat route error:", err);
    return NextResponse.json({ error: msg || "Internal server error" }, { status: 500 });
  }
}
