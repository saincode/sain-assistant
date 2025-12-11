# sAIn Assistant 🧠

An AI-powered document intelligence tool that lets you upload documents and ask intelligent questions about them using semantic search and embeddings.

**Live Demo:** [https://sain-assistant.vercel.app/](https://sain-assistant.vercel.app/)

---

## ✨ Features

- 📄 **Multi-format Document Support** — Upload PDF, Word, and text files
- 🔍 **Semantic Search** — Intelligent document retrieval using vector embeddings
- 💬 **AI Chat** — Ask questions and get context-aware responses
- ⚡ **Real-time Processing** — Fast document indexing and instant answers
- 🎨 **Modern UI** — Beautiful gradient interface with smooth animations
- 🔐 **Secure** — Environment-based API key management

---

## 🛠️ Tech Stack

- **Frontend:** [Next.js 16](https://nextjs.org) with React 19 & TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **Vector Database:** [Pinecone](https://www.pinecone.io)
- **AI/Embeddings:** [OpenRouter API](https://openrouter.ai) (Mistral Embeddings & LLM)
- **Deployment:** [Vercel](https://vercel.com)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- API keys for:
  - [OpenRouter](https://openrouter.ai) (OPENROUTER_API_KEY)
  - [Pinecone](https://www.pinecone.io) (PINECONE_API_KEY)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/saincode/sain-assistant.git
cd sain-assistant
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env.local` file in the root directory:
```env
OPENROUTER_API_KEY=your_openrouter_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=sain-jarvis
OPENROUTER_CHAT_MODEL=mistralai/mistral-7b-instruct
```

4. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How It Works

1. **Upload** — Drop a document (PDF, DOCX, TXT) into the chat
2. **Process** — The app extracts text, chunks it intelligently (1500 tokens with 250 overlap)
3. **Embed** — Each chunk is converted to embeddings using Mistral
4. **Store** — Embeddings are indexed in Pinecone for fast retrieval
5. **Chat** — Ask questions → system retrieves relevant chunks → LLM generates answers

---

## 🎨 Recent Updates (v1.1.0)

### UI/UX Improvements
- ✨ New **brain + circuit** logo design for AI identity
- 🎯 Updated input field with cyan/teal theme and pill shape
- 💜 Matching purple/pink gradient send button
- 📝 Improved placeholder text: "Ask me anything..."
- 📱 **Full responsive design** for mobile, tablet, and desktop
  - Mobile-optimized padding and spacing
  - Responsive text sizes with breakpoints
  - Touch-friendly icon sizes
  - Smart header tagline (hidden on mobile)
- 🎨 Enhanced visual hierarchy with smooth animations
- ⚡ Better performance on slower networks

---

## 📱 Responsive Design

The app is fully responsive and optimized for all devices:

### Mobile (320px - 640px)
- Compact header with optimized logo size
- Adaptive spacing and padding
- Touch-friendly button sizes
- Responsive text that scales properly
- Smart placeholder text

### Tablet (641px - 1024px)
- Transitional layout with medium spacing
- Full feature visibility
- Optimized for landscape and portrait

### Desktop (1025px+)
- Full feature set with tagline
- Maximum spacing and readability
- Enhanced hover effects
- Optimal for productivity

---

```
src/
├── app/
│   ├── api/
│   │   ├── chat/           # Chat endpoint with RAG
│   │   ├── upload/         # Document upload & indexing
│   │   └── pinecone-delete/ # Vector cleanup
│   ├── page.tsx            # Main UI component
│   └── globals.css         # Global styles
├── components/ui/          # UI components (Button, Textarea, etc.)
├── lib/utils.ts            # Utility functions
├── types/                  # TypeScript definitions
└── utils/                  # Helpers (embeddings, delete chunks)
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `PINECONE_API_KEY` | Pinecone API key | `pcsk_...` |
| `PINECONE_INDEX_NAME` | Pinecone index name | `sain-jarvis` |
| `OPENROUTER_CHAT_MODEL` | LLM model to use | `mistralai/mistral-7b-instruct` |

---

## 🚢 Deployment

### Current Status
- ✅ **Live on Vercel:** https://sain-assistant.vercel.app/
- ✅ **Auto-deploys** on every push to `main` branch
- ✅ **Responsive** across all devices
- ✅ **Production-ready**

### Deploy Manually
```bash
vercel --prod
```

### Environment Variables Required
Make sure these are set in Vercel project settings:
- `OPENROUTER_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `OPENROUTER_CHAT_MODEL`

---

## 📝 API Endpoints

### POST `/api/upload`
Upload and index a document
- **Body:** FormData with `file` field
- **Response:** `{ chunkCount: number }`

### POST `/api/chat`
Send a chat message with RAG
- **Body:** `{ messages: Array<{ role: string, content: string }> }`
- **Response:** `{ response: string }`

### POST `/api/pinecone-delete`
Delete indexed chunks
- **Body:** `{ chunkIndex: string }`
- **Response:** Success status

---

## 🐛 Troubleshooting

**Issue:** "Module not found" for native dependencies
- **Solution:** Ensure you're running on Node.js runtime, not Edge. API routes use `export const dynamic = "force-dynamic"`

**Issue:** Embeddings timeout for large files
- **Solution:** Consider implementing concurrency limits for batch embeddings

**Issue:** Pinecone connection error
- **Solution:** Verify `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` in `.env.local`

---

## 📚 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 📄 License

This project is open source and available under the MIT License.

---

## 📋 Changelog

### v1.1.0 (December 11, 2025)
- 🎨 **Full responsive design** - Mobile, tablet, desktop optimized
- 🧠 **New brain + circuit logo** - Represents AI intelligence
- 🎯 **Enhanced UI** - Cyan/teal input, purple/pink send button
- 📝 **Improved UX** - Better placeholder text and spacing
- ⚡ **Better performance** - Optimized for all screen sizes
- 📱 **Touch-friendly** - Improved mobile experience

### v1.0.0 (Initial Release)
- Document upload and indexing
- AI-powered chat with semantic search
- Pinecone vector database integration
- OpenRouter API for embeddings and LLM
- Beautiful gradient UI with Tailwind CSS

---

Contributions are welcome! Feel free to:
- Report issues
- Suggest features
- Submit pull requests

---

**Built with ❤️ by [saincode](https://github.com/saincode)**
