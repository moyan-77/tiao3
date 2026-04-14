<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #1e293b;
  line-height: 1.6;
}

#app {
  min-height: 100vh;
}

.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
  padding: 24px;
}

.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 24px;
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 10px 40px -10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 28px 32px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h1 {
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-welcome {
  text-align: right;
}

.user-welcome .name {
  font-weight: 600;
  font-size: 15px;
}

.user-welcome .role {
  font-size: 12px;
  opacity: 0.9;
}

.logout-btn {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.tabs {
  display: flex;
  padding: 0 32px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.tab-btn {
  padding: 18px 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  position: relative;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: #475569;
  background: rgba(99, 102, 241, 0.05);
}

.tab-btn.active {
  color: #6366f1;
  font-weight: 600;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px 3px 0 0;
}

.dashboard-content {
  padding: 32px;
}

.card {
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}

.card-header h2 {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-body {
  padding: 24px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #64748b;
}

.empty-state.sm {
  padding: 32px 24px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state p {
  font-size: 14px;
}

.btn-primary {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.35);
}

.btn-primary:active {
  transform: translateY(0);
}
</style>
