
const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');

function loadEnv() {
  const envPath = path.resolve(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
    return false;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return true;
}

async function testConnections() {
  if (!loadEnv()) return;

  try {
    console.log('--- Testing Embedding Dimension ---');
    const model = process.env.EMBEDDING_MODEL || "mistralai/mistral-embed-2312";
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: "Hello" }),
    });
    const json = await res.json();
    if (res.ok) {
      const emb = json.data[0].embedding;
      console.log('✅ Embedding generated! Dimension:', emb.length);
    } else {
      console.error('❌ Embedding failed:', json);
    }

    console.log('\n--- Checking Pinecone Index ---');
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(process.env.PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();
    console.log('Index Dimension:', stats.dimension);
    
    if (stats.dimension !== 1024) {
      console.warn('⚠️ WARNING: Index dimension is', stats.dimension, 'but Mistral Embed usually gives 1024.');
    }

  } catch (err) {
    console.error('❌ Diagnostic error:', err.message);
  }
}

testConnections();
