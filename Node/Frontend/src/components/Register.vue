<template>
  <div class="form-box">
    <h2>Crear cuenta</h2>
    <input v-model="nombre" type="text" placeholder="Nombre *" />
    <input v-model="apellido" type="text" placeholder="Apellido *" />
    <input v-model="username" type="text" placeholder="Usuario *" />
    <input v-model="email" type="email" placeholder="Email *" />
    <input v-model="password" type="password" placeholder="Contraseña *" />
    <p class="hint">Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial</p>
    <input v-model="telefono" type="tel" placeholder="Teléfono (opcional)" />
    <input v-model="direccion" type="text" placeholder="Dirección (opcional)" />
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
      telefono: '',
      direccion: '',
      error: '',
      success: ''
    }
  },
  methods: {
    validarEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    validarPassword(password) {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password);
    },
    validarTelefono(telefono) {
      return /^\+?[\d\s\-]{7,15}$/.test(telefono);
    },
    validarFormulario() {
      if (!this.nombre || !this.apellido || !this.username || !this.email || !this.password) {
        this.error = 'Nombre, apellido, usuario, email y contraseña son obligatorios';
        return false;
      }
      if (!this.validarEmail(this.email)) {
        this.error = 'El email no tiene un formato válido';
        return false;
      }
      if (!this.validarPassword(this.password)) {
        this.error = 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';
        return false;
      }
      if (this.telefono && !this.validarTelefono(this.telefono)) {
        this.error = 'El teléfono no tiene un formato válido';
        return false;
      }
      return true;
    },
    async register() {
      this.error = ''
      this.success = ''

      // Validación en frontend primero
      if (!this.validarFormulario()) return;

      // Si pasa el frontend, enviamos al backend
      try {
        const res = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: this.nombre,
            apellido: this.apellido,
            username: this.username,
            email: this.email,
            password: this.password,
            telefono: this.telefono || undefined,
            direccion: this.direccion || undefined
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