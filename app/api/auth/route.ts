import {env} from 'cloudflare:workers';
import {attemptLogin,sessionUser,sessionCookie,sameOrigin,logout,scopedDatabase} from '../../../lib/auth.mjs';
import {initializeDemo} from '../../../db/demo.mjs';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){try{const user=await sessionUser(env.DB,env,request);return Response.json(user||{message:'Sin sesión'},{status:user?200:401,headers});}catch{return Response.json({message:'El acceso todavía no está disponible.'},{status:503,headers});}}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({message:'Solicitud no permitida.'},{status:403,headers});
 try{const text=await request.text();if(text.length>4096)return Response.json({message:'Revisá los datos ingresados.'},{status:400,headers});let body;try{body=JSON.parse(text);}catch{return Response.json({message:'Solicitud inválida.'},{status:400,headers});}
 const result=await attemptLogin(env.DB,env,request,body);if(result.status===200&&result.user?.role==='demo')await initializeDemo(scopedDatabase(env.DB,'demo'));return result.status===200?Response.json(result.user,{headers:{...headers,'Set-Cookie':sessionCookie(result.token,request)}}):Response.json({message:result.message},{status:result.status,headers});
 }catch{return Response.json({message:'No se pudo iniciar sesión. Intentá nuevamente.'},{status:503,headers});}
}
export async function DELETE(request:Request){if(!sameOrigin(request))return Response.json({message:'Solicitud no permitida.'},{status:403,headers});try{await logout(env.DB,request);return Response.json({ok:true},{headers:{...headers,'Set-Cookie':sessionCookie('',request,0)}});}catch{return Response.json({message:'No se pudo cerrar la sesión. Reintentá.'},{status:503,headers});}}
