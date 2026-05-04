# Nancy Project Context

Ultima actualizacion: 2026-05-04

Este documento es el punto de entrada para entender Nancy en futuras sesiones de Codex o ChatGPT. No debe contener secretos, tokens, contrasenas, SSN completos ni datos reales de clientes.

## Vision General

Nancy es la secretaria virtual de IA de Mr.CREDITMIND. No es solo Nancy Monitor: es un sistema compuesto por atencion externa, monitoreo, asistencia interna, busqueda documental, automatizacion operativa y futuras capacidades de voz.

Nancy debe ayudar al equipo a:

- Atender leads y clientes por canales externos.
- Registrar y revisar conversaciones.
- Consultar informacion interna de clientes, documentos, funding y procesos.
- Preparar acciones operativas con trazabilidad.
- Ejecutar automatizaciones controladas.
- Eventualmente hablar por voz con clientes o miembros del equipo.

## Modulos

### Nancy Chat Externo

Agente externo que atiende por WhatsApp y Messenger. Hoy funciona fuera del repo mediante n8n y FunnelUp/Funnel App. Registra senales de conversacion que alimentan Nancy Monitor.

Responsabilidades:

- Responder leads/clientes en canales externos.
- Detectar intencion, servicio recomendado, solicitud de humano y callback.
- Enviar eventos o logs hacia Supabase cuando aplique.
- Coordinar agendamiento y callbacks mediante automatizaciones.

### Nancy Monitor

Panel interno en este repo para ver conversaciones de WhatsApp/Messenger. Es el primer producto visible dentro del panel.

Responsabilidades:

- Listar conversaciones recientes.
- Mostrar mensajes por conversacion.
- Mostrar senales como servicio recomendado, intencion de compra, humano y callback.
- Servir como base para filtros, triage y acciones futuras.

### Nancy Copilot

Asistente interno para el equipo de Mr.CREDITMIND. Ya existe una base visual y API en este repo.

Responsabilidades objetivo:

- Buscar clientes/leads en FunnelUp.
- Consultar resumen de cliente, onboarding, documentos y funding.
- Buscar carpetas/archivos en Google Drive.
- Consultar datos operativos en Google Sheets.
- Responder con fuentes, confianza y proximos pasos.
- Respetar roles, permisos, masking y auditoria antes de exponer datos sensibles.

### Nancy Voice

Modulo futuro para llamadas y conversaciones de voz.

Responsabilidades objetivo:

- Recibir o hacer llamadas segun casos autorizados.
- Transcribir, resumir y clasificar llamadas.
- Registrar resultado, responsable y proxima accion.
- Reutilizar permisos, auditoria y herramientas compartidas con Copilot/Ops.

### Nancy Ops

Centro operativo y documental futuro. Debe ser la interfaz interna para busqueda, revision y, mas adelante, edicion controlada de datos/documentos.

Responsabilidades objetivo:

- Buscar clientes, documentos y expedientes.
- Mostrar checklist por servicio.
- Ver estado de onboarding, funding y bloqueos.
- Preparar actualizaciones con aprobacion cuando sean sensibles.
- Registrar auditoria de accesos y cambios.

## Arquitectura Actual

```text
WhatsApp / Messenger
        |
        v
       n8n
        |
        v
FunnelUp / Funnel App  <->  Supabase conversations_log
                                  |
                                  v
                         Nancy Monitor en Next.js
```

Dentro del repo actual:

- Next.js/TypeScript contiene rutas de Monitor, login, selector y Copilot.
- Supabase almacena logs/resumenes de conversaciones y el historial de Copilot.
- `/api/conversations` y `/api/conversations/[conversationId]` exponen datos para Monitor.
- `/api/copilot/chat` ejecuta Nancy Copilot con OpenAI y fallback local.
- Hay clientes preparados para Supabase, FunnelUp, Google Drive y Google Sheets.
- El despliegue objetivo es Node.js/Next.js en Hostinger.

Principio tecnico clave: Monitor, Copilot, Ops y Voice deben compartir la misma capa de permisos, auditoria, normalizacion de datos y herramientas. No conviene crear "cerebros" aislados para cada modulo.

## Integraciones Actuales

- WhatsApp y Messenger: canales externos de atencion.
- n8n: orquestacion de flujos, callbacks y automatizaciones.
- FunnelUp/Funnel App: CRM principal para contactos, campos, etapas y servicios.
- Supabase: base del panel, conversaciones, historial y futuras tablas de auditoria/permisos.
- OpenAI: motor conversacional de Copilot.
- Google Drive: conector preparado para metadata de carpetas/documentos.
- Google Sheets: conector preparado para funding y datos operativos.
- Hostinger Node.js: hosting previsto para el panel Next.js.

