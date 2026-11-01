import { COURSES, FIELDS, normalize, validate, validRequestId } from '../public/rules.js';
export class InvalidEnrollment extends Error { constructor(errors) { super('Revisá los campos señalados.'); this.errors=errors; } }
export class SubmissionConflict extends Error {}
const columns = 'id, course_id, course_name, enrollment_date, last_name, first_name, sex, address, locality, registered_at';
function record(row) {
  return {id:Number(row.id),code:`MAT-${String(row.id).padStart(6,'0')}`,courseId:row.course_id,courseName:row.course_name,enrollmentDate:row.enrollment_date,lastName:row.last_name,firstName:row.first_name,sex:row.sex,address:row.address,locality:row.locality,registeredAt:row.registered_at};
}
export async function findEnrollment(db,id) {
  const row=await db.prepare(`SELECT ${columns} FROM enrollments WHERE id=?`).bind(id).first();
  return row ? record(row) : null;
}
export async function registerEnrollment(db,body) {
  if (!body || typeof body!=='object' || Array.isArray(body)) throw new InvalidEnrollment({form:'El formulario no tiene un formato válido.'});
  const errors=validate(body);
  if(!validRequestId(body.requestId)) errors.requestId='No se pudo identificar el envío. Volvé a intentarlo.';
  if(Object.keys(errors).length) throw new InvalidEnrollment(errors);
  const data=normalize(body);
  const requestId=body.requestId.toLowerCase();
  const courseName=COURSES.find(course=>course.id===data.courseId).name;
  const createdAt=new Date().toISOString();
  const insert=db.prepare(`INSERT INTO enrollments (request_id,course_id,course_name,enrollment_date,last_name,first_name,sex,address,locality,registered_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING`).bind(requestId,data.courseId,courseName,data.enrollmentDate,data.lastName,data.firstName,data.sex,data.address,data.locality,createdAt);
  const query=db.prepare(`SELECT ${columns} FROM enrollments WHERE request_id=?`).bind(requestId);
  const results=await db.batch([insert,query]);
  const row=results[1].results[0];
  if(!row) throw new Error('No se pudo confirmar el guardado.');
  const enrollment=record(row);
  if(FIELDS.some(field=>enrollment[field]!==data[field])) throw new SubmissionConflict('Este envío ya se registró con otros datos.');
  return {enrollment,created:Number(results[0].meta.changes)>0};
}
