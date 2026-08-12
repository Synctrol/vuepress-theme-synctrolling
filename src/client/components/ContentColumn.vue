<template>
  <div class="syn-content-column" data-testid="content-column">
    <slot />
  </div>
</template>

<style scoped>
.syn-content-column {
  max-width: var(--syn-content-width);
  margin-inline: auto;
}
</style>
