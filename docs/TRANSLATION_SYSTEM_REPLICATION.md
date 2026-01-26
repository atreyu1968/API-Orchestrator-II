# Sistema de Traducción - Instrucciones de Replicación

## Descripción General

El sistema de traducción de LitAgents permite traducir manuscritos completos (novelas) entre múltiples idiomas utilizando IA (DeepSeek o Gemini). Incluye reglas editoriales específicas por idioma, auto-recuperación de traducciones congeladas, y exportación en formato Markdown.

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  - Selector de idioma origen/destino                           │
│  - Botón iniciar traducción                                    │
│  - Barra de progreso (capítulos traducidos)                    │
│  - Botón descargar Markdown                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API REST                                  │
│  POST /api/projects/:id/translate                              │
│  GET  /api/translations                                        │
│  GET  /api/translations/:id/download                           │
│  GET  /api/translations/:id/resume                             │
│  DELETE /api/translations/:id                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TranslatorAgent                              │
│  - Prompts específicos por idioma                              │
│  - Reglas tipográficas (diálogos, puntuación)                  │
│  - Post-procesamiento del texto                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Base de Datos (PostgreSQL)                      │
│  Tabla: translations                                           │
│  - Estado, progreso, markdown acumulado                        │
│  - Heartbeat para detección de congelamiento                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Schema de Base de Datos

### Tabla `translations`

