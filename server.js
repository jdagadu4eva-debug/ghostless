// Ghostless — server.js
// Minimal Express server that serves the static frontend and proxies
// requests to the Anthropic Messages API. The API key NEVER reaches the
// browser; it lives only in this process via the ANTHROPIC_API_KEY env var.

const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Configuration --------------------------------------------------------
const API_KEY = process.env.ANTHROPIC_API_KEY;

// Models the frontend is allowed to request. Anything else falls back to
// the default. This stops a tampered client from running up a huge bill on
// an expensive model you didn't intend to expose.
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-opus-4-8",
  "claude-haiku-4-5-20251001",
]);
const DEFAULT_MODEL = process.env.GHOSTLESS_MODEL || "claude-sonnet-4-6";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

if (!API_KEY) {
  console.warn(
    "\n[Ghostless] WARNING: ANTHROPIC_API_KEY is not set. " +
      "The app will load, but every analysis call will fail until you set it.\n" +
      "Copy .env.example to .env and add your key, or set it in your host's dashboard.\n"
  );
}

// ---- Middleware ------------------------------------------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---- Anthropic proxy -------------------------------------------------------
// The frontend POSTs { system, messages, max_tokens, model?, tools? } here.
app.post("/api/claude", async (req, res) => {
  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: "Server is missing ANTHROPIC_API_KEY. Set it and restart." });
  }

  try {
    const { system, messages, max_tokens, model, tools } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Request must include a non-empty messages array." });
    }

    const chosenModel =
      model && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    const payload = {
      model: chosenModel,
      max_tokens: Math.min(Math.max(parseInt(max_tokens, 10) || 1024, 256), 8192),
      messages,
    };
    if (system) payload.system = system;
    if (Array.isArray(tools) && tools.length) payload.tools = tools;

    const headers = {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    };
    // The web_search tool requires a beta header.
    if (Array.isArray(tools) && tools.some((t) => /web_search/.test(t.type || ""))) {
      headers["anthropic-beta"] = "web-search-2025-03-05";
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("[Ghostless] Anthropic error:", upstream.status, data);
      return res.status(upstream.status).json({
        error: (data && data.error && data.error.message) || "Anthropic API error.",
      });
    }
    return res.json(data);
  } catch (err) {
    console.error("[Ghostless] Proxy failure:", err);
    return res.status(500).json({ error: "Proxy failure: " + err.message });
  }
});

// ---- Health check ----------------------------------------------------------
app.get("/healthz", (_req, res) => res.json({ ok: true, model: DEFAULT_MODEL }));

// ---- SPA fallback ----------------------------------------------------------
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`[Ghostless] running on http://localhost:${PORT}  (model: ${DEFAULT_MODEL})`);
});
