---
name: review
description: Revisa as alterações atuais (ou um commit/branch/arquivo informado) procurando bugs, regressões, segurança e performance. Não altera arquivos.
argument-hint: "[commit | branch | arquivo] (padrão: alterações não commitadas)"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git status:*), Bash(npm run lint)
---
Alvo: $ARGUMENTS (vazio = `git diff HEAD` + arquivos não rastreados relevantes).

1. Obtenha o diff com `git diff --stat` primeiro; leia só os hunks e o contexto necessário.
2. Delegue ao `reviewer` se o diff for grande (>~300 linhas) ou tocar várias áreas; se envolver rotas, input externo ou segredos, inclua o `security`.
3. Rode `npm run lint` e reporte só erros novos.

**Não modifique arquivos.** Sem críticas cosméticas.

Formato:

```
[P0|P1|P2|P3] arquivo:linha — problema → correção
```

Sem achados: `No blocking findings.` Termine com uma linha: `Lint: PASS|FAIL`.
