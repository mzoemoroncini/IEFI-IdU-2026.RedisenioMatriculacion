import {env} from 'cloudflare:workers';
import {sessionUser,sameOrigin} from '../../../../lib/auth.mjs';
import {seedAnalyticsExamples} from '../../../../db/analytics-examples.mjs';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({message:'Solicitud no permitida.'},{status:403,headers});
 try{const user=await sessionUser(env.DB,env,request);if(!user)return Response.json({message:'Volvé a iniciar sesión.'},{status:401,headers});if(user.role!=='demo')return Response.json({message:'Acción no disponible en esta cuenta.'},{status:403,headers});return Response.json(await seedAnalyticsExamples(env.DB,user.role),{headers});}
 catch{return Response.json({message:'No se pudieron preparar los registros. Usá Actualizar para reintentar.'},{status:503,headers});}
}
