<template>
  <div class="dashboard-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">☁️ OpenDrive</div>
      <nav class="sidebar-nav">
        <button 
          :class="{ active: seccion === 'mis-archivos' }"
          @click="seccion = 'mis-archivos'">
          📁 Mis archivos
        </button>
        <button 
          :class="{ active: seccion === 'mis-bovedas' }"
          @click="seccion = 'mis-bovedas'; cargarMisBovedas()">
          🗄️ Mis bóvedas
        </button>
        <button 
          :class="{ active: seccion === 'compartidos' }"
          @click="seccion = 'compartidos'; cargarBovedas()">
          🔒 Bóvedas compartidas
        </button>
        <button 
          :class="{ active: seccion === 'papelera' }"
          @click="seccion = 'papelera'">
          🗑️ Papelera
        </button>
      </nav>

      <!-- Espacio usado -->
      <div class="espacio-box">
        <p class="espacio-label">Almacenamiento</p>
        <div class="barra-fondo">
          <div class="barra-usada" :style="{ width: porcentajeEspacio + '%', background: colorEspacio }"></div>
        </div>
        <p class="espacio-texto">{{ espacioUsadoMB }} MB de {{ espacioTotalMB }} MB usados</p>
      </div>
    </aside>

    <!-- Contenido principal -->
    <main class="main-content">

      <!-- Header -->
      <div class="main-header">
        <h2>{{ tituloSeccion }}</h2>
        <div class="header-acciones">
          <button class="btn-toggle" v-if="seccion === 'mis-archivos'" @click="vistaGrid = !vistaGrid">
            {{ vistaGrid ? '☰ Lista' : '⊞ Cuadrícula' }}
          </button>
          <button class="btn-subir" v-if="seccion === 'mis-archivos'" @click="$refs.inputArchivo.click()">
            ⬆️ Subir archivo
          </button>
          <button class="btn-subir" v-if="seccion === 'mis-bovedas'" @click="mostrarModalBoveda = true">
            🗄️ Nueva bóveda
          </button>
          <input ref="inputArchivo" type="file" style="display:none" @change="subirArchivo" />
        </div>
      </div>

      <!-- Notificaciones -->
      <div v-for="n in notificaciones" :key="n.mensaje" :class="['notificacion', n.tipo]">
        {{ n.mensaje }}
      </div>

      <!-- Archivos recientes -->
      <div v-if="seccion === 'mis-archivos'">
        <p class="seccion-label">Archivos recientes</p>
        <div v-if="vistaGrid" class="grid-archivos">
          <div class="archivo-card" v-for="archivo in archivos" :key="archivo.id">
            <div class="archivo-icono">{{ iconoArchivo(archivo.tipo) }}</div>
              <p class="archivo-nombre">{{ archivo.nombre }}</p>
              <p class="archivo-fecha">{{ new Date(archivo.creado_en).toLocaleDateString() }}</p>
              <div class="archivo-acciones">
                <button class="btn-mini" @click="descargarArchivo(archivo.id, archivo.nombre)">⬇️</button>
                <button class="btn-mini btn-mini-danger" @click="eliminarArchivo(archivo.id)">🗑️</button>
            </div>
          </div>
          <div v-if="archivos.length === 0" class="vacio">
            No tienes archivos todavía.<br>¡Sube tu primer archivo!
          </div>
        </div>
        <div v-else class="lista-archivos">
          <div class="archivo-fila" v-for="archivo in archivos" :key="archivo.id">
            <span>{{ iconoArchivo(archivo.tipo) }} {{ archivo.nombre }}</span>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span class="archivo-fecha">{{ new Date(archivo.creado_en).toLocaleDateString() }}</span>
              <button class="btn-mini" @click="descargarArchivo(archivo.id, archivo.nombre)">⬇️</button>
              <button class="btn-mini btn-mini-danger" @click="eliminarArchivo(archivo.id)">🗑️</button>
            </div>
          </div>
          <div v-if="archivos.length === 0" class="vacio">
            No tienes archivos todavía.<br>¡Sube tu primer archivo!
          </div>
        </div>
      </div>

      <!-- Mis bóvedas -->
      <div v-if="seccion === 'mis-bovedas'">
        <div v-if="misBovedas.length === 0" class="vacio">
          No has creado ninguna bóveda.<br>¡Crea una para compartir archivos!
        </div>
        <div class="grid-bovedas" v-else>
          <div class="boveda-card" v-for="b in misBovedas" :key="b.id" @click="abrirBoveda(b.id)">
            <div class="boveda-icono">🗄️</div>
            <p class="boveda-nombre">{{ b.nombre }}</p>
            <p class="boveda-meta">{{ b.num_miembros }} miembro{{ b.num_miembros != 1 ? 's' : '' }}</p>
            <div class="boveda-espacio">
              <div class="barra-fondo">
                <div class="barra-usada" :style="{ width: Math.min(b.espacio_usado_bytes / b.espacio_total_bytes * 100, 100) + '%', background: '#3b82f6' }"></div>
              </div>
              <span>{{ (b.espacio_usado_bytes / 1048576).toFixed(1) }} / {{ (b.espacio_total_bytes / 1048576).toFixed(1) }} MB</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bóvedas compartidas conmigo -->
      <div v-if="seccion === 'compartidos'">
        <div v-if="bovedas.length === 0" class="vacio">
          No tienes bóvedas compartidas todavía.
        </div>
        <div class="grid-bovedas" v-else>
          <div class="boveda-card" v-for="b in bovedas" :key="b.id" @click="abrirBoveda(b.id)">
            <div class="boveda-icono">🔒</div>
            <p class="boveda-nombre">{{ b.nombre }}</p>
            <p class="boveda-meta">Por {{ b.creador_username }}</p>
            <div class="boveda-permisos">
              <span v-if="b.puede_leer" class="permiso">👁️ Leer</span>
              <span v-if="b.puede_subir" class="permiso">⬆️ Subir</span>
              <span v-if="b.puede_borrar" class="permiso">🗑️ Borrar</span>
              <span v-if="b.puede_gestionar" class="permiso">⚙️ Gestionar</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal crear bóveda -->
      <div v-if="mostrarModalBoveda" class="modal-overlay" @click.self="mostrarModalBoveda = false">
        <div class="modal">
          <h3>🗄️ Nueva bóveda</h3>
          <input v-model="nuevaBoveda.nombre" type="text" placeholder="Nombre de la bóveda *" />
          <input v-model="nuevaBoveda.descripcion" type="text" placeholder="Descripción (opcional)" />
          <div class="espacio-input">
            <input v-model.number="nuevaBoveda.espacioMB" type="number" min="1" :max="espacioLibreMB" placeholder="Espacio en MB *" />
            <span class="espacio-hint">Disponible: {{ espacioLibreMB }} MB</span>
          </div>
          <p v-if="errorBoveda" class="error-modal">{{ errorBoveda }}</p>
          <div class="modal-acciones">
            <button class="btn-cancelar" @click="mostrarModalBoveda = false">Cancelar</button>
            <button class="btn-crear" @click="crearBoveda" :disabled="creandoBoveda">
              {{ creandoBoveda ? 'Creando...' : 'Crear bóveda' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Papelera -->
      <div v-if="seccion === 'papelera'">
        <div class="vacio">La papelera está vacía.</div>
      </div>

    </main>
  </div>
</template>

<script>
const API = 'http://backend-opendrive.apps-crc.testing';

export default {
  data() {
    return {
      seccion: 'mis-archivos',
      vistaGrid: true,
      notificaciones: [],
      archivos: [],
      espacioUsadoBytes: 0,
      espacioTotalBytes: 0,
      bovedas: [],
      misBovedas: [],
      mostrarModalBoveda: false,
      creandoBoveda: false,
      errorBoveda: '',
      nuevaBoveda: { nombre: '', descripcion: '', espacioMB: '' }
    }
  },
  computed: {
    username() {
      return localStorage.getItem('username') || 'Usuario'
    },
    porcentajeEspacio() {
      if (!this.espacioTotalBytes) return 0;
      return Math.min((this.espacioUsadoBytes / this.espacioTotalBytes) * 100, 100).toFixed(1);
    },
    colorEspacio() {
      const p = this.porcentajeEspacio;
      if (p >= 90) return '#ef4444';
      if (p >= 70) return '#f59e0b';
      return '#3b82f6';
    },
    espacioUsadoMB() {
      return (this.espacioUsadoBytes / 1048576).toFixed(1);
    },
    espacioTotalMB() {
      return (this.espacioTotalBytes / 1048576).toFixed(1);
    },
    espacioLibreMB() {
      return Math.max(0, ((this.espacioTotalBytes - this.espacioUsadoBytes) / 1048576).toFixed(1));
    },
    tituloSeccion() {
      const titulos = {
        'mis-archivos': '📁 Mis archivos',
        'mis-bovedas':  '🗄️ Mis bóvedas',
        'compartidos':  '🔒 Bóvedas compartidas',
        'papelera':     '🗑️ Papelera'
      };
      return titulos[this.seccion];
    }
  },
  async mounted() {
    this.cargarNotificaciones();
    this.cargarEspacio();
    this.cargarArchivos();
  },
  methods: {
    headers() {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };
    },
    async cargarNotificaciones() {
      try {
        const res = await fetch(`${API}/archivos/notificaciones`, { headers: this.headers() });
        this.notificaciones = await res.json();
      } catch (err) { console.error(err); }
    },
    async cargarEspacio() {
      try {
        const res = await fetch(`${API}/archivos/espacio`, { headers: this.headers() });
        const data = await res.json();
        this.espacioUsadoBytes = data.espacio_usado_bytes || 0;
        this.espacioTotalBytes = data.cuota_maxima_bytes || 0;
      } catch (err) { console.error(err); }
    },
    async cargarArchivos() {
      try {
        const res = await fetch(`${API}/archivos/lista`, { headers: this.headers() });
        this.archivos = await res.json();
      } catch (err) { console.error(err); }
    },
    async cargarBovedas() {
      try {
        const res = await fetch(`${API}/bovedas/compartidas`, { headers: this.headers() });
        this.bovedas = await res.json();
      } catch (err) { console.error(err); }
    },
    async cargarMisBovedas() {
      try {
        const res = await fetch(`${API}/bovedas/mias`, { headers: this.headers() });
        this.misBovedas = await res.json();
      } catch (err) { console.error(err); }
    },
    async crearBoveda() {
      this.errorBoveda = '';
      if (!this.nuevaBoveda.nombre || !this.nuevaBoveda.espacioMB) {
        this.errorBoveda = 'Nombre y espacio son obligatorios'; return;
      }
      if (this.nuevaBoveda.espacioMB < 1) {
        this.errorBoveda = 'El espacio mínimo es 1 MB'; return;
      }
      if (this.nuevaBoveda.espacioMB > this.espacioLibreMB) {
        this.errorBoveda = `No tienes suficiente espacio libre (${this.espacioLibreMB} MB)`; return;
      }
      this.creandoBoveda = true;
      try {
        const res = await fetch(`${API}/bovedas/crear`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            nombre: this.nuevaBoveda.nombre,
            descripcion: this.nuevaBoveda.descripcion || undefined,
            espacio_bytes: Math.round(this.nuevaBoveda.espacioMB * 1048576)
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        this.mostrarModalBoveda = false;
        this.nuevaBoveda = { nombre: '', descripcion: '', espacioMB: '' };
        await this.cargarEspacio();
        await this.cargarMisBovedas();
      } catch (err) {
        this.errorBoveda = err.message;
      } finally {
        this.creandoBoveda = false;
      }
    },
    abrirBoveda(id) {
      this.$router.push(`/boveda/${id}`);
    },
    iconoArchivo(tipo) {
      if (!tipo) return '📁';
      if (tipo.includes('pdf')) return '📄';
      if (tipo.includes('image')) return '🖼️';
      if (tipo.includes('video')) return '🎬';
      if (tipo.includes('audio')) return '🎵';
      if (tipo.includes('zip') || tipo.includes('compressed') || tipo.includes('x-tar')) return '📦';
      if (tipo.includes('word') || tipo.includes('document') || tipo.includes('msword')) return '📝';
      return '📁';
    },
    async subirArchivo(event) {
      const archivo = event.target.files[0];
      if (!archivo) return;
      const formData = new FormData();
      formData.append('archivo', archivo);
      try {
        const res = await fetch(`${API}/archivos/subir`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await this.cargarArchivos();
        await this.cargarEspacio();
      } catch (err) { console.error(err); }
    },
    async descargarArchivo(id, nombre) {
      const res = await fetch(`${API}/archivos/descargar/${id}`, { headers: this.headers() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nombre; a.click();
      URL.revokeObjectURL(url);
    },
    async eliminarArchivo(id) {
      if (!confirm('¿Mover a la papelera?')) return;
      await fetch(`${API}/archivos/eliminar/${id}`, { method: 'DELETE', headers: this.headers() });
      await this.cargarArchivos();
      await this.cargarEspacio();
    }
  }
}
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: calc(100vh - 60px);
}

.sidebar {
  width: 240px;
  background: #1e293b;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #334155;
  flex-shrink: 0;
}

.sidebar-logo {
  font-size: 1.3rem;
  color: #60a5fa;
  font-weight: bold;
  margin-bottom: 2rem;
  padding-left: 0.5rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.sidebar-nav button {
  text-align: left;
  background: transparent;
  color: #94a3b8;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-nav button:hover { background: #334155; color: #e2e8f0; }
.sidebar-nav button.active { background: #3b82f620; color: #60a5fa; }

.espacio-box {
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid #334155;
}

.espacio-label { font-size: 0.8rem; color: #64748b; margin-bottom: 0.5rem; }

.barra-fondo {
  background: #334155;
  border-radius: 999px;
  height: 6px;
  margin-bottom: 0.4rem;
}

.barra-usada {
  background: #3b82f6;
  height: 6px;
  border-radius: 999px;
  transition: width 0.5s;
}

.espacio-texto { font-size: 0.78rem; color: #64748b; }

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.main-header h2 { color: #e2e8f0; font-size: 1.5rem; }

.header-acciones { display: flex; gap: 0.75rem; }

.btn-toggle {
  background: #334155;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.btn-subir {
  background: #3b82f6;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.notificacion {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.notificacion.warning { background: #78350f; color: #fde68a; }
.notificacion.error { background: #7f1d1d; color: #fca5a5; }

.seccion-label {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.grid-archivos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.archivo-card {
  background: #1e293b;
  border-radius: 10px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid #334155;
}

.archivo-card:hover { background: #273548; }

.archivo-icono { font-size: 2.5rem; margin-bottom: 0.5rem; }
.archivo-nombre { font-size: 0.85rem; color: #e2e8f0; word-break: break-word; }
.archivo-fecha { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }

.lista-archivos { display: flex; flex-direction: column; gap: 0.5rem; }

.archivo-fila {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #1e293b;
  border-radius: 8px;
  border: 1px solid #334155;
  cursor: pointer;
  transition: background 0.2s;
}

.archivo-fila:hover { background: #273548; }

.vacio {
  text-align: center;
  color: #475569;
  padding: 4rem 2rem;
  font-size: 1rem;
  line-height: 2;
}
.archivo-acciones {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-mini {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 6px;
  background: #334155;
}

.btn-mini-danger { background: #7f1d1d; }

.grid-bovedas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.boveda-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.boveda-card:hover { background: #273548; border-color: #3b82f6; }

.boveda-icono { font-size: 2rem; margin-bottom: 0.5rem; }
.boveda-nombre { font-size: 0.95rem; color: #e2e8f0; font-weight: 600; margin-bottom: 0.25rem; word-break: break-word; }
.boveda-meta { font-size: 0.78rem; color: #64748b; margin-bottom: 0.75rem; }

.boveda-espacio { margin-top: 0.5rem; }
.boveda-espacio span { font-size: 0.75rem; color: #64748b; }

.boveda-permisos { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
.permiso {
  font-size: 0.72rem;
  background: #1e40af;
  color: #bfdbfe;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 2rem;
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.modal h3 { color: #60a5fa; margin-bottom: 0.25rem; }

.espacio-input { display: flex; flex-direction: column; gap: 0.25rem; }
.espacio-hint { font-size: 0.78rem; color: #64748b; }

.error-modal { color: #f87171; font-size: 0.85rem; }

.modal-acciones { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
.btn-cancelar { background: #334155; }
.btn-crear { background: #3b82f6; }
</style>