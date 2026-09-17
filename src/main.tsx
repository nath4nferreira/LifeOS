import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fontes servidas pelo próprio app, não por CDN: funcionam offline no PWA,
// não fazem requisição a terceiros e não trazem salto de layout.
// Só o eixo de peso do Archivo (sem itálico nem largura) e só o subset
// latino do mono — o app é pt-BR e não precisa de grego nem cirílico.
import '@fontsource-variable/archivo/wght.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'

import './styles/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
