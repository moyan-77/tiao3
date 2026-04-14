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
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS volunteer_group (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  specialty TEXT,
  services TEXT,
  is_college INTEGER DEFAULT 0,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS group_internal_registrations (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, service_id, user_id)
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS individual_user (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  specialty TEXT,
  services TEXT,
  is_college INTEGER DEFAULT 0,
  college_name TEXT,
  total_hours INTEGER DEFAULT 0,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS volunteer_service (
  id SERIAL PRIMARY KEY,
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
  village_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS service_registrations (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL,
  username TEXT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hours_earned INTEGER DEFAULT 0,
  UNIQUE(service_id, user_id)
)`);

await db.exec(`CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  status TEXT DEFAULT 'registered',
  UNIQUE(service_id, user_id)
)`);

  console.log('Tables created successfully');
  return db;
}

let db;

async function updateCurrentParticipants(serviceId) {
  const count = await db.prepare(`
    SELECT COUNT(*) as cnt FROM service_registrations 
    WHERE service_id = ? AND user_type IN ('individual', 'group_member')
  `).get(serviceId);
  
  await db.prepare(`
    UPDATE volunteer_service SET current_participants = ? WHERE id = ?
  `).run(count.cnt, serviceId);
}

function getTableName(user_type) {
  switch (user_type) {
    case 'village': return 'village_committee';
    case 'group': return 'volunteer_group';
    case 'individual': return 'individual_user';
    default: return null;
  }
}

initDatabase().then((database) => {
  db = database;
  
  app.post('/api/login', async (req, res) => {
    const { username, password, user_type } = req.body;
    const table = getTableName(user_type);
    if (!table) {
      return res.status(400).json({ message: '用户类型错误' });
    }
    
    try {
      const user = await db.prepare(`SELECT * FROM ${table} WHERE username = ?`).get(username);
      
      if (!user) {
        return res.status(400).json({ message: '用户名或密码错误' });
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(400).json({ message: '用户名或密码错误' });
      }
      
      res.json({ 
        message: '登录成功', 
        user_id: user.id, 
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
        user_type
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '登录失败' });
    }
  });
  
  app.post('/api/register', async (req, res) => {
    const { username, password, phone, user_type, specialty, services, is_college, college_name } = req.body;
    const table = getTableName(user_type);
    if (!table) {
      return res.status(400).json({ message: '用户类型错误' });
    }
    
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await db.prepare(`
        INSERT INTO ${table} (username, password, phone, specialty, services, is_college, college_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(username, hashedPassword, phone, specialty || '', services || '', is_college ? 1 : 0, college_name || '');
      
      res.json({ message: '注册成功', user_id: result.lastInsertRowid });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
        return res.status(400).json({ message: '用户名或手机号已存在' });
      }
      console.error(error);
      res.status(500).json({ message: '注册失败' });
    }
  });
  
  app.get('/api/village/:id/services', async (req, res) => {
    try {
      const services = await db.prepare(`
        SELECT * FROM volunteer_service WHERE village_id = ? ORDER BY created_at DESC
      `).all(req.params.id);
      res.json(services);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取服务列表失败' });
    }
  });
  
  app.post('/api/village/:id/services', async (req, res) => {
    const { title, description, location, date, start_time, end_time, duration, max_participants, task_type, service_category } = req.body;
    
    try {
      const result = await db.prepare(`
        INSERT INTO volunteer_service (title, description, location, date, start_time, end_time, duration, max_participants, task_type, service_category, village_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, description, location, date, start_time || '09:00', end_time || '11:00', duration, max_participants, task_type, service_category, req.params.id);
      
      res.json({ message: '发布成功', service_id: result.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '发布失败' });
    }
  });
  
  app.get('/api/services', async (req, res) => {
    try {
      const services = await db.prepare(`
        SELECT * FROM volunteer_service ORDER BY created_at DESC
      `).all();
      res.json(services);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取服务列表失败' });
    }
  });
  
  app.get('/api/services/:id', async (req, res) => {
    try {
      const service = await db.prepare(`SELECT * FROM volunteer_service WHERE id = ?`).get(req.params.id);
      res.json(service || {});
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.post('/api/services/:id/register', async (req, res) => {
    const { user_id, user_type, username } = req.body;
    const serviceId = req.params.id;
    
    try {
      const service = await db.prepare(`SELECT * FROM volunteer_service WHERE id = ?`).get(serviceId);
      
      if (!service) {
        return res.status(404).json({ message: '活动不存在' });
      }
      
      if (service.current_participants >= service.max_participants) {
        return res.status(400).json({ message: '该活动报名人数已满' });
      }
      
      const existing = await db.prepare(`
        SELECT * FROM service_registrations WHERE service_id = ? AND user_id = ?
      `).get(serviceId, user_id);
      
      if (existing) {
        return res.status(400).json({ message: '您已报名该活动' });
      }
      
      await db.prepare(`
        INSERT INTO service_registrations (service_id, user_id, user_type, username)
        VALUES (?, ?, ?, ?)
      `).run(serviceId, user_id, user_type, username);
      
      if (user_type !== 'group') {
        await updateCurrentParticipants(serviceId);
      }
      
      const updatedService = await db.prepare(`SELECT * FROM volunteer_service WHERE id = ?`).get(serviceId);
      
      res.json({ 
        message: '报名成功',
        remaining: service.max_participants - (updatedService.current_participants || 0)
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
        return res.status(400).json({ message: '您已报名该活动' });
      }
      console.error(error);
      res.status(500).json({ message: '报名失败' });
    }
  });
  
  app.get('/api/village/:id/registrations', async (req, res) => {
    try {
      const registrations = await db.prepare(`
        SELECT 
          sr.*,
          vs.title as service_title,
          vs.date as service_date,
          vs.start_time,
          vs.end_time,
          ig.avatar as group_avatar,
          ig.phone as group_phone,
          ig.specialty as group_specialty,
          ig.services as group_services,
          ig.is_college as group_is_college,
          ii.avatar as individual_avatar,
          ii.phone as individual_phone,
          ii.specialty as individual_specialty,
          ii.services as individual_services,
          ii.is_college as individual_is_college
        FROM service_registrations sr
        JOIN volunteer_service vs ON sr.service_id = vs.id
        LEFT JOIN volunteer_group ig ON sr.user_type = 'group' AND sr.user_id = ig.id
        LEFT JOIN individual_user ii ON sr.user_type IN ('individual', 'group_member') AND sr.user_id = ii.id
        WHERE vs.village_id = ?
        ORDER BY sr.registered_at DESC
      `).all(req.params.id);
      
      res.json(registrations.map(r => ({
        ...r,
        avatar: r.user_type === 'group' ? r.group_avatar : r.individual_avatar,
        phone: r.user_type === 'group' ? r.group_phone : r.individual_phone,
        specialty: r.user_type === 'group' ? r.group_specialty : r.individual_specialty,
        services: r.user_type === 'group' ? r.group_services : r.individual_services,
        is_college: r.user_type === 'group' ? r.group_is_college : r.individual_is_college
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '服务器错误' });
    }
  });
  
  app.get('/api/groups', async (req, res) => {
    try {
      const groups = await db.prepare(`SELECT * FROM volunteer_group ORDER BY created_at DESC`).all();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: '服务器错误' });
    }
  });
  
  app.get('/api/groups/:id', async (req, res) => {
    try {
      const group = await db.prepare(`SELECT * FROM volunteer_group WHERE id = ?`).get(req.params.id);
      res.json(group || {});
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.get('/api/groups/:id/registrations', async (req, res) => {
    try {
      const registrations = await db.prepare(`
        SELECT * FROM service_registrations 
        WHERE user_type = ? AND user_id = ?
      `).all('group', req.params.id);
      res.json(registrations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.get('/api/groups/:id/internal-registrations', async (req, res) => {
    try {
      const registrations = await db.prepare(`
        SELECT gir.*, vs.title as service_title
        FROM group_internal_registrations gir
        JOIN volunteer_service vs ON gir.service_id = vs.id
        WHERE group_id = ?
      `).all(req.params.id);
      res.json(registrations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.put('/api/groups/:id', async (req, res) => {
    const { specialty, services, is_college } = req.body;
    const groupId = req.params.id;
    
    try {
      await db.prepare(`
        UPDATE volunteer_group SET specialty = ?, services = ?, is_college = ? WHERE id = ?
      `).run(specialty || '', services || '', is_college ? 1 : 0, groupId);
      res.json({ message: '更新成功' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '更新失败' });
    }
  });
  
  app.get('/api/groups/:id/members', async (req, res) => {
    try {
      const members = await db.prepare(`
        SELECT gm.*, iu.avatar, iu.specialty, iu.is_college, iu.college_name
        FROM group_members gm
        JOIN individual_user iu ON gm.user_id = iu.id
        WHERE gm.group_id = ? AND gm.status = 'approved'
      `).all(req.params.id);
      res.json(members);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取成员列表失败' });
    }
  });
  
  app.post('/api/groups/:id/join', async (req, res) => {
    const { user_id, username } = req.body;
    const groupId = req.params.id;
    
    try {
      const existing = await db.prepare(`
        SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
      `).get(groupId, user_id);
      
      if (existing) {
        return res.status(400).json({ message: '已加入该团体' });
      }
      
      await db.prepare(`
        INSERT INTO group_members (group_id, user_id, username)
        VALUES (?, ?, ?)
      `).run(groupId, user_id, username);
      
      res.json({ message: '加入成功' });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
        return res.status(400).json({ message: '已加入该团体' });
      }
      res.status(500).json({ message: '加入失败' });
    }
  });
  
  app.get('/api/groups/:id/applications', async (req, res) => {
    const groupId = req.params.id;
    
    try {
      const applications = await db.prepare(`
        SELECT gm.*, iu.avatar, iu.specialty, iu.is_college, iu.college_name
        FROM group_members gm
        JOIN individual_user iu ON gm.user_id = iu.id
        WHERE gm.group_id = ? AND gm.status = 'pending'
      `).all(groupId);
      
      res.json(applications);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取申请列表失败' });
    }
  });
  
  app.post('/api/groups/:id/approve', async (req, res) => {
    const { user_id } = req.body;
    const id = req.params.id;
    
    try {
      await db.prepare(`
        UPDATE group_members SET status = 'approved' WHERE group_id = ? AND user_id = ?
      `).run(id, user_id);
      res.json({ message: '已同意' });
    } catch (error) {
      res.status(500).json({ message: '操作失败' });
    }
  });
  
  app.post('/api/groups/:id/reject', async (req, res) => {
    const { user_id } = req.body;
    const id = req.params.id;
    
    try {
      await db.prepare(`
        DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'pending'
      `).run(id, user_id);
      res.json({ message: '已拒绝' });
    } catch (error) {
      res.status(500).json({ message: '操作失败' });
    }
  });
  
  app.post('/api/groups/:id/remove-member', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    
    try {
      await db.prepare(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`).run(id, user_id);
      res.json({ message: '已退出团体' });
    } catch (error) {
      res.status(500).json({ message: '退出失败' });
    }
  });
  
  app.post('/api/groups/:groupId/services/:serviceId/internal-register', async (req, res) => {
    const { groupId, serviceId } = req.params;
    const { user_id, username } = req.body;
    
    try {
      const service = await db.prepare(`SELECT * FROM volunteer_service WHERE id = ?`).get(serviceId);
      
      if (!service) {
        return res.status(404).json({ message: '活动不存在' });
      }
      
      if (service.current_participants >= service.max_participants) {
        return res.status(400).json({ message: '该活动报名人数已满' });
      }
      
      const existing = await db.prepare(`
        SELECT * FROM group_internal_registrations WHERE group_id = ? AND service_id = ? AND user_id = ?
      `).get(groupId, serviceId, user_id);
      
      if (existing) {
        return res.status(400).json({ message: '您已内部报名' });
      }
      
      const existingGlobal = await db.prepare(`
        SELECT * FROM service_registrations WHERE service_id = ? AND user_id = ?
      `).get(serviceId, user_id);
      
      if (existingGlobal) {
        return res.status(400).json({ message: '您已通过其他方式报名该活动' });
      }
      
      const group = await db.prepare(`SELECT * FROM volunteer_group WHERE id = ?`).get(groupId);
      const groupName = group ? group.username : '未知团体';
      
      await db.prepare(`
        INSERT INTO group_internal_registrations (group_id, service_id, user_id, username)
        VALUES (?, ?, ?, ?)
      `).run(groupId, serviceId, user_id, username);
      
      await db.prepare(`
        INSERT INTO service_registrations (service_id, user_id, user_type, username)
        VALUES (?, ?, ?, ?)
      `).run(serviceId, user_id, 'group_member', `${username} (${groupName})`);
      
      await updateCurrentParticipants(serviceId);
      
      res.json({ 
        message: '内部报名成功，已同步到活动报名名单',
        remaining: service.max_participants - (service.current_participants + 1)
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '报名失败' });
    }
  });
  
  app.get('/api/groups/:groupId/services/:serviceId/registrations', async (req, res) => {
    const { groupId, serviceId } = req.params;
    
    try {
      const registrations = await db.prepare(`
        SELECT * FROM group_internal_registrations 
        WHERE group_id = ? AND service_id = ?
      `).all(groupId, serviceId);
      res.json(registrations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.get('/api/individuals/:id', async (req, res) => {
    const userId = req.params.id;
    try {
      const user = await db.prepare(`SELECT * FROM individual_user WHERE id = ?`).get(userId);
      res.json(user || {});
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.get('/api/individuals/:id/groups', async (req, res) => {
    const userId = req.params.id;
    try {
      const groups = await db.prepare(`
        SELECT vg.*, gm.status as membership_status
        FROM group_members gm
        JOIN volunteer_group vg ON gm.group_id = vg.id
        WHERE gm.user_id = ?
      `).all(userId);
      res.json(groups);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.get('/api/individuals/:id/registrations', async (req, res) => {
    const userId = req.params.id;
    try {
      const registrations = await db.prepare(`
        SELECT * FROM service_registrations 
        WHERE user_id = ? AND user_type IN ('individual', 'group_member')
      `).all(userId);
      res.json(registrations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取失败' });
    }
  });
  
  app.put('/api/individuals/:id', async (req, res) => {
    const { specialty, services, is_college, college_name } = req.body;
    const userId = req.params.id;
    
    try {
      await db.prepare(`
        UPDATE individual_user SET specialty = ?, services = ?, is_college = ?, college_name = ? WHERE id = ?
      `).run(specialty || '', services || '', is_college ? 1 : 0, college_name || '', userId);
      res.json({ message: '更新成功' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '更新失败' });
    }
  });
  
  app.post('/api/services/:id/check-in', async (req, res) => {
    const { user_id, username } = req.body;
    const serviceId = req.params.id;
    
    try {
      const existing = await db.prepare(`
        SELECT * FROM check_ins WHERE service_id = ? AND user_id = ?
      `).get(serviceId, user_id);
      
      if (existing) {
        if (existing.check_in_time && !existing.check_out_time) {
          return res.status(400).json({ message: '您已签到，请勿重复签到' });
        }
        if (existing.check_out_time) {
          return res.status(400).json({ message: '您已完成本次志愿服务' });
        }
      }
      
      await db.prepare(`
        INSERT INTO check_ins (service_id, user_id, username, check_in_time, status)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'checked-in')
        ON CONFLICT (service_id, user_id) DO UPDATE SET check_in_time = CURRENT_TIMESTAMP, status = 'checked-in'
      `).run(serviceId, user_id, username);
      
      res.json({ message: '签到成功', time: new Date().toLocaleString() });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '签到失败' });
    }
  });
  
  app.post('/api/services/:id/check-out', async (req, res) => {
    const { user_id } = req.body;
    const serviceId = req.params.id;
    
    try {
      const checkIn = await db.prepare(`
        SELECT * FROM check_ins WHERE service_id = ? AND user_id = ?
      `).get(serviceId, user_id);
      
      if (!checkIn || !checkIn.check_in_time) {
        return res.status(400).json({ message: '请先签到' });
      }
      
      if (checkIn.check_out_time) {
        return res.status(400).json({ message: '已签退' });
      }
      
      const service = await db.prepare(`SELECT * FROM volunteer_service WHERE id = ?`).get(serviceId);
      const finalHours = service.duration || 2;
      
      await db.prepare(`
        UPDATE check_ins SET check_out_time = CURRENT_TIMESTAMP, status = 'completed'
        WHERE service_id = ? AND user_id = ?
      `).run(serviceId, user_id);
      
      await db.prepare(`
        UPDATE service_registrations 
        SET hours_earned = hours_earned + ?
        WHERE service_id = ? AND user_id = ? AND user_type IN ('individual', 'group_member')
      `).run(finalHours, serviceId, user_id);
      
      await db.prepare(`
        UPDATE individual_user SET total_hours = total_hours + ? WHERE id = ?
      `).run(finalHours, user_id);
      
      res.json({ 
        message: `签退成功，获得 ${finalHours} 小时志愿时长`,
        hours: finalHours
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '签退失败' });
    }
  });
  
  app.get('/api/services/:id/check-status/:user_id', async (req, res) => {
    try {
      const status = await db.prepare(`
        SELECT * FROM check_ins WHERE service_id = ? AND user_id = ?
      `).get(
        req.params.id, 
        req.params.user_id
      );
      res.json(status || { status: 'not-checked-in' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取状态失败' });
    }
  });
  
  app.get('/api/individuals/:id/check-ins', async (req, res) => {
    try {
      const checkIns = await db.prepare(`
        SELECT ci.*, vs.title as service_title, vs.date, vs.location
        FROM check_ins ci
        JOIN volunteer_service vs ON ci.service_id = vs.id
        WHERE ci.user_id = ?
        ORDER BY ci.check_in_time DESC
      `).all(req.params.id);
      res.json(checkIns);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '获取签到记录失败' });
    }
  });
  
  app.delete('/api/services/:id', async (req, res) => {
    const serviceId = req.params.id;
    
    try {
      await db.prepare(`DELETE FROM service_registrations WHERE service_id = ?`).run(serviceId);
      await db.prepare(`DELETE FROM group_internal_registrations WHERE service_id = ?`).run(serviceId);
      await db.prepare(`DELETE FROM check_ins WHERE service_id = ?`).run(serviceId);
      await db.prepare(`DELETE FROM volunteer_service WHERE id = ?`).run(serviceId);
      
      res.json({ message: '志愿服务已删除' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: '删除失败' });
    }
  });
  
  app.delete('/api/services/:id/cancel', async (req, res) => {
    const { user_id, user_type } = req.body;
    const serviceId = req.params.id;
    
    try {
      await db.prepare(`DELETE FROM service_registrations WHERE service_id = ? AND user_id = ?`).run(serviceId, user_id);
      await db.prepare(`DELETE FROM group_internal_registrations WHERE service_id = ? AND user_id = ?`).run(serviceId, user_id);
      
      await updateCurrentParticipants(serviceId);
      
      res.json({ message: '已取消报名' });
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
    const avatarUrl = `/uploads/${req.file.filename}`;
    const table = getTableName(user_type);
    if (!table) {
      return res.status(400).json({ message: '用户类型错误' });
    }
    try {
      db.prepare(`UPDATE ${table} SET avatar = ? WHERE id = ?`).run(avatarUrl, user_id);
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
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database init failed:', err);
  process.exit(1);
});

module.exports = app;
