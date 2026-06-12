"use client";

import { useState, useRef, useEffect } from "react";
import { FiSend, FiPaperclip, FiTrash2 } from "react-icons/fi";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<{
    name: string;
    status: "uploading" | "success" | "error";
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Clear all messages
  const handleClear = () => {
    setMessages([]);
    setInput("");
    setLoading(false);
    setCurrentFile(null);
    inputRef.current?.focus();
  };

  // --- Chat Message Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Chat request failed");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ ${msg}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key (submit) and Shift+Enter (newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // --- File Upload Handler ---
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-uploaded
    e.target.value = "";

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setCurrentFile({ name: file.name, status: "uploading" });

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `📎 Uploading: ${file.name}`,
      },
    ]);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setCurrentFile({ name: file.name, status: "success" });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ **"${file.name}"** uploaded and indexed successfully!\n\n📊 **${data.chunkCount} chunks** processed using \`${data.parserUsed}\`.\n\nYou can now ask me questions about this document.`,
        },
      ]);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Upload failed";
      console.error("Upload error:", error);
      setCurrentFile({ name: file.name, status: "error" });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Failed to upload **"${file.name}"**: ${msg}`,
        },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const isDisabled = loading || uploading;

  return (
    <main className="flex min-h-screen flex-col bg-[#0d0d12] text-white relative overflow-hidden">
      {/* Subtle gradient orbs for visual interest */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-pink-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-purple-800/30 bg-gradient-to-r from-[#13151a] to-[#1a1c23] relative z-10 gap-2">
        {/* Left: Logo and Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <svg
            width="32"
            height="32"
            className="sm:w-10 sm:h-10 flex-shrink-0"
            viewBox="0 0 60 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="sAIn Brain Logo"
          >
            {/* Brain shape */}
            <path
              d="M30 8C20 8 12 16 12 26C12 32 15 37 20 40C22 35 24 30 28 28V22C28 18 29 14 30 10C31 14 32 18 32 22V28C36 30 38 35 40 40C45 37 48 32 48 26C48 16 40 8 30 8Z"
              fill="#A855F7"
              opacity="0.3"
            />
            <path
              d="M30 8C20 8 12 16 12 26C12 32 15 37 20 40C22 35 24 30 28 28V22C28 18 29 14 30 10C31 14 32 18 32 22V28C36 30 38 35 40 40C45 37 48 32 48 26C48 16 40 8 30 8Z"
              fill="none"
              stroke="#A855F7"
              strokeWidth="2"
            />
            {/* Circuit lines */}
            <line x1="20" y1="26" x2="20" y2="45" stroke="#E879F9" strokeWidth="1.5" />
            <line x1="30" y1="26" x2="30" y2="48" stroke="#E879F9" strokeWidth="1.5" />
            <line x1="40" y1="26" x2="40" y2="45" stroke="#E879F9" strokeWidth="1.5" />
            {/* Connection nodes */}
            <circle cx="20" cy="45" r="2" fill="#E879F9" />
            <circle cx="30" cy="48" r="2" fill="#E879F9" />
            <circle cx="40" cy="45" r="2" fill="#E879F9" />
            {/* Horizontal circuit line */}
            <line x1="20" y1="45" x2="40" y2="45" stroke="#E879F9" strokeWidth="1.5" />
            {/* Center synapses */}
            <circle cx="24" cy="24" r="1.5" fill="#E879F9" />
            <circle cx="30" cy="20" r="1.5" fill="#E879F9" />
            <circle cx="36" cy="24" r="1.5" fill="#E879F9" />
          </svg>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
            sAIn
          </h1>
        </div>

        {/* Center: Tagline — hidden on mobile */}
        <div
          className="hidden sm:block absolute left-1/2 transform -translate-x-1/2"
          aria-label="App tagline"
        >
          <span className="text-purple-200/70 font-medium text-sm">
            Your Intelligent Document Assistant
          </span>
        </div>

        {/* Right: file status indicator */}
        <div className="hidden sm:flex items-center gap-2 w-[140px] justify-end">
          {currentFile && (
            <div
              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                currentFile.status === "success"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : currentFile.status === "error"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
              }`}
            >
              {currentFile.status === "uploading" && (
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
              {currentFile.status === "success" && "✅"}
              {currentFile.status === "error" && "❌"}
              <span className="truncate max-w-[80px]">{currentFile.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Welcome Screen */}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-purple-950/60 via-black/80 to-pink-950/60 backdrop-blur-lg border border-purple-700/30 shadow-2xl rounded-2xl px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center animate-fade-in-up w-full max-w-xl gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center animate-pulse-glow">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 60 60"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M30 8C20 8 12 16 12 26C12 32 15 37 20 40C22 35 24 30 28 28V22C28 18 29 14 30 10C31 14 32 18 32 22V28C36 30 38 35 40 40C45 37 48 32 48 26C48 16 40 8 30 8Z"
                    fill="#A855F7"
                    opacity="0.5"
                  />
                  <path
                    d="M30 8C20 8 12 16 12 26C12 32 15 37 20 40C22 35 24 30 28 28V22C28 18 29 14 30 10C31 14 32 18 32 22V28C36 30 38 35 40 40C45 37 48 32 48 26C48 16 40 8 30 8Z"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2"
                  />
                  <line x1="20" y1="26" x2="20" y2="45" stroke="#E879F9" strokeWidth="1.5" />
                  <line x1="30" y1="26" x2="30" y2="48" stroke="#E879F9" strokeWidth="1.5" />
                  <line x1="40" y1="26" x2="40" y2="45" stroke="#E879F9" strokeWidth="1.5" />
                  <circle cx="20" cy="45" r="2" fill="#E879F9" />
                  <circle cx="30" cy="48" r="2" fill="#E879F9" />
                  <circle cx="40" cy="45" r="2" fill="#E879F9" />
                  <line x1="20" y1="45" x2="40" y2="45" stroke="#E879F9" strokeWidth="1.5" />
                  <circle cx="24" cy="24" r="1.5" fill="#E879F9" />
                  <circle cx="30" cy="20" r="1.5" fill="#E879F9" />
                  <circle cx="36" cy="24" r="1.5" fill="#E879F9" />
                </svg>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent text-center">
                Your Personal AI Assistant
              </h2>

              <p className="text-gray-300 text-base sm:text-lg text-center leading-relaxed">
                Drop your{" "}
                <span className="text-purple-400 font-medium">documents</span> or
                start a{" "}
                <span className="text-pink-400 font-medium">conversation</span> to
                explore together!
              </p>

              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {["📄 PDF", "📝 DOCX", "📃 TXT"].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-purple-900/40 border border-purple-700/40 text-purple-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-gray-500 text-xs italic text-center">
                Powered by advanced AI for seamless document analysis
              </p>
            </div>
          </div>
        )}

        {/* Message List */}
        <div
          className="flex-1 overflow-y-auto chat-scroll"
          id="chat-messages"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className="px-2 sm:px-4 py-3 sm:py-4 transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
            >
              <div
                className={`max-w-3xl mx-auto flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl ${
                  message.role === "assistant"
                    ? "bg-[#1a1b22] shadow-lg border border-purple-500/10"
                    : "bg-[#0d0d12] border border-pink-500/10"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm shadow-lg transition-all duration-300 flex-shrink-0 ${
                    message.role === "assistant"
                      ? "bg-[#0d0d12] border-2 border-purple-500"
                      : "bg-[#0d0d12] border-2 border-pink-500"
                  } hover:scale-110`}
                  aria-hidden="true"
                >
                  {message.role === "user" ? "⚡" : "⭐"}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm text-gray-200 animate-fade-in">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {/* Loading / Thinking Indicator */}
          {loading && (
            <div className="px-2 sm:px-4 py-3 sm:py-4 animate-fade-in">
              <div className="max-w-3xl mx-auto p-3 sm:p-4 rounded-xl bg-[#1a1b22] border border-purple-500/10 shadow-lg">
                <div className="flex gap-3 sm:gap-4 items-center">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0d0d12] border-2 border-purple-500 flex items-center justify-center text-sm flex-shrink-0">
                    ⭐
                  </div>
                  <div className="flex items-center gap-1.5" aria-label="Thinking...">
                    <span className="text-gray-400 text-xs sm:text-sm mr-1">
                      Thinking
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-thinking-dot" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-thinking-dot" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-thinking-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <div className="border-t border-gray-800/60 p-2 sm:p-4 bg-[#0d0d12]/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3">
            {/* Clear Button — only shown when there are messages */}
            {messages.length > 0 && (
              <div className="flex justify-end px-1">
                <button
                  onClick={handleClear}
                  type="button"
                  id="clear-chat-btn"
                  className="group px-3 sm:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs sm:text-sm border border-red-500/20 hover:border-red-500/30 shadow-md hover:shadow-red-500/10"
                  aria-label="Clear chat"
                >
                  <FiTrash2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                  <span>Clear Chat</span>
                </button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="w-full px-1" id="chat-form">
              <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-teal-950/40 rounded-full border border-cyan-500/20 p-1.5 sm:p-2 shadow-xl hover:shadow-cyan-500/5 hover:border-cyan-500/30 transition-all duration-300">
                {/* File Upload Button */}
                <button
                  type="button"
                  id="file-upload-btn"
                  onClick={handleFileUpload}
                  className="p-2 sm:p-2.5 hover:bg-cyan-500/20 rounded-full text-cyan-400 hover:text-cyan-300 transition-all duration-200 hover:scale-110 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={isDisabled}
                  aria-label="Upload document"
                  title="Upload PDF, DOCX, or TXT"
                >
                  <FiPaperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>

                {/* Text Input */}
                <input
                  ref={inputRef}
                  type="text"
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    uploading ? "Uploading document..." : "Ask me anything..."
                  }
                  className="flex-1 min-w-0 bg-transparent border-0 focus:ring-0 focus:outline-none text-cyan-100 placeholder-cyan-400/40 rounded-full px-2 sm:px-4 py-2 text-xs sm:text-sm disabled:opacity-60"
                  disabled={isDisabled}
                  autoComplete="off"
                  aria-label="Chat input"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  id="send-btn"
                  disabled={isDisabled || !input.trim()}
                  className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-purple-500/30 hover:scale-110 flex-shrink-0"
                  aria-label="Send message"
                >
                  <FiSend className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
