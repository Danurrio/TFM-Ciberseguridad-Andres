<template>
  <div class="auth-page">
    <div class="hero">
      <h1>☁️ OpenDrive</h1>
      <p>Tu almacenamiento privado y seguro</p>
    </div>
    <div class="form-box">
      <h2>Iniciar sesión</h2>
      <input v-model="identificador" type="text" placeholder="Email o usuario" />
      <input v-model="password" type="password" placeholder="Contraseña" />
      <button @click="login">Entrar</button>
      <p v-if="error" class="error">{{ error }}</p>
      <p class="switch">¿No tienes cuenta?
        <span @click="$router.push('/register')">Regístrate</span>
      </p>
    </div>
  </div>
</template>

<script>
const API = 'https://backend-opendrive.apps-crc.testing';

export default {
  data() {
    return { identificador: '', password: '', error: '' }
  },
  methods: {
    async login() {
      this.error = ''
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identificador: this.identificador, password: this.password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        localStorage.setItem('token', data.token)
        localStorage.setItem('rol', data.rol)
        localStorage.setItem('username', data.username)
        localStorage.setItem('password_must_change', data.password_must_change)
        this.$router.push('/dashboard')
        this.$emit('logged-in', { token: data.token, rol: data.rol, username: data.username })
      } catch (err) {
        this.error = err.message
      }
    }
  }
}
</script>