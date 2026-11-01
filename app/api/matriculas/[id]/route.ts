import { env } from 'cloudflare:workers';
import { findEnrollment, updateEnrollment, deleteEnrollment, InvalidEnrollment, SubmissionConflict } from '../../../../db/enrollments.mjs';
export async function GET(_request: Request, context: {params:Promise<{id:string}>}) {
  const headers={'Cache-Control':'no-store'};
  const {id}=await context.params;
  if(!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id))) return Response.json({message:'No se encontró esa matrícula.'},{status:404,headers});
  try {
    if(!env.DB) throw new Error('Base no disponible');
    const item=await findEnrollment(env.DB,Number(id));
    return item ? Response.json(item,{headers}) : Response.json({message:'No se encontró esa matrícula.'},{status:404,headers});
  } catch { return Response.json({message:'No se pudo consultar la matrícula. Intentá nuevamente.'},{status:503,headers}); }
}

async function mutate(request:Request,context:{params:Promise<{id:string}>},remove=false){
 try{const {id}=await context.params;if(!/^[1-9]\d*$/.test(id))return Response.json({message:'Matrícula inválida.'},{status:404});const body:any=await request.json();if(remove){await deleteEnrollment(env.DB,Number(id),body.version);return Response.json({ok:true});}return Response.json(await updateEnrollment(env.DB,Number(id),body));}
 catch(error){return Response.json({message:error instanceof Error?error.message:'No se pudo guardar.',errors:error instanceof InvalidEnrollment?error.errors:undefined},{status:error instanceof InvalidEnrollment?400:error instanceof SubmissionConflict?409:503});}
}
export const PUT=(request:Request,context:{params:Promise<{id:string}>})=>mutate(request,context);
export const DELETE=(request:Request,context:{params:Promise<{id:string}>})=>mutate(request,context,true);
