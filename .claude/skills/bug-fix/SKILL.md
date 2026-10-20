---
name: bug-fix
description: Corrige um bug pela causa raiz — reproduzir, identificar a causa, criar verificação de regressão, corrigir e validar.
argument-hint: <sintoma, passos ou mensagem de erro>
---
Bug: $ARGUMENTS

1. **Reproduzir** — encontre o caminho de código do sintoma (Grep). Prove o bug com o menor meio possível: script `tsx` no scratchpad (parsers/utils), `curl` em rota de leitura, ou passos no `npm run dev`. Se não reproduzir, pare e reporte o que foi tentado.
2. **Causa raiz** — explique em 1–2 linhas *por que* acontece. Verifique se a mesma lógica existe duplicada (`server.ts` ↔ `src/utils/statusUtils.ts`, parsers de outros fornecedores).
3. **Regressão** — mantenha o script de reprodução para rodar depois da correção (use `SAMPLE_*_OCR` quando for parser).
4. **Corrigir** — menor mudança na causa, não no sintoma. Sem refatorar ao redor.
5. **Validar** — script de reprodução passa + `npm run lint`. Confira que outros fornecedores/casos não regrediram.

Use `researcher`/`tester` só se a investigação for pesada. Não faça commit.

Resposta:

```
Root cause: arquivo:linha — causa
Changed:
- arquivo — alteração
Validated:
- comando — antes FAIL / depois PASS
```
