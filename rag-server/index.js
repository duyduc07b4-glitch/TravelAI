const express = require('express');
const { config, embed, chat, cosineSimilarity, loadStore } = require('./shared');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/health', (req, res) => {
  const store = loadStore();
  res.json({ ok: true, indexedChunks: store.length });
});

// Trả về top-K đoạn tài liệu liên quan nhất, không gọi LLM (để tự ghép prompt phía client).
app.post('/search', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Thiếu "question"' });

    const store = loadStore();
    if (store.length === 0) return res.json({ results: [] });

    const qEmbedding = await embed(question);
    const ranked = store
      .map((e) => ({ ...e, score: cosineSimilarity(qEmbedding, e.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK)
      .map(({ source, text, score }) => ({ source, text, score }));

    res.json({ results: ranked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tìm đoạn liên quan + gọi LLM trả lời luôn dựa trên tài liệu đó.
app.post('/query', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Thiếu "question"' });

    const store = loadStore();
    let context = '(Không có tài liệu nào được index)';
    let sources = [];

    if (store.length > 0) {
      const qEmbedding = await embed(question);
      const ranked = store
        .map((e) => ({ ...e, score: cosineSimilarity(qEmbedding, e.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, config.topK);
      context = ranked.map((r) => `[${r.source}]\n${r.text}`).join('\n\n');
      sources = ranked.map((r) => r.source);
    }

    const system =
      'Bạn là trợ lý du lịch, chỉ trả lời dựa trên NGỮ CẢNH được cung cấp bên dưới. ' +
      'Nếu ngữ cảnh không có thông tin liên quan, nói rõ là chưa có dữ liệu thay vì bịa.';
    const user = `Ngữ cảnh:\n${context}\n\nCâu hỏi: ${question}`;

    const answer = await chat(system, user);
    res.json({ answer, sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(config.port, () => {
  console.log(`RAG server chạy tại http://localhost:${config.port}`);
  console.log(`Knowledge folder: ${config.knowledgeFolder}`);
  console.log('Chạy "npm run ingest" để index tài liệu trước khi truy vấn.');
});
