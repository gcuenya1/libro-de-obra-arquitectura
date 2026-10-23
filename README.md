# Libro de Obra Digital

Sistema web (PWA) que automatiza el **Libro de Obra** a partir de la planilla Excel `LIBRO DE OBRA P01.xlsx`.
Proyecto interdisciplinario **Arquitectura × Desarrollo de Software**.

## Despliegue en Netlify

Es un sitio estático: no necesita compilación.

**Opción A — Arrastrar y soltar**
1. Entrá a https://app.netlify.com/drop
2. Arrastrá la carpeta `libro-de-obra` completa.

**Opción B — Desde GitHub**
1. Subí esta carpeta a un repositorio.
2. En Netlify: *Add new site → Import from Git*, elegí el repo.
3. Build command: *(vacío)* · Publish directory: `.` (ya está configurado en `netlify.toml`).

Prueba local: `python3 -m http.server 8080` y abrir http://localhost:8080

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| Panel | Avance general, KPIs, curva de avance planificado vs. real, clima con alertas para hormigonado, alertas (ART vencidas, atrasos, observaciones, órdenes vencidas) |
| Datos de la obra | Hoja "Datos": domicilio, catastro, expedientes del Colegio y municipal, plazos, portada |
| Actores y personal | Comitente, proyectista, director y representante técnico, administrador, con firma digital. Mano de obra con control de vencimiento de ART |
| Tareas previas | Checklist de la hoja "Tareas previas de proyecto" |
| Planillas de control | 52 planillas / 1.283 ítems del Excel en 16 capítulos. Por ítem: estado (conforme, observado, en proceso, N/A), fecha, S/Plano, seguridad, valor medido, observaciones y fotos con la cámara. Búsqueda global, filtros, rubros personalizados |
| Planificación | Gantt por rubro con planificación automática, barras de avance real y detección de atrasos |
| Bitácora diaria | Entradas con clima real del día (Open-Meteo), personal, rubros trabajados y fotos |
| Órdenes y notas | Órdenes de servicio y notas de pedido numeradas, con plazo, estado y firma |
| Fotos | Galería por rubro con portada, edición y descarga |
| Actas | Inicio, recepción provisoria y definitiva, autocompletadas y con firmas |
| Imprimir y exportar | Libro completo en PDF (vía impresión), Excel (.xlsx), respaldo .json con fotos e importación |
| Presupuesto | Cómputo por ítem vinculado a cada planilla, coeficiente de pase (gastos generales, beneficio, IVA), incidencia por capítulo y costo por m² |
| Certificados de avance | Certificación mensual que toma el avance de las planillas al cierre del período, con redeterminación por índice, amortización de anticipo, fondo de reparo, curva de inversión y PDF |
| Calculadoras | Hormigón, mampostería, pisos/revestimientos, pintura, escalera (Blondel), pendientes, hierros |

## Datos y privacidad

Todo se guarda en el navegador del dispositivo (IndexedDB). No hay servidor ni cuentas.
Para pasar una obra a otro equipo: **Imprimir y exportar → Respaldo completo (.json)** y luego **Importar respaldo**.
Funciona sin conexión una vez cargado (service worker); el clima requiere internet.

## Personalización

- `js/config.js`: nombre, institución, carreras y equipo (aparecen en la portada y en "Acerca del proyecto").
- `js/template.js`: planillas generadas desde el Excel (capítulos, rubros e ítems). Se puede regenerar o editar a mano.
- Colores y tipografía: variables CSS al inicio de `css/styles.css`.

## Estructura

```
index.html            Shell de la aplicación
css/styles.css        Estilos (claro/oscuro, responsive, impresión)
js/template.js        Planillas del libro (datos)
js/config.js          Configuración institucional
js/ui.js              Utilidades, iconos, gráficos SVG, modales, firma
js/store.js           IndexedDB, modelo, estadísticas, clima, alertas
js/demo.js            Obra de demostración
js/views-*.js         Vistas (views-economia.js: presupuesto y certificados)
js/app.js             Enrutador, layout, inicio y panel
vendor/xlsx.full.min.js  SheetJS (exportación Excel)
sw.js, manifest.webmanifest  PWA instalable / offline
```

## A revisar por la cátedra de Arquitectura

- Textos legales de las actas (el Excel cita “Art. 1646 y 1647 bis del Código Civil”; el campo es editable).
- Rendimientos de las calculadoras (son orientativos).
- Esquema de certificación (redeterminación, anticipo, fondo de reparo) y precios de ejemplo de la demo.
- Duraciones por capítulo de la planificación automática (`DUR` y `START_OFF` en `js/store.js`).
