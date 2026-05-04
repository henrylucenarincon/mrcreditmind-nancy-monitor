# Nancy Project Status

Ultima actualizacion: 2026-05-04

## Estado Actual

Nancy Monitor es un MVP funcional dentro del panel. Nancy Copilot tiene una base visual, API, historial y conectores iniciales. Nancy Chat externo ya funciona fuera del repo mediante WhatsApp/Messenger, n8n y FunnelUp/Funnel App. Nancy Ops y Nancy Voice siguen en etapa de diseno.

El repo actual es una aplicacion Next.js/TypeScript llamada `nancy-monitor`, con Supabase como base de datos y despliegue previsto en Hostinger Node.js.

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
- APIs de Nancy Monitor protegidas por sesion y rol antes de usar service role server-side.
- Clientes/conectores para FunnelUp, Google Drive y Google Sheets.
- Variables de entorno de ejemplo para Supabase, OpenAI, FunnelUp, Drive y Sheets.
- Assets de marca de Mr.CREDITMIND/Nancy.
- Script de build standalone para despliegue Node.js.

Fuera del repo ya existe:

- Atencion externa por WhatsApp y Messenger.
- Flujos n8n conectados con FunnelUp/Funnel App.
- Automatizaciones de agendamiento y callbacks.
- Registro de senales conversacionales para Monitor.

## Que Esta Pendiente

- Aplicar la migracion de seguridad en Supabase y crear perfiles internos activos para usuarios autorizados.
- Extender role-gating a Copilot antes de conectarlo a datos internos mas sensibles.
- Agregar auditoria central para Copilot, Drive, Sheets, FunnelUp, Ops y Voice.
- Reducir gradualmente el uso de service role en endpoints consumidos por frontend.
- Normalizar datos de cliente entre FunnelUp, Drive, Sheets y Supabase.
- Convertir Copilot en asistente real con fuentes internas confiables y respuestas con evidencias.
- Crear Nancy Ops como seccion propia.
- Crear contratos de datos para Nancy Voice y proveedor mock.
- Implementar edicion controlada con confirmacion, permisos y logs.
- Documentar workflows n8n existentes.
- Validar viabilidad tecnica y autorizada de SmartCredit.

## Prioridades Inmediatas

1. Aplicar `supabase/migrations/20260504_02_security_roles_audit.sql`.
2. Crear filas activas en `internal_user_profiles` para usuarios internos autorizados.
3. Validar en entorno desplegado que Monitor devuelva 401 sin sesion y 403 sin perfil/rol.
4. Extender roles/auditoria a Copilot antes de ampliar fuentes internas sensibles.
5. Normalizar perfil de cliente para Copilot usando FunnelUp como fuente principal.
6. Mantener Copilot/Ops inicialmente read-only hasta que existan permisos, validacion y auditoria.

## Estado de Seguridad

Monitor ahora valida usuario autenticado y rol interno antes de consultar datos con service role server-side. Copilot valida usuario autenticado para historial, pero aun necesita role-gating y auditoria antes de ampliar datos internos reales. Ver `docs/SECURITY_NOTES.md`.

## Notas de Entrega

Este estado describe el proyecto al 2026-05-04. Si se agregan rutas, tablas, proveedores o permisos nuevos, actualizar este archivo en el mismo PR/tarea.
