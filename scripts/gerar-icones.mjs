/**
 * Gera os PNGs do manifesto a partir da mesma arte do `public/favicon.svg`.
 *
 * Existe porque o manifesto precisa de PNG — o Chrome aceita SVG, mas o iOS
 * não, e o ícone da tela de início é justamente onde o iOS importa. Rasterizar
 * pediria `sharp` ou `canvas`, duas dependências nativas para gerar três
 * arquivos que quase nunca mudam; como a arte é só retângulo arredondado sobre
 * cor chapada, sai mais barato desenhar e codificar o PNG à mão.
 *
 * Rodar depois de mexer no favicon:  node scripts/gerar-icones.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PUBLICO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/** A arte, em coordenadas de 512 — a mesma ordem de pintura do SVG. */
const ARTE = [
  { x: 156, y: 104, l: 8, a: 304, r: 4, cor: [0x5b, 0x64, 0x72] },
  { x: 196, y: 104, l: 160, a: 104, r: 16, cor: [0xe8, 0xec, 0xf2] },
  { x: 196, y: 232, l: 160, a: 56, r: 16, cor: [0xe8, 0xec, 0xf2] },
  { x: 196, y: 312, l: 160, a: 96, r: 16, cor: [0xe8, 0xec, 0xf2] },
  { x: 140, y: 255, l: 232, a: 10, r: 5, cor: [0xe5, 0xa5, 0x4d] },
]
const FUNDO = [0x14, 0x18, 0x1f]

/** Distância do ponto ao retângulo arredondado: <= 0 é dentro. */
function dentro(px, py, { x, y, l, a, r }) {
  const dx = Math.max(x + r - px, 0, px - (x + l - r))
  const dy = Math.max(y + r - py, 0, py - (y + a - r))
  return Math.hypot(dx, dy) <= r
}

/**
 * `mascara` produz a variante maskable: sem cantos arredondados (a plataforma
 * recorta a forma que quiser) e com a arte encolhida para caber na zona segura
 * de 80% que o Android pode cortar.
 */
function desenhar(lado, mascara) {
  const AMOSTRAS = 3 // suaviza os cantos; sem isso eles saem serrilhados
  const escala = mascara ? 0.78 : 1
  const cantoDoFundo = { x: 0, y: 0, l: 512, a: 512, r: mascara ? 0 : 112 }
  const pixels = Buffer.alloc(lado * lado * 4)

  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      const soma = [0, 0, 0, 0]
      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const ux = ((px + (sx + 0.5) / AMOSTRAS) / lado) * 512
          const uy = ((py + (sy + 0.5) / AMOSTRAS) / lado) * 512
          // A escala da máscara é em torno do centro, como no SVG.
          const ax = (ux - 256) / escala + 256
          const ay = (uy - 256) / escala + 256

          let cor = null
          // De cima para baixo: a última forma pintada é a que aparece.
          for (let i = ARTE.length - 1; i >= 0 && !cor; i--) {
            if (dentro(ax, ay, ARTE[i])) cor = ARTE[i].cor
          }
          if (!cor && dentro(ux, uy, cantoDoFundo)) cor = FUNDO

          if (cor) {
            soma[0] += cor[0]
            soma[1] += cor[1]
            soma[2] += cor[2]
            soma[3] += 255
          }
        }
      }
      const total = AMOSTRAS * AMOSTRAS
      const base = (py * lado + px) * 4
      // Pré-multiplicar e dividir pela cobertura mantém a cor certa na borda:
      // dividir por `total` escureceria os pixels só parcialmente cobertos.
      const cobertos = soma[3] / 255
      for (let c = 0; c < 3; c++) {
        pixels[base + c] = cobertos > 0 ? Math.round(soma[c] / cobertos) : 0
      }
      pixels[base + 3] = Math.round(soma[3] / total)
    }
  }
  return pixels
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pedaco(tipo, dados) {
  const tamanho = Buffer.alloc(4)
  tamanho.writeUInt32BE(dados.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([tamanho, corpo, crc])
}

function png(lado, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(lado, 0)
  ihdr.writeUInt32BE(lado, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  // Cada linha do PNG começa com o byte do filtro; 0 = sem filtro.
  const linhas = []
  for (let y = 0; y < lado; y++) {
    linhas.push(Buffer.from([0]), pixels.subarray(y * lado * 4, (y + 1) * lado * 4))
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(Buffer.concat(linhas), { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ])
}

for (const [arquivo, lado, mascara] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-mask.png', 512, true],
]) {
  const conteudo = png(lado, desenhar(lado, mascara))
  writeFileSync(join(PUBLICO, arquivo), conteudo)
  console.log(`${arquivo}  ${lado}×${lado}  ${(conteudo.length / 1024).toFixed(1)} kB`)
}
