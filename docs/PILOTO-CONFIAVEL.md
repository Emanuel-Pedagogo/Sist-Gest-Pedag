# SACP — Plano para um piloto confiável

Este documento organiza o caminho para transformar o SACP em um piloto controlado, útil e seguro, sem reescrever o sistema. O foco é validar valor pedagógico real com a estrutura que já existe.

## 1. Diagnóstico objetivo

O SACP já possui um conjunto forte de funcionalidades para coordenação pedagógica:

- escolas, turmas, alunos e professores;
- etiquetas pedagógicas por cor;
- agenda escolar e importação de calendário SEMED;
- sondagens, boletins, ocorrências, frequência e relatórios;
- apoio de IA via Supabase Edge Functions e Gemini;
- empacotamento Android via Capacitor.

O principal risco do piloto não é falta de telas. Os riscos mais importantes estão em:

1. **banco Supabase parcialmente manual**, com vários scripts SQL soltos e sem migrações versionadas;
2. **segurança e LGPD**, porque dados de alunos, AEE, boletins, ocorrências e anexos exigem controle de acesso;
3. **configuração operacional**, especialmente Edge Functions, buckets e variáveis/secrets;
4. **validação funcional**, porque há poucos testes automatizados e muitos fluxos dependem de dados reais.

## 2. O que provavelmente errou até aqui

Estes pontos são comuns em MVPs criados por evolução rápida e precisam ser tratados antes de usar dados reais:

| Ponto | Por que isso prejudica o piloto | Ação recomendada |
| --- | --- | --- |
| Funcionalidades demais antes do roteiro de validação | Dificulta saber se o núcleo funciona | Validar poucos fluxos essenciais primeiro |
| SQL manual sem ordem única | Um ambiente pode ter tabela/coluna faltando | Criar checklist de execução e depois migrar para `supabase/migrations` |
| Políticas Supabase permissivas | Risco de vazamento de dados de menores | Remover acesso `anon` e exigir usuário autenticado |
| Cadastro aberto | Pessoas fora do piloto podem criar conta | Usar convite/aprovação manual durante o piloto |
| IA sem checklist de revisão | Pode importar informação errada | Exigir conferência humana antes de salvar |
| Biblioteca sem persistência | Usuário pode achar que dados serão salvos | Ocultar do piloto ou avisar claramente que é experimental |
| App monolítico em `App.jsx` | Aumenta risco de regressões | Não refatorar agora; estabilizar primeiro |

## 3. Escopo recomendado do piloto

Use um recorte pequeno e real:

- 1 escola;
- poucas turmas;
- 1 coordenador responsável;
- alunos com dados suficientes para validar etiquetas, sondagens, boletins e ocorrências;
- professores apenas se o fluxo de registros docentes for parte da dor prioritária.

Evite incluir no primeiro piloto:

- biblioteca, enquanto não houver persistência;
- múltiplas escolas com equipes diferentes;
- automações pedagógicas sem revisão humana;
- uso público por cadastro livre.

## 4. Preparação técnica mínima

### 4.1 Ambiente

