import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import VillageDashboard from '../views/VillageDashboard.vue'
import GroupDashboard from '../views/GroupDashboard.vue'
import IndividualDashboard from '../views/IndividualDashboard.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/village',
    name: 'VillageDashboard',
    component: VillageDashboard,
    meta: { requiresAuth: true, userType: 'village' }
  },
  {
    path: '/group',
    name: 'GroupDashboard',
    component: GroupDashboard,
    meta: { requiresAuth: true, userType: 'group' }
  },
  {
    path: '/individual',
    name: 'IndividualDashboard',
    component: IndividualDashboard,
    meta: { requiresAuth: true, userType: 'individual' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  let user = null
  try {
    const raw = localStorage.getItem('user')
    user = raw && raw !== 'undefined' ? JSON.parse(raw) : null
  } catch (e) {
    user = null
  }
  
  if (to.meta.requiresAuth) {
    if (!user) {
      next('/login')
    } else if (to.meta.userType && user.userType !== to.meta.userType) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
