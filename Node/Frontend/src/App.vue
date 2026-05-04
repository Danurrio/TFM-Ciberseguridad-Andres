<template>
  <div class="app">
    <nav v-if="loggedIn" class="navbar">
      <!-- Logo clickable que lleva al dashboard -->
      <span class="logo" @click="$router.push('/dashboard')">
        ☁️ <span class="logo-text">OpenDrive</span>
      </span>

      <div class="nav-acciones">
        <!-- Saludo -->
        <span class="username">👋 {{ username }}</span>

        <div class="nav-divider"></div>

        <!-- Botones de admin -->
        <button v-if="esAdmin" @click="$router.push('/admin')" class="btn-nav btn-admin">
          ⚙️ Administración
        </button>
        <button v-if="esAdmin" @click="$router.push('/logs')" class="btn-nav btn-logs">
          📋 Logs
        </button>

        <div class="nav-divider" v-if="esAdmin"></div>

        <!-- Cerrar sesión -->
        <button @click="logout" class="btn-nav btn-logout">
          🚪 Cerrar sesión
        </button>
      </div>
    </nav>
    <router-view />
  </div>
</template>

<script>
export default {
  data() {
    return {
      loggedIn: !!localStorage.getItem('token'),
      username: localStorage.getItem('username') || '',
      esAdmin: ['superadmin', 'admin', 'soporte'].includes(localStorage.getItem('rol'))
    }
  },
  watch: {
    $route() {
      this.loggedIn = !!localStorage.getItem('token')
      this.username = localStorage.getItem('username') || ''
      this.esAdmin  = ['superadmin', 'admin', 'soporte'].includes(localStorage.getItem('rol'))
    }
  },
  methods: {
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('rol')
      localStorage.removeItem('username')
      localStorage.removeItem('password_must_change')
      this.loggedIn = false
      this.username = ''
      this.esAdmin  = false
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.75rem;
  height: 60px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  box-shadow: 0 1px 12px rgba(0, 0, 0, 0.4);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(8px);
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: #60a5fa;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s;
}
.logo:hover { opacity: 0.8; }
.logo-text { letter-spacing: 0.02em; }

/* Acciones */
.nav-acciones {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.username {
  font-size: 0.88rem;
  color: #94a3b8;
  padding: 0 0.5rem;
  white-space: nowrap;
}

.nav-divider {
  width: 1px;
  height: 20px;
  background: #1e293b;
  margin: 0 0.25rem;
}

/* Botones */
.btn-nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  white-space: nowrap;
}
.btn-nav:active { transform: scale(0.97); }

.btn-admin {
  background: #4c1d95;
  color: #ddd6fe;
}
.btn-admin:hover { background: #5b21b6; }

.btn-logs {
  background: #0f4c3a;
  color: #6ee7b7;
}
.btn-logs:hover { background: #065f46; }

.btn-logout {
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}
.btn-logout:hover {
  background: #7f1d1d;
  color: #fca5a5;
  border-color: #7f1d1d;
}
</style>