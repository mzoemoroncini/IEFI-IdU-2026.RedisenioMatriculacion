import {protectedApi} from '../../../../lib/protected-api';

import {saveCourse,deleteCourse,CatalogError} from '../../../../db/courses.mjs';
async function mutate(request:Request,context:{params:Promise<{id:string}>},db:any,remove=false){try{const {id}=await context.params;const body:any=await request.json();if(remove){await deleteCourse(db,id,body.version);return Response.json({ok:true});}return Response.json(await saveCourse(db,body,id));}catch(error){return Response.json({message:error instanceof CatalogError?error.message:'No se pudo guardar el curso.'},{status:error instanceof CatalogError?409:503});}}
export const PUT=protectedApi((request,context,db)=>mutate(request,context,db));
export const DELETE=protectedApi((request,context,db)=>mutate(request,context,db,true));
