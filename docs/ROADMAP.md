# Nancy Roadmap

Ultima actualizacion: 2026-05-04

## Fase 0: Documentacion

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

Objetivo: preparar el panel para manejar datos internos y sensibles sin exposicion accidental.

Entregables:

- Validacion de sesion y rol en APIs internas.
- Modelo de perfiles/roles internos.
- Politicas RLS revisadas.
- Auditoria minima para accesos sensibles.
- Matcher/rutas privadas actualizado.
- Reglas de masking para datos de Nivel 2, 3 y 4.

Criterio de salida:

- Usuarios no autenticados reciben 401.
- Usuarios sin rol suficiente reciben 403.
- Accesos sensibles quedan registrados.
- Las APIs no dependen de service role sin controles explicitos.

Estado 2026-05-04:

- Base implementada para Monitor: helpers de auth/roles, `internal_user_profiles`, `security_audit_log`, proxy de rutas internas y auditoria minima.
- Pendiente: aplicar migracion en Supabase, provisionar perfiles internos, extender role-gating/auditoria a Copilot y reducir service role con RLS mas granular.

## Fase 2: Copilot Real con Datos Internos

Objetivo: convertir Nancy Copilot en una herramienta util para consultar clientes, documentos, funding y operaciones.

Entregables:

- Perfil normalizado de cliente.
- Herramientas confiables para FunnelUp, Google Drive y Google Sheets.
- Respuestas con fuentes, confianza, faltantes y proximo paso.
- Manejo claro de fuentes no disponibles.
- Politicas de privacidad aplicadas a respuestas.

Criterio de salida:

- Copilot responde preguntas reales del equipo usando datos internos permitidos.
- Las respuestas no inventan datos y citan la fuente interna usada.

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
