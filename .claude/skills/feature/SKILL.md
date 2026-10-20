---
name: feature
description: Desenvolve uma nova funcionalidade de ponta a ponta — requisitos, pesquisa direcionada, arquitetura se necessário, implementação, validação e review.
argument-hint: <descrição da funcionalidade>
---
Funcionalidade: $ARGUMENTS

Fluxo (pule etapas que não agregam; tarefa pequena = faça direto):
1. **Requisitos** — reformule em 2–4 bullets o que muda para o usuário. Se houver ambiguidade que muda a implementação, pergunte antes.
2. **Pesquisa** — Grep pelos símbolos/telas envolvidos. Se exigir abrir mais de ~3 arquivos, delegue ao `researcher`.
3. **Arquitetura** — só se tocar `server.ts` + `src/`, o contrato `StockItem`/planilha, um novo fornecedor ou dependência: use o `architect`.
4. **Implementação** — `frontend`, `backend` ou `data` conforme a área; `implementer` se misto. Siga o padrão mais próximo existente.
5. **Validação** — `npm run lint` obrigatório; lógica pura → `tester` com script `tsx`.
6. **Review** — `reviewer` se a mudança for relevante (lógica de negócio, dados, segurança, >~50 linhas).

Não faça commit. Resposta final no formato Changed / Validated / Notes.
