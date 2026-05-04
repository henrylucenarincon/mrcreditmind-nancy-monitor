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
