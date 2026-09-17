# Heurísticas de Nielsen no LifeOS

Onde cada heurística aparece, em que tela e em qual componente. O A3 exige no
mínimo cinco das dez; aqui há **seis implementadas de propósito** (1, 2, 3, 5,
6 e 8) e mais quatro que aparecem como consequência (4, 7, 9 e 10), listadas no
fim.

As quatro telas do app são as quatro abas: **Dia**, **Adicionar**, **Alertas** e
**Ajustes**. Acima delas há uma moldura fixa — faixa de status, seletor de dia e
navegação — presente em todas.

---

## 1 — Visibilidade do estado do sistema

> *O sistema deve manter o usuário informado sobre o que está acontecendo.*

| Onde | Componente | O que faz |
|---|---|---|
| Moldura, todas as telas | `FaixaDeStatus` | Três estados de clima declarados com todas as letras: "Buscando o clima…", a temperatura, ou "Clima indisponível". Fica em `role="status" aria-live="polite"`, então a troca é anunciada. |
| Moldura, todas as telas | `FaixaDeStatus` | Quando a previsão de exemplo está ligada, a palavra **exemplo** aparece colada na temperatura. Dado fabricado nunca se disfarça de medido. |
| Dia | `App` → `.app-estado` | Carregar e falhar são estados visíveis, não tela em branco: "Carregando seus eventos…" em `role="status"` e o erro em `role="alert"`. |
| Adicionar | `FormularioEvento` | O botão vira "Salvando…" e fica desabilitado durante a gravação; depois a confirmação aparece em `role="status" aria-live="polite"`. |
| Adicionar | `FormularioEvento` | Se a submissão não passou na validação, um resumo em `role="alert"` diz quantos campos precisam de correção — quem tentou salvar está com o foco no botão e não ouviria os erros de campo. |
| Moldura | `SeletorDeData` | A troca de dia é anunciada por uma região `aria-live` exclusiva de leitor de tela: sem ela, apertar a seta não produz nenhum retorno audível. |
| Ajustes | `PainelDeAjustes` | "Recarregando…" durante a operação e uma confirmação em `role="status"` ao terminar. |
| Dia | `TrilhaDoDia` | O marcador de "agora" anda sozinho: `useAgora` força um render a cada virada de minuto. O estado do sistema aqui é literalmente a hora. |

**As duas regiões `aria-live` do formulário moram na página mesmo vazias.** Uma
região montada só no instante do aviso costuma não ser anunciada — o leitor de
tela precisa já estar observando o nó quando o texto entra.

---

## 2 — Correspondência entre o sistema e o mundo real

> *Falar a linguagem do usuário, com palavras e conceitos familiares.*

| Onde | Componente | O que faz |
|---|---|---|
| Dia | `Veredito` | A tela abre com uma frase em português corrente — "Seu dia está apertado." — e não com um contador ou um gráfico. |
| Dia, Alertas | `CartaoInsight` | Os insights falam como uma pessoa: *"Você chega em casa às 23:00 e amanhã tem aula às 08:00."* Nenhuma mensagem é de sistema. |
| Todo lugar | `utils/tempo.ts` → `formatarDuracao` | Durações saem como **"1h30"** e **"45min"**, não como `90` minutos. O usuário pensa em horas, o motor pensa em minutos, e a conversão é responsabilidade do app. |
| Moldura | `SeletorDeData` → `rotuloDoDia` | Os dias próximos são **"Ontem"**, **"Hoje"** e **"Amanhã"**; só depois disso vira data. |
| Adicionar, Dia | `types/index.ts` → `ROTULO_CATEGORIA` | As categorias aparecem como Trabalho, Estudos, Saúde, Pessoal, Casa, Finanças — nunca como as chaves internas `saude`/`financas`. |
| Moldura | `FaixaDeStatus` | O clima vem da OpenWeather já em `lang=pt_br`: "nublado", "chuva leve". |
| Dia | `TrilhaDoDia` | O dia é desenhado como uma tabela de horário de embarque — a metáfora que o público já tem para "quanto tempo falta". As horas em fonte monoespaçada alinham em coluna, como num painel. |
| Adicionar | `FormularioEvento` | O campo de deslocamento se chama **"Minutos de caminho"** e explica *"Quanto tempo leva de casa até lá"* — como a pessoa pensa, em vez de pedir um horário de saída já calculado. |

---

