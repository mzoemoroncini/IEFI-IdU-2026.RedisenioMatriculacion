import {COURSES,clean} from '../public/rules.js';
import {placeKey} from './geography.mjs';
export class CatalogError extends Error {}
export async function listCourses(db){
 await db.batch(COURSES.map((c,i)=>db.prepare('INSERT INTO courses (id,name,name_key,position,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(c.id,c.name,placeKey(c.name),i,'2026-11-01T00:00:00Z')));
 return (await db.prepare('SELECT id,name,version FROM courses WHERE deleted_at IS NULL ORDER BY position,name').all()).results;
}
/** @param {any} db @param {any} body @param {string|null} id */
export async function saveCourse(db,body,id=null){
 const name=clean(body?.name);if(!name||name.length>100)throw new CatalogError('Ingresá un nombre de curso de hasta 100 caracteres.');
 await listCourses(db);
 const duplicate=await db.prepare('SELECT id FROM courses WHERE name_key=? AND deleted_at IS NULL AND id<>?').bind(placeKey(name),id||'').first();if(duplicate)throw new CatalogError('Ya existe un curso con ese nombre.');
 if(id){const result=await db.batch([db.prepare('UPDATE courses SET name=?,name_key=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(name,placeKey(name),id,body.version)]);if(!result[0].meta.changes)throw new CatalogError('El curso cambió o fue eliminado. Actualizá la lista.');}
 else {id=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO courses (id,name,name_key,position,created_at) VALUES (?,?,?,?,?)').bind(id,name,placeKey(name),100,new Date().toISOString())]);}
 return {id,name};
}
export async function deleteCourse(db,id,version){const result=await db.batch([db.prepare('UPDATE courses SET deleted_at=?,name_key=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(new Date().toISOString(),'deleted:'+id,id,version)]);if(!result[0].meta.changes)throw new CatalogError('El curso cambió o fue eliminado. Actualizá la lista.');}
