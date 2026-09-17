/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // `autoUpdate` porque não há nada a preservar entre versões: os eventos
      // vivem no localStorage, não na memória da aba. Um aviso de "nova versão
      // disponível" seria uma decisão a mais para o usuário tomar sem ter
      // como avaliá-la.
      registerType: 'autoUpdate',
      manifest: {
        name: 'LifeOS',
        short_name: 'LifeOS',
        description: 'Sua agenda lida, não só listada.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#eef0f4',
        theme_color: '#14181f',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          // O Android recorta o ícone na forma do sistema. Sem uma variante
          // `maskable` ele desenha o quadrado inteiro dentro de um círculo
          // branco, e o resultado é um selo em vez de um ícone.
          {
            src: '/icon-mask.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // As fontes entram no precache porque fora delas o padrão do Workbox
        // não pega `woff2`, e o app offline caía para a fonte do sistema — a
        // trilha em escala depende dos números monoespaçados para as horas
        // ficarem alinhadas em coluna. Só `woff2`: o `woff` é reserva para
        // navegador que nenhum destes três temas alcança.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // O clima é dado medido e envelhece: servir de cache seria mostrar a
        // chuva de anteontem como se fosse a de hoje. Fora do ar, `usePrevisao`
        // já degrada para "clima indisponível" e as regras 3 e 4 se calam.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      // A rota serverless não existe sob `vite dev`, então o SW em
      // desenvolvimento só atrapalharia o teste do caminho de erro do clima.
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
  },
})
