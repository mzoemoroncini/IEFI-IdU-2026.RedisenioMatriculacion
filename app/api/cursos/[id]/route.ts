import {env} from 'cloudflare:workers';
import {saveCourse,deleteCourse,CatalogError} from '../../../../db/courses.mjs';
async function mutate(request:Request,context:{params:Promise<{id:string}>},remove=false){try{const {id}=await context.params;const body:any=await request.json();if(remove){await deleteCourse(env.DB,id,body.version);return Response.json({ok:true});}return Response.json(await saveCourse(env.DB,body,id));}catch(error){return Response.json({message:error instanceof CatalogError?error.message:'No se pudo guardar el curso.'},{status:error instanceof CatalogError?409:503});}}
export const PUT=(request:Request,context:{params:Promise<{id:string}>})=>mutate(request,context);
export const DELETE=(request:Request,context:{params:Promise<{id:string}>})=>mutate(request,context,true);
