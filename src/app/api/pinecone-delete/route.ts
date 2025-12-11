import { NextRequest, NextResponse } from "next/server";
import { deleteChunksByChunkIndex } from "@/utils/deleteChunks";

export async function POST(req: NextRequest) {
  try {
    const { chunkIndex } = await req.json();
    if (typeof chunkIndex !== "number") {
      return NextResponse.json({ error: "chunkIndex must be a number" }, { status: 400 });
    }
    await deleteChunksByChunkIndex(chunkIndex);
    return NextResponse.json({ success: true, message: `Deleted all Pinecone vectors with chunkIndex=${chunkIndex}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
