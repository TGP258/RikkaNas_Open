
<script setup>

import HelloWorld from '/src/components/HelloWorld.vue'
// import TheWelcome from '/src/components/TheWelcome.vue'
</script>

<template>
  <router-view></router-view>
  <header>
  </header>
  <main>
<!--    <TheWelcome />-->
  </main>
</template>

<style scoped>
header {
  align-items: center;
  justify-items: center;
  line-height: 1.5;
}

.logo {
  align-items: center;
  justify-items: center;
  display: block;
  margin: 0 auto 2rem;

}

@media (min-width:8192px) {
  header {
    display: flex;
    align-items: center;
    justify-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    align-items: center;
    justify-items: center;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
