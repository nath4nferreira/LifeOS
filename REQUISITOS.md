# Requisitos — LifeOS

O que o produto faz, o que ele deliberadamente não faz, e onde cada exigência
do A3 foi atendida.

Convenções: **RF** requisito funcional, **RNF** requisito não funcional.
Cada um aponta o arquivo onde vive e, quando existe, o teste que o prova.

---

## 0. O problema

Uma pessoa de 18 a 30 anos, com a rotina dividida entre faculdade, trabalho,
exercício e deslocamento, já usa três aplicativos: calendário, lista de tarefas
e clima. **Nenhum deles conversa com os outros.**

O calendário sabe que tem aula às 19:30. O app de clima sabe que chove às
19:00. Nenhum dos dois diz que ela vai pegar chuva no caminho — nem que, entre
sair da academia às 19:00 e chegar à faculdade às 19:30, sobram cinco minutos
para um trajeto de vinte e cinco.

**O LifeOS é a camada que falta**: `dados → contexto → insight → decisão do
usuário`. Ele lê o dia já montado e diz o que ele significa. Não decide nada.

---

## 1. Requisitos funcionais

### RF-1 — Cadastro de compromissos

| | |
|---|---|
| **RF-1.1** | Criar um compromisso com nome, categoria, horário de início, horário de término e minutos de deslocamento de ida. |
| **RF-1.2** | Seis categorias fixas: Trabalho, Estudos, Saúde, Pessoal, Casa, Finanças. |
| **RF-1.3** | Deslocamento `0` significa remoto ou em casa, e o motor trata assim. |
| **RF-1.4** | Editar qualquer compromisso existente. |
| **RF-1.5** | Excluir um compromisso, com confirmação em dois passos. |

**Onde:** `components/FormularioEvento.tsx`, `core/validacao.ts`,
`types/index.ts`.

### RF-2 — Recorrência

| | |
|---|---|
| **RF-2.1** | Um compromisso pode ser **pontual** (uma data) ou **fixo** (dias da semana). |
| **RF-2.2** | Todo fixo tem período de validade (`validoDe`/`validoAte`), para que a aula não apareça nas férias. |
| **RF-2.3** | Uma ocorrência pode ser cancelada sem apagar a série: o botão **"Cancelar só em \<data\>"** apenas acrescenta a data em `excecoes`. Sem isso, "hoje a aula foi cancelada" forçaria escolher entre apagar a série toda e conviver com um insight errado. |
| **RF-2.4** | O resto do sistema recebe apenas ocorrências planas, ordenadas por horário. Nem o motor de insights nem a interface sabem que recorrência existe. |

**Onde:** `core/seletor.ts` → `eventosDoDia()`.
**Provado por:** `core/seletor.test.ts` — validade, dia da semana e exceções,
cada um com seu caso.

**Por que importa:** recorrência é problema de **seleção**, não de motor.
Achatá-la num lugar só é o que impede que `if (evento.tipo === 'fixo')` se
espalhe por dez arquivos.

### RF-3 — Motor de insights

Função pura `gerarInsights(eventos, previsao)`. Sete regras:

| # | Regra | Nível | Condição |
|---|---|---|---|
| 1 | Sobreposição | `critico` | Dois eventos consecutivos com vão negativo. Diz por quanto tempo colidem. |
| 2 | Margem vs. deslocamento | `critico` / `atencao` | `margem = vão − deslocamento do segundo`. Negativa: não dá para chegar, e sugere o horário real de saída. Abaixo de `MARGEM_CONFORTAVEL` (10min): informa a sobra exata. Ignorada quando o deslocamento é 0. |
| 3 | O que levar ao sair de casa | `info` | Avalia a previsão em **toda a janela fora de casa**, não no instante da saída. Chuva ≥ `CHUVA_PROVAVEL` (50%) → guarda-chuva; mínima ≤ `FRIO` (17°) → casaco leve; ≤ `FRIO_INTENSO` (12°) → casaco; queda ≥ `QUEDA_TERMICA` (7°) → o motivo vira *"sai com 23° e volta com 15°"*. Um insight só, com lista de itens. |
| 4 | Chuva no deslocamento | `info` | Chuva provável durante o trajeto pede `MARGEM_POR_CHUVA` (10min) a mais. É sobre **tempo**, não sobre objetos — guarda-chuva é assunto da Regra 3. |
| 5 | Carga do dia | `atencao` | Total comprometido ≥ `CARGA_ALTA` (9h). |
| 6 | Janela livre | `bom` | Vão descontado o deslocamento ≥ `JANELA_LIVRE_MINIMA` (1h30). |
| 7 | Transição entre dias | `atencao` | Da chegada em casa hoje ao início do primeiro compromisso de amanhã, menos que `SONO_MINIMO` (7h). Função separada — é a única regra que cruza dois dias. |

