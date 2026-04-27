<template>
  <div class="form-box">
    <h2>Crear cuenta</h2>
    <input v-model="nombre" type="text" placeholder="Nombre" />
    <input v-model="apellido" type="text" placeholder="Apellido" />
    <input v-model="username" type="text" placeholder="Usuario" />
    <input v-model="email" type="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Contraseña" />
    <button @click="register">Registrarse</button>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
    <p class="switch">¿Ya tienes cuenta? 
      <span @click="$emit('go-login')">Inicia sesión</span>
    </p>
  </div>
</template>

<script>
const API = 'http://backend-opendrive.apps-crc.testing';

export default {
  emits: ['go-login'],
  data() {
    return {
      nombre: '',
      apellido: '',
      username: '',
      email: '',
      password: '',
      error: '',
      success: ''
    }
  },
  methods: {
    async register() {
      this.error = ''
      this.success = ''
      try {
        const res = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: this.nombre,
            apellido: this.apellido,
            username: this.username,
            email: this.email,
            password: this.password
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        this.success = '¡Cuenta creada! Ya puedes iniciar sesión.'
      } catch (err) {
        this.error = err.message
      }
    }
  }
}
</script>