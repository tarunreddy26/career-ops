# Modo: apply — Asistente de Aplicación en Vivo

Modo interactivo para cuando el candidato está rellenando un formulario de aplicación en Chrome. Lee lo que hay en pantalla, carga el contexto previo de la oferta, y genera respuestas personalizadas para cada pregunta del formulario.

## Requisitos

- **Mejor con Playwright visible**: En modo visible, el candidato ve el navegador y Claude puede interactuar con la página.
- **Sin Playwright**: el candidato comparte un screenshot o pega las preguntas manualmente.

## Workflow

```
1. DETECTAR    → Leer Chrome tab activa (screenshot/URL/título)
2. IDENTIFICAR → Extraer empresa + rol de la página
3. BUSCAR      → Match contra reports existentes en reports/
4. CARGAR      → Leer report completo + Section G (si existe)
5. COMPARAR    → ¿El rol en pantalla coincide con el evaluado? Si cambió → avisar
6. ANALIZAR    → Identificar TODAS las preguntas del formulario visibles
7. GENERAR     → Para cada pregunta, generar respuesta personalizada
8. PRESENTAR   → Mostrar respuestas formateadas para copy-paste
```

## Paso 1 — Detectar la oferta

**Con Playwright:** Tomar snapshot de la página activa. Leer título, URL, y contenido visible.

**Sin Playwright:** Pedir al candidato que:
- Comparta un screenshot del formulario (Read tool lee imágenes)
- O pegue las preguntas del formulario como texto
- O diga empresa + rol para que lo busquemos

## Paso 2 — Identificar y buscar contexto

1. Extraer nombre de empresa y título del rol de la página
2. Buscar en `reports/` por nombre de empresa (Grep case-insensitive)
3. Si hay match → cargar el report completo
4. Si hay Section G → cargar los draft answers previos como base
5. Si NO hay match → avisar y ofrecer ejecutar auto-pipeline rápido

## Paso 3 — Detectar cambios en el rol

Si el rol en pantalla difiere del evaluado:
- **Avisar al candidato**: "El rol ha cambiado de [X] a [Y]. ¿Quieres que re-evalúe o adapto las respuestas al nuevo título?"
- **Si adaptar**: Ajustar las respuestas al nuevo rol sin re-evaluar
- **Si re-evaluar**: Ejecutar evaluación A-F completa, actualizar report, regenerar Section G
- **Actualizar tracker**: Cambiar título del rol en applications.md si procede

## Paso 4 — Analizar preguntas del formulario

Identificar TODAS las preguntas visibles:
- Campos de texto libre (cover letter, why this role, etc.)
- Dropdowns (how did you hear, work authorization, etc.)
- Yes/No (relocation, visa, etc.)
- Campos de salario (range, expectation)
- Upload fields (resume, cover letter PDF)

Clasificar cada pregunta:
- **Ya respondida en Section G** → adaptar la respuesta existente
- **Match en Q&A cache** → reusar la respuesta cacheada como base (ver Paso 4.5)
- **Nueva pregunta** → generar respuesta desde el report + cv.md

## Paso 4.5 — Consultar el Q&A cache

Antes de generar una respuesta desde cero, consulta el cache de respuestas previas.

**Lookup léxico (rápido, exact + token overlap):**

```bash
node qa-cache.mjs lookup "<pregunta exacta del formulario>"
```

Devuelve JSON con top 3 matches y score 0-1. Reglas:
- **score ≥ 0.7** → usar la respuesta cacheada casi tal cual (solo adaptar nombre de empresa y 1 detalle del JD)
- **score 0.4-0.7** → usar la respuesta cacheada como base, reescribir 30-50%
- **score < 0.4 (o `matches: []`)** → no hay match léxico, pero la pregunta podría ser semánticamente equivalente a una cacheada

**Lookup semántico (cuando el léxico falla):**

Si `lookup` devuelve `matches: []` pero la pregunta es genérica (motivación, cultura, salario, conflict, fortalezas/debilidades, etc.), ejecuta:

```bash
node qa-cache.mjs view
```

Lee el markdown y haz tú el match semántico. Ejemplo: "What draws you to working with us?" no comparte tokens con "Why do you want to work at this company?" pero es la misma pregunta — el cache las tendría con tags compartidos como `why-this-role`.

Si encuentras una equivalente, úsala como base y refina.

## Paso 5 — Generar respuestas

Para cada pregunta, generar la respuesta siguiendo (en orden de prioridad):

1. **Q&A cache match** (si hubo en Paso 4.5): usar la respuesta cacheada como base
2. **Contexto del report**: Usar proof points del bloque B, historias STAR del bloque F
3. **Section G previa**: Si existe una respuesta draft, usarla como base y refinar
4. **Tono "I'm choosing you"**: Mismo framework del auto-pipeline
5. **Especificidad**: Referenciar algo concreto del JD visible en pantalla
6. **career-ops proof point**: Incluir en "Additional info" si hay campo para ello

**Formato de output:**

```
## Respuestas para [Empresa] — [Rol]

Basado en: Report #NNN | Score: X.X/5 | Arquetipo: [tipo]

---

### 1. [Pregunta exacta del formulario]
> [Respuesta lista para copy-paste]

### 2. [Siguiente pregunta]
> [Respuesta]

...

---

Notas:
- [Cualquier observación sobre el rol, cambios, etc.]
- [Sugerencias de personalización que el candidato debería revisar]
```

## Paso 6 — Post-apply (opcional)

Si el candidato confirma que envió la aplicación:
1. Actualizar estado en `applications.md` de "Evaluada" a "Aplicado"
2. Actualizar Section G del report con las respuestas finales
3. **Guardar respuestas en Q&A cache** para reusar en futuras aplicaciones (ver Paso 6.5)
4. Sugerir siguiente paso: `/career-ops contacto` para LinkedIn outreach

## Paso 6.5 — Guardar en Q&A cache

Para cada pregunta de texto libre del formulario (no para Yes/No ni dropdowns), guarda la respuesta final en el cache:

```bash
printf '%s' "<respuesta final>" | node qa-cache.mjs add \
  --question "<pregunta exacta>" \
  --company "<empresa>" \
  --tags "tag1,tag2"
```

**Tags sugeridos** (elige los que apliquen):
- `why-this-role`, `why-this-company`, `motivation`
- `strengths`, `weaknesses`, `growth-area`
- `salary`, `comp-expectations`
- `availability`, `notice-period`, `relocation`, `visa`
- `conflict`, `failure`, `leadership`, `teamwork`
- `star`, `technical`, `architecture`, `system-design`
- `culture-fit`, `values`, `diversity`

Si la pregunta ya existía (mismo hash), `qa-cache.mjs add` actualiza la entrada, suma `times_used`, dedupea tags y añade la nueva empresa a `companies`. La última respuesta gana — guarda la versión refinada, no el primer draft.

**Qué NO guardar:**
- Respuestas hiper-específicas a una empresa (ej. "¿Por qué Stripe específicamente?")
- Datos personales que ya están en `cv.md` (fecha de nacimiento, teléfono, dirección)
- Respuestas Yes/No de dropdowns (no tienen ROI de cacheo)

## Scroll handling

Si el formulario tiene más preguntas que las visibles:
- Pedir al candidato que haga scroll y comparta otro screenshot
- O que pegue las preguntas restantes
- Procesar en iteraciones hasta cubrir todo el formulario
