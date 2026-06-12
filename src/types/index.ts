// Shared TypeScript types for sAIn Assistant

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  chunkCount: number;
  parserUsed: string;
}

export interface ChatResponse {
  response: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}

export interface FileStatus {
  name: string;
  status: "uploading" | "success" | "error";
}
