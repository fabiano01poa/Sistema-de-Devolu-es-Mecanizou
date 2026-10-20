---
name: test
description: Cria e executa a verificação mais específica para um comportamento (scripts tsx sobre parsers/utils, curl em rotas de leitura, typecheck). O projeto não tem framework de testes.
argument-hint: <comportamento, função ou arquivo a validar>
---
Alvo: $ARGUMENTS (vazio = validar as alterações atuais do `git diff`).

Do mais específico ao mais amplo; pare quando provar:
1. **Lógica pura** — escreva um script `.ts` no scratchpad que importe o módulo por caminho absoluto e use `node:assert`. Execute com `npx tsx <script>`. Fixtures: `SAMPLE_*_OCR` (`approvalParser.ts`), `FALLBACK_SAMPLE_DATA` (`fallbackData.ts`). Cubra o caso feliz + 2–4 edge cases (vazio, data inválida, moeda BR, variação de nome de fornecedor).
2. **Typecheck** — `npm run lint`.
3. **API** — `npm run dev` em background + `curl` em rotas de **leitura** (`/api/health`, `/api/sheet-data`). Rotas de escrita só com confirmação.
4. **Build** — `npm run build` só se tocar build/config.

Não adicione arquivos de teste nem dependências ao repo sem pedido; se um framework (ex.: Vitest) for justificável, recomende em Notes. Delegue ao `tester` se houver vários cenários.

Resposta (logs resumidos):

```
Scenario:
- ...
Result: PASS | FAIL
Command:
- ...
```
