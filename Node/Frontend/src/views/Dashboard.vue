<template>
  <div class="contenido">
    <h2>¡Bienvenido, {{ username }}! 👋</h2>
    <p>Tu almacenamiento personal está listo.</p>
  </div>
</template>

<script>
export default {
  computed: {
    username() {
      return localStorage.getItem('username') || 'Usuario'
    }
  }
}
</script>