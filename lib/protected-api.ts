import {env} from 'cloudflare:workers';
import {sessionUser,sameOrigin,scopedDatabase} from './auth.mjs';
export function protectedApi(handler:(request:Request,context:any,db:any)=>Promise<Response>|Response){return async(request:Request,context:any)=>{
 const headers={'Cache-Control':'no-store'};
 try{
  const user=await sessionUser(env.DB,env,request);
  if(!user)return Response.json({message:'Tu sesión terminó. Volvé a iniciar sesión.'},{status:401,headers});
  if(!['GET','HEAD'].includes(request.method)&&!sameOrigin(request))return Response.json({message:'Solicitud no permitida.'},{status:403,headers});
  const response=await handler(request,context,scopedDatabase(env.DB,user.role));response.headers.set('Cache-Control','no-store');return response;
 }catch{return Response.json({message:'El servicio no está disponible. Intentá nuevamente.'},{status:503,headers});}
};}
