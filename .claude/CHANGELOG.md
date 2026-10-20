# Changelog — sistema de IA (`.claude/` + `CLAUDE.md`)

Versão do sistema de desenvolvimento com Claude Code, independente da versão da aplicação.
SemVer: **major** = mudança de fluxo/estrutura incompatível; **minor** = agent/skill novo ou mudança significativa de regras, segurança ou estratégia de tokens; correções de texto não mudam a versão.

## [1.0.0] — 2026-10-14
### Added
- `CLAUDE.md` com contexto essencial (stack, comandos, arquitetura, regras, segurança, definição de pronto).
- 10 agents: architect, researcher, implementer, reviewer, tester, security, frontend, backend, data, contributor.
- 6 skills: /feature, /bug-fix, /review, /test, /refactor, /commit.
- `settings.json` com deny de `.env*`, credenciais e `sync_config.json`; `ask` para git de escrita, `rm` e install.
- Proteção contra distribuição: `.vercelignore` e `server.fs.deny` do Vite para `.claude/` e `CLAUDE.md`.
