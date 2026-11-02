import {protectedApi} from '../../../../lib/protected-api';
import {listDeletedCourses} from '../../../../db/courses.mjs';
export const GET=protectedApi(async(_request,_context,db)=>Response.json(await listDeletedCourses(db)));
