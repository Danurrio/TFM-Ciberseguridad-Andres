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
      <h2>¡Bienvenido a OpenDrive! 🎉</h2>
      <p>Has iniciado sesión correctamente.</p>
      <button @click="logout">Cerrar sesión</button>
    </div>
  </div>
</template>

<script>
import Login from './components/Login.vue'
import Register from './components/Register.vue'

export default {
  components: { Login, Register },
  data() {
    return {
      page: 'login',
      loggedIn: !!localStorage.getItem('token')
    }
  },
  methods: {
    onLogin(token) {
      this.loggedIn = true
    },
    logout() {
      localStorage.removeItem('token')
      this.loggedIn = false
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

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
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

.switch { text-align: center; font-size: 0.9rem; color: #94a3b8; }
.switch span { color: #60a5fa; cursor: pointer; }
.switch span:hover { text-decoration: underline; }

.dashboard {
  text-align: center;
  background: #1e293b;
  padding: 3rem;
  border-radius: 12px;
}

.dashboard h2 { color: #60a5fa; margin-bottom: 1rem; }
.dashboard p { margin-bottom: 1.5rem; color: #94a3b8; }
</style>