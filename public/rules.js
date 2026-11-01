export const COURSES = Object.freeze([
  {id:'web',name:'Desarrollo web'},
  {id:'python',name:'Programación con Python'},
  {id:'excel',name:'Excel y análisis de datos'},
  {id:'ux-ui',name:'Diseño UX/UI'}
]);
export const FIELDS = ['courseId','enrollmentDate','lastName','firstName','sex','address','locality'];
export const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/gu,' ') : '';
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(0); date.setUTCFullYear(y,m-1,d); date.setUTCHours(12,0,0,0);
  return y >= 1 && date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d;
}
export function validate(payload, courses = COURSES) {
  const errors = {};
  if (!courses.some(course=>course.id===payload.courseId)) errors.courseId='Seleccioná un curso disponible.';
  if (!validDate(payload.enrollmentDate)) errors.enrollmentDate='Ingresá una fecha válida.';
  for (const field of ['lastName','firstName']) {
    const value=clean(payload[field]);
    if (!value || value.length>100 || !/^[\p{L}\p{M} '\u2019-]+$/u.test(value) || !/\p{L}/u.test(value))
      errors[field]='Ingresá un nombre válido de hasta 100 caracteres. Podés usar tildes, apóstrofes y guiones.';
  }
  if (!['Femenino','Masculino','Prefiero no indicar'].includes(payload.sex)) errors.sex='Seleccioná una opción.';
  for (const [field,limit,label] of [['address',200,'dirección'],['locality',100,'localidad']]) {
    const value=clean(payload[field]);
    if (!value || value.length>limit || /[\u0000-\u001f\u007f]/u.test(value)) errors[field]=`Ingresá una ${label} de hasta ${limit} caracteres.`;
  }
  return errors;
}
export function normalize(payload) {
  return Object.fromEntries(FIELDS.map(field=>[field,clean(payload[field])]));
}
export function validRequestId(value) {
  return typeof value==='string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value) && value!=='00000000-0000-0000-0000-000000000000';
}
export function createRequestId(cryptoApi=globalThis.crypto) {
  if(typeof cryptoApi.randomUUID==='function')return cryptoApi.randomUUID();
  const bytes=cryptoApi.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
