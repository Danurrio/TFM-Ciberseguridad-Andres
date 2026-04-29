<template>
  <div class="admin-panel">
    <h2>⚙️ Panel de Administración</h2>

    <div v-if="cargando" class="cargando">Cargando usuarios...</div>

    <div v-else>
      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td>{{ u.username }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.nombre }} {{ u.apellido }}</td>
            <td>
              <select 
                v-if="puedeEditarRol(u.rol)" 
                :value="u.rol" 
                @change="cambiarRol(u.id, $event.target.value)">
                <option value="usuario">usuario</option>
                <option value="soporte" v-if="rolActual === 'superadmin' || rolActual === 'admin'">soporte</option>
                <option value="admin" v-if="rolActual === 'superadmin'">admin</option>
                <option value="superadmin" v-if="rolActual === 'superadmin'">superadmin</option>
              </select>
              <span v-else class="badge">{{ u.rol }}</span>
            </td>
            <td>
              <span :class="u.activo ? 'activo' : 'inactivo'">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="acciones">
              <button 
                v-if="puedeDeshabilitarA(u.rol)"
                @click="toggleActivo(u)"
                :class="u.activo ? 'btn-danger' : 'btn-success'">
                {{ u.activo ? 'Deshabilitar' : 'Habilitar' }}
              </button>
              <button 
                v-if="puedeResetPassword()"
                @click="forzarPassword(u.id)"
                class="btn-warning">
                Reset contraseña
              </button>
              <button 
                v-if="rolActual === 'superadmin'"
                @click="eliminarUsuario(u.id)"
                class="btn-delete">
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
const API = 'http://backend-opendrive.apps-crc.testing';

export default {
  props: ['rolActual'],
  data() {
    return {
      usuarios: [],
      cargando: true
    }
  },
  mounted() {
    this.cargarUsuarios();
  },
  methods: {
    token() {
      return localStorage.getItem('token');
    },
    headers() {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token()}`
      };
    },
    puedeEditarRol(rolObjetivo) {
      if (this.rolActual === 'superadmin') return true;
      if (this.rolActual === 'admin' && ['soporte', 'usuario'].includes(rolObjetivo)) return true;
      return false;
    },
    puedeDeshabilitarA(rolObjetivo) {
      if (this.rolActual === 'superadmin') return true;
      if (this.rolActual === 'admin' && ['soporte', 'usuario'].includes(rolObjetivo)) return true;
      return false;
    },
    puedeResetPassword() {
      return ['superadmin', 'admin', 'soporte'].includes(this.rolActual);
    },
    async cargarUsuarios() {
      try {
        const res = await fetch(`${API}/admin/usuarios`, { headers: this.headers() });
        this.usuarios = await res.json();
      } catch (err) {
        console.error(err);
      } finally {
        this.cargando = false;
      }
    },
    async toggleActivo(usuario) {
      try {
        const res = await fetch(`${API}/admin/usuarios/${usuario.id}/activo`, {
          method: 'PATCH',
          headers: this.headers(),
          body: JSON.stringify({ activo: !usuario.activo })
        });
        if (res.ok) {
          usuario.activo = !usuario.activo;
        }
      } catch (err) {
        console.error(err);
      }
    },
    async forzarPassword(id) {
      try {
        await fetch(`${API}/admin/usuarios/${id}/forzar-password`, {
          method: 'PATCH',
          headers: this.headers()
        });
        alert('Se ha forzado el cambio de contraseña');
      } catch (err) {
        console.error(err);
      }
    },
    async cambiarRol(id, rol_nombre) {
      try {
        await fetch(`${API}/admin/usuarios/${id}/rol`, {
          method: 'PATCH',
          headers: this.headers(),
          body: JSON.stringify({ rol_nombre })
        });
        await this.cargarUsuarios();
      } catch (err) {
        console.error(err);
      }
    },
    async eliminarUsuario(id) {
      if (!confirm('¿Seguro que quieres eliminar este usuario? Esta acción no se puede deshacer.')) return;
      try {
        await fetch(`${API}/admin/usuarios/${id}`, {
          method: 'DELETE',
          headers: this.headers()
        });
        await this.cargarUsuarios();
      } catch (err) {
        console.error(err);
      }
    }
  }
}
</script>

