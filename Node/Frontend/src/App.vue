<template>
  <div class="app">
    <div v-if="!loggedIn" class="welcome">
      <div class="hero">
        <h1>☁️ OpenDrive</h1>
        <p>Tu almacenamiento privado y seguro</p>
        <button @click="showLogin = true" v-if="!showLogin">
          Iniciar sesión
        </button>
      </div>

      <div v-if="showLogin" class="login-box">
        <h2>Bienvenido de nuevo</h2>
        <input v-model="email" type="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Contraseña" />
        <button @click="login">Entrar</button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>

    <div v-else class="dashboard">
      <h2>¡Bienvenido a OpenDrive! 🎉</h2>
      <p>Has iniciado sesión correctamente.</p>
      <button @click="loggedIn = false">Cerrar sesión</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showLogin: false,
      loggedIn: false,
      email: '',
      password: '',
      error: ''
    }
  },
  methods: {
    async login() {
      this.error = ''
      if (!this.email || !this.password) {
        this.error = 'Por favor rellena todos los campos'
        return
      }
      // Por ahora simulamos el login
      // Cuando el backend tenga el endpoint real, lo conectamos aquí
      this.loggedIn = true
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
  align-items: center;
  justify-content: center;
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: #60a5fa;
}

.hero p {
  font-size: 1.2rem;
  color: #94a3b8;
  margin-bottom: 1.5rem;
}

.login-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 320px;
  background: #1e293b;
  padding: 2rem;
  border-radius: 12px;
}

.login-box h2 {
  text-align: center;
  color: #60a5fa;
}

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
  transition: background 0.2s;
}

button:hover { background: #2563eb; }

.error { color: #f87171; text-align: center; }

.dashboard {
  text-align: center;
  background: #1e293b;
  padding: 3rem;
  border-radius: 12px;
}

.dashboard h2 { color: #60a5fa; margin-bottom: 1rem; }
.dashboard p { margin-bottom: 1.5rem; color: #94a3b8; }
</style>