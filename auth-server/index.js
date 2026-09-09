const crypto = require('crypto');
const express = require('express');
const config = require('./config.json');
const { loadData, saveData, hashPassword, verifyPassword } = require('./store');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  // Browser preflights (needed here because requests carry an Authorization header) — no
  // route handles OPTIONS directly, so without this Express would 404 it and fail the
  // preflight check before the actual GET/POST/DELETE request is even sent.
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Phiên đăng nhập giữ trong bộ nhớ (Map token -> username) — mất khi restart server,
// chấp nhận được vì đây là auth server demo cho hackathon, không phải hệ thống thật.
const sessions = new Map();

function publicUser(u) {
  return { username: u.username, role: u.role };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const username = sessions.get(token);
  if (!username) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  const data = loadData();
  const user = data.users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: 'Tài khoản không còn tồn tại' });
  req.token = token;
  req.user = user;
  req.data = data;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ admin mới dùng được chức năng này' });
  next();
}

app.get('/health', (req, res) => {
  const data = loadData();
  res.json({ ok: true, users: data.users.length, invites: data.invites.length });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });
  const data = loadData();
  const user = data.users.find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.username);
  res.json({ token, user: publicUser(user) });
});

app.post('/logout', requireAuth, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

app.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Danh sách người có thể mời — bất kỳ ai đăng nhập đều xem được (không cần quyền admin),
// khác với /users (đầy đủ, chỉ admin) vì mục đích chỉ để chọn người mời, không phải quản trị.
app.get('/directory', requireAuth, (req, res) => {
  const others = req.data.users.filter((u) => u.username !== req.user.username).map((u) => ({ username: u.username }));
  res.json({ users: others });
});

// ---------- Quản lý user (chỉ admin) ----------
app.get('/users', requireAuth, requireAdmin, (req, res) => {
  res.json({ users: req.data.users.map(publicUser) });
});

app.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });
  const cleanRole = role === 'admin' ? 'admin' : 'user';
  const data = req.data;
  if (data.users.some((u) => u.username === username)) {
    return res.status(409).json({ error: `Tài khoản "${username}" đã tồn tại` });
  }
  const newUser = { username, role: cleanRole, passwordHash: hashPassword(password) };
  data.users.push(newUser);
  saveData(data);
  res.status(201).json({ user: publicUser(newUser) });
});

app.delete('/users/:username', requireAuth, requireAdmin, (req, res) => {
  const { username } = req.params;
  const data = req.data;
  if (username === req.user.username) return res.status(400).json({ error: 'Không thể tự xoá chính mình' });
  const target = data.users.find((u) => u.username === username);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
  const remainingAdmins = data.users.filter((u) => u.role === 'admin' && u.username !== username);
  if (target.role === 'admin' && remainingAdmins.length === 0) {
    return res.status(400).json({ error: 'Không thể xoá admin cuối cùng' });
  }
  data.users = data.users.filter((u) => u.username !== username);
  // Đăng xuất luôn mọi phiên của tài khoản vừa bị xoá.
  for (const [token, sessUsername] of sessions.entries()) {
    if (sessUsername === username) sessions.delete(token);
  }
  saveData(data);
  res.json({ ok: true });
});

// ---------- Lời mời chuyến đi ----------
// Tạo 1 lời mời cho mỗi người được chọn, gắn kèm tóm tắt lịch trình đã tạo.
app.post('/invites', requireAuth, (req, res) => {
  const { trip, invitees } = req.body || {};
  if (!trip || !Array.isArray(invitees) || !invitees.length) {
    return res.status(400).json({ error: 'Thiếu "trip" hoặc danh sách "invitees"' });
  }
  const data = req.data;
  const validUsernames = new Set(data.users.map((u) => u.username));
  const created = [];
  const now = new Date().toISOString();
  invitees.forEach((toUsername) => {
    if (toUsername === req.user.username || !validUsernames.has(toUsername)) return;
    const invite = {
      id: crypto.randomBytes(8).toString('hex'),
      from: req.user.username,
      toUsername,
      trip,
      createdAt: now,
      seen: false
    };
    data.invites.push(invite);
    created.push(invite);
  });
  saveData(data);
  res.status(201).json({ invites: created });
});

// Lời mời gửi TỚI người đang đăng nhập — tự đánh dấu đã xem khi lấy về.
app.get('/invites', requireAuth, (req, res) => {
  const data = req.data;
  const mine = data.invites.filter((i) => i.toUsername === req.user.username);
  const unseenIds = mine.filter((i) => !i.seen).map((i) => i.id);
  if (unseenIds.length) {
    data.invites.forEach((i) => { if (unseenIds.includes(i.id)) i.seen = true; });
    saveData(data);
  }
  res.json({ invites: mine.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) });
});

app.delete('/invites/:id', requireAuth, (req, res) => {
  const data = req.data;
  const invite = data.invites.find((i) => i.id === req.params.id);
  if (!invite) return res.status(404).json({ error: 'Không tìm thấy lời mời' });
  if (invite.toUsername !== req.user.username) return res.status(403).json({ error: 'Không phải lời mời của bạn' });
  data.invites = data.invites.filter((i) => i.id !== req.params.id);
  saveData(data);
  res.json({ ok: true });
});

app.listen(config.port, () => {
  console.log(`Auth server chạy tại http://localhost:${config.port}`);
  console.log('Tài khoản mặc định: admin1 / user1 / user2, mật khẩu 123123');
});
