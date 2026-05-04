# Nancy Technical Decisions

Ultima actualizacion: 2026-05-04

Este archivo registra decisiones tecnicas importantes. Agregar entradas nuevas con fecha, contexto, decision, consecuencias y estado.

## Formato

```md
## YYYY-MM-DD - Titulo corto

Estado: Propuesta | Aprobada | Reemplazada

Contexto:

Decision:

Consecuencias:
```

## 2026-05-04 - Nancy es un sistema multi-modulo

Estado: Aprobada

Contexto: El repo se llama `nancy-monitor`, pero Nancy incluye mas que Monitor.

Decision: Documentar Nancy como plataforma con Chat externo, Monitor, Copilot, Ops y Voice.

Consecuencias: Las futuras tareas deben evitar asumir que Nancy Monitor es todo el proyecto. El diseno debe considerar herramientas compartidas, permisos y auditoria para todos los modulos.

## 2026-05-04 - La documentacion interna vive en `docs/`

Estado: Aprobada

Contexto: Futuras sesiones de Codex/ChatGPT necesitan contexto persistente dentro del repo.

Decision: Crear `docs/PROJECT_CONTEXT.md`, `docs/PROJECT_STATUS.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` y `docs/CODEX_PROMPTS.md`, enlazados desde `README.md`.

Consecuencias: Cualquier cambio relevante de arquitectura, seguridad, roadmap o alcance debe actualizar estos documentos.

## 2026-05-04 - Seguridad antes de ampliar datos internos

Estado: Aprobada

Contexto: Monitor y Copilot tratan conversaciones, documentos y datos operativos que pueden ser sensibles.

Decision: Priorizar autenticacion, roles, RLS, masking y auditoria antes de habilitar mas datos internos, edicion, Ops completo o Voice real.

Consecuencias: Copilot/Ops deben avanzar primero en modo read-only y con datos permitidos. Las acciones de escritura requieren permisos, confirmacion y logs.

## 2026-05-04 - Herramientas compartidas para Copilot, Ops y Voice

Estado: Aprobada

Contexto: Copilot, Ops y Voice necesitan consultar clientes, documentos, funding y procesos.

Decision: Reutilizar una capa comun de herramientas, normalizacion de datos, permisos y auditoria.

Consecuencias: Evitar integraciones duplicadas por modulo. Las herramientas deben ser invocables desde distintos canales con el mismo contrato de seguridad.

## 2026-05-04 - No guardar secretos ni datos reales sensibles en docs

Estado: Aprobada

Contexto: Los documentos internos seran usados como contexto en nuevas sesiones.

Decision: La documentacion puede describir variables, fuentes y reglas, pero no debe contener tokens, claves, contrasenas, SSN completos, credenciales de SmartCredit ni datos reales de clientes.

Consecuencias: Los ejemplos deben ser anonimos o placeholders. Si se necesita investigar un dato sensible, hacerlo desde codigo/infra autorizada y no copiarlo a Markdown.

## 2026-05-04 - Roles internos minimos para APIs sensibles

Estado: Aprobada

Contexto: Nancy Monitor expone conversaciones internas y futuras fases agregaran documentos, funding, Ops y Voice.

Decision: Crear `internal_user_profiles` con roles `admin`, `manager`, `ops`, `sales` y `readonly`, y usar helpers server-side `requireUser` y `requireRole` en APIs internas.

Consecuencias: Un usuario autenticado sin perfil interno activo recibe 403 en APIs protegidas por rol. Las altas y cambios de rol deben gestionarse desde Supabase/admin tooling, no desde el cliente.

## 2026-05-04 - Service role solo despues de autorizacion

Estado: Aprobada

Contexto: Monitor usa `SUPABASE_SERVICE_ROLE_KEY` server-side para leer `conversations_summary` y `conversations_log`.

Decision: Mantener service role temporalmente para no romper el MVP, pero solo despues de validar sesion y rol interno en cada endpoint consumido por frontend.

Consecuencias: El riesgo baja sin forzar una refactorizacion grande de RLS. La deuda pendiente es migrar lecturas a cliente SSR/RLS cuando el modelo de permisos este completo.

## 2026-05-04 - Auditoria minima para Monitor

Estado: Aprobada

Contexto: Las conversaciones son informacion interna sensible y deben dejar trazabilidad.

Decision: Crear `security_audit_log` y registrar lectura de lista de conversaciones, lectura de mensajes por conversacion y denegaciones 403 en APIs internas.

Consecuencias: La auditoria no debe guardar contenido completo de mensajes ni payloads sensibles. La cobertura debe ampliarse a Copilot, Ops, Voice y conectores en fases siguientes.

## 2026-05-04 - HTML interno no cacheable en CDN

Estado: Aprobada

Contexto: Hostinger/HCDN llego a servir HTML viejo de rutas internas con referencias a assets antiguos de Next.js, causando 404 de CSS/JS y pantallas sin estilos.

Decision: Las rutas `/`, `/login`, `/select`, `/copilot` y futuras rutas `/ops` deben renderizarse como dinamicas con `dynamic = "force-dynamic"` y `revalidate = 0`. Cuando una pagina necesite interactividad cliente, el JSX visual vive en un componente cliente y `page.tsx` queda como wrapper server. Ademas, las rutas internas emiten `Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate`, `CDN-Cache-Control: no-store` y `Surrogate-Control: no-store`.

Consecuencias: El CDN no debe almacenar HTML del panel que pueda apuntar a assets obsoletos. Los assets versionados de `/_next/static/*` conservan el cache largo immutable administrado por Next.js y no reciben reglas `no-store`. Toda nueva ruta interna debe heredar o declarar esta politica antes de desplegarse.
