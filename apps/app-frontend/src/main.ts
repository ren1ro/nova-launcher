import { createApp } from 'vue'

import App from './App.vue'
import './styles.css'
import { initThemes, startAutoThemeWatcher } from './themes/engine'

initThemes()
startAutoThemeWatcher()
createApp(App).mount('#app')
