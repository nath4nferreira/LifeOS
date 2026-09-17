# LifeOS — Especificação para implementação

> Este documento é o briefing completo. Leia tudo antes de escrever código.
> **Não implemente o projeto inteiro de uma vez.** Siga a ordem da seção 14,
> pare ao fim de cada etapa e valide antes de seguir.

---

## 1. Contexto

Projeto A3 da disciplina **Usabilidade, Desenvolvimento Web, Mobile e Jogos**
(Sistemas de Informação). O que é avaliado:

| Critério | Exigência |
|---|---|
| Heurísticas de Nielsen | no mínimo 5 das 10, demonstráveis na interface |
| Design responsivo e acessível | WCAG 2.1 + layout responsivo real |
| Navegação mobile | funcional e fluida, adaptada ao toque |
| API pública | consumo de API real para dados dinâmicos |
| Código de qualidade | limpo, comentado, versionado com Git |
| Entrega | deploy na Vercel, repositório documentado, vídeo de até 10 min |

Entregas parciais: (1) problema e público, (2) pesquisa e requisitos,
(3) wireframes e protótipos, (4) protótipo funcional e testes de usabilidade.

---

## 2. O produto

**LifeOS não é uma agenda. É uma camada de contexto sobre a rotina.**

O usuário já tem calendário, app de tarefas e app de clima. O que ele não tem
é alguém cruzando essas informações. O calendário sabe que tem aula às 19:30.
O app de clima sabe que chove às 19:00. Nenhum dos dois diz que ele vai pegar
chuva no caminho.

O fluxo do produto é: **dados → contexto → insight → decisão do usuário.**

O LifeOS nunca decide. Ele mostra o contexto, propõe uma ação e deixa o
usuário escolher. Toda sugestão precisa poder ser recusada, e recusar precisa
ser tão visível quanto aceitar.

**Público:** 18 a 30 anos, estudante ou início de carreira, rotina dividida
entre faculdade, trabalho, exercício e deslocamento. Brasil, português do
Brasil (`lang="pt-BR"`).

---

## 3. Stack e restrições

- **React + TypeScript + Vite**
- CSS puro com CSS Variables. **Não use Tailwind nem biblioteca de componentes.**
  O CSS escrito à mão é o que demonstra breakpoints e grid fluido, que é o
  conteúdo avaliado.
- Deploy na **Vercel**
- PWA (manifest + service worker via `vite-plugin-pwa`)
- Git desde o primeiro commit, mensagens descritivas

**Restrição de portabilidade:** existe intenção futura de portar para Flutter.
Por isso `src/core/` e `src/utils/` não podem importar React, nem tocar em DOM,
`window`, `localStorage` ou `fetch`. São funções puras sobre dados. Os testes
dessa pasta servem de especificação para um port futuro em Dart.

---

## 4. Estrutura de pastas

```
src/
├── core/                 # LÓGICA PURA — sem React, sem DOM, sem I/O
│   ├── insights.ts       # motor de insights
│   ├── insights.test.ts  # os testes são a especificação
│   ├── seletor.ts        # eventosDoDia()
│   └── seletor.test.ts
├── utils/
│   └── tempo.ts          # conversão e formatação de horários
├── types/
│   └── index.ts
├── services/
│   ├── clima.ts          # cliente da API de clima
│   └── repositorio.ts    # interface + implementação local
├── components/
├── pages/
├── hooks/
└── styles/
    └── tokens.css
api/
└── clima.ts              # rota serverless da Vercel (esconde a chave)
```

---

## 5. Modelo de dados

```ts
export type Categoria =
  | "trabalho" | "estudos" | "saude"
  | "pessoal" | "casa" | "financas";

interface EventoBase {
  id: string;
  nome: string;
  categoria: Categoria;
  inicio: string;        // "19:30"
  fim: string;           // "22:30"
  deslocamento: number;  // minutos de ida, 0 = remoto ou em casa
}

export interface EventoPontual extends EventoBase {
  tipo: "pontual";
  data: string;          // "2026-09-17" (ISO, só a data)
}

export interface EventoFixo extends EventoBase {
  tipo: "fixo";
  diasDaSemana: number[]; // 0=domingo … 6=sábado
  validoDe: string;       // início do semestre
  validoAte: string;      // fim do semestre
  excecoes: string[];     // datas em que não acontece
}

export type Evento = EventoPontual | EventoFixo;
```

