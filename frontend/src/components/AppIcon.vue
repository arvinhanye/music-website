<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 20
  },
  filled: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <g
      :fill="filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.9"
    >
      <template v-if="name === 'library'">
        <rect x="3" y="4" width="7" height="7" rx="1.5" />
        <rect x="14" y="4" width="7" height="7" rx="1.5" />
        <rect x="3" y="15" width="7" height="5" rx="1.5" />
        <rect x="14" y="15" width="7" height="5" rx="1.5" />
      </template>
      <template v-else-if="name === 'plus'">
        <path d="M12 5v14M5 12h14" />
      </template>
      <template v-else-if="name === 'upload'">
        <path d="M12 16V4m0 0-4 4m4-4 4 4" />
        <path d="M5 14v5h14v-5" />
      </template>
      <template v-else-if="name === 'heart'">
        <path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z" />
      </template>
      <template v-else-if="name === 'music'">
        <path d="M9 18V5l10-2v13" />
        <ellipse cx="6.5" cy="18" rx="2.5" ry="2" />
        <ellipse cx="16.5" cy="16" rx="2.5" ry="2" />
      </template>
      <template v-else-if="name === 'user'">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
      </template>
      <template v-else-if="name === 'play'">
        <path d="m8 5 11 7-11 7Z" :fill="filled ? 'currentColor' : 'none'" />
      </template>
      <template v-else-if="name === 'pause'">
        <path d="M9 5v14M15 5v14" />
      </template>
      <template v-else-if="name === 'previous'">
        <path d="M6 5v14M18 6l-9 6 9 6Z" />
      </template>
      <template v-else-if="name === 'next'">
        <path d="M18 5v14M6 6l9 6-9 6Z" />
      </template>
      <template v-else-if="name === 'reset'">
        <path d="M4 7v5h5" />
        <path d="M5.5 16a8 8 0 1 0 .2-8.2L4 10" />
      </template>
      <template v-else-if="name === 'trash'">
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
      </template>
      <template v-else-if="name === 'image'">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m5 18 5-5 3 3 2-2 4 4" />
      </template>
      <template v-else-if="name === 'close'">
        <path d="m6 6 12 12M18 6 6 18" />
      </template>
      <template v-else-if="name === 'check'">
        <path d="m5 12 4 4L19 6" />
      </template>
      <template v-else-if="name === 'volume'">
        <path d="M5 10v4h3l4 4V6L8 10H5Z" />
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
      </template>
    </g>
  </svg>
</template>