```sql
CREATE TABLE translations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  reedit_project_id INTEGER REFERENCES reedit_projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'original',  -- 'original' o 'reedit'
  project_title TEXT NOT NULL,
  source_language TEXT NOT NULL,            -- 'es', 'en', 'fr', etc.
  target_language TEXT NOT NULL,
  chapters_translated INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  markdown TEXT NOT NULL,                   -- Contenido acumulado
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, translating, completed, error
  heartbeat_at TIMESTAMP,                   -- Para detección de congelamiento
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### Drizzle ORM (TypeScript)

```typescript
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  reeditProjectId: integer("reedit_project_id").references(() => reeditProjects.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("original"),
  projectTitle: text("project_title").notNull(),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  chaptersTranslated: integer("chapters_translated").default(0),
  totalWords: integer("total_words").default(0),
  markdown: text("markdown").notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  status: text("status").notNull().default("pending"),
  heartbeatAt: timestamp("heartbeat_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

---

## 2. Idiomas Soportados

| Código | Idioma | Variantes |
|--------|--------|-----------|
| `es` | Español | - |
| `en` | English | `en-US`, `en-GB` |
| `fr` | Français | - |
| `de` | Deutsch | - |
| `it` | Italiano | - |
| `pt` | Português | - |
| `ca` | Català | - |

---

## 3. TranslatorAgent

### Ubicación
`server/agents/translator.ts`

### Interface de Entrada

```typescript
interface TranslatorInput {
  content: string;           // Contenido del capítulo a traducir
  sourceLanguage: string;    // Código de idioma origen (ej: 'es')
  targetLanguage: string;    // Código de idioma destino (ej: 'en')
  chapterTitle?: string;     // Título del capítulo
  chapterNumber?: number;    // Número del capítulo
  projectId?: number;        // ID del proyecto (para logging)
}
```

### Interface de Salida

```typescript
interface TranslatorResult {
  translated_text: string;   // Texto traducido
  source_language: string;
  target_language: string;
  notes: string;             // Notas sobre la traducción
}
```

### System Prompt Estructura

El agente usa prompts específicos por idioma con:

1. **Reglas tipográficas** - Formato de diálogos, puntuación, números
2. **Construcciones a evitar** - Calcos, anglicismos, pasiva excesiva
3. **Pronombres** - Tratamiento formal/informal (tú/usted, tu/vous, du/Sie)
4. **Formato de títulos** - `# Capítulo X: Título`
5. **Verificación final** - El texto debe sonar nativo

### Ejemplo de Reglas (Español)

```
[DIÁLOGOS]
- Usar EXCLUSIVAMENTE raya (—) para introducir diálogos. NUNCA comillas.
  ✓ CORRECTO: —Hola —dijo María—. ¿Cómo estás?
  ✗ INCORRECTO: "Hola" dijo María.

[TUTEO / USTED]
- COHERENCIA ABSOLUTA entre personajes
- Transiciones explícitas: "¿Puedo tutearte?"
```

---

## 4. Flujo de Traducción

### 4.1 Iniciar Traducción

```
POST /api/projects/:id/translate
Body: { targetLanguage: "en" }
```

1. Obtener proyecto y capítulos
2. Crear registro en tabla `translations` con status `translating`
3. Para cada capítulo:
   - Llamar a `TranslatorAgent.execute()`
   - Actualizar `heartbeatAt` (para watchdog)
   - Acumular `markdown` con separadores `\n\n---\n\n`
   - Actualizar `chaptersTranslated`
4. Marcar status `completed`

### 4.2 Código de Traducción

```typescript
const translator = new TranslatorAgent();
let currentMarkdown = "";

for (const chapter of chapters) {
  // Actualizar heartbeat
  await storage.updateTranslation(translationId, {
    heartbeatAt: new Date(),
  });

  // Traducir capítulo
  const response = await translator.execute({
    content: chapter.content,
    sourceLanguage: "es",
    targetLanguage: "en",
    chapterTitle: chapter.title,
    chapterNumber: chapter.chapterNumber,
  });

  // Acumular resultado
  if (currentMarkdown.length > 0) {
    currentMarkdown += "\n\n---\n\n";
  }
  currentMarkdown += response.result.translated_text;

  // Guardar progreso
  await storage.updateTranslation(translationId, {
    markdown: currentMarkdown,
    chaptersTranslated: translatedCount,
  });
}
```

---

## 5. Sistema de Auto-Recuperación

### Ubicación
`server/translation-auto-resume.ts`

### Watchdog

El sistema monitorea traducciones cada minuto. Si una traducción no actualiza su `heartbeatAt` en 5 minutos, se considera "congelada" y se reanuda automáticamente.

```typescript
const WATCHDOG_INTERVAL_MS = 1 * 60 * 1000;  // Verificar cada 1 minuto
const FROZEN_THRESHOLD_MS = 5 * 60 * 1000;   // Congelada después de 5 min

export function startTranslationWatchdog(): void {
  setInterval(translationWatchdogCheck, WATCHDOG_INTERVAL_MS);
}

async function translationWatchdogCheck(): Promise<void> {
  const translations = await storage.getAllTranslations();
  const processing = translations.filter(t => t.status === "translating");

  for (const translation of processing) {
    const timeSinceActivity = now - translation.heartbeatAt;
    
    if (timeSinceActivity > FROZEN_THRESHOLD_MS) {
      resumeTranslation(translation);
    }
  }
}
```

### Reanudar Traducción

La reanudación:
1. Cuenta cuántos capítulos ya están en el `markdown` (separados por `---`)
2. Continúa desde el siguiente capítulo
3. Acumula al markdown existente

---

## 6. Post-Procesamiento

El traductor aplica post-procesamiento al texto para corregir problemas comunes:

```typescript
private postProcessTranslation(text: string, targetLanguage: string): string {
  let result = text;

  // Limpiar artefactos de IA
  result = result.replace(/```(?:json|markdown)?\n?/g, '');
  result = result.replace(/\{[\s\S]*?"translated_text"[\s\S]*?\}/g, '');

  if (targetLanguage === "es") {
    // Convertir comillas a rayas para diálogos
    result = result.replace(/["«»]([^"«»]+)["«»]/g, '—$1');
    // Normalizar rayas de diálogo
    result = result.replace(/^(\s*)—\s+/gm, '$1—');
  }

  // Normalizar saltos de línea excesivos
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result;
}
```

---

## 7. API Endpoints

### GET /api/translations
Lista todas las traducciones.

### POST /api/projects/:id/translate
Inicia traducción de un proyecto.

```typescript
Body: {
  targetLanguage: string;  // Código de idioma destino
}
```

### GET /api/translations/:id/download
Descarga el markdown traducido.

### GET /api/translations/:id/resume
Reanuda una traducción congelada manualmente.

### DELETE /api/translations/:id
Elimina una traducción.

---

## 8. Configuración de IA

### DeepSeek (Recomendado por costo)

```typescript
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_TRANSLATOR_API_KEY || process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1"
});

