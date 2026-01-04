export const SERIES_GUIDE_TEMPLATE = `
═══════════════════════════════════════════════════════════════════════════════
                    PLANTILLA DE GUÍA DE SERIE LITERARIA
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Complete esta plantilla para definir los hilos narrativos, hitos
y arcos de su serie. Esta información será utilizada por el sistema para:
1. Verificar automáticamente que cada volumen cumpla con el plan de la serie
2. Detectar hilos argumentales que no progresan
3. Corregir automáticamente problemas de continuidad

═══════════════════════════════════════════════════════════════════════════════
1. INFORMACIÓN GENERAL DE LA SERIE
═══════════════════════════════════════════════════════════════════════════════

Título de la Serie: [Nombre de la saga]
Número Total de Volúmenes Planificados: [Número]
Género Principal: [Ej: Fantasía épica, Romance histórico, Thriller]
Tema Central: [El mensaje o pregunta filosófica que explora la serie]

Sinopsis General (2-3 párrafos):
[Descripción del arco completo de la serie, sin spoilers excesivos]

═══════════════════════════════════════════════════════════════════════════════
2. HILOS ARGUMENTALES (PLOT THREADS)
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Defina cada hilo argumental que atraviesa múltiples volúmenes.
Los hilos pueden ser de tipo: principal, secundario, o de fondo.

-------------------
HILO #1: [Nombre del Hilo]
-------------------
Tipo: [principal / secundario / fondo]
Descripción: [Qué trata este hilo, conflicto central]
Personajes Involucrados: [Lista de personajes]
Volumen de Introducción: [Número]
Volumen de Resolución Previsto: [Número]
Importancia: [alta / media / baja]

Desarrollo por Volumen:
- Volumen 1: [Cómo se introduce/desarrolla]
- Volumen 2: [Cómo progresa]
- Volumen 3: [Cómo escala o se complica]
[Continuar según número de volúmenes...]

-------------------
HILO #2: [Nombre del Hilo]
-------------------
[Repetir estructura anterior...]

═══════════════════════════════════════════════════════════════════════════════
3. HITOS (MILESTONES) POR VOLUMEN
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Defina los eventos obligatorios que DEBEN ocurrir en cada volumen.
Tipos de hito: punto_trama, desarrollo_personaje, revelacion, conflicto, resolucion

-------------------
VOLUMEN 1: [Título del Volumen]
-------------------

HITO 1.1 (punto_trama, REQUERIDO):
[Descripción exacta del evento que debe ocurrir]
Capítulo sugerido: [Número o rango]

HITO 1.2 (desarrollo_personaje, REQUERIDO):
[Descripción de la transformación del personaje]
Capítulo sugerido: [Número o rango]

HITO 1.3 (revelacion, opcional):
[Información que se revela al lector]
Capítulo sugerido: [Número o rango]

-------------------
VOLUMEN 2: [Título del Volumen]
-------------------
[Repetir estructura...]

═══════════════════════════════════════════════════════════════════════════════
4. ARCOS DE PERSONAJE
═══════════════════════════════════════════════════════════════════════════════

PERSONAJE: [Nombre]
Rol: [Protagonista / Antagonista / Secundario / Mentor]

Estado Inicial (Vol. 1):
[Cómo es el personaje al inicio de la serie]

Transformación a lo largo de la serie:
- Volumen 1: [Estado al final del volumen]
- Volumen 2: [Evolución]
- Volumen 3: [Cambio mayor]
[Continuar...]

Estado Final Previsto:
[Cómo termina este personaje su arco]

Eventos Clave de Transformación:
1. [Evento en Vol. X que cambia al personaje]
2. [Evento en Vol. Y que lo transforma más]
[...]

═══════════════════════════════════════════════════════════════════════════════
5. REGLAS DE CONTINUIDAD
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Liste elementos que NUNCA deben cambiar entre volúmenes.

Rasgos Físicos Inmutables:
- [Personaje]: Ojos [color], cabello [color/longitud], [otras características]
- [Personaje]: [...]

Reglas del Mundo:
- [Regla 1: Ej. "La magia tiene un costo físico"]
- [Regla 2: Ej. "Los vampiros no pueden entrar sin invitación"]
[...]

Eventos Históricos Establecidos:
- [Evento que ya ocurrió y no puede contradecirse]
[...]

═══════════════════════════════════════════════════════════════════════════════
6. CONEXIONES ENTRE VOLÚMENES (HOOKS)
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Defina los "ganchos" que conectan un volumen con el siguiente.

Del Volumen 1 al 2:
- Gancho de suspenso: [Qué queda pendiente]
- Hilo a continuar: [Qué hilo toma protagonismo]
- Setup pendiente: [Qué se sembró que dará frutos después]

Del Volumen 2 al 3:
[...]

═══════════════════════════════════════════════════════════════════════════════
7. FORESHADOWING Y PAYOFF
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Liste las "semillas" narrativas plantadas y cuándo deben resolverse.

FORESHADOWING #1:
- Descripción: [Qué pista o detalle se planta]
- Plantado en: Volumen [X], Capítulo [Y]
- Payoff en: Volumen [Z], Capítulo [W]
- Importancia: [crítica / importante / menor]

FORESHADOWING #2:
[...]

═══════════════════════════════════════════════════════════════════════════════
8. NOTAS ADICIONALES
═══════════════════════════════════════════════════════════════════════════════

[Cualquier información adicional relevante para mantener la coherencia de la serie]

═══════════════════════════════════════════════════════════════════════════════
                              FIN DE LA PLANTILLA
═══════════════════════════════════════════════════════════════════════════════
`;

