// Ghostless — Cloudflare Pages _worker.js (Advanced Mode)
// Handles API routes; all other requests fall through to static assets.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---- Health check -------------------------------------------------------
    if (url.pathname === "/healthz") {
      return Response.json({ ok: true, model: env.GHOSTLESS_MODEL || "claude-sonnet-4-6" });
    }

    // ---- Anthropic proxy ----------------------------------------------------
    if (url.pathname === "/api/claude" && request.method === "POST") {
      const API_KEY = env.ANTHROPIC_API_KEY;
      if (!API_KEY) {
        return Response.json(
          { error: "Server is missing ANTHROPIC_API_KEY." },
          { status: 500 }
        );
      }

      const ALLOWED_MODELS = new Set([
        "claude-sonnet-4-6",
        "claude-opus-4-7",
        "claude-opus-4-8",
        "claude-haiku-4-5-20251001",
      ]);
      const DEFAULT_MODEL = env.GHOSTLESS_MODEL || "claude-sonnet-4-6";

      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON body." }, { status: 400 });
      }

      const { system, messages, max_tokens, model, tools } = body || {};

      if (!Array.isArray(messages) || messages.length === 0) {
        return Response.json({ error: "messages array required." }, { status: 400 });
      }

      const chosenModel = model && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
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
        "anthropic-version": "2023-06-01",
      };

      try {
        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await upstream.json();
        if (!upstream.ok) {
          return Response.json(
            { error: data?.error?.message || "Anthropic API error." },
            { status: upstream.status }
          );
        }
        return Response.json(data);
      } catch (err) {
        return Response.json({ error: "Proxy failure: " + err.message }, { status: 500 });
      }
    }

    // ---- Static assets — served by Pages asset binding ----------------------
    return env.ASSETS.fetch(request);
  },
};
