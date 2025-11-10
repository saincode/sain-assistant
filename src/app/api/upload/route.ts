// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddings } from "@/utils/embeddings";

import * as os from "os";
import * as path from "path";
import fs from "fs/promises";

// Configuration
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes timeout

// --- parseDocument: pdf2json -> pdf-parse-fork (fallback) -> plain text for .txt/.md ---
async function parseDocument(file: File): Promise<{ text: string; parser: string }> {
  const fileType = file.name.split(".").pop()?.toLowerCase();

  // Plain text for .txt/.md
  if (["txt", "md"].includes(fileType || "")) {
    const text = (await file.text()).replace(/\s+/g, " ").trim();
    return { text, parser: "plain-text" };
  }

  // Use pdf2json for PDFs
  if (fileType === "pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser();
      const txtFromPdf2json: string = await new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData?.parserError || errData));
        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
          try {
            const pages = pdfData?.formImage?.Pages ?? [];
            const text = pages
              .map((page: any) =>
                (page.Texts ?? [])
                  .map((t: any) =>
                    decodeURIComponent(((t.R ?? []).map((r: any) => r.T || "").join("")) || "")
                  )
                  .join(" ")
              )
              .join("\n\n")
              .replace(/\s+/g, " ")
              .trim();
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
        try {
          pdfParser.parseBuffer(buffer);
        } catch (e) {
          reject(e);
        }
      });
      if (txtFromPdf2json && txtFromPdf2json.length > 50) {
        console.log("parseDocument: used pdf2json, length=", txtFromPdf2json.length);
        return { text: txtFromPdf2json, parser: "pdf2json" };
      } else {
        console.warn("parseDocument: pdf2json returned small text (length=" + (txtFromPdf2json?.length ?? 0) + "), falling back to pdf-parse-fork");
      }
    } catch (err) {
      console.warn("parseDocument: pdf2json failed, err:", err);
    }
    // Fallback: pdf-parse-fork
    try {
      const pdfParseFork = require("pdf-parse-fork");
      const parsed = await pdfParseFork(buffer);
      const txt = (parsed?.text ?? "").replace(/\s+/g, " ").trim();
      if (txt.length > 50) {
        console.log("parseDocument: used pdf-parse-fork, length=", txt.length);
        return { text: txt, parser: "pdf-parse-fork" };
      }
      console.warn("parseDocument: pdf-parse-fork returned small text (length=" + txt.length + ")");
    } catch (err) {
      console.warn("parseDocument: pdf-parse-fork failed, err:", err);
    }
    throw new Error("Failed to extract text from PDF (no text layer and no fallback succeeded).");
  }

  // Fallback for other file types
  const text = (await file.text()).replace(/\s+/g, " ").trim();
  return { text, parser: "plain-text" };
}

// --- splitTextIntoChunks ---
function splitTextIntoChunks(text: string, chunkSize = 1500, overlap = 250): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (chunk.length > 0) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

// --- Main upload route ---
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("📄 Processing file:", file.name);

    // parse document (returns text + parser used)
    const { text, parser } = await parseDocument(file);

    if (!text || text.trim().length < 50) {
      console.warn("Upload rejected: extracted text length too small:", text?.length ?? 0, "parser:", parser);
      return NextResponse.json(
        { error: "Failed to extract sufficient text from document", parser, textSample: text?.slice(0, 500) || "" },
        { status: 400 }
      );
    }

    console.log("✅ Extracted text length:", text.length, "parser:", parser);

    // chunk text
    const chunks = splitTextIntoChunks(text);
    console.log(`✂️ Split into ${chunks.length} chunks`);

    // validate Pinecone config
    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
    if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
      throw new Error("Pinecone environment variables not set (PINECONE_API_KEY or PINECONE_INDEX_NAME)");
    }

    // init Pinecone client
    console.log('Starting Pinecone initialization with key:', PINECONE_API_KEY.substring(0, 10) + '...');
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    console.log('Initializing Pinecone index:', PINECONE_INDEX_NAME);
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    // Test index connection
    try {
      const description = await index.describeIndexStats();
      console.log('Pinecone index stats:', JSON.stringify(description));
    } catch (error: any) {
      console.error('Error connecting to Pinecone:', error);
      throw new Error(`Failed to connect to Pinecone: ${error?.message || 'Unknown error'}`);
    }

    // generate embeddings and upsert in batches
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        const embedding = await getEmbeddings(chunk); // expects Promise<number[]>
        return {
          id: `${file.name.replace(/\s+/g, "_")}-${i}`,
          values: embedding,
          metadata: {
            text: chunk,
            fileName: file.name,
            chunkIndex: i,
            parserUsed: parser,
          },
        };
      })
    );

    const batchSize = 50;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(`📤 Uploaded batch ${Math.floor(i / batchSize) + 1}`);
    }

    return NextResponse.json({
      success: true,
      message: `File "${file.name}" uploaded successfully with ${chunks.length} chunks.`,
      parserUsed: parser,
      chunkCount: chunks.length,
    });
  } catch (err: any) {
    console.error("❌ Upload route error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error", detail: err?.stack?.slice?.(0, 1000) },
      { status: 500 }
    );
  }
}
