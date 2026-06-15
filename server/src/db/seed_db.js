const Database = require('better-sqlite3');
const path = require('path');

const filesDbPath = path.join(__dirname, 'data/files.db');
const guidesDbPath = path.join(__dirname, 'data/guides.db');

const filesDb = new Database(filesDbPath);
const guidesDb = new Database(guidesDbPath);

console.log('Checking database status...');

try {
  // Check if guides exist
  const existingGuides = guidesDb.prepare('SELECT * FROM guides').all();
  console.log(`Current guide count: ${existingGuides.length}`);

  if (existingGuides.length === 0) {
    console.log('No guides found. Seeding mock files first...');

    // 1. Insert mock files
    const freeFileStmt = filesDb.prepare(`
      INSERT INTO files (uploader_id, original_name, mime_type, size_bytes, purpose, discord_message_id, discord_channel_id, cdn_url, cdn_url_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const freeFileResult = freeFileStmt.run(
      0, // Admin uploader
      'free_guide_template.pdf',
      'application/pdf',
      10240, // 10KB
      'guide_doc',
      '000000000000000000',
      '000000000000000000',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Public dummy PDF url
      '2099-12-31T23:59:59Z'
    );
    const freeFileId = freeFileResult.lastInsertRowid;

    const proFileResult = freeFileStmt.run(
      0,
      'pro_guide_advanced.pdf',
      'application/pdf',
      20480, // 20KB
      'guide_doc',
      '000000000000000000',
      '000000000000000000',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      '2099-12-31T23:59:59Z'
    );
    const proFileId = proFileResult.lastInsertRowid;

    console.log(`Mock files created: Free ID ${freeFileId}, Pro ID ${proFileId}`);

    // 2. Insert guides
    const insertGuideStmt = guidesDb.prepare(`
      INSERT INTO guides (created_by, title, description, category, file_id, access_level, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertGuideStmt.run(
      0, // created by admin
      'Hướng dẫn viết Đề cương Nghiên cứu (Free)',
      'Tài liệu hướng dẫn căn bản để viết đề cương NCKH cho sinh viên. Chứa cấu trúc cơ bản và các phần bắt buộc cần có trong đề cương nghiên cứu khoa học tại FPT University.',
      'Đề cương',
      freeFileId,
      'free',
      'published'
    );

    insertGuideStmt.run(
      0,
      'Khung sườn nâng cao & Phương pháp luận (Pro)',
      'Tài liệu chuyên sâu về phương pháp nghiên cứu định lượng, định tính và các mô hình phân tích dữ liệu nâng cao dành cho sinh viên làm khóa luận tốt nghiệp hoặc nghiên cứu nâng cao.',
      'Phương pháp',
      proFileId,
      'pro',
      'published'
    );

    console.log('Database successfully seeded with 1 Free Guide and 1 Pro Guide!');
  } else {
    console.log('Database already has guides. No seeding needed.');
    console.log('Current guides:');
    existingGuides.forEach(g => {
      console.log(`- [${g.access_level.toUpperCase()}] ${g.title} (ID: ${g.id})`);
    });
  }
} catch (err) {
  console.error('Error during seeding:', err);
} finally {
  filesDb.close();
  guidesDb.close();
}
