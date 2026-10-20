# Sistema de desenvolvimento com Claude Code

Infraestrutura **interna de desenvolvimento** para trabalhar neste repositório com o Claude Code. Não faz parte da aplicação.

## Estrutura

| Caminho | Função | Versionado |
|---|---|---|
| `../CLAUDE.md` | Contexto carregado em toda conversa (curto, alto valor) | sim |
| `agents/` | Subagents especializados, com contexto isolado | sim |
| `skills/` | Fluxos reutilizáveis invocados por `/nome` | sim |
| `settings.json` | Permissões da equipe (deny de segredos, ask para ações de risco) | sim |
| `settings.local.json` | Permissões pessoais desta máquina | **não** (`.gitignore`) |
| `CHANGELOG.md`, `VERSION` | Versão deste sistema de IA | sim |

## Agents — quando usar

| Agent | Use quando | Edita? | Modelo |
|---|---|---|---|
| `researcher` | Precisa localizar código/padrões em vários arquivos | não | haiku |
| `architect` | Mudança em vários módulos, contrato `StockItem`/planilha, novo fornecedor, dependência | não | padrão |
| `implementer` | Implementação geral/mista | sim | padrão |
| `frontend` | `src/components`, `App.tsx`, UI/UX | sim | padrão |
| `backend` | Rotas e integrações em `server.ts` | sim | padrão |
| `data` | Colunas da planilha, mapeamento, Apps Script, Drive, cache | sim (escrita real só com confirmação) | padrão |
| `tester` | Provar comportamento, reproduzir bug, edge cases | não (código de produção) | padrão |
| `reviewer` | Depois de mudanças relevantes | não | padrão |
| `security` | Auditoria de segurança | não (salvo pedido) | padrão |
| `contributor` | Organizar commits/PR/changelog | não | haiku |

Fluxo típico: tarefa → (pesquisa? `researcher`) → (estrutural? `architect`) → implementação (`frontend`/`backend`/`data`/`implementer`) → (`tester`) → (relevante? `reviewer`). **Nenhum agent é obrigatório**: tarefa simples se resolve direto.

Para chamar explicitamente: "use o agent researcher para ...".

## Skills

| Skill | Faz |
|---|---|
| `/feature <descrição>` | requisitos → pesquisa → arquitetura (se preciso) → implementação → validação → review |
| `/bug-fix <sintoma>` | reproduzir → causa raiz → verificação de regressão → corrigir → validar |
| `/review [alvo]` | revisa o diff atual sem alterar arquivos (formato `[P0-P3] arquivo:linha`) |
| `/test [alvo]` | verificação mais específica possível (scripts `tsx`, curl, typecheck) |
| `/refactor <alvo>` | refatoração com equivalência comprovada (baseline = depois) |
| `/commit` | agrupa mudanças e propõe mensagem; só commita com pedido explícito (apenas o usuário invoca) |

> `/review` deste projeto substitui o `/review` nativo do Claude Code dentro deste repositório.

## Privacidade e distribuição

- `.claude/` e `CLAUDE.md` são ferramentas de desenvolvimento: **nunca** importar em `src/`, copiar para `public/`/`dist/`, servir por rota ou expor na UI.
- Proteções aplicadas: `.vercelignore` exclui ambos do deploy; `vite.config.ts` (`server.fs.deny`) impede que o servidor de dev, que escuta em `0.0.0.0`, os sirva na rede; o build só publica `dist/` (Vite não usa `public/` aqui).
- **Este repositório é público no GitHub.** "Privado" aqui significa *fora do produto*, não *secreto*: qualquer pessoa pode ler `.claude/` e `CLAUDE.md`. Por isso, eles não contêm segredos, IDs sensíveis nem dados de clientes. Se precisar de instruções confidenciais, use `CLAUDE.local.md` ou `.claude/settings.local.json` (não versionados), ou torne o repositório privado.
- Segredos ficam só em `.env` (bloqueado para leitura pelo Claude). Modelo em `.env.example`.

## Economia de tokens

- `CLAUDE.md` contém só o que vale para toda conversa; regras de área ficam nos agents e fluxos nas skills.
- Grep pelo símbolo → leitura de trechos; arquivos de 1–2,6k linhas nunca são lidos inteiros.
- Exploração pesada vai para o `researcher` (haiku) e só a conclusão volta ao contexto principal.
- Agents respondem em formatos fixos e curtos (Changed/Validated/Notes, Answer/Evidence/Unknowns, `[Px]`), sem colar código ou logs.
- Modelos menores (haiku) para pesquisa e git; modelo principal para arquitetura, implementação, debugging e review.

## Como evoluir

1. Instrução repetida em prompts → nova skill (ou passo numa existente).
2. Regra permanente do projeto → `CLAUDE.md` (mantenha curto; remova o que ficou obsoleto).
3. Regra de uma área → agent correspondente.
4. Novo agent só se nenhum existente cobrir a responsabilidade; evite sobreposição.
5. Atualize `CHANGELOG.md` e `VERSION` (SemVer; ver regras no changelog). Correções de texto não mudam a versão.
6. Nunca coloque segredos em nenhum arquivo deste sistema.
