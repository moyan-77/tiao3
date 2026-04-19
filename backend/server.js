const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const USE_DB = !!process.env.DATABASE_URL;
let pool = null;

if (USE_DB) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('📊 Using PostgreSQL database');
} else {
  console.log('📁 Using local JSON files');
}

async function initDB() {
  if (!USE_DB) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS village (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        phone TEXT,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        phone TEXT,
        avatar TEXT,
        specialty TEXT,
        services TEXT,
        is_college BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS individuals (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        phone TEXT,
        avatar TEXT,
        specialty TEXT,
        services TEXT,
        is_college BOOLEAN DEFAULT false,
        college_name TEXT,
        total_hours INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        village_id INTEGER,
        title TEXT,
        description TEXT,
        location TEXT,
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER,
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,
        task_type TEXT,
        service_category TEXT,
        service_target TEXT,
        need_college BOOLEAN,
        need_skill BOOLEAN,
        skill_requirement TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER,
        user_id INTEGER,
        username TEXT,
        status TEXT,
        applied_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        service_id INTEGER,
        user_id INTEGER,
        user_type TEXT,
        username TEXT,
        group_id INTEGER,
        group_name TEXT,
        hours_earned INTEGER DEFAULT 0,
        registered_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        service_id INTEGER,
        user_id INTEGER,
        username TEXT,
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        hours INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        service_id INTEGER,
        user_id INTEGER,
        rater_id INTEGER,
        rater_type TEXT,
        username TEXT,
        service_title TEXT,
        rating INTEGER,
        comment TEXT,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database tables initialized');
  } finally {
    client.release();
  }
}

async function read(name) {
  if (!USE_DB) {
    const f = path.join(__dirname, 'data', `${name}.json`);
    if (!fs.existsSync(f)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }
  const res = await pool.query(`SELECT * FROM ${name} ORDER BY id`);
  return res.rows;
}

function id(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

async function write(name, data) {
  if (!USE_DB) {
    fs.writeFileSync(path.join(__dirname, 'data', `${name}.json`), JSON.stringify(data, null, 2));
    return;
  }
}

async function insert(name, obj) {
  if (!USE_DB) {
    const data = await read(name);
    const newId = data.length ? Math.max(...data.map(x => x.id)) + 1 : 1;
    const newObj = { id: newId, ...obj };
    data.push(newObj);
    await write(name, data);
    return newObj;
  }
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined);
  const values = keys.map((_, i) => `$${i + 1}`);
  const q = `INSERT INTO ${name} (${keys.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`;
  const res = await pool.query(q, keys.map(k => obj[k]));
  return res.rows[0];
}

async function update(name, id, obj) {
  if (!USE_DB) {
    const data = await read(name);
    const i = data.findIndex(x => x.id == id);
    if (i > -1) { data[i] = { ...data[i], ...obj }; await write(name, data); }
    return;
  }
  const keys = Object.keys(obj).filter((k, i) => obj[k] !== undefined);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  await pool.query(`UPDATE ${name} SET ${sets} WHERE id = $1`, [id, ...keys.map(k => obj[k])]);
}

async function remove(name, filterFn) {
  if (!USE_DB) {
    const data = await read(name);
    await write(name, data.filter(x => !filterFn(x)));
    return;
  }
}

initDB().catch(console.error);

if (!USE_DB) {
  ['village', 'groups', 'individuals', 'services', 'members', 'registrations', 'checkins', 'ratings'].forEach(async t => {
    if (!fs.existsSync(path.join(__dirname, 'data', `${t}.json`))) await write(t, []);
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
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

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user_type = req.body.user_type || req.body.userType;
  const file = getDataFile(user_type);
  const users = await read(file);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ message: '用户名或密码错误' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ message: '用户名或密码错误' });
  res.json({ 
    message: '登录成功', 
    user: {
      id: user.id, 
      username: user.username, 
      phone: user.phone, 
      avatar: user.avatar, 
      userType: user_type
    }
  });
});

app.post('/api/register', async (req, res) => {
  const { username, password, phone } = req.body;
  const user_type = req.body.user_type || req.body.userType;
  const file = getDataFile(user_type);
  const users = await read(file);
  if (users.find(u => u.username === username)) return res.status(400).json({ message: '用户名已存在' });
  const user = { id: id(users), username, password: bcrypt.hashSync(password, 10), phone, avatar: '', created_at: new Date().toISOString() };
  if (!USE_DB) {
    users.push(user);
    await write(file, users);
  } else {
    await insert(file, user);
  }
  res.json({ message: '注册成功', user_id: user.id });
});

app.get('/api/village/:id/services', async (req, res) => {
  const services = [].concat(await read('services') || []).filter(s => s.village_id == req.params.id).reverse();
  res.json(services);
});

app.post('/api/village/:id/services', async (req, res) => {
  const services = await read('services');
  const s = { id: id(services), village_id: parseInt(req.params.id), current_participants: 0, created_at: new Date().toISOString(), ...req.body };
  if (!USE_DB) {
    services.push(s);
    await write('services', services);
  } else {
    await insert('services', s);
  }
  res.json({ message: '发布成功', service_id: s.id });
});

app.get('/api/services', async (req, res) => {
  res.json([].concat(await read('services') || []).reverse());
});

app.get('/api/services/:id', async (req, res) => {
  const services = await read('services');
  const s = services.find(x => x.id == req.params.id);
  res.json(s || {});
});

app.put('/api/services/:id', async (req, res) => {
  const services = await read('services');
  const i = services.findIndex(x => x.id == req.params.id);
  if (i > -1) {
    services[i] = { ...services[i], ...req.body };
    if (!USE_DB) {
      await write('services', services);
    } else {
      await update('services', req.params.id, req.body);
    }
  }
  res.json({ message: '更新成功' });
});

app.delete('/api/services/:id', async (req, res) => {
  const services = await read('services');
  const registrations = await read('registrations');
  const checkins = await read('checkins');
  if (!USE_DB) {
    await write('services', services.filter(x => x.id != req.params.id));
    await write('registrations', registrations.filter(x => x.service_id != req.params.id));
    await write('checkins', checkins.filter(x => x.service_id != req.params.id));
  }
  res.json({ message: '已删除' });
});

app.get('/api/services/registrations', async (req, res) => {
  const regs = [].concat(await read('registrations') || []);
  const individuals = await read('individuals');
  const groups = await read('groups');
  
  res.json(regs.map(r => {
    let userInfo = {};
    if (r.user_type === 'group') {
      const g = groups.find(x => x.id == r.user_id);
      userInfo = { phone: g?.phone, specialty: g?.specialty, is_college: g?.is_college };
    } else {
      const u = individuals.find(x => x.id == r.user_id);
      userInfo = { phone: u?.phone, specialty: u?.specialty, is_college: u?.is_college, college_name: u?.college_name };
    }
    return { ...r, ...userInfo };
  }));
});

app.get('/api/services/:id/registrations', async (req, res) => {
  const regs = [].concat(await read('registrations') || []).filter(x => x.service_id == req.params.id);
  const individuals = await read('individuals');
  const groups = await read('groups');
  
  res.json(regs.map(r => {
    let userInfo = {};
    if (r.user_type === 'group') {
      const g = groups.find(x => x.id == r.user_id);
      userInfo = { phone: g?.phone, specialty: g?.specialty, is_college: g?.is_college };
    } else {
      const u = individuals.find(x => x.id == r.user_id);
      userInfo = { phone: u?.phone, specialty: u?.specialty, is_college: u?.is_college, college_name: u?.college_name };
    }
    return { ...r, ...userInfo };
  }));
});

app.get('/api/village/:id/registrations', async (req, res) => {
  const villageServices = [].concat(await read('services') || []).filter(s => s.village_id == req.params.id).map(s => s.id);
  const regs = [].concat(await read('registrations') || []).filter(r => villageServices.includes(r.service_id));
  const individuals = await read('individuals');
  const groups = await read('groups');
  
  res.json(regs.map(r => {
    let userInfo = {};
    if (r.user_type === 'group') {
      const g = groups.find(x => x.id == r.user_id);
      userInfo = { phone: g?.phone, specialty: g?.specialty, is_college: g?.is_college };
    } else {
      const u = individuals.find(x => x.id == r.user_id);
      userInfo = { phone: u?.phone, specialty: u?.specialty, is_college: u?.is_college, college_name: u?.college_name };
    }
    return { ...r, ...userInfo };
  }));
});

app.post('/api/services/:id/register', async (req, res) => {
  const regs = await read('registrations');
  const { user_id, user_type, username, group_id, group_name } = req.body;
  if (regs.find(r => r.service_id == req.params.id && r.user_id == user_id && r.user_type == user_type)) return res.status(400).json({ message: '已报名' });
  const newReg = { id: id(regs), service_id: parseInt(req.params.id), user_id, user_type, username, group_id, group_name, hours_earned: 0, registered_at: new Date().toISOString() };
  if (!USE_DB) {
    regs.push(newReg);
    await write('registrations', regs);
  } else {
    await insert('registrations', newReg);
  }
  const services = await read('services');
  const s = services.find(x => x.id == req.params.id);
  if (s && user_type !== 'group') { 
    s.current_participants++; 
    if (!USE_DB) {
      await write('services', services);
    } else {
      await update('services', s.id, { current_participants: s.current_participants });
    }
  }
  res.json({ message: '报名成功' });
});

app.post('/api/services/:id/cancel', async (req, res) => {
  const { user_id, user_type } = req.body;
  const regs = await read('registrations');
  const reg = regs.find(r => r.service_id == req.params.id && r.user_id == user_id);
  if (!USE_DB) {
    await write('registrations', regs.filter(r => !(r.service_id == req.params.id && r.user_id == user_id)));
  }
  const services = await read('services');
  const s = services.find(x => x.id == req.params.id);
  if (s && s.current_participants > 0 && reg && reg.user_type !== 'group') { 
    s.current_participants--;
    if (!USE_DB) {
      await write('services', services);
    } else {
      await update('services', s.id, { current_participants: s.current_participants });
    }
  }
  res.json({ message: '已取消报名' });
});

app.post('/api/services/:id/check-in', async (req, res) => {
  const { user_id, username } = req.body;
  const c = await read('checkins');
  const ex = c.find(x => x.service_id == req.params.id && x.user_id == user_id);
  if (ex) {
    if (ex.check_in_time && !ex.check_out_time) return res.status(400).json({ message: '已签到' });
  }
  const newCheckin = { id: id(c), service_id: parseInt(req.params.id), user_id, username, check_in_time: new Date().toISOString(), check_out_time: null, hours: 0 };
  if (!USE_DB) {
    c.push(newCheckin);
    await write('checkins', c);
  } else {
    await insert('checkins', newCheckin);
  }
  res.json({ message: '签到成功' });
});

app.post('/api/services/:id/check-out', async (req, res) => {
  const { user_id } = req.body;
  const services = await read('services');
  const service = services.find(x => x.id == req.params.id);
  const hours = service?.duration || 2;
  
  const c = await read('checkins');
  const ch = c.find(x => x.service_id == req.params.id && x.user_id == user_id);
  if (!ch || !ch.check_in_time) return res.status(400).json({ message: '请先签到' });
  ch.check_out_time = new Date().toISOString();
  ch.hours = hours;
  if (!USE_DB) {
    await write('checkins', c);
  } else {
    await update('checkins', ch.id, { check_out_time: ch.check_out_time, hours: ch.hours });
  }
  const regs = await read('registrations');
  const userRegs = regs.filter(x => x.service_id == req.params.id && x.user_id == user_id);
  userRegs.forEach(r => {
    r.hours_earned = hours;
    if (USE_DB) {
      update('registrations', r.id, { hours_earned: hours });
    }
  });
  if (!USE_DB) {
    await write('registrations', regs);
  }
  const users = await read('individuals');
  const u = users.find(x => x.id == user_id);
  if (u) { 
    u.total_hours = (u.total_hours || 0) + hours; 
    if (!USE_DB) {
      await write('individuals', users);
    } else {
      await update('individuals', u.id, { total_hours: u.total_hours });
    }
  }
  res.json({ message: `签退成功，获得 ${hours} 小时`, hours });
});

app.get('/api/services/:id/check-status/:user_id', async (req, res) => {
  const checkins = await read('checkins');
  const st = checkins.find(x => x.service_id == req.params.id && x.user_id == req.params.user_id);
  res.json(st || { status: 'not-checked-in' });
});

app.get('/api/individuals/:id/check-ins', async (req, res) => {
  const ch = [].concat(await read('checkins') || []).filter(x => x.user_id == req.params.id).reverse();
  const services = await read('services');
  res.json(ch.map(c => { const s = services.find(x => x.id == c.service_id); return { ...c, service_title: s?.title || '', date: s?.date || '', location: s?.location || '' }; }));
});

app.get('/api/groups', async (req, res) => res.json([].concat(await read('groups') || [])));
app.get('/api/groups/:id', async (req, res) => {
  const groups = await read('groups');
  res.json(groups.find(x => x.id == req.params.id) || {});
});

app.put('/api/groups/:id', async (req, res) => {
  const g = await read('groups');
  const i = g.findIndex(x => x.id == req.params.id);
  if (i > -1) { 
    g[i] = { ...g[i], ...req.body }; 
    if (!USE_DB) {
      await write('groups', g);
    } else {
      await update('groups', req.params.id, req.body);
    }
  }
  res.json({ message: '更新成功' });
});

app.get('/api/groups/:id/registrations', async (req, res) => {
  const groupMembers = [].concat(await read('members') || []).filter(x => x.group_id == req.params.id && x.status === 'approved').map(x => x.user_id);
  const regs = [].concat(await read('registrations') || []).filter(x => 
    (x.user_type === 'group' && x.user_id == req.params.id) ||
    (x.user_type === 'group_member' && groupMembers.includes(x.user_id))
  );
  const individuals = await read('individuals');
  const groups = await read('groups');
  
  res.json(regs.map(r => {
    let userInfo = {};
    if (r.user_type === 'group') {
      const g = groups.find(x => x.id == r.user_id);
      userInfo = { phone: g?.phone, specialty: g?.specialty, is_college: g?.is_college };
    } else {
      const u = individuals.find(x => x.id == r.user_id);
      userInfo = { phone: u?.phone, specialty: u?.specialty, is_college: u?.is_college, college_name: u?.college_name };
    }
    return { ...r, ...userInfo };
  }));
});

app.get('/api/groups/:id/members', async (req, res) => {
  const m = [].concat(await read('members') || []).filter(x => x.group_id == req.params.id);
  const users = await read('individuals');
  res.json(m.map(mem => { const u = users.find(x => x.id == mem.user_id); return { ...mem, ...u }; }));
});

app.post('/api/groups/:id/join', async (req, res) => {
  const m = await read('members');
  const { user_id, username } = req.body;
  if (m.find(x => x.group_id == req.params.id && x.user_id == user_id)) return res.status(400).json({ message: '已加入' });
  const newMember = { id: id(m), group_id: parseInt(req.params.id), user_id, username, status: 'pending', applied_at: new Date().toISOString() };
  if (!USE_DB) {
    m.push(newMember);
    await write('members', m);
  } else {
    await insert('members', newMember);
  }
  res.json({ message: '申请已提交' });
});

app.get('/api/groups/:id/applications', async (req, res) => {
  const apps = [].concat(await read('members') || []).filter(x => x.group_id == req.params.id && x.status === 'pending');
  const users = await read('individuals');
  res.json(apps.map(a => { const u = users.find(x => x.id == a.user_id); return { ...a, ...u }; }));
});

app.post('/api/groups/:id/approve', async (req, res) => {
  const m = await read('members');
  const app = m.find(x => x.group_id == req.params.id && x.user_id == req.body.user_id);
  if (app) { 
    app.status = 'approved'; 
    if (!USE_DB) {
      await write('members', m);
    } else {
      await update('members', app.id, { status: 'approved' });
    }
  }
  res.json({ message: '已同意' });
});

app.post('/api/groups/:id/reject', async (req, res) => {
  const m = await read('members');
  if (!USE_DB) {
    await write('members', [].concat(m || []).filter(x => !(x.group_id == req.params.id && x.user_id == req.body.user_id && x.status === 'pending')));
  }
  res.json({ message: '已拒绝' });
});

app.get('/api/individuals', async (req, res) => res.json([].concat(await read('individuals') || [])));
app.get('/api/individuals/:id', async (req, res) => {
  const individuals = await read('individuals');
  res.json(individuals.find(x => x.id == req.params.id) || {});
});

app.put('/api/individuals/:id', async (req, res) => {
  const u = await read('individuals');
  const i = u.findIndex(x => x.id == req.params.id);
  if (i > -1) { 
    u[i] = { ...u[i], ...req.body }; 
    if (!USE_DB) {
      await write('individuals', u);
    } else {
      await update('individuals', req.params.id, req.body);
    }
  }
  res.json({ message: '更新成功' });
});

app.get('/api/individuals/:id/registrations', async (req, res) => {
  const regs = [].concat(await read('registrations') || []).filter(x => x.user_id == req.params.id && ['individual', 'group_member'].includes(x.user_type));
  const individuals = await read('individuals');
  const groups = await read('groups');
  
  res.json(regs.map(r => {
    let userInfo = {};
    if (r.user_type === 'group') {
      const g = groups.find(x => x.id == r.user_id);
      userInfo = { phone: g?.phone, specialty: g?.specialty, is_college: g?.is_college };
    } else {
      const u = individuals.find(x => x.id == r.user_id);
      userInfo = { phone: u?.phone, specialty: u?.specialty, is_college: u?.is_college, college_name: u?.college_name };
    }
    return { ...r, ...userInfo };
  }));
});

app.get('/api/individuals/:id/groups', async (req, res) => {
  const myMemberships = [].concat(await read('members') || []).filter(m => m.user_id == req.params.id);
  const groups = await read('groups');
  res.json(myMemberships.map(m => {
    const g = groups.find(x => x.id == m.group_id);
    return { ...g, group_id: m.group_id, status: m.status };
  }));
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

app.post('/api/ratings', async (req, res) => {
  const { service_id, user_id, rater_id, rater_type, username, service_title, rating, comment, tags } = req.body;
  const ratings = await read('ratings');
  const existing = ratings.find(r => r.service_id == service_id && r.user_id == user_id && r.rater_id == rater_id);
  if (existing) return res.status(400).json({ message: '已评价过该志愿者' });
  
  const newRating = {
    id: id(ratings),
    service_id: parseInt(service_id),
    user_id: parseInt(user_id),
    rater_id: parseInt(rater_id),
    rater_type,
    username,
    service_title,
    rating: parseInt(rating),
    comment,
    tags: tags || [],
    created_at: new Date().toISOString()
  };
  
  if (!USE_DB) {
    const data = await read('ratings');
    data.push(newRating);
    await write('ratings', data);
  } else {
    await insert('ratings', newRating);
  }
  res.json({ message: '评价成功', rating: newRating });
});

app.get('/api/ratings/user/:user_id', async (req, res) => {
  const allRatings = await read('ratings');
  const userRatings = allRatings.filter(r => r.user_id == req.params.user_id);
  res.json(userRatings.reverse());
});

app.get('/api/ratings/service/:service_id', async (req, res) => {
  const allRatings = await read('ratings');
  const serviceRatings = allRatings.filter(r => r.service_id == req.params.service_id);
  res.json(serviceRatings.reverse());
});

app.get('/api/ratings/rater/:rater_id', async (req, res) => {
  const allRatings = await read('ratings');
  const myRatings = allRatings.filter(r => r.rater_id == req.params.rater_id);
  res.json(myRatings.reverse());
});

app.get('/api/ratings/stats/:user_id', async (req, res) => {
  const allRatings = await read('ratings');
  const userRatings = allRatings.filter(r => r.user_id == req.params.user_id);
  const total = userRatings.length;
  const avgRating = total ? userRatings.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: userRatings.filter(r => r.rating == star).length,
    percent: total ? Math.round((userRatings.filter(r => r.rating == star).length / total) * 100) : 0
  }));
  res.json({ total, avgRating: Math.round(avgRating * 10) / 10, distribution });
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API not found' });
  if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.json({ message: 'Volunteer System API running' });
  }
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 Volunteer System running on port ${PORT}`);
  console.log(`📁 Data stored in ./data/ folder`);
  console.log(`🌐 Environment PORT: ${process.env.PORT || 'not set, using 3000'}`);
  console.log('========================================');
  console.log('✅ Server listening successfully!');
});
