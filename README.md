# MarketScout Frontend

A responsive React workspace for MarketScout: authentication screens, a research-launch dashboard, real-time pipeline progress, and an intentional human-in-the-loop decision modal. It is isolated from the Python model repository so it can be moved unchanged into its own frontend repository later.

## What this frontend does

- Sign in and sign up against the separate authentication service.
- Start a MarketScout research pipeline using a company and optional preselected domain.
- Display the pipeline's domain-selection `interrupt` as a focused human-review modal.
- Resume the exact pipeline run with the selected ranked option.
- Surface completed research in the current browser session and explain API/model status.
- Provide a polished, responsive experience without a component-library dependency.

## Architecture

```text
Browser / React app
 ├─ Auth API (separate backend repo)     VITE_AUTH_API_URL
 │    ├─ POST /auth/login
 │    └─ POST /auth/signup
 └─ Model API (this MarketScout repo)    VITE_MODEL_API_URL
      ├─ GET  /health
      ├─ POST /run-pipeline
      └─ POST /run-pipeline/:threadId/resume
```

The model service may pause after industry analysis. Its response has `status: "interrupted"`, a `thread_id`, and ranked domain `options`; the dashboard presents those choices in the human-review modal. Selecting one makes a resume call with the **one-based** option index, matching the Python pipeline contract.

## Run locally

Prerequisites: Node.js 20+ and npm. Start the model API from the project root in another terminal (for example, `uv run marketscout api`).

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`). Build a production bundle with:

```bash
npm run build
```

## Configuration

Create `frontend/.env` from `.env.example`.

| Variable | Default | Purpose |
|---|---:|---|
| `VITE_MODEL_API_URL` | `http://localhost:8001` | MarketScout FastAPI model/pipeline service |
| `VITE_AUTH_API_URL` | `http://localhost:8000` | Separate sign-up/login backend |

The auth client assumes `POST /auth/login` and `POST /auth/signup`, each accepts JSON. Change only `src/api.js` if the auth repository uses a different route or response shape. The application accepts an optional `user.name` field from its response; otherwise it derives a friendly preview name from the submitted email.

## API contract used

```json
POST /run-pipeline
{ "company": "Philips", "domain": "Healthcare AI" }
```

Omit `domain` to request human review. An interrupted response is expected to resemble:

```json
{
  "status": "interrupted",
  "thread_id": "uuid",
  "interrupt": { "kind": "domain_selection", "options": [{ "domain": "...", "score": 91, "rationale": "..." }] }
}
```

The selection resumes with `POST /run-pipeline/{thread_id}/resume` and `{ "domain": 1 }`.

## Project map

| Path | Responsibility |
|---|---|
| `src/App.jsx` | Screens, dashboard state, human-review flow, session-only report list |
| `src/api.js` | All backend integration points and configurable API origins |
| `src/styles.css` | Visual system, responsive layouts, modal and dashboard styling |
| `.env.example` | Safe local configuration template |

## Preview behavior

When either API cannot be reached during local design work, the app intentionally remains explorable: login enters a clearly announced preview session and research displays sample domain choices. This is only a UI-development fallback; a reachable API always takes precedence. HTTP errors returned by a reachable service are shown to the user rather than being masked.

## Production integration checklist

1. Implement CORS in both APIs for the deployed frontend origin.
2. Replace the session-only authentication placeholder with the backend's access-token strategy in `src/api.js`.
3. Persist report metadata in the backend, then replace the dashboard's in-memory report list with an authenticated reports endpoint.
4. Use a durable LangGraph checkpointer before running interrupted work across process restarts or multiple workers.
5. Host the `dist/` folder behind HTTPS and set the two Vite environment variables at build time.

## Design decisions

The visual language deliberately treats research as a calm, judgment-led activity: dark evergreen establishes focus, soft paper avoids dashboard fatigue, and the lime accent is reserved for action and validated progress. The review modal is central rather than incidental, reinforcing that the person sets strategic direction while the agents perform the evidence work.
