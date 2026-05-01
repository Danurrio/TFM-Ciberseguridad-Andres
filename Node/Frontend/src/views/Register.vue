<template>
  <div class="auth-page">
    <div class="hero">
      <h1>☁️ OpenDrive</h1>
      <p>Tu almacenamiento privado y seguro</p>
    </div>
    <div class="form-box">
      <h2>Crear cuenta</h2>

      <!-- Nombre y apellido en fila -->
      <div class="input-row">
        <input v-model="nombre" type="text" placeholder="Nombre *" :class="{ 'input-error': errores.nombre }" @blur="validarCampo('nombre')" />
        <input v-model="apellido" type="text" placeholder="Apellido *" :class="{ 'input-error': errores.apellido }" @blur="validarCampo('apellido')" />
      </div>
      <div class="input-row">
        <span v-if="errores.nombre" class="field-error">{{ errores.nombre }}</span>
        
      </div>
      <span v-if="errores.apellido" class="field-error">{{ errores.apellido }}</span>

      <input v-model="username" type="text" placeholder="Usuario *" :class="{ 'input-error': errores.username }" @blur="validarCampo('username')" />
      <span v-if="errores.username" class="field-error">{{ errores.username }}</span>

      <input v-model="email" type="email" placeholder="Email *" :class="{ 'input-error': errores.email }" @blur="validarCampo('email')" />
      <span v-if="errores.email" class="field-error">{{ errores.email }}</span>

      <!-- Contraseña con mostrar/ocultar -->
      <div class="input-icon">
        <input v-model="password" :type="mostrarPassword ? 'text' : 'password'" placeholder="Contraseña *" :class="{ 'input-error': errores.password }" @input="validarCampo('password')" />
        <span class="toggle-pass" @click="mostrarPassword = !mostrarPassword">{{ mostrarPassword ? '🙈' : '👁️' }}</span>
      </div>

      <!-- Indicador de fuerza de contraseña -->
      <div v-if="password" class="fuerza-box">
        <div class="fuerza-barra">
          <div class="fuerza-fill" :style="{ width: fuerzaPorc + '%', background: fuerzaColor }"></div>
        </div>
        <span class="fuerza-label" :style="{ color: fuerzaColor }">{{ fuerzaTexto }}</span>
      </div>

      <!-- Requisitos de contraseña -->
      <div v-if="password" class="requisitos">
        <span :class="req.longitud ? 'ok' : 'ko'">{{ req.longitud ? '✓' : '✗' }} 8 caracteres mínimo</span>
        <span :class="req.mayuscula ? 'ok' : 'ko'">{{ req.mayuscula ? '✓' : '✗' }} Una mayúscula</span>
        <span :class="req.minuscula ? 'ok' : 'ko'">{{ req.minuscula ? '✓' : '✗' }} Una minúscula</span>
        <span :class="req.numero ? 'ok' : 'ko'">{{ req.numero ? '✓' : '✗' }} Un número</span>
        <span :class="req.especial ? 'ok' : 'ko'">{{ req.especial ? '✓' : '✗' }} Un carácter especial</span>
      </div>
      <span v-if="errores.password" class="field-error">{{ errores.password }}</span>

      <!-- Confirmar contraseña -->
      <div class="input-icon">
        <input v-model="passwordConfirm" :type="mostrarConfirm ? 'text' : 'password'" placeholder="Confirmar contraseña *" :class="{ 'input-error': errores.passwordConfirm }" @input="validarCampo('passwordConfirm')" />
        <span class="toggle-pass" @click="mostrarConfirm = !mostrarConfirm">{{ mostrarConfirm ? '🙈' : '👁️' }}</span>
      </div>
      <span v-if="errores.passwordConfirm" class="field-error">{{ errores.passwordConfirm }}</span>

      <input v-model="telefono" type="tel" placeholder="Teléfono (opcional)" :class="{ 'input-error': errores.telefono }" @blur="validarCampo('telefono')" />
      <span v-if="errores.telefono" class="field-error">{{ errores.telefono }}</span>

      <input v-model="direccion" type="text" placeholder="Dirección (opcional)" />

      <button @click="register" :disabled="cargando">
        {{ cargando ? 'Creando cuenta...' : 'Registrarse' }}
      </button>

      <p v-if="errorGeneral" class="error">{{ errorGeneral }}</p>
      <p v-if="success" class="success">{{ success }}</p>

      <p class="switch">¿Ya tienes cuenta?
        <span @click="$router.push('/login')">Inicia sesión</span>
      </p>
    </div>
  </div>
