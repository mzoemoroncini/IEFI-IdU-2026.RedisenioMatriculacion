# Pagos de matrícula y catálogo de Aula

La oferta inicial incluye 28 cursos distribuidos entre programación, datos e IA, infraestructura, diseño y producto, calidad de software y herramientas digitales. Los nombres, las matrículas y los aranceles son administrables. Las descripciones, duraciones y niveles de las propuestas iniciales están en public/catalog.js.

Los aranceles iniciales son importes de referencia para este proyecto académico y no corresponden a ofertas comerciales verificadas. Se pueden modificar desde Cursos. El arancel se copia al registrar una matrícula. Las matrículas anteriores que no tenían importe quedan sin definir hasta que administración lo asigne. Cambiar el curso no modifica el arancel de una matrícula existente.

Pagos permite definir el arancel individual, registrar pagos parciales o totales, consultar saldos, imprimir comprobantes y anular registros con motivo. El QR es simbólico. Efectivo y transferencia son registros manuales, sin integración con un procesador de pagos.

Las escrituras usan una versión de la matrícula y un token de operación en transacciones D1. Un identificador de envío evita duplicar el mismo pago al reintentar. Las anulaciones conservan el movimiento y vuelven a computar el saldo. El espacio docente usa tablas distintas de administración, incluyendo los pagos.

La migración 0003 agrega tablas de pagos y columnas opcionales a los registros existentes. No reemplaza ni borra datos previos.

Verificación: node --test tests/*.test.mjs. Incluye autenticación, contraste, matrícula, recuperación, aislamiento docente/administración, pagos parciales, reintentos, sobrepagos, anulaciones y reversión ante errores de escritura.

Referencias orientativas para seleccionar áreas actuales: Microsoft Learn (https://learn.microsoft.com/training/) y Cisco Networking Academy (https://www.netacad.com/). Aula no representa certificaciones oficiales ni afiliación con esos proveedores.
