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
          :class="{ active: seccion === 'compartidos' }"
          @click="seccion = 'compartidos'">
          👥 Compartidos conmigo
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
          <div class="barra-usada" :style="{ width: porcentajeEspacio + '%' }"></div>
        </div>
        <p class="espacio-texto">{{ espacioUsadoGB }} GB de {{ espacioTotalGB }} GB usados</p>
      </div>
    </aside>

    <!-- Contenido principal -->
    <main class="main-content">

      <!-- Header -->
      <div class="main-header">
        <h2>{{ tituloSeccion }}</h2>
        <div class="header-acciones">
          <button class="btn-toggle" @click="vistaGrid = !vistaGrid">
            {{ vistaGrid ? '☰ Lista' : '⊞ Cuadrícula' }}
          </button>
          <button class="btn-subir" v-if="seccion === 'mis-archivos'">
            ⬆️ Subir archivo
          </button>
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
            <p class="archivo-fecha">{{ archivo.fecha }}</p>
          </div>
          <div v-if="archivos.length === 0" class="vacio">
            No tienes archivos todavía.<br>¡Sube tu primer archivo!
          </div>
        </div>
        <div v-else class="lista-archivos">
          <div class="archivo-fila" v-for="archivo in archivos" :key="archivo.id">
            <span>{{ iconoArchivo(archivo.tipo) }} {{ archivo.nombre }}</span>
            <span class="archivo-fecha">{{ archivo.fecha }}</span>
          </div>
          <div v-if="archivos.length === 0" class="vacio">
            No tienes archivos todavía.<br>¡Sube tu primer archivo!
          </div>
        </div>
      </div>

      <!-- Compartidos -->
      <div v-if="seccion === 'compartidos'">
        <div class="vacio">No tienes archivos compartidos todavía.</div>
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
      espacioTotalBytes: 0
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
    espacioUsadoGB() {
      return (this.espacioUsadoBytes / 1073741824).toFixed(2);
    },
    espacioTotalGB() {
      return (this.espacioTotalBytes / 1073741824).toFixed(2);
    },
    tituloSeccion() {
      const titulos = {
        'mis-archivos': '📁 Mis archivos',
        'compartidos': '👥 Compartidos conmigo',
        'papelera': '🗑️ Papelera'
      };
      return titulos[this.seccion];
    }
  },
  mounted() {
    this.cargarNotificaciones();
    this.cargarEspacio();
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
      } catch (err) {
        console.error(err);
      }
    },
    async cargarEspacio() {
      try {
        const res = await fetch(`${API}/archivos/espacio`, { headers: this.headers() });
        const data = await res.json();
        this.espacioUsadoBytes = data.espacio_usado_bytes || 0;
        this.espacioTotalBytes = data.cuota_maxima_bytes || 0;
      } catch (err) {
        console.error(err);
      }
    },
    iconoArchivo(tipo) {
      const iconos = {
        'pdf': '📄', 'image': '🖼️', 'video': '🎬',
        'audio': '🎵', 'zip': '📦', 'doc': '📝'
      };
      return iconos[tipo] || '📁';
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
</style>