## Integraciones Futuras

- Slack o canal interno equivalente para alertas y tareas.
- Proveedor de voz para Nancy Voice.
- SmartCredit, solo si existe API o acceso autorizado viable.
- Automatizaciones avanzadas desde Ops/Copilot hacia n8n, FunnelUp, Sheets y canales internos.
- Busqueda documental mas profunda sobre Drive, siempre con permisos y auditoria.

## Alcance Funcional

Alcance actual:

- Monitor interno de conversaciones.
- Selector entre Monitor y Copilot.
- Base de Copilot con historial por usuario autenticado.
- Conectores tecnicos iniciales para FunnelUp, Drive y Sheets.
- Migraciones Supabase para conversaciones y Copilot.

Alcance objetivo:

- Monitor con filtros, triage y acciones rapidas.
- Copilot real con datos internos normalizados.
- Ops read-only para clientes, documentos, onboarding y funding.
- Ops con edicion controlada y aprobaciones.
- Voice con llamadas, transcripcion, resumen y resultado.
- Automatizaciones avanzadas con trazabilidad.

Fuera de alcance hasta validacion:

- Exponer SSN, credenciales o documentos sensibles en chat normal.
- Editar datos criticos sin permisos, confirmacion y auditoria.
- Integrar SmartCredit sin autorizacion tecnica clara.

## Riesgos de Seguridad

- Endpoints internos de conversaciones pueden exponer datos si no validan sesion y rol.
- El uso de `SUPABASE_SERVICE_ROLE_KEY` en endpoints consumidos por frontend debe limitarse y rodearse de controles explicitos.
- Rutas nuevas pueden quedar fuera del `proxy`/middleware si no se actualiza el matcher.
- Falta un modelo central de roles internos.
- Falta auditoria integral de consultas sensibles.
- Drive links, documentos financieros, identidad y credenciales requieren masking y permisos estrictos.
- Voice y Ops pueden ampliar el riesgo si se habilitan antes de permisos, auditoria y contratos de datos.

## Reglas de Privacidad

- No guardar secretos ni datos reales sensibles en documentacion.
- No mostrar SSN completo, credenciales, tokens ni contrasenas en chat.
- No devolver contenido completo de documentos sensibles por defecto.
- Enmascarar telefonos, emails, IDs y enlaces cuando no sean necesarios.
- Registrar auditoria al consultar o modificar informacion sensible.
- Aplicar permisos por rol antes de mostrar datos de clientes.
- Separar lectura, escritura y aprobacion para acciones de alto impacto.
- Nancy no debe inventar datos de cliente; si una fuente no responde, debe decirlo.

Clasificacion sugerida:

| Nivel | Ejemplos | Regla |
| --- | --- | --- |
| Nivel 1 - Operativo general | Nombre, servicio, etapa, ultima interaccion | Visible para usuarios internos autenticados con rol permitido. |
| Nivel 2 - Contacto/operacion sensible | Telefono, email, Drive links, documentos faltantes | Visible por rol; auditar accesos importantes. |
| Nivel 3 - Financiero/identidad | Bank statements, ID, pasaporte, SSN como archivo, reportes | No mostrar completo por defecto; requiere permiso y auditoria. |
| Nivel 4 - Credenciales | SmartCredit, tokens, API keys | Nunca devolver en chat normal; segregar, cifrar y auditar. |

## Forma de Trabajo con Codex

- Trabajar por fases pequenas, verificables y con entregables claros.
- Leer `docs/PROJECT_CONTEXT.md`, `docs/PROJECT_STATUS.md` y `docs/ROADMAP.md` antes de proponer cambios grandes.
- No modificar logica funcional, APIs, Supabase ni UI cuando la tarea sea solo documental.
- Para cambios de codigo, revisar primero patrones existentes de Next.js, Supabase y conectores.
- Mantener cambios acotados y no refactorizar fuera del alcance.
- Antes de tocar datos sensibles, definir roles, permisos, masking y auditoria.
- Ejecutar `npm run lint` o `npm run build` cuando el cambio toque codigo o configuracion.
- Documentar decisiones tecnicas en `docs/DECISIONS.md`.
- Guardar prompts utiles en `docs/CODEX_PROMPTS.md`.
