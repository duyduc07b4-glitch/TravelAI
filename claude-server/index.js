// Local proxy for TravelAI's AI calls (chat + vision), sitting between the browser and the AI
// provider. The whole point: app.js runs entirely in the browser (no backend of its own), so if it
// called the provider directly the API key would have to live in client-side JS/localStorage —
// visible to anyone who opens DevTools, or anyone on the same LAN who loads the app (this app is
// explicitly designed to be reachable from a phone over LAN, see README). This server keeps the
// key here instead: it reads config.json (gitignored, never committed) and the browser only ever
// talks to this proxy, never to the provider directly.
//
// Speaks the OpenAI-compatible Chat Completions API (POST {baseUrl}/v1/chat/completions,
// `Authorization: Bearer <key>`) rather than Anthropic's own Messages API — this is what actually
// works against an internal AI gateway (e.g. a company LiteLLM/Azure APIM proxy issuing a
// restricted key for a specific model alias), and real OpenAI-compatible endpoints (OpenAI itself,
// most gateways/routers) all speak this same shape, so it's also the more broadly useful default.
//
// Setup: copy config.example.json to config.json, set "baseUrl" to your provider/gateway's API
// base, "apiKey" to your key, and "model" to whatever model name/alias that key is allowed to use,
// then `npm install && npm start`.

const fs = require('fs');
const path = require('path');
const express = require('express');

const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('Thiếu claude-server/config.json — copy config.example.json thành config.json rồi điền baseUrl/apiKey/model.');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function chatCompletionsUrl() {
  return (config.baseUrl || 'https://api.openai.com').replace(/\/+$/, '') + '/v1/chat/completions';
}
function authHeaders() {
  return {
    'content-type': 'application/json',
    'authorization': `Bearer ${config.apiKey}`,
    ...(config.extraHeaders || {})
  };
}

function hasRealKey() {
  return !!(config.apiKey && config.apiKey.trim() && config.apiKey !== 'YOUR_ANTHROPIC_API_KEY_HERE' && config.apiKey !== 'YOUR_API_KEY_HERE');
}
function noKeyError(res) {
  return res.status(500).json({ error: 'claude-server/config.json chưa có API key thật — mở file đó và dán key vào field "apiKey", rồi khởi động lại server.' });
}

const app = express();
app.use(express.json({ limit: '15mb' })); // Camera AI sends a base64 photo, which can be a few MB
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => {
  res.json({ ok: hasRealKey(), model: config.model || 'claude-sonnet-5' });
});

/** Parses one SSE frame (the text between two blank lines) into its `data:` JSON payload, or null for a frame with no/unparseable/`[DONE]` data line. */
function parseSseFrame(frame) {
  const dataLine = frame.split('\n').find(l => l.startsWith('data:'));
  if (!dataLine) return null;
  const payload = dataLine.slice(5).trim();
  if (payload === '[DONE]') return null;
  try { return JSON.parse(payload); } catch (e) { return null; }
}

/**
 * Streams a chat completion. Request: {system, user}. Response: newline-delimited JSON, one
 * `{"message":{"content":"<incremental text>"}}` line per delta — deliberately shaped to match
 * what Ollama's own /api/chat streaming used to send (this proxy's predecessor), so app.js's
 * existing chunk-accumulation logic (extractChunkContent) needed no changes, only a new URL to call.
 */
app.post('/chat', async (req, res) => {
  if (!hasRealKey()) return noKeyError(res);
  const { system, user } = req.body || {};
  if (!user) return res.status(400).json({ error: 'Thiếu "user" trong request body.' });

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  let upstream;
  try {
    upstream = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-5',
        max_tokens: config.maxTokens || 4096,
        messages,
        stream: true
      })
    });
  } catch (err) {
    return res.status(502).json({ error: `Không gọi được AI provider: ${err.message}` });
  }

  if (!upstream.ok || !upstream.body) {
    let msg = `${upstream.status} ${upstream.statusText}`;
    try { const errJson = await upstream.json(); msg = (errJson.error && errJson.error.message) || msg; } catch (e) {}
    return res.status(upstream.status || 502).json({ error: msg });
  }

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop(); // the last piece may be an incomplete frame — keep it for the next read
      for (const frame of frames) {
        const evt = parseSseFrame(frame);
        const delta = evt && evt.choices && evt.choices[0] && evt.choices[0].delta;
        if (delta && delta.content) {
          res.write(JSON.stringify({ message: { content: delta.content } }) + '\n');
        }
      }
    }
  } catch (err) {
    // Client likely disconnected/aborted mid-stream — nothing more to write.
  } finally {
    res.end();
  }
});

/**
 * One-shot image analysis (Camera AI's caption step). Request: {prompt, imageBase64, mediaType}.
 * Response: {message:{content:"<caption>"}} — same shape Ollama's non-streaming vision response
 * used, so callVision()'s existing `data.message?.content` line needed no changes.
 */
app.post('/vision', async (req, res) => {
  if (!hasRealKey()) return noKeyError(res);
  const { prompt, imageBase64, mediaType } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'Thiếu "imageBase64" trong request body.' });

  let upstream;
  try {
    upstream = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Describe this image in detail, mentioning any text you can see.' },
            { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${imageBase64}` } }
          ]
        }]
      })
    });
  } catch (err) {
    return res.status(502).json({ error: `Không gọi được AI provider: ${err.message}` });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) {
    const msg = (data && data.error && data.error.message) || `${upstream.status} ${upstream.statusText}`;
    return res.status(upstream.status || 502).json({ error: msg });
  }

  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  res.json({ message: { content: text || '(no response)' } });
});

const port = config.port || 8901;
app.listen(port, () => {
  console.log(`claude-server đang chạy tại http://localhost:${port} (model: ${config.model || 'claude-sonnet-5'}, base: ${config.baseUrl || 'https://api.openai.com'})`);
  if (!hasRealKey()) {
    console.warn('⚠️  config.json chưa có API key thật — /chat và /vision sẽ báo lỗi cho tới khi bạn dán key vào.');
  }
});
