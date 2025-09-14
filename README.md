# One AI Network — UML Exporter (React + Mermaid)

A fast, browser-based UML documentation system for One AI Network. It renders Mermaid diagrams client-side, lets you zoom/pan smoothly, and exports everything to:

- Multi‑page A4 PDF (landscape)
- ZIP with all SVGs

This repo also includes a clean, responsive gallery UI so product, dev, and growth teams can browse diagrams and export with one click.

## What is UML and why we used it for One AI Network

UML (Unified Modeling Language) is simply a standard way to draw how a product works—who clicks what, which system responds, and what could go wrong. It turns long docs into clear, visual flows so product, dev, and growth teams stay aligned.

For One AI Network we mapped 3 core journeys:

- Token Purchase (SOL → ONE): from installing Phantom to swap confirmation, including price-impact checks and failure cases.
- AI Agent Launch: choosing an ElizaOS template, funding, signing on Solana, and the agent going from init to running.
- User Onboarding: wallet connect → first action (e.g., “claim AI land”) → Discord join, plus edge cases (insufficient SOL, declined connect).

### Why this matters
- Shared understanding: non-technical + technical stakeholders see the same blueprint.
- Faster reviews: easy to spot missing steps, risks, or UX friction.
- Executable docs: our diagrams double as specs for engineering and as visuals for the pitch deck/marketing.

---

## Tech
- React + TypeScript + Vite
- Tailwind CSS (polished, responsive UI)
- Mermaid.js 11 (client-side rendering)
- jsPDF (A4 landscape PDF export)
- JSZip (SVG ZIP export)

## Quick start

```bash
# 1) Install dependencies
npm install

# 2) Start dev server
npm run dev
# → open http://localhost:5173
```

## Using the app
- Browse the gallery of UML cards
- Zoom: mouse wheel  •  Pan: click + drag  •  Fit/Reset from the floating controls
- Export all:
  - “Export All PDF” → multi‑page A4 landscape PDF
  - “Export All SVG (ZIP)” → all diagrams as individual SVGs

## Build

```bash
npm run build
# output: dist/
```

You can deploy `dist/` on any static host (Vercel/Netlify/GitHub Pages, etc.).

## Creating/Editing diagrams
- Diagrams live in `src/App.tsx` as a `diagrams` array, each entry with `{ id, group, title, code }`
- Mermaid supports multiple diagram types: flowchart, sequence, class, state, etc.

> Tip: Keep labels short and avoid special characters where possible. The exporter sanitizes common cases and ensures safe SVG.

## GitHub (networkAlie)
- Account: **networkAlie** (info@alie.network)
- Repo name suggestion: `one-ai-uml-viewer`

If you’re using GitHub CLI, authenticate then create/push in one go:

```bash
# (1) Login (device auth)
gh auth login --hostname github.com --git-protocol https --web --scopes "repo,workflow"
# choose the browser flow and select the account: networkAlie (info@alie.network)

# (2) Create repo and push current project (from the project root)
git init
git add -A
git commit -m "feat: One AI Network UML Exporter initial"
gh repo create networkAlie/one-ai-uml-viewer --public --source=. --remote=origin --push
```

## License
MIT © One AI Network / ALIE Network
