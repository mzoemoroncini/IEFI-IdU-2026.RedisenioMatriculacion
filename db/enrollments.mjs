import {FIELDS,normalize,validate,validRequestId} from '../public/rules.js';
import {listCourses} from './courses.mjs';
import {resolveLocation,placeKey} from './geography.mjs';
export class InvalidEnrollment extends Error {constructor(errors){super('Revisá los campos señalados.');this.errors=errors;}}
export class SubmissionConflict extends Error {}
function record(r){return {id:Number(r.id),code:`MAT-${String(r.id).padStart(6,'0')}`,courseId:r.course_id,courseName:r.course_name,enrollmentDate:r.enrollment_date,lastName:r.last_name,firstName:r.first_name,sex:r.sex,address:r.address,locality:r.locality,provinceId:r.province_id||'',provinceName:r.province_name||'',localityId:r.locality_id||'',registeredAt:r.registered_at,updatedAt:r.updated_at,version:r.version};}
export async function findEnrollment(db,id){const row=await db.prepare('SELECT * FROM enrollments WHERE id=? AND deleted_at IS NULL').bind(id).first();return row?record(row):null;}
export async function listEnrollments(db){return (await db.prepare('SELECT * FROM enrollments WHERE deleted_at IS NULL ORDER BY enrollment_date DESC,id DESC').all()).results.map(record);}
async function checked(db,body,existing=null){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new InvalidEnrollment({form:'Formato inválido.'});
 const courses=await listCourses(db);if(existing&&!courses.some(c=>c.id===existing.courseId))courses.push({id:existing.courseId,name:existing.courseName});
 const errors=validate(body,courses);const location=resolveLocation(body.provinceId,body.localityId);
 if(!location)errors.locality='Seleccioná una localidad de la provincia elegida.';
 if(Object.keys(errors).length)throw new InvalidEnrollment(errors);
 const data={...normalize(body),...location};return {...data,courseName:existing?.courseId===data.courseId?existing.courseName:courses.find(c=>c.id===data.courseId).name};
}
export async function registerEnrollment(db,body){
 if(!validRequestId(body?.requestId))throw new InvalidEnrollment({requestId:'Volvé a intentar el envío.'});
 const data=await checked(db,body);const requestId=body.requestId.toLowerCase();
 const result=await db.batch([db.prepare('INSERT INTO enrollments (request_id,course_id,course_name,enrollment_date,last_name,first_name,sex,address,locality,registered_at,province_id,province_name,locality_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING').bind(requestId,data.courseId,data.courseName,data.enrollmentDate,data.lastName,data.firstName,data.sex,data.address,data.locality,new Date().toISOString(),data.provinceId,data.provinceName,data.localityId),db.prepare('SELECT * FROM enrollments WHERE request_id=?').bind(requestId)]);
 const row=result[1].results[0];if(!row)throw new Error('Sin confirmar');const enrollment=record(row);
 if(row.deleted_at||[...FIELDS,'localityId'].some(f=>enrollment[f]!==data[f]))throw new SubmissionConflict('Este envío ya se registró con otros datos.');
 return {enrollment,created:Number(result[0].meta.changes)>0};
}
export async function updateEnrollment(db,id,body){
 const existing=await findEnrollment(db,id);if(!existing)throw new SubmissionConflict('La matrícula fue eliminada.');const d=await checked(db,body,existing);
 const result=await db.batch([db.prepare('UPDATE enrollments SET course_id=?,course_name=?,enrollment_date=?,last_name=?,first_name=?,sex=?,address=?,locality=?,province_id=?,province_name=?,locality_id=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(d.courseId,d.courseName,d.enrollmentDate,d.lastName,d.firstName,d.sex,d.address,d.locality,d.provinceId,d.provinceName,d.localityId,new Date().toISOString(),id,body.version)]);
 if(!result[0].meta.changes)throw new SubmissionConflict('La matrícula cambió. Actualizá la lista antes de editar.');return findEnrollment(db,id);
}
export async function deleteEnrollment(db,id,version){const result=await db.batch([db.prepare('UPDATE enrollments SET deleted_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(new Date().toISOString(),id,version)]);if(!result[0].meta.changes)throw new SubmissionConflict('La matrícula cambió o fue eliminada. Actualizá la lista.');}
