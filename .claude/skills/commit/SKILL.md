---
name: commit
description: Analisa as alterações e prepara um commit pequeno e coerente (agrupamento + mensagem). Só cria o commit se o usuário pedir explicitamente.
argument-hint: "[\"criar\" para efetivar o commit após a revisão]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git diff:*), Bash(git log:*)
---
Argumento: $ARGUMENTS

1. `git status --short` e `git diff --stat` (staged e unstaged). Leia só os hunks necessários para entender a intenção.
2. **Bloqueios** — pare e avise se houver no diff: `.env*` (exceto `.env.example`), chaves/credenciais, `sync_config.json`, `dist/`, dados reais de clientes/fornecedores (repositório público).
3. **Agrupar** — uma mudança lógica por commit. Se houver mudanças misturadas, proponha a divisão por arquivos.
4. **Mensagem** — Conventional Commits em inglês, minúsculo, imperativo, ≤72 caracteres (padrão do repo: `feat: print Brother labels by ...`). Corpo opcional com o *porquê*.
5. Mudança significativa em `.claude/`/`CLAUDE.md` → lembre de atualizar `.claude/CHANGELOG.md` e `.claude/VERSION`.

**Não execute `git add`/`git commit`/`git push`.** Se o usuário confirmar explicitamente que quer o commit, mostre os comandos exatos ou execute-os somente após essa confirmação.

Resposta:

```
Commit 1: <mensagem>
- arquivos
Warnings:
- ... (ou "none")
```
