const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}

fs.mkdirSync('./uploads', { recursive: true });
fs.mkdirSync('./data', { recursive: true });

function read(name) {
  const f = `./data/${name}.json`;
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
}
function write(name, d) { fs.writeFileSync(`./data/${name}.json`, JSON.stringify(d, null, 2)); }
function id(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

['village', 'groups', 'individuals', 'services', 'members', 'registrations', 'checkins'].forEach(t => {
  if (!fs.existsSync(`./data/${t}.json`)) write(t, []);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

function getDataFile(user_type) {
  switch (user_type) {
    case 'village': return 'village';
    case 'group': return 'groups';
    case 'individual': return 'individuals';
  }
}

console.log('Server starting...');

app.post('/api/login', (req, res) => {
  const { username, password, user_type } = req.body;
  const file = getDataFile(user_type);
  const users = read(file);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ message: '用户名或密码错误' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ message: '用户名或密码错误' });
  res.json({ message: '登录成功', user_id: user.id, username: user.username, phone: user.phone, avatar: user.avatar, user_type });
});

app.post('/api/register', async (req, res) => {
  const { username, password, phone, user_type } = req.body;
  const file = getDataFile(user_type);
  const users = read(file);
  if (users.find(u => u.username === username)) return res.status(400).json({ message: '用户名已存在' });
  const user = { id: id(users), username, password: bcrypt.hashSync(password, 10), phone, avatar: '', created_at: new Date().toISOString(), ...req.body };
  users.push(user);
  write(file, users);
  res.json({ message: '注册成功', user_id: user.id });
});

app.get('/api/village/:id/services', (req, res) => {
  const services = read('services').filter(s => s.village_id == req.params.id).reverse();
  res.json(services);
});

app.post('/api/village/:id/services', (req, res) => {
  const services = read('services');
  const s = { id: id(services), village_id: parseInt(req.params.id), current_participants: 0, created_at: new Date().toISOString(), ...req.body };
  services.push(s);
  write('services', services);
  res.json({ message: '发布成功', service_id: s.id });
});

app.get('/api/services', (req, res) => {
  res.json(read('services').reverse());
});

app.get('/api/services/:id', (req, res) => {
  const s = read('services').find(x => x.id == req.params.id);
  res.json(s || {});
});

app.put('/api/services/:id', (req, res) => {
  const services = read('services');
  const i = services.findIndex(x => x.id == req.params.id);
  if (i > -1) {
    services[i] = { ...services[i], ...req.body };
    write('services', services);
  }
  res.json({ message: '更新成功' });
});

app.delete('/api/services/:id', (req, res) => {
  write('services', read('services').filter(x => x.id != req.params.id));
  write('registrations', read('registrations').filter(x => x.service_id != req.params.id));
  write('checkins', read('checkins').filter(x => x.service_id != req.params.id));
  res.json({ message: '已删除' });
});

app.get('/api/services/:id/registrations', (req, res) => {
  res.json(read('registrations').filter(x => x.service_id == req.params.id));
});

app.get('/api/village/:id/registrations', (req, res) => {
  const villageServices = read('services').filter(s => s.village_id == req.params.id).map(s => s.id);
  res.json(read('registrations').filter(r => villageServices.includes(r.service_id)));
});

app.post('/api/services/:id/register', (req, res) => {
  const regs = read('registrations');
  const { user_id, user_type, username } = req.body;
  if (regs.find(r => r.service_id == req.params.id && r.user_id == user_id)) return res.status(400).json({ message: '已报名' });
  regs.push({ id: id(regs), service_id: parseInt(req.params.id), user_id, user_type, username, hours_earned: 0, registered_at: new Date().toISOString() });
  write('registrations', regs);
  const services = read('services');
  const s = services.find(x => x.id == req.params.id);
  if (s) { s.current_participants++; write('services', services); }
  res.json({ message: '报名成功' });
});

app.post('/api/services/:id/cancel', (req, res) => {
  const { user_id } = req.body;
  write('registrations', read('registrations').filter(r => !(r.service_id == req.params.id && r.user_id == user_id)));
  const services = read('services');
  const s = services.find(x => x.id == req.params.id);
  if (s && s.current_participants > 0) { s.current_participants--; write('services', services); }
  res.json({ message: '已取消报名' });
});

app.post('/api/services/:id/check-in', (req, res) => {
  const { user_id, username } = req.body;
  const c = read('checkins');
  const ex = c.find(x => x.service_id == req.params.id && x.user_id == user_id);
  if (ex) {
    if (ex.check_in_time && !ex.check_out_time) return res.status(400).json({ message: '已签到' });
    if (ex.check_out_time) return res.status(400).json({ message: '已完成' });
    ex.check_in_time = new Date().toISOString();
    ex.status = 'checked-in';
  } else {
    c.push({ id: id(c), service_id: parseInt(req.params.id), user_id, username, check_in_time: new Date().toISOString(), check_out_time: null, status: 'checked-in' });
  }
  write('checkins', c);
  res.json({ message: '签到成功' });
});

app.post('/api/services/:id/check-out', (req, res) => {
  const { user_id } = req.body;
  const c = read('checkins');
  const ch = c.find(x => x.service_id == req.params.id && x.user_id == user_id);
  if (!ch || !ch.check_in_time) return res.status(400).json({ message: '请先签到' });
  ch.check_out_time = new Date().toISOString();
  ch.status = 'completed';
  write('checkins', c);
  const s = read('services').find(x => x.id == req.params.id);
  const hours = s?.duration || 2;
  const regs = read('registrations');
  const r = regs.find(x => x.service_id == req.params.id && x.user_id == user_id);
  if (r) r.hours_earned += hours;
  write('registrations', regs);
  const users = read('individuals');
  const u = users.find(x => x.id == user_id);
  if (u) { u.total_hours = (u.total_hours || 0) + hours; write('individuals', users); }
  res.json({ message: `签退成功，获得 ${hours} 小时`, hours });
});

app.get('/api/services/:id/check-status/:user_id', (req, res) => {
  const st = read('checkins').find(x => x.service_id == req.params.id && x.user_id == req.params.user_id);
  res.json(st || { status: 'not-checked-in' });
});

app.get('/api/individuals/:id/check-ins', (req, res) => {
  const ch = read('checkins').filter(x => x.user_id == req.params.id).reverse();
  res.json(ch.map(c => { const s = read('services').find(x => x.id == c.service_id); return { ...c, service_title: s?.title, date: s?.date, location: s?.location }; }));
});

app.get('/api/groups', (req, res) => res.json(read('groups')));
app.get('/api/groups/:id', (req, res) => res.json(read('groups').find(x => x.id == req.params.id) || {}));

app.put('/api/groups/:id', (req, res) => {
  const g = read('groups');
  const i = g.findIndex(x => x.id == req.params.id);
  if (i > -1) { g[i] = { ...g[i], ...req.body }; write('groups', g); }
  res.json({ message: '更新成功' });
});

app.get('/api/groups/:id/registrations', (req, res) => {
  res.json(read('registrations').filter(x => x.user_type === 'group' && x.user_id == req.params.id));
});

app.get('/api/groups/:id/members', (req, res) => {
  const m = read('members').filter(x => x.group_id == req.params.id && x.status === 'approved');
  res.json(m.map(mem => { const u = read('individuals').find(x => x.id == mem.user_id); return { ...mem, ...u }; }));
});

app.post('/api/groups/:id/join', (req, res) => {
  const m = read('members');
  const { user_id, username } = req.body;
  if (m.find(x => x.group_id == req.params.id && x.user_id == user_id)) return res.status(400).json({ message: '已加入' });
  m.push({ id: id(m), group_id: parseInt(req.params.id), user_id, username, status: 'pending', applied_at: new Date().toISOString() });
  write('members', m);
  res.json({ message: '申请已提交' });
});

app.get('/api/groups/:id/applications', (req, res) => {
  const apps = read('members').filter(x => x.group_id == req.params.id && x.status === 'pending');
  res.json(apps.map(a => { const u = read('individuals').find(x => x.id == a.user_id); return { ...a, ...u }; }));
});

app.post('/api/groups/:id/approve', (req, res) => {
  const m = read('members');
  const app = m.find(x => x.group_id == req.params.id && x.user_id == req.body.user_id);
  if (app) { app.status = 'approved'; write('members', m); }
  res.json({ message: '已同意' });
});

app.post('/api/groups/:id/reject', (req, res) => {
  write('members', read('members').filter(x => !(x.group_id == req.params.id && x.user_id == req.body.user_id && x.status === 'pending')));
  res.json({ message: '已拒绝' });
});

app.get('/api/individuals', (req, res) => res.json(read('individuals')));
app.get('/api/individuals/:id', (req, res) => res.json(read('individuals').find(x => x.id == req.params.id) || {}));

app.put('/api/individuals/:id', (req, res) => {
  const u = read('individuals');
  const i = u.findIndex(x => x.id == req.params.id);
  if (i > -1) { u[i] = { ...u[i], ...req.body }; write('individuals', u); }
  res.json({ message: '更新成功' });
});

app.get('/api/individuals/:id/registrations', (req, res) => {
  res.json(read('registrations').filter(x => x.user_id == req.params.id && ['individual', 'group_member'].includes(x.user_type)));
});

app.get('/api/individuals/:id/groups', (req, res) => {
  const myGroups = read('members').filter(m => m.user_id == req.params.id && m.status === 'approved').map(m => m.group_id);
  res.json(read('groups').filter(g => myGroups.includes(g.id)));
});

app.post('/api/upload/avatar', upload.single('avatar'), (req, res) => {
  const { user_id, user_type } = req.body;
  if (!req.file) return res.status(400).json({ message: '请选择图片' });
  const avatar = `/uploads/${req.file.filename}`;
  const file = getDataFile(user_type);
  const users = read(file);
  const u = users.find(x => x.id == user_id);
  if (u) { u.avatar = avatar; write(file, users); }
  res.json({ avatar, message: '上传成功' });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.json({ message: 'Volunteer System API running' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Data stored in ./data/ folder`);
  console.log(`✅ Ready!`);
});
