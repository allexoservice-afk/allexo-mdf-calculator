<script setup>
defineProps({
  /** @type {import('vue').PropType<string>} */
  name: { type: String, required: true },
})
</script>

<template>
  <span class="aci" aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient :id="`disc-${name}`" x1="10" y1="6" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop stop-color="#1a3f3e" />
          <stop offset="1" stop-color="#122a2e" />
        </linearGradient>
        <linearGradient :id="`gold-${name}`" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stop-color="#e8dcc0" />
          <stop offset="0.5" stop-color="#c5a059" />
          <stop offset="1" stop-color="#9a7a3e" />
        </linearGradient>
      </defs>

      <circle cx="20" cy="21" r="15" fill="rgba(18,42,46,0.16)" />
      <circle cx="20" cy="20" r="15" :fill="`url(#disc-${name})`" />
      <circle cx="20" cy="20" r="15" stroke="rgba(197,160,89,0.35)" stroke-width="1" />

      <!-- MDF reveal L -->
      <g v-if="name === 'reveal-mdf'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M13 12v16h5.5" />
        <path d="M18.5 18.5H27v9.5" />
      </g>

      <!-- PVC reveal -->
      <g v-else-if="name === 'reveal-pvc'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="12.5" y="12" width="5" height="16" rx="1" />
        <path d="M17.5 16.5H27v3.2H17.5" />
        <path d="M17.5 22H25v6" />
      </g>

      <!-- sill -->
      <g v-else-if="name === 'sill'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="13" y="13.5" width="14" height="8" rx="1.1" />
        <path d="M11 24.5h18" />
        <path d="M13 27h14" />
      </g>

      <!-- exterior -->
      <g v-else-if="name === 'reveal-out'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M12.5 26.5V16L20 12l7.5 4v10.5H12.5z" />
        <path d="M15.5 26.5v-8.2L20 15.8l4.5 2.5v8.2" />
      </g>

      <!-- roller box -->
      <g v-else-if="name === 'roller-box'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="11.5" y="12" width="17" height="6.5" rx="1.2" />
        <path d="M14 18.5v8.5M26 18.5v8.5" />
        <path d="M14 27h12" />
      </g>

      <!-- custom / ruler -->
      <g v-else-if="name === 'custom'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="12" y="18" width="16" height="5" rx="1" transform="rotate(-28 20 20.5)" />
        <path d="M14.8 22.2l1.1-1.1M16.8 20.3l1.1-1.1M18.8 18.4l1.1-1.1M20.8 16.5l1.1-1.1" />
      </g>

      <!-- door / window frame -->
      <g v-else-if="name === 'door'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="13.5" y="11.5" width="13" height="17" rx="1.1" />
        <path d="M20 11.5v17" />
        <path d="M13.5 20h13" />
      </g>

      <!-- roller -->
      <g v-else-if="name === 'roller'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="11.5" y="12" width="17" height="5.5" rx="1.1" />
        <path d="M13.5 17.5h13v9.5h-13z" />
        <path d="M15 20h10M15 23h10M15 26h10" />
      </g>

      <!-- repair tools -->
      <g v-else-if="name === 'repair'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M14 26.5l9-9 2 2-9 9-3 .8.8-3z" />
        <path d="M24.2 13.5a3.2 3.2 0 0 1 3.8 3.8" />
      </g>

      <!-- adjust -->
      <g v-else-if="name === 'adjust'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <circle cx="20" cy="20" r="4.2" />
        <path d="M20 12.2v2.2M20 25.6v2.2M12.2 20h2.2M25.6 20h2.2" />
        <path d="M14.5 14.5l1.6 1.6M23.9 23.9l1.6 1.6M25.5 14.5l-1.6 1.6M16.1 23.9l-1.6 1.6" />
      </g>

      <!-- sliding systems -->
      <g v-else-if="name === 'sliding'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="11.5" y="12" width="8.5" height="16" rx="1" />
        <rect x="20" y="12" width="8.5" height="16" rx="1" />
        <path d="M15.8 20h3.2M24.2 20H21" />
      </g>

      <!-- seal / caulk -->
      <g v-else-if="name === 'seal'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M14 12.5h7.5l2.5 4.5v8.5H14v-13z" />
        <path d="M16.2 12.5v13" />
        <path d="M23.5 18.5l4 7.5" />
      </g>

      <!-- quality layers -->
      <g v-else-if="name === 'quality'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M20 12.5l8 4-8 4-8-4 8-4z" />
        <path d="M12 19.2l8 4 8-4" />
        <path d="M12 23.5l8 4 8-4" />
      </g>

      <!-- person -->
      <g v-else-if="name === 'person'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <circle cx="20" cy="15" r="3.4" />
        <path d="M12.8 27.2c1.4-4.2 4-6.2 7.2-6.2s5.8 2 7.2 6.2" />
      </g>

      <!-- experience star -->
      <g v-else-if="name === 'experience'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M20 11.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L20 22.3l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L20 11.5z" />
      </g>

      <!-- neat / shield check -->
      <g v-else-if="name === 'neat'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M20 11.5l8 3.2v6.2c0 4.4-3.2 7.6-8 9.1-4.8-1.5-8-4.7-8-9.1v-6.2l8-3.2z" />
        <path d="M16.2 20.2l2.6 2.6 5.2-5.4" />
      </g>

      <!-- measure -->
      <g v-else-if="name === 'measure'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M12 24.5l12.5-12.5 3 3L15 27.5z" />
        <path d="M15.2 21.8l1.4-1.4M17.4 19.6l1.4-1.4M19.6 17.4l1.4-1.4" />
      </g>

      <!-- clean / sparkles -->
      <g v-else-if="name === 'clean'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" fill="none">
        <path d="M20 12.5v4M20 23.5v4M12.5 20h4M23.5 20h4" />
        <path d="M14.8 14.8l2.2 2.2M23 23l2.2 2.2M25.2 14.8l-2.2 2.2M17 23l-2.2 2.2" />
        <circle cx="20" cy="20" r="2.2" />
      </g>

      <!-- deadline calendar -->
      <g v-else-if="name === 'deadline'" :stroke="`url(#gold-${name})`" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="12.5" y="14" width="15" height="13" rx="1.4" />
        <path d="M12.5 18h15" />
        <path d="M16 11.8v3.2M24 11.8v3.2" />
        <path d="M16.5 22.5l2.2 2.2 4.4-4.6" />
      </g>

      <circle v-else cx="20" cy="20" r="4" :stroke="`url(#gold-${name})`" stroke-width="1.9" />
    </svg>
  </span>
</template>

<style scoped>
.aci {
  display: grid;
  place-items: center;
  width: 2.15rem;
  height: 2.15rem;
  flex: 0 0 2.15rem;
}

.aci svg {
  width: 2.15rem;
  height: 2.15rem;
  display: block;
  filter: drop-shadow(0 1px 3px rgba(18, 42, 46, 0.18));
}
</style>
