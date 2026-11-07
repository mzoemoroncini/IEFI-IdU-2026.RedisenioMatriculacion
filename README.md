# Aula · Gestión de matrículas

Proyecto web de la IEFI de Interfaz de Usuario · 2026.

**Abrir la aplicación:** https://aula-matriculas-zoe.glassy-mango-3069.chatgpt.site/

El sitio muestra los datos de acceso para la entrega académica. La contraseña de administración y los secretos del servidor no forman parte de este repositorio.

## Funciones

- Inscripción guiada en cuatro pasos: estudiante y domicilio, curso, pago y confirmación.
- Provincia y localidad relacionadas, validaciones por campo y resumen en vivo.
- Matriculados con búsqueda, filtros, edición y papelera recuperable.
- Ficha del estudiante con matrícula, curso, arancel, saldo e historial de pagos.
- Catálogo administrable de cursos de informática con imágenes, área, nivel, duración y arancel.
- Pagos parciales o totales, saldo actualizado y anulación de movimientos con motivo.
- Comprobantes de matrícula y pago y ficha descargables en PDF; impresión de pagos.
- QR simbólico, efectivo y transferencia como registros manuales, sin procesar dinero real.
- Estadísticas de cursos, matrículas y pagos con gráficos y tablas.
- Temas claro y oscuro, búsquedas, navegación por teclado y diseño adaptable.

## Tecnología y datos

HTML, CSS y JavaScript para la interfaz; rutas de servidor Vinext/TypeScript sobre Cloudflare Workers y base Cloudflare D1 (SQLite). El servidor valida los datos, utiliza consultas parametrizadas y evita duplicados y sobrescrituras mediante identificadores de operación y versiones.

La cuenta docente usa tablas separadas de administración. Los datos de ejemplo son académicos; no cargar información personal real en el acceso compartido. El repositorio incluye código, catálogo y migraciones, sin exportar los registros del sitio ni sus sesiones.

## Desarrollo y acceso

Se requiere Node.js 24 y pnpm según `packageManager` en `package.json`.

```sh
corepack pnpm install
```

Configurar el binding D1 `DB` y aplicar, en orden, las migraciones de `drizzle/` sobre la base local con Wrangler. El script `node scripts/provision-access.mjs` genera credenciales locales nuevas y escribe hashes y pepper en `.dev.vars` (ignorado por Git); su salida contiene las contraseñas y debe mantenerse privada. Si se cambian las credenciales locales, actualizar el acceso de prueba de `assets/login.html` para ese entorno.

El servidor requiere `AULA_ACCOUNTS_JSON` y `AULA_PASSWORD_PEPPER`. En producción se configuran como secretos, nunca en archivos versionados. Después de configurarlos, iniciar `corepack pnpm dev`. La configuración original de alojamiento está en `.openai/hosting.json` y los scripts de ejecución/publicación en `scripts/`.

Para compilar: `corepack pnpm build`. Publicar en un entorno compatible con Workers/D1. GitHub almacena el código; GitHub Pages no ejecuta esta aplicación con su base de datos y su autenticación.

## Verificación

```sh
node --test tests/*.test.mjs
node --check public/app.js
node --check public/payments.js
node --check public/student-profile.js
```

72 pruebas automatizadas correctas en la última revisión. Se probaron desde la interfaz el inicio de sesión, la inscripción, la localidad según provincia, los pagos parciales y completos, la anulación y la edición sin perder pagos. Estas pruebas usaron una base local separada. La generación del PDF se validó; la descarga efectiva no pudo confirmarse con el navegador de pruebas.

Más detalle sobre aranceles y catálogo: [PAYMENTS.md](PAYMENTS.md).
