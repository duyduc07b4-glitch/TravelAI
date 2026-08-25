// Quét folder knowledge/, cắt nhỏ tài liệu, tạo embedding và lưu vào vector-store.json
const { config, loadRawDocuments, chunkText, embed, saveStore } = require('./shared');

async function main() {
  const rawDocs = loadRawDocuments();
  if (rawDocs.length === 0) {
    console.log(`Không tìm thấy tài liệu nào trong ${config.knowledgeFolder}`);
    return;
  }

  const entries = [];
  for (const doc of rawDocs) {
    const chunks = chunkText(doc.text, config.chunkSize, config.chunkOverlap);
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`Embedding ${doc.source} [${i + 1}/${chunks.length}]...\r`);
      const embedding = await embed(chunks[i]);
      entries.push({ source: doc.source, chunkIndex: i, text: chunks[i], embedding });
    }
  }

  saveStore(entries);
  console.log(`\nĐã index ${entries.length} đoạn từ ${rawDocs.length} tài liệu vào vector-store.json`);
}

main().catch((err) => {
  console.error('Lỗi ingest:', err.message);
  process.exit(1);
});