| | |
|---|---|
| **RF-3.1** | Todo insight carrega o campo `base`: os números que o geraram. **Obrigatório, não opcional.** O LifeOS precisa ser auditável, não parecer mágica. |
| **RF-3.2** | Insights ordenados por nível: `critico` → `atencao` → `info` → `bom`, com sort estável dentro do mesmo nível. |
| **RF-3.3** | Silêncio é resposta válida: sem item acionado, a Regra 3 não gera insight nenhum. |
| **RF-3.4** | A janela fora de casa assume a volta com o mesmo tempo da ida, e isso aparece **declarado no texto do cartão**. É estimativa e se apresenta como tal. |
| **RF-3.5** | A previsão gratuita vem em blocos de 3h. Cada faixa é tratada como cobrindo 3h, para não afirmar horários que a API não afirmou. |

**Onde:** `core/insights.ts`.
**Provado por:** `core/insights.test.ts`, incluindo os dez casos que o briefing
exige — entre eles o falso positivo da tarde quente e seca (nenhum item), o dia
inteiro em casa (nenhum preparo) e a queda de 8° partindo de 23° (casaco leve
mesmo com calor).

### RF-4 — Veredito do dia

| | |
|---|---|
| **RF-4.1** | A tela abre com uma frase: *"Seu dia não fecha."* (algum crítico) → *"Seu dia está apertado."* (alguma margem) → *"Seu dia está cheio."* (≥ 9h) → *"Seu dia está vazio."* (nada agendado) → *"Seu dia está tranquilo."* |
| **RF-4.2** | Abaixo dela, os números que a sustentam: horas comprometidas, horas em aberto, quantos pontos o motor levantou. |
| **RF-4.3** | O insight de transição **não** entra na conta do veredito: ele não fala do dia que está na tela. |

**Onde:** `core/insights.ts` → `vereditoDoDia()`, `resumoDoDia()`;
`components/Veredito.tsx`.

### RF-5 — Trilha do dia em escala

| | |
|---|---|
| **RF-5.1** | `PX_POR_MINUTO = 0,5`. A altura de cada bloco é proporcional à duração, com piso de 52px. |
| **RF-5.2** | Os vãos também são proporcionais, entre 26px e 96px, com borda pontilhada. Um intervalo apertado aparece **fisicamente estreito**. |
| **RF-5.3** | Vão com margem insuficiente é desenhado na cor de atenção. |
| **RF-5.4** | Um marcador de "agora" posicionado na escala, que se move a cada virada de minuto. Só aparece quando a tela mostra o dia de hoje. |
| **RF-5.5** | Tocar um bloco abre a edição daquele compromisso. |

**Onde:** `components/TrilhaDoDia.tsx`, `core/trilha.ts`.
**Provado por:** `core/trilha.test.ts` — antes do dia, dentro de um evento, num
vão, e depois do fim.

### RF-6 — Navegação por data

| | |
|---|---|
| **RF-6.1** | Setas de dia anterior e próximo, mais atalhos nomeados de **Hoje** e **Amanhã** — os dois dias que o produto cobre por padrão. |
| **RF-6.2** | Ao navegar para fora desses dois, um terceiro atalho aparece com o dia visível, para que voltar não exija contar setas. |
| **RF-6.3** | Rótulos "Ontem", "Hoje" e "Amanhã" nos dias próximos; data curta nos demais. |
| **RF-6.4** | Toques rápidos na seta se acumulam em vez de se sobrescreverem. |
| **RF-6.5** | À meia-noite o dia na tela vira "Ontem" sozinho, sem recarregar a página. |
| **RF-6.6** | Trocar de dia sai da edição em curso e limpa os insights dispensados: eram do dia anterior. |

**Onde:** `components/SeletorDeData.tsx`, `hooks/useAgora.ts`.

### RF-7 — Clima (API pública)

| | |
|---|---|
| **RF-7.1** | Previsão real da **OpenWeather** (`/data/2.5/forecast`), em `pt_br` e unidades métricas. |
| **RF-7.2** | A chamada passa por uma rota serverless. **A chave nunca chega ao navegador**: não tem prefixo `VITE_`, logo não entra no bundle. |
| **RF-7.3** | A resposta bruta é normalizada para `Previsao { local, tempAtual, condicaoAtual, horas[] }` antes de sair do servidor. |
| **RF-7.4** | **Degradação graciosa:** se a API falhar, ou se o dia estiver além dos ~5 que a previsão cobre, `previsao` é `null`, a faixa de status diz "Clima indisponível" e as outras cinco regras continuam funcionando. |
| **RF-7.5** | Uma previsão de exemplo pode ser ligada para demonstração, e quando está ligada a faixa de status **rotula o dado como exemplo**. |

