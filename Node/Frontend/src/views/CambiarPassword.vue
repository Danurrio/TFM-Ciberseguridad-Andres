<template>
  <div class="auth-page">
    <div class="form-box">
      <h2>🔒 Cambio de contraseña obligatorio</h2>
      <p class="aviso">Un administrador ha requerido que cambies tu contraseña antes de continuar.</p>
      <input v-model="passwordActual" type="password" placeholder="Contraseña actual" />
      <input v-model="passwordNueva" type="password" placeholder="Nueva contraseña" />
      <input v-model="passwordConfirm" type="password" placeholder="Confirmar nueva contraseña" />
      <p class="hint">Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial</p>
      <button @click="cambiar">Cambiar contraseña</button>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>
    </div>
  </div>
</template>

<script>
const API = 'https://backend-opendrive.apps-crc.testing';

export default {
  data() {
    return {
      passwordActual: '',
      passwordNueva: '',
      passwordConfirm: '',
      error: '',
      success: ''
    }
  },
  methods: {
    validarPassword(password) {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password)
    },
    async cambiar() {
      this.error = ''
      this.success = ''

      if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirm) {
        this.error = 'Todos los campos son obligatorios'
        return
      }
      if (this.passwordNueva !== this.passwordConfirm) {
        this.error = 'Las contraseñas nuevas no coinciden'
        return
      }
      if (!this.validarPassword(this.passwordNueva)) {
        this.error = 'La contraseña no cumple los requisitos de seguridad'
        return
      }

      try {
        const res = await fetch(`${API}/auth/cambiar-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            password_actual: this.passwordActual,
            password_nueva: this.passwordNueva
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        this.success = '¡Contraseña cambiada! Redirigiendo...'
        setTimeout(() => this.$router.push('/dashboard'), 1500)
      } catch (err) {
        this.error = err.message
      }
    }
  }
}
</script>