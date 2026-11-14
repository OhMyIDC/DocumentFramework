import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { docs } from './docs-setup'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(docs)

app.mount('#app')