**Onde:** `api/clima.ts`, `services/openweather.ts`, `services/clima.ts`,
`hooks/usePrevisao.ts`, `components/FaixaDeStatus.tsx`.
**Provado por:** `services/openweather.test.ts`.

### RF-8 — Persistência

| | |
|---|---|
| **RF-8.1** | Os compromissos sobrevivem ao fechamento do navegador (`localStorage`). |
| **RF-8.2** | Tudo passa pela interface `RepositorioEventos`, **já assíncrona** mesmo sendo local, para que uma implementação remota entre depois sem tocar em componente nenhum. |
| **RF-8.3** | Sem `localStorage` disponível (navegação privada), o app cai para memória: funciona na sessão e esquece ao fechar, em vez de quebrar. |
| **RF-8.4** | Dado corrompido no armazenamento não derruba o app; vira erro visível. |

**Onde:** `services/repositorio.ts`, `hooks/useEventos.ts`.
**Provado por:** `services/repositorio.test.ts`.

### RF-9 — Dados de demonstração

| | |
|---|---|
| **RF-9.1** | Um botão nos ajustes instala o dia do roteiro: trabalho 09:00–12:00, almoço 12:00–13:00, trabalho 14:30–17:30, academia 18:00–19:00 (15min), faculdade 19:30–22:30 (25min). |
| **RF-9.2** | O resultado é determinístico: **quatro insights** — janela livre de 1h30 (`bom`), cinco minutos de margem (`atencao`), guarda-chuva e casaco leve (`info`), 11h comprometidas (`atencao`) — e o veredito *"Seu dia está apertado."* |
| **RF-9.3** | Nenhum `critico` de propósito: ele é criado ao vivo adicionando um evento entre 18:00 e 19:00, o que demonstra o motor reagindo. |

**Onde:** `services/demonstracao.ts`, `components/PainelDeAjustes.tsx`.
**Provado por:** `services/demonstracao.test.ts` — o roteiro inteiro é um teste,
para que ele não quebre em silêncio antes da gravação do vídeo.

**Por que existe:** se o app abrir vazio na demonstração, nenhum insight
aparece — e o insight **é** o produto.

---

## 2. Requisitos não funcionais

### RNF-1 — Responsividade

| | |
|---|---|
| **RNF-1.1** | Mobile first: o CSS base atende 320–480px. Desenvolvido com o DevTools travado em 320px, não na janela maximizada. |
| **RNF-1.2** | **481px** — mais respiro, formulário em três colunas. |
| **RNF-1.3** | **1025px** — grid de três colunas `208px \| minmax(0,1fr) \| 316px`: navegação lateral, trilha ao centro, painel de contexto à direita. A navegação inferior desaparece. |
| **RNF-1.4** | O conteúdo **se reorganiza**, não apenas aumenta: o painel de contexto do desktop não existe abaixo de 1025px — é montagem condicional, não `display:none`. |
| **RNF-1.5** | Nenhuma rolagem horizontal em 320px, em nenhuma aba, em nenhum tema. |

**Onde:** os `.css` de cada componente; `hooks/useMedia.ts`.

### RNF-2 — Acessibilidade (WCAG 2.1 AA)

| | |
|---|---|
| **RNF-2.1** | `<meta name="viewport" …viewport-fit=cover>` sem bloquear zoom. |
| **RNF-2.2** | HTML semântico: `header`, `main`, `nav`, `aside`, `article`, `section`, com hierarquia de headings sem pular nível. |
| **RNF-2.3** | Link "Pular para o conteúdo" como primeiro elemento focável (WCAG 2.4.1). |
| **RNF-2.4** | Foco sempre visível via `:focus-visible`, com contraste próprio. |
| **RNF-2.5** | Foco **gerenciado** nas trocas de tela que destroem o botão que as disparou — sem isso, quem usa teclado recomeça do topo da página. |
| **RNF-2.6** | Alvos de toque de no mínimo 44×44px. |
| **RNF-2.7** | `label` associado a todo campo; erros com `aria-invalid` e `aria-describedby`. |
| **RNF-2.8** | Confirmações em `aria-live="polite"`, erros de submissão em `role="alert"`. As regiões existem no DOM **antes** de receberem texto. |
| **RNF-2.9** | `aria-current="page"` na aba ativa, marcada por fundo **e** peso — a diferença de cor sozinha é sutil demais num rótulo de 12px. |
| **RNF-2.10** | **Cor nunca sozinha**: todo insight tem etiqueta textual (WCAG 1.4.1). |
| **RNF-2.11** | Contraste ≥ 4,5:1 (3:1 para texto grande). Auditado nas quatro abas, nos dois temas, em 320/390/1280 — zero falhas. |
| **RNF-2.12** | Espaçamento de texto da WCAG 1.4.12 sem perda de conteúdo nem de função. |
| **RNF-2.13** | `prefers-reduced-motion: reduce` desliga transição e animação. |
| **RNF-2.14** | `env(safe-area-inset-bottom)` na navegação inferior, para o indicador de gestos do iPhone. |
| **RNF-2.15** | `lang="pt-BR"` no documento. |