## 3 — Controle e liberdade do usuário

> *Saídas de emergência claras. Desfazer e refazer.*

**Esta é a heurística central do produto.** O LifeOS nunca decide: ele mostra o
contexto, propõe e deixa escolher.

| Onde | Componente | O que faz |
|---|---|---|
| Dia, Alertas | `CartaoInsight` | **"Manter como está"** é um botão de verdade, do mesmo tamanho e peso da sugestão. Recusar é tão visível quanto aceitar. |
| Dia, Alertas | `PainelDeInsights` | Dispensar é **reversível**: some um contador de dispensados e um botão **"Trazer de volta"**, na própria tela, não escondido num menu. A mudança é anunciada por `aria-live`. |
| Dia, Alertas | `App` → `mudarData` | Trocar de dia limpa os dispensados: cada dia tem sua própria leitura, e o que foi recusado ontem não continua escondido hoje. |
| Adicionar | `FormularioEvento` | O aviso de sobreposição **não bloqueia**. Diz o que vai acontecer e deixa salvar assim mesmo — *"o LifeOS vai apontar o conflito na sua trilha"*. |
| Adicionar | `FormularioEvento` | **"Descartar alterações"** em toda edição — desistir é sempre um clique. |
| Adicionar | `FormularioEvento` | **"Cancelar só em \<data\>"** cancela uma ocorrência de um compromisso fixo sem apagar a série. É a saída para "hoje a aula foi cancelada", que de outro modo forçaria escolher entre apagar tudo ou conviver com um insight errado. |
| Moldura | `FaixaDeStatus` | A previsão de exemplo liga e desliga pelo mesmo botão, a qualquer momento. |
| Ajustes | `PainelDeAjustes` | O tema é escolha de três estados — **sistema, claro, escuro** — e não um interruptor que sequestra a preferência do SO. |
| Dia | `DicaDeInstalacao` | Quem dispensa a dica não a vê de novo. Insistir numa sugestão já recusada é o app não aceitar a resposta. |
| Moldura | `NavegacaoPrincipal` | Qualquer aba alcança qualquer outra com um toque; não existe fluxo do qual se precise "sair". |

---

## 5 — Prevenção de erros

> *Melhor que uma boa mensagem de erro é um desenho que evita o problema.*

| Onde | Componente | O que faz |
|---|---|---|
| Adicionar | `core/validacao.ts` → `validarRascunho` | Validação **antes** de salvar: nome obrigatório, horários no formato certo, **término depois do início**, deslocamento numérico e não negativo, evento fixo com pelo menos um dia da semana e período de validade coerente. |
| Adicionar | `FormularioEvento` | Os erros são ao vivo depois da primeira tentativa: corrigir o campo apaga o erro sozinho, em vez de exigir outra submissão para descobrir. |
| Adicionar | `core/validacao.ts` → `sobreposicoesDe` | O aviso de sobreposição aparece **enquanto se digita**, nomeando o compromisso e o horário com que colide. |
| Adicionar | `FormularioEvento` | Editar um evento fixo avisa que **a mudança vale para todas as ocorrências** — mais honesto do que descobrir depois que a aula da semana passada mudou. |
| Adicionar | `FormularioEvento` | Excluir é em **dois passos**: *"Excluir X de vez? Isso não tem como desfazer."* Ação destrutiva e irreversível pergunta antes. |
| Ajustes | `PainelDeAjustes` | Recarregar a demonstração também é em dois passos, e o passo de confirmação diz o que se perde: *"Seus compromissos serão apagados."* |
| Adicionar | `FormularioEvento` | Os campos de horário e data são `type="time"` e `type="date"`: o teclado do celular já entra no modo certo e o formato inválido fica mais difícil de digitar. |
| Todo lugar | `types/index.ts` | O modelo impede erros por construção: `Evento` é uma união discriminada, e o TypeScript não deixa ler `diasDaSemana` de um evento pontual. |

---

## 6 — Reconhecimento em vez de memorização

> *Tornar objetos, ações e opções visíveis. O usuário não deve ter que lembrar.*

