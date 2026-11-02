import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const light=css.match(/:root\{color-scheme:light;([^}]+)\}/)[1];
const dark=css.match(/:root\[data-theme=dark\]\{([^}]+)\}/)[1];
function palette(text) {return Object.fromEntries([...text.matchAll(/--([\w-]+):(#\w+)/g)].map(m=>[m[1],m[2]]));}
function luminance(hex){if(hex.length===4)hex='#'+[...hex.slice(1)].map(x=>x+x).join('');const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
function ratio(a,b){const [lo,hi]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (hi+.05)/(lo+.05);}
for(const [name,text] of [['claro',light],['oscuro',dark]])test(`Contraste de textos y campos en tema ${name}`,()=>{const p=palette(text);for(const bg of ['surface','canvas','soft'])for(const ink of ['ink','muted','primary'])assert.ok(ratio(p[ink],p[bg])>=4.5,`${ink}/${bg}: ${ratio(p[ink],p[bg]).toFixed(2)}`);assert.ok(ratio(p.placeholder,p.surface)>=4.5,'placeholder');assert.ok(ratio(p.border,p.surface)>=3,'borde de campo');assert.ok(ratio(p.error,p['error-soft'])>=4.5,'error');assert.ok(ratio(p.success,p['success-soft'])>=4.5,'estado completo');});
