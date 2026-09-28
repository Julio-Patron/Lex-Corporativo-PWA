  Plataforma auditada: Lex Corporativo PWA (https://lexcorporativo.com.mx)
  Entorno de despliegue: Vercel (Producción · rama master)
  Fecha de corte: 23 de septiembre de 2026
  Enfoque: Experiencia de Usuario (UX) y Visualización del Editor
  ──────
  ## 1. Resumen Ejecutivo

  Tras una revisión profunda de la arquitectura visual, la ergonomía táctil, el flujo de trabajo de redacción y el ciclo de vida
  del documento en DraftingStudio.tsx, el sistema de diseño (index.css), los componentes modales y el almacenamiento local en
  IndexedDB (studio-session.ts), se concluye lo siguiente:

  1. Metáfora visual de alta fidelidad editorial: La visualización del lienzo emula con gran elegancia una hoja membretada legal
  física (.legal-letterhead). El uso de tipografía serif justificada, folio institucional dinámico, fecha de emisión, chip de
  estado del borrador y citas destacadas con filete dorado #c5a059 transmite seriedad jurídica y rigor formal.
  2. Resiliencia de datos y operación offline-first sobresaliente: La integración con IndexedDB a través de useSyncExternalStore,
  junto con el bloqueo de suspensión de pantalla (navigator.wakeLock) y el atajo Ctrl+S con respuesta háptica, garantiza una
  experiencia de redacción profesional sin riesgo de pérdida de datos ante caídas de red o cierres accidentales.
  3. Fricción ergonómica en pantallas táctiles (Mobile UX): Aunque los botones respetan el área táctil mínima de 44×44 px y se
  previno el zoom involuntario de iOS (font-size: 16px en inputs móviles), la barra de formato rápido (Deshacer, Rehacer, Negrita,
  Cursiva, Listas) está totalmente oculta en dispositivos móviles (hidden sm:flex). En smartphones, el usuario depende del menú
  flotante de selección (EditorBubbleMenu), el cual frecuentemente colisiona con el menú nativo del sistema operativo
  (Copiar/Pegar de iOS/Android) o queda oculto tras el teclado virtual.
  4. Código dormido en el bundle PWA (Dormant Code): Existen dos submódulos completamente programados y funcionales: el Asistente
  de Fundamentación en vivo (conectado al corpus SQLite) y el Cajón de Auditoría Contractual (ClauseAuditorDrawer.tsx con 10
  reglas de validez jurídica mexicana). Sin embargo, al estar reservados para la versión Desktop (DesktopFeatureLockModal.tsx),
  sus interfaces nunca se despliegan en la PWA, incrementando el peso del bundle JavaScript en producción sin aportar valor
  interactivo directo.
  ──────
  ## 2. Arquitectura y Flujo de Interacción del Módulo

  │ Diagram exceeds terminal width (325 > 132 cols)
  │ Displayed as code block. Widen terminal to view inline.

    flowchart TD
        A["Usuario entra a Ingeniería Jurídica (?tab=estudio)"] --> B{"¿Documento en blanco y sin tocar?"}
        B -->|Sí| C["Apertura automática de Biblioteca de Instrumentos"]
        B -->|No| D["Carga directa del Borrador Activo desde IndexedDB"]

        C -->|Selecciona Plantilla| E["Genera HTML base con variables y abre lienzo"]
        C -->|Documento en Blanco| D

        subgraph Lienzo ["Lienzo de Redacción (Visualización Carta)"]
            D --> F["Cabecera Membretada (Folio, Fecha, Estado)"]
            F --> G["Título editable del Instrumento"]
            G --> H["Editor TipTap (Tipografía Serif Justificada)"]
            H --> I["Apéndice de Notas al Pie Formales"]
            I --> J["Pie Institucional de Paginación"]
        end

        subgraph Acciones ["Barra de Herramientas y Servicios"]
            H -.->|Ctrl+S / Auto-guardado| K["Persistencia Local en IndexedDB"]
            H -.->|Exportar| L["Word .docx / PDF Membretado / TXT"]
            H -.->|Compartir| M["Web Share API / Portapapeles"]
            H -.->|Botones Desktop Lock| N["Upsell: Modal Descarga Lex Desktop"]
        end
  ──────
  ## 3. Diagnóstico de la Visualización del Editor

  ### A. La Metáfora de Hoja Membretada (.legal-letterhead)

  El lienzo del editor no se percibe como un simple procesador de textos genérico, sino como un documento legal institucional
  listo para firma o radicación:

  • Estructura del papel: El contenedor <article className="legal-letterhead"> utiliza bordes sutiles border-slate-200/90, fondo
  blanco puro, elevación ligera (shadow-sm) y una anchura máxima acotada (max-w-4xl), lo que evita que las líneas de texto se
  extiendan demasiado en monitores panorámicos (respetando la longitud óptima de lectura de 65–85 caracteres por línea).
  • Banda de autenticidad y Folio: En la parte superior, una doble frontera (remate dorado superior border-legal-gold y separación
  inferior border-slate-900/80) enmarca el logotipo institucional, la denominación de la firma, el folio único alfanumérico (ej.
  FOLIO · 4F8A2B9C), la fecha y el distintivo Borrador.
  • Pie de página del documento: Delimita claramente el alcance de la edición frente a la impresión final con la leyenda: "Lex
  Corporativo PWA · Borradores locales · Vista de edición · Paginación al exportar".

  ### B. Tipografía y Jerarquía Visual (.studio-editor)

  En index.css:299-328:

  • Tipografía editorial: Se emplea Georgia, 'Times New Roman', serif para el cuerpo del texto con line-height: 1.85 e
  interlineado cómodo.
  • Justificación de párrafos: Los párrafos <p> cuentan con text-align: justify, estándar fundamental en la práctica jurídica
  hispanoamericana para escritos judiciales y contratos.
  • Encabezados legales: h1 se renderiza centrado en negrita (1.35rem) y h2 cuenta con un filete inferior separator (border-
  bottom: 1px solid #e2e8f0), ideal para cláusulas principales (ej. DECLARACIONES, CLÁUSULAS).
  • Citas en bloque: Las etiquetas <blockquote> poseen sangría distintiva, borde izquierdo dorado de 3px (#c5a059), fondo ámbar
  suave (#fffbeb) y texto en gris formal (#475569).
  • Superíndices y Notas al Pie: Las llamadas a notas <sup>[N]</sup> se visualizan como etiquetas estilizadas (background-color:
  #fef3c7; color: #92400e; border: 1px solid #fde68a), otorgando una referencia visual instantánea entre el cuerpo del texto y el
  FootnotesAppendix.
  ──────
  ## 4. Diagnóstico de la Experiencia de Usuario (Desktop vs. Mobile)

  ### Matriz Comparativa de Ergonomía

   Criterio de Evaluación           | Experiencia en Escritorio (Deskt… | Experiencia en Móvil (PWA Mobile)  | Diagnóstico Técni…
  ----------------------------------|-----------------------------------|------------------------------------|--------------------
   Formato Rápido de Texto          | Barra visible (Undo, Redo, B, I,  | Oculta (hidden sm:flex). Depende   |    🔴 Fricción
                                    | Listas) en cabecera del editor.   | únicamente de selección con        |      Crítica
                                    |                                   | EditorBubbleMenu.                  |
   Deshacer / Rehacer accidental    | Atajos Ctrl+Z / Ctrl+Y y botones  | Inaccesible de forma táctil. Si se |    🔴 Fricción
                                    | dedicados accesibles.             | borra texto por error, no hay      |      Crítica
                                    |                                   | botón para recuperar.              |
   Áreas Táctiles (Touch Targets)   | Excelente espaciado y respuesta   | Cumple estándar de 44×44 px en     |    🟢 Conforme
                                    | al clic.                          | botones principales (.studio-      |
                                    |                                   | action, inputs).                   |
   Prevención de Zoom en iOS        | No aplica.                        | Inputs configurados en 16px (text- |    🟢 Excelente
                                    |                                   | base sm:text-xs), previniendo zoom |
                                    |                                   | de Safari.                         |
   Safe Area Insets (Notch / Barra) | Espaciado estándar.               | Padding inferior amplio (pb-24 +   |    🟢 Excelente
                                    |                                   | pb-16), evitando solapamiento con  |
                                    |                                   | el Bottom Nav.                     |
   Pantalla siempre encendida       | Compatible con Screen Wake Lock   | Screen Wake Lock activo para       |    🟢 Excelente
                                    | API.                              | evitar bloqueo de pantalla durante |
                                    |                                   | lecturas en sala/audiencia.        |
   Acciones de Compartir            | Descarga de Word / PDF / TXT o    | Integración con navigator.share    |    🟢 Excelente
                                    | copia al portapapeles.            | nativo para enviar a WhatsApp o    |
                                    |                                   | correo de 1 toque.                 |
   Barra Superior de Acciones       | Todos los botones visibles y bien | Requiere desplazamiento horizontal | 🟡 Oportunidad de
                                    | distribuidos.                     | (overflow-x-auto) en pantallas     |       Mejora
                                    |                                   | angostas (< 375px).                |
  ──────
  ## 5. Análisis de Productización y Conversión (Upsell a Desktop)

  El módulo cumple un rol estratégico dual: proveer una herramienta de redacción funcional y actuar como puerta de conversión
  (Gateway) hacia la versión de escritorio nativa:

  │ Diagram exceeds terminal width (176 > 132 cols)
  │ Displayed as code block. Widen terminal to view inline.

    graph LR
        A["Usuario en Web PWA"] --> B["Botones 'Auditar' / 'Fundamentar'"]
        B -->|Clic o Selección| C["DesktopFeatureLockModal"]
        C --> D["Propuesta de Valor: Motor SQLite Local & Privacidad Zero-Telemetry"]
        D --> E["Descarga Directa Instalador Windows v1.2.0 (88.5 MB)"]
        D --> F["Ficha Técnica Oficial (?tab=desktop)"]

  ### Hallazgo: Submódulos Dormidos (Dormant Code)

  • En DraftingStudio.tsx:794-979 reside el JSX completo del Asistente de Fundamentación y en ClauseAuditorDrawer.tsx las 10
  reglas de auditoría.
  • Debido a que los activadores en cabecera tienen asignado onClick={() => setLockedFeatureModal(...)}, estos dos paneles nunca
  se muestran al usuario final.
  • Impacto: Los componentes se importan de forma estática en el bundle principal de DraftingStudio-*.js, añadiendo peso muerto en
  la descarga inicial de la PWA para usuarios móviles.
  ──────
  ## 6. Hallazgos y Fricciones Detectadas

  ### 🔴 Hallazgo 1: Falta de barra de herramientas táctil flotante o inferior en móvil

  • Ubicación: DraftingStudio.tsx:721-764.
  • Impacto: En smartphones, al escribir o editar, el usuario no dispone de botones para Deshacer, Rehacer, o aplicar Negrita /
  Listas. Depender del EditorBubbleMenu en pantallas táctiles es problemático porque el teclado virtual de iOS/Android reduce el
  espacio visible y activa el menú del sistema (Copiar, Pegar, Seleccionar todo), tapando la burbuja del editor.

  ### 🟡 Hallazgo 2: Apertura automática invasiva del catálogo en dispositivos móviles

  • Ubicación: DraftingStudio.tsx:124-125.
  • Impacto: Al ingresar por primera vez o con un borrador limpio, el modal de plantillas salta automáticamente cubriendo el 100%
  de la pantalla en móvil. Si bien en desktop ayuda a reducir clics, en pantallas táctiles genera sensación de "desvío" o pérdida
  del contexto del lienzo.

  ### 🟡 Hallazgo 3: Densidad de la barra superior en pantallas angostas

  • Ubicación: DraftingStudio.tsx:475-620.
  • Impacto: En dispositivos con pantallas menores a 375 px de ancho (como iPhone SE o Galaxy A series), la fila de botones
  superiores se desborda y el usuario debe desplazarse horizontalmente a ciegas para encontrar el botón de "Exportar" o
  "Borradores".

  ### 🟢 Hallazgo 4: Excelente integración de citas desde el Buscador Normativo

  • Ubicación: BuscadorLegal.tsx y studio-session.ts:31-36.
  • Impacto: El mecanismo de puente inter-módulos mediante lex_studio_pending_citation en sessionStorage funciona de forma
  impecable: un usuario investiga leyes en el fundamentador, pulsa "Citar en Ingeniería Jurídica" y el editor recibe
  automáticamente el artículo sin recargar la página.
  ──────
  ## 7. Plan de Acción Recomendado

  │ Diagram exceeds terminal width (154 > 132 cols)
  │ Displayed as code block. Widen terminal to view inline.

    flowchart LR
        subgraph Fase 1 ["Fase 1: Ergonomía Móvil Inmediata"]
            F1A["Barra de formato táctil adherida al teclado/lienzo en móvil"]
            F1B["Botones accesibles de Deshacer / Rehacer en móvil"]
        end
        subgraph Fase 2 ["Fase 2: Optimización de Bundle y Navegación"]
            F2A["Depuración o Lazy Load de Drawer dormidos"]
            F2B["Compactación responsiva de la barra superior"]
        end
        subgraph Fase 3 ["Fase 3: Visualización Avanzada"]
            F3A["Modo Lectura / Pantalla Completa"]
            F3B["Contador de palabras y estimación de páginas físicas"]
        end
        F1A --> F2A --> F3A

  ### Fase 1: Ergonomía Móvil Inmediata (Prioridad Alta)

  1. Barra de formato móvil (Mobile Keyboard Accessory Bar): Añadir una mini-barra de herramientas fija sobre el teclado o al pie
  del lienzo cuando la pantalla sea móvil (sm:hidden), con accesos directos a: Deshacer, Rehacer, Negrita, Cursiva, Lista y Citar.
  2. Control de apertura del catálogo: En dispositivos móviles, mostrar un banner sutil en la cabecera en lugar de abrir el
  diálogo modal a pantalla completa automáticamente.

  ### Fase 2: Optimización del Bundle y Limpieza Arquitectónica (Mediano Plazo)

  1. Lazy Loading o desacoplamiento de componentes exclusivos: Cargar ClauseAuditorDrawer.tsx y el drawer del asistente únicamente
  bajo demanda mediante React.lazy() o eliminar el código que quedó eclipsado por el upsell de Desktop, reduciendo los KB del
  bundle inicial de la PWA.
  2. Menú de acciones móviles agrupado: Condensar las acciones secundarias de la cabecera móvil en un menú descolgable de 3 puntos
  (...), priorizando en vista únicamente Instrumentos y Exportar.

  ### Fase 3: Visualización y Ergonomía Editorial Avanzada (Evolutivo)

  1. Modo Enfoque / Pantalla Completa: Permitir ocultar el AppShell superior y el BottomNav para transformar el smartphone o
  tablet en una máquina de escribir jurídica libre de distracciones.
  2. Regla de paginación estimada: Mostrar un indicador sutil en el margen derecho que calcule aproximadamente cuántas cuartillas
  impresas abarcará el texto antes de generar el PDF membretado.
  ──────
  ## 8. Estado de Ejecución de las Fases

  ### ✅ Fase 1: Ergonomía Móvil Inmediata (Implementada)
  • Barra de formato táctil adherida y sticky: Implementada barra flotante adherida bajo el header global (`sticky top-16 z-20`) con botones táctiles mínimos optimizados (36–44 px) para Deshacer, Rehacer, Negrita, Cursiva, Lista con viñetas y botón directo Citar con feedback háptico (`navigator.vibrate`).
  • Control de apertura del catálogo en móvil: En pantallas menores a 640 px el modal bloqueante ya no se abre automáticamente sobre el borrador limpio; en su lugar, se despliega un banner sutil con opción de "Explorar" o descartar sin interrumpir la vista del lienzo.
  • Mejora en EditorBubbleMenu y TemplateCatalogModal: Áreas táctiles ampliadas y feedback de vibración integrado.

  ### ✅ Fase 2: Optimización del Bundle y Limpieza Arquitectónica (Implementada)
  • Code-Splitting y Lazy Loading:
    - `ClauseAuditorDrawer.tsx` ahora se carga asíncronamente bajo demanda mediante `React.lazy()` y `<Suspense>`.
    - Extracción y desacoplamiento del `AssistantFundamentadorDrawer.tsx` (con su integración a `executeCorpusSearch`), cargado también mediante `React.lazy()`.
    - Resultado: Eliminación de dependencias del corpus SQLite en el bundle inicial de `DraftingStudio`, reduciendo el peso de carga inicial.
  • Menú de acciones móviles agrupado (3 puntos):
    - La cabecera móvil (`sm:hidden`) ahora prioriza únicamente `Instrumentos` y `Exportar` en vista directa, evitando el desbordamiento horizontal en pantallas angostas (< 375 px).
    - Todas las acciones secundarias (`Borradores`, `Importar`, `Nuevo`, `Variables`, `Auditar` y `Fundamentar`) se agruparon en un menú desplegable de 3 puntos (`MoreVertical`).
  • Verificación y Cobertura: 30 suites de prueba con 150 pruebas automatizadas pasando al 100%, compilación TypeScript limpia y build Vite PWA exitoso.