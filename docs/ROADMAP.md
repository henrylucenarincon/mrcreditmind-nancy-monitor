# Nancy Roadmap

Ultima actualizacion: 2026-05-04

## Fase 0: Documentacion

Estado: Completada

Objetivo: dejar el contexto del proyecto dentro del repo para que futuras sesiones de Codex/ChatGPT puedan retomar sin reexplicar todo.

Entregables:

- `docs/PROJECT_CONTEXT.md`
- `docs/PROJECT_STATUS.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/CODEX_PROMPTS.md`
- Enlaces desde `README.md`

Criterio de salida:

- La documentacion explica vision, modulos, arquitectura, integraciones, riesgos y forma de trabajo.

## Fase 1: Seguridad y Acceso

Estado: Completada para Nancy Monitor

Objetivo: preparar el panel para manejar datos internos y sensibles sin exposicion accidental.

Entregables:

- Validacion de sesion y rol en APIs internas.
- Modelo de perfiles/roles internos.
- Politicas RLS revisadas.
- Auditoria minima para accesos sensibles.
- Matcher/rutas privadas actualizado.
- Migracion Supabase de roles internos y auditoria.
- Cache hardening de rutas internas del panel.

Criterio de salida:

- Usuarios no autenticados reciben 401.
- Usuarios sin rol suficiente reciben 403.
- Accesos sensibles quedan registrados.
- Las APIs no dependen de service role sin controles explicitos.
- El HTML interno no queda cacheado agresivamente por Hostinger/HCDN.

Estado 2026-05-04:

- Completado y validado en produccion para Monitor: helpers de auth/roles, `internal_user_profiles`, `security_audit_log`, migracion Supabase, proxy de rutas internas, auditoria minima y cache hardening.
- Validado en Hostinger/HCDN: `/`, `/login`, `/select` y `/copilot` cargan correctamente; rutas internas son dinamicas/no-store; `/_next/static/*` conserva cache immutable.
- Pendiente fuera de Fase 1: extender role-gating/auditoria a Copilot, implementar masking centralizado y reducir service role con RLS mas granular.

## Fase 2: Nancy Copilot Seguro

Estado: En progreso

Objetivo: convertir Nancy Copilot en una herramienta util y segura para consultar clientes, documentos, funding y operaciones.

Entregables:

- Role-gating en APIs de Copilot.
- Auditoria de consultas y acciones de Copilot.
- Masking centralizado para datos Nivel 2, 3 y 4.
- Perfil normalizado de cliente.
- Herramientas confiables para FunnelUp, Google Drive y Google Sheets.
- Respuestas con fuentes, confianza, faltantes y proximo paso.
- Manejo claro de fuentes no disponibles.
- Politicas de privacidad aplicadas a respuestas.

Criterio de salida:

- Copilot responde preguntas reales del equipo usando datos internos permitidos y auditados.
- Las respuestas no inventan datos y citan la fuente interna usada.
- Los datos sensibles se enmascaran segun nivel y rol.

Estado 2026-05-04:

- Implementado: role-gating en `app/api/copilot/**` con roles `admin`, `manager`, `ops` y `sales`.
- Implementado: `readonly` bloqueado para APIs de Copilot.
- Implementado: auditoria minima de listado/creacion de conversaciones, lectura de mensajes, envio de mensajes, denegaciones 403 y errores relevantes.
- Implementado: UI de Copilot maneja 401, 403, 500, respuestas no JSON y estructuras inesperadas sin romper la pantalla.
- Pendiente: masking centralizado, ficha cliente normalizada, permisos por dato/fuente y auditoria extendida de tools.

## Fase 3: Nancy Ops

Objetivo: crear el centro operativo/documental interno de Nancy.

Entregables:

- Ruta `/ops` y entrada desde el selector.
- Buscador de clientes/documentos.
- Ficha operacional por cliente.
- Checklist por servicio/onboarding.
- Vista read-only de documentos encontrados y faltantes.
- Registro de auditoria en consultas sensibles.

Criterio de salida:

- El equipo puede encontrar clientes, documentos y estado operativo sin editar datos criticos.

## Fase 4: Nancy Voice

Objetivo: preparar llamadas y conversaciones de voz sobre la misma base segura de Nancy.

Entregables:

- Interfaces `VoiceProvider`, `VoiceCallRequest`, `VoiceCallResult` y `VoiceOutcome`.
- Tabla para registrar llamadas, transcripciones, resumenes y resultados.
- API segura para llamadas.
- `MockVoiceProvider` para pruebas.
- Seleccion e integracion de proveedor real cuando este aprobado.

Criterio de salida:

- Existe una base testeable de Voice sin depender todavia de un proveedor definitivo.

## Fase 5: Automatizaciones Avanzadas

Objetivo: permitir que Nancy prepare y ejecute flujos operativos con controles.

Entregables:

- Acciones controladas hacia n8n, FunnelUp, Google Sheets y canales internos.
- Confirmaciones para cambios sensibles.
- Aprobaciones segun rol/criticidad.
- Notificaciones internas.
- Reintentos y manejo de errores.
- Registro completo de acciones ejecutadas.

Criterio de salida:

- Nancy puede asistir tareas operativas reales con permisos, auditoria y recuperacion ante errores.
