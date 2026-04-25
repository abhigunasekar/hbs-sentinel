# HBS Sentinel 🛡️

> **Real-Time Student Safety Intelligence for Harvard Business School**  
> DSAIL Final Project · Harvard Business School · Spring 2026

**Live URL:** https://8000-ih6uj7chhtqgum9xxp4m8-06952070.us2.manus.computer

> **Note:** A permanent hosted version can be deployed via the included `Dockerfile` or `render.yaml` on any Docker-compatible platform.

HBS Sentinel is an AI-powered student safety platform that closes a critical visibility gap: when a crisis strikes anywhere in the world, HBS currently has no way to identify which of its 1,800 students are at risk in under 5 minutes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HBS Sentinel                            │
│                                                             │
│  ┌──────────────┐    WebSocket    ┌──────────────────────┐  │
│  │  Admin       │◄───────────────►│  FastAPI Backend     │  │
│  │  Dashboard   │                 │                      │  │
│  │  (React)     │  REST API       │  ┌────────────────┐  │  │
│  └──────────────┘◄───────────────►│  │  AI Pipeline   │  │  │
│                                   │  │                │  │  │
│  ┌──────────────┐    WebSocket    │  │ 1. Detector    │  │  │
│  │  Student     │◄───────────────►│  │ 2. Risk Scorer │  │  │
│  │  Portal      │                 │  │ 3. Alert Comp. │  │  │
│  │  (React)     │  REST API       │  └────────────────┘  │  │
│  └──────────────┘◄───────────────►│                      │  │
│                                   │  In-Memory State DB  │  │
│                                   └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + TailwindCSS + Leaflet.js + Recharts |
| Backend | Python 3.11 + FastAPI + WebSockets |
| AI Engine | OpenAI GPT-4.1 (via OpenAI API) |
| Real-time | WebSockets (native FastAPI) |
| Map | Leaflet.js + CartoDB Dark tiles |
| State | In-memory (demo) |

---

## AI Pipeline

When a crisis is triggered, three sequential AI stages fire:

### Stage 1 — Crisis Detector
GPT-4.1 receives a crisis description and returns structured JSON: event type, severity (1–10), center coordinates, affected radius, and confidence score.

### Stage 2 — Risk Scorer
GPT-4.1 receives the crisis data plus the full student roster (with distances pre-computed) and assigns each student a risk tier: `AFFECTED`, `AT_RISK`, or `SAFE`, with a one-sentence rationale.

### Stage 3 — Alert Composer
For each affected/at-risk student, GPT-4.1 composes a **personalized alert message** — not a template. It uses the student's name, location, bio, and risk rationale to write a message that feels human and provides actionable guidance.

---

## Demo Scenario

**10 mock HBS students** are pre-loaded globally:
- 4 students in Bangkok, Thailand (affected by typhoon)
- 6 students in London, São Paulo, Berlin, Dubai, Paris, Seoul

**One-click trigger:** "Trigger Bangkok Typhoon" fires Typhoon Haikui (Category 4, Severity 8/10) and runs the full AI pipeline in ~30 seconds.

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key (or Anthropic API key for real Claude)

### Setup

```bash
# Clone
git clone https://github.com/abhigunasekar/hbs-sentinel.git
cd hbs-sentinel

# Backend
pip install fastapi uvicorn anthropic openai websockets python-multipart aiofiles httpx

# Frontend (build)
cd frontend && npm install && npm run build && cd ..

# Set API key
export OPENAI_API_KEY=your_key_here
# OR for real Claude:
# export ANTHROPIC_API_KEY=your_anthropic_key_here

# Start
python backend/main.py
```

Open http://localhost:8000

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin (Angela Crispi) | admin@hbs.edu | sentinel2026 |
| Student — Bangkok (Affected) | priya.mehta@hbs.edu | sentinel2026 |
| Student — Bangkok (Affected) | james.okafor@hbs.edu | sentinel2026 |
| Student — Bangkok (Affected) | sofia.reyes@hbs.edu | sentinel2026 |
| Student — Bangkok (Affected) | kenji.tanaka@hbs.edu | sentinel2026 |
| Student — London (Safe) | aisha.patel@hbs.edu | sentinel2026 |
| Student — São Paulo | marcus.webb@hbs.edu | sentinel2026 |
| Student — Berlin | lena.fischer@hbs.edu | sentinel2026 |
| Student — Dubai | yusuf.alrashid@hbs.edu | sentinel2026 |
| Student — Paris | claire.dubois@hbs.edu | sentinel2026 |
| Student — Seoul | daniel.park@hbs.edu | sentinel2026 |

---

## Using Real Claude API

To switch from the OpenAI proxy to real Anthropic Claude:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. In `backend/ai_pipeline.py`, replace the client initialization:

```python
import anthropic
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
MODEL = "claude-sonnet-4-5"
```

3. Update `_chat()` to use the Anthropic messages API format.

---

## Project Structure

```
hbs-sentinel/
├── backend/
│   ├── main.py              # FastAPI app, all routes, WebSocket endpoints
│   ├── ai_pipeline.py       # 3-stage Claude AI pipeline
│   ├── models.py            # Data models + mock student data
│   ├── database.py          # In-memory state store + crisis history seeding
│   └── websocket_manager.py # WebSocket connection manager
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Root component + routing
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       # Role-based login
│   │   │   ├── AdminDashboard.tsx  # Admin workflow
│   │   │   └── StudentPortal.tsx   # Student workflow
│   │   ├── components/
│   │   │   ├── WorldMap.tsx         # Leaflet map with travel pins
│   │   │   ├── ReportsTab.tsx       # Crisis history + Recharts analytics
│   │   │   ├── PipelineProgress.tsx # AI stage tracker
│   │   │   └── StatusBadge.tsx      # Risk status badges
│   │   ├── api.ts            # REST API client
│   │   ├── useWebSocket.ts   # WebSocket hook
│   │   └── types.ts          # TypeScript types
│   └── dist/                 # Built frontend (served by FastAPI)
├── start.sh                  # Quick start script
├── .env.example              # Environment configuration template
└── README.md
```

---

## Key Features (v3.0)

- **Real-time world map** with dark tiles and color-coded student pins (travel mode indicators)
- **AI-powered crisis detection** — classifies events by type, severity (1–10), and affected radius
- **Personalized alerts** — GPT-4.1 writes individual messages per student, not templates
- **WebSocket updates** — admin and student views update live without page refresh
- **Two distinct workflows** — Admin dashboard and Student portal feel like separate products
- **Reports tab** — Crisis history log, Student Response Analytics (Recharts), Regional Risk Map
- **Live news monitoring** — scans global news for crisis events with deduplication
- **One-tap safe confirmation** — students mark themselves safe; admins see it instantly
- **Manual override** — admins can manually update any student's risk status
- **Map reset fix** — map redraws immediately after demo reset without page refresh

---

*HBS Sentinel · DSAIL Final Project · Harvard Business School · Spring 2026*  
*Classification: Confidential — Academic Use Only*
