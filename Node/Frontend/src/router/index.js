import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import AdminPanel from '../views/AdminPanel.vue'

function estaAutenticado() {
  return !!localStorage.getItem('token')
}

function tieneRolAdmin() {
  const rol = localStorage.getItem('rol')
  return ['superadmin', 'admin', 'soporte'].includes(rol)
}

const routes = [
  {
    path: '/',
    redirect: () => estaAutenticado() ? '/dashboard' : '/login'
  },
  {
    path: '/login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/dashboard',
    component: Dashboard,
    beforeEnter: (to, from, next) => {
      if (!estaAutenticado()) return next('/login')
      next()
    }
  },
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: (to, from, next) => {
      if (!estaAutenticado()) return next('/login')
      if (!tieneRolAdmin()) return next('/dashboard')
      next()
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  },
  {
    path: '/logs',
    component: () => import('../views/Logs.vue'),
    beforeEnter: (to, from, next) => {
      if (!estaAutenticado()) return next('/login')
      if (!tieneRolAdmin()) return next('/dashboard')
      next()
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router