</template>

<script>
const API = 'http://backend-opendrive.apps-crc.testing';

export default {
  data() {
    return {
      nombre: '', apellido: '', username: '',
      email: '', password: '', passwordConfirm: '',
      telefono: '', direccion: '',
      mostrarPassword: false, mostrarConfirm: false,
      cargando: false, errorGeneral: '', success: '',
      errores: {}
    }
  },
  computed: {
    req() {
      const p = this.password
      return {
        longitud:  p.length >= 8,
        mayuscula: /[A-Z]/.test(p),
        minuscula: /[a-z]/.test(p),
        numero:    /\d/.test(p),
        especial:  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p)
      }
    },
    fuerzaPuntos() {
      return Object.values(this.req).filter(Boolean).length
    },
    fuerzaPorc() {
      return (this.fuerzaPuntos / 5) * 100
    },
    fuerzaColor() {
      if (this.fuerzaPuntos <= 2) return '#ef4444'
      if (this.fuerzaPuntos <= 3) return '#f59e0b'
      if (this.fuerzaPuntos === 4) return '#3b82f6'
      return '#22c55e'
    },
    fuerzaTexto() {
      if (this.fuerzaPuntos <= 2) return 'Débil'
      if (this.fuerzaPuntos <= 3) return 'Regular'
      if (this.fuerzaPuntos === 4) return 'Buena'
      return 'Fuerte'
    }
  },
  methods: {
    validarCampo(campo) {
      const e = { ...this.errores }
      switch (campo) {
        case 'nombre':
          e.nombre = this.nombre ? '' : 'El nombre es obligatorio'
          break
        case 'apellido':
          e.apellido = this.apellido ? '' : 'El apellido es obligatorio'
          break
        case 'username':
          if (!this.username) e.username = 'El usuario es obligatorio'
          else if (this.username.length < 3) e.username = 'Mínimo 3 caracteres'
          else if (/\s/.test(this.username)) e.username = 'Sin espacios'
          else e.username = ''
          break
        case 'email':
          e.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email) ? '' : 'Email no válido'
          break
        case 'password':
          e.password = this.fuerzaPuntos === 5 ? '' : 'La contraseña no cumple todos los requisitos'
          if (this.passwordConfirm) {
            e.passwordConfirm = this.password === this.passwordConfirm ? '' : 'Las contraseñas no coinciden'
          }
          break
        case 'passwordConfirm':
          e.passwordConfirm = this.password === this.passwordConfirm ? '' : 'Las contraseñas no coinciden'
          break
        case 'telefono':
          if (this.telefono && !/^\+?[\d\s\-]{7,15}$/.test(this.telefono)) {
            e.telefono = 'Teléfono no válido'
          } else {
            e.telefono = ''
          }
          break
      }
      this.errores = e
    },
    validarTodo() {
      ['nombre', 'apellido', 'username', 'email', 'password', 'passwordConfirm', 'telefono'].forEach(c => this.validarCampo(c))
      return Object.values(this.errores).every(v => !v)
    },
    async register() {
      this.errorGeneral = ''
      this.success = ''
      if (!this.validarTodo()) return

      this.cargando = true
      try {
        const res = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: this.nombre, apellido: this.apellido,
            username: this.username, email: this.email,
            password: this.password,
            telefono: this.telefono || undefined,
            direccion: this.direccion || undefined
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        this.success = '¡Cuenta creada! Ya puedes iniciar sesión.'
      } catch (err) {
        this.errorGeneral = err.message
      } finally {
        this.cargando = false
      }
    }
  }
}
</script>

<style scoped>
.input-row {
  display: flex;
  gap: 0.5rem;
}
.input-row input { flex: 1; }

.input-icon {
  position: relative;
}
.input-icon input { width: 100%; padding-right: 2.5rem; }
.toggle-pass {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 1rem;
  user-select: none;
}

.input-error {
  border-color: #ef4444 !important;
}

.field-error {
  color: #ef4444;
  font-size: 0.78rem;
  margin-top: -0.4rem;
}

.fuerza-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.fuerza-barra {
  flex: 1;
  background: #334155;
  border-radius: 999px;
  height: 5px;
}
.fuerza-fill {
  height: 5px;
  border-radius: 999px;
  transition: width 0.3s, background 0.3s;
}
.fuerza-label { font-size: 0.78rem; white-space: nowrap; }

.requisitos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.2rem 1rem;
  font-size: 0.78rem;
}
.ok { color: #22c55e; }
.ko { color: #64748b; }

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
