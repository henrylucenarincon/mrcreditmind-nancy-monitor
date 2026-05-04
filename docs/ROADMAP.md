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

Estado: Completada para proteccion base de APIs

Objetivo: proteger Nancy Copilot antes de ampliar capacidades con FunnelUp, Google Drive, Google Sheets, documentos o datos sensibles.

Entregables:

- Role-gating en APIs de Copilot.
- Auditoria de consultas y acciones de Copilot.
- `readonly` bloqueado para APIs de Copilot.
- Manejo seguro de 401, 403, 500, respuestas no JSON y estructuras inesperadas en UI.

Criterio de salida:

- Usuarios sin sesion reciben 401.
- Usuarios autenticados sin rol permitido reciben 403.
- Roles `admin`, `manager`, `ops` y `sales` pueden usar APIs de Copilot.
- `readonly` no puede usar APIs de Copilot.
- Accesos y errores relevantes quedan auditados sin guardar prompts completos ni respuestas completas.

Estado 2026-05-04:

- Implementado: role-gating en `app/api/copilot/**` con roles `admin`, `manager`, `ops` y `sales`.
- Implementado: `readonly` bloqueado para APIs de Copilot.
- Implementado: auditoria minima de listado/creacion de conversaciones, lectura de mensajes, envio de mensajes, denegaciones 403 y errores relevantes.
- Implementado: UI de Copilot maneja 401, 403, 500, respuestas no JSON y estructuras inesperadas sin romper la pantalla.
- Pendiente fuera de Fase 2: ficha cliente normalizada, permisos por dato/fuente y auditoria extendida de tools.

## Fase 2.1: Masking y Niveles de Sensibilidad

Estado: Base central implementada

Objetivo: crear una capa compartida para clasificar y enmascarar datos sensibles antes de ampliar Copilot con fuentes reales.

Entregables:

- Niveles `public_operational`, `internal`, `sensitive`, `highly_sensitive` y `secret`.
- Clasificacion inicial de campos tipicos de Nancy/Mr.CREDITMIND.
- Helpers `classifyField`, `maskValue`, `maskObject`, `redactSecretsFromText` y `shouldExposeField`.
- Sanitizacion central de metadata en `logSecurityEvent`.
- Ejemplos de validacion manual documentados en `docs/SECURITY_NOTES.md`.

Criterio de salida:

- `security_audit_log` no guarda prompts completos, respuestas completas, SSN completos, tokens, passwords, URLs privadas completas ni documentos completos en metadata.
- Secretos siempre se redactionan.
- `highly_sensitive` requiere permisos explicitos y no se muestra completo por defecto.
- Queda documentado que el masking de outputs finales de Copilot se aplicara al construir la ficha cliente real.

Estado 2026-05-04:

- Implementado: modulos centrales en `lib/security/`.
- Implementado: sanitizacion automatica de metadata de auditoria.
- Implementado: sanitizacion basica de errores/logs internos de Copilot.
- Pendiente: aplicar masking a respuestas finales/model context cuando exista ficha cliente real.

## Fase 2.2: Ficha Real de Cliente en Copilot

Estado: Proxima fase

Objetivo: construir una ficha cliente real, segura y auditable dentro de Copilot usando fuentes permitidas.

Entregables:

- Perfil normalizado de cliente con FunnelUp como fuente principal.
- Cruce seguro con Google Drive, Google Sheets y Supabase cuando aplique.
- Respuestas con fuentes, confianza, faltantes y proximo paso.
- Auditoria extendida por tool: tool name, source type, resultado, errores genericos y conteos, sin contenido sensible.
- Aplicacion de masking a outputs finales segun rol, nivel y permiso por fuente.

Criterio de salida:

- Copilot responde preguntas reales del equipo usando datos internos permitidos, enmascarados y auditados.
- Las respuestas no inventan datos y citan la fuente interna usada.
- Los datos sensibles se muestran segun nivel, rol y permiso por fuente.

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
