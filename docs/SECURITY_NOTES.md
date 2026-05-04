# Nancy Security Notes

Ultima actualizacion: 2026-05-04

Este documento registra el audit de rutas y el estado de seguridad base del panel Nancy. No incluir secretos, tokens, contrasenas, SSN completos ni datos reales de clientes.

## Resumen de Fase 1, Fase 2 y Fase 2.1

Se agrego una capa minima y reutilizable de seguridad:

- `lib/auth/require-user.ts`: obtiene el usuario autenticado y permite responder 401.
- `lib/auth/require-role.ts`: valida perfil interno activo y rol permitido, y permite responder 403.
- `lib/auth/roles.ts`: define roles internos permitidos.
- `lib/security/audit-log.ts`: registra eventos de seguridad server-side sin guardar contenido completo de mensajes.
- `supabase/migrations/20260504120000_security_roles_audit.sql`: crea perfiles internos y auditoria minima.
- `lib/copilot/security.ts`: define roles permitidos para Copilot y helpers de auditoria sin guardar prompts ni respuestas completas.
- `lib/security/data-sensitivity.ts`: define niveles y tipos para exposicion/masking.
- `lib/security/sensitive-fields.ts`: clasifica campos comunes de Nancy por sensibilidad.
- `lib/security/masking.ts`: enmascara valores, objetos, texto libre y metadata de auditoria.

## Rutas del Panel

Rutas protegidas por `proxy.ts`:

- `/`
- `/select`
- `/copilot`
- `/copilot/:path*`
- `/ops`
- `/ops/:path*`

Rutas publicas:

- `/login`
- `/auth/confirm`, callback de Supabase Auth.

Notas:

- `/ops` aun no existe, pero queda cubierta para futuras rutas internas.
- Las rutas API devuelven JSON y se protegen dentro de cada route handler cuando corresponde.

## Audit de `app/api/**`

| Endpoint | Estado | Proteccion actual | Notas |
| --- | --- | --- | --- |
| `GET /api/conversations` | Interno | `requireRole(CONVERSATION_READER_ROLES)` | Lee resumenes de Monitor. Registra `conversations.list.read`. |
| `GET /api/conversations/[conversationId]` | Interno | `requireRole(CONVERSATION_READER_ROLES)` | Lee mensajes de una conversacion. Registra `conversations.messages.read`. |
| `POST /api/copilot/chat` | Interno | `requireRole(COPILOT_API_ROLES)` y RLS por `user_id` | Envia mensaje a Copilot. Roles: `admin`, `manager`, `ops`, `sales`. `readonly` bloqueado. Registra `copilot.chat.message.sent`, `copilot.chat.rejected`, denegaciones y errores. |
| `GET /api/copilot/conversations` | Interno | `requireRole(COPILOT_API_ROLES)` y RLS por `user_id` | Lista historial propio del usuario. Roles: `admin`, `manager`, `ops`, `sales`. Registra `copilot.conversations.list.read`. |
| `POST /api/copilot/conversations` | Interno | `requireRole(COPILOT_API_ROLES)` y RLS por `user_id` | Crea historial propio del usuario. Roles: `admin`, `manager`, `ops`, `sales`. Registra `copilot.conversation.created`. |
| `GET /api/copilot/conversations/[conversationId]/messages` | Interno | `requireRole(COPILOT_API_ROLES)` y RLS por `user_id` | Lee mensajes propios del usuario. Roles: `admin`, `manager`, `ops`, `sales`. Registra `copilot.messages.read`. |
| `POST /api/auth/logout` | Sesion/auth | Cliente SSR Supabase | Cierra sesion; no expone datos internos. |

## Roles Internos

Roles iniciales:

- `admin`
- `manager`
- `ops`
- `sales`
- `readonly`

Roles permitidos para leer conversaciones de Monitor:

- `admin`
- `manager`
- `ops`
- `sales`
- `readonly`

Roles permitidos para usar APIs de Nancy Copilot:

- `admin`
- `manager`
- `ops`
- `sales`

