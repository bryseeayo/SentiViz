# VB Daily — Reactions Infographic

A zero-dependency, static web app that turns the VB Daily survey export into an infographic: sentiment over time, distribution of reactions, and trends of returning Network IDs.

## What it shows
- Overall counts and coverage window (UTC)
- Emoji distribution per day as a stacked area
- Emoji distribution toggle: counts or share % per day
- Engagement index over time (Wow=+1, Curious=0, Boring=−1)
- Outlier days: z-score spikes/dips on index and emoji share
- Sentiment insights: peak days, averages, and recent 7-day trends for 🤯/🤔/😴
- Daily mix as a ternary plot (Wow/Curious/Boring)
- Returning audience: top Network IDs and daily returning-rate
- Recent responses table (latest 100)
- Export PDF for reporting
- Export Analysis JSON for downstream (LLM) analysis

## Data format
Expected CSV columns (header from your export):
`#`, `How did today's edition of VB Daily make you feel?`, `email`, `first_name`, `last_name`, `Response Type`, `Start Date (UTC)`, `Stage Date (UTC)`, `Submit Date (UTC)`, `Network ID`, `Tags`, `Ending`

Only these fields are used: emoji (col 2), Submit Date (UTC) (col 9), and Network ID (col 10).
Emoji semantics used in the UI:
- 🤯 Wow, 🤔 Curious, 😴 Boring

## Quick Start

Option 1: Open directly
- Double-click `index.html` (or open in your browser). Some browsers restrict local file access; if charts don’t appear, use the simple HTTP server below.

Option 2: Serve locally
- Python 3: `python3 -m http.server 8000`
- Then open: http://localhost:8000/

Makefile shortcut:
- `make serve` (runs the Python server on port 8000)

## Load data
- Upload: Use the Upload CSV control

## Notes
- CSV parsing supports quoted fields and embedded commas (RFC4180-ish)
- Weights for sentiment can be adjusted in `src/app.js`
- Export JSON includes: time window, daily series, outliers (z-score and MAD), per-day aggregates, Pacific Time heatmap grids, transitions, retention, cohort retention, top IDs, and recent responses.
- No external network requests or dependencies required
