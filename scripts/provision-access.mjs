// Run manually for local configuration. Never commit its output or .dev.vars.
import {randomToken,passwordHash} from '../lib/auth.mjs';
import {writeFileSync} from 'node:fs';
const pepper=randomToken();const adminPassword=randomToken().slice(0,24);const demoPassword='Aula-Profe-'+randomToken().slice(0,8);
const accounts=[];
for(const [email,role,name,password] of [['zoe@aula.local','admin','Administración · Zoe',adminPassword],['profe@aula.local','demo','Demostración · Docente',demoPassword]]){const salt=randomToken();accounts.push({email,role,name,salt,hash:await passwordHash(password,salt,pepper)});}
const secrets={AULA_PASSWORD_PEPPER:pepper,AULA_ACCOUNTS_JSON:JSON.stringify(accounts)};
writeFileSync('.dev.vars',Object.entries(secrets).map(([k,v])=>k+"='"+v+"'").join('\n')+'\n',{mode:0o600});
process.stdout.write(JSON.stringify({secrets,adminPassword,demoPassword}));
