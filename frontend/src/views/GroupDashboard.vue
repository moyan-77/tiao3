<template>
  <div class="dashboard page-container">
    <div class="header-row-1">
      <h1 class="page-title">🤝 志愿团体管理中心</h1>
    </div>
    
    <div class="header-row-2">
      <div class="user-bar">
        <span class="welcome-text">欢迎您，{{ user?.username }}</span>
        <span class="role-badge">志愿团体</span>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </div>

    <div class="tabs-row">
      <button 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="['tab-btn', { active: activeTab === tab.value }]"
        @click="activeTab = tab.value"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <div class="dashboard-content">

      <div v-if="activeTab === 'profile'" class="profile-section">
        <div class="card">
          <div class="card-header">
            <h2>📋 团体信息</h2>
            <button v-if="!isEditing" class="edit-btn" @click="startEdit">✏️ 编辑</button>
          </div>
          
          <div v-if="!isEditing" class="profile-display">
            <div class="avatar-section">
              <div class="avatar-display">
                <img v-if="user?.avatar" :src="user.avatar" class="avatar-img" />
                <div v-else class="avatar-placeholder">{{ user?.username?.charAt(0).toUpperCase() || '?' }}</div>
              </div>
              <label class="upload-btn">
                📷 更换头像
                <input type="file" accept="image/*" hidden @change="handleAvatarUpload($event)" />
              </label>
            </div>
            <div class="profile-item">
              <div class="profile-label">特长专业</div>
              <div class="profile-value">{{ profile.specialty || '暂无描述' }}</div>
            </div>
            <div class="profile-item">
              <div class="profile-label">能提供的服务</div>
              <div class="profile-value">{{ profile.services || '暂无描述' }}</div>
            </div>
            <div class="profile-item">
              <div class="profile-label">团体类型</div>
              <div class="profile-value">
                <span v-if="profile.is_college" class="college-badge">🎓 高校志愿团体</span>
                <span v-else>普通志愿团体</span>
              </div>
            </div>
          </div>

          <form v-else @submit.prevent="handleSaveProfile" class="profile-form">
            <div class="form-row">
              <div class="form-group full">
                <label>特长专业</label>
                <textarea v-model="profile.specialty" placeholder="请描述团体的专业特长，如：医疗、教育、环保等" rows="3"></textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group full">
                <label>能提供的服务</label>
                <textarea v-model="profile.services" placeholder="请详细描述能提供的志愿服务内容" rows="3"></textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>&nbsp;</label>
                <div class="checkbox-wrap">
                  <span class="checkbox-text" @click="profile.is_college = !profile.is_college">是否为高校志愿团体</span>
                  <span class="checkbox-box" @click="profile.is_college = !profile.is_college" :class="{ checked: profile.is_college }"></span>
                </div>
              </div>
            </div>

            <div class="form-buttons">
              <button type="button" class="cancel-btn" @click="cancelEdit">取消</button>
              <button type="submit" class="submit-btn" :disabled="saving">
                {{ saving ? '保存中...' : '保存信息' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div v-if="activeTab === 'members'" class="members-section">
        <div v-if="applications.length > 0" class="card">
          <div class="card-header">
            <h2>📥 加入申请待审核</h2>
            <span class="badge pending">{{ applications.length }} 人待审核</span>
          </div>
          <div class="member-list">
            <div v-for="app in applications" :key="app.id" class="member-item" @click="showUserDetail(app)">
              <div class="member-top">
                <div class="member-avatar">
                  <img v-if="app.avatar" :src="app.avatar" class="avatar-img" />
                  <span v-else>{{ (app.username || '').charAt(0).toUpperCase() }}</span>
                </div>
                <div class="member-info">
                  <div class="member-name clickable">{{ app.username }}</div>
                  <div class="member-meta">
                    <span v-if="app.is_college">🎓 {{ app.college_name || '高校学生' }}</span>
                    <span>💪 {{ app.specialty || '暂无特长描述' }}</span>
                  </div>
                </div>
              </div>
              <div class="apply-actions">
                <button class="approve-btn" @click.stop="approveMember(app.user_id)">
                  ✓ 同意
                </button>
                <button class="reject-btn" @click.stop="rejectMember(app.user_id)">
                  ✗ 拒绝
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>👥 团体成员</h2>
            <span class="badge success">共 {{ approvedMembers.length }} 人</span>
          </div>
          
          <div v-if="approvedMembers.length === 0" class="empty-state sm">
            <div class="empty-icon">👤</div>
            <p>暂无成员</p>
          </div>

          <div v-else class="member-list">
            <div v-for="member in approvedMembers" :key="member.id" class="member-item" @click="showUserDetail(member)">
              <div class="member-top">
                <div class="member-avatar">
                  <img v-if="member.avatar" :src="member.avatar" class="avatar-img" />
                  <span v-else>{{ (member.username || '').charAt(0).toUpperCase() }}</span>
                </div>
                <div class="member-info">
                  <div class="member-name clickable">{{ member.username }}</div>
                  <div class="member-meta">
                    <span v-if="member.is_college">🎓 {{ member.college_name || '高校学生' }}</span>
                    <span>💪 {{ member.specialty || '暂无特长' }}</span>
                  </div>
                </div>
              </div>
              <div class="apply-actions">
                <button class="remove-btn" @click.stop="removeMember(member.user_id)">
                  移除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'services'" class="services-section">
        <div class="card">
          <div class="card-header">
            <h2>📋 可报名的志愿服务</h2>
          </div>
          
          <div v-if="services.length === 0" class="empty-state sm">
            <div class="empty-icon">📭</div>
            <p>暂无志愿服务活动</p>
          </div>

          <div v-else class="service-list">
            <div v-for="service in services" :key="service.id" class="service-card" @click="showServiceDetail(service)">
              <div class="service-header">
                <h3 class="clickable">{{ service.title }}</h3>
                <span :class="['task-badge', service.task_type]">
                  {{ service.task_type === 'long' ? '🔄 长期' : '⚡ 短期' }}
                </span>
              </div>
              
              <p class="service-desc">{{ service.description }}</p>

              <div class="service-tags">
                <span class="tag category">{{ getCategoryLabel(service.service_category) }}</span>
                <span class="tag target">🎯 {{ getTargetLabel(service.service_target) }}</span>
                <span v-if="service.need_college" class="tag college">🎓 需高校学生</span>
                <span v-if="service.need_skill && service.skill_requirement" class="tag skill">⚠️ 需技能</span>
              </div>

              <div class="service-meta">
                <div class="meta-item">
                  <span>📍</span>
                  <span>{{ service.location }}</span>
                </div>
                <div class="meta-item">
                  <span>📅</span>
                  <span>{{ service.date }}</span>
                </div>
                <div class="meta-item">
                  <span>🕐</span>
                  <span>{{ service.start_time || '09:00' }} - {{ service.end_time || '11:00' }}</span>
                </div>
                <div class="meta-item">
                  <span>⏱️</span>
                  <span>{{ service.duration || 2 }}小时</span>
                </div>
              </div>

              <div class="progress-section sm">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: (service.current_participants / service.max_participants * 100) + '%' }"></div>
                </div>
                <div class="progress-text">
                  <span :class="{ full: service.current_participants >= service.max_participants }">
                    👥 {{ service.current_participants }}/{{ service.max_participants }}人已报名
                  </span>
                  <span v-if="service.current_participants >= service.max_participants" class="full-badge">已满</span>
                  <span v-else class="remaining-badge">还差{{ service.max_participants - service.current_participants }}人</span>
                </div>
              </div>

              <div class="service-action-row">
                <button 
                  class="register-btn-group" 
                  @click.stop="handleGroupRegister(service)"
                  :disabled="service.current_participants >= service.max_participants"
                >
                  团体统一报名
                </button>
                <button class="view-reg-btn" @click.stop="openRegList(service)">
                  👥 查看内部已报名成员 ({{ getGroupRegCount(service.id) }}人)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="message" :class="['toast', message.type]">
      {{ message.text }}
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>👤 详细信息</h3>
          <button class="close-btn" @click="closeDetailModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-avatar-section">
            <div class="detail-avatar">
              <img v-if="currentDetail?.avatar" :src="currentDetail.avatar" class="avatar-img" />
              <div v-else class="avatar-placeholder">{{ (currentDetail?.username || '').charAt(0).toUpperCase() || '?' }}</div>
            </div>
            <div class="detail-name">{{ currentDetail?.username }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">联系电话</div>
            <div class="detail-value">📱 {{ currentDetail?.phone || '暂无' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">个人特长</div>
            <div class="detail-value">{{ currentDetail?.specialty || '暂无描述' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">能提供的服务</div>
            <div class="detail-value">{{ currentDetail?.services || '暂无描述' }}</div>
          </div>
          <div v-if="currentDetail?.is_college" class="detail-item">
            <div class="detail-label">身份类型</div>
            <div class="detail-value">🎓 高校学生 - {{ currentDetail?.college_name || '未填写学校' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRegListModal" class="modal-overlay" @click="showRegListModal = false">
      <div class="modal-content reg-list-modal" @click.stop>
        <div class="modal-header">
          <h3>👥 内部已报名成员 - {{ currentRegService?.title }}</h3>
          <button class="close-btn" @click="showRegListModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="getGroupRegCount(currentRegService?.id) === 0" class="empty-state sm" style="padding: 30px;">
            <p>暂无成员通过本团体报名</p>
          </div>
          <div v-else class="reg-member-list">
            <div v-for="reg in getGroupRegistrations(currentRegService?.id)" :key="reg.id" class="reg-member-item" @click="showUserDetail(reg); showRegListModal = false">
              <div class="member-avatar">
                <img v-if="reg.avatar" :src="reg.avatar" class="avatar-img" />
                <span v-else>{{ (reg.username || '').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="member-info">
                <div class="member-name clickable">{{ reg.username }}</div>
                <div class="member-meta">
                  <span v-if="reg.is_college">🎓 高校学生</span>
                  <span>💪 {{ reg.specialty || '暂无特长' }}</span>
                </div>
              </div>
              <span class="view-hint">点击查看详情 →</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showServiceDetailModal" class="modal-overlay" @click="closeServiceDetailModal">
      <div class="modal-content service-detail-modal" @click.stop>
        <div class="modal-header">
          <h3>📋 活动详情</h3>
          <button class="close-btn" @click="closeServiceDetailModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="service-detail-title">
            <h3>{{ currentServiceDetail?.title }}</h3>
            <span :class="['task-badge', currentServiceDetail?.task_type]">
              {{ currentServiceDetail?.task_type === 'long' ? '🔄 长期' : '⚡ 短期' }}
            </span>
          </div>
          <div class="detail-item">
            <div class="detail-label">活动描述</div>
            <div class="detail-value">{{ currentServiceDetail?.description || '暂无描述' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">活动地点</div>
            <div class="detail-value">📍 {{ currentServiceDetail?.location }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">活动日期</div>
            <div class="detail-value">📅 {{ currentServiceDetail?.date }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">活动时间</div>
            <div class="detail-value">🕐 {{ currentServiceDetail?.start_time || '09:00' }} - {{ currentServiceDetail?.end_time || '11:00' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">志愿时长</div>
            <div class="detail-value">⏱️ {{ currentServiceDetail?.duration || 2 }} 小时</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">招募人数</div>
            <div class="detail-value">👥 {{ currentServiceDetail?.current_participants || 0 }}/{{ currentServiceDetail?.max_participants }} 人</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">服务类别</div>
            <div class="detail-value">{{ getCategoryLabel(currentServiceDetail?.service_category) }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">服务对象</div>
            <div class="detail-value">🎯 {{ getTargetLabel(currentServiceDetail?.service_target) }}</div>
          </div>
          <div v-if="currentServiceDetail?.need_skill && currentServiceDetail?.skill_requirement" class="detail-item skill-required">
            <div class="detail-label">⚠️ 技能要求</div>
            <div class="detail-value">{{ currentServiceDetail?.skill_requirement }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const raw = localStorage.getItem('user')
const user = raw && raw !== 'undefined' ? JSON.parse(raw) : null

if (!user || user.userType !== 'group') {
  router.push('/login')
}

const tabs = [
  { icon: '📋', label: '团体信息', value: 'profile' },
  { icon: '👥', label: '成员管理', value: 'members' },
  { icon: '📋', label: '志愿服务', value: 'services' }
]

const categories = [
  { value: 'environment', label: '🌿 环境整治' },
  { value: 'health', label: '🏥 健康义诊' },
  { value: 'elderly', label: '👴 助老服务' },
  { value: 'childcare', label: '👶 托幼服务' },
  { value: 'employment', label: '💼 就业帮扶' },
  { value: 'other', label: '📌 其他' }
]

const targets = [
  { value: 'all', label: '全体居民' },
  { value: 'children', label: '儿童' },
  { value: 'elderly', label: '老年人' },
  { value: 'unemployed', label: '失业再就业人员' },
  { value: 'disabled', label: '残障人士' },
  { value: 'other', label: '其他' }
]

const activeTab = ref('profile')
const profile = ref({
  specialty: '',
  services: '',
  is_college: false
})
const saving = ref(false)
const applications = ref([])
const approvedMembers = ref([])
const services = ref([])
const allRegistrations = ref([])
const message = ref(null)
const isEditing = ref(false)
const originalProfile = ref(null)

function startEdit() {
  originalProfile.value = { ...profile.value }
  isEditing.value = true
}

const showDetailModal = ref(false)
const showRegListModal = ref(false)
const showServiceDetailModal = ref(false)
const currentDetail = ref(null)
const currentRegService = ref(null)
const currentServiceDetail = ref(null)

function showUserDetail(user) {
  currentDetail.value = user
  showDetailModal.value = true
}

function openRegList(service) {
  currentRegService.value = service
  showRegListModal.value = true
}

function showServiceDetail(service) {
  currentServiceDetail.value = service
  showServiceDetailModal.value = true
}

function closeServiceDetailModal() {
  showServiceDetailModal.value = false
}

function closeDetailModal() {
  showDetailModal.value = false
  currentDetail.value = null
}

function cancelEdit() {
  profile.value = { ...originalProfile.value }
  isEditing.value = false
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file || !user) return
  
  const formData = new FormData()
  formData.append('avatar', file)
  formData.append('user_id', user.id)
  formData.append('user_type', 'group')
  
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

function getCategoryLabel(value) {
  const cat = categories.find(c => c.value === value)
  return cat ? cat.label : value
}

function getTargetLabel(value) {
  const tgt = targets.find(t => t.value === value)
  return tgt ? tgt.label : value
}

function isGroupRegistered(serviceId) {
  console.log('🔍 serviceId:', serviceId, 'type:', typeof serviceId)
  console.log('🔍 user.id:', user.id, 'type:', typeof user.id)
  console.log('🔍 allRegistrations:', allRegistrations.value)
  const result = [].concat(allRegistrations.value || []).some(r => {
    console.log('  对比 r:', r)
    const match = 
      Number(r.service_id) === Number(serviceId) && 
      r.user_type === 'group' && 
      Number(r.group_id) === Number(user.id)
    console.log('  match:', match)
    return match
  })
  console.log('🔍 最终结果:', result)
  return result
}

function getGroupRegCount(serviceId) {
  console.log('📊 getGroupRegCount, serviceId:', serviceId)
  console.log('📊 allRegistrations:', allRegistrations.value)
  console.log('📊 user.id:', user.id)
  const result = allRegistrations.value.filter(r => {
    const match = 
      Number(r.service_id) === Number(serviceId) && 
      r.user_type === 'group_member' && 
      Number(r.group_id) === Number(user.id)
    console.log('  检查 r:', r, 'match:', match)
    return match
  })
  console.log('📊 结果:', result.length)
  return result.length
}

function getGroupRegistrations(serviceId) {
  return allRegistrations.value.filter(r => 
    Number(r.service_id) === Number(serviceId) && 
    r.user_type === 'group_member' && 
    Number(r.group_id) === Number(user.id)
  )
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleString('zh-CN')
}

function showToast(text, type = 'success') {
  message.value = { text, type }
  setTimeout(() => message.value = null, 3000)
}

async function loadProfile() {
  if (!user) return
  try {
    const res = await axios.get(`/api/groups/${user.id}`)
    if (res.data) {
      profile.value = {
        specialty: res.data.specialty || '',
        services: res.data.services || '',
        is_college: res.data.is_college ? true : false
      }
    }
  } catch (error) {
    console.error(error)
  }
}

async function handleSaveProfile() {
  if (!user) return
  saving.value = true
  try {
    await axios.put(`/api/groups/${user.id}`, profile.value)
    showToast('保存成功！')
    isEditing.value = false
  } catch (error) {
    showToast('保存失败', 'error')
  }
  saving.value = false
}

async function loadMembers() {
  if (!user) return
  try {
    const res = await axios.get(`/api/groups/${user.id}/members`)
    const data = [].concat(res.data || [])
    applications.value = data.filter(m => m.status === 'pending')
    approvedMembers.value = data.filter(m => m.status === 'approved')
  } catch (error) {
    console.error(error)
  }
}

async function approveMember(userId) {
  if (!user) return
  try {
    await axios.post(`/api/groups/${user.id}/approve`, { user_id: userId })
    showToast('已同意加入！成员现在可以通过团体报名活动')
    loadMembers()
  } catch (error) {
    showToast('操作失败', 'error')
  }
}

async function rejectMember(userId) {
  if (!user) return
  try {
    await axios.post(`/api/groups/${user.id}/reject`, { user_id: userId })
    showToast('已拒绝申请')
    loadMembers()
  } catch (error) {
    showToast('操作失败', 'error')
  }
}

async function removeMember(userId) {
  if (!user) return
  if (!confirm('确定移除该成员吗？')) return
  try {
    await axios.delete(`/api/groups/${user.id}/members/${userId}`)
    showToast('已移除成员')
    loadMembers()
  } catch (error) {
    showToast('操作失败', 'error')
  }
}

async function loadServices() {
  try {
    const res = await axios.get('/api/services')
    services.value = [].concat(res.data || [])
  } catch (error) {
    console.error(error)
  }
}

async function loadAllRegistrations() {
  if (!user) return
  try {
    const res = await axios.get(`/api/groups/${user.id}/registrations`)
    allRegistrations.value = [].concat(res.data || [])
  } catch (error) {
    console.error(error)
  }
}

async function handleGroupRegister(service) {
  if (!user) return
  try {
    await axios.post(`/api/services/${service.id}/register`, {
      user_id: user.id,
      user_type: 'group',
      group_id: user.id,
      group_name: user.username,
      username: user.username
    })
    showToast('团体报名成功！成员现在可通过团体报名此活动')
    setTimeout(() => {
      location.reload()
    }, 500)
  } catch (error) {
    showToast(error.response?.data?.message || '报名失败', 'error')
  }
}

function handleLogout() {
  localStorage.removeItem('user')
  router.push('/login')
}

onMounted(() => {
  if (user) {
    loadProfile()
    loadMembers()
    loadServices()
    loadAllRegistrations()
  }
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
  color: #1e293b;
  margin: 0 0 12px 0;
}

.header-row-2 {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.user-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome-text {
  font-size: 14px;
  color: #64748b;
}

.role-badge {
  padding: 4px 12px;
  background: #eff6ff;
  color: #165DFF;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.logout-btn {
  padding: 6px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fff;
  border-color: #165DFF;
  color: #165DFF;
}

.tabs-row {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tab-btn {
  padding: 10px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #165DFF;
  border-color: #165DFF;
  color: white;
}

.tab-btn:hover:not(.active) {
  border-color: #165DFF;
  color: #165DFF;
}

.dashboard-content {
  max-width: 1000px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group {
  flex: 1;
}

.form-group.full {
  flex: 0 0 100%;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.form-group textarea,
.form-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
  box-sizing: border-box;
}

.form-group textarea:focus,
.form-group input:focus {
  outline: none;
  border-color: #165DFF;
  box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.1);
}

.checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkbox-text {
  font-size: 14px;
  color: #475569;
  cursor: pointer;
}

.checkbox-box {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-box.checked {
  background: #165DFF;
  border-color: #165DFF;
}

.checkbox-box.checked::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.edit-btn {
  padding: 8px 16px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.profile-display {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.avatar-display {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #165DFF, #36bffa);
}

.avatar-display .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-display .avatar-placeholder {
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.upload-btn {
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 20px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.service-action-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.status-row {
  width: 100%;
}

.register-btn-group,
.view-reg-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.register-btn-group {
  background: linear-gradient(135deg, #165DFF, #36bffa);
  color: white;
}

.registered-badge-inline {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: #ecfdf3;
  color: #039855;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  box-sizing: border-box;
}

.register-btn-group:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.3);
}

.register-btn-group:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.view-reg-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.view-reg-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.reg-list-modal {
  max-width: 420px;
}

.reg-member-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reg-member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.reg-member-item:hover {
  background: #e2e8f0;
}

.view-hint {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

.service-detail-modal {
  max-width: 420px;
}

.service-detail-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin: 0 -20px 16px -20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.service-detail-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.tag.skill {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.skill-required .detail-value {
  color: #92400e;
  font-weight: 600;
}

.service-card {
  cursor: pointer;
  transition: all 0.2s;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.profile-item {
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.profile-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.profile-label {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 8px;
}

.profile-value {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.6;
}

.college-badge {
  display: inline-block;
  padding: 6px 14px;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.form-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.cancel-btn {
  flex: 1;
  padding: 12px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.submit-btn {
  flex: 1;
  padding: 12px;
  background: #165DFF;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #3b82f6;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge.pending {
  background: #fef9c3;
  color: #ca8a04;
}

.badge.success {
  background: #dcfce7;
  color: #15803d;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}

.empty-state.sm {
  padding: 30px;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
}

.member-item {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  gap: 16px;
}

.member-item:hover {
  background: white;
  border-color: #165DFF;
  transform: translateX(4px);
  box-shadow: 0 8px 24px rgba(22, 93, 255, 0.1);
}

.member-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, #165DFF 0%, #36BFFA 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.15);
}

.member-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-info {
  flex: 1;
  margin-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.member-name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.member-meta {
  font-size: 13px;
  color: #64748b;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.member-top {
  display: flex;
  align-items: center;
  width: 100%;
}

.apply-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: flex-end;
}

.approve-btn,
.reject-btn,
.remove-btn {
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 100px;
}

.approve-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.approve-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}

.reject-btn,
.remove-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.reject-btn:hover,
.remove-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.service-card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}

.service-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.service-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.service-desc {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
  line-height: 1.5;
}

.service-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tag {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tag.category {
  background: #eff6ff;
  color: #165DFF;
}

.tag.target {
  background: #f0fdf4;
  color: #16a34a;
}

.tag.college {
  background: #faf5ff;
  color: #9333ea;
}

.task-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.task-badge.long {
  background: #f0f9ff;
  color: #0369a1;
}

.task-badge.short {
  background: #fffbeb;
  color: #d97706;
}

.service-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #64748b;
}

.progress-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: #165DFF;
  border-radius: 3px;
}

.group-registrations-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
}

.group-reg-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.group-reg-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f8fafc;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.group-reg-item:hover {
  background: #e2e8f0;
}

.reg-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #165DFF, #36bffa);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
}

.reg-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  color: #165DFF;
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.modal-body {
  padding: 20px;
}

.detail-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-bottom: 24px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-avatar {
  width: 80px;
  height: 80px;
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
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.detail-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
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

.reg-name {
  font-weight: 500;
  color: #334155;
}

.reg-college {
  font-size: 11px;
  color: #1d4ed8;
}

.btn-outline,
.btn-primary {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline {
  background: transparent;
  border: 1px solid #165DFF;
  color: #165DFF;
}

.btn-outline:hover {
  background: rgba(22, 93, 255, 0.05);
}

.btn-primary {
  background: #165DFF;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #3b82f6;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.registered-badge {
  padding: 10px 18px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.reg-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.reg-notice p {
  font-size: 14px;
  color: #1e40af;
  margin: 0;
}

.member-reg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-reg-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.member-skill {
  font-size: 12px;
  color: #64748b;
}

.reg-btn-sm,
.reged-badge {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.reg-btn-sm {
  background: #165DFF;
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.reg-btn-sm:hover {
  background: #3b82f6;
}

.reged-badge {
  background: #dcfce7;
  color: #16a34a;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  z-index: 2000;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.toast.success {
  background: #10b981;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}
</style>
