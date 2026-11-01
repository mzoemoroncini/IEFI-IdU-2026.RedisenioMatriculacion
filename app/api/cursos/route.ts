import {env} from 'cloudflare:workers';
import {listCourses,saveCourse,CatalogError} from '../../../db/courses.mjs';
export async function GET(){try{return Response.json(await listCourses(env.DB),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({message:'No se pudieron cargar los cursos.'},{status:503});}}
export async function POST(request:Request){try{return Response.json(await saveCourse(env.DB,await request.json()),{status:201});}catch(error){return Response.json({message:error instanceof CatalogError?error.message:'No se pudo guardar el curso.'},{status:error instanceof CatalogError?400:503});}}