### RNF-3 — PWA

| | |
|---|---|
| **RNF-3.1** | Manifesto com nome, descrição, `display: standalone`, cores de tema e três ícones. |
| **RNF-3.2** | Ícone `maskable` separado, com a arte dentro da zona segura de 80% — sem ele o Android desenha o quadrado inteiro dentro de um círculo branco. |
| **RNF-3.3** | Service worker com precache de todo o app, **incluindo as fontes** — o padrão do Workbox não pega `woff2`, e sem elas a trilha perde o alinhamento em coluna das horas. |
| **RNF-3.4** | `/api/` fora do cache de navegação: clima é dado medido e envelhece. Servir do cache seria mostrar a chuva de anteontem como se fosse a de hoje. |
| **RNF-3.5** | Atualização automática, sem aviso de "nova versão": os eventos vivem no `localStorage`, então não há nada a preservar entre versões. |
| **RNF-3.6** | Dica de instalação no iOS, já que o Safari não oferece convite automático. Aparece só no iOS, só fora do modo instalado, e some para sempre ao ser dispensada. |

**Onde:** `vite.config.ts`, `index.html`, `scripts/gerar-icones.mjs`,
`components/DicaDeInstalacao.tsx`.

### RNF-4 — Portabilidade

| | |
|---|---|
| **RNF-4.1** | `src/core/` e `src/utils/` não importam React nem tocam em DOM, `window`, `localStorage` ou `fetch`. |
| **RNF-4.2** | Ler o relógio é I/O e mora em `services/relogio.ts`. O motor recebe o horário como argumento. |
| **RNF-4.3** | Os testes dessas pastas são a especificação de um port futuro para Dart: um LifeOS em Flutter deve passar nos mesmos casos. |

### RNF-5 — Qualidade de código

| | |
|---|---|
| **RNF-5.1** | TypeScript em `strict`, mais `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` e `verbatimModuleSyntax`. |
| **RNF-5.2** | ESLint e Prettier, sem avisos pendentes. |
| **RNF-5.3** | **143 testes em 8 arquivos**, todos passando. |
| **RNF-5.4** | Comentários explicam **por que**, não o que: a decisão e o motivo dela, não a tradução do código para português. |
| **RNF-5.5** | Git desde o primeiro commit, um commit descritivo por etapa — não um commit gigante ao fim. |
| **RNF-5.6** | Sem Tailwind e sem biblioteca de componentes: o CSS à mão é o que demonstra breakpoints e grid fluido. |
| **RNF-5.7** | Regra de negócio não mora em componente. Regra nova vai em `core/insights.ts`. |

---

## 3. Fora de escopo

Decidido de propósito, não esquecido:

- **Autenticação.** Nenhum critério do A3 a premia, e o app funciona inteiro sem
  ela. A interface `RepositorioEventos` deixa a porta aberta.
- **Geolocalização.** Coordenadas fixas de São Paulo. Pedir permissão de
  localização na primeira tela é custo alto por ganho nenhum na demonstração.
- **Cálculo de rota por API.** O deslocamento é informado pelo usuário, em
  minutos, e a volta assume o mesmo tempo da ida — declarado no cartão.
- **Notificação push, integração com calendário externo, IA, gráficos
  elaborados.** Todos expressamente vetados pelo briefing.
- **Equilíbrio em porcentagem.** "80% de trabalho" não significa nada; o painel
  de contexto mostra **horas reais** por área.

---

## 4. Rastreabilidade — critérios do A3

| Critério avaliado | Onde está | Evidência |
|---|---|---|
| Heurísticas de Nielsen (mín. 5 de 10) | seis implementadas de propósito, quatro por consequência | [HEURISTICAS.md](HEURISTICAS.md) |
| Design responsivo e acessível | RNF-1, RNF-2 | três breakpoints reais; contraste e espaçamento de texto auditados |
| Navegação mobile funcional e fluida | `NavegacaoPrincipal`, `SeletorDeData` | alvos de 44px, `safe-area-inset`, setas que acumulam toques |
| Consumo de API pública | RF-7 | OpenWeather via rota serverless, com degradação graciosa |
| Código limpo, comentado e versionado | RNF-4, RNF-5 | `core/` puro, 143 testes, um commit por etapa |
| Repositório documentado | — | [README.md](README.md), este arquivo, [HEURISTICAS.md](HEURISTICAS.md) |
| Deploy na Vercel | — | `api/clima.ts` já é rota serverless; `OPENWEATHER_KEY` nas variáveis de ambiente |
