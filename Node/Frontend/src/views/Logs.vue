<template>
  <div class="logs-page">
    <h2>📋 Logs de Auditoría</h2>

    <div class="tabs">
      <button :class="{ active: tab === 'admin' }" @click="tab = 'admin'; cargar()">
        🔧 Acciones Admin
      </button>
      <button :class="{ active: tab === 'usuarios' }" @click="tab = 'usuarios'; cargar()">
        👤 Acciones Usuario
      </button>
    </div>

    <div v-if="cargando" class="cargando">Cargando logs...</div>

    <table v-else>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Usuario</th>
          <th>Acción</th>
          <th v-if="tab === 'admin'">Entidad</th>
          <th>Detalle</th>
          <th>IP</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ formatFecha(log.creado_en) }}</td>
          <td>{{ log.admin_username || log.username || 'N/A' }}</td>
          <td><span class="badge-accion">{{ log.accion }}</span></td>
          <td v-if="tab === 'admin'">{{ log.entidad || '-' }}</td>
          <td>{{ log.detalle || '-' }}</td>
          <td>{{ log.ip || '-' }}</td>
        </tr>
        <tr v-if="logs.length === 0">
          <td colspan="6" class="vacio">No hay logs todavía</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
const API = 'http://backend-opendrive.apps-crc.testing';

export default {
  data() {
    return {
      tab: 'admin',
      logs: [],
      cargando: true
    }
  },
  mounted() {
    this.cargar();
  },
  methods: {
    headers() {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };
    },
    async cargar() {
      this.cargando = true;
      try {
        const res = await fetch(`${API}/logs/${this.tab}`, { headers: this.headers() });
        this.logs = await res.json();
      } catch (err) {
        console.error(err);
      } finally {
        this.cargando = false;
      }
    },
    formatFecha(fecha) {
      return new Date(fecha).toLocaleString('es-ES');
    }
  }
}
</script>

<style scoped>
.logs-page { padding: 2rem; }
.logs-page h2 { color: #60a5fa; margin-bottom: 1.5rem; }

.tabs { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }
.tabs button {
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  border: none;
  background: #334155;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.9rem;
}
.tabs button.active { background: #3b82f6; color: white; }

table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th { background: #1e293b; padding: 0.75rem; text-align: left; color: #64748b; }
td { padding: 0.75rem; border-bottom: 1px solid #1e293b20; }
tr:hover { background: #1e293b33; }

.badge-accion {
  background: #1e40af;
  color: #bfdbfe;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  white-space: nowrap;
}

.vacio { text-align: center; color: #475569; padding: 2rem; }
.cargando { color: #94a3b8; text-align: center; padding: 2rem; }
</style>