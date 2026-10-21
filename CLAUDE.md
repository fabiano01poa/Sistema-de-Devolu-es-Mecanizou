# Consulta de Devoluções — Mecanizou

Sistema interno para consultar, negociar e acompanhar devoluções/garantias de peças com fornecedores, sincronizado com Google Sheets, com conciliação de espelhos de aprovação (PDF/OCR) e impressão de etiquetas Brother.

## Stack
React 19 + Vite 6 + Tailwind 4 + TypeScript 5.8 (frontend) · Express 4 em `server.ts` (API `/api/*`) · Deploy Vercel (`vercel.json`). Package manager: **npm** (ignore `bun.lock`).

## Comandos
- `npm run dev` — Express + Vite middleware em :3000
- `npm run lint` — **typecheck** (`tsc --noEmit`); é a validação mínima obrigatória
- `npm run build` — `vite build` + bundle do server em `dist/`
- Não há framework de testes. Validação pontual: script `tsx` no scratchpad (ver skill `/test`).

## Arquitetura essencial
- `server.ts` — monolito da API: leitura do Sheets via CSV (cache 5 min), escrita via webhook Apps Script (com retry), Drive via Service Account (etiquetas), parse de PDF. Respostas `{ success, message, ... }`.
- `src/App.tsx` — estado global e navegação; `src/components/` — views e um modal de aprovação **por fornecedor**.
- `src/utils/approvalParser.ts` — `parse<Fornecedor>ApprovalText` + `match<Fornecedor>WithStock`, com `SAMPLE_*_OCR` de referência.
- `src/utils/statusUtils.ts` — status oficiais. **Duplicado parcialmente em `server.ts`**: mudou um, revise o outro.
- `src/types.ts` — `StockItem` é o contrato central entre planilha, server e UI.
- Não há banco de dados: a planilha é a fonte da verdade.

## Regras críticas
- Menor alteração que resolve o problema. Sem refatoração, abstração ou dependência não solicitada.
- Reutilize utils/componentes existentes antes de criar novos. Siga o padrão do fornecedor mais próximo ao adicionar outro.
- Escritas em planilha/Drive e comandos destrutivos (`rm`, `git push`, `reset`) só com confirmação explícita.
- Nunca faça commit sem pedido explícito.
- Textos de UI em pt-BR; código e identificadores seguem o arquivo ao redor.
- Toda comunicação com o usuário (perguntas, opções, respostas, resumos) em português do Brasil, sem termos em inglês desnecessários.

## Segurança
- Segredos só em `.env` (nunca lido) — referência em `.env.example`. Nunca coloque segredos em `CLAUDE.md` ou `.claude/`.
- **Repositório público**: tudo que for versionado é público, inclusive `.claude/`.
- `.claude/` e `CLAUDE.md` são infraestrutura de desenvolvimento: nunca importar em `src/`, servir, copiar para `dist/`/`public/` ou expor via API.

## Agents (`.claude/agents/`) — use só quando agregam
Pesquisa ampla → `researcher` · mudança multi-módulo/dependência → `architect` · código → `implementer` (ou `frontend`/`backend`/`data`) · validação → `tester` · mudança relevante → `reviewer` · segurança → `security` · git/PR → `contributor`. Tarefa simples: faça direto, sem agents.

## Economia de tokens
Busque pelo símbolo (Grep) antes de abrir arquivos; leia trechos com offset/limit — `server.ts`, `approvalParser.ts`, `NegociarView.tsx` têm 1–2,6k linhas. Não cole arquivos ou logs inteiros: resuma. Respostas de agents compactas. Regra repetida vira skill; regra de área vai no agent dela.

## Definição de pronto
1. `npm run lint` sem erros novos. 2. Comportamento validado (script ou `npm run dev`) quando houver lógica. 3. Sem arquivos fora do escopo alterados. 4. Resumo: Alterado / Validado / Observações.
