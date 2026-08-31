# Traverse — Project Specification

This is the shared source of truth for the Traverse hackathon build. Both developers (and both Antigravity/AI coding sessions) should read this before making changes. Any change to page flow, API contract, or data shapes should be discussed by both people before implementation.

---

## 1. Product Summary

Traverse is an AI-powered travel companion. It doesn't just generate an itinerary once — it plans, tracks the traveler's real-world progress, adapts the plan when conditions change, visualizes the actual journey on a map, and rewards completion.

**Core loop:** `PLAN → GENERATE → TRAVEL → ADAPT → VISUALIZE → REWARD`

---

## 2. Page Flow

### Solo flow
```
Welcome → Trip/Outing → Destination or Prompt → Details → AI Itinerary
→ Real-Time Tracking → Dynamic Replanning → Journey Map → Rewards
```

### Group flow
```
Welcome → Trip/Outing → Create Trip / Join Trip → Room Code + Destination Setup
→ Trip Details & Personalization → AI Itinerary → Real-Time Tracking
→ Dynamic Replanning → Journey Map (colored trails) → Rewards
```

| Page | Purpose |
|---|---|
| 1. Welcome / Startup | Entry point. Communicates Traverse as an ongoing AI companion, not just a generator. |
| 2. Trip or Outing | Trip = multi-day journey. Outing = single-day. Same principles, different duration/structure. |
| 3. Create Trip / Join Trip | Group only. Creator becomes trip leader, gets a room code. Others join with the code. |
| 4. Room Creation / Customization | Choose destination via API or describe it in natural language (e.g. "I want to go to Vaishno Devi, so plan a trip accordingly"). |
| 5. Room Code & Destination Setup | Room code is the shared identifier. Captures destination + custom prompt as initial AI context. |
| 6. Trip Details & Personalization | Number of days, estimated people, free-text requirements (dietary, accessibility, etc.). |
| 7. Live Day-by-Day Itinerary | Day-by-day plan with locations/activities. Completion is system-detected, never self-checked by the user. |
| 8. Real-Time Tracking | Compares live GPS to planned locations to detect arrival. |
| 9. Dynamic Replanning | AI revises remaining plan based on real-world changes (weather, road closures, delays). |
| 10. Journey Map | Visualizes the actual path traveled; colored bands per member in group mode; downloadable image. |
| 11. Rewards | Points awarded on trip/outing completion. |

---

## 3. Solo vs Group Differences

| Aspect | Solo | Group |
|---|---|---|
| Room / code | None | Required — leader creates, members join |
| Itinerary | Individual | Shared itinerary, individual tracking per member |
| Map | Single trail | Multiple colored trails, one per member |
| Flow steps | Skips Create/Join Trip screens | Includes Create/Join Trip + Room Code screens |

---

## 4. AI Responsibilities

| AI Role | Input | Output |
|---|---|---|
| Trip generation | Destination, days, people, prompt | Structured day-by-day itinerary |
| Personalization | Dietary, accessibility, group requirements (natural language) | Context-aware places and activities |
| Progress reasoning | Current location + planned stops | Whether a planned stop has been reached |
| Dynamic replanning | Weather/road/context changes + current progress | Updated remaining itinerary |
| Next-best action | Current location + remaining plan | More practical next destination/activity |
| Completion understanding | Trip progress + planned stops | When the journey is considered complete |

**Important product principle:** The traveler cannot manually mark a location as visited. Completion is always inferred by the system from real-world location signals.

---

## 5. Location Tracking Flow

```
Frontend: get GPS → send coordinates
  → POST /api/location/update
    → Backend: check current location vs planned places
    → Backend: compare proximity, update trip state
  → Frontend: receives updated map data + completion status
```

---

## 6. Dynamic Replanning Triggers

| Trigger | Possible AI Response |
|---|---|
| Heavy rain | Replace/postpone outdoor activity; insert suitable alternative |
| Road blocked | Select alternative route or destination |
| Unexpected delay | Reorder remaining activities to fit remaining time |
| Location/context change | Choose a more practical next stop |
| Plan no longer feasible | Regenerate remaining portion (never touches completed items) |

---

## 7. Repository Structure

```
Traverse/
├── frontend/
├── backend/
├── README.md
├── PROJECT_SPEC.md      (this file)
├── CONTRIBUTING.md
└── .gitignore
```

### Ownership

| Backend (you) | Frontend (teammate) |
|---|---|
| API routes | Pages / screens |
| AI services (LLM orchestration) | Components |
| Database | Forms |
| Location services | Map UI |
| Weather / replanning logic | Itinerary UI |
| Rewards logic | Rewards UI |

