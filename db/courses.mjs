import {COURSES,clean} from '../public/rules.js';
import {placeKey} from './geography.mjs';
import {COURSE_INFO,courseInfo} from '../public/catalog.js';
import {COURSE_AREAS,COURSE_LEVELS,COURSE_IMAGES,MAX_COURSE_IMAGE_BYTES} from '../public/course-fields.js';
export class CatalogError extends Error {}
export async function listCourses(db){
 await db.batch(COURSES.map((c,i)=>db.prepare('INSERT INTO courses (id,name,name_key,position,created_at,fee_cents) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(c.id,c.name,placeKey(c.name),i,'2026-11-01T00:00:00Z',COURSE_INFO[c.id]?.feeCents??null)));
 return (await db.prepare('SELECT id,name,version,fee_cents AS feeCents,description,duration,area,level,image FROM courses WHERE deleted_at IS NULL ORDER BY position,name').all()).results.map(courseInfo);
}
function courseImage(value){
 if(value==null||value==='')return null;
 if(typeof value!=='string')throw new CatalogError('Elegí una imagen válida.');
 if(COURSE_IMAGES.some(([key])=>value==='/course-images/'+key+'.jpg'))return value;
 const match=value.match(/^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match||value.length>Math.ceil(MAX_COURSE_IMAGE_BYTES/3)*4+50)throw new CatalogError('La imagen debe ser JPG, PNG o WebP y ocupar hasta 200 KB.');
 let bytes;try{bytes=atob(match[2])}catch{throw new CatalogError('No se pudo leer la imagen.');}
 if(bytes.length>MAX_COURSE_IMAGE_BYTES||bytes.length<12)throw new CatalogError('La imagen no es válida o supera los 200 KB.');
 const actual=bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP'?'webp':bytes.charCodeAt(0)===255&&bytes.charCodeAt(1)===216&&bytes.charCodeAt(2)===255?'jpeg':bytes.slice(0,8)==='\x89PNG\r\n\x1a\n'?'png':null;
 if(actual!==match[1])throw new CatalogError('El contenido de la imagen no corresponde al formato elegido.');
 return value;
}
export async function saveCourse(db,body,id=null){
 const name=clean(body?.name);if(!name||name.length>100)throw new CatalogError('Ingresá un nombre de curso de hasta 100 caracteres.');
 const fields={},limits={description:600,duration:60};
 for(const [key,max]of Object.entries(limits))if(Object.hasOwn(body,key)){const value=clean(body[key]);if(!value||value.length>max)throw new CatalogError(key==='description'?'Ingresá una descripción de hasta 600 caracteres.':'Ingresá una duración de hasta 60 caracteres.');fields[key]=value;}
 for(const [key,options]of [['area',COURSE_AREAS],['level',COURSE_LEVELS]])if(Object.hasOwn(body,key)){if(!options.includes(body[key]))throw new CatalogError(key==='area'?'Seleccioná un área de formación válida.':'Seleccioná un nivel válido.');fields[key]=body[key];}
 if(Object.hasOwn(body,'image'))fields.image=courseImage(body.image);
 const hasFee=Object.hasOwn(body,'feeCents'),fee=body.feeCents??null;if(hasFee&&fee!==null&&(!Number.isSafeInteger(fee)||fee<0||fee>100000000))throw new CatalogError('Ingresá un arancel válido, con hasta dos decimales.');
 await listCourses(db);
 const duplicate=await db.prepare('SELECT id FROM courses WHERE name_key=? AND deleted_at IS NULL AND id<>?').bind(placeKey(name),id||'').first();if(duplicate)throw new CatalogError('Ya existe un curso con ese nombre.');
 if(id){
  const assignments=['name=?','name_key=?'],values=[name,placeKey(name)];
  if(hasFee){assignments.push('fee_cents=?');values.push(fee);}
  for(const key of ['description','duration','area','level','image'])if(Object.hasOwn(fields,key)){assignments.push(key+'=?');values.push(fields[key]);}
  const result=await db.batch([db.prepare('UPDATE courses SET '+assignments.join(',')+',version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(...values,id,body.version)]);
  if(!result[0].meta.changes)throw new CatalogError('El curso cambió o fue eliminado. Actualizá la lista.');
 }else{
  id=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO courses (id,name,name_key,position,created_at,fee_cents,description,duration,area,level,image) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,name,placeKey(name),100,new Date().toISOString(),fee,fields.description??null,fields.duration??null,fields.area??null,fields.level??null,fields.image??null)]);
 }
 return {id,name};
}
export async function deleteCourse(db,id,version){const result=await db.batch([db.prepare('UPDATE courses SET deleted_at=?,name_key=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(new Date().toISOString(),'deleted:'+id,id,version)]);if(!result[0].meta.changes)throw new CatalogError('El curso cambió o fue eliminado. Actualizá la lista.');}

export async function listDeletedCourses(db){return (await db.prepare('SELECT id,name,version,deleted_at AS deletedAt FROM courses WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC,name').all()).results;}
export async function restoreCourse(db,id,version){
 const item=await db.prepare('SELECT id,name,version FROM courses WHERE id=? AND deleted_at IS NOT NULL').bind(id).first();
 if(!item||item.version!==version)throw new CatalogError('El curso cambió o ya fue recuperado. Actualizá la papelera.');
 const key=placeKey(item.name);
 const duplicate=await db.prepare('SELECT id FROM courses WHERE name_key=? AND deleted_at IS NULL AND id<>?').bind(key,id).first();
 if(duplicate)throw new CatalogError('Ya hay un curso activo con ese nombre. Cambiale el nombre antes de recuperar este curso.');
 try{
  const result=await db.batch([db.prepare('UPDATE courses SET deleted_at=NULL,name_key=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NOT NULL').bind(key,id,version)]);
  if(!result[0].meta.changes)throw new CatalogError('El curso cambió o ya fue recuperado. Actualizá la papelera.');
 }catch(error){if(error instanceof CatalogError)throw error;if(/unique/i.test(String(error)))throw new CatalogError('Ya hay un curso activo con ese nombre. Actualizá la lista.');throw error;}
 return {id:item.id,name:item.name};
}
