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

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

async function initDatabase() {
  let db;
  const usePostgres = !!process.env.DATABASE_URL;

  if (usePostgres) {
    console.log('Using PostgreSQL database...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    db = {
      prepare: (sql) => {
        const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
        return {
          get: async (...params) => {
            const result = await pool.query(pgSql, params);
            return result.rows[0];
          },
          all: async (...params) => {
            const result = await pool.query(pgSql, params);
            return result.rows;
          },
          run: async (...params) => {
            const result = await pool.query(pgSql + ' RETURNING id', params);
            return { lastInsertRowid: result.rows[0]?.id || null };
          }
        };
      },
      exec: async (sql) => {
        const pgSql = sql
          .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
          .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        await pool.query(pgSql);
      }
    };
    console.log('PostgreSQL connected!');
  } else {
    const Database = require('better-sqlite3');
    db = new Database('./database.db');
    console.log('Connected to SQLite database.');
  }

  await db.exec(`CREATE TABLE IF NOT EXISTS village_committee (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS volunteer_group (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  specialty TEXT,
  services TEXT,
  is_college INTEGER DEFAULT 0,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS group_internal_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, service_id, user_id)
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS individual_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  specialty TEXT,
  services TEXT,
  is_college INTEGER DEFAULT 0,
  college_name TEXT,
  total_hours INTEGER DEFAULT 0,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS volunteer_service (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '11:00',
  duration INTEGER NOT NULL DEFAULT 2,
  max_participants INTEGER NOT NULL,
  current_participants INTEGER DEFAULT 0,
  task_type TEXT NOT NULL,
  service_category TEXT NOT NULL,
  service_target TEXT NOT NULL,
  need_college INTEGER DEFAULT 0,
  need_skill INTEGER DEFAULT 0,
  skill_requirement TEXT,
  creator_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

if (!usePostgres) {
  try {
    await db.prepare('ALTER TABLE volunteer_service ADD COLUMN start_time TEXT DEFAULT "09:00"').run();
  } catch (e) {}
  try {
    await db.prepare('ALTER TABLE volunteer_service ADD COLUMN end_time TEXT DEFAULT "11:00"').run();
  } catch (e) {}
}

await db.exec(`CREATE TABLE IF NOT EXISTS service_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL,
  username TEXT NOT NULL,
  group_id INTEGER,
  group_name TEXT,
  hours_earned INTEGER DEFAULT 0,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_id, user_id, user_type)
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS check_ins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  check_in_time DATETIME,
  check_out_time DATETIME,
  hours_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_id, user_id)
)`);

  console.log('Tables created successfully');
  return db;
}

let db;

initDatabase().then((database) => {
  db = database;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database init failed:', err);
  process.exit(1);
});

function getTableName(userType) {
  switch (userType) {
    case 'village':
      return 'village_committee';
    case 'group':
      return 'volunteer_group';
    case 'individual':
      return 'individual_user';
    default:
      return null;
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password, phone, userType } = req.body;
  const tableName = getTableName(userType);
  
  if (!tableName) {
    return res.status(400).json({ message: '无效的用户类�? });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare(`INSERT INTO ${tableName} (username, password, phone) VALUES (?, ?, ?)`);
    const result = stmt.run(username, hashedPassword, phone);
    res.status(201).json({ message: '注册成功', id: result.lastInsertRowid });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: '用户名或手机号已存在' });
    }
    res.status(500).json({ message: '服务器错�? });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password, userType } = req.body;
  const tableName = getTableName(userType);
  
  if (!tableName) {
    return res.status(400).json({ message: '无效的用户类�? });
  }

  try {
    const user =  param($m) 'await ' + $m.Value username);
    
    if (!user) {
      return res.status(400).json({ message: '用户不存�? });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: '密码错误' });
    }

    res.json({ 
      message: '登录成功', 
      user: { 
        id: user.id, 
        username: user.username, 
        phone: user.phone,
        userType,
        avatar: user.avatar,
        specialty: user.specialty,
        services: user.services,
        is_college: user.is_college,
        college_name: user.college_name
      } 
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错�? });
  }
});

app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare(`
      SELECT 
        vs.*,
        (SELECT COUNT(*) FROM service_registrations sr 
         WHERE sr.service_id = vs.id AND sr.user_type IN ('individual', 'group_member')) as actual_participants
      FROM volunteer_service vs 
      ORDER BY created_at DESC
    `).all();
    
    services.forEach(s => {
      s.current_participants = s.actual_participants || 0;
    });
    
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: '服务器错�? });
  }
});

app.post('/api/services', (req, res) => {
  const { title, description, location, date, start_time, end_time, duration, max_participants, creator_id, task_type, service_category, service_target, need_college, need_skill, skill_requirement } = req.body;
  
  try {
    const stmt = db.prepare(`
      INSERT INTO volunteer_service 
      (title, description, location, date, start_time, end_time, duration, max_participants, creator_id, task_type, service_category, service_target, need_college, need_skill, skill_requirement)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(title, description, location, date, start_time || '09:00', end_time || '11:00', duration || 2, max_participants, creator_id, task_type, service_category, service_target, need_college ? 1 : 0, need_skill ? 1 : 0, skill_requirement || '');
    res.status(201).json({ message: '发布成功', id: result.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '发布失败' });
  }
});

