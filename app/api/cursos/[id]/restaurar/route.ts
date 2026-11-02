import {protectedApi} from '../../../../../lib/protected-api';
import {restoreCourse,CatalogError} from '../../../../../db/courses.mjs';
export const POST=protectedApi(async(request,context,db)=>{
 try{const {id}=await context.params;const body=await request.json() as {version:number};if(!Number.isSafeInteger(body?.version))return Response.json({message:'Curso inválido.'},{status:400});return Response.json(await restoreCourse(db,id,body.version));}
 catch(error){return Response.json({message:error instanceof CatalogError?error.message:'No se pudo recuperar el curso. Intentá nuevamente.'},{status:error instanceof CatalogError?409:503});}
});