`readonly` no puede usar APIs de Copilot por ahora, porque Copilot puede resumir, cruzar o preparar informacion sensible incluso cuando la fuente final todavia este en modo parcial.

Regla operativa: un usuario autenticado sin fila activa en `internal_user_profiles` recibe 403 en APIs internas protegidas por rol.

## Modelo Supabase Agregado

Tabla `internal_user_profiles`:

- `id uuid primary key references auth.users(id)`
- `email text`
- `full_name text`
- `role text`
- `is_active boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

RLS:

- Usuarios autenticados pueden leer su propio perfil.
- Usuarios con rol `admin` activo pueden leer perfiles internos mediante funcion `public.is_internal_admin()`.
- No se agregaron politicas de escritura desde cliente en esta fase.

Tabla `security_audit_log`:

- `id uuid primary key`
- `actor_user_id uuid`
- `actor_email text`
- `action text`
- `resource_type text`
- `resource_id text`
- `metadata jsonb`
- `created_at timestamptz`

RLS:

- RLS queda habilitado.
- No hay politicas directas para clientes en esta fase.
- El helper server-side inserta eventos con service role.

## Service Role

`SUPABASE_SERVICE_ROLE_KEY` sigue usandose server-side en:

- `lib/supabase-server.ts` con `getSupabaseServer()`.
- `app/api/conversations/route.ts`, despues de validar usuario y rol, para mantener lectura del MVP de Monitor sobre `conversations_summary`.
- `app/api/conversations/[conversationId]/route.ts`, despues de validar usuario y rol, para mantener lectura del MVP de Monitor sobre `conversations_log`.
- `lib/security/audit-log.ts`, para insertar eventos en `security_audit_log` sin exponer politicas de escritura al cliente.

Motivo: evitar una refactorizacion grande de Supabase/RLS en el MVP. La regla actual es validar `requireUser`/`requireRole` antes de cualquier consulta con service role en endpoints consumidos por frontend.

## Auditoria Minima

Eventos registrados:

- `conversations.list.read`
- `conversations.messages.read`
- `copilot.conversations.list.read`
- `copilot.conversation.created`
- `copilot.messages.read`
- `copilot.chat.message.sent`
- `copilot.chat.rejected`
- `copilot.api.error`
- `internal_api.access_denied`

Metadata permitida:

- Conteos, limites, rol, motivo de denegacion, `conversationId`, status, source type/status, cantidad aproximada de caracteres y error code generico.
- No guardar contenido completo de mensajes.
- No guardar documentos, SSN, credenciales, tokens ni payloads completos de clientes.
- No guardar prompts completos, respuestas completas del modelo ni URLs privadas completas si pueden contener informacion sensible.
- `logSecurityEvent` aplica `sanitizeAuditMetadata` antes de insertar metadata en `security_audit_log`.

## Estado de Migracion

La migracion de roles internos y auditoria minima ya fue aplicada y validada en produccion.

Referencia:

```bash
supabase db push
```

O ejecutar el SQL de `supabase/migrations/20260504120000_security_roles_audit.sql` en el editor SQL de Supabase cuando se replique el entorno.

Crear perfiles internos para usuarios autorizados cuando se provisionen nuevas cuentas. Ejemplo con placeholder:

```sql
insert into public.internal_user_profiles (id, email, full_name, role, is_active)
select id, email, raw_user_meta_data->>'full_name', 'admin', true
from auth.users
where email = 'admin@example.com'
on conflict (id) do update
set role = excluded.role,
    email = excluded.email,
    full_name = excluded.full_name,
    is_active = excluded.is_active,
    updated_at = now();