**Por que `validoDe`/`validoAte`:** impede que a aula apareça nas férias.

**Por que `excecoes`:** resolve "hoje a aula foi cancelada" sem precisar de um
sistema de edição de instância de recorrência, que é o buraco clássico desse
modelo. Cancelar uma ocorrência = adicionar a data em `excecoes`.

---

## 6. O seletor — onde a recorrência mora

```ts
/** Devolve os eventos que efetivamente acontecem na data informada,
    já achatados: o consumidor não sabe que recorrência existe. */
export function eventosDoDia(eventos: Evento[], data: string): EventoBase[];
```

Regra para `EventoFixo`: entra se `data` está entre `validoDe` e `validoAte`,
**e** o dia da semana está em `diasDaSemana`, **e** a data não está em
`excecoes`.

O resultado sai ordenado por horário de início.

**Isto é a costura do projeto.** Recorrência é problema de seleção, não de
motor. `gerarInsights` recebe lista plana e nunca sabe que `EventoFixo` existe.
Não vaze o tipo recorrente para dentro de `core/insights.ts`.

---

## 7. Motor de insights — o coração do produto

```ts
export function gerarInsights(
  eventos: EventoBase[],
  previsao: Previsao | null
): Insight[];
```

Função **pura**. Não busca dados, não renderiza, não guarda estado. Isso
permite testar sem montar componente, adicionar regra sem tocar na interface, e
explicar a lógica em trinta segundos no vídeo.

```ts
export interface Insight {
  id: string;
  tipo: "conflito" | "margem" | "preparo" | "clima" | "carga" | "janela" | "sono";
  nivel: "critico" | "atencao" | "info" | "bom";
  etiqueta: string;       // rótulo curto no cartão
  titulo: string;
  corpo: string;
  sugestao?: string;
  itens?: { nome: string; motivo: string }[];  // usado por "preparo"
  base: string[];         // os números que geraram o insight
  eventos: string[];      // ids relacionados
}
```

**O campo `base` é obrigatório e deliberado.** O LifeOS não deve parecer
mágica, deve ser auditável. Todo insight mostra de onde veio.

### Constantes

```ts
const MARGEM_CONFORTAVEL   = 10;      // min de sobra considerados tranquilos
const JANELA_LIVRE_MINIMA  = 90;      // min a partir de que vale sugerir uso
const CARGA_ALTA           = 9 * 60;  // min comprometidos = dia cheio
const CHUVA_PROVAVEL       = 0.5;     // probabilidade que aciona aviso
const FRIO                 = 17;      // °C para casaco leve
const FRIO_INTENSO         = 12;      // °C para casaco
const QUEDA_TERMICA        = 7;       // °C de queda que justifica avisar
const SONO_MINIMO          = 7 * 60;  // min entre chegar em casa e o 1º evento
```

### Regra 1 — sobreposição (`critico`)

Dois eventos consecutivos com vão negativo. Informa por quanto tempo se
sobrepõem e que um dos dois precisa mudar.

### Regra 2 — margem vs. deslocamento

Para cada par consecutivo, `margem = vão - deslocamento do segundo`.
Ignora se o segundo evento tem deslocamento 0.

- `margem < 0` → **`critico`**: não dá para chegar no horário. Informa o atraso
  estimado e sugere o horário real de saída.
- `margem < MARGEM_CONFORTAVEL` → **`atencao`**: informa a sobra exata e que
  qualquer atraso derruba o horário.

### Regra 3 — o que levar ao sair de casa (`info`)

