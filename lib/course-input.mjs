import {CatalogError} from '../db/courses.mjs';
export async function readCourseBody(request){const raw=await request.text();if(raw.length>300000)throw new CatalogError('El curso o la imagen superan el tamaño permitido.');try{return JSON.parse(raw)}catch{throw new CatalogError('No se pudieron leer los datos del curso.');}}
