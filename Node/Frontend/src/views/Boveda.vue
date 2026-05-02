<template>
  <div class="dashboard-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">☁️ OpenDrive</div>
      <nav class="sidebar-nav">
        <button @click="$router.push('/dashboard')">← Volver</button>
        <button :class="{ active: tab === 'archivos' }" @click="tab = 'archivos'">📂 Archivos</button>
        <button v-if="acceso && (acceso.esCreador || acceso.puede_gestionar)" :class="{ active: tab === 'miembros' }" @click="tab = 'miembros'">👥 Miembros</button>
      </nav>

      <!-- Info de la bóveda -->
      <div class="espacio-box" v-if="boveda">
        <p class="espacio-label">{{ boveda.nombre }}</p>
        <div class="barra-fondo">
          <div class="barra-usada" :style="{ width: porcentaje + '%', background: colorEspacio }"></div>
        </div>
        <p class="espacio-texto">{{ usadoMB }} / {{ totalMB }} MB</p>
        <p class="espacio-texto" style="margin-top:0.25rem">
          {{ acceso?.esCreador ? '👑 Creador' : permisoLabel }}
        </p>
      </div>
    </aside>

    <!-- Contenido -->
    <main class="main-content">
      <div v-if="cargando" class="vacio">Cargando bóveda...</div>
      <div v-else-if="!boveda" class="vacio">Bóveda no encontrada o sin acceso.</div>

      <template v-else>

        <!-- ── ARCHIVOS ── -->
        <div v-if="tab === 'archivos'">
          <div class="main-header">
            <h2>📂 {{ boveda.nombre }}</h2>
            <div class="header-acciones">
              <button v-if="acceso.puede_subir" class="btn-subir" @click="$refs.inputArchivo.click()">
                ⬆️ Subir archivo
              </button>
              <input ref="inputArchivo" type="file" style="display:none" @change="subirArchivo" />
            </div>
          </div>

          <p v-if="errorArchivo" class="notificacion error">{{ errorArchivo }}</p>

          <div v-if="archivos.length === 0" class="vacio">
            No hay archivos en esta bóveda todavía.
          </div>
          <div v-else class="lista-archivos">
            <div class="archivo-fila" v-for="a in archivos" :key="a.id">
              <span>{{ iconoArchivo(a.tipo) }} {{ a.nombre }}</span>
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <span class="archivo-fecha">{{ a.subido_por }} · {{ new Date(a.creado_en).toLocaleDateString() }}</span>
                <button class="btn-mini" @click="descargar(a.id, a.nombre)">⬇️</button>
                <button v-if="acceso.puede_borrar" class="btn-mini btn-mini-danger" @click="eliminar(a.id)">🗑️</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── MIEMBROS ── -->
        <div v-if="tab === 'miembros'">
          <div class="main-header">
            <h2>👥 Miembros</h2>
          </div>

          <!-- Invitar -->
          <div class="invitar-box">
            <input v-model="invitar.identificador" type="text" placeholder="Usuario o email a invitar" />
            <div class="permisos-check">
              <label><input type="checkbox" v-model="invitar.puede_leer" /> 👁️ Leer</label>
              <label><input type="checkbox" v-model="invitar.puede_subir" /> ⬆️ Subir</label>
              <label><input type="checkbox" v-model="invitar.puede_borrar" /> 🗑️ Borrar</label>
              <label v-if="acceso.esCreador"><input type="checkbox" v-model="invitar.puede_gestionar" /> ⚙️ Gestionar</label>
            </div>
            <p v-if="errorInvitar" class="error-inline">{{ errorInvitar }}</p>
            <button class="btn-invitar" @click="invitarMiembro" :disabled="invitando">
              {{ invitando ? 'Invitando...' : '➕ Invitar' }}
            </button>
          </div>

          <!-- Lista de miembros -->
          <div v-if="miembros.length === 0" class="vacio">No hay miembros todavía.</div>
          <div v-else class="lista-miembros">
            <div class="miembro-fila" v-for="m in miembros" :key="m.usuario_id">
              <div class="miembro-info">
                <span class="miembro-nombre">{{ m.username }}</span>
                <span class="miembro-email">{{ m.email }}</span>
              </div>
              <div class="miembro-permisos">
                <label><input type="checkbox" :checked="m.puede_leer" @change="editarPermiso(m, 'puede_leer', $event.target.checked)" /> 👁️</label>
                <label><input type="checkbox" :checked="m.puede_subir" @change="editarPermiso(m, 'puede_subir', $event.target.checked)" /> ⬆️</label>
                <label><input type="checkbox" :checked="m.puede_borrar" @change="editarPermiso(m, 'puede_borrar', $event.target.checked)" /> 🗑️</label>
                <label v-if="acceso.esCreador"><input type="checkbox" :checked="m.puede_gestionar" @change="editarPermiso(m, 'puede_gestionar', $event.target.checked)" /> ⚙️</label>
              </div>
              <button
                v-if="acceso.esCreador || (acceso.puede_gestionar && !m.puede_gestionar)"
                class="btn-revocar"
                @click="revocarAcceso(m)">
                Revocar
              </button>
            </div>
          </div>

          <!-- Eliminar bóveda (solo creador) -->
          <div v-if="acceso.esCreador" class="zona-peligro">
            <h3>⚠️ Zona de peligro</h3>
            <p>Eliminar la bóveda devolverá el espacio a tu cuota personal pero borrará todos sus archivos.</p>
            <button class="btn-eliminar-boveda" @click="eliminarBoveda">🗑️ Eliminar bóveda</button>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<script>