const response = await client.chat.completions.create({
  model: "deepseek-chat",  // V3 - rápido y económico
  temperature: 0.7,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]
});
```

### Gemini (Alternativa rápida)

```typescript
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY
});

const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash"  // Rápido para traducción
});
```

---

## 9. Etiquetas de Capítulos Localizadas

El sistema usa etiquetas localizadas para prólogo, epílogo, y nota del autor:

```typescript
const CHAPTER_LABELS: Record<string, Record<string, string>> = {
  es: { prologue: "Prólogo", epilogue: "Epílogo", authorNote: "Nota del autor", chapter: "Capítulo" },
  en: { prologue: "Prologue", epilogue: "Epilogue", authorNote: "Author's Note", chapter: "Chapter" },
  fr: { prologue: "Prologue", epilogue: "Épilogue", authorNote: "Note de l'auteur", chapter: "Chapitre" },
  de: { prologue: "Prolog", epilogue: "Epilog", authorNote: "Anmerkung des Autors", chapter: "Kapitel" },
  it: { prologue: "Prologo", epilogue: "Epilogo", authorNote: "Nota dell'autore", chapter: "Capitolo" },
  pt: { prologue: "Prólogo", epilogue: "Epílogo", authorNote: "Nota do autor", chapter: "Capítulo" },
  ca: { prologue: "Pròleg", epilogue: "Epíleg", authorNote: "Nota de l'autor", chapter: "Capítol" },
};
```

---

## 10. Variables de Entorno Requeridas

```bash
# DeepSeek (principal)
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_TRANSLATOR_API_KEY=sk-...  # Opcional, usa DEEPSEEK_API_KEY si no existe

# Gemini (alternativa)
AI_INTEGRATIONS_GEMINI_API_KEY=...
AI_INTEGRATIONS_GEMINI_BASE_URL=...

# Base de datos
DATABASE_URL=postgresql://...
```

---

## 11. Checklist de Replicación

- [ ] Crear tabla `translations` en la base de datos
- [ ] Implementar `TranslatorAgent` con prompts por idioma
- [ ] Crear endpoints API (translate, list, download, resume, delete)
- [ ] Implementar storage methods (createTranslation, updateTranslation, etc.)
- [ ] Configurar watchdog para auto-recuperación
- [ ] Iniciar watchdog al arrancar el servidor
- [ ] Implementar post-procesamiento del texto
- [ ] Crear UI con selector de idiomas y barra de progreso
- [ ] Probar con capítulo corto antes de manuscrito completo

---

## 12. Ejemplo de Uso

```typescript
// Iniciar traducción
const translation = await storage.createTranslation({
  projectId: 123,
  projectTitle: "Mi Novela",
  sourceLanguage: "es",
  targetLanguage: "en",
  markdown: "",
  status: "translating"
});

// Traducir capítulos
const translator = new TranslatorAgent();
for (const chapter of chapters) {
  const result = await translator.execute({
    content: chapter.content,
    sourceLanguage: "es",
    targetLanguage: "en",
    chapterNumber: chapter.chapterNumber
  });
  
  // Guardar progreso...
}

// Descargar resultado
const markdown = translation.markdown;
// Exportar como .md
```

---

## Notas Importantes

1. **Heartbeat**: Siempre actualizar `heartbeatAt` durante la traducción para evitar que el watchdog reinicie el proceso.

2. **Separadores**: Usar `\n\n---\n\n` entre capítulos para permitir conteo correcto al reanudar.

3. **Reglas por idioma**: Las reglas tipográficas son CRÍTICAS para calidad profesional. No omitirlas.

4. **Tokens**: Registrar `inputTokens` y `outputTokens` para control de costos.

5. **Post-procesamiento**: Siempre aplicar limpieza al resultado de la IA.
