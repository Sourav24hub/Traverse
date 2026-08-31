# Contributing to Traverse

## Branching

- `main` — always stable and demo-ready. Never commit directly.
- `backend-dev` — backend owner works here.
- `frontend-dev` — frontend owner works here.

## Daily Workflow

```bash
git checkout <your-dev-branch>
git pull origin main          # bring in latest merged work
# ... do focused work on one feature ...
git add .
git commit -m "Implement trip creation API"
git push origin <your-dev-branch>
# open a Pull Request into main, get it reviewed, merge
```

Pull `main` into your branch after every merge so both branches stay close together.

## Rules

1. Don't work on your teammate's branch. It's not a shared scratchpad.
2. One feature per PR — keep changes small and reviewable.
3. Read `PROJECT_SPEC.md` before starting any feature; it's the source of truth for page flow and API shapes.
4. Any change to the API contract (section 9 of `PROJECT_SPEC.md`) needs a heads-up to the other person before merging — don't change response/request shapes silently.
5. Test locally and run the project before pushing.

## Using AI Coding Agents (Antigravity, etc.)

- Give the agent **one focused feature** at a time — not "build Traverse."
- Explicitly state the file/folder boundary: backend-only or frontend-only.
- Tell it to read `PROJECT_SPEC.md` first.
- Review everything it generates before committing.

Example good prompt:
> "Read PROJECT_SPEC.md. Implement POST /api/trips according to the specification. Only modify backend files. Add tests for trip creation."

## Secrets

- Never commit `.env`. Only `.env.example` (with empty values) goes into the repo.
- If a secret is ever pushed accidentally: treat it as exposed, rotate/revoke it immediately, and don't assume deleting the file after the fact makes it safe.
