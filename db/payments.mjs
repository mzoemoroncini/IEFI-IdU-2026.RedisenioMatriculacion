import {listEnrollments,findEnrollment} from './enrollments.mjs';
import {validDate,validRequestId,clean} from '../public/rules.js';
export class PaymentError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const amount=(v,zero=false)=>{if(!Number.isSafeInteger(v)||v<(zero?0:1)||v>100000000)throw new PaymentError('Ingresá un importe válido, con hasta dos decimales.');return v;};
const code=id=>'MAT-'+String(id).padStart(6,'0');
const moneyFields=r=>({id:r.id,requestId:r.request_id,enrollmentId:r.enrollment_id,amountCents:r.amount_cents,method:r.method,paidDate:r.paid_date,status:r.status,createdAt:r.created_at,cancelledAt:r.cancelled_at,cancelReason:r.cancel_reason,studentName:r.student_name,courseName:r.course_name,enrollmentCode:r.enrollment_code,note:r.note});
export const paymentStatus=(fee,paid)=>fee===null?'undefined':fee===0?'exempt':paid>=fee?'paid':paid>0?'partial':'pending';
export async function listPayments(db){return (await db.prepare('SELECT * FROM payments ORDER BY created_at DESC,id DESC').all()).results.map(moneyFields);}
export async function paymentOverview(db){
 const [enrollments,payments]=await Promise.all([listEnrollments(db),listPayments(db)]);
 const accounts=enrollments.map(e=>{const paid=payments.filter(p=>p.enrollmentId===e.id&&p.status==='paid').reduce((n,p)=>n+p.amountCents,0);return {...e,paidCents:paid,balanceCents:e.feeCents===null?null:Math.max(0,e.feeCents-paid),paymentStatus:paymentStatus(e.feeCents,paid)};});
 return {accounts,payments,summary:{collectedCents:payments.filter(p=>p.status==='paid').reduce((n,p)=>n+p.amountCents,0),pendingCents:accounts.reduce((n,e)=>n+(e.balanceCents||0),0),pendingCount:accounts.filter(e=>e.balanceCents>0).length,undefinedCount:accounts.filter(e=>e.feeCents===null).length}};
}
async function account(db,id,version){
 const e=await findEnrollment(db,id);if(!e)throw new PaymentError('La matrícula no está disponible.',404);
 if(!Number.isSafeInteger(version)||e.version!==version)throw new PaymentError('La matrícula cambió. Actualizá los pagos antes de continuar.',409);
 const paid=await db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS amount FROM payments WHERE enrollment_id=? AND status='paid'").bind(id).first();return {...e,paidCents:Number(paid.amount)};
}
export async function setEnrollmentFee(db,body){
 const fee=amount(body.feeCents,true),e=await account(db,body.enrollmentId,body.version);
 if(fee<e.paidCents)throw new PaymentError('El arancel no puede ser menor que lo ya abonado.');
 const result=await db.batch([db.prepare('UPDATE enrollments SET fee_cents=?,version=version+1,payment_write_token=NULL WHERE id=? AND version=? AND deleted_at IS NULL').bind(fee,e.id,e.version)]);
 if(!result[0].meta.changes)throw new PaymentError('La matrícula cambió. Actualizá los pagos.',409);
 return paymentOverview(db);
}
export async function registerPayment(db,body,now=new Date().toISOString()){
 if(!validRequestId(body.requestId))throw new PaymentError('Volvé a abrir el formulario de pago.');
 const requestId=body.requestId.toLowerCase(),value=amount(body.amountCents),methods=['QR simbólico','Efectivo','Transferencia'];
 if(!methods.includes(body.method))throw new PaymentError('Seleccioná un medio de pago.');
 if(!validDate(body.paidDate)||body.paidDate>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(now)))throw new PaymentError('Ingresá una fecha de pago válida, hasta hoy.');
 const note=clean(body.note||'');if(note.length>300)throw new PaymentError('La observación admite hasta 300 caracteres.');
 const existing=await db.prepare('SELECT * FROM payments WHERE request_id=?').bind(requestId).first();
 if(existing){if(existing.enrollment_id!==body.enrollmentId||existing.amount_cents!==value||existing.method!==body.method||existing.paid_date!==body.paidDate||existing.note!==note)throw new PaymentError('Este envío ya fue usado para otro pago.',409);return {payment:moneyFields(existing),created:false};}
 const e=await account(db,body.enrollmentId,body.version);if(e.feeCents===null)throw new PaymentError('Primero definí el arancel de esta matrícula.');
 if(value>e.feeCents-e.paidCents)throw new PaymentError('El pago supera el saldo pendiente.');
 const id=crypto.randomUUID(),token=crypto.randomUUID();
 const r=await db.batch([
  db.prepare('UPDATE enrollments SET version=version+1,payment_write_token=? WHERE id=? AND version=? AND deleted_at IS NULL').bind(token,e.id,e.version),
  db.prepare("INSERT INTO payments (id,request_id,enrollment_id,amount_cents,method,paid_date,status,created_at,student_name,course_name,enrollment_code,note) SELECT ?,?,?,?,?,?,'paid',?,?,?,?,? FROM enrollments WHERE id=? AND payment_write_token=? AND version=? AND deleted_at IS NULL").bind(id,requestId,e.id,value,body.method,body.paidDate,now,e.lastName+', '+e.firstName,e.courseName,code(e.id),note,e.id,token,e.version+1),
 ]);
 if(!r[0].meta.changes||!r[1].meta.changes)throw new PaymentError('La matrícula cambió. Actualizá antes de volver a cobrar.',409);
 return {payment:moneyFields(await db.prepare('SELECT * FROM payments WHERE id=?').bind(id).first()),created:true};
}
export async function cancelPayment(db,body,now=new Date().toISOString()){
 const reason=clean(body.reason);if(!reason||reason.length>200)throw new PaymentError('Indicá un motivo de anulación de hasta 200 caracteres.');
 const p=await db.prepare('SELECT * FROM payments WHERE id=?').bind(body.paymentId).first();if(!p||p.status!=='paid')throw new PaymentError('El pago ya fue anulado o no existe.',409);
 const e=await account(db,p.enrollment_id,body.version),token=crypto.randomUUID();
 const r=await db.batch([
  db.prepare('UPDATE enrollments SET version=version+1,payment_write_token=? WHERE id=? AND version=? AND deleted_at IS NULL').bind(token,e.id,e.version),
  db.prepare("UPDATE payments SET status='cancelled',cancelled_at=?,cancel_reason=? WHERE id=? AND status='paid' AND EXISTS (SELECT 1 FROM enrollments WHERE id=? AND payment_write_token=? AND version=?)").bind(now,reason,p.id,e.id,token,e.version+1),
 ]);
 if(!r[0].meta.changes||!r[1].meta.changes)throw new PaymentError('Los pagos cambiaron. Actualizá la lista antes de continuar.',409);
 return paymentOverview(db);
}
