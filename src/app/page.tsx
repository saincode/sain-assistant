
"use client";

import { useState } from 'react';
import { FiSend, FiPaperclip, FiTrash2 } from 'react-icons/fi';
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

  // Clear all messages
  const handleClear = () => {
    setMessages([]);
    setInput('');
    setLoading(false);
    setCurrentFile(null);
  };

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
      <div className="flex items-center justify-between px-6 py-3 border-b border-purple-800/30 bg-gradient-to-r from-[#13151a] to-[#1A1C23] relative">
        {/* Left: Logo and Name */}
        <div className="flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Brain shape */}
            <path d="M30 8C20 8 12 16 12 26C12 32 15 37 20 40C22 35 24 30 28 28V22C28 18 29 14 30 10C31 14 32 18 32 22V28C36 30 38 35 40 40C45 37 48 32 48 26C48 16 40 8 30 8Z" fill="#A855F7" opacity="0.3" />
            <path d="M30 8C20 8 12 16 12 26C12 32 15 37 20 40C22 35 24 30 28 28V22C28 18 29 14 30 10C31 14 32 18 32 22V28C36 30 38 35 40 40C45 37 48 32 48 26C48 16 40 8 30 8Z" fill="none" stroke="#A855F7" strokeWidth="2" />
            
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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">sAIn</h1>
        </div>
        
        {/* Center: Tagline */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <span className="text-purple-200/70 font-medium">Your Intelligent Document Assistant</span>
        </div>
        
        {/* Right: Optional space for future buttons/menu */}
        <div className="w-[100px]"></div>
      </div>

      {/* Chat Area */}
  <div className="flex-1 flex flex-col">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-gradient-to-br from-purple-950/50 via-black/80 to-pink-950/50 backdrop-blur-lg border border-purple-800/30 shadow-2xl rounded-2xl px-10 py-8 flex flex-col items-center animate-fade-in-up max-w-xl">
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                Your Personal AI Assistant
              </h2>
              <p className="text-gray-200 text-lg text-center mb-3 leading-relaxed">
                Drop your <span className="text-purple-400 font-medium">documents</span> or start a{" "}
                <span className="text-pink-400 font-medium">conversation</span> to explore together!
              </p>
              <p className="text-gray-400 text-sm italic">
                Powered by advanced AI for seamless document analysis and interactive chat
              </p>
            </div>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`px-4 py-6 mb-4 transition-all duration-500 animate-fade-in-up`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className={`max-w-3xl mx-auto flex gap-4 p-4 rounded-xl ${
                message.role === 'assistant' 
                  ? 'bg-[#1e1f24] shadow-lg border border-purple-500/10' 
                  : 'bg-[#121212] border border-pink-500/10'
              }`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg transition-all duration-300 ${
                    message.role === 'assistant'
                      ? 'bg-[#121212] border-2 border-purple-500'
                      : 'bg-[#121212] border-2 border-pink-500'
                  } hover:scale-110 hover:shadow-lg hover:shadow-purple-500/20`}
                >
                  {message.role === 'user' ? '⚡' : '⭐'}
                </div>
                <div className="flex-1 whitespace-pre-wrap leading-relaxed text-gray-200 animate-fade-in">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="px-4 py-6">
              <div className="max-w-3xl mx-auto p-4 rounded-xl bg-[#1e1f24] border border-purple-500/10 shadow-lg">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#121212] border-2 border-purple-500 flex items-center justify-center text-sm animate-pulse">
                    ⭐
                  </div>
                  <div className="flex-1 text-gray-400">Thinking...</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Box */}
        <div className="border-t border-gray-800 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Clear Button */}
            {messages.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleClear}
                  type="button"
                  className="group px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all duration-200 flex items-center gap-2 text-sm border border-red-500/20 hover:border-red-500/30 shadow-lg hover:shadow-red-500/10"
                >
                  <FiTrash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Clear Chat</span>
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-teal-950/40 rounded-full border border-cyan-500/20 p-2 animate-fade-in-up shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
                <button
                  type="button"
                  onClick={handleFileUpload}
                  className="p-2.5 hover:bg-cyan-500/20 rounded-full text-cyan-400 hover:text-cyan-300 transition-all duration-200 hover:scale-110"
                  disabled={uploading}
                >
                  <FiPaperclip className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about your documents..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-cyan-100 placeholder-cyan-400/40 rounded-full px-4 py-2 text-sm"
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-3 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-purple-500/30 hover:scale-110"
                >
                  <FiSend className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

    </main>
  );
}