| Onde | Componente | O que faz |
|---|---|---|
| Dia, Alertas | `CartaoInsight` → `.cartao-base` | **O campo `base` está sempre visível.** Cada insight carrega, em fonte monoespaçada, os números que o geraram: `"19:00 — 82% de chuva"`, `"vão de 30min"`, `"25min de ida"`. O usuário reconhece de onde veio a conclusão em vez de ter que confiar nela. É por isso que `base` é obrigatório no tipo `Insight`, e não opcional. |
| Dia | `Veredito` | Abaixo da frase, os três números que a sustentam: horas comprometidas, horas em aberto e quantos pontos o motor levantou. |
| Dia | `TrilhaDoDia` | O dia inteiro em escala: não é preciso somar horários mentalmente para ver que o intervalo é apertado — ele **é** fisicamente estreito na tela. |
| Dia (desktop) | `PainelDeContexto` | Clima por faixa horária e horas por área ficam permanentemente à vista na terceira coluna, em vez de exigirem uma ida a outra tela. |
| Moldura | `NavegacaoPrincipal` | As quatro abas estão sempre na tela com rótulo textual ao lado do ícone, e a ativa tem `aria-current="page"`. |
| Adicionar | `FormularioEvento` | Ao editar, o formulário já vem preenchido com o evento; ao criar, já vem com a data que está na tela. Ninguém precisa relembrar o que tinha cadastrado. |
| Dia, Alertas | `CartaoInsight` | A **etiqueta textual** ("conflito", "apertado", "levar", "cheio", "janela") acompanha a cor. Cor nunca é a única pista — o que atende a WCAG 1.4.1 e, de quebra, poupa memória de código de cores. |

---

## 8 — Estética e design minimalista

> *Não mostrar informação irrelevante. Cada unidade extra compete com a relevante.*

| Onde | Componente | O que faz |
|---|---|---|
| Dia | `PainelDeInsights` → `VISIVEIS_POR_PADRAO = 2` | **No máximo dois cartões** no painel do dia. O resto fica atrás de "Ver outros N". A ordenação por nível garante que os dois visíveis sejam os mais graves. |
| Dia, Alertas | `core/insights.ts`, Regra 3 | A regra do que levar devolve **um insight com uma lista de itens**, não três cartões dizendo "leve casaco". O título se monta a partir dos itens: *"Leve guarda-chuva e casaco leve"*. |
| Dia, Alertas | `core/insights.ts`, Regra 3 | **Silêncio é resposta válida:** sem item acionado, nenhum insight é gerado. Um cartão dizendo "nada a levar" seria ruído. |
| Todo lugar | `styles/tokens.css` | **Cor só aparece quando um dado a justifica** — nível do insight, categoria do evento. Nunca como decoração. |
| Todo lugar | `styles/tokens.css` | Linhas de 1px em vez de sombra, raio pequeno, cinza-azulado frio. Vocabulário de painel de embarque, não de app de tarefas com cartões idênticos e a mesma sombra cinza. |
| Todo lugar | tipografia | IBM Plex Mono **apenas** em relógios e números. É função, não enfeite: os números monoespaçados alinham em coluna na trilha. |
| Dia | `Veredito` | Uma frase ocupa o topo da tela. Não há saudação, avatar, contador de streak nem card de boas-vindas. |
| Dia | separação do painel de transição | A virada do dia é um painel à parte e **não entra na conta do veredito**: ela não fala do dia que está na tela. |

---

## As outras quatro

Não foram alvo do projeto, mas aparecem e valem a menção:

- **4 — Consistência e padrões.** Todo componente tem um `.css` de mesmo nome e
  um prefixo de classe próprio; todas as cores vêm de `tokens.css`; as ações
  destrutivas seguem sempre o mesmo padrão de dois passos, no formulário e nos
  ajustes.
- **7 — Flexibilidade e eficiência.** As setas do `SeletorDeData` acumulam
  toques rápidos, e os atalhos "Hoje"/"Amanhã" poupam a navegação passo a passo
  nos dois dias mais usados. Em ≥1025px a mesma informação se reorganiza em três
  colunas, sem esconder nada atrás de rolagem.
- **9 — Ajudar a reconhecer e recuperar-se de erros.** As mensagens dizem o que
  fazer e repetem o dado em questão: *"O término precisa vir depois de 19:30."*,
  *"Informe um horário de início, como 19:30."* Erros de campo vêm ligados ao
  controle por `aria-describedby` e `aria-invalid`.
- **10 — Ajuda e documentação.** A ajuda está embutida onde a dúvida acontece —
  o texto sob o campo de deslocamento, a dica de instalação no iOS, e o próprio
  campo `base`, que é o app explicando o próprio raciocínio.
