<template>
  <div class="app">
    <div v-if="!loggedIn">
      <div class="hero">
        <h1>☁️ OpenDrive</h1>
        <p>Tu almacenamiento privado y seguro</p>
      </div>
      <Register v-if="page === 'register'"
        @go-login="page = 'login'" />
      <Login v-else
        @go-register="page = 'register'"
        @logged-in="onLogin" />
    </div>

    <div v-else class="dashboard">
      <nav class="navbar">
        <span class="logo">☁️ OpenDrive</span>
        <div class="nav-links">
          <button @click="vistaActual = 'inicio'">🏠 Inicio</button>
          <button 
            v-if="esAdmin"
            @click="vistaActual = 'admin'"
            class="btn-admin">
            ⚙️ Administración
          </button>
          <button @click="logout" class="btn-logout">Cerrar sesión</button>
        </div>
      </nav>

      <div class="contenido">
        <AdminPanel v-if="vistaActual === 'admin'" :rolActual="rol" />
        <div v-else class="inicio">
          <h2>¡Bienvenido, {{ username }}! 👋</h2>
          <p>Tu almacenamiento personal está listo.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Login from './components/Login.vue'
import Register from './components/Register.vue'
import AdminPanel from './components/AdminPanel.vue'

export default {
  components: { Login, Register, AdminPanel },
  data() {
    return {
      page: 'login',
      loggedIn: !!localStorage.getItem('token'),
      rol: localStorage.getItem('rol') || '',
      username: '',
      vistaActual: 'inicio'
    }
  },
  computed: {
    esAdmin() {
      return ['superadmin', 'admin', 'soporte'].includes(this.rol);
    }
  },
  methods: {
    onLogin(data) {
      this.loggedIn = true;
      this.rol = data.rol;
      this.username = data.username || '';
      localStorage.setItem('rol', data.rol);
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('rol');
      this.loggedIn = false;
      this.rol = '';
      this.vistaActual = 'inicio';
    }
  }
}
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app { min-height: 100vh; }

.hero {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 4rem;
}

.hero h1 { font-size: 3rem; color: #60a5fa; margin-bottom: 0.5rem; }
.hero p { font-size: 1.2rem; color: #94a3b8; }

.form-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 320px;
  background: #1e293b;
  padding: 2rem;
  border-radius: 12px;
  margin: 0 auto;
}

.form-box h2 { text-align: center; color: #60a5fa; }

input {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 1rem;
}

button {
  padding: 0.75rem;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

button:hover { background: #2563eb; }

.error { color: #f87171; text-align: center; font-size: 0.9rem; }
.success { color: #4ade80; text-align: center; font-size: 0.9rem; }
.hint { color: #64748b; font-size: 0.8rem; }

.switch { text-align: center; font-size: 0.9rem; color: #94a3b8; }
.switch span { color: #60a5fa; cursor: pointer; }
.switch span:hover { text-decoration: underline; }

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.logo { font-size: 1.3rem; color: #60a5fa; font-weight: bold; }

.nav-links { display: flex; gap: 0.75rem; align-items: center; }
.nav-links button { padding: 0.5rem 1rem; font-size: 0.9rem; }

.btn-admin { background: #7c3aed; }
.btn-admin:hover { background: #6d28d9; }
.btn-logout { background: #475569; }
.btn-logout:hover { background: #334155; }

.contenido { padding: 2rem; }

.inicio { text-align: center; padding-top: 4rem; }
.inicio h2 { color: #60a5fa; margin-bottom: 1rem; font-size: 2rem; }
.inicio p { color: #94a3b8; font-size: 1.1rem; }
</style>