Primeiro calcule a **janela fora de casa**: da saída do primeiro evento com
deslocamento > 0 (menos o deslocamento) até o fim do último evento com
deslocamento > 0 (mais o deslocamento). Eventos sem deslocamento são tratados
como remotos ou em casa. A volta assume o mesmo tempo da ida — é estimativa, e
precisa aparecer declarada no texto do cartão.

Avalie a previsão em **toda** essa janela, não no instante da saída. É por isso
que "saio às 17h e chove às 18h" funciona: o usuário está na rua às 18h.

Itens:
- chuva máxima na janela ≥ `CHUVA_PROVAVEL` → **guarda-chuva**, com motivo
  `"82% de chuva por volta das 19:00"`
- temperatura mínima na janela ≤ `FRIO` → **casaco leve**
  (≤ `FRIO_INTENSO` → **casaco**)
- se a queda entre a saída e o mínimo ≥ `QUEDA_TERMICA`, o motivo passa a ser
  `"sai com 23° e volta com 15°"` — mesmo que esteja quente agora

Devolva **um único insight** com a lista de itens. Três cartões dizendo "leve
casaco" seriam ruído. Título dinâmico: `"Leve guarda-chuva e casaco leve"`.

Se nenhum item for acionado, não gere insight.

### Regra 4 — chuva atrapalhando o deslocamento (`info`)

Esta regra é sobre **tempo**, não sobre objetos: chuva no trânsito pede margem
extra. Sugestão: 10 minutos a mais. **Não mencione guarda-chuva aqui** — isso é
responsabilidade da Regra 3.

### Regra 5 — carga do dia (`atencao`)

Total comprometido ≥ `CARGA_ALTA`.

### Regra 6 — janela livre (`bom`)

Vão descontado o deslocamento ≥ `JANELA_LIVRE_MINIMA`.

### Regra 7 — transição entre dias (`atencao`)

Função separada, porque cruza dois dias:

```ts
export function insightsDeTransicao(
  hoje: EventoBase[],
  amanha: EventoBase[]
): Insight[];
```

Se a chegada em casa hoje (fim do último evento + deslocamento) até o início do
primeiro evento de amanhã (menos o deslocamento) for menor que `SONO_MINIMO`,
gere um insight: *"Você chega em casa às 23:00 e amanhã tem aula às 08:00.
Sobram 7 horas entre uma coisa e outra."*

Esta regra só existe porque o app cobre dois dias por padrão. É um dos insights
mais característicos do produto.

### Ordenação

Por nível: `critico` → `atencao` → `info` → `bom`. Use sort estável para
preservar a ordem de inserção dentro do mesmo nível.

### Veredito do dia

```ts
export function vereditoDoDia(insights: Insight[], comprometido: number): string;
```

- algum `critico` → `"Seu dia não fecha."`
- algum de tipo `margem` → `"Seu dia está apertado."`
- comprometido ≥ `CARGA_ALTA` → `"Seu dia está cheio."`
- nada agendado → `"Seu dia está vazio."`
- resto → `"Seu dia está tranquilo."`

---

## 8. Testes do motor (obrigatórios)

Vitest, em `src/core/insights.test.ts`. Cubra no mínimo:

1. sobreposição detectada
2. margem negativa → crítico
3. margem de 5 min → atenção
4. margem de 30 min sem deslocamento → nenhum insight
5. chuva na janela fora de casa → guarda-chuva
6. tarde quente e seca → **nenhum item** (proteja contra falso positivo)
7. dia inteiro em casa → nenhum item de preparo
8. queda térmica de 8° partindo de 23° → casaco leve mesmo com calor
9. `eventosDoDia` respeita `excecoes`, `validoDe`/`validoAte` e dia da semana
10. janela de sono curta entre dois dias

Estes testes são a especificação do motor. Um port futuro para Dart deve passar
nos mesmos casos.

---

## 9. Serviço de clima

**Nunca chame a OpenWeather direto do navegador.** A chave ficaria exposta no
bundle. Crie a rota serverless:

