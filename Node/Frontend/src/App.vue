<template>
  <div class="app">
    <nav v-if="loggedIn" class="navbar">
      <span class="logo">☁️ OpenDrive</span>
      <div class="nav-acciones">
        <span class="username">Hola, {{ username }} 👋</span>
        <button
          v-if="esAdmin"
          @click="$router.push('/admin')"
          class="btn-admin">
          ⚙️ Administración
        </button>
        <button
          v-if="esAdmin"
          @click="$router.push('/logs')"
          class="btn-logs">
          📋 Logs
        </button>
        <button @click="logout" class="btn-logout">Cerrar sesión</button>
      </div>
    </nav>
    <router-view />
  </div>
</template>

<script>
export default {
  computed: {
    loggedIn() {
      return !!localStorage.getItem('token')
    },
    username() {
      return localStorage.getItem('username') || ''
    },
    esAdmin() {
      const rol = localStorage.getItem('rol')
      return ['superadmin', 'admin', 'soporte'].includes(rol)
    }
  },
  methods: {
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('rol')
      localStorage.removeItem('username')
      this.$router.push('/login')
    }
  }
}
</script>