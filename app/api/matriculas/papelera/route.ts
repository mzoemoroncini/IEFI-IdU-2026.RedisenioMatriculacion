import {protectedApi} from '../../../../lib/protected-api';
import {listDeletedEnrollments} from '../../../../db/enrollments.mjs';
export const GET=protectedApi(async(_request,_context,db)=>Response.json(await listDeletedEnrollments(db)));