Crie um arquivo `.env` local a partir do `.env.example`:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
```

O código ainda mantém fallback para o projeto atual, mas o piloto deve usar variáveis de ambiente para separar desenvolvimento, teste e produção.

### 4.2 Supabase

Antes de inserir dados reais, confirme:

- [ ] tabelas base existem: `escolas`, `turmas`, `alunos`, `ocorrencias`, `notas`, `frequencia_historico`, `agenda_eventos`;
- [ ] scripts SQL incrementais foram executados na ordem necessária;
- [ ] buckets existem: `sondagens-anexos`, `documentos-aee`, `agenda-arquivos`;
- [ ] Edge Functions estão publicadas: `extract-sondagens`, `extract-boletins-pdf`, `generate-resumo-aluno`;
- [ ] secret `GEMINI_API_KEY` está configurado;
- [ ] URLs de redirect do Supabase incluem web e Android, quando aplicável.

### 4.3 Ordem prática para revisar scripts SQL

1. Configurações de escola e arquivamento.
2. Ajustes de alunos e turmas especiais.
3. Sondagens.
4. Boletim e notas.
5. Professores, entregas docentes e registros de coordenação.
6. Agenda e importação SEMED.
7. Diário de frequência especial.
8. Relatório da pré-escola.
9. Políticas de Storage.

Depois do piloto, converta esse histórico para migrações versionadas.

## 5. Segurança e LGPD antes de dados reais

Para um piloto responsável com dados de alunos:

- [ ] permitir acesso ao banco somente para usuários `authenticated`;
- [ ] remover policies `anon` de tabelas com dados pedagógicos ou pessoais;
- [ ] tornar buckets privados quando houver fotos, documentos AEE, áudio, vídeo ou anexos;
- [ ] usar links temporários/signed URLs para arquivos sensíveis;
- [ ] restringir cadastro a usuários convidados ou aprovados;
- [ ] registrar finalidade do sistema e orientar que etiquetas são apoio pedagógico, não sentença automática;
- [ ] garantir revisão humana de importações por IA antes de salvar;
- [ ] publicar uma política de privacidade simples antes de uso externo.

## 6. Roteiro de validação funcional

Execute estes fluxos em ordem. Um fluxo só deve ser considerado pronto quando salvar, recarregar a página e manter os dados corretos.

| Fluxo | Critério de aceite |
| --- | --- |
| Login e logout | Sessão entra, persiste ao recarregar e sai limpamente |
| Escola e turma | Escola criada, turma vinculada e listada corretamente |
| Importar lista de alunos | Alunos aparecem na turma após recarregar |
| Cadastro manual de aluno | Dados essenciais salvam e editam sem duplicar |
| Etiquetas | Regras carregam, cor aparece e motivo fica compreensível |
| Ocorrência | Registro aparece no histórico do aluno |
| Sondagem manual | Nível de leitura/escrita salva e aparece no detalhe |
| Sondagem por foto | IA extrai, usuário revisa, dados salvam corretamente |
| Boletim individual | Notas calculam média e situação sem erro |
| Boletim da turma por PDF | Alunos são vinculados e notas aparecem por aluno |
| Agenda | Evento cria, edita, exporta e filtra SEMED corretamente |
| Professores | Professor, entrega e registro de coordenação salvam |
| Relatórios | PDF/Word geram arquivo legível |
| Turma especial | Vínculo de alunos e diário salvam e recarregam |
| Android/mobile | Login, menu, modais, upload e exportação funcionam em tela pequena |

## 7. Regras pedagógicas para o piloto

- O sistema deve apoiar a coordenação, não substituir avaliação profissional.
- Toda classificação por etiqueta precisa ter motivo claro.
- Importações por IA precisam ser conferidas antes de virarem registro.
- Dados sensíveis de AEE devem ser acessados apenas por quem realmente precisa.
- Professores devem entender o benefício prático: menos retrabalho e melhor acompanhamento.

## 8. Métricas simples de sucesso

Durante o piloto, acompanhe:

- quantos alunos foram cadastrados/importados sem correção manual;
- quantas importações por IA precisaram de ajuste;
- quais telas geraram dúvida ou erro;
- quanto tempo levou para registrar uma ocorrência ou sondagem;
- se as etiquetas ajudaram a priorizar atendimento pedagógico;
- se houve qualquer incidente de acesso indevido ou exposição de dados.

## 9. Melhorias futuras sem bloquear o piloto

- Criar `supabase/migrations` com schema completo.
- Extrair chamadas Supabase de `App.jsx` para serviços.
- Criar testes de integração dos fluxos críticos.
- Persistir biblioteca ou remover do menu até estar pronta.
- Implementar auditoria básica de alterações.
- Revisar Edge Functions com JWT obrigatório e CORS restrito.
- Melhorar code splitting para reduzir bundles grandes no build.

## 10. Decisão de prontidão

Considere o piloto pronto apenas quando:

- build e testes automatizados passarem;
- Supabase estiver configurado conforme checklist;
- acesso anônimo estiver removido dos dados sensíveis;
- os fluxos essenciais forem validados com dados de teste;
- houver orientação clara para o usuário revisar dados gerados por IA;
- existir um canal simples para registrar problemas encontrados.
