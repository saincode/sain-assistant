// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddings } from "@/utils/embeddings";
import pLimit from "p-limit";

// Configuration
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes timeout

// --- DOCX text extraction (reads ZIP archive, extracts word/document.xml) ---

// Simple DOCX text extractor by reading ZIP entries
async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  // DOCX files are ZIP archives. We find word/document.xml and strip XML tags.
  // We implement a minimal ZIP reader to find and extract the document.xml entry.

  const EOCD_SIG = 0x06054b50;
  const LOCAL_SIG = 0x04034b50;
  const CENTRAL_SIG = 0x02014b50;

  // Find End of Central Directory
  let eocdOffset = buffer.length - 22;
  while (eocdOffset >= 0) {
    if (buffer.readUInt32LE(eocdOffset) === EOCD_SIG) break;
    eocdOffset--;
  }
  if (eocdOffset < 0) throw new Error("Not a valid ZIP/DOCX file");

  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  const numEntries = buffer.readUInt16LE(eocdOffset + 10);

  let offset = centralDirOffset;
  for (let i = 0; i < numEntries; i++) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIG)
      throw new Error("Invalid central directory");
    const filenameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const filename = buffer
      .slice(offset + 46, offset + 46 + filenameLength)
      .toString("utf8");

    if (filename === "word/document.xml") {
      // Found it — read local file header
      const localOffset = localHeaderOffset;
      if (buffer.readUInt32LE(localOffset) !== LOCAL_SIG)
        throw new Error("Invalid local file header");
      const localFilenameLen = buffer.readUInt16LE(localOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localOffset + 28);
      const compressionMethod = buffer.readUInt16LE(localOffset + 8);
      const compressedSize = buffer.readUInt32LE(localOffset + 18);
      const dataOffset =
        localOffset + 30 + localFilenameLen + localExtraLen;

      let xmlData: Buffer;
      if (compressionMethod === 0) {
        // Stored (no compression)
        xmlData = buffer.slice(dataOffset, dataOffset + compressedSize);
      } else if (compressionMethod === 8) {
        // Deflate
        const compressed = buffer.slice(
          dataOffset,
          dataOffset + compressedSize
        );
        const { inflateRawSync } = await import("zlib");
        xmlData = inflateRawSync(compressed);
      } else {
        throw new Error(
          `Unsupported compression method: ${compressionMethod}`
        );
      }

      const xml = xmlData.toString("utf8");
      // Strip XML tags, preserve paragraph breaks
      const text = xml
        .replace(/<w:p[ >]/g, "\n<w:p>") // paragraph start = newline
        .replace(/<[^>]+>/g, "") // remove all tags
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      return text;
    }

    offset += 46 + filenameLength + extraLength + commentLength;
  }
  throw new Error("word/document.xml not found in DOCX archive");
}

// --- parseDocument: handles PDF (pdf2json → pdf-parse-fork fallback), DOCX, TXT/MD ---
async function parseDocument(
  file: File
): Promise<{ text: string; parser: string }> {
  const fileType = file.name.split(".").pop()?.toLowerCase();

  // Plain text / markdown
  if (["txt", "md"].includes(fileType || "")) {
    const text = (await file.text()).replace(/\s+/g, " ").trim();
    return { text, parser: "plain-text" };
  }

  // DOCX files — proper binary extraction
  if (fileType === "docx") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromDocxBuffer(buffer);
    if (text && text.length > 50) {
      console.log("parseDocument: used docx-zip-extractor, length=", text.length);
      return { text, parser: "docx-zip-extractor" };
    }
    throw new Error("Failed to extract sufficient text from DOCX file.");
  }

  // PDF files
  if (fileType === "pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Try pdf2json first
    try {
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser();
      const txtFromPdf2json: string = await new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: unknown) =>
          reject(errData)
        );
        pdfParser.on("pdfParser_dataReady", (pdfData: {
          formImage?: { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> }
        }) => {
          try {
            const pages = pdfData?.formImage?.Pages ?? [];
            const text = pages
              .map((page) =>
                (page.Texts ?? [])
                  .map((t) =>
                    decodeURIComponent(
                      (t.R ?? []).map((r) => r.T || "").join("")
                    )
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
        console.log(
          "parseDocument: used pdf2json, length=",
          txtFromPdf2json.length
        );
        return { text: txtFromPdf2json, parser: "pdf2json" };
      }
      console.warn(
        "parseDocument: pdf2json returned small text, falling back to pdf-parse-fork"
      );
    } catch (err) {
      console.warn("parseDocument: pdf2json failed:", err);
    }

    // Fallback: pdf-parse-fork
    try {
      const pdfParseFork = require("pdf-parse-fork");
      const parsed = await pdfParseFork(buffer);
      const txt = (parsed?.text ?? "").replace(/\s+/g, " ").trim();
      if (txt.length > 50) {
        console.log(
          "parseDocument: used pdf-parse-fork, length=",
          txt.length
        );
        return { text: txt, parser: "pdf-parse-fork" };
      }
      console.warn(
        "parseDocument: pdf-parse-fork returned small text (length=" +
          txt.length +
          ")"
      );
    } catch (err) {
      console.warn("parseDocument: pdf-parse-fork failed:", err);
    }

    throw new Error(
      "Failed to extract text from PDF (no text layer found)."
    );
  }

  // Generic fallback for other file types
  const text = (await file.text()).replace(/\s+/g, " ").trim();
  return { text, parser: "plain-text" };
}

// --- splitTextIntoChunks ---
function splitTextIntoChunks(
  text: string,
  chunkSize = 1500,
  overlap = 250
): string[] {
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

    // Parse document
    const { text, parser } = await parseDocument(file);

    if (!text || text.trim().length < 50) {
      console.warn(
        "Upload rejected: extracted text length too small:",
        text?.length ?? 0,
        "parser:",
        parser
      );
      return NextResponse.json(
        {
          error: "Failed to extract sufficient text from document",
          parser,
          textSample: text?.slice(0, 500) || "",
        },
        { status: 400 }
      );
    }

    console.log("✅ Extracted text length:", text.length, "parser:", parser);

    // Chunk text
    const chunks = splitTextIntoChunks(text);
    console.log(`✂️ Split into ${chunks.length} chunks`);

    // Validate Pinecone config
    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
    if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
      throw new Error(
        "Pinecone environment variables not set (PINECONE_API_KEY or PINECONE_INDEX_NAME)"
      );
    }

    // Init Pinecone client
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Test index connection
    try {
      const description = await index.describeIndexStats();
      console.log(
        "Pinecone index stats:",
        JSON.stringify({
          dimension: description.dimension,
          totalRecords: description.totalRecordCount,
        })
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Pinecone: ${msg}`);
    }

    // Generate embeddings with concurrency limit (max 5 simultaneous requests)
    const limit = pLimit(5);
    const safeFileName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");

    const vectors = await Promise.all(
      chunks.map((chunk, i) =>
        limit(async () => {
          const embedding = await getEmbeddings(chunk);
          return {
            id: `${safeFileName}-${i}`,
            values: embedding,
            metadata: {
              text: chunk,
              fileName: file.name,
              chunkIndex: i,
              parserUsed: parser,
            },
          };
        })
      )
    );

    // Upsert in batches of 50
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 1000) : undefined;
    console.error("❌ Upload route error:", err);
    return NextResponse.json(
      { error: msg || "Internal server error", detail: stack },
      { status: 500 }
    );
  }
}
