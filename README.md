# Ghostless

**Write Without Shadows.** A self-hosted writing-analysis suite powered by the Claude API, with five tools:

- **AI Detection** — statistical signals (sentence uniformity, lexical repetition, buzzword density, punctuation footprint) blended with Claude's sentence-by-sentence reading, shown as an AI% vs human% split with color-coded text.
- **Originality** — web search for matching or closely paraphrased sources.
- **Citation Importer** — finds peer-reviewed journal articles and formats them in APA 7th edition, verifying each before formatting.
- **Style Forensics** — reads for edit-trail residue, register drift, rhythm, and voice breaks.
- **Humanizer** — rewrites AI-flavored text by paragraph (up to ~8,000 words) and strips em-dashes, stray colons, asterisks, and hashes.

Your Anthropic API key lives only on the server. It is never sent to the browser.

---

## Run locally

You need [Node.js 18 or newer](https://nodejs.org).

```bash
# 1. Install dependencies
npm install

# 2. Add your key
cp .env.example .env
#   then open .env and paste your real sk-ant- key

# 3. Start it
npm start
```

Open <http://localhost:3000>.

---

## Project layout

```
ghostless/
├── server.js          Express server + /api/claude proxy (injects your key)
├── public/index.html  The entire frontend (HTML + CSS + JS, no build step)
├── package.json
├── .env.example       Template — copy to .env
├── .gitignore         Keeps .env and node_modules out of the repo
└── README.md
```

There is no build step. Editing `public/index.html` and refreshing is the whole loop.

---

## Push to GitHub or GitLab

From the `ghostless/` folder:

```bash
git init
git add .
git commit -m "Initial commit: Ghostless"
git branch -M main
```

**GitHub** — create an empty repo at github.com/new (do not add a README), then:

```bash
git remote add origin https://github.com/<you>/ghostless.git
git push -u origin main
```

**GitLab** — create a blank project at gitlab.com/projects/new, then:

```bash
git remote add origin https://gitlab.com/<you>/ghostless.git
git push -u origin main
```

`.env` is git-ignored, so your key never leaves your machine.

---

## Deploy

Any Node host works. Set **`ANTHROPIC_API_KEY`** as an environment variable in the host's dashboard (never commit it). The host runs `npm install` then `npm start` automatically.

- **Railway / Render / Fly.io** — connect the repo, add the `ANTHROPIC_API_KEY` variable, deploy. The app reads `PORT` from the environment automatically.
- **Optional:** set `GHOSTLESS_MODEL` to `claude-opus-4-8` for top quality, or leave it as the default `claude-sonnet-4-6` for a cheaper balance.

---

## Configuration

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | Your `sk-ant-` key. |
| `GHOSTLESS_MODEL` | no | `claude-sonnet-4-6` | `claude-opus-4-8`, `claude-opus-4-7`, or `claude-haiku-4-5-20251001` also allowed. |
| `PORT` | no | `3000` | Most hosts set this for you. |

The model can also be picked per-session from the dropdown in the header; the server only honors models on its allow-list.

---

## Notes

- **Originality** and **Citations** use Claude's web search tool. Results depend on what is publicly indexed; always verify citations against the journal of record before submitting academic work.
- **AI Detection** is an estimate from combined heuristics and model judgment, not proof. Treat it as a signal, not a verdict.

MIT licensed. Built with Claude.
