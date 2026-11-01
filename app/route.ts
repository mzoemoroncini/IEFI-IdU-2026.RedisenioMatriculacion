import html from "../assets/index.html?raw";

import login from "../assets/login.html?raw";
import {env} from "cloudflare:workers";
import {sessionUser} from "../lib/auth.mjs";
export async function GET(request:Request) {
  let user=null;try{user=await sessionUser(env.DB,env,request);}catch{}
  return new Response(user?html:login, { headers: {
    "Cache-Control":"no-store",
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  } });
}
