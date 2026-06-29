<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  code: {
    type: String,
    required: true
  }
})

const container = ref()
const error = ref('')

const source = computed(() => decodeURIComponent(props.code))

const renderDiagram = async () => {
  if (!container.value) return

  error.value = ''

  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default'
    })

    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    const { svg } = await mermaid.render(id, source.value)
    container.value.innerHTML = svg
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    container.value.innerHTML = ''
  }
}

onMounted(renderDiagram)

watch(source, () => nextTick(renderDiagram))
</script>

<template>
  <div class="mermaid-diagram">
    <div ref="container" class="mermaid-diagram__content" />
    <pre v-if="error" class="mermaid-diagram__error">{{ error }}</pre>
  </div>
</template>
