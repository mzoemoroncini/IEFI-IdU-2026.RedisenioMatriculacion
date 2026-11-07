import {buildStatistics,monthlySeries,statisticsPeriod} from './statistics-model.js';
import {matchesQuery} from './search-utils.js';
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const money=c=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2,minimumFractionDigits:0}).format(c/100);
const names={paid:'Pagadas',partial:'Pago parcial',pending:'Pendientes',exempt:'Sin cargo',undefined:'Sin importe definido'};
const pct=(n,total)=>new Intl.NumberFormat('es-AR',{style:'percent',maximumFractionDigits:1}).format(total?n/total:0);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let request,accounts=[],courses=[],sequence=0,ready=false,examples=false,examplesReady=false,selectedState=null;
export function initStatistics(options){
 request=options.request;examples=options.examples;
 $('refresh-statistics').addEventListener('click',loadStatistics);
 for(const id of ['stats-from','stats-to','stats-search'])$(id).addEventListener('input',render);
 for(const button of document.querySelectorAll('[data-stats-period]'))button.addEventListener('click',()=>applyPeriod(button.dataset.statsPeriod));
 $('stats-reset').addEventListener('click',()=>{$('stats-search').value='';applyPeriod('all')});
 $('stats-state-search').addEventListener('input',renderStateDetail);
 $('stats-state-close').addEventListener('click',()=>{const previous=selectedState;selectedState=null;updateSelection();$('stats-state-'+previous)?.focus()});
}
function applyPeriod(key){const period=statisticsPeriod(key,today());$('stats-from').value=period.from;$('stats-to').value=period.to;render();}
export async function loadStatistics(){
 const run=++sequence;ready=false;$('statistics-content').hidden=true;$('stats-message').textContent='Cargando estadísticas…';$('stats-message').className='stats-message';$('refresh-statistics').disabled=true;
 try{
  if(examples&&!examplesReady){const seed=await request('/api/estadisticas/ejemplos',{method:'POST'});if(!seed.response.ok)throw Error();examplesReady=true;}
  const [p,c]=await Promise.all([request('/api/pagos'),request('/api/cursos')]);
  if(run!==sequence)return;
  if(!p.response.ok||!c.response.ok||!Array.isArray(p.data.accounts)||!Array.isArray(c.data))throw Error();
  accounts=p.data.accounts;courses=c.data;ready=true;render();
  $('stats-updated').textContent='Actualizado a las '+new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
 }catch{if(run===sequence){$('stats-message').textContent='No se pudieron cargar las estadísticas. Usá Actualizar para reintentar.';$('stats-message').className='stats-message field-error';}}
 finally{if(run===sequence)$('refresh-statistics').disabled=false;}
}
function filteredAccounts(){const from=$('stats-from').value,to=$('stats-to').value;return accounts.filter(a=>(!from||a.enrollmentDate>=from)&&(!to||a.enrollmentDate<=to));}
function selectState(key){selectedState=selectedState===key?null:key;$('stats-state-search').value='';updateSelection();}
function updateSelection(){
 for(const b of document.querySelectorAll('#stats-states button'))b.setAttribute('aria-expanded',String(b.dataset.state===selectedState));
 $('stats-donut').classList.toggle('has-selection',selectedState!==null);
 for(const arc of $('stats-donut').querySelectorAll('[data-state]'))arc.classList.toggle('is-active',arc.dataset.state===selectedState);
 renderStateDetail();
}
function renderStateDetail(){
 $('stats-state-detail').hidden=selectedState===null;if(selectedState===null)return;
 const all=filteredAccounts().filter(a=>a.paymentStatus===selectedState),rows=all.filter(a=>matchesQuery(a.lastName+' '+a.firstName+' '+a.code+' '+a.courseName,$('stats-state-search').value));
 $('stats-state-title').textContent=names[selectedState]+' · '+all.length+' matrículas';
 $('stats-state-status').textContent=rows.length+' de '+all.length+' matrículas';
 const root=$('stats-state-list');root.replaceChildren();
 for(const a of rows){const row=node('article',undefined,'stats-state-account'),who=node('div');who.append(node('strong',a.lastName+', '+a.firstName),node('small',a.code+' · '+a.courseName));row.append(who,node('span',a.balanceCents===null?'Arancel por definir':'Saldo: '+money(a.balanceCents)));root.append(row);}
 if(!rows.length)root.append(node('p','No hay matrículas que coincidan con esta selección.','stats-empty'));
}
function render(){
 if(!ready)return;const from=$('stats-from').value,to=$('stats-to').value;
 for(const button of document.querySelectorAll('[data-stats-period]')){const period=statisticsPeriod(button.dataset.statsPeriod,today());button.setAttribute('aria-pressed',String(period.from===from&&period.to===to));}
 if(from&&to&&from>to){$('stats-message').textContent='La fecha Desde debe ser anterior o igual a Hasta.';$('stats-message').className='stats-message field-error';$('statistics-content').hidden=true;return;}
 $('stats-message').className='stats-message';const s=buildStatistics(accounts,courses,{from,to});$('statistics-content').hidden=false;
 $('stats-message').textContent=s.total?s.total+' matrículas en el período seleccionado.':'Todavía no hay matrículas en este período. Podés cambiar las fechas.';
 const cards=$('stats-cards');cards.replaceChildren();
 for(const [title,value,detail,cls] of [['Matrículas',s.total,s.withEnrollments+' cursos con inscripciones','enrolled'],['Cursos disponibles',s.activeCourses,'Oferta actual del catálogo','catalog'],['Cobros de estas matrículas',money(s.paidCents),'Pagos vigentes acumulados','collected'],['Saldo por cobrar',money(s.pendingCents),s.undefinedCount+' matrículas con arancel sin definir','outstanding']]){const c=node('article',undefined,'stats-kpi '+cls);c.append(node('span',title),node('strong',String(value)),node('small',detail));cards.append(c);}
 const ranked=s.rows.filter(c=>c.count).slice(0,5);ranking($('stats-ranking'),ranked,s.total);
 $('stats-ranking-note').textContent=ranked.length?'Cantidad y porcentaje sobre las '+s.total+' matrículas del período.':'Las inscripciones aparecerán acá al registrar matrículas.';
 const series=monthlySeries(s.months);trend($('stats-trend'),series.map(([month,value])=>({label:new Intl.DateTimeFormat('es-AR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z')),fullLabel:new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z')),value})));
 $('stats-trend-note').textContent=series.length&&series[0][0]!==s.months[0][0]?'Últimos 12 meses hasta la última matrícula del período.':'Matrículas por mes. Los meses intermedios sin inscripciones muestran cero.';
 donut($('stats-donut'),s.states,s.total);
 const states=$('stats-states');states.replaceChildren();
 for(const [key,label]of Object.entries(names)){const row=node('button',undefined,'stats-state');row.type='button';row.id='stats-state-'+key;row.dataset.state=key;row.setAttribute('aria-controls','stats-state-detail');row.setAttribute('aria-label',label+': '+s.states[key]+' matrículas, '+pct(s.states[key],s.total)+'. Ver matrículas.');const amount=node('div',undefined,'stats-state-amount');amount.append(node('strong',String(s.states[key])),node('small',pct(s.states[key],s.total)));row.append(node('span',label,'pay-badge '+key),amount);row.addEventListener('click',()=>selectState(key));states.append(row);}
 updateSelection();
 const rows=s.rows.filter(c=>matchesQuery(c.name+' '+c.area,$('stats-search').value)),body=$('stats-course-body');body.replaceChildren();
 for(const c of rows){const tr=node('tr'),name=node('td');name.append(node('strong',c.name));if(!c.active)name.append(node('small','Fuera del catálogo actual','stats-archived'));for(const value of [c.count,money(c.paidCents),money(c.pendingCents),c.undefinedCount])tr.append(node('td',String(value)));tr.prepend(name);body.append(tr);}
 $('stats-table-status').textContent=rows.length+' de '+s.rows.length+' cursos · Ordenados por cantidad de matrículas';
 if(!rows.length){const tr=node('tr'),td=node('td','No hay cursos que coincidan con tu búsqueda.');td.colSpan=5;tr.append(td);body.append(tr);}
}
function insight(root,text='Pasá el cursor, tocá o usá Tab para ver los valores.'){const p=node('p',text,'stats-insight');p.setAttribute('aria-live','polite');root.append(p);return p;}
function interactive(target,root,readout,text,onClick){
 target.setAttribute('tabindex','0');target.setAttribute('role','button');target.setAttribute('aria-label',text);target.classList.add('stats-interactive');
 const show=()=>{for(const mark of root.querySelectorAll('.stats-interactive'))mark.classList.toggle('is-highlighted',mark===target);readout.textContent=text;};
 target.addEventListener('pointerenter',show);target.addEventListener('focus',show);target.addEventListener('click',()=>{show();onClick?.()});
 target.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();onClick?.()}});
}
function ranking(root,items,total){
 root.replaceChildren();if(!items.length){root.append(node('p','No hay matrículas en este período.','stats-empty'));return;}
 const max=Math.max(1,...items.map(i=>i.count)),readout=node('p','Pasá el cursor, tocá o usá Tab para ver los valores.','stats-insight');readout.setAttribute('aria-live','polite');
 for(const item of items){const row=node('div',undefined,'stats-chart-row'),label=node('div',undefined,'stats-chart-label'),bar=node('meter');label.append(node('span',item.name),node('strong',item.count+' · '+pct(item.count,total)));bar.min=0;bar.max=max;bar.value=item.count;bar.setAttribute('aria-label',item.name+': '+item.count+' matrículas');row.append(label,bar);interactive(row,root,readout,item.name+': '+item.count+' matrículas · '+pct(item.count,total)+' del total.');root.append(row);}
 root.append(readout);
}
const svgNS='http://www.w3.org/2000/svg';
function svg(tag,attrs={}){const e=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));return e;}
function trend(root,items){
 root.replaceChildren();if(!items.length){root.append(node('p','La evolución aparecerá cuando registres matrículas.','stats-empty'));return;}
 const graph=svg('svg',{viewBox:'0 0 460 235',role:'group','aria-label':'Evolución mensual de matrículas'}),title=svg('title');title.textContent='Evolución mensual de matrículas';graph.append(title);
 const step=Math.max(1,Math.ceil(Math.max(...items.map(i=>i.value))/4)),max=step*4,top=24,bottom=176,left=37,right=433,columns=items.length<=4;
 for(let i=0;i<=4;i++){const y=bottom-(bottom-top)*i/4;graph.append(svg('line',{x1:left,y1:y,x2:right,y2:y,class:'stats-gridline'}));const label=svg('text',{x:left-9,y:y+4,'text-anchor':'end',class:'stats-trend-label'});label.textContent=i*step;graph.append(label);}
 const slot=(right-left)/items.length,points=items.map((item,i)=>({x:left+slot*(i+.5),y:bottom-item.value/max*(bottom-top),...item}));
 if(!columns){const path=points.map(p=>p.x+','+p.y).join(' ');graph.append(svg('polygon',{points:points[0].x+','+bottom+' '+path+' '+points.at(-1).x+','+bottom,class:'stats-trend-area'}),svg('polyline',{points:path,fill:'none',class:'stats-trend-line'}));}
 root.append(graph);const readout=insight(root);
 for(const [index,p] of points.entries()){
  const group=svg('g'),label=p.fullLabel+': '+p.value+(p.value===1?' matrícula':' matrículas');
  if(columns)group.append(svg('rect',{x:p.x-Math.min(24,slot*.28),y:p.y,width:Math.min(48,slot*.56),height:bottom-p.y,rx:6,class:'stats-trend-bar'}));
  else group.append(svg('circle',{cx:p.x,cy:p.y,r:5,class:'stats-trend-dot'}));
  const count=svg('text',{x:p.x,y:p.y-10,'text-anchor':'middle',class:'stats-trend-value'});count.textContent=p.value;group.append(count);
  group.append(svg('rect',{x:p.x-slot/2+1,y:top-5,width:Math.max(28,slot-2),height:bottom-top+17,fill:'transparent',class:'stats-chart-hit'}));
  const tip=svg('title');tip.textContent=label;group.append(tip);interactive(group,root,readout,label);graph.append(group);
  if(points.length<=6||(index%2===0&&index<points.length-2)||index===points.length-1){const text=svg('text',{x:p.x,y:202,'text-anchor':'middle',class:'stats-trend-label'});text.textContent=p.label;graph.append(text);}
 }
}
function donut(root,states,total){
 root.replaceChildren();const readout=$('stats-donut-insight');readout.textContent='Tocá un estado para ver sus matrículas.';
 const graph=svg('svg',{viewBox:'0 0 200 200',role:'group','aria-label':'Distribución de '+total+' matrículas por estado de pago'});graph.append(svg('circle',{cx:100,cy:100,r:73,fill:'none','stroke-width':21,class:'stats-donut-track'}));
 const circumference=2*Math.PI*73;let offset=0;
 for(const [key,count]of Object.entries(states)){if(!count)continue;const length=count/total*circumference,start=offset/circumference*2*Math.PI-Math.PI/2,end=(offset+length)/circumference*2*Math.PI-Math.PI/2,attrs={fill:'none','stroke-width':21,class:'stats-arc '+key,'data-state':key,'pointer-events':'stroke'},arc=count===total?svg('circle',{...attrs,cx:100,cy:100,r:73}):svg('path',{...attrs,d:'M '+(100+73*Math.cos(start))+' '+(100+73*Math.sin(start))+' A 73 73 0 '+(count/total>.5?1:0)+' 1 '+(100+73*Math.cos(end))+' '+(100+73*Math.sin(end))});interactive(arc,root,readout,names[key]+': '+count+' matrículas · '+pct(count,total),()=>selectState(key));graph.append(arc);offset+=length;}
 const count=svg('text',{x:100,y:99,'text-anchor':'middle',class:'stats-donut-total'});count.textContent=total;const label=svg('text',{x:100,y:123,'text-anchor':'middle',class:'stats-donut-caption'});label.textContent='matrículas';graph.append(count,label);root.append(graph);
}
