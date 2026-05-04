# Nancy Security Notes

Ultima actualizacion: 2026-05-04

Este documento registra el audit de rutas y el estado de seguridad base del panel Nancy. No incluir secretos, tokens, contrasenas, SSN completos ni datos reales de clientes.

## Resumen de Fase 1

Se agrego una capa minima y reutilizable de seguridad:

- `lib/auth/require-user.ts`: obtiene el usuario autenticado y permite responder 401.
- `lib/auth/require-role.ts`: valida perfil interno activo y rol permitido, y permite responder 403.
- `lib/auth/roles.ts`: define roles internos permitidos.
- `lib/security/audit-log.ts`: registra eventos de seguridad server-side sin guardar contenido completo de mensajes.
- `supabase/migrations/20260504_02_security_roles_audit.sql`: crea perfiles internos y auditoria minima.

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
| `POST /api/copilot/chat` | Interno | Usuario autenticado via historial Copilot | Pendiente role-gating antes de ampliar datos internos reales. |
| `GET /api/copilot/conversations` | Interno | Usuario autenticado y RLS por `user_id` | Historial propio del usuario. |
| `POST /api/copilot/conversations` | Interno | Usuario autenticado y RLS por `user_id` | Crea historial propio del usuario. |
| `GET /api/copilot/conversations/[conversationId]/messages` | Interno | Usuario autenticado y RLS por `user_id` | Mensajes propios del usuario. |
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
- `internal_api.access_denied`

Metadata permitida:

- Conteos, limites, rol, motivo de denegacion y `conversationId`.
- No guardar contenido completo de mensajes.
- No guardar documentos, SSN, credenciales, tokens ni payloads completos de clientes.

## Aplicacion de Migracion

Aplicar la migracion:

```bash
supabase db push
```

O ejecutar el SQL de `supabase/migrations/20260504_02_security_roles_audit.sql` en el editor SQL de Supabase.

Despues de aplicar la migracion, crear perfiles internos para los usuarios autorizados. Ejemplo con placeholder:

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

Sin una fila activa en `internal_user_profiles`, el usuario autenticado no podra leer las APIs protegidas de Monitor.

## Riesgos Pendientes

- Copilot aun no esta role-gated; hoy valida usuario autenticado para historial, pero debe pasar por roles antes de conectarse a datos internos mas sensibles.
- Monitor sigue usando service role server-side despues de autorizacion; se debe migrar gradualmente a lecturas con cliente SSR/RLS cuando el contrato de permisos este completo.
- Falta auditoria para Copilot, Drive, Sheets, FunnelUp y futuras rutas Ops/Voice.
- Falta masking centralizado para datos Nivel 2, 3 y 4.
- Falta proceso administrativo formal para alta/baja/cambio de roles internos.
