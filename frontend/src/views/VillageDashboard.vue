<template>
  <div class="dashboard page-container">
    <div class="header-row-1">
      <h1 class="page-title">🏛️ 村委会管理中心</h1>
    </div>
    
    <div class="header-row-2">
      <div class="user-bar">
        <div class="header-avatar" title="点击上传头像">
          <img v-if="user?.avatar" :src="user.avatar" class="avatar-img" />
          <div v-else class="avatar-placeholder">{{ user?.username?.charAt(0).toUpperCase() || '?' }}</div>
          <input type="file" accept="image/*" class="hidden-input" @change="handleAvatarUpload($event)" />
        </div>
        <span class="welcome-text">欢迎您，{{ user?.username }}</span>
        <span class="role-badge">村委会管理员</span>
        <button class="logout-btn" @click="handleLogout">
          退出登录
        </button>
      </div>
    </div>

    <div class="action-row">
      <button class="btn-primary" @click="showPublishModal = true">
        ✚ 发布新志愿服务
      </button>
    </div>

    <div class="filter-row">
      <span class="filter-label">任务类型：</span>
      <div class="filter-buttons">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          :class="['filter-btn', { active: activeFilter === filter.value }]"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div class="dashboard-content">
      <div v-if="filteredServices.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>暂无志愿服务活动</p>
      </div>

      <div class="service-grid">
        <div v-for="service in filteredServices" :key="service.id" class="service-card">
          <div class="card-top">
            <h3>{{ service.title }}</h3>
            <span :class="['task-badge', service.task_type]">
              {{ service.task_type === 'long' ? '长期任务' : '短期任务' }}
            </span>
          </div>
          
          <p class="service-desc">{{ service.description }}</p>

          <div class="tag-line">
            <span class="tag category">{{ getCategoryLabel(service.service_category) }}</span>
            <span class="tag target">服务对象：{{ getTargetLabel(service.service_target) }}</span>
            <span v-if="service.need_college" class="tag college">需高校学生</span>
            <span v-if="service.need_skill" class="tag skill">需特殊技能</span>
          </div>

          <div v-if="service.need_skill && service.skill_requirement" class="skill-line">
            📌 技能要求：{{ service.skill_requirement }}
          </div>

          <div class="info-line">
            <span>📍 {{ service.location }}</span>
            <span>📅 {{ service.date }}</span>
            <span>🕐 {{ service.start_time || '09:00' }} - {{ service.end_time || '11:00' }}</span>
            <span>⏱️ {{ service.duration || 2 }}小时</span>
            <span>👥 {{ service.current_participants }}/{{ service.max_participants }}人</span>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (service.current_participants / service.max_participants * 100) + '%' }"></div>
          </div>

          <div class="card-actions">
            <button class="btn-view" @click="viewRegistrations(service)">
              查看报名名单 ({{ service.current_participants }})
            </button>
            <button class="btn-delete" @click="handleDeleteService(service)">
              删除活动
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPublishModal" class="modal-overlay" @click.self="showPublishModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>发布新志愿服务</h2>
          <span class="close-btn" @click="showPublishModal = false">×</span>
        </div>
        
        <form @submit.prevent="handlePublish" class="publish-form">
          <div class="form-line">
            <div class="form-item">
              <label>活动名称</label>
              <input v-model="form.title" type="text" placeholder="请输入" />
            </div>
            <div class="form-item">
              <label>活动地点</label>
              <input v-model="form.location" type="text" placeholder="请输入" />
            </div>
          </div>
          
          <div class="form-line">
            <div class="form-item full">
              <label>活动描述</label>
              <textarea v-model="form.description" placeholder="请描述志愿服务内容" rows="2"></textarea>
            </div>
          </div>

          <div class="form-line">
            <div class="form-item">
              <label>活动日期</label>
              <input v-model="form.date" type="date" />
            </div>
            <div class="form-item">
              <label>开始时间</label>
              <input v-model="form.start_time" type="time" />
            </div>
            <div class="form-item">
              <label>结束时间</label>
              <input v-model="form.end_time" type="time" />
            </div>
          </div>

          <div class="form-line">
            <div class="form-item">
              <label>志愿时长(小时)</label>
              <input v-model.number="form.duration" type="number" min="1" placeholder="默认2小时" />
            </div>
          </div>

          <div class="form-line">
            <div class="form-item">
              <label>招募人数</label>
              <input v-model.number="form.max_participants" type="number" min="1" />
            </div>
            <div class="form-item">
              <label>任务类型</label>
              <select v-model="form.task_type">
                <option value="short">短期任务</option>
                <option value="long">长期任务</option>
              </select>
            </div>
          </div>

          <div class="form-line">
            <div class="form-item">
              <label>服务类别</label>
              <select v-model="form.service_category">
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <label>服务对象</label>
              <select v-model="form.service_target">
                <option v-for="tgt in targets" :key="tgt.value" :value="tgt.value">
                  {{ tgt.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-line checkbox-line">
            <div class="checkbox-item" @click="form.need_college = !form.need_college">
              <span class="checkbox-box" :class="{ checked: form.need_college }"></span>
              <span>需要高校学生</span>
            </div>
            <div class="checkbox-item" @click="form.need_skill = !form.need_skill">
              <span class="checkbox-box" :class="{ checked: form.need_skill }"></span>
              <span>需要特殊技能</span>
            </div>
          </div>

          <div v-if="form.need_skill" class="form-line">
            <div class="form-item full">
              <label>技能要求</label>
              <input v-model="form.skill_requirement" type="text" placeholder="请输入技能要求" />
            </div>
          </div>

          <div class="form-footer">
            <button type="button" class="btn-cancel" @click="showPublishModal = false">取消</button>
            <button type="submit" class="btn-submit" :disabled="loading">
              {{ loading ? '发布中...' : '发布活动' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showRegistrationsModal" class="modal-overlay" @click.self="showRegistrationsModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>报名名单 - {{ currentService?.title }}</h2>
          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="export-btn" @click.stop="exportRegistrations">
              📥 导出名单
            </button>
            <span class="close-btn" @click="showRegistrationsModal = false">×</span>
          </div>
        </div>
        
        <div v-if="currentRegistrations.length === 0" class="empty-state sm">
          <p>暂无人员报名</p>
        </div>
        
        <div v-else class="registration-list">
          <div 
            v-for="(item, idx) in groupedRegistrations" 
            :key="idx" 
            class="reg-item"
            :class="{ 'group-member-item': item.isGroupMember, 'group-header-item': item.isGroupHeader }"
            @click="item.data && showDetail(item.data)"
          >
            <span class="reg-avatar">
              <img v-if="item.data?.avatar" :src="item.data.avatar" class="avatar-img" />
              <span v-else>{{ (item.data?.username || '').charAt(0).toUpperCase() }}</span>
            </span>
            <span class="reg-name clickable">
              <template v-if="item.isGroupHeader">🤝 {{ item.data?.group_name }}</template>
              <template v-else-if="item.isGroupMember">└ {{ item.data?.username }}</template>
              <template v-else>{{ item.data?.username }}</template>
            </span>
            <span 
              class="reg-type" 
              :class="'type-' + item.data?.user_type"
            >
              {{ item.data?.user_type === 'group' ? '团体统一报名' : item.data?.user_type === 'group_member' ? '成员报名' : '个人报名' }}
            </span>
            <span v-if="item.data?.specialty" class="reg-skill">{{ item.data.specialty }}</span>
            <span v-if="item.data?.is_college" class="reg-college">🎓 高校</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h2>{{ currentDetail?.user_type === 'group' ? '🤝' : '👤' }} 详细信息</h2>
          <span class="close-btn" @click="closeDetailModal">×</span>
        </div>
        
        <div class="detail-body">
          <div class="detail-avatar-section">
            <div class="detail-avatar">
              <img v-if="currentDetail?.avatar" :src="currentDetail.avatar" class="avatar-img" />
              <div v-else class="avatar-placeholder">{{ (currentDetail?.username || '').charAt(0).toUpperCase() || '?' }}</div>
            </div>
            <div class="detail-name">{{ currentDetail?.username }}</div>
            <div class="detail-type-badge">{{ currentDetail?.user_type === 'group' ? '志愿团体' : '个人志愿者' }}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">联系电话</div>
            <div class="detail-value">📱 {{ currentDetail?.phone || '暂无' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">特长专业</div>
            <div class="detail-value">{{ currentDetail?.specialty || '暂无描述' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">能提供的服务</div>
            <div class="detail-value">{{ currentDetail?.services || '暂无描述' }}</div>
          </div>
          <div v-if="currentDetail?.is_college" class="detail-item">
            <div class="detail-label">身份类型</div>
            <div class="detail-value">🎓 {{ currentDetail?.user_type === 'group' ? '高校志愿团体' : '高校学生 - ' + (currentDetail?.college_name || '未填写学校') }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="message" :class="['toast', message.type]">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user') || 'null')

if (!user || user.userType !== 'village') {
  router.push('/login')
}

const services = ref([])
const activeFilter = ref('all')
const showPublishModal = ref(false)
const showRegistrationsModal = ref(false)
const currentRegistrations = ref([])
const currentService = ref(null)
const loading = ref(false)
const message = ref(null)

const filters = [
  { label: '全部活动', value: 'all' },
  { label: '短期任务', value: 'short' },
  { label: '长期任务', value: 'long' }
]

const categories = [
  { value: 'environment', label: '环境整治' },
  { value: 'health', label: '健康义诊' },
  { value: 'elderly', label: '助老服务' },
  { value: 'childcare', label: '托幼服务' },
  { value: 'employment', label: '就业帮扶' },
  { value: 'other', label: '其他' }
]

const targets = [
  { value: 'all', label: '全体居民' },
  { value: 'children', label: '儿童' },
  { value: 'elderly', label: '老年人' },
  { value: 'unemployed', label: '失业再就业人员' },
  { value: 'disabled', label: '残障人士' },
  { value: 'other', label: '其他' }
]

const form = reactive({
  title: '',
  description: '',
  location: '',
  date: '',
  start_time: '09:00',
  end_time: '11:00',
  duration: 2,
  max_participants: 10,
  task_type: 'short',
  service_category: 'environment',
  service_target: 'all',
  need_college: false,
  need_skill: false,
  skill_requirement: ''
})

const filteredServices = computed(() => {
  if (activeFilter.value === 'all') return services.value
  return services.value.filter(s => s.task_type === activeFilter.value)
})

function getCategoryLabel(value) {
  const cat = categories.find(c => c.value === value)
  return cat ? cat.label : value
}

function getTargetLabel(value) {
  const tgt = targets.find(t => t.value === value)
  return tgt ? tgt.label : value
}



function showToast(text, type = 'success') {
  message.value = { text, type }
  setTimeout(() => message.value = null, 3000)
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.location = ''
  form.date = ''
  form.start_time = '09:00'
  form.end_time = '11:00'
  form.duration = 2
  form.max_participants = 10
  form.task_type = 'short'
  form.service_category = 'environment'
  form.service_target = 'all'
  form.need_college = false
  form.need_skill = false
  form.skill_requirement = ''
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file || !user) return
  
  const formData = new FormData()
  formData.append('avatar', file)
  formData.append('user_id', user.id)
  formData.append('user_type', 'village')
  
  try {
    const res = await axios.post('/api/upload/avatar', formData)
    user.avatar = res.data.avatar
    localStorage.setItem('user', JSON.stringify(user))
    showToast('头像上传成功！')
  } catch (error) {
    showToast('上传失败', 'error')
  }
  event.target.value = ''
}

async function loadServices() {
  if (!user) return
  try {
    const res = await axios.get('/api/services')
    services.value = res.data
  } catch (error) {
    console.error(error)
  }
}

async function handlePublish() {
  if (!user) return
  loading.value = true
  try {
    await axios.post('/api/services', {
      ...form,
      creator_id: user.id
    })
    showToast('发布成功！')
    showPublishModal.value = false
    loadServices()
    resetForm()
  } catch (error) {
    showToast('发布失败', 'error')
  }
  loading.value = false
}

async function handleDeleteService(service) {
  if (!confirm('确定删除吗？')) return
  try {
    await axios.delete(`/api/services/${service.id}`)
    showToast('删除成功！')
    loadServices()
  } catch (error) {
    showToast('删除失败', 'error')
  }
}

const groupedRegistrations = ref([])

function exportRegistrations() {
  const headers = ['序号', '用户名', '报名类型', '所属团体', '特长/技能', '高校', '联系电话', '报名时间']
  const rows = groupedRegistrations.value
    .filter(item => item.data)
    .map((item, idx) => {
      const d = item.data
      return [
        idx + 1,
        d.username || '',
        d.user_type === 'group' ? '团体统一报名' : d.user_type === 'group_member' ? '成员报名' : '个人报名',
        d.group_name || '',
        d.specialty || '',
        d.is_college ? '是' : '否',
        d.phone || '',
        d.registered_at || ''
      ]
    })
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${currentService.value?.title || '报名名单'}_${new Date().toLocaleDateString()}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  showToast('导出成功！')
}

async function viewRegistrations(service) {
  if (!user) return
  currentService.value = service
  try {
    const res = await axios.get(`/api/services/${service.id}/registrations`)
    const allRegs = res.data
    
    const groupRegistrations = allRegs.filter(r => r.user_type === 'group')
    const groupMemberRegs = allRegs.filter(r => r.user_type === 'group_member')
    const individualRegs = allRegs.filter(r => r.user_type === 'individual')
    
    const grouped = []
    
    groupRegistrations.forEach(gr => {
      grouped.push({ type: 'header', data: gr, isGroupHeader: true })
      
      const members = groupMemberRegs.filter(m => m.group_id === gr.group_id)
      members.forEach(m => {
        grouped.push({ type: 'member', data: m, isGroupMember: true })
      })
    })
    
    const remainingMembers = groupMemberRegs.filter(m => 
      !groupRegistrations.some(gr => gr.group_id === m.group_id)
    )
    remainingMembers.forEach(m => {
      grouped.push({ type: 'member', data: m })
    })
    
    individualRegs.forEach(r => {
      grouped.push({ type: 'individual', data: r })
    })
    
    groupedRegistrations.value = grouped
    currentRegistrations.value = allRegs
    showRegistrationsModal.value = true
  } catch (error) {
    showToast('获取报名名单失败', 'error')
  }
}

const showDetailModal = ref(false)
const currentDetail = ref(null)

function showDetail(item) {
  currentDetail.value = item
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  currentDetail.value = null
}

function handleLogout() {
  localStorage.removeItem('user')
  router.push('/login')
}

onMounted(() => {
  if (user) loadServices()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f1f5f9;
  padding: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 12px 0;
}

.header-row-2 {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.user-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #165DFF, #36bffa);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}

.header-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-avatar .avatar-placeholder {
  font-size: 16px;
  font-weight: 700;
  color: white;
}

.header-avatar .hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.welcome-text {
  font-size: 14px;
  color: #606266;
}

.role-badge {
  padding: 4px 12px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.logout-btn {
  padding: 6px 16px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fff;
  border-color: #165DFF;
  color: #165DFF;
}

.action-row {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 8px 20px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #165DFF;
  border-color: #165DFF;
  color: white;
}

.btn-primary {
  padding: 10px 20px;
  background: #165DFF;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.15);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(22, 93, 255, 0.25);
}

.empty-state {
  background: white;
  padding: 60px;
  border-radius: 8px;
  text-align: center;
  color: #909399;
}

.empty-state.sm {
  padding: 40px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.service-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  width: 100%;
}

.service-card {
  background: white;
  padding: 24px;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.service-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.card-top h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  word-break: break-all;
  flex: 1;
}

.task-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.task-badge.long {
  background: #e0e7ff;
  color: #3730a3;
}

.task-badge.short {
  background: #fef3c7;
  color: #b45309;
}

.service-desc {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.6;
  word-break: break-word;
}

.tag-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.tag {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.tag.category {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag.target {
  background: #dcfce7;
  color: #15803d;
}

.tag.college {
  background: #ede9fe;
  color: #5b21b6;
}

.tag.skill {
  background: #fef3c7;
  color: #b45309;
}

.skill-line {
  font-size: 13px;
  color: #e6a23c;
  padding: 8px 12px;
  background: #fdf6ec;
  border-radius: 4px;
  margin-bottom: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.info-line {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.progress-bar {
  height: 6px;
  background: #ebeef5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: #165DFF;
  border-radius: 3px;
  transition: width 0.3s;
}

.card-actions {
  display: flex;
  gap: 12px;
}

.btn-view,
.btn-delete {
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-view {
  background: #dbeafe;
  color: #1d4ed8;
}

.btn-view:hover {
  background: #165DFF;
  color: white;
}

.btn-delete {
  background: #fef0f0;
  color: #f56c6c;
}

.btn-delete:hover {
  background: #f56c6c;
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #ebeef5;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.export-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 22px;
  color: #909399;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  background: #f5f7fa;
  color: #f56c6c;
}

.publish-form {
  padding: 24px;
}

.form-line {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: flex-end;
}

.form-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item.full {
  flex: 0 0 100%;
}

.form-item label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.form-item input,
.form-item select,
.form-item textarea {
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-item input:focus,
.form-item select:focus,
.form-item textarea:focus {
  outline: none;
  border-color: #409eff;
}

.checkbox-line {
  align-items: center;
  gap: 32px;
  padding: 8px 0;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
}

.checkbox-box {
  width: 18px;
  height: 18px;
  border: 2px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-box.checked {
  background: #409eff;
  border-color: #409eff;
}

.checkbox-box.checked::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.skill-input {
  flex: 1;
  margin-left: 8px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 13px;
}

.form-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  margin-top: 8px;
}

.btn-cancel,
.btn-submit {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f5f7fa;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.btn-cancel:hover {
  border-color: #c0c4cc;
}

.btn-submit {
  background: #409eff;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #66b1ff;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.registration-list {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reg-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.reg-item:hover {
  background: #e4e7ed;
}

.reg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #165DFF, #36bffa);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
}

.reg-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reg-name {
  font-weight: 600;
  color: #303133;
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  color: #165DFF;
  text-decoration: underline;
}

.detail-modal {
  max-width: 420px !important;
  padding: 0 !important;
  overflow: hidden;
}

.detail-body {
  padding: 0 24px 24px 24px;
}

.detail-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  margin: 0 -24px 20px -24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.detail-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #165DFF, #36bffa);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-avatar .avatar-placeholder {
  font-size: 28px;
  font-weight: 700;
  color: white;
}

.detail-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.detail-type-badge {
  padding: 4px 12px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.detail-item {
  margin-bottom: 16px;
}

.detail-label {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
}

.detail-value {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.6;
}

.reg-type {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.reg-type.type-group,
.reg-type.type-group_member {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #047857;
}
.reg-type.type-individual {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
}

.reg-item.group-header-item {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-left: 4px solid #10b981;
  font-weight: 600;
}

.reg-item.group-member-item {
  margin-left: 24px;
  border-left: 3px solid #10b981;
  background: #f0fdf4;
  max-width: calc(100% - 24px);
}

.reg-item.group-member-item .reg-name {
  padding-left: 8px;
}

.reg-skill {
  color: #909399;
  font-size: 13px;
}

.reg-college {
  font-size: 13px;
  color: #9b59b6;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  z-index: 2000;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.toast.success {
  background: #67c23a;
  color: white;
}

.toast.error {
  background: #f56c6c;
  color: white;
}
</style>
