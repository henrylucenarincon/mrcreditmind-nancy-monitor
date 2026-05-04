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

- Endurecer autenticacion y autorizacion de APIs internas.
- Definir roles internos: admin, manager, ops, sales, readonly y roles especiales.
- Crear tabla/perfil de usuarios internos.
- Agregar auditoria central para accesos y cambios sensibles.
- Revisar el uso de service role en endpoints consumidos por frontend.
- Ampliar el `proxy`/middleware para cubrir rutas privadas nuevas.
- Normalizar datos de cliente entre FunnelUp, Drive, Sheets y Supabase.
- Convertir Copilot en asistente real con fuentes internas confiables y respuestas con evidencias.
- Crear Nancy Ops como seccion propia.
- Crear contratos de datos para Nancy Voice y proveedor mock.
- Implementar edicion controlada con confirmacion, permisos y logs.
- Documentar workflows n8n existentes.
- Validar viabilidad tecnica y autorizada de SmartCredit.

## Prioridades Inmediatas

1. Mantener esta documentacion viva en `docs/`.
2. Proteger APIs internas de Monitor con sesion y rol antes de exponer mas datos.
3. Crear modelo minimo de roles/permisos internos.
4. Crear auditoria minima para consultas sensibles.
5. Revisar rutas privadas y matcher de `proxy.ts`.
6. Normalizar perfil de cliente para Copilot usando FunnelUp como fuente principal.
7. Mantener Copilot/Ops inicialmente read-only hasta que existan permisos, validacion y auditoria.

## Estado de Seguridad

Copilot ya valida usuario autenticado para historial. Monitor depende de endpoints que consultan Supabase con service role; antes de crecer el alcance, esos endpoints deben validar usuario/rol y reducir exposicion de datos segun permisos.

## Notas de Entrega

Este estado describe el proyecto al 2026-05-04. Si se agregan rutas, tablas, proveedores o permisos nuevos, actualizar este archivo en el mismo PR/tarea.