app.post('/api/services/:id/register', (req, res) => {
  const { user_id, user_type, username, group_id, group_name } = req.body;
  const serviceId = req.params.id;
  
  try {
    const service =  param($m) 'await ' + $m.Value serviceId);
    
    if (!service) {
      return res.status(404).json({ message: '活动不存�? });
    }
    
    if (service.current_participants >= service.max_participants) {
      return res.status(400).json({ message: '该活动报名人数已�? });
    }
    
    const existing = db.prepare(`
      SELECT * FROM service_registrations 
      WHERE service_id = ? AND user_id = ? AND user_type IN ('individual', 'group_member')
    `).get(serviceId, user_id);
    if (existing) {
      return res.status(400).json({ message: '您已报名该活�? });
    }
    
    if (user_type === 'group_member' && group_id) {
      const groupRegistered =  param($m) 'await ' + $m.Value serviceId, group_id);
      
      if (!groupRegistered) {
        return res.status(400).json({ message: '该团体尚未统一报名此活动，请先联系团体管理员统一报名' });
      }
    }
    
    db.prepare(`
      INSERT INTO service_registrations (service_id, user_id, user_type, username, group_id, group_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(serviceId, user_id, user_type, username, group_id || null, group_name || null);
    
    if (user_type !== 'group') {
       param($m) 'await ' + $m.Value serviceId);
    }
    
    const newCount = user_type === 'group' ? service.current_participants : service.current_participants + 1;
    res.json({ 
      message: '报名成功',
      remaining: service.max_participants - newCount
    });
  } catch (error) {
    res.status(500).json({ message: '报名失败' });
  }
});

app.get('/api/services/registrations', (req, res) => {
  try {
    const registrations = db.prepare(`
      SELECT 
        sr.*,
        i.avatar, i.phone, i.specialty, i.services, i.is_college, i.college_name
      FROM service_registrations sr
      LEFT JOIN individual_user i ON sr.user_id = i.id AND sr.user_type IN ('individual', 'group_member')
    `).all();
    res.json(registrations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.get('/api/services/:id/registrations', (req, res) => {
  try {
    const registrations = db.prepare(`
      SELECT 
        sr.*,
        i.avatar as individual_avatar,
        i.phone as individual_phone,
        i.specialty as individual_specialty,
        i.services as individual_services,
        i.is_college as individual_is_college,
        i.college_name,
        g.avatar as group_avatar,
        g.phone as group_phone,
        g.specialty as group_specialty,
        g.services as group_services,
        g.is_college as group_is_college
      FROM service_registrations sr
      LEFT JOIN individual_user i ON sr.user_type IN ('individual', 'group_member') AND sr.user_id = i.id
      LEFT JOIN volunteer_group g ON sr.user_type = 'group' AND sr.user_id = g.id
      WHERE sr.service_id = ? 
      ORDER BY sr.registered_at DESC
    `).all(req.params.id).map(r => ({
      ...r,
      avatar: r.user_type === 'group' ? r.group_avatar : r.individual_avatar,
      phone: r.user_type === 'group' ? r.group_phone : r.individual_phone,
      specialty: r.user_type === 'group' ? r.group_specialty : r.individual_specialty,
      services: r.user_type === 'group' ? r.group_services : r.individual_services,
      is_college: r.user_type === 'group' ? r.group_is_college : r.individual_is_college
    }));
    res.json(registrations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错�? });
  }
});

app.get('/api/groups', (req, res) => {
  try {
    const groups =  param($m) 'await ' + $m.Value );
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: '服务器错�? });
  }
});

app.get('/api/groups/:id', (req, res) => {
  try {
    const group =  param($m) 'await ' + $m.Value req.params.id);
    res.json(group || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.get('/api/groups/:id/registrations', (req, res) => {
  try {
    const registrations =  param($m) 'await ' + $m.Value req.params.id, 'group');
    res.json(registrations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.get('/api/groups/:id/internal-registrations', (req, res) => {
  try {
    const registrations =  param($m) 'await ' + $m.Value req.params.id);
    res.json(registrations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.post('/api/groups/:id/internal-registrations', (req, res) => {
  const { service_id, user_id, username } = req.body;
  const groupId = req.params.id;
  
  try {
    db.prepare(`
      INSERT INTO group_internal_registrations (group_id, service_id, user_id, username)
      VALUES (?, ?, ?, ?)
    `).run(groupId, service_id, user_id, username);
    
    res.json({ message: '报名成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '报名失败' });
  }
});

app.put('/api/groups/:id', (req, res) => {
  const { specialty, services, is_college } = req.body;
  const groupId = req.params.id;
  
  try {
     param($m) 'await ' + $m.Value specialty || '', services || '', is_college ? 1 : 0, groupId);
    
    res.json({ message: '更新成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '更新失败' });
  }
});

app.get('/api/groups/:id/members', (req, res) => {
  try {
    const members =  param($m) 'await ' + $m.Value req.params.id);
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错�? });
  }
});

app.post('/api/groups/:id/members', (req, res) => {
  const { user_id, username } = req.body;
  const groupId = req.params.id;
  
  try {
    const existing =  param($m) 'await ' + $m.Value groupId, user_id);
    if (existing) {
      return res.status(400).json({ message: '已加入该团体' });
    }
    
    db.prepare(`
      INSERT INTO group_members (group_id, user_id, username)
      VALUES (?, ?, ?)
    `).run(groupId, user_id, username);
    
    res.json({ message: '加入成功' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: '已加入该团体' });
    }
    res.status(500).json({ message: '加入失败' });
  }
});

app.get('/api/groups/:id/applications', (req, res) => {
  const groupId = req.params.id;
  
  try {
    const applications =  param($m) 'await ' + $m.Value groupId);
    
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取申请列表失败' });
  }
});

app.post('/api/groups/:id/members/:userId/approve', (req, res) => {
  const { id, userId } = req.params;
  
  try {
     param($m) 'await ' + $m.Value id, userId);
    
    res.json({ message: '已同意加�? });
  } catch (error) {
    res.status(500).json({ message: '操作失败' });
  }
});

app.post('/api/groups/:id/members/:userId/reject', (req, res) => {
  const { id, userId } = req.params;
  
  try {
     param($m) 'await ' + $m.Value id, userId, 'pending');
    res.json({ message: '已拒绝申�? });
  } catch (error) {
    res.status(500).json({ message: '操作失败' });
  }
});

app.delete('/api/groups/:id/members/:userId', (req, res) => {
  const { id, userId } = req.params;
  
  try {
     param($m) 'await ' + $m.Value id, userId);
    res.json({ message: '移除成功' });
  } catch (error) {
    res.status(500).json({ message: '移除失败' });
  }
});

app.post('/api/groups/:groupId/services/:serviceId/register', (req, res) => {
  const { user_id, username } = req.body;
  const { groupId, serviceId } = req.params;
  console.log('后端收到的报名信�?', { user_id, username, groupId, serviceId });
  
  try {
    const service =  param($m) 'await ' + $m.Value serviceId);
    
    if (!service) {
      return res.status(404).json({ message: '活动不存�? });
    }
    
    if (service.current_participants >= service.max_participants) {
      return res.status(400).json({ message: '该活动报名人数已�? });
    }
    
    const existing =  param($m) 'await ' + $m.Value groupId, serviceId, user_id);
    
    if (existing) {
      return res.status(400).json({ message: '您已内部报名' });
    }
    
    const existingGlobal =  param($m) 'await ' + $m.Value serviceId, user_id);
    
    if (existingGlobal) {
      return res.status(400).json({ message: '您已通过其他方式报名该活�? });
    }
    
    const group =  param($m) 'await ' + $m.Value groupId);
    const groupName = group ? group.username : '未知团体';
    
    db.prepare(`
      INSERT INTO group_internal_registrations (group_id, service_id, user_id, username)
      VALUES (?, ?, ?, ?)
    `).run(groupId, serviceId, user_id, username);
    
    db.prepare(`
      INSERT INTO service_registrations (service_id, user_id, user_type, username)
      VALUES (?, ?, ?, ?)
    `).run(serviceId, user_id, 'group_member', `${username} (${groupName})`);
    
     param($m) 'await ' + $m.Value serviceId);
    
    res.json({ 
      message: '内部报名成功，已同步到活动报名名�?,
      remaining: service.max_participants - (service.current_participants + 1)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '报名失败' });
  }
});

app.get('/api/groups/:groupId/services/:serviceId/registrations', (req, res) => {
  const { groupId, serviceId } = req.params;
  
  try {
    const registrations =  param($m) 'await ' + $m.Value groupId, serviceId);
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: '服务器错�? });
  }
});

app.delete('/api/groups/:id/leave', (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  
  try {
     param($m) 'await ' + $m.Value id, user_id);
    res.json({ message: '已退出团�? });
  } catch (error) {
    res.status(500).json({ message: '退出失�? });
  }
});

app.get('/api/individuals/:id', (req, res) => {
  const userId = req.params.id;
  try {
    const user =  param($m) 'await ' + $m.Value userId);
    res.json(user || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.get('/api/individuals/:id/groups', (req, res) => {
  const userId = req.params.id;
  try {
    const groups =  param($m) 'await ' + $m.Value userId);
    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.get('/api/individuals/:id/registrations', (req, res) => {
  const userId = req.params.id;
  try {
    const registrations = db.prepare(`
      SELECT * FROM service_registrations 
      WHERE user_id = ? AND user_type IN ('individual', 'group_member')
    `).all(userId);
    res.json(registrations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.put('/api/individuals/:id', (req, res) => {
  const { specialty, services, is_college, college_name } = req.body;
  const userId = req.params.id;
  
  try {
     param($m) 'await ' + $m.Value specialty || '', services || '', is_college ? 1 : 0, college_name || '', userId);
    
    res.json({ message: '更新成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错�? });
  }
});

app.post('/api/services/:id/check-in', (req, res) => {
  const { user_id, username } = req.body;
  const serviceId = req.params.id;
  
  try {
    const existing =  param($m) 'await ' + $m.Value serviceId, user_id);
    
    if (existing) {
      if (existing.check_in_time && !existing.check_out_time) {
        return res.status(400).json({ message: '您已签到，请勿重复签�? });
      }
      if (existing.check_out_time) {
        return res.status(400).json({ message: '您已完成本次志愿服务' });
      }
    }
    
    db.prepare(`
      INSERT OR REPLACE INTO check_ins (service_id, user_id, username, check_in_time, status)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'checked-in')
    `).run(serviceId, user_id, username);
    
    res.json({ message: '签到成功', time: new Date().toLocaleString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '签到失败' });
  }
});

app.post('/api/services/:id/check-out', (req, res) => {
  const { user_id } = req.body;
  const serviceId = req.params.id;
  
  try {
    const checkIn =  param($m) 'await ' + $m.Value serviceId, user_id);
    
    if (!checkIn || !checkIn.check_in_time) {
      return res.status(400).json({ message: '请先签到' });
    }
    
    if (checkIn.check_out_time) {
      return res.status(400).json({ message: '您已签退' });
    }
    
    const service =  param($m) 'await ' + $m.Value serviceId);
    const finalHours = service.duration || 2;
    
     param($m) 'await ' + $m.Value finalHours, serviceId, user_id);
    
    db.prepare(`
      UPDATE service_registrations 
      SET hours_earned = hours_earned + ?
      WHERE service_id = ? AND user_id = ? AND user_type IN ('individual', 'group_member')
    `).run(finalHours, serviceId, user_id);
    
     param($m) 'await ' + $m.Value finalHours, user_id);
    
    res.json({ 
      message: `签退成功，获�?${finalHours} 小时志愿时长`,
      hours: finalHours
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '签退失败' });
  }
});

app.get('/api/services/:id/check-status/:user_id', (req, res) => {
  try {
    const status =  param($m) 'await ' + $m.Value 
      req.params.id, 
      req.params.user_id
    );
    res.json(status || { status: 'not-checked-in' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取状态失�? });
  }
});

app.get('/api/individuals/:id/check-ins', (req, res) => {
  try {
    const checkIns =  param($m) 'await ' + $m.Value req.params.id);
    res.json(checkIns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取签到记录失败' });
  }
});

app.delete('/api/services/:id', (req, res) => {
  const serviceId = req.params.id;
  
  try {
     param($m) 'await ' + $m.Value serviceId);
     param($m) 'await ' + $m.Value serviceId);
     param($m) 'await ' + $m.Value serviceId);
    
    res.json({ message: '志愿服务已删�? });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '删除失败' });
  }
});

app.delete('/api/services/:id/cancel', (req, res) => {
  const { user_id, user_type } = req.body;
  const serviceId = req.params.id;
  
  try {
     param($m) 'await ' + $m.Value serviceId, user_id);
     param($m) 'await ' + $m.Value serviceId, user_id);
    
    db.prepare(`
      UPDATE volunteer_service 
      SET current_participants = MAX(0, current_participants - 1)
      WHERE id = ?
    `).run(serviceId);
    
    res.json({ message: '已取消报�? });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '取消失败' });
  }
});

app.post('/api/upload/avatar', upload.single('avatar'), (req, res) => {
  const { user_id, user_type } = req.body;
  if (!req.file) {
    return res.status(400).json({ message: '请选择图片' });
  }
  const avatarUrl = `http://localhost:3000/uploads/${req.file.filename}`;
  const table = getTableName(user_type);
  if (!table) {
    return res.status(400).json({ message: '用户类型错误' });
  }
  try {
     param($m) 'await ' + $m.Value avatarUrl, user_id);
    res.json({ avatar: avatarUrl, message: '上传成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '保存失败' });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});


