<template>
  <div class="form-box">
    <h2>Iniciar sesión</h2>
    <input v-model="email" type="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Contraseña" />
    <button @click="login">Entrar</button>
    <p v-if="error" class="error">{{ error }}</p>
    <p class="switch">¿No tienes cuenta? 
      <span @click="$emit('go-register')">Regístrate</span>
    </p>
  </div>
</template>

<script>
const API = 'http://backend-opendrive.apps-crc.testing';

export default {
  emits: ['go-register', 'logged-in'],
  data() {
    return {
      email: '',
      password: '',
      error: ''
    }
  },
  methods: {
    async login() {
      this.error = ''
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.email,
            password: this.password
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        localStorage.setItem('token', data.token)
        localStorage.setItem('rol', data.rol)
        this.$emit('logged-in', { token: data.token, rol: data.rol, username: data.username })
      } catch (err) {
        this.error = err.message
      }
    }
  }
}
</script>