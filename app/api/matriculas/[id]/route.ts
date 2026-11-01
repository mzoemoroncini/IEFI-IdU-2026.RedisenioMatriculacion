import { env } from 'cloudflare:workers';
import { findEnrollment } from '../../../../db/enrollments.mjs';
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
