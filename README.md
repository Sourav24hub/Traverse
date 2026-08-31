# Traverse

AI-powered travel companion — plans your trip, tracks you as you travel, adapts the plan in real time, and turns your journey into a visual, rewardable memory.

Built for a hackathon by a 2-person team. See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the full page flow, API contract, and product spec before making changes.

## Repo Structure

```
Traverse/
├── frontend/         # React app — pages, components, map UI
├── backend/          # API routes, AI services, DB, location, replanning, rewards
├── PROJECT_SPEC.md   # Source of truth: flow + API contract
├── CONTRIBUTING.md   # Branching & workflow rules
└── .env.example       # Required env vars (copy to .env, fill in locally)
```

## Getting Started

### Backend
```bash
cd backend
# install deps, e.g.
npm install        # or: pip install -r requirements.txt
cp ../.env.example .env
# fill in your local .env values
npm run dev         # or your framework's run command
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Branches

- `main` — stable, demo-ready
- `backend-dev` — backend owner's working branch
- `frontend-dev` — frontend owner's working branch

See `CONTRIBUTING.md` for the day-to-day workflow.

## Team

| Area | Owner |
|---|---|
| Backend, AI, APIs, DB, location, replanning, rewards | you |
| Frontend, pages, map UI, itinerary UI, integration | teammate |
