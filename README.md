# Aula · Gestión de matrículas

Interfaz web responsive para la IEFI de Interfaz de Usuario. El formulario rediseña la ficha original de matriculación a cursos de computación y conserva curso, fecha, apellidos, nombres, sexo, dirección y localidad (adaptación de distrito).

## Uso

La aplicación se publica con una URL: no requiere ejecutar un programa en la computadora del visitante. El acceso público muestra el inicio de sesión propio; las páginas y API de administración exigen una sesión válida.

1. Elegir un curso y la fecha de matrícula. Se permiten fechas anteriores.
2. Completar los datos del estudiante y su domicilio.
3. Revisar el resumen, que se actualiza automáticamente.
4. Presionar **Registrar matrícula**.
5. La confirmación muestra un número `MAT-000001` únicamente después de guardarse en la base de datos.
6. **Nueva matrícula** inicia otro formulario. El enlace de confirmación permite volver a consultar el registro después de recargar la página.

La provincia determina las localidades disponibles. Cambiarla limpia la localidad anterior. El servidor valida la correspondencia y guarda identificadores y nombres. El catálogo de 24 jurisdicciones y sus localidades está incluido desde GeoRef (Argentina), consultado el 1/11/2026, sin depender de un servicio externo durante el uso. Las matrículas antiguas sin provincia conservan sus datos; al editarlas se completa la ubicación. Se admiten nombres con tildes, apóstrofes y guiones. Limpiar pide confirmación y no borra las matrículas ya guardadas. Los errores conservan los datos ingresados. Durante el registro se bloquean envíos repetidos; reintentar el mismo envío utiliza un identificador único y no crea otra matrícula.

## Acceso y entrega en Classroom

El enlace abre un formulario de correo y contraseña sin exigir una cuenta de ChatGPT. No hay registro público de usuarios.

- La pantalla muestra la cuenta pública de demostración `profe@aula.local` y su contraseña, con un botón para completar los datos. Esta exposición es intencional para la entrega académica.
- La cuenta `zoe@aula.local` administra los datos originales; su contraseña no se publica en el código ni en la pantalla.
- Las sesiones duran 8 horas. Cerrar sesión invalida el token en el servidor. Las credenciales configuradas como secretos incluyen hashes PBKDF2-SHA256 con sal individual y pepper del servidor; las contraseñas generadas tienen alta entropía.
- Cookies HttpOnly, Secure en HTTPS y SameSite=Strict. Las operaciones de escritura comprueban el origen. Los intentos de acceso repetidos se limitan por cuenta e IP.
- La cuenta docente utiliza tablas separadas `demo_enrollments` y `demo_courses`, con 3 matrículas ficticias iniciales. Puede probar el CRUD completo sin acceder a las tablas de administración. Es un espacio de prueba compartido entre quienes usen esa cuenta; no cargar datos personales reales.
- La inicialización de ejemplos no restaura registros eliminados ni sobrescribe ediciones.

### Configuración para desarrollar

`node scripts/provision-access.mjs` genera dos credenciales nuevas **solo para el entorno local**, escribe hashes y pepper en `.dev.vars` (ignorado por Git) y entrega las contraseñas por stdout. Mantener ese resultado privado. Actualizar también el bloque de demostración en `assets/login.html` si se cambia su contraseña local. Para publicar, configurar `AULA_ACCOUNTS_JSON` y `AULA_PASSWORD_PEPPER` como secretos del servidor; nunca en archivos versionados. Reiniciar la vista local tras configurar variables.

## Administración

- **Matriculados**: listado, búsqueda por estudiante/código, filtros por curso y fecha, edición y eliminación con confirmación.
- **Cursos**: agregar, editar y eliminar. Los cambios del catálogo no modifican el nombre guardado en matrículas anteriores. Una matrícula puede mantener su curso eliminado al editar otros datos.
- Las eliminaciones son lógicas. Los registros dejan de aparecer en la interfaz. La versión de cada registro evita sobrescribir cambios simultáneos.

Sitio: https://aula-matriculas-zoe.glassy-mango-3069.chatgpt.site

## Tecnología y datos

- Interfaz en HTML, CSS y JavaScript, basada en el diseño de Stitch.
- Rutas de servidor con Vinext, compatibles con Next.js y Cloudflare Workers.
- Base de datos **Cloudflare D1 (SQLite alojado)** para las matrículas.
- Validación compartida entre navegador y servidor.
- Consultas parametrizadas y restricción de unicidad del identificador de envío.
- Las migraciones de `drizzle/` crean la estructura; no incluyen datos de personas.

La petición de una URL alojada determina esta arquitectura web. Esta interfaz es independiente de la aplicación WPF de restaurante. La base alojada tampoco depende de la base local de Mesa.

## Estructura

- `assets/index.html`: pantalla y controles accesibles.
- `public/styles.css`: diseño de computadora y adaptación a tablet/celular.
- `public/app.js`: resumen en vivo, validaciones, confirmación de limpieza y registro real.
- `public/rules.js`: cursos y validaciones compartidas.
- `app/api/`: consulta de cursos, alta de matrícula y consulta por identificador.
- `db/enrollments.mjs`: persistencia y prevención de duplicados al reintentar.
- `db/schema.ts`, `drizzle/`: esquema y migraciones de D1.
- `tests/enrollment.test.mjs`: pruebas con SQLite real mediante `node:sqlite`.

## Desarrollo local

Requiere Node.js 24 y pnpm 11.25.0:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_confused_storm.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_cute_venus.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_fixed_kylun.sql
pnpm dev
```

La base local y la alojada son independientes. Aplicar una migración local solamente si está pendiente. Los scripts conservan la integración de Sites para compilación, base y publicación. No incluir `.wrangler/`, variables locales ni credenciales en Git.

## Verificación

- 32 pruebas de validación y persistencia: fechas, nombres, campos obligatorios, consultas, errores de escritura, duplicados por reintento y reapertura de la base.
- Circuito verificado en navegador: errores iniciales, resumen automático, Conservar/Sí limpiar, alta y recuperación de la matrícula después de recargar.
- Distribución revisada en computadora y en anchos de 390 y 320 píxeles, sin desbordamiento horizontal.

## Alcance académico

La interfaz está enfocada en matricular. Incluye la gestión de matrículas y del catálogo de cursos. No incluye pagos, calificaciones, cupos ni gestión pública de usuarios. Los estados de carga, error y éxito forman parte del circuito real; no hay un simulador dentro de la pantalla del producto.

La verificación de acceso cubre contraseñas incorrectas, expiración, cierre de sesión, revocación por cambio de configuración, límites de intentos, origen de solicitudes y aislamiento de demostración.
