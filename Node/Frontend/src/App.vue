<template>
  <div class="app">
    <nav v-if="loggedIn" class="navbar">
      <span class="logo">☁️ OpenDrive</span>
      <div class="nav-links">
        <button @click="$router.push('/dashboard')">🏠 Inicio</button>
        <button
          v-if="esAdmin"
          @click="$router.push('/admin')"
          class="btn-admin">
          ⚙️ Administración
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
