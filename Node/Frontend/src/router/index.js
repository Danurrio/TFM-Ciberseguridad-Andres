import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import AdminPanel from '../views/AdminPanel.vue'
import Logs from '../views/Logs.vue'

function estaAutenticado() {
  return !!localStorage.getItem('token')
}

function tieneRolAdmin() {
  const rol = localStorage.getItem('rol')
  return ['superadmin', 'admin', 'soporte'].includes(rol)
}

function debecambiarPassword() {
  return localStorage.getItem('password_must_change') === 'true'
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
    path: '/cambiar-password',
    component: () => import('../views/CambiarPassword.vue'),
    beforeEnter: (to, from, next) => {
      if (!estaAutenticado()) return next('/login')
      next()
    }
  },
  {
    path: '/dashboard',
    component: Dashboard,
    beforeEnter: (to, from, next) => {
      if (!estaAutenticado()) return next('/login')
      if (debecambiarPassword()) return next('/cambiar-password')
      next()
    }
  },
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: (to, from, next) => {
      if (!estaAutenticado()) return next('/login')
      if (debecambiarPassword()) return next('/cambiar-password')
      if (!tieneRolAdmin()) return next('/dashboard')
      next()
    }
  },
  {
    path: '/logs',
    component: Logs,
    beforeEnter: (to, from, next) => {
      if (!estaAutenticado()) return next('/login')
      if (debecambiarPassword()) return next('/cambiar-password')
      if (!tieneRolAdmin()) return next('/dashboard')
      next()
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router