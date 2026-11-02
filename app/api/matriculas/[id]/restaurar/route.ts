import {protectedApi} from '../../../../../lib/protected-api';
import {restoreEnrollment,SubmissionConflict} from '../../../../../db/enrollments.mjs';
export const POST=protectedApi(async(request,context,db)=>{
 try{const {id}=await context.params;const body=await request.json() as {version:number};if(!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id))||!Number.isSafeInteger(body?.version))return Response.json({message:'Matrícula inválida.'},{status:400});return Response.json(await restoreEnrollment(db,Number(id),body.version));}
 catch(error){return Response.json({message:error instanceof SubmissionConflict?error.message:'No se pudo recuperar la matrícula. Intentá nuevamente.'},{status:error instanceof SubmissionConflict?409:503});}
});
