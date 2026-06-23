# Auditoria Front-End e Padronização de UI

## Resumo

A auditoria identificou que web e app Android compartilham a mesma base React/Capacitor, mas a interface estava fragmentada por estilos inline, reset padrão do Vite, controles nativos sem padrão e duplicação de telas. A primeira rodada de ajustes concentrou a padronização em CSS global, navegação mobile, modais e controles de maior recorrência.

## Ajustes Aplicados

- `src/index.css` foi reduzido a um reset mínimo, removendo estilos do template Vite que competiam com o tema real do sistema.
- `src/App.css` recebeu tokens e padrões globais para campos, selects, textareas, checkboxes, botões, abas, segmented controls, foco e alvos de toque.
- O botão mobile de menu passou a ficar fixo no canto inferior, com área de toque maior, ícone consistente e atributos de acessibilidade.
- O ajuste de teclado nativo do Capacitor passou a apontar para as classes reais dos modais e login.
- A tela global de alunos foi consolidada para usar `StudentsView`, removendo a versão inline duplicada em `App.jsx`.
- Filtros de alunos receberam labels visíveis e ações de lista passaram a usar botões padronizados.
- Abas de aluno, professor e biblioteca foram convertidas de `div` clicável para `button`.
- A alternância Mês/Semana/Dia da agenda foi padronizada como segmented control.
- O modal inline de edição de aluno em turmas foi migrado para `ModalShell`.
- Opções de etiqueta no modal de aluno deixaram de usar emojis em `select` nativo, melhorando previsibilidade no Android e Windows.

## Decisões de Design

- Campos e seletores devem seguir `.input-group` sempre que possível.
- Listas curtas de modos devem usar `segmented-control`; abas de conteúdo devem usar `.student-tabs` com botões `.tab`.
- Checkboxes devem ficar dentro de labels clicáveis com área mínima de 44px.
- Botões de ação devem usar `.btn-primary`, `.btn-secondary` ou `.btn-icon` em vez de estilos inline.
- Modais novos devem usar `ModalShell` para manter comportamento mobile, safe-area e teclado consistentes.

## Próximas Melhorias Recomendadas

- Reduzir gradualmente estilos inline restantes em relatórios, configurações, agenda e importações.
- Avaliar uma navegação inferior com 4 ou 5 atalhos principais para o app Android.
- Trocar `alert()` por toast/snackbar visualmente integrado.
- Planejar code splitting para reduzir os avisos de chunks grandes no build.

## Validação

- `npx eslint src`: sem erros; permanecem warnings antigos de dependências de hooks.
- `npm run build`: concluído com sucesso; permanece aviso de chunks grandes do Vite.
- `npm run lint`: ainda falha porque o comando varre artefatos gerados em `android/`, `assets/` e bundles minificados. A validação útil do código-fonte foi feita com `npx eslint src`.
