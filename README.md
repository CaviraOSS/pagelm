<div align="center">
<img width="full" height="auto" alt="neuropilot" src="https://github.com/user-attachments/assets/5f187cd5-078a-4a87-85ba-da218e81e252" />

# NeuroPilot

**An open-source AI-powered education platform that transforms study materials into interactive learning resources**

[Report Bug](https://github.com/caviraOSS/neuropilot/issues) • [Request Feature](https://github.com/caviraOSS/neuropilot/issues) • [Discord server](https://discord.gg/76QMKwj2J4)

</div>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-CaviraOSS%20Community%20License-blueviolet.svg" alt="License: CaviraOSS Community License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node.js Version"></a>
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18+-blue.svg" alt="React"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript"></a>
  <a href="https://discord.gg/76QMKwj2J4"><img alt="Discord" src="https://img.shields.io/discord/1379682804849180844?label=Discord%20server"></a>
</p>

---

## Demo

<img src=".github/neuropilot.png" alt="NeuroPilot Demo"/>

https://github.com/user-attachments/assets/98fae4ef-c2b7-4ad2-bfe9-1e0665eb4d71

<video width="100%" controls>
  <source src=".github/demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> **Note**: If the video doesn't load above, you can [download the demo video directly](.github/demo.mp4)

---

## 🚀 Features

NeuroPilot converts study material into **interactive resources** including quizzes, flashcards, structured notes, and podcasts.  
The platform provides a modern interface for students, educators, and researchers to **enhance learning efficiency** using state-of-the-art LLMs and TTS systems.

### Learning Tools

- **Contextual Chat** – Ask questions about uploaded documents (PDF, DOCX, Markdown, TXT)
- **SmartNotes** – Generate Cornell-style notes automatically from topics or uploaded content
- **Flashcards** – Extract non-overlapping flashcards for spaced repetition
- **Quizzes** – Create interactive quizzes with hints, explanations, and scoring
- **AI Podcast** – Convert notes and topics into engaging audio content for learning on the go
- **ExamLab** - Simulate any exam, get feedbacks and be prepared for the exam

### Supported AI Models

- Google Gemini • OpenAI GPT • Anthropic Claude • xAI Grok • Ollama (local) • OpenRouter

### Embedding Providers

- OpenAI • Gemini • Ollama

### Technical Highlights

- WebSocket streaming for real-time chat, notes, and podcast generation
- JSON or vector database support for embeddings and retrieval
- File-based persistent storage for generated content
- Markdown-based outputs for structured answers and notes
- Configurable multi-provider setup for LLMs and TTS engines

---

## 🛠️ Technology Stack

| Component      | Technology                               |
| -------------- | ---------------------------------------- |
| **Backend**    | Node.js, TypeScript, LangChain, Langraph |
| **Frontend**   | Vite, React, TailwindCSS                 |
| **Database**   | JSON (default), optional vector DB       |
| **AI/ML**      | Multiple LLM providers, embeddings       |
| **Audio**      | Edge TTS, ElevenLabs, Google TTS         |
| **Deployment** | Docker, Docker Compose                   |
| **Docs**       | pdf-lib, mammoth, pdf-parse              |

---

## ⚡ Getting Started

### Prerequisites

- Node.js v20+
- npm or pnpm
- ffmpeg (required for podcast audio)
- Docker (optional)

### Local Development

```bash
# Clone the repository
git clone https://github.com/caviraOSS/neuropilot.git
cd neuropilot

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment
cp .env.example .env
# configure API keys and settings

# Run backend
cd backend
npm run dev

# Run frontend
cd frontend
npm run dev
```

👉 Access at: **http://localhost:5173**

### Docker Deployment

```bash
# Development
docker compose up --build

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- Frontend: http://localhost:5173 (dev) / http://localhost:8080 (prod)
- Backend: http://localhost:5000

---

## ⚙️ Configuration

All configuration is handled via environment variables:

- **LLM Provider** – Choose your model backend
- **TTS Engine** – Select speech service for podcasts
- **Database Backend** – JSON or vector DB
- **File Upload Limits** – Customize size/format limits

See `.env.example` for all options.

---

## 👥 Community

Join our [Discord](https://discord.gg/76QMKwj2J4) community to connect, share ideas, and take part in exciting discussions!

---

## 🤝 Contributing

We welcome all contributions.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m "Add feature"`)
4. Push (`git push origin feature/new-feature`)
5. Open a Pull Request

**Guidelines:**

- Follow code style and conventions
- Add tests where needed
- Update docs for new features
- Ensure all tests pass before PR

---

## 💡 Areas to Contribute

- AI model integrations
- Mobile app support
- Performance improvements
- Accessibility features
- Docs & tutorials

---

## 💖 Support the Project

If you find NeuroPilot useful, please consider supporting:

**Ethereum (ERC-20)**:

```
0x5a12e3f48b6d761a120bc3cd0977e208c362a74e
```

Your support helps fund ongoing development and hosting.

---

## 📜 License

Licensed under the **CaviraOSS Community License**.  
Free to use, share, and modify for personal and educational purposes.  
Commercial use or resale requires prior written permission from CaviraOSS.

See [LICENSE](LICENSE.md) for full terms.

---

<div align="center">

**Built with ❤️ by CaviraOSS and contributors**

⭐ Star us on [GitHub](https://github.com/CaviraOSS/neuropilot) if this project helps you!

</div>
