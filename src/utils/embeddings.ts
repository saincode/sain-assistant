export async function getEmbeddings(text: string): Promise<number[]> {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input text for embeddings");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.EMBEDDING_MODEL || "mistralai/mistral-embed-2312";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in .env.local");
  }

  console.log(`[getEmbeddings] Using model: ${model}`);

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    console.error("❌ Embedding request failed:", json);
    throw new Error(
      `OpenRouter embedding request failed (${res.status}): ${
        json?.error?.message || JSON.stringify(json)
      }`
    );
  }

  // ✅ Extract embedding array safely
  const embedding = json?.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    console.error("❌ Invalid embedding format:", json);
    throw new Error("Invalid embedding response from OpenRouter");
  }

  return embedding;
}
