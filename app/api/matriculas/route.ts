import {protectedApi} from '../../../lib/protected-api';

import { InvalidEnrollment, SubmissionConflict, registerEnrollment, listEnrollments } from '../../../db/enrollments.mjs';
async function handlePOST(request: Request,_context:any,db:any) {
  const headers={'Cache-Control':'no-store'};
  if(Number(request.headers.get('content-length')||0)>16384) return Response.json({message:'El formulario es demasiado grande.'},{status:413,headers});
  let body;
  try { const text=await request.text(); if(text.length>16384) return Response.json({message:'El formulario es demasiado grande.'},{status:413,headers}); body=JSON.parse(text); }
  catch { return Response.json({message:'El formulario no tiene un formato válido.'},{status:400,headers}); }
  try {
    if(!db) throw new Error('Base no disponible');
    const result=await registerEnrollment(db,body);
    return Response.json(result.enrollment,{status:result.created?201:200,headers:{...headers,Location:`/api/matriculas/${result.enrollment.id}`}});
  } catch(error) {
    if(error instanceof InvalidEnrollment) return Response.json({message:error.message,errors:error.errors},{status:400,headers});
    if(error instanceof SubmissionConflict) return Response.json({message:'Este envío ya se registró con otros datos. Revisá el formulario antes de continuar.'},{status:409,headers});
    return Response.json({message:'No se pudo confirmar el registro. Tus datos se conservaron. Intentá nuevamente.'},{status:503,headers});
  }
}

async function handleGET(_request:Request,_context:any,db:any){try{return Response.json(await listEnrollments(db),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({message:"No se pudo cargar la lista."},{status:503});}}

export const GET=protectedApi(handleGET);

export const POST=protectedApi(handlePOST);
