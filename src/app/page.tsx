
"use client";

import { useState } from 'react';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; status: 'uploading' | 'success' | 'error' } | null>(null);

  // --- Chat Message Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');
      const data = await response.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, there was an error processing your request. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  // --- File Upload Handler ---
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        setCurrentFile({ name: file.name, status: 'uploading' });

        setMessages(prev => [...prev, {
          role: 'user',
          content: `Uploading file: ${file.name}`,
        }]);

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();

          setCurrentFile({ name: file.name, status: 'success' });
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `📎 File "${file.name}" uploaded successfully! (${data.chunkCount} chunks processed)\nYou can now ask questions about this document.`,
            },
          ]);
        } catch (error) {
          console.error('Upload error:', error);
          setCurrentFile({ name: file.name, status: 'error' });
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `❌ Failed to upload "${file.name}". Please try again.`,
            },
          ]);
        } finally {
          setUploading(false);
        }
      }
    };
    input.click();
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#121212] text-white relative overflow-hidden">
      {/* No background image, just solid color as before */}
      {/* Header */}
      <div className="flex flex-col items-center justify-center px-4 py-4 border-b border-gray-700 bg-[#16181c] relative">
        {/* Robot SVG Illustration */}
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2 animate-fade-in">
          <circle cx="30" cy="30" r="28" fill="#23272f" stroke="#3b82f6" strokeWidth="2" />
          <rect x="18" y="22" width="24" height="16" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="24" cy="30" r="3" fill="#38bdf8" />
          <circle cx="36" cy="30" r="3" fill="#38bdf8" />
          <rect x="26" y="36" width="8" height="3" rx="1.5" fill="#38bdf8" />
          <rect x="28" y="14" width="4" height="8" rx="2" fill="#38bdf8" />
        </svg>
  <h1 className="text-4xl font-extrabold flex items-center gap-2 text-[#38bdf8] drop-shadow">Dora <span className="text-base text-gray-400 font-normal">AI Copilot</span></h1>
        <span className="text-xs text-gray-500 mt-1">Your friendly robot assistant</span>
      </div>

      {/* Chat Area */}
  <div className="flex-1 flex flex-col">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white/5 backdrop-blur-lg border border-gray-700 shadow-2xl rounded-2xl px-10 py-8 flex flex-col items-center animate-fade-in-up max-w-xl">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Welcome to Dora</h2>
              <p className="text-gray-300 text-lg text-center mb-2">Upload a <span className="text-blue-400 font-semibold">PDF</span> or <span className="text-green-400 font-semibold">text file</span>, or ask anything to <span className="text-cyan-400 font-semibold">Dora</span>!</p>
              <span className="text-xs text-gray-500 mt-2">Your AI copilot for documents and chat</span>
            </div>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`px-4 py-6 transition-all duration-500 animate-fade-in-up ${
                message.role === 'assistant' ? 'bg-[#1e1f24]' : 'bg-[#121212]'
              }`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="max-w-3xl mx-auto flex gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg transition-transform duration-300 ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-400'
                      : 'bg-gradient-to-br from-blue-400 via-cyan-300 to-cyan-500 ring-2 ring-cyan-300/40'
                  } hover:scale-110`}
                >
                  {message.role === 'user' ? '' : <FaRobot className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 whitespace-pre-wrap leading-relaxed text-gray-200 animate-fade-in">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="px-4 py-6 bg-[#1e1f24]">
              <div className="max-w-3xl mx-auto flex gap-4">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm">
                  A
                </div>
                <div className="flex-1 text-gray-400">Thinking...</div>
              </div>
            </div>
          )}
        </div>

        {/* Input Box */}
        <div className="border-t border-gray-800 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 bg-[#1a1b1e] rounded-xl border border-gray-700 p-2 animate-fade-in-up">
              <button
                type="button"
                onClick={handleFileUpload}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 transition-all duration-300 hover:scale-110 focus:scale-110"
                disabled={uploading}
              >
                <FiPaperclip className="h-5 w-5" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How can I help you today?"
                className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-white placeholder-gray-500 animate-fade-in"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 focus:scale-110"
              >
                <FiSend className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* Footer */}
      <footer className="w-full bg-[#18181b] text-gray-400 text-center py-3 border-t border-gray-800 text-sm">
        <div>Made by Anil Kumar &nbsp;|&nbsp; &copy; 2025 Dora AI. All rights reserved.</div>
      </footer>
    </main>
  );
}
