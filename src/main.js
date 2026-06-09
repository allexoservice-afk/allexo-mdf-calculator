import { createApp } from 'vue'
import './assets/main.css'
import './assets/logo-theme.css'
import App from './App.vue'
import { initMetaPixel } from './services/metaPixel.js'

createApp(App).mount('#app')
initMetaPixel()
