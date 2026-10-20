---
name: refactor
description: Refatora código preservando exatamente o comportamento existente, sem misturar com novas funcionalidades.
argument-hint: <alvo e objetivo da refatoração>
---
Refatoração: $ARGUMENTS

Regras:
- **Comportamento idêntico.** Nada de feature, correção de bug ou mudança visual junto. Se encontrar um bug, reporte em Notes — não corrija aqui.
- Justifique o ganho em 1 linha (duplicação removida, legibilidade, performance medida). Sem abstração "para deixar bonito".
- Escopo mínimo; passos pequenos.

Fluxo:
1. **Baseline** — antes de mudar, capture o comportamento atual: script `tsx` no scratchpad com saídas do código atual (use `SAMPLE_*_OCR`/`FALLBACK_SAMPLE_DATA` quando aplicável) + `npm run lint`.
2. **Plano** — liste os arquivos tocados. Se forem vários módulos ou o contrato `StockItem`, consulte o `architect`.
3. **Refatorar** — atenção à lógica duplicada `server.ts` ↔ `src/utils/statusUtils.ts`: unificar exige que o bundle do server (esbuild) e o frontend continuem funcionando.
4. **Provar equivalência** — rode o mesmo script do baseline (saídas iguais) + `npm run lint`; `npm run build` se mexer em imports compartilhados.

Resposta: Changed / Validated (baseline = depois) / Notes.
