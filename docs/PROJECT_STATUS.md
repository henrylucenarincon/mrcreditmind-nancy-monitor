# Nancy Project Status

Ultima actualizacion: 2026-05-04

## Estado Actual

Nancy Monitor es un MVP funcional dentro del panel y esta validado en produccion en Hostinger. Nancy Copilot tiene una base visual, API, historial y conectores iniciales. Nancy Chat externo ya funciona fuera del repo mediante WhatsApp/Messenger, n8n y FunnelUp/Funnel App. Nancy Ops y Nancy Voice siguen en etapa de diseno.

El repo actual es una aplicacion Next.js/TypeScript llamada `nancy-monitor`, con Supabase como base de datos y despliegue standalone en Hostinger Node.js.

## Fases Completadas

- Fase 0: documentacion base del proyecto.
- Fase 1: seguridad base de Nancy Monitor.
- Fase 1.1: migracion Supabase, roles internos y auditoria minima.
- Fase 1.2: cache hardening de rutas internas.
- Fase 2.1: proteccion base de APIs de Nancy Copilot.

## Validacion en Produccion

Validado en Hostinger/HCDN el 2026-05-04:

- `/` carga correctamente.
- `/login` carga correctamente.
- `/select` carga correctamente.
- `/copilot` carga correctamente.
- El problema de HTML viejo cacheado apuntando a chunks antiguos de Next.js quedo corregido.
- Las rutas internas se sirven como dinamicas/no-store.
- `/_next/static/*` mantiene cache largo immutable para assets versionados.

## Que Existe

- Aplicacion Next.js con App Router.
- Paginas principales: login, selector, Nancy Monitor y Nancy Copilot.
- Nancy Monitor consume `/api/conversations` y `/api/conversations/[conversationId]`.
- Supabase tiene `conversations_log` y vista `conversations_summary` para Monitor.
- Nancy Copilot tiene UI en `/copilot`.
- Nancy Copilot tiene `/api/copilot/chat` con OpenAI y fallback local.
- Historial de Copilot por usuario en `nancy_copilot_conversations` y `nancy_copilot_messages`.
- RLS para historial de Copilot por `user_id`.
- Helpers server-side para usuario autenticado, rol interno y respuestas 401/403.
- Modelo minimo `internal_user_profiles` con roles `admin`, `manager`, `ops`, `sales` y `readonly`.
- Tabla `security_audit_log` para auditoria minima.
- Migracion Supabase de roles/auditoria aplicada y validada.
- APIs de Nancy Monitor protegidas por sesion y rol antes de usar service role server-side.
- APIs de Nancy Copilot protegidas por sesion y rol interno; `readonly` queda bloqueado para Copilot.
- Auditoria minima de Copilot para listado/creacion de conversaciones, lectura de mensajes, envio de mensajes, denegaciones y errores relevantes.
- Manejo controlado de errores 401/403/500 y respuestas inesperadas en UI de Copilot.
- Rutas internas dinamicas/no-store para evitar HTML cacheado agresivamente en CDN.
- Clientes/conectores para FunnelUp, Google Drive y Google Sheets.
- Variables de entorno de ejemplo para Supabase, OpenAI, FunnelUp, Drive y Sheets.
- Assets de marca de Mr.CREDITMIND/Nancy.
- Script de build standalone para despliegue Node.js.

Fuera del repo ya existe:

- Atencion externa por WhatsApp y Messenger.
- Flujos n8n conectados con FunnelUp/Funnel App.
- Automatizaciones de agendamiento y callbacks.
- Registro de senales conversacionales para Monitor.

## Proximos Pasos

1. Implementar masking centralizado para datos Nivel 2, 3 y 4 antes de exponer mas fuentes sensibles en Copilot.
2. Construir ficha cliente normalizada usando FunnelUp como fuente principal y cruzando datos permitidos de Drive, Sheets y Supabase.
3. Definir permisos por dato/fuente para Drive, Sheets, FunnelUp, Ops y futuras herramientas de Copilot.
4. Extender auditoria de tools de Copilot con nombres de herramienta, source type, resultado y errores sin contenido sensible.
5. Reducir gradualmente el uso de service role en endpoints consumidos por frontend.
6. Mantener Copilot/Ops inicialmente read-only hasta que existan permisos, validacion y auditoria completa.
7. Documentar workflows n8n existentes.
8. Validar viabilidad tecnica y autorizada de SmartCredit.

## Estado de Seguridad

Monitor valida usuario autenticado y rol interno antes de consultar datos con service role server-side. La migracion de roles internos y auditoria minima ya fue completada. Copilot ahora valida usuario autenticado y rol interno en sus APIs; `admin`, `manager`, `ops` y `sales` pueden usar Copilot, mientras `readonly` queda bloqueado por ahora. Ver `docs/SECURITY_NOTES.md`.

## Notas de Entrega

Este estado describe el proyecto al 2026-05-04. Si se agregan rutas, tablas, proveedores o permisos nuevos, actualizar este archivo en el mismo PR/tarea.
