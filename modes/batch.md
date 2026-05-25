# Modo: batch — Procesamiento Masivo de Ofertas

Dos modos de uso: **conductor --chrome** (navega portales en tiempo real) o **standalone** (script para URLs ya recolectadas).

## Arquitectura

```
Claude Conductor (claude --chrome --dangerously-skip-permissions)
  │
  │  Chrome: navega portales (sesiones logueadas)
  │  Lee DOM directo — el usuario ve todo en tiempo real
  │
  ├─ Oferta 1: lee JD del DOM + URL
  │    └─► claude -p worker → report .md + PDF + tracker-line
  │
  ├─ Oferta 2: click siguiente, lee JD + URL
  │    └─► claude -p worker → report .md + PDF + tracker-line
  │
  └─ Fin: merge tracker-additions → applications.md + resumen
```

Cada worker es un `claude -p` hijo con contexto limpio de 200K tokens. El conductor solo orquesta.

## Archivos

```
batch/
  batch-input.tsv               # URLs (por conductor o manual)
  batch-state.tsv               # Progreso (auto-generado, gitignored)
  batch-runner.sh               # Script orquestador standalone
  batch-prompt.md               # Prompt template para workers
  logs/                         # Un log por oferta (gitignored)
  tracker-additions/            # Líneas de tracker (gitignored)
```

## Modo A: Conductor --chrome

1. **Leer estado**: `batch/batch-state.tsv` → saber qué ya se procesó
2. **Navegar portal**: Chrome → URL de búsqueda
3. **Extraer URLs**: Leer DOM de resultados → extraer lista de URLs → append a `batch-input.tsv`
4. **Para cada URL pendiente**:
   a. Chrome: click en la oferta → leer JD text del DOM
   b. Guardar JD a `/tmp/batch-jd-{id}.txt`
   c. Calcular siguiente REPORT_NUM secuencial
   d. Ejecutar via Bash:
      ```bash
      claude -p --dangerously-skip-permissions \
        --append-system-prompt-file batch/batch-prompt.md \
        "Procesa esta oferta. URL: {url}. JD: /tmp/batch-jd-{id}.txt. Report: {num}. ID: {id}"
      ```
   e. Actualizar `batch-state.tsv` (completed/failed + score + report_num)
   f. Log a `logs/{report_num}-{id}.log`
   g. Chrome: volver atrás → siguiente oferta
5. **Paginación**: Si no hay más ofertas → click "Next" → repetir
6. **Fin**: Merge `tracker-additions/` → `applications.md` + resumen

## Modo B: Script standalone

```bash
batch/batch-runner.sh [OPTIONS]
```

Opciones:
- `--dry-run` — lista pendientes sin ejecutar
- `--retry-failed` — solo reintenta fallidas
- `--start-from N` — empieza desde ID N
- `--parallel N` — N workers en paralelo
- `--max-retries N` — intentos por oferta (default: 2)

## Formato batch-state.tsv

```
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.2	-	0
2	https://...	failed	2026-...	2026-...	-	-	Error msg	1
3	https://...	pending	-	-	-	-	-	0
```

## Resumabilidad

- Si muere → re-ejecutar → lee `batch-state.tsv` → skip completadas
- Lock file (`batch-runner.pid`) previene ejecución doble
- Cada worker es independiente: fallo en oferta #47 no afecta a las demás

## Workers (claude -p)

Cada worker recibe `batch-prompt.md` como system prompt. Es self-contained.

El worker produce:
1. Report `.md` en `reports/`
2. PDF en `output/`
3. Línea de tracker en `batch/tracker-additions/{id}.tsv`
4. JSON de resultado por stdout

## Verificación post-batch (Playwright pool)

Los workers `claude -p` no pueden usar Playwright y marcan sus reports con `**Verification:** unconfirmed (batch mode)`. Una vez terminado el batch, ejecuta:

```bash
node batch-verify-reports.mjs            # verifica todos los unconfirmed
node batch-verify-reports.mjs --dry-run  # lista sin tocar archivos
node batch-verify-reports.mjs --concurrency 3   # más rápido (cuidado con RAM en 8GB)
node batch-verify-reports.mjs --report 042      # solo un report
node batch-verify-reports.mjs --all              # re-verifica todos
```

El script:
1. Escanea `reports/` por reports con `**Verification:** unconfirmed`
2. Extrae el `**URL:**` de cada report
3. Lanza un pool de Playwright (default concurrency 2) que comparte un browser y abre N contexts en paralelo
4. Reusa `classifyLiveness` de `liveness-core.mjs` (la misma lógica que `scan` y `check-liveness`)
5. Reescribe la línea `**Verification:**` in-place con `active|expired|uncertain (verified YYYY-MM-DD — reason)`
6. Sale con exit code 1 si encuentra reports expirados — el usuario decide si marcar como `Discarded` en `applications.md`

Default concurrency es 2 para no saturar Macs de 8GB. Para batches >50 reports en máquinas con más RAM, subir a 3-4 es seguro.

## Gestión de errores

| Error | Recovery |
|-------|----------|
| URL inaccesible | Worker falla → conductor marca `failed`, siguiente |
| JD detrás de login | Conductor intenta leer DOM. Si falla → `failed` |
| Portal cambia layout | Conductor razona sobre HTML, se adapta |
| Worker crashea | Conductor marca `failed`, siguiente. Retry con `--retry-failed` |
| Conductor muere | Re-ejecutar → lee state → skip completadas |
| PDF falla | Report .md se guarda. PDF queda pendiente |