---

## 8. Git Workflow

- `main` — stable, integrated, demo-ready
- `backend-dev` — backend owner's branch
- `frontend-dev` — frontend owner's branch

**Flow:** work on your branch → commit → push → pull request → review → merge into `main`. Pull latest `main` into your branch after every merge.

```bash
git pull origin main
git add .
git commit -m "Implement trip creation API"
git push origin backend-dev
```

---

## 9. API Contract

> This is the binding agreement between frontend and backend. Shapes below can evolve, but only through discussion — don't change silently on one side.

### 9.1 Trip & Room

**`POST /api/trips`** — create a trip
```json
// Request
{
  "type": "trip",          // "trip" | "outing"
  "mode": "group",         // "solo" | "group"
  "destination": "Vaishno Devi",
  "days": 3,
  "people": 5,
  "prompt": "4 people are vegetarian"
}

// Response
{
  "tripId": "abc123",
  "roomCode": "X72K9P"     // null/omitted for solo
}
```

**`POST /api/trips/join`** — join an existing room
```json
// Request
{ "roomCode": "X72K9P", "userName": "Priya" }

// Response
{ "tripId": "abc123", "userId": "u_456" }
```

### 9.2 AI Itinerary

**`POST /api/itinerary/generate`**
```json
// Request
{ "tripId": "abc123" }

// Response
{
  "tripId": "abc123",
  "days": [
    {
      "day": 1,
      "items": [
        {
          "itemId": "i_1",
          "name": "Katra Base Camp",
          "lat": 32.9916,
          "lng": 74.9310,
          "type": "checkpoint",
          "completed": false
        }
      ]
    }
  ]
}
```

**`GET /api/itinerary/{tripId}`** → returns the current itinerary in the same shape as above.

### 9.3 Location

**`POST /api/location/update`**
```json
// Request
{ "tripId": "abc123", "userId": "u_456", "lat": 32.99, "lng": 74.93, "timestamp": "2026-08-31T10:00:00Z" }

// Response
{ "reached": ["i_1"], "updatedItinerary": false }
```

**`GET /api/location/{tripId}`** → returns latest known positions for all members.

### 9.4 Dynamic Replanning

**`POST /api/itinerary/replan`**
```json
// Request
{
  "tripId": "abc123",
  "trigger": "weather",        // "weather" | "road" | "delay" | "other"
  "details": "Heavy rain expected at Bhairavi Temple from 3pm"
}

// Response
{
  "tripId": "abc123",
  "updatedDays": [ /* same shape as itinerary days, remaining items only */ ],
  "reason": "Outdoor activity replaced due to rain."
}
```

### 9.5 Journey & Rewards

**`GET /api/trips/{tripId}/journey`**
```json
{
  "tripId": "abc123",
  "trails": [
    { "userId": "u_456", "color": "#3B82F6", "path": [{"lat": 32.99, "lng": 74.93, "t": "..."}] }
  ]
}
```

**`GET /api/trips/{tripId}/rewards`**
```json
{ "tripId": "abc123", "points": 120, "completed": true }
```

### 9.6 Error Convention

All endpoints return errors in a consistent shape:
```json
{ "error": { "code": "TRIP_NOT_FOUND", "message": "No trip with that ID." } }
```

---

## 10. Environment Variables

`.env.example` (committed) — real `.env` stays local and gitignored:
```
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
WEATHER_API_KEY=
DATABASE_URL=
```

---

## 11. MVP Priorities

| Priority | Capability |
|---|---|
| P0 | Trip/Outing + Solo/Group flow |
| P0 | AI itinerary generation |
| P0 | Custom natural-language prompt |
| P0 | Automatic location-based completion |
| P0 | Dynamic replanning concept |
| P0 | Journey map |
| P1 | Group colored trails |
| P1 | Downloadable map |
| P1 | Completion points |

**Build one end-to-end path first:**
`Landing → Create Trip → Room Code → Destination + Prompt → Trip Details → AI Itinerary → Map → Completion → Rewards`

---

## 12. Rules Both Devs Follow

1. GitHub is the source of truth — no side-channel code sharing.
2. Don't work directly on `main`.
3. Give Antigravity/AI agents one focused feature at a time, with an explicit file/folder boundary and instruction to read this file first.
4. Any change to the API contract (section 9) needs both people's sign-off before merging.
5. Review generated code and run it locally before pushing.
