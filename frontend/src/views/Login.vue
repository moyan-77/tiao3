<template>
  <div class="login-page">
    <span class="bg-dec dec-1">🎗️</span>
    <span class="bg-dec dec-2">💝</span>
    <span class="bg-dec dec-3">🤝</span>
    <span class="bg-dec dec-4">🌟</span>
    <span class="bg-dec dec-5">❤️</span>
    <span class="bg-dec dec-6">💪</span>
    <span class="bg-dec dec-7">🏆</span>
    <span class="bg-dec dec-8">🌻</span>
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">
          <span class="heart-main">💖</span>
        </div>
        <h1>社区志愿服务平台</h1>
        <p class="slogan">🤝 汇聚爱心 · 传递温暖 · 共建和谐 🌟</p>
      </div>

      <div class="type-selector">
        <button 
          v-for="type in userTypes" 
          :key="type.value"
          :class="['type-btn', { active: loginForm.userType === type.value }]"
          @click="loginForm.userType = type.value"
        >
          <span class="icon">{{ type.icon }}</span>
          <span>{{ type.label }}</span>
        </button>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-wrapper">
          <span class="input-icon">👤</span>
          <input 
            v-model="loginForm.username" 
            type="text" 
            placeholder="用户名"
            required
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">🔒</span>
          <input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="密码"
            required
          />
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="!loading">登 录</span>
          <span v-else class="loading-spin">⟳</span>
        </button>
        
        <p class="footer-text">
          还没有账号？<span @click="showRegister = true">立即注册</span>
        </p>
      </form>

      <div v-if="message" :class="['toast', message.type]">
        {{ message.text }}
      </div>

      <div v-if="showRegister" class="modal-overlay" @click.self="showRegister = false">
        <div class="modal">
          <div class="modal-header">
            <h2>✨ 创建账号</h2>
            <span class="close-btn" @click="showRegister = false">×</span>
          </div>
          <form @submit.prevent="handleRegister" class="register-form">
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input v-model="registerForm.username" type="text" placeholder="用户名" required />
            </div>
            <div class="input-wrapper">
              <span class="input-icon">📱</span>
              <input v-model="registerForm.phone" type="tel" placeholder="手机号码" required maxlength="11" />
            </div>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input v-model="registerForm.password" type="password" placeholder="设置密码" required />
            </div>
            <div class="select-wrapper">
              <select v-model="registerForm.userType" required>
                <option v-for="type in userTypes" :key="type.value" :value="type.value">
                  {{ type.icon }} {{ type.label }}
                </option>
              </select>
            </div>
            <button type="submit" class="login-btn">注册账号</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const userTypes = [
  { label: '社区', value: 'village', icon: '🏛️' },
  { label: '志愿团体', value: 'group', icon: '🤝' },
  { label: '个人用户', value: 'individual', icon: '👤' }
]

const loading = ref(false)
const showRegister = ref(false)
const message = ref(null)

const loginForm = reactive({
  username: '',
  password: '',
  userType: 'village'
})

const registerForm = reactive({
  username: '',
  phone: '',
  password: '',
  userType: 'village'
})

const showMessage = (text, type = 'success') => {
  message.value = { text, type }
  setTimeout(() => message.value = null, 3000)
}

const handleLogin = async () => {
  loading.value = true
  try {
    const res = await axios.post('/api/login', loginForm)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    showMessage('登录成功！', 'success')
    
    const redirectMap = {
      village: '/village',
      group: '/group',
      individual: '/individual'
    }
    
    setTimeout(() => {
      router.push(redirectMap[res.data.user.userType])
    }, 500)
  } catch (err) {
    showMessage(err.response?.data?.message || '登录失败', 'error')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  try {
    await axios.post('/api/register', registerForm)
    showMessage('注册成功，请登录！', 'success')
    showRegister.value = false
    Object.assign(registerForm, { username: '', phone: '', password: '', userType: 'village' })
  } catch (err) {
    showMessage(err.response?.data?.message || '注册失败', 'error')
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #dbeafe 100%);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
  border-radius: 50%;
  top: -200px;
  right: -100px;
  pointer-events: none;
}

.login-page::after {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.06) 0%, transparent 70%);
  border-radius: 50%;
  bottom: -100px;
  left: -100px;
  pointer-events: none;
}

