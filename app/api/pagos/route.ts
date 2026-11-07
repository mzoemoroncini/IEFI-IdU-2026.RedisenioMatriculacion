import {protectedApi} from '../../../lib/protected-api';
import {paymentOverview,registerPayment,setEnrollmentFee,cancelPayment,PaymentError} from '../../../db/payments.mjs';
export const GET=protectedApi(async(_req,_context,db)=>Response.json(await paymentOverview(db)));
export const POST=protectedApi(async(req,_context,db)=>{
 try{const raw=await req.text();if(raw.length>4096)return Response.json({message:'Solicitud demasiado grande.'},{status:413});const body=JSON.parse(raw);let result;
 if(body.action==='fee')result=await setEnrollmentFee(db,body);
 else if(body.action==='cancel')result=await cancelPayment(db,body);
 else if(body.action==='pay')result=await registerPayment(db,body);
 else throw new PaymentError('La acción no es válida.');
 return Response.json(result);
 }catch(e){return Response.json({message:e instanceof PaymentError?e.message:'No se pudo guardar el pago. Actualizá y volvé a intentar.'},{status:e instanceof PaymentError?e.status:503});}
});
