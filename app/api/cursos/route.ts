import {readCourseBody} from '../../../lib/course-input.mjs';
import {protectedApi} from '../../../lib/protected-api';

import {listCourses,saveCourse,CatalogError} from '../../../db/courses.mjs';
async function handleGET(_request:Request,_context:any,db:any){try{return Response.json(await listCourses(db),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({message:'No se pudieron cargar los cursos.'},{status:503});}}
async function handlePOST(request:Request,_context:any,db:any){try{return Response.json(await saveCourse(db,await readCourseBody(request)),{status:201});}catch(error){return Response.json({message:error instanceof CatalogError?error.message:'No se pudo guardar el curso.'},{status:error instanceof CatalogError?400:503});}}

export const GET=protectedApi(handleGET);

export const POST=protectedApi(handlePOST);
