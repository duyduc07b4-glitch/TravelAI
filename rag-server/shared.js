const fs = require('fs');
const path = require('path');

const config = require('./config.json');
const knowledgeDir = path.resolve(__dirname, config.knowledgeFolder);
const storePath = path.join(__dirname, 'vector-store.json');

/**
 * Đọc toàn bộ file trong knowledgeFolder và tách thành các "document" thô
 * { source, text }. File .json (mảng object, vd restaurants.json) được tách
 * thành 1 document/phần tử để giữ nguyên ngữ cảnh; file .md/.txt đọc nguyên văn.
 */
function loadRawDocuments() {
  const docs = [];
  if (!fs.existsSync(knowledgeDir)) return docs;

  for (const file of fs.readdirSync(knowledgeDir)) {
    const full = path.join(knowledgeDir, file);
    if (fs.statSync(full).isDirectory()) continue;
    const ext = path.extname(file).toLowerCase();

    if (ext === '.json') {
      const items = JSON.parse(fs.readFileSync(full, 'utf8'));
      (Array.isArray(items) ? items : [items]).forEach((item, i) => {
        const text = Object.entries(item)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        docs.push({ source: `${file}#${i}`, text });
      });
    } else if (ext === '.md' || ext === '.txt') {
      docs.push({ source: file, text: fs.readFileSync(full, 'utf8') });
    }
  }
  return docs;
}

/** Cắt văn bản dài thành các đoạn ~chunkSize từ, chồng lấn chunkOverlap từ. */
function chunkText(text, chunkSize, overlap) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= chunkSize) return [text.trim()];

  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function embed(text) {
  const res = await fetch(`${config.ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.embeddingModel, prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama embeddings lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.embedding;
}

async function chat(system, user) {
  const res = await fetch(`${config.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.chatModel,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama chat lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? '';
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function loadStore() {
  if (!fs.existsSync(storePath)) return [];
  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}

function saveStore(entries) {
  fs.writeFileSync(storePath, JSON.stringify(entries, null, 2));
}

module.exports = {
  config,
  knowledgeDir,
  storePath,
  loadRawDocuments,
  chunkText,
  embed,
  chat,
  cosineSimilarity,
  loadStore,
  saveStore,
};
