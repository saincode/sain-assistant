import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddings } from "@/utils/embeddings";

export const dynamic = "force-dynamic";

// Ordered list of fallback models to try when rate limited
const FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-4-31b-it:free",
];

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userQuestion: string
): Promise<{ text: string; modelUsed: string } | null> {
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
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  const txt = await res.text();

  if (!res.ok) {
    const parsed = JSON.parse(txt).error?.code;
    // Rate limited — signal caller to try fallback
    if (res.status === 429 || parsed === 429) {
      console.warn(`⚠️ Model ${model} rate limited, will try fallback.`);
      return null;
    }
    throw new Error(`OpenRouter error (${res.status}): ${txt}`);
  }

  const data = JSON.parse(txt);
  const answer =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    "No answer generated.";

  return { text: answer, modelUsed: model };
}

// --- Chat Route Handler ---
export async function POST(req: NextRequest) {
  try {
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    const PINECONE_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_INDEX = process.env.PINECONE_INDEX_NAME;

    // Primary model from env, falling back to our list
    const primaryModel =
      process.env.OPENROUTER_CHAT_MODEL || FALLBACK_MODELS[0];

    if (!OPENROUTER_KEY || !PINECONE_KEY || !PINECONE_INDEX) {
      console.error("❌ Missing environment variables:", {
        hasOR: !!OPENROUTER_KEY,
        hasPC: !!PINECONE_KEY,
        hasIndex: !!PINECONE_INDEX,
      });
      return NextResponse.json(
        { error: "Server configuration missing" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // Extract last user message
    const lastMessage = messages[messages.length - 1];
    const question = lastMessage?.content?.trim();

    if (!question) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }

    console.log("🧠 New question received:", question);

    // 1️⃣ Generate embedding for the user's question
    let qEmb: number[];
    try {
      qEmb = await getEmbeddings(question);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("❌ Embedding failed:", msg);
      return NextResponse.json(
        { error: `Embedding failed: ${msg}` },
        { status: 500 }
      );
    }

    // 2️⃣ Query Pinecone for relevant chunks
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

    // 3️⃣ Build prompt
    const systemPrompt = context
      ? `You are a helpful AI assistant that answers questions using the provided document context.
If the answer isn't clearly in the context, say so honestly but try to help with what you know.

Document Context:
${context}`
      : `You are a helpful AI assistant called sAIn. No document has been uploaded yet. Encourage the user to upload a PDF, DOCX, or TXT document using the paperclip button, then ask questions about it. You can also answer general questions.`;

    // 4️⃣ Call OpenRouter with fallback chain
    console.log(`🚀 Calling OpenRouter with model: ${primaryModel}`);

    // Build the ordered list: primary model first, then fallbacks (skip duplicates)
    const modelsToTry = [
      primaryModel,
      ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
    ];

    let result: { text: string; modelUsed: string } | null = null;
    let lastError = "";

    for (const model of modelsToTry) {
      try {
        result = await callOpenRouter(
          OPENROUTER_KEY,
          model,
          systemPrompt,
          question
        );
        if (result !== null) {
          console.log(`✅ Response from model: ${result.modelUsed}`);
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`❌ Model ${model} failed:`, lastError);
        break; // Non-rate-limit error, stop trying
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          error:
            "All AI models are temporarily rate-limited. Please wait a moment and try again.",
          detail: lastError,
        },
        { status: 503 }
      );
    }

    // 5️⃣ Return AI answer
    return NextResponse.json({ response: result.text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Chat route error:", err);
    return NextResponse.json(
      { error: msg || "Internal server error" },
      { status: 500 }
    );
  }
}
