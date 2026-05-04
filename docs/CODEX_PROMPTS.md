# Nancy Codex Prompts

Ultima actualizacion: 2026-05-04

Este archivo guarda prompts utiles para trabajar con Codex o ChatGPT en el proyecto Nancy. No incluir secretos, tokens, contrasenas, SSN completos ni datos reales de clientes.

## Prompt Base para Nueva Sesion

```text
Actua como senior full-stack engineer en Next.js, TypeScript, Supabase y seguridad para el proyecto Nancy de Mr.CREDITMIND.

Antes de proponer cambios, lee:
- docs/PROJECT_CONTEXT.md
- docs/PROJECT_STATUS.md
- docs/ROADMAP.md
- docs/DECISIONS.md

Contexto clave:
- Nancy no es solo Monitor.
- Nancy incluye Chat externo, Monitor, Copilot, Ops, Voice y automatizaciones.
- Stack actual: Next.js, Supabase, OpenAI, FunnelUp, Google Drive, Google Sheets, n8n y Hostinger Node.js.
- No rompas funcionalidades existentes de Monitor/Copilot.
- No expongas secretos ni datos sensibles.

Objetivo de esta tarea:
[describe una sola fase concreta]

Restricciones:
- Mantener cambios pequenos y revisables.
- No modificar fuera del alcance.
- Si hay datos sensibles, aplicar permisos, masking y auditoria.
- Ejecutar lint/build cuando toque codigo o configuracion.

Entrega:
- Archivos creados/modificados.
- Resumen de cambios.
- Pruebas ejecutadas o razon por la que no aplican.
- Riesgos o pendientes detectados.
```

## Prompt para Fase 1: Seguridad y Acceso

```text
Actua como senior full-stack engineer especializado en Next.js App Router, Supabase Auth, RLS y seguridad.

Objetivo:
Endurecer seguridad base de Nancy Monitor/Copilot antes de exponer mas datos internos.

Tareas:
- Revisar APIs internas y rutas privadas.
- Proponer/implementar helper de usuario autenticado y rol interno.
- Evitar uso inseguro de service role en endpoints consumidos por frontend.
- Agregar auditoria minima donde aplique.
- Mantener UI y comportamiento existente.

Criterios:
- APIs privadas devuelven 401 sin sesion.
- APIs privadas devuelven 403 sin rol suficiente.
- No se exponen secretos.
- npm run lint y npm run build pasan, o se explica el bloqueo exacto.
```

## Prompt para Fase 2: Copilot Real

```text
Actua como senior full-stack engineer y AI product engineer para Nancy Copilot.

Objetivo:
Conectar Copilot a datos internos reales de forma read-only y segura.

Tareas:
- Revisar herramientas existentes en lib/copilot/tools.
- Normalizar perfil de cliente desde FunnelUp.
- Consultar Drive y Sheets con fuentes claras.
- Responder con hallazgos, fuentes, nivel de confianza y proximo paso.
- Aplicar masking y permisos.

Restricciones:
- No inventar datos.
- No mostrar SSN completo, credenciales ni documentos sensibles por defecto.
- No implementar edicion todavia.
```

## Prompt para Fase 3: Nancy Ops

```text
Actua como senior full-stack engineer para crear Nancy Ops en Next.js.

Objetivo:
Crear una seccion /ops read-only para busqueda operacional de clientes, documentos y estado de onboarding/funding.

Tareas:
- Agregar ruta /ops.
- Agregar entrada desde /select.
- Reutilizar herramientas y clientes existentes.
- Mostrar ficha operacional por cliente.
- Registrar auditoria para consultas sensibles si la infraestructura ya existe.

Restricciones:
- No editar datos.
- No exponer documentos sensibles completos.
- Respetar roles/permisos existentes.
```

## Prompt para Fase 4: Nancy Voice

```text
Actua como senior full-stack engineer para disenar la base de Nancy Voice.

Objetivo:
Crear contratos e infraestructura inicial sin depender de un proveedor real.

Tareas:
- Definir interfaces VoiceProvider, VoiceCallRequest, VoiceCallResult y VoiceOutcome.
- Crear tabla de llamadas si aplica.
- Crear MockVoiceProvider.
- Crear API segura para iniciar/registrar llamadas de prueba.
- Documentar como conectar proveedor real despues.

Restricciones:
- No realizar llamadas reales.
- No guardar audio/transcripciones sensibles sin permisos y auditoria.
```

## Prompt Usado para Crear Documentacion Inicial

```text
Actua como senior full-stack engineer y technical writer para el proyecto Nancy de Mr.CREDITMIND.

Objetivo:
Agregar documentacion interna al repo para que cualquier sesion futura de Codex o ChatGPT pueda entender el proyecto sin reexplicar todo.

Tareas:
- Crear carpeta docs si no existe.
- Crear PROJECT_CONTEXT, PROJECT_STATUS, ROADMAP, DECISIONS y CODEX_PROMPTS.
- Actualizar README con links.
- No modificar logica de aplicacion, APIs, Supabase ni UI.
- Mantener el proyecto compilable.
```
