# Nancy Deployment Runbook

Ultima actualizacion: 2026-05-04

Este runbook cubre el despliegue standalone de Nancy y las reglas de cache necesarias para evitar HTML interno obsoleto en CDN. No incluir secretos, tokens, contrasenas ni datos reales de clientes.

## Build standalone

Desde la raiz del proyecto:

```bash
npm run build
```

El script limpia `.next`, compila Next.js en modo standalone y copia `public` y `.next/static` dentro de `.next/standalone`.

Para ejecutar el build standalone localmente:

```bash
npm run start
```

## Cache en Hostinger/HCDN

No cachear HTML de rutas internas:

- `/`
- `/login`
- `/select`
- `/copilot`
- `/copilot/*`
- `/ops`
- `/ops/*`

Respetar estos headers de la aplicacion para esas rutas:

```txt
Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate
CDN-Cache-Control: no-store
Surrogate-Control: no-store
```

Mantener cache largo para assets versionados:

- `/_next/static/*`
- Header esperado desde Next.js/infra: `Cache-Control: public, max-age=31536000, immutable`

No aplicar reglas `no-store` a `/_next/static/*`.

## Verificacion post-deploy

Checklist post-deploy validado:

- Confirmar que el proceso standalone inicio sin errores.
- Abrir `/`, `/login`, `/select` y `/copilot` en produccion.
- Confirmar que ninguna pagina queda sin estilos ni errores de chunks antiguos.
- Confirmar que las rutas internas devuelven headers `no-store`.
- Confirmar que un asset real de `/_next/static/*` devuelve cache largo `immutable`.
- Purgar en Hostinger/HCDN el HTML interno tras deploys importantes.

Verificar headers de rutas internas:

```bash
curl -I https://TU_DOMINIO/
curl -I https://TU_DOMINIO/login
curl -I https://TU_DOMINIO/select
curl -I https://TU_DOMINIO/copilot
```

Cada respuesta HTML debe incluir headers equivalentes a:

```txt
Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate
CDN-Cache-Control: no-store
Surrogate-Control: no-store
```

Verificar un asset real tomado del HTML o de `.next/static`:

```bash
curl -I https://TU_DOMINIO/_next/static/CHUNK_REAL.js
```

La respuesta de `/_next/static/*` debe incluir cache largo e `immutable`.

Ejemplo de header esperado para assets versionados:

```txt
Cache-Control: public, max-age=31536000, immutable
```

Resultado validado en produccion 2026-05-04:

- `/` carga correctamente.
- `/login` carga correctamente.
- `/select` carga correctamente.
- `/copilot` carga correctamente.
- HTML interno ya no queda cacheado agresivamente por HCDN.
- `/_next/static/*` conserva cache largo immutable.

## Despues de cada deploy

Si el deploy anterior pudo haber servido HTML con headers incorrectos, purgar en HCDN las rutas internas listadas arriba. No es necesario purgar agresivamente `/_next/static/*` porque los nombres de archivos versionados cambian por build.

## Rollback

Si un deploy falla:

1. Revertir al ultimo build funcional.
2. Reiniciar el proceso standalone.
3. Purgar en HCDN las rutas internas HTML.
4. Confirmar que el HTML nuevo apunta al build activo y que `/_next/static/*` responde 200.
