# AI Agent (`aiagent`)

The interactive AI Agent workspace and multi-agent marketing engine powering the AI Marketing Suite.

## Features

- **Multi-LLM Engine:** Support for DeepSeek, OpenAI, Groq, Qwen, and Gemini model providers.
- **Product Context RAG:** Automatically retrieves and injects product specs from `.agents/<productKey>/product.md` based on chat history.
- **30+ Specialized Marketing Skills:** Built-in expert skills for SEO, Brand Positioning, Competitor Research, GBP Posts, Ad Copywriting, and E-E-A-T Optimization.
- **Generative UI:** Dynamically renders interactive React components (questionnaires, options) from LLM outputs.
- **Web Search Integration:** Live web research via SearXNG and Jina Reader.

## Setup & Running

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server (runs on port 3000)
npm run dev
```

## License

[MIT License](LICENSE)
