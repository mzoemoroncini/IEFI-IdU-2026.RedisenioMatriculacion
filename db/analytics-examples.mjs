import {scopedDatabase} from '../lib/auth.mjs';
import {COURSE_INFO} from '../public/catalog.js';
// A fixed, one-time fixture for the docente account. No administrative tables are written.
const months=[['2025-11',3],['2025-12',4],['2026-01',4],['2026-02',5],['2026-03',4],['2026-04',5],['2026-05',7],['2026-06',6],['2026-07',10],['2026-08',8],['2026-09',11],['2026-10',9],['2026-11',6]];
const courseIds=['python','web','python','ia-generativa','excel','react','web','powerbi','ux-ui','cyber','sql','figma','node','mobile','cloud','testing'];
const names=['Valentina','Mateo','Martina','Benjamín','Camila','Santiago','Catalina','Nicolás','Julieta','Joaquín','Emilia','Francisco'];
const surnames=['Acosta','Benítez','Cabrera','Duarte','Escudero','Farias','Giménez','Herrera','Ibarra','Juárez','Ledesma','Molina'];
export const ANALYTICS_EXAMPLES=months.flatMap(([month,count],m)=>Array.from({length:count},(_,i)=>({month,m,i}))).map(({month,m,i},index)=>{
 const courseId=courseIds[(index+m)%courseIds.length],course=COURSE_INFO[courseId],kind=index%10;
 const feeCents=kind===9?null:kind===8?0:course.feeCents;
 const amountCents=feeCents===null?0:kind<5?feeCents:kind<7?Math.floor(feeCents/2):0;
 const date=month+'-'+String(month==='2026-11'?1+i%5:3+(i*2)%25).padStart(2,'0');
 return {key:'aula-analytics-v1-'+String(index+1).padStart(3,'0'),courseId,courseName:course.name,firstName:names[index%names.length],lastName:surnames[(Math.floor(index/names.length)+index)%surnames.length],date,feeCents,amountCents,paymentId:(0xf1000000+index+1).toString(16)+'-2026-4000-8000-000000000001',method:['Efectivo','Transferencia','QR simbólico'][index%3]};
});
export async function seedAnalyticsExamples(rawDb,role){
 if(role!=='demo')throw Error('Los ejemplos solo están disponibles en el acceso docente.');
 const db=scopedDatabase(rawDb,role),marker=ANALYTICS_EXAMPLES.at(-1).key;
 if(await db.prepare('SELECT id FROM enrollments WHERE request_id=?').bind(marker).first())return {created:false,count:0};
 const statements=[];
 for(const e of ANALYTICS_EXAMPLES)statements.push(db.prepare('INSERT INTO enrollments (request_id,course_id,course_name,enrollment_date,last_name,first_name,sex,address,locality,registered_at,province_id,province_name,locality_id,fee_cents) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING').bind(e.key,e.courseId,e.courseName,e.date,e.lastName,e.firstName,'Prefiero no indicar','Calle de ejemplo '+(100+statements.length),'Pilar',e.date+'T12:00:00Z','14','Córdoba','14119160',e.feeCents));
 for(const e of ANALYTICS_EXAMPLES.filter(e=>e.amountCents>0))statements.push(db.prepare("INSERT INTO payments (id,request_id,enrollment_id,amount_cents,method,paid_date,status,created_at,student_name,course_name,enrollment_code,note) SELECT ?,?,id,?,?,?,'paid',?,?,?,printf('MAT-%06d',id),? FROM enrollments WHERE request_id=? AND deleted_at IS NULL ON CONFLICT DO NOTHING").bind(e.paymentId,e.paymentId,e.amountCents,e.method,e.date,e.date+'T14:00:00Z',e.lastName+', '+e.firstName,e.courseName,'Registro de práctica',e.key));
 await db.batch(statements);return {created:true,count:ANALYTICS_EXAMPLES.length};
}
