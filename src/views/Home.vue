<script setup>
import HelloWorld from '../components/HelloWorld.vue'
import TheWelcome from '../components/TheWelcome.vue'

</script>

<template>
  <header>
    <img alt="RikkaNas logo" class="logo" src="../assets/RkCloudLOGO.png" width="256" height="256" style="place-items: center" />

    <div class="wrapper">
      <HelloWorld msg="欢迎使用RkCloud！" />
    </div>
  </header>
  <main>
    <TheWelcome />
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