.bg-dec {
  position: absolute;
  font-size: 40px;
  opacity: 0.12;
  pointer-events: none;
  animation: floatBg 15s ease-in-out infinite;
  z-index: 1;
}

.bg-dec.dec-1 { top: 10%; left: 8%; animation-delay: 0s; }
.bg-dec.dec-2 { top: 15%; right: 10%; animation-delay: 1.5s; font-size: 50px; }
.bg-dec.dec-3 { top: 40%; left: 5%; animation-delay: 3s; font-size: 45px; }
.bg-dec.dec-4 { top: 50%; right: 6%; animation-delay: 4.5s; }
.bg-dec.dec-5 { bottom: 25%; left: 10%; animation-delay: 6s; font-size: 52px; }
.bg-dec.dec-6 { bottom: 15%; right: 12%; animation-delay: 7.5s; }
.bg-dec.dec-7 { top: 70%; left: 15%; animation-delay: 9s; font-size: 38px; }
.bg-dec.dec-8 { bottom: 35%; right: 3%; animation-delay: 10.5s; font-size: 44px; }

@keyframes floatBg {
  0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
  25% { transform: translateY(-25px) rotate(8deg) scale(1.05); }
  50% { transform: translateY(-10px) rotate(-5deg) scale(1); }
  75% { transform: translateY(-30px) rotate(5deg) scale(1.08); }
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  max-width: 400px;
  width: 100%;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 56px;
  margin-bottom: 12px;
  display: inline-block;
}

.heart-main {
  display: inline-block;
  animation: heartBeat 1.5s ease-in-out infinite;
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.2); }
  28% { transform: scale(1); }
  42% { transform: scale(1.2); }
  70% { transform: scale(1); }
}

.slogan {
  color: #64748b;
  font-size: 15px;
  margin: 0;
  letter-spacing: 1px;
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
}

.login-header p {
  color: #64748b;
  font-size: 14px;
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 28px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  background: #f8fafc;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #64748b;
}

.type-btn .icon {
  font-size: 22px;
}

.type-btn:hover {
  background: #f1f5f9;
}

.type-btn.active {
  background: #eff6ff;
  border-color: #165DFF;
  color: #165DFF;
  font-weight: 600;
}

.login-form,
.register-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 16px;
  color: #94a3b8;
}

.input-wrapper input {
  width: 100%;
  padding: 14px 14px 14px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
}

.input-wrapper input::placeholder {
  color: #94a3b8;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #165DFF;
  box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.1);
}

.input-wrapper:focus-within .input-icon {
  color: #165DFF;
}

.select-wrapper {
  position: relative;
}

.select-wrapper select {
  width: 100%;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 18px;
}

.select-wrapper select:focus {
  outline: none;
  border-color: #165DFF;
  box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.1);
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: #165DFF;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}

.login-btn:hover {
  background: #3b82f6;
  transform: translateY(-1px);
}

.footer-text {
  text-align: center;
  font-size: 13px;
  color: #64748b;
  margin-top: 20px;
}

.footer-text span {
  color: #165DFF;
  cursor: pointer;
  font-weight: 500;
}

.footer-text span:hover {
  text-decoration: underline;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.loading-spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.footer-text {
  text-align: center;
  margin-top: 24px;
  color: #64748b;
  font-size: 14px;
}

.footer-text span {
  color: #6366f1;
  cursor: pointer;
  font-weight: 600;
  transition: color 0.2s ease;
}

.footer-text span:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  animation: modalIn 0.3s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  cursor: pointer;
  font-size: 20px;
  color: #64748b;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #475569;
  transform: rotate(90deg);
}

.register-form {
  padding: 0 24px 28px;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 28px;
  border-radius: 12px;
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