```ts
// api/clima.ts
export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const r = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?lat=${lat}&lon=${lon}&units=metric&lang=pt_br` +
    `&appid=${process.env.OPENWEATHER_KEY}`
  );
  res.status(200).json(normalizar(await r.json()));
}
```

Formato normalizado:

```ts
interface Previsao {
  local: string;
  tempAtual: number;
  condicaoAtual: string;
  horas: { hora: string; temp: number; chuva: number }[]; // chuva de 0 a 1
}
```

**Duas limitações a respeitar:**

1. O plano gratuito devolve blocos de **3 horas**, não hora a hora. Ao cruzar
   com a janela de deslocamento, trate cada faixa como cobrindo 3h. Não afirme
   horários que a API não afirmou.
2. A previsão cobre cerca de **5 dias**. Se o usuário navegar além disso,
   `previsao` é `null` e o app **continua funcionando**: conflito, margem,
   carga e janela não dependem de clima. Apenas as regras 3 e 4 desaparecem.

Degradação graciosa é requisito, não detalhe: se a API falhar, mostre que o
contexto de clima está indisponível e siga analisando o resto.

---

## 10. Persistência

Autenticação é **opcional** no MVP e nenhum critério do A3 a premia. Portanto:

```ts
export interface RepositorioEventos {
  listar(): Promise<Evento[]>;
  criar(e: Evento): Promise<Evento>;
  atualizar(e: Evento): Promise<Evento>;
  remover(id: string): Promise<void>;
}
```

**Implemente `RepositorioLocal` primeiro** (localStorage), já com a interface
assíncrona. Depois `RepositorioSupabase` entra sem tocar em nenhum componente.

Quando chegar a hora do Supabase: **não escreva autenticação à mão.** Use o
auth gerenciado e ative Row Level Security, para que cada usuário só leia as
próprias linhas. É o que garante privacidade de verdade.

Toda a interface precisa de estado de carregamento e de erro de rede reais —
isso alimenta a heurística 1 e as mensagens de erro da WCAG.

---

## 11. Design

O produto deve parecer aplicação comercial, não trabalho acadêmico. **Evite**
excesso de tabelas, formulários enormes, aparência de sistema administrativo,
cards idênticos com a mesma sombra cinza.

### Direção

O tema do produto é **margem**: 5 minutos de sobra, 30 minutos entre coisas,
uma janela de 1h30. Esse é o vocabulário de painel de embarque e tabela de
horário, não de app de tarefas. Cinza-azulado frio, linhas de 1px em vez de
sombra, raio pequeno.

**Gaste ousadia em um lugar só:** a trilha do dia desenhada em escala.

### Tokens

```css
:root {
  --fundo: #eef0f4;      --superficie: #ffffff;   --superficie-2: #e6e9ef;
  --tinta: #14181f;      --apagado: #626b7a;      --linha: #d3d8e0;

  --critico: #a4232b;    --critico-fundo: #fbeaeb;
  --atencao: #8a4d00;    --atencao-fundo: #fbf0e2;
  --info:    #2a5f9e;    --info-fundo:    #e8eff8;
  --bom:     #1a6b50;    --bom-fundo:     #e5f2ed;

  --sans: 'Archivo', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
  --raio: 6px;
}

