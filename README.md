# LifeOS

**Sua agenda lida, não só listada.**

O LifeOS não é uma agenda. É uma camada de contexto sobre a rotina.

Você já tem calendário, app de tarefas e app de clima. O que você não tem é
alguém cruzando essas três coisas. O calendário sabe que tem aula às 19:30. O
app de clima sabe que chove às 19:00. Nenhum dos dois diz que você vai pegar
chuva no caminho.

O fluxo é **dados → contexto → insight → decisão do usuário**. O LifeOS nunca
decide: ele mostra o contexto, propõe uma ação e deixa você escolher. Toda
sugestão pode ser recusada, e recusar é tão visível quanto aceitar.

**Público:** 18 a 30 anos, estudante ou início de carreira, rotina dividida
entre faculdade, trabalho, exercício e deslocamento. Brasil, pt-BR.

Documentos irmãos: [REQUISITOS.md](REQUISITOS.md) (o que o produto faz e não
faz), [HEURISTICAS.md](HEURISTICAS.md) (onde cada heurística de Nielsen mora na
interface) e [ESPECIFICACAO.md](ESPECIFICACAO.md) (o briefing original).

---

## O que ele faz

- **Abre com um veredito, não com uma saudação.** "Seu dia está apertado." em
  ~48px é a primeira coisa na tela. "Good morning 👋" carrega zero informação.
- **Sete regras de leitura do dia** — sobreposição, margem vs. deslocamento, o
  que levar ao sair de casa, chuva no trânsito, carga do dia, janela livre e a
  transição entre dois dias. Cada uma está descrita em
  [REQUISITOS.md](REQUISITOS.md).
- **Todo insight mostra de onde veio.** O campo `base` carrega os números que
  geraram a conclusão. O produto não deve parecer mágica; deve ser auditável.
- **A trilha do dia desenhada em escala.** `0,5px` por minuto: um bloco de 3h é
  visivelmente maior que um de 30min, e o intervalo apertado aparece
  fisicamente estreito. A pressão do dia fica legível antes da leitura.
- **Clima real** da OpenWeather, atrás de uma rota serverless que esconde a
  chave. Se a API cair, o app continua: as regras de clima se calam e as outras
  cinco seguem funcionando.
- **PWA instalável e offline.** Todo o app, incluindo as fontes, entra no
  precache do service worker.
- **Dark mode** com escolha manual de três estados: sistema, claro, escuro.

---

## Como rodar

```bash
npm install
npm run dev          # http://localhost:5173
```

Isso já dá o app inteiro **menos o clima real**: `vite dev` não executa a pasta
`api/`, então a faixa de status mostra "Clima indisponível" e as regras 3 e 4
não aparecem. Para demonstrar essas duas regras sem chave, use o botão
**"Usar previsão de exemplo"** na faixa de status — ele rotula o dado como
exemplo na própria tela, porque dado fabricado nunca deve se disfarçar de
medido.

### Com clima real

A rota serverless só roda sob a CLI da Vercel:

```bash
cp .env.example .env     # preencha OPENWEATHER_KEY
npx vercel dev
```

