// Passwords are provisioned as salted hashes in server-only environment secrets.
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));}
export async function passwordHash(password,salt,pepper){const key=await crypto.subtle.importKey('raw',encoder.encode(password+'\0'+pepper),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256));}
function equal(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function accounts(env){const config=JSON.parse(env.AULA_ACCOUNTS_JSON||'[]');if(!Array.isArray(config)||config.length!==2||!env.AULA_PASSWORD_PEPPER)throw Error('Acceso sin configurar');return config;}
export function sameOrigin(request){return request.headers.get('Origin')===new URL(request.url).origin;}
export function sessionCookie(token,request,maxAge=28800){return `aula_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function sessionUser(db,env,request,now=Date.now()){
 const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('aula_session='))?.slice(13);
 if(!token||!/^\w{64}$/.test(token))return null;
 const row=await db.prepare('SELECT * FROM auth_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),now).first();if(!row)return null;
 const account=accounts(env).find(a=>a.email===row.email&&a.role===row.role);if(!account||row.credential_key!==await digest(account.hash))return null;
 return {email:account.email,role:account.role,name:account.name};
}
export async function attemptLogin(db,env,request,body,now=Date.now()){
 const config=accounts(env);const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';const password=typeof body?.password==='string'?body.password:'';
 const account=config.find(a=>a.email===email);const ip=request.headers.get('cf-connecting-ip')||'local';const bucket=await digest(ip+'|'+(account?.email||'unknown'));const window=Math.floor(now/900000);
 const result=await db.batch([db.prepare('INSERT INTO auth_limits (bucket,window,attempts) VALUES (?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END,window=excluded.window').bind(bucket,window),db.prepare('SELECT attempts FROM auth_limits WHERE bucket=?').bind(bucket)]);
 if(result[1].results[0].attempts>10)return {status:429,message:'Demasiados intentos. Esperá 15 minutos antes de volver a probar.'};
 const compare=account||config[0];const candidate=await passwordHash(password.slice(0,256),compare.salt,env.AULA_PASSWORD_PEPPER);
 if(!account||password.length>256||!equal(candidate,compare.hash))return {status:401,message:'El correo o la contraseña no son correctos.'};
 const token=randomToken();const old=request.headers.get('cookie')?.match(/(?:^|;\s*)aula_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 const writes=[db.prepare('DELETE FROM auth_limits WHERE bucket=?').bind(bucket),db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO auth_sessions (token_hash,email,role,credential_key,expires_at) VALUES (?,?,?,?,?)').bind(await digest(token),account.email,account.role,await digest(account.hash),now+28800000)];
 if(old)writes.push(db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(old)));
 await db.batch(writes);return {status:200,token,user:{email:account.email,role:account.role,name:account.name}};
}
export async function logout(db,request){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)aula_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(token)await db.batch([db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(token))]);}
// Both table names are fixed in code; user input is always bound as parameters.
export function scopedDatabase(db,role){if(role==='admin')return db;if(role!=='demo')throw Error('Rol inválido');return {prepare(sql){return db.prepare(sql.replace(/\benrollments\b/g,'demo_enrollments').replace(/\bcourses\b/g,'demo_courses').replace(/\bpayments\b/g,'demo_payments'));},batch(statements){return db.batch(statements);}};}
