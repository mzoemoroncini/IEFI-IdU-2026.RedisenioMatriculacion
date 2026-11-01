import {listCourses} from './courses.mjs';
// Idempotent sample data; logical deletions remain deleted on the next login.
export async function initializeDemo(db){
 await listCourses(db);
 const rows=[['demo-inicial-1','web','Desarrollo web','García','Lucía'],['demo-inicial-2','python','Programación con Python','Pérez','Tomás'],['demo-inicial-3','ux-ui','Diseño UX/UI','López','Sofía']];
 await db.batch(rows.map(([requestId,courseId,courseName,lastName,firstName])=>db.prepare('INSERT INTO enrollments (request_id,course_id,course_name,enrollment_date,last_name,first_name,sex,address,locality,registered_at,province_id,province_name,locality_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING').bind(requestId,courseId,courseName,'2026-11-01',lastName,firstName,'Prefiero no indicar','Domicilio ficticio 123','Pilar','2026-11-01T12:00:00Z','14','Córdoba','14119160')));
}