[data-theme="escuro"] {
  --fundo: #10141a;      --superficie: #171c24;   --superficie-2: #1f252f;
  --tinta: #e8ecf2;      --apagado: #8b95a5;      --linha: #283040;
  --critico: #ff8a8a;    --critico-fundo: #2a1719;
  --atencao: #e5a54d;    --atencao-fundo: #291f12;
  --info:    #7fb3e8;    --info-fundo:    #141f2c;
  --bom:     #6ecfa8;    --bom-fundo:     #12241d;
}
```

**Cor só aparece quando um dado a justifica** (nível do insight, categoria do
evento). Nunca como decoração. Archivo para texto, IBM Plex Mono **apenas** em
relógios e números — é vocabulário de tabela de horário, não enfeite.

### Dark mode

Troca por atributo `data-theme` no elemento raiz. A media query
`prefers-color-scheme` define só o **valor inicial**; o usuário pode trocar
manualmente nos ajustes. Não use só a media query, senão o controle manual
não funciona.

### A tela principal abre com um veredito, não com uma saudação

```
┌───────────────────────────┐
│ qui 17 set     22° nublado│  faixa fina, mono
├───────────────────────────┤
│ Seu dia está              │  ← ELEMENTO PRINCIPAL
│ apertado.                 │     ~48px, peso 800, tracking -0.03em
│ 11h comprometidas ·       │
│ 2h30 em aberto · 2 pontos │
├───────────────────────────┤
│ O que merece atenção      │  no máximo 2 cartões aqui
│ ┃ apertado                │
│ ┃ Só 5min de sobra…       │
├───────────────────────────┤
│ Seu dia em escala         │
│ 09:00 ┃ Trabalho      3h  │  altura ∝ duração
│       ┆ 1h30 livres       │  vão pontilhado, em escala
│ 14:30 ┃ Trabalho      3h  │
│ 18:00 ┃ Academia      1h  │
│    ┆  ┆ 30min, 25 de ida  │  ← visivelmente estreito
│ 19:30 ┃ Faculdade     3h  │
├───────────────────────────┤
│  Dia  Adicionar  Alertas ⚙│
└───────────────────────────┘
```

"Good morning 👋" carrega zero informação e é o padrão de todo app de
produtividade. O veredito é o produto falando em uma linha.

### Trilha em escala

`PX_POR_MINUTO = 0.5`. Blocos de evento com altura mínima de 52px; vãos com
altura proporcional, entre 26px e 96px. Um bloco de 3h fica visivelmente maior
que um de 30min, e o intervalo apertado aparece **fisicamente estreito**, com a
borda pontilhada na cor de atenção. A pressão do dia fica legível antes da
leitura.

### Layout responsivo — Mobile First

CSS base é mobile (320–480px). Expanda com `min-width`:

- **481px** (tablet): mais respiro, formulário em 3 colunas
- **1025px** (desktop): grid de 3 colunas
  `208px | minmax(0, 1fr) | 316px` — navegação lateral, trilha ao centro,
  painel de contexto à direita (clima por faixa horária + horas por área). A
  navegação inferior desaparece. O conteúdo **se reorganiza**, não apenas
  aumenta.

Desenvolva com o DevTools travado em **320px**, não na janela maximizada.

---

## 12. Acessibilidade — WCAG 2.1

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- HTML semântico: `header`, `main`, `nav`, `aside`, `article`, hierarquia de
  headings sem pular nível
- Foco sempre visível, com contraste próprio (`:focus-visible`)
- Alvos de toque de no mínimo 44px
- `label` associado a todo campo; erros com `aria-invalid` e `aria-describedby`
- Confirmações em região `aria-live="polite"`
- `aria-current="page"` no item de navegação ativo
- **Cor nunca sozinha**: todo insight tem etiqueta textual além da cor
- `@media (prefers-reduced-motion: reduce)` desliga transição e animação
- `env(safe-area-inset-bottom)` na navegação inferior, para o indicador de
  gestos do iPhone
- Rode Lighthouse e axe DevTools; guarde os resultados para o relatório

---

## 13. Heurísticas de Nielsen — onde cada uma aparece

Implemente de forma que este mapa seja verdadeiro, e gere um `HEURISTICAS.md`
apontando tela e componente de cada uma.

| # | Heurística | Onde |
|---|---|---|
| 1 | Visibilidade do estado | carregamento do clima, salvamento, `aria-live` |
| 2 | Correspondência com o mundo real | horário, categoria e clima em linguagem do usuário |
| 3 | Controle e liberdade | "Manter como está" em todo insight; dispensar é reversível |
| 5 | Prevenção de erros | validação antes de salvar; término depois do início; aviso de sobreposição |
| 6 | Reconhecimento em vez de memorização | campo `base` mostra os números do insight |
| 8 | Estética e minimalismo | no máximo 2 insights no painel; resto atrás de "ver outros" |

Seis heurísticas, uma acima do mínimo, para dar folga se o avaliador discordar
de alguma.

---

## 14. Ordem de implementação

Pare e valide ao fim de cada etapa. **Não pule para a seguinte sem confirmar.**

1. Projeto Vite + TS, ESLint, Prettier, Vitest, primeiro commit
2. `utils/tempo.ts` + `types/index.ts` + testes
3. `core/insights.ts` com as 7 regras + **todos os testes da seção 8 passando**
4. `core/seletor.ts` + testes
5. `styles/tokens.css` com os tokens e o tema
6. Layout mobile: faixa de status, veredito, navegação inferior
7. `TrilhaDoDia` em escala
8. `CartaoInsight`, incluindo a lista de itens da Regra 3
9. `RepositorioLocal` + hook de eventos
10. Formulário de evento pontual, com validação
11. Evento fixo (dias da semana, validade, exceções)
12. Editar e excluir evento
13. Navegação por data; abas de hoje e amanhã como padrão
14. Regra 7 (transição entre dias) ligada na interface
15. Serviço de clima com a rota serverless + degradação graciosa
16. Marcador de "agora" na trilha
17. Painel de contexto do desktop e grid de 3 colunas
18. Dark mode com controle manual
19. Passagem de acessibilidade: Lighthouse, axe, navegação só por teclado
20. PWA: manifest, ícones, service worker
21. `README.md`, `HEURISTICAS.md`, `REQUISITOS.md`
22. Deploy na Vercel

---

## 15. Dados de demonstração

Necessários por motivo prático: se o app abrir vazio no vídeo, nenhum insight
aparece — e o insight é o produto. Deve haver um botão nos ajustes para
recarregar este dia.

```
Trabalho   09:00–12:00  deslocamento 0
Almoço     12:00–13:00  deslocamento 0
Trabalho   14:30–17:30  deslocamento 0
Academia   18:00–19:00  deslocamento 15
Faculdade  19:30–22:30  deslocamento 25
```

Previsão fixa para a demonstração:

```
08:00 17° 5%   |  11:00 21° 10%  |  14:00 24° 15%
17:00 23° 35%  |  19:00 19° 82%  |  21:00 15° 55%
```

Resultado esperado: **4 insights** — janela livre de 1h30 (`bom`), 5 minutos de
margem antes da faculdade (`atencao`), leve guarda-chuva e casaco leve
(`info`), 11h comprometidas (`atencao`). Veredito: *"Seu dia está apertado."*

Nenhum `critico` de propósito: o avaliador cria um ao vivo adicionando um
evento entre 18:00 e 19:00, o que demonstra o motor reagindo.

---

## 16. PWA

```json
// public/manifest.webmanifest
{
  "name": "LifeOS", "short_name": "LifeOS",
  "start_url": "/", "display": "standalone", "lang": "pt-BR",
  "background_color": "#eef0f4", "theme_color": "#14181f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-mask.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

No Android o Chrome exibe o convite de instalação automaticamente. No iOS o
usuário precisa usar Compartilhar → Adicionar à Tela de Início, e **não existe
convite automático** — então mostre uma dica discreta na primeira visita,
detectando iOS fora do modo standalone.

---

## 17. O que NÃO fazer

- Não use Tailwind nem biblioteca de componentes
- Não use `localStorage` dentro de `core/` — ele é puro
- Não espalhe `if` de regra de negócio dentro de componentes; regra nova vai em
  `core/insights.ts`
- Não chame a OpenWeather direto do navegador
- Não escreva autenticação à mão
- Não implemente: geolocalização, cálculo de rota por API, notificação push,
  integração com calendário externo, IA, gráficos elaborados
- Não mostre equilíbrio em porcentagem. "80% de trabalho" não significa nada;
  use horas reais
- Não mostre "leve guarda-chuva" na Regra 4 — isso é da Regra 3
- Não gere insight de preparo quando não houver item; silêncio é resposta
  válida
- Não escreva um único commit gigante ao fim
