<template>
  <div class="dashboard page-container">
    <div class="header-row-1">
      <h1 class="page-title">👤 个人用户中心</h1>
    </div>
    
    <div class="header-row-2">
      <div class="user-bar">
        <span class="welcome-text">欢迎您，{{ user?.username }}</span>
        <span class="role-badge">个人志愿者</span>
        <span class="hours-badge">⏱️ 累计 {{ totalHours }} 志愿时长</span>
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
            <h2>📋 个人信息</h2>
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
              <div class="profile-label">个人特长</div>
              <div class="profile-value">{{ profile.specialty || '暂无描述' }}</div>
            </div>
            <div class="profile-item">
              <div class="profile-label">能提供的服务</div>
              <div class="profile-value">{{ profile.services || '暂无描述' }}</div>
            </div>
            <div class="profile-item">
              <div class="profile-label">身份类型</div>
              <div class="profile-value">
                <span v-if="profile.is_college" class="college-badge">🎓 高校学生 - {{ profile.college_name }}</span>
                <span v-else>普通志愿者</span>
              </div>
            </div>
          </div>

          <form v-else @submit.prevent="handleSaveProfile" class="profile-form">
            <div class="form-row">
              <div class="form-group full">
                <label>个人特长</label>
                <textarea v-model="profile.specialty" placeholder="请描述您的专业特长，如：医疗护理、教育辅导、环保技术等" rows="3"></textarea>
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
                  <span class="checkbox-text" @click="profile.is_college = !profile.is_college">是否为高校学生</span>
                  <span class="checkbox-box" @click="profile.is_college = !profile.is_college" :class="{ checked: profile.is_college }"></span>
                </div>
                <div v-if="profile.is_college" class="college-input" style="margin-top: 12px; max-width: 240px;">
                  <input v-model="profile.college_name" type="text" placeholder="请输入学校名称" />
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

      <div v-if="activeTab === 'groups'" class="groups-section">
        <div class="card">
          <div class="card-header">
            <h2>🤝 志愿团体列表</h2>
          </div>
          
          <div v-if="groups.length === 0" class="empty-state">
            <div class="empty-icon">🏢</div>
            <p>暂无志愿团体</p>
          </div>

          <div v-else class="group-list">
            <div v-for="group in groups" :key="group.id" class="group-card" @click="showGroupDetail(group)">
              <div class="group-card-top">
                <div class="group-avatar">
                  <img v-if="group.avatar" :src="group.avatar" class="group-avatar-img" />
                  <span v-else>{{ (group.name || '').charAt(0).toUpperCase() }}</span>
                </div>
                <div class="group-info">
                  <div class="group-name clickable">
                    {{ group.name }}
                  </div>
                  <div v-if="group.is_college" class="college-badge">🎓 高校团体</div>
                </div>
              </div>
              
              <div v-if="group.specialty" class="group-specialty">
                💪 {{ group.specialty }}
              </div>
              
              <div v-if="group.services" class="group-services">
                📋 {{ group.services }}
              </div>
              
              <div class="group-actions">
                <button 
                  v-if="!isInGroup(group.id)"
                  class="join-btn" 
                  @click.stop="joinGroup(group)"
                  :disabled="hasPendingApplication(group.id)"
                >
                  {{ hasPendingApplication(group.id) ? '审核中...' : '申请加入' }}
                </button>
                <button 
                  v-else-if="isGroupPending(group.id)"
                  class="pending-btn"
                  disabled
                >
                  ⏳ 等待审核中
                </button>
                <button 
                  v-else
                  class="joined-btn"
                  disabled
                >
                  ✓ 已加入
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
          
          <div v-if="services.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <p>暂无志愿服务活动</p>
          </div>

          <div v-else class="service-list">
            <div v-for="service in services" :key="service.id" class="service-card" @click="showServiceDetail(service)">
              <div class="service-info">
                <div class="service-title">
                  {{ service.title }}
                  <span :class="['task-badge', service.task_type]">
                    {{ service.task_type === 'long' ? '🔄 长期' : '⚡ 短期' }}
                  </span>
                </div>
                <div class="service-meta">
                  <span>📍 {{ service.location }}</span>
                  <span>📅 {{ service.date }}</span>
                  <span>🕐 {{ service.start_time || '09:00' }} - {{ service.end_time || '11:00' }}</span>
                  <span>⏱️ {{ service.duration || 2 }}小时</span>
                  <span>👥 {{ service.current_participants }}/{{ service.max_participants }}人</span>
                </div>
                <div class="service-tags">
                  <span class="tag category">{{ getCategoryLabel(service.service_category) }}</span>
                  <span class="tag target">🎯 {{ getTargetLabel(service.service_target) }}</span>
                  <span v-if="service.need_skill && service.skill_requirement" class="tag skill">⚠️ 需技能</span>
                </div>
              </div>
              <div v-if="!isRegistered(service.id)" class="register-buttons" @click.stop>
                <button 
                  class="register-btn individual" 
                  @click="registerService(service, 'individual')"
                >
                  个人报名
                </button>
                <button 
                  v-if="myApprovedGroups.length > 0"
                  class="register-btn group" 
                  @click="openGroupSelect(service)"
                >
                  团体报名
                </button>
              </div>
              <div v-else class="checkin-area" @click.stop>
                <button class="register-btn registered" disabled>
                  ✓ 已报名
                </button>
                <div class="checkin-buttons">
                  <button 
                    v-if="getCheckinStatus(service.id) === 'not-checked-in'"
                    class="checkin-btn check-in" 
                    @click="handleCheckIn(service)"
                  >
                    📝 签到
                  </button>
                  <button 
                    v-else-if="getCheckinStatus(service.id) === 'checked-in'"
                    class="checkin-btn check-out" 
                    @click="handleCheckOut(service)"
                  >
                    ✅ 签退
                  </button>
                  <button 
                    v-else-if="getCheckinStatus(service.id) === 'completed'"
                    class="checkin-btn completed" 
                    disabled
                  >
                    ✓ 已完成 (+{{ getCheckinHours(service.id) }}小时)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="message" :class="['toast', message.type]">
      {{ message.text }}
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h2>{{ detailType === 'group' ? '🤝 团体详情' : '📋 活动详情' }}</h2>
          <span class="close-btn" @click="closeDetailModal">×</span>
        </div>
        
        <div class="detail-body">
          <template v-if="detailType === 'group'">
            <div class="detail-avatar-section">
              <div class="detail-avatar">
                <img v-if="currentDetail?.avatar" :src="currentDetail.avatar" class="avatar-img" />
                <div v-else class="avatar-placeholder">{{ (currentDetail?.name || '').charAt(0).toUpperCase() || '?' }}</div>
              </div>
              <div class="detail-name">{{ currentDetail?.name }}</div>
              <div v-if="currentDetail?.is_college" class="detail-type-badge">🎓 高校志愿团体</div>
            </div>
            
            <div class="detail-item">
              <div class="detail-label">特长专业</div>
              <div class="detail-value">{{ currentDetail?.specialty || '暂无描述' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">能提供的服务</div>
              <div class="detail-value">{{ currentDetail?.services || '暂无描述' }}</div>
            </div>
          </template>
          
          <template v-if="detailType === 'service'">
            <div class="service-detail-header">
              <h3>{{ currentDetail?.title }}</h3>
              <span :class="['task-badge', currentDetail?.task_type]">
                {{ currentDetail?.task_type === 'long' ? '🔄 长期' : '⚡ 短期' }}
              </span>
            </div>
            
            <div class="detail-item">
              <div class="detail-label">活动描述</div>
              <div class="detail-value">{{ currentDetail?.description || '暂无描述' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">活动地点</div>
              <div class="detail-value">📍 {{ currentDetail?.location }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">活动日期</div>
              <div class="detail-value">📅 {{ currentDetail?.date }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">活动时间</div>
              <div class="detail-value">🕐 {{ currentDetail?.start_time || '09:00' }} - {{ currentDetail?.end_time || '11:00' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">志愿时长</div>
              <div class="detail-value">⏱️ {{ currentDetail?.duration || 2 }} 小时</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">招募人数</div>
              <div class="detail-value">👥 {{ currentDetail?.current_participants || 0 }}/{{ currentDetail?.max_participants }} 人</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">服务类别</div>
              <div class="detail-value">{{ getCategoryLabel(currentDetail?.service_category) }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">服务对象</div>
              <div class="detail-value">🎯 {{ getTargetLabel(currentDetail?.service_target) }}</div>
            </div>
            <div v-if="currentDetail?.need_skill && currentDetail?.skill_requirement" class="detail-item skill-required">
              <div class="detail-label">⚠️ 技能要求</div>
              <div class="detail-value">{{ currentDetail?.skill_requirement }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="showGroupModal" class="modal-overlay" @click.self="showGroupModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>选择报名团体</h2>
          <span class="close-btn" @click="showGroupModal = false">×</span>
        </div>
        
        <div class="modal-notice">
          <div class="notice-icon">💡</div>
          <p>只有团体先统一报名了该活动，您才能通过团体报名</p>
        </div>

        <div v-if="getAvailableGroupsForService(currentService.id).length === 0" class="empty-state sm" style="padding: 24px 16px;">
          <p>暂无团体报名此活动，请先选择个人报名或等待团体报名</p>
        </div>

        <div v-else class="group-select-list">
          <div 
            v-for="g in getAvailableGroupsForService(currentService.id)" 
            :key="g.group_id" 
            class="group-select-item"
            @click="registerWithGroup(currentService, g)"
          >
            {{ g.group_name }}
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
const user = JSON.parse(localStorage.getItem('user') || 'null')

if (!user || user.userType !== 'individual') {
  router.push('/login')
}

const tabs = [
  { icon: '📋', label: '个人信息', value: 'profile' },
  { icon: '🤝', label: '志愿团体', value: 'groups' },
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
  is_college: false,
  college_name: ''
})
const saving = ref(false)
const groups = ref([])
const myGroups = ref([])
const services = ref([])
const myRegistrations = ref([])
const allRegistrations = ref([])
const totalHours = ref(0)
const message = ref(null)
const showGroupModal = ref(false)
const currentService = ref(null)
const isEditing = ref(false)
const originalProfile = ref(null)
const checkinStatuses = ref({})

function getCheckinStatus(serviceId) {
  return checkinStatuses.value[serviceId] || 'not-checked-in'
}

function getCheckinHours(serviceId) {
  return checkinStatuses.value[serviceId + '_hours'] || 0
}

const myApprovedGroups = computed(() => {
  return myGroups.value.filter(g => g.status === 'approved')
})

function getAvailableGroupsForService(serviceId) {
  const registeredGroupIds = allRegistrations.value
    .filter(r => r.service_id === serviceId && r.user_type === 'group')
    .map(r => r.group_id)
  
  return myApprovedGroups.value.filter(g => registeredGroupIds.includes(g.group_id))
}

function startEdit() {
  originalProfile.value = { ...profile.value }
  isEditing.value = true
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
  formData.append('user_type', 'individual')
  
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

const showDetailModal = ref(false)
const detailType = ref('group')
const currentDetail = ref(null)

function showGroupDetail(group) {
  detailType.value = 'group'
  currentDetail.value = group
  showDetailModal.value = true
}

function showServiceDetail(service) {
  detailType.value = 'service'
  currentDetail.value = service
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  currentDetail.value = null
}

function getCategoryLabel(value) {
  const cat = categories.find(c => c.value === value)
  return cat ? cat.label : value
}

function getTargetLabel(value) {
  const tgt = targets.find(t => t.value === value)
  return tgt ? tgt.label : value
}

function isInGroup(groupId) {
  return myGroups.value.some(g => g.group_id === groupId && g.status === 'approved')
}

function isGroupPending(groupId) {
  return myGroups.value.some(g => g.group_id === groupId && g.status === 'pending')
}

function hasPendingApplication(groupId) {
  return myGroups.value.some(g => g.group_id === groupId && g.status === 'pending')
}

function isRegistered(serviceId) {
  return myRegistrations.value.some(r => r.service_id === serviceId);
}

function showToast(text, type = 'success') {
  message.value = { text, type }
  setTimeout(() => message.value = null, 3000)
}

async function loadProfile() {
  if (!user) return
  try {
    const res = await axios.get(`/api/individuals/${user.id}`)
    if (res.data) {
      profile.value = {
        specialty: res.data.specialty || '',
        services: res.data.services || '',
        is_college: res.data.is_college ? true : false,
        college_name: res.data.college_name || ''
      }
      totalHours.value = res.data.total_hours || 0
    }
  } catch (error) {
    console.error(error)
  }
}

async function handleSaveProfile() {
  if (!user) return
  saving.value = true
  try {
    await axios.put(`/api/individuals/${user.id}`, profile.value)
    showToast('保存成功！')
    isEditing.value = false
  } catch (error) {
    showToast('保存失败', 'error')
  }
  saving.value = false
}

async function loadGroups() {
  try {
    const res = await axios.get('/api/groups')
    groups.value = res.data
  } catch (error) {
    console.error(error)
  }
}

async function loadMyGroups() {
  if (!user) return
  try {
    const res = await axios.get(`/api/individuals/${user.id}/groups`)
    myGroups.value = res.data
  } catch (error) {
    console.error(error)
  }
}

async function joinGroup(group) {
  if (!user) return
  try {
    await axios.post(`/api/groups/${group.id}/members`, {
      user_id: user.id,
      username: user.username
    })
    showToast('申请已提交，等待审核！')
    loadMyGroups()
  } catch (error) {
    showToast('申请失败', 'error')
  }
}

async function loadServices() {
  try {
    const res = await axios.get('/api/services')
    services.value = res.data
  } catch (error) {
    console.error(error)
  }
}

async function loadMyRegistrations() {
  if (!user) return
  try {
    const res = await axios.get(`/api/individuals/${user.id}/registrations`)
    myRegistrations.value = res.data
  } catch (error) {
    console.error(error)
  }
}

async function loadAllRegistrations() {
  try {
    const res = await axios.get(`/api/services/registrations`)
    allRegistrations.value = res.data
  } catch (error) {
    console.error(error)
  }
}

async function loadCheckinStatuses() {
  if (!user) return
  try {
    const res = await axios.get(`/api/individuals/${user.id}/check-ins`)
    const statuses = {}
    res.data.forEach(c => {
      statuses[c.service_id] = c.status
      statuses[c.service_id + '_hours'] = c.hours_earned
    })
    checkinStatuses.value = statuses
  } catch (error) {
    console.error(error)
  }
}

async function handleCheckIn(service) {
  if (!user) return
  try {
    const res = await axios.post(`/api/services/${service.id}/check-in`, {
      user_id: user.id,
      username: user.username
    })
    showToast(res.data.message)
    loadCheckinStatuses()
    loadProfile()
  } catch (error) {
    showToast(error.response?.data?.message || '签到失败', 'error')
  }
}

async function handleCheckOut(service) {
  if (!user) return
  try {
    const res = await axios.post(`/api/services/${service.id}/check-out`, {
      user_id: user.id
    })
    showToast(res.data.message)
    totalHours.value += res.data.hours
    user.total_hours = (user.total_hours || 0) + res.data.hours
    localStorage.setItem('user', JSON.stringify(user))
    loadCheckinStatuses()
  } catch (error) {
    showToast(error.response?.data?.message || '签退失败', 'error')
  }
}

function openGroupSelect(service) {
  currentService.value = service
  showGroupModal.value = true
}

async function registerService(service, type = 'individual') {
  if (!user) return
  try {
    await axios.post(`/api/services/${service.id}/register`, {
      user_id: user.id,
      user_type: type,
      username: user.username
    })
    showToast('个人报名成功！')
    loadServices()
    loadMyRegistrations()
  } catch (error) {
    showToast(error.response?.data?.message || '报名失败', 'error')
  }
}

async function registerWithGroup(service, group) {
  if (!user) return
  try {
    await axios.post(`/api/services/${service.id}/register`, {
      user_id: user.id,
      user_type: 'group_member',
      group_id: group.group_id,
      group_name: group.group_name,
      username: user.username
    })
    showToast(`通过「${group.group_name}」团体报名成功！`)
    showGroupModal.value = false
    loadServices()
    loadMyRegistrations()
    loadAllRegistrations()
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
    loadGroups()
    loadMyGroups()
    loadServices()
    loadMyRegistrations()
    loadAllRegistrations()
    loadCheckinStatuses()
  }
})
</script>

<style scoped>
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
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
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.hours-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, #fef9c3, #fde68a);
  color: #b45309;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
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

.logout-btn {
  padding: 10px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fff;
  border-color: #165DFF;
  color: #165DFF;
}

.profile-section,
.groups-section,
.services-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  color: #334155;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: #fcfcfd;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #165DFF;
  background: white;
  box-shadow: 0 0 0 4px rgba(22, 93, 255, 0.1);
}

.checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.checkbox-text {
  font-size: 14px;
  color: #334155;
  cursor: pointer;
}

.checkbox-box {
  width: 22px;
  height: 22px;
  border: 2px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-box.checked {
  background: #165DFF;
  border-color: transparent;
}

.checkbox-box.checked::after {
  content: '✓';
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.card-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
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

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
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

.college-input input {
  padding: 10px 14px;
}

.form-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.cancel-btn {
  flex: 1;
  padding: 14px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.submit-btn {
  flex: 1;
  padding: 14px;
  background: #165DFF;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.2);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(22, 93, 255, 0.3);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
}

.group-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  min-height: 180px;
  box-sizing: border-box;
  width: 100%;
}

.group-card:hover {
  background: white;
  border-color: #165DFF;
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(22, 93, 255, 0.12);
}

.group-card-top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.group-avatar {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  background: linear-gradient(135deg, #165DFF 0%, #36BFFA 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.15);
}

.group-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.group-name {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.college-badge {
  align-self: flex-start;
  padding: 3px 10px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.group-specialty {
  font-size: 14px;
  color: #475569;
  margin-bottom: 8px;
  line-height: 1.5;
}

.group-services {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
  line-height: 1.4;
}

.group-actions {
  margin-top: auto;
  width: 100%;
}

.join-btn {
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, #165DFF 0%, #36BFFA 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.15);
}

.join-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(22, 93, 255, 0.25);
}

.join-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pending-btn,
.joined-btn {
  width: 100%;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: not-allowed;
}

.pending-btn {
  background: #fef3c7;
  color: #b45309;
}

.joined-btn {
  background: #dcfce7;
  color: #15803d;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.service-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.service-card:hover {
  background: white;
  border-color: #165DFF;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(22, 93, 255, 0.12);
}

.service-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-title {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 12px;
  line-height: 1.4;
}

.service-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 20px;
  font-size: 13px;
  color: #64748b;
  padding: 4px 0;
}

.service-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.tag {
  padding: 6px 12px;
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
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #b45309;
}

.register-buttons {
  display: flex;
  gap: 14px;
  width: 100%;
  margin-top: 6px;
}

.register-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
}

.register-btn.individual {
  background: linear-gradient(135deg, #165DFF, #3b82f6);
  color: white;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.2);
}

.register-btn.group {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.checkin-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
}

.checkin-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
}

.checkin-btn {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  text-align: center;
}

.checkin-btn.check-in {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.checkin-btn.check-out {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.checkin-btn.completed {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #475569;
  cursor: not-allowed;
}

.register-btn.registered {
  width: 100%;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #475569;
  cursor: not-allowed;
  font-weight: 600;
  margin-top: 6px;
}

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 360px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  color: #64748b;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e2e8f0;
}

.modal-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.modal-notice .notice-icon {
  font-size: 18px;
}

.modal-notice p {
  margin: 0;
  font-size: 13px;
  color: #0c4a6e;
  line-height: 1.5;
}

.group-select-list {
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.group-select-item {
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  color: #1e293b;
}

.group-select-item:hover {
  background: #dbeafe;
  color: #1d4ed8;
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  color: #165DFF;
  text-decoration: underline;
}

.detail-modal {
  max-width: 380px !important;
  padding: 0 !important;
  overflow: hidden;
}

.detail-body {
  padding: 0 20px 20px 20px;
}

.detail-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  margin: 0 -20px 16px -20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.detail-avatar {
  width: 64px;
  height: 64px;
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
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.detail-name {
  font-size: 17px;
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
  margin-bottom: 14px;
}

.detail-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 5px;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.6;
}

.service-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin: 0 -20px 16px -20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.service-detail-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.service-card {
  cursor: pointer;
  transition: all 0.2s;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.tag.skill {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.skill-required .detail-value {
  color: #92400e;
  font-weight: 600;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  z-index: 2000;
  animation: toastIn 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toast.success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.toast.error {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}
</style>
