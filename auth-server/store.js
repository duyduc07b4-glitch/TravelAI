const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('./config.json');
const dataPath = path.join(__dirname, config.dataFile);

const SEED_PASSWORD = '123123';
const SEED_USERS = [
  { username: 'admin1', role: 'admin' },
  { username: 'user1', role: 'user' },
  { username: 'user2', role: 'user' }
];

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function seedData() {
  return {
    users: SEED_USERS.map((u) => ({ username: u.username, role: u.role, passwordHash: hashPassword(SEED_PASSWORD) })),
    invites: [],
    history: []
  };
}

function loadData() {
  if (!fs.existsSync(dataPath)) {
    const seeded = seedData();
    saveData(seeded);
    return seeded;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    if (!Array.isArray(raw.users)) raw.users = seedData().users;
    if (!Array.isArray(raw.invites)) raw.invites = [];
    if (!Array.isArray(raw.history)) raw.history = [];
    return raw;
  } catch (e) {
    // File hỏng/không đọc được — seed lại thay vì crash cả server.
    const seeded = seedData();
    saveData(seeded);
    return seeded;
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData, hashPassword, verifyPassword };
