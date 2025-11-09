import { Pinecone } from "@pinecone-database/pinecone";

export async function deleteChunksByChunkIndex(chunkIndex: number) {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!apiKey || !indexName) throw new Error("Pinecone API key or index name not set");

  const pinecone = new Pinecone({ apiKey });
  const index = pinecone.index(indexName);

  // Query for all vectors with chunkIndex = 232
  // Pinecone's delete API can filter by metadata
  await index.deleteMany({
    filter: { chunkIndex },
  });
}
