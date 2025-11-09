"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  FileUp,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Paperclip,
  PlusIcon,
  Code2,
  Palette,
  Layers,
  Rocket,
} from "lucide-react";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`; // reset first
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chat, setChat] = useState<Array<{ type: 'text' | 'file' | 'assistant'; content: string }>>([]);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  // File upload handler
  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.txt,.md";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!response.ok) throw new Error("Upload failed");
          let backendMsg = '';
          try {
            const data = await response.json();
            if (data && data.chunkCount) {
              backendMsg = `File processed! ${data.chunkCount} chunks created.`;
            } else if (data && data.message) {
              backendMsg = data.message;
            } else {
              backendMsg = 'File uploaded and processed.';
            }
          } catch {
            backendMsg = 'File uploaded and processed.';
          }
          setChat((prev) => [
            ...prev,
            { type: 'file', content: file.name },
            { type: 'assistant', content: backendMsg },
          ]);
        } catch (error) {
          alert("Failed to upload file. Please try again.");
        } finally {
          setUploading(false);
        }
      }
    };
    input.click();
  };

  // Send text handler
  const handleSend = async () => {
    if (!message.trim()) return;
    setChat((prev) => [
      ...prev,
      { type: 'text', content: message },
    ]);
    setMessage("");
    adjustHeight(true);
  };

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex flex-col items-center"
      style={{
        backgroundImage:
          "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Centered AI Title */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-white drop-shadow-sm">
            Dora
          </h1>
          <p className="mt-2 text-neutral-200">
            Upload a PDF or text file, or ask anything to Dora!
          </p>
        </div>
      </div>

      {/* Chat Display */}
      <div className="w-full max-w-3xl flex flex-col gap-2 items-center mb-4">
        {chat.length > 0 && (
          <div className="w-full flex flex-col gap-2 mt-4">
            {chat.map((item, idx) => (
              <div key={idx} className={
                item.type === 'assistant'
                  ? 'flex items-center gap-2 bg-green-900/60 rounded-lg px-4 py-2'
                  : 'flex items-center gap-2 bg-black/60 rounded-lg px-4 py-2'
              }>
                {item.type === 'file' ? (
                  <span className="text-blue-400 font-medium flex items-center gap-1">
                    <Paperclip className="w-4 h-4 inline" />
                    Uploaded: {item.content}
                  </span>
                ) : item.type === 'assistant' ? (
                  <span className="text-green-200">{item.content}</span>
                ) : (
                  <span className="text-white">{item.content}</span>
                )}
              </div>
            ))}
          </div>
        )}
      <div className="w-full max-w-3xl mb-[20vh]">
        <div className="relative bg-black/60 backdrop-blur-md rounded-xl border border-neutral-700">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            placeholder="Type your request..."
            className={cn(
              "w-full px-4 py-3 resize-none border-none",
              "bg-transparent text-white text-sm",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-400 min-h-[48px]"
            )}
            style={{ overflow: "hidden" }}
            disabled={uploading}
          />

          {/* Footer Buttons */}
          <div className="flex items-center justify-between p-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-neutral-700"
              onClick={handleFileUpload}
              disabled={uploading}
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSend}
                disabled={uploading || !message.trim()}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  !message.trim() || uploading
                    ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>

        {/* No Quick Actions for Dora */}
      </div>
    </div>
  );
}

export default RuixenMoonChat;