const API = 'http://backend-opendrive.apps-crc.testing';

export default {
  data() {
    return {
      tab: 'archivos',
      cargando: true,
      boveda: null,
      acceso: null,
      archivos: [],
      miembros: [],
      errorArchivo: '',
      errorInvitar: '',
      invitando: false,
      invitar: { identificador: '', puede_leer: true, puede_subir: false, puede_borrar: false, puede_gestionar: false }
    }
  },
  computed: {
    porcentaje() {
      if (!this.boveda?.espacio_total_bytes) return 0;
      return Math.min(this.boveda.espacio_usado_bytes / this.boveda.espacio_total_bytes * 100, 100).toFixed(1);
    },
    colorEspacio() {
      if (this.porcentaje >= 90) return '#ef4444';
      if (this.porcentaje >= 70) return '#f59e0b';
      return '#3b82f6';
    },
    usadoMB() { return this.boveda ? (this.boveda.espacio_usado_bytes / 1048576).toFixed(1) : 0 },
    totalMB() { return this.boveda ? (this.boveda.espacio_total_bytes / 1048576).toFixed(1) : 0 },
    permisoLabel() {
      if (!this.acceso) return '';
      const p = [];
      if (this.acceso.puede_leer) p.push('👁️ Leer');
      if (this.acceso.puede_subir) p.push('⬆️ Subir');
      if (this.acceso.puede_borrar) p.push('🗑️ Borrar');
      if (this.acceso.puede_gestionar) p.push('⚙️ Gestionar');
      return p.join(' · ');
    }
  },
  async mounted() {
    await this.cargarBoveda();
    await this.cargarArchivos();
  },
  methods: {
    headers() {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };
    },
    async cargarBoveda() {
      try {
        const res = await fetch(`${API}/bovedas/${this.$route.params.id}`, { headers: this.headers() });
        if (!res.ok) { this.boveda = null; return; }
        const data = await res.json();
        this.boveda = data;
        this.acceso = data.acceso;
      } catch (err) { console.error(err); }
      finally { this.cargando = false; }
    },
    async cargarArchivos() {
      try {
        const res = await fetch(`${API}/bovedas/${this.$route.params.id}/archivos`, { headers: this.headers() });
        if (res.ok) this.archivos = await res.json();
      } catch (err) { console.error(err); }
    },
    async cargarMiembros() {
      try {
        const res = await fetch(`${API}/bovedas/${this.$route.params.id}/miembros`, { headers: this.headers() });
        if (res.ok) this.miembros = await res.json();
      } catch (err) { console.error(err); }
    },
    async subirArchivo(event) {
      this.errorArchivo = '';
      const archivo = event.target.files[0];
      if (!archivo) return;
      const formData = new FormData();
      formData.append('archivo', archivo);
      try {
        const res = await fetch(`${API}/bovedas/${this.$route.params.id}/archivos/subir`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await this.cargarArchivos();
        await this.cargarBoveda();
      } catch (err) { this.errorArchivo = err.message; }
    },
    async descargar(id, nombre) {
      const res = await fetch(`${API}/bovedas/${this.$route.params.id}/archivos/${id}/descargar`, { headers: this.headers() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nombre; a.click();
      URL.revokeObjectURL(url);
    },
    async eliminar(id) {
      if (!confirm('¿Eliminar este archivo de la bóveda?')) return;
      await fetch(`${API}/bovedas/${this.$route.params.id}/archivos/${id}`, { method: 'DELETE', headers: this.headers() });
      await this.cargarArchivos();
      await this.cargarBoveda();
    },
    async invitarMiembro() {
      this.errorInvitar = '';
      if (!this.invitar.identificador) { this.errorInvitar = 'Introduce un usuario o email'; return; }
      this.invitando = true;
      try {
        const res = await fetch(`${API}/bovedas/${this.$route.params.id}/miembros`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(this.invitar)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        this.invitar = { identificador: '', puede_leer: true, puede_subir: false, puede_borrar: false, puede_gestionar: false };
        await this.cargarMiembros();
      } catch (err) { this.errorInvitar = err.message; }
      finally { this.invitando = false; }
    },
    async editarPermiso(miembro, campo, valor) {
      try {
        await fetch(`${API}/bovedas/${this.$route.params.id}/miembros/${miembro.usuario_id}/permisos`, {
          method: 'PATCH',
          headers: this.headers(),
          body: JSON.stringify({ [campo]: valor })
        });
        miembro[campo] = valor;
      } catch (err) { console.error(err); }
    },
    async revocarAcceso(miembro) {
      if (!confirm(`¿Revocar acceso a ${miembro.username}?`)) return;
      try {
        await fetch(`${API}/bovedas/${this.$route.params.id}/miembros/${miembro.usuario_id}`, { method: 'DELETE', headers: this.headers() });
        await this.cargarMiembros();
      } catch (err) { console.error(err); }
    },
    async eliminarBoveda() {
      if (!confirm('¿Eliminar esta bóveda? Se perderán todos sus archivos y se recuperará el espacio.')) return;
      try {
        const res = await fetch(`${API}/bovedas/${this.$route.params.id}`, { method: 'DELETE', headers: this.headers() });
        if (res.ok) this.$router.push('/dashboard');
      } catch (err) { console.error(err); }
    },
    iconoArchivo(tipo) {
      if (!tipo) return '📁';
      if (tipo.includes('pdf')) return '📄';
      if (tipo.includes('image')) return '🖼️';
      if (tipo.includes('video')) return '🎬';
      if (tipo.includes('audio')) return '🎵';
      if (tipo.includes('zip') || tipo.includes('compressed')) return '📦';
      if (tipo.includes('word') || tipo.includes('document')) return '📝';
      return '📁';
    }
  },
  watch: {
    tab(val) {
      if (val === 'miembros') this.cargarMiembros();
    }
  }
}
</script>

<style scoped>
.dashboard-layout { display: flex; min-height: calc(100vh - 60px); }

.sidebar {
  width: 240px; background: #1e293b; padding: 1.5rem 1rem;
  display: flex; flex-direction: column; border-right: 1px solid #334155; flex-shrink: 0;
}
.sidebar-logo { font-size: 1.3rem; color: #60a5fa; font-weight: bold; margin-bottom: 2rem; padding-left: 0.5rem; }
.sidebar-nav { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
.sidebar-nav button {
  text-align: left; background: transparent; color: #94a3b8;
  padding: 0.65rem 0.75rem; border-radius: 8px; font-size: 0.95rem;
  border: none; cursor: pointer; transition: background 0.2s;
}
.sidebar-nav button:hover { background: #334155; color: #e2e8f0; }
.sidebar-nav button.active { background: #3b82f620; color: #60a5fa; }

.espacio-box { margin-top: auto; padding-top: 1.5rem; border-top: 1px solid #334155; }
.espacio-label { font-size: 0.8rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 600; }
.barra-fondo { background: #334155; border-radius: 999px; height: 6px; margin-bottom: 0.4rem; }
.barra-usada { height: 6px; border-radius: 999px; transition: width 0.5s; }
.espacio-texto { font-size: 0.78rem; color: #64748b; }

.main-content { flex: 1; padding: 2rem; overflow-y: auto; }
.main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.main-header h2 { color: #e2e8f0; font-size: 1.5rem; }
.header-acciones { display: flex; gap: 0.75rem; }
.btn-subir { background: #3b82f6; padding: 0.5rem 1rem; font-size: 0.85rem; border-radius: 8px; border: none; color: white; cursor: pointer; }

.notificacion { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
.notificacion.error { background: #7f1d1d; color: #fca5a5; }

.lista-archivos { display: flex; flex-direction: column; gap: 0.5rem; }
.archivo-fila {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1rem; background: #1e293b; border-radius: 8px;
  border: 1px solid #334155;
}
.archivo-fila:hover { background: #273548; }
.archivo-fecha { font-size: 0.75rem; color: #64748b; }
.btn-mini { padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 6px; background: #334155; border: none; cursor: pointer; color: white; }
.btn-mini-danger { background: #7f1d1d; }

/* Invitar */
.invitar-box {
  background: #1e293b; border: 1px solid #334155; border-radius: 10px;
  padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;
}
.invitar-box input[type="text"] {
  padding: 0.65rem 0.75rem; background: #0f172a; border: 1px solid #334155;
  border-radius: 8px; color: #e2e8f0; font-size: 0.9rem;
}
.permisos-check { display: flex; gap: 1rem; flex-wrap: wrap; }
.permisos-check label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; color: #94a3b8; cursor: pointer; }
.error-inline { color: #f87171; font-size: 0.82rem; }
.btn-invitar { background: #3b82f6; color: white; border: none; border-radius: 8px; padding: 0.6rem 1.25rem; cursor: pointer; font-size: 0.9rem; align-self: flex-start; }
.btn-invitar:disabled { opacity: 0.6; cursor: not-allowed; }

/* Miembros */
.lista-miembros { display: flex; flex-direction: column; gap: 0.5rem; }
.miembro-fila {
  display: flex; align-items: center; gap: 1rem;
  background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 0.75rem 1rem;
}
.miembro-info { flex: 1; }
.miembro-nombre { font-size: 0.9rem; color: #e2e8f0; display: block; }
.miembro-email { font-size: 0.75rem; color: #64748b; }
.miembro-permisos { display: flex; gap: 0.75rem; }
.miembro-permisos label { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: #94a3b8; cursor: pointer; }
.btn-revocar { background: #7f1d1d; color: white; border: none; border-radius: 6px; padding: 0.3rem 0.75rem; font-size: 0.8rem; cursor: pointer; }

/* Zona peligro */
.zona-peligro {
  margin-top: 2.5rem; border: 1px solid #7f1d1d; border-radius: 10px;
  padding: 1.25rem; background: #1c0a0a;
}
.zona-peligro h3 { color: #f87171; margin-bottom: 0.5rem; }
.zona-peligro p { color: #94a3b8; font-size: 0.85rem; margin-bottom: 1rem; }
.btn-eliminar-boveda { background: #dc2626; color: white; border: none; border-radius: 8px; padding: 0.6rem 1.25rem; cursor: pointer; }

.vacio { text-align: center; color: #475569; padding: 4rem 2rem; font-size: 1rem; line-height: 2; }
</style>