```

Sin una fila activa en `internal_user_profiles`, el usuario autenticado no podra usar APIs internas protegidas.

## Seguridad de Copilot

`/copilot` sigue siendo una ruta interna protegida por `proxy.ts`. Las APIs de `app/api/copilot/**` tambien validan sesion y rol dentro de cada route handler.

Protecciones aplicadas:

- `GET /api/copilot/conversations`: lista solo historial del usuario autenticado y registra auditoria.
- `POST /api/copilot/conversations`: crea conversacion del usuario autenticado y registra auditoria.
- `GET /api/copilot/conversations/[conversationId]/messages`: lee solo mensajes del usuario autenticado y registra auditoria.
- `POST /api/copilot/chat`: valida rol antes de parsear/ejecutar Copilot, no registra prompts completos y registra metadata minima.
- UI de Copilot maneja 401, 403, 500, respuestas no JSON y estructuras inesperadas con mensajes controlados.

Reglas de auditoria para Copilot:

- Permitido guardar `conversationId`, status, role, source type/status, conteos y cantidades aproximadas de caracteres.
- No guardar prompts completos, respuestas completas, documentos completos, SSN, passwords, tokens, credenciales, URLs privadas completas ni contenido completo de conversaciones.
- `readonly` queda bloqueado hasta que existan permisos por dato, masking centralizado y politica de exposicion mas fina.

## Sensibilidad y Masking

Fase 2.1 agrega una capa central inicial para clasificar y enmascarar datos en Monitor, Copilot, Ops y Voice.

Niveles:

| Nivel | Uso inicial | Regla base |
| --- | --- | --- |
| `public_operational` | Nombre, etiquetas operativas no sensibles | Visible. |
| `internal` | Email, telefono, contactId, servicio, etapa/pipeline | Visible para roles internos permitidos, con email/telefono parcialmente enmascarados. |
| `sensitive` | Documentos faltantes, notas internas, contenido completo de chats, prompts/respuestas completas | Parcial o resumido segun rol/contexto; redacted en auditoria. |
| `highly_sensitive` | URLs Drive, SSN, EIN, ID/passport, bank statements | Redacted por defecto; solo parcial para `admin`/`manager` con `allowHighlySensitive`. |
| `secret` | SmartCredit credentials, API keys, tokens, passwords | Nunca mostrar valor completo. |

Helpers:

- `classifyField(fieldName)`: clasifica un campo por nombre.
- `maskValue(value, level, options)`: enmascara un valor segun nivel, rol y contexto.
- `maskObject(input, options)`: recorre objetos/arrays y aplica masking por campo.
- `redactSecretsFromText(text)`: limpia texto libre antes de logs/auditoria.
- `shouldExposeField(fieldName, role, context)`: decide exposicion inicial por rol.
- `sanitizeAuditMetadata(metadata)`: prepara metadata segura para `security_audit_log`.

Ejemplos de validacion manual:

| Entrada | Salida esperada |
| --- | --- |
| `SSN 123-45-6789` | `***-**-6789` |
| `cliente@email.com` | `c***@email.com` |
| `+1 787 555 1234` | `********1234` |
| URL de Google Drive | `[redacted:drive-url]` |
| Password, API token o SmartCredit credential | `[redacted:secret]` |

Reglas de rol iniciales:

- `admin`: mayor acceso, pero secretos siempre redacted.
- `manager`: similar a admin salvo secretos.
- `ops`: puede ver `internal` y algunos `sensitive` con contexto explicito; no ve `highly_sensitive` completo.
- `sales`: puede ver `internal` operativo; no ve `highly_sensitive` completo.
- `readonly`: vista limitada; sigue bloqueado para Copilot APIs.

Limitacion actual:

- La sanitizacion ya protege auditoria y logs/errores internos principales.
- El masking de outputs finales de Copilot se aplicara en la fase de ficha cliente real, cuando existan permisos por dato/fuente.

## Riesgos Pendientes

- Copilot ya esta role-gated, pero aun necesita permisos por dato/fuente antes de ampliar datos internos reales.
- Monitor sigue usando service role server-side despues de autorizacion; se debe migrar gradualmente a lecturas con cliente SSR/RLS cuando el contrato de permisos este completo.
- La auditoria de Copilot es minima; falta auditoria extendida por tool, Drive, Sheets, FunnelUp y futuras rutas Ops/Voice.
- Falta aplicar masking a outputs finales de Copilot cuando exista ficha cliente real.
- Falta proceso administrativo formal para alta/baja/cambio de roles internos.
