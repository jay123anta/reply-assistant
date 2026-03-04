# How Do I Reply To This?

AI-powered reply generator for difficult messages. Paste what you received, pick who sent it and what you want — get 3 ready-to-send replies in different tones.

## Features

- **3 tones per reply** — Diplomatic, Warm, and Direct
- **Regenerate individual replies** — refresh any single tone without losing the others
- **8 relationship types** — Boss, Colleague, Client, Relative, Friend, Landlord, Partner, Stranger
- **6 outcome goals** — Hold boundary, Keep peace, Clarify, Decline, Assert, Buy time
- **No data stored** — messages are never saved or shared

## Tech Stack

- **Frontend:** React 18
- **Backend:** Node.js + Express
- **AI:** DeepSeek API (deepseek-chat)

## Project Structure

```
reply-assistant/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.jsx
        └── index.js
```

## Run Locally

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
# Add your DEEPSEEK_API_KEY to .env
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/generate-reply` | Generate 3 replies (diplomatic, warm, direct) |
| POST | `/api/regenerate-one` | Regenerate a single tone |

## Environment Variables

See `backend/.env.example` for required variables.

## Security

- API key lives in backend `.env` only — never exposed to frontend
- Rate limiting: 15 requests per IP per hour
- Input validation: max 2000 characters
- CORS: restricted to frontend URL
- Payload size limit: 10kb
