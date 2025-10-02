This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local setup (no Docker)

1. Install Node deps

```bash
npm ci --no-audit --no-fund
```

2. Create `.env.local`

```bash
ML_SERVICE_URL=http://127.0.0.1:8000
MONGO_URI=mongodb://127.0.0.1:27017
JWT_SECRET=dev-secret-change-me
```

3. Start dev server

```bash
npx next dev --turbopack
```

## ML Service (FastAPI) local setup

1. Install Python deps

```bash
venv\Scripts\pip.exe install -r ml-service/requirements.txt
```

2. Create `ml-service/.env`

```env
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
HF_API_TOKEN=your-hf-token
HF_EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
YOUTUBE_API_KEY=your-youtube-key
```

3. Run service

```bash
ml-service\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir ml-service --reload
```

## How live APIs are used
- Tutor: Uses OpenAI `chat/completions` when `OPENAI_API_KEY` is set; otherwise returns a fallback string.
- Analyze: Calls Hugging Face Inference API for embeddings when `HF_API_TOKEN` is set; otherwise uses a small local vector.
- Recommendation: Uses YouTube Data API v3 when `YOUTUBE_API_KEY` is set; otherwise returns sample links.

Ensure keys are present to avoid fallback static data.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