export const BOOK_GUIDE_TEMPLATE = `
═══════════════════════════════════════════════════════════════════════════════
                    PLANTILLA DE GUÍA DE LIBRO INDIVIDUAL
                    (Para uso con el Arquitecto de Tramas)
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Complete esta plantilla para guiar la generación de un libro.
Esta información será utilizada por el Arquitecto para diseñar la estructura
narrativa y por el Ghostwriter para escribir la prosa.

═══════════════════════════════════════════════════════════════════════════════
1. INFORMACIÓN BÁSICA
═══════════════════════════════════════════════════════════════════════════════

Título del Libro: [Nombre]
¿Pertenece a una serie?: [Sí/No]
Si es parte de serie:
  - Nombre de la Serie: [...]
  - Número de Volumen: [...]

Género: [Ej: Fantasía, Romance, Thriller, Histórica...]
Subgénero: [Ej: Dark fantasy, Regency romance, Psychological thriller...]
Tono: [Ej: Oscuro, Ligero, Épico, Íntimo, Humorístico...]

═══════════════════════════════════════════════════════════════════════════════
2. PREMISA Y SINOPSIS
═══════════════════════════════════════════════════════════════════════════════

Premisa (1-2 oraciones):
[El gancho principal: qué hace única esta historia]

Sinopsis (3-5 párrafos):
[Resumen de la trama principal sin revelar el final]

═══════════════════════════════════════════════════════════════════════════════
3. HILOS ARGUMENTALES DEL LIBRO
═══════════════════════════════════════════════════════════════════════════════

HILO PRINCIPAL (Trama A):
- Descripción: [El conflicto central que impulsa la historia]
- Punto de partida: [Cómo se introduce]
- Desarrollo: [Cómo escala a lo largo del libro]
- Clímax: [El punto de máxima tensión]
- Resolución: [Cómo se cierra o queda abierto para siguiente volumen]

SUBTRAMA B:
- Descripción: [...]
- Conexión con trama A: [Cómo se relaciona]
- Resolución: [...]

SUBTRAMA C (opcional):
[...]

═══════════════════════════════════════════════════════════════════════════════
4. HITOS OBLIGATORIOS DEL LIBRO
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES: Defina los eventos que DEBEN ocurrir en este libro.

ACTO 1 (Introducción - primeros 25%):
- HITO: [Evento incitante que arranca la trama]
  Capítulo sugerido: [1-3]
- HITO: [Primer punto de giro]
  Capítulo sugerido: [3-5]

ACTO 2A (Desarrollo - 25%-50%):
- HITO: [Complicación mayor]
- HITO: [Revelación importante]

PUNTO MEDIO (~50%):
- HITO: [Giro que cambia todo - "no hay vuelta atrás"]

ACTO 2B (Escalada - 50%-75%):
- HITO: [Crisis del protagonista]
- HITO: [Todo parece perdido]

ACTO 3 (Resolución - últimos 25%):
- HITO: [Clímax de la trama]
- HITO: [Resolución y nuevo status quo]

═══════════════════════════════════════════════════════════════════════════════
5. PERSONAJES PRINCIPALES
═══════════════════════════════════════════════════════════════════════════════

PROTAGONISTA:
- Nombre: [...]
- Descripción física: [Ojos, cabello, altura, rasgos distintivos - INMUTABLES]
- Personalidad: [...]
- Motivación principal: [Qué quiere]
- Miedo principal: [Qué teme]
- Arco en este libro: [De dónde parte → A dónde llega]

ANTAGONISTA:
- Nombre: [...]
- Motivación: [Por qué se opone al protagonista]
- Método: [Cómo obstaculiza]

SECUNDARIOS CLAVE:
- [Nombre]: [Rol en la historia, relación con protagonista]
[...]

═══════════════════════════════════════════════════════════════════════════════
6. CONFIGURACIÓN DE ARCOS
═══════════════════════════════════════════════════════════════════════════════

ARCO DEL PROTAGONISTA:
- Estado inicial: [Cómo es al principio]
- Catalizador del cambio: [Qué lo fuerza a cambiar]
- Momento de crisis: [Su peor momento]
- Transformación: [Cómo cambia]
- Estado final: [Cómo termina este libro]

ARCOS SECUNDARIOS:
- [Personaje]: [De... → A...]
[...]

═══════════════════════════════════════════════════════════════════════════════
7. SEMILLAS Y RESOLUCIONES (SETUP/PAYOFF)
═══════════════════════════════════════════════════════════════════════════════

SETUP #1:
- Qué se planta: [Detalle, objeto, información]
- Dónde se planta: Capítulo [X]
- Payoff: Capítulo [Y] - [Cómo se resuelve]

SETUP #2:
[...]

═══════════════════════════════════════════════════════════════════════════════
8. ELEMENTOS DE ESTILO
═══════════════════════════════════════════════════════════════════════════════

Voz narrativa: [Primera persona, tercera limitada, omnisciente...]
Tiempo verbal: [Presente, pasado...]
Tono de prosa: [Ej: Poético, directo, ornamentado, minimalista...]

Vocabulario prohibido (anacronismos o palabras a evitar):
- [Lista de palabras que NO deben usarse]

Vocabulario preferido:
- [Términos específicos del mundo/época que SÍ deben usarse]

Metáforas recurrentes permitidas:
- [Imágenes o símbolos que pueden repetirse]

Metáforas prohibidas (clichés):
- [Imágenes gastadas a evitar]

═══════════════════════════════════════════════════════════════════════════════
9. NOTAS PARA EL ARQUITECTO
═══════════════════════════════════════════════════════════════════════════════

[Cualquier instrucción adicional específica para la generación de este libro]

═══════════════════════════════════════════════════════════════════════════════
                              FIN DE LA PLANTILLA
═══════════════════════════════════════════════════════════════════════════════
`;
