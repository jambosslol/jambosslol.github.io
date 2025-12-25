## Outlier (GitHub Pages + Firebase + Gemini)

This repo is a static GitHub Pages game that:
- Uses **Firebase Auth + Firestore** to store user progress/stats (and falls back to `localStorage` if Firestore fails).
- Uses a **Gemini-powered generator** (`generate_puzzles.py`) to periodically refresh `puzzles.json`.

### What “forever for free” realistically means

- **Website uptime**: GitHub Pages is static hosting and is typically “always on,” but no platform guarantees *forever*.
- **Firebase + Gemini**: Both have **free tiers** and **limits**. This repo avoids keeping servers running, but you still must stay within quotas/billing rules.

---

## Daily puzzle automation (free on public GitHub repos)

This repo includes a scheduled GitHub Action: `.github/workflows/generate-puzzles.yml`.

Current schedule is set for **12:05 AM EST** (which is **05:05 UTC**).
Note: GitHub’s scheduler uses **UTC**, so during **EDT (DST)** it will run at **1:05 AM** local unless you change the cron seasonally.

### 1) Add the Gemini key as a GitHub Secret

In your GitHub repo:
- **Settings → Secrets and variables → Actions → New repository secret**
- Name: `GEMINI_API_KEY`
- Value: your Gemini API key

Optional:
- Set `GEMINI_MODEL` (secret or workflow env) to force a specific model.

### 2) Enable Actions

Make sure GitHub Actions are enabled for the repo (Settings → Actions).

### 3) Run once manually

Go to **Actions → “Generate daily puzzles” → Run workflow** to verify it works immediately.

### Troubleshooting (if it “does nothing”)

- **Action fails with “GEMINI_API_KEY is not set”**: add the `GEMINI_API_KEY` repo secret (exact name).
- **Action runs but can’t push**:
  - If your default branch is protected, allow GitHub Actions to push or switch to a PR-based flow.
  - The failure will appear in the “Commit and push…” step logs.
- **Action doesn’t run on schedule**:
  - Scheduled workflows only run on the repo’s **default branch**.
  - On some repo/org settings, schedules can be disabled; try a manual run to confirm Actions work.
- **Gemini quota / invalid key**:
  - If you see **429 quota exceeded** with **free tier limit: 0**, that key/project currently has **no free-tier quota**.
  - The workflow will keep the existing `puzzles.json` (site stays playable), but to actually generate new puzzles you must:
    - enable Gemini API access/quota for that project, or
    - add billing / upgrade plan for the key, or
    - use a different key/project that has quota.

---

## Run the generator locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY="..."
python generate_puzzles.py
```

If successful, it overwrites `puzzles.json` with 3 new puzzles.

---

## Firebase reliability checklist (common causes of “it stopped working”)

If login/Firestore suddenly fails on GitHub Pages, the most common fixes are in the Firebase Console:

- **Authorized domains**: Add your GitHub Pages domain under Auth → Settings → Authorized domains
- **Firestore rules**: Ensure authenticated users can read/write their own docs:
  - `user_progress/{uid}`
  - `user_stats/{uid}`
- **API key restrictions**: If you restricted the Firebase API key in Google Cloud, confirm referrers include your Pages domain

This repo’s client code will **fail-soft** (fallback to `localStorage`) if Firestore rejects requests, but you’ll still want to correct the underlying Firebase config.