A chave **não** tem o prefixo `VITE_`, de propósito: sem ele o Vite não a
injeta no bundle. Quem fala com a OpenWeather é o servidor; o navegador só
conhece `/api/clima`.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run build` | `tsc -b` + build de produção (inclui o service worker) |
| `npm run preview` | serve o `dist/` em :4173 — é aqui que se testa o PWA |
| `npm test` | Vitest, uma passada |
| `npm run test:watch` | Vitest em modo observador |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `node scripts/gerar-icones.mjs` | regera os três PNGs do manifesto |

Os ícones são gerados por um script sem dependências (encoder PNG escrito à
mão) a partir da mesma arte do `public/favicon.svg`. Só é preciso rodá-lo se a
arte mudar — os PNGs estão versionados.

---

## Estrutura

```
api/
└── clima.ts              # rota serverless da Vercel; esconde a chave
scripts/
└── gerar-icones.mjs      # gera icon-192/512/mask.png sem dependências
src/
├── core/                 # LÓGICA PURA — sem React, sem DOM, sem I/O
│   ├── insights.ts       # as 7 regras, o veredito, a carga por área
│   ├── seletor.ts        # eventosDoDia(): achata a recorrência
│   ├── trilha.ts         # posição do marcador de "agora"
│   └── validacao.ts      # rascunho → evento, erros, sobreposições
├── utils/
│   └── tempo.ts          # conversão e formatação de horários e datas
├── types/index.ts
├── services/             # tudo que fala com o mundo
│   ├── repositorio.ts    # RepositorioEventos + implementação localStorage
│   ├── clima.ts          # cliente de /api/clima
│   ├── openweather.ts    # normalização da resposta bruta
│   ├── demonstracao.ts   # o dia e a previsão do roteiro de demonstração
│   ├── relogio.ts        # hojeISO(), agoraEmMinutos()
│   └── identidade.ts     # novoId()
├── hooks/                # a ponte entre services e componentes
├── components/           # um .tsx e um .css por componente
└── styles/tokens.css     # cores, tipografia, raio
```

### A regra de pureza

`src/core/` e `src/utils/` **não podem** importar React, nem tocar em DOM,
`window`, `localStorage` ou `fetch`. São funções puras sobre dados.

Isso não é purismo: existe a intenção de portar o produto para Flutter, e essas
duas pastas são a parte que sobrevive à troca de interface. Os testes delas —
`insights.test.ts`, `seletor.test.ts`, `trilha.test.ts`, `validacao.test.ts`,
`tempo.test.ts` — são a **especificação** do port. Um LifeOS em Dart deve
passar nos mesmos casos.

O efeito colateral prático é que o motor é testável sem montar componente, e
regra nova entra em `core/insights.ts` sem que nenhum `.tsx` mude.

Por isso também `agoraEmMinutos()` e `hojeISO()` vivem em `services/` e não em
`utils/`: ler o relógio é I/O. O motor recebe o horário como argumento.

### Onde a recorrência mora

Em um lugar só: `core/seletor.ts`. `eventosDoDia()` recebe a lista com
`EventoFixo` dentro e devolve uma lista plana de ocorrências daquele dia, já
ordenada. Daí para frente **ninguém sabe que recorrência existe** — nem o motor
de insights, nem a trilha, nem os componentes.

"Hoje a aula foi cancelada" também se resolve aí: cancelar uma ocorrência é
adicionar a data em `excecoes`, não editar uma instância de recorrência.

---

## Stack

React 19 · TypeScript · Vite 8 · Vitest · vite-plugin-pwa · CSS puro.

**Sem Tailwind e sem biblioteca de componentes**, por exigência do projeto: o
CSS escrito à mão é o que demonstra breakpoints e grid fluido. Cada componente
tem seu `.css` ao lado, e as cores vêm todas de `styles/tokens.css`.

Os tokens de cor usam `light-dark()`, então cada cor é declarada **uma vez** com
os dois valores lado a lado, em vez de uma paleta clara e uma cópia escura que
podem divergir em silêncio.

---

## Dados

Tudo mora no `localStorage`, atrás da interface `RepositorioEventos`, que já é
assíncrona mesmo sendo local. Trocar por Supabase depois é escrever uma segunda
implementação da mesma interface — nenhum componente muda.

Não há login: o A3 não premia autenticação, e o app funciona inteiro sem ela.

Se o `localStorage` não estiver disponível (navegação privada), o app cai para
um armazenamento em memória: funciona na sessão e esquece ao fechar, em vez de
quebrar.

**Dados de demonstração:** Ajustes → "Recarregar dia de demonstração" instala o
dia do roteiro (trabalho, almoço, trabalho, academia, faculdade). Ele produz
quatro insights e o veredito "Seu dia está apertado.", sem nenhum `critico` —
o crítico é criado ao vivo adicionando um evento entre 18:00 e 19:00, o que
mostra o motor reagindo.

---

## Acessibilidade

Feita durante, não no fim. O que está garantido:

- HTML semântico com `header`/`main`/`nav`/`aside`/`article` e hierarquia de
  headings sem pular nível
- link "Pular para o conteúdo" como primeiro elemento focável
- foco visível em tudo, e foco gerenciado nas trocas de tela que destroem o
  botão que as disparou
- alvos de toque de no mínimo 44px
- `label` em todo campo, erros com `aria-invalid` + `aria-describedby`, e um
  resumo em `role="alert"` para quem tentou salvar com o foco no botão
- `aria-current="page"` na aba ativa, marcada por fundo **e** peso, não só cor
- cor nunca sozinha: todo insight tem etiqueta textual
- `prefers-reduced-motion` desliga transição e animação
- `env(safe-area-inset-bottom)` na navegação inferior
- contraste auditado em todas as abas, nos dois temas, em 320/390/1280 — o piso
  de 4,5:1 (3:1 para texto grande) é respeitado em todos os casos
- teste de espaçamento de texto da WCAG 1.4.12 sem perda de conteúdo

---

## Responsividade

Mobile first, desenvolvido com o DevTools travado em 320px.

| Faixa | O que muda |
|---|---|
| 320–480px | base: navegação inferior, uma coluna |
| ≥ 481px | mais respiro, formulário em três colunas |
| ≥ 1025px | grid `208px \| 1fr \| 316px`: navegação lateral, trilha ao centro, painel de contexto à direita; a navegação inferior some |

O painel de contexto do desktop é montagem condicional, não `display: none`:
abaixo de 1025px ele não existe na página.
