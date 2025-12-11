import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddings } from "@/utils/embeddings";

// --- Load environment variables ---
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
const CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL || "mistralai/mistral-7b-instruct";
const PINECONE_KEY = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX = process.env.PINECONE_INDEX_NAME!;

if (!OPENROUTER_KEY)
  console.warn("⚠️ Missing OPENROUTER_API_KEY in .env.local");
if (!PINECONE_KEY)
  console.warn("⚠️ Missing PINECONE_API_KEY in .env.local");
if (!PINECONE_INDEX)
  console.warn("⚠️ Missing PINECONE_INDEX_NAME in .env.local");

// --- Chat Route Handler ---
export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: "Empty question" },
        { status: 400 }
      );
    }

    console.log("🧠 New question received:", question);

    // 1️⃣ Generate embedding for the user’s question
    const qEmb = await getEmbeddings(question);

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
      .map((m: any, i: number) => `Chunk ${i + 1}:\n${m.metadata?.text ?? ""}`)
      .join("\n\n");

    // 3️⃣ Build prompt for OpenRouter
    const prompt = `
You are a helpful AI assistant that answers questions using the provided document context.
If the answer isn't in the document, say: "I couldn’t find relevant information in the document."

Context:
${context}

Question:
${question}

Answer:
`;

    // 4️⃣ Call OpenRouter Chat API
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    const txt = await res.text();

    if (!res.ok) {
      console.error("❌ OpenRouter error response:", txt);
      throw new Error(`OpenRouter chat failed: ${res.status} — ${txt}`);
    }

    const data = JSON.parse(txt);
    const answer =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "No answer generated.";

    // 5️⃣ Return AI answer
    return NextResponse.json({ response: answer });
  } catch (err: any) {
    console.error("❌ Chat route error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
