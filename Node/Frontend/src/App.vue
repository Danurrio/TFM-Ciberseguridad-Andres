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
  data() {
    return {
      loggedIn: !!localStorage.getItem('token'),
      username: localStorage.getItem('username') || '',
      esAdmin: ['superadmin', 'admin', 'soporte'].includes(localStorage.getItem('rol'))
    }
  },
  watch: {
    // ✅ FIX: recalcular estado al cambiar de ruta, así la navbar se oculta/muestra correctamente
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