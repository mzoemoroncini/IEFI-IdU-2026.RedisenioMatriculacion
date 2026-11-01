import {FIELDS,clean,normalize,validate,validDate,createRequestId} from './rules.js';
const $=id=>document.getElementById(id);
const form=$('enrollment-form');
const fields=Object.fromEntries(FIELDS.map(name=>[name,$(name)]));
let courses=[];
let editing=null;
let localities=[];
let locationSequence=0;
let coursesReady=false;
let sending=false;
let registered=false;
let baseline='';
let submission=null;
const touched=new Set();
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function values(){return {...Object.fromEntries(FIELDS.map(name=>[name,fields[name].value])),locality:localities.find(l=>l.id===fields.locality.value)?.name||'',localityId:fields.locality.value};}
function fingerprint(){return JSON.stringify(normalize(values()));}
function dirty(){return !registered&&fingerprint()!==baseline;}
function dateLabel(value){if(!validDate(value))return 'Sin completar';const [y,m,d]=value.split('-').map(Number);const date=new Date(0);date.setFullYear(y,m-1,d);date.setHours(12,0,0,0);return new Intl.DateTimeFormat('es-AR',{dateStyle:'long'}).format(date);}
function setError(name,message=''){fields[name].setAttribute('aria-invalid',String(!!message));$(name+'-error').textContent=message;}
function preview(){
  const data=normalize(values());const errors=validate(data,courses);
  const previews={course:courses.find(course=>course.id===data.courseId)?.name||'',student:[data.lastName,data.firstName].filter(Boolean).join(', '),date:validDate(data.enrollmentDate)?dateLabel(data.enrollmentDate):'',address:[data.locality,data.address].filter(Boolean).join(' · ')};
  for(const [key,value] of Object.entries(previews)){const element=$('summary-'+key);element.textContent=value||'Sin completar';element.classList.toggle('empty-value',!value);}
  let completed=0;
  for(const [section,names] of Object.entries({course:['courseId','enrollmentDate'],student:['lastName','firstName','sex'],address:['address','provinceId','locality']})){
    const good=names.every(name=>!errors[name]);completed+=Number(good);const state=$('state-'+section);state.textContent=good?'Completo':'Pendiente';state.classList.toggle('complete',good);
  }
  $('completion-text').textContent=`${completed} de 3 secciones completas`;
  return errors;
}
function errorBanner(title,message){$('error-title').textContent=title;$('error-message').textContent=message;$('submission-error').hidden=false;}
function hideBanner(){$('submission-error').hidden=true;}
function busy(value){sending=value;for(const b of document.querySelectorAll("[data-view]"))b.disabled=value;form.setAttribute('aria-busy',String(value));for(const control of form.querySelectorAll('input,select,button'))control.disabled=value;$('courseId').disabled=value||!coursesReady;fields.locality.disabled=value||!localities.length;$('submit-button').disabled=value||!coursesReady;$('submit-label').textContent=value?'Guardando…':editing?'Guardar cambios':'Registrar matrícula';$('submit-button').querySelector('.spinner').hidden=!value;$('submit-button').querySelector('.button-arrow').hidden=value;}
function reset(){
  locationSequence++;editing=null;$('form-title').textContent='Nueva matrícula';localities=[];fields.locality.replaceChildren(new Option('Elegí una provincia primero',''));fields.locality.disabled=true;
  form.reset();registered=false;touched.clear();submission=null;fields.enrollmentDate.value=today();fields.enrollmentDate.defaultValue=fields.enrollmentDate.value;
  for(const name of FIELDS){fields[name].removeAttribute('aria-invalid');$(name+'-error').textContent='';}
  hideBanner();busy(false);baseline=fingerprint();preview();
}
async function request(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});if(response.status===401){registered=true;location.replace('/');throw Error('Sesión terminada');}
  const data=await response.json();return {response,data};
}
async function loadCourses(){
  const selected=fields.courseId.value;coursesReady=false;fields.courseId.disabled=true;$('submit-button').disabled=true;$('retry-courses').hidden=true;$('course-help').textContent='Cargando los cursos disponibles…';
  try{
    const {response,data}=await request('/api/cursos');
    if(!response.ok||!Array.isArray(data))throw new Error('courses');
    courses=data;if(editing&&!courses.some(c=>c.id===editing.courseId))courses.push({id:editing.courseId,name:editing.courseName+' (eliminado)'});fields.courseId.replaceChildren(new Option('Seleccioná un curso',''));
    for(const course of courses)fields.courseId.add(new Option(course.name,course.id));
    if(courses.some(course=>course.id===selected))fields.courseId.value=selected;
    coursesReady=true;fields.courseId.disabled=false;$('submit-button').disabled=false;$('course-help').textContent=courses.length?'':'No hay cursos. Agregá uno desde la pestaña Cursos.';
  }catch{fields.courseId.replaceChildren(new Option('Cursos no disponibles',''));$('course-help').textContent='No se pudieron cargar los cursos. Los demás datos se conservan.';$('retry-courses').hidden=false;}
  preview();
}
for(const name of FIELDS){
  fields[name].addEventListener('input',()=>{const errors=preview();if(touched.has(name))setError(name,errors[name]);hideBanner();if(!sending)$('submit-label').textContent=editing?'Guardar cambios':'Registrar matrícula';});
  fields[name].addEventListener('change',()=>{const errors=preview();if(touched.has(name))setError(name,errors[name]);});
  fields[name].addEventListener('blur',()=>{touched.add(name);setError(name,validate(values(),courses)[name]);});
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending||!coursesReady)return;
  const data=normalize(values());const errors=validate(data,courses);
  for(const name of FIELDS){touched.add(name);setError(name,errors[name]);}
  const invalid=FIELDS.filter(name=>errors[name]);
  if(invalid.length){errorBanner('Revisá los campos señalados','Los datos que ingresaste se conservaron.');fields[invalid[0]].focus();return;}
  const key=JSON.stringify(data);
  if(!submission||submission.fingerprint!==key)submission={fingerprint:key,requestId:createRequestId()};
  busy(true);hideBanner();$('live-status').textContent='Registrando matrícula…';
  try{
    const {response,data:saved}=await request(editing?'/api/matriculas/'+editing.id:'/api/matriculas',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId:submission.requestId,version:editing?.version})});
    if(!response.ok){
      if(saved.errors){for(const name of FIELDS)if(saved.errors[name])setError(name,Array.isArray(saved.errors[name])?saved.errors[name][0]:saved.errors[name]);}
      const first=FIELDS.find(name=>saved.errors?.[name]);
      errorBanner(response.status===400?'Revisá los campos señalados':'No se pudo confirmar el registro',saved.message||'Tus datos se conservaron. Intentá nuevamente.');
      if(first)fields[first].focus();
      return;
    }
    if(!Number.isSafeInteger(saved.id)||!saved.code)throw new Error('invalid response');
    renderSuccess(saved);history.replaceState(null,'',`#matricula/${saved.id}`);
  }catch{errorBanner('No se pudo confirmar el registro','Tus datos se conservaron. Reintentá con el botón de abajo. No se duplicará el mismo envío.');}
  finally{busy(false);if(!registered&&!$('submission-error').hidden)$('submit-label').textContent='Reintentar registro';$('live-status').textContent=registered?'Matrícula registrada.':'El registro no pudo confirmarse. Los datos se conservaron.';}
});
function renderSuccess(saved){
  registered=true;$('entry-content').hidden=true;$('enrollments-panel').hidden=true;$('courses-panel').hidden=true;$('success-panel').hidden=false;$('registration-code').textContent=saved.code;
  const detail=$('saved-detail');detail.replaceChildren();
  for(const [label,value] of [['Curso',saved.courseName],['Estudiante',`${saved.lastName}, ${saved.firstName}`],['Fecha de matrícula',dateLabel(saved.enrollmentDate)],['Sexo',saved.sex],['Dirección',saved.address],['Provincia',saved.provinceName||'No informada'],['Localidad',saved.locality]]){
    const group=document.createElement('div');const term=document.createElement('dt');const definition=document.createElement('dd');term.textContent=label;definition.textContent=value;group.append(term,definition);detail.append(group);
  }
  $('saved-time').textContent=`Registrada el ${new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeStyle:'short'}).format(new Date(saved.registeredAt))}`;
  document.title=`${saved.code} · Aula`;$('success-heading').focus();window.scrollTo({top:0,behavior:'auto'});
}
$('retry-courses').addEventListener('click',loadCourses);
$('clear-button').addEventListener('click',()=>{if(!dirty()){reset();fields.courseId.focus();return;}$('clear-dialog').showModal();$('keep-data').focus();});
$('clear-dialog').addEventListener('close',()=>{if($('clear-dialog').returnValue==='clear'){reset();fields.courseId.focus();}else $('clear-button').focus();});
$('clear-dialog').addEventListener('cancel',()=>{$('clear-dialog').returnValue='cancel';});
$('new-enrollment').addEventListener('click',()=>{$('success-panel').hidden=true;$('entry-content').hidden=false;history.replaceState(null,'',location.pathname+location.search);document.title='Nueva matrícula · Aula';reset();loadCourses();fields.courseId.focus();window.scrollTo({top:0,behavior:'auto'});});
window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
fields.enrollmentDate.value=today();fields.enrollmentDate.defaultValue=fields.enrollmentDate.value;baseline=fingerprint();preview();
await Promise.all([loadCourses(),loadProvinces()]);
const match=location.hash.match(/^#matricula\/([1-9]\d*)$/);
if(match){try{const {response,data}=await request('/api/matriculas/'+match[1]);if(!response.ok)throw new Error();renderSuccess(data);}catch{errorBanner('No se pudo consultar la matrícula','Revisá el enlace o intentá recargar la página.');}}

async function loadProvinces(){try{const {response,data}=await request('/api/ubicaciones');if(!response.ok)throw Error();const selected=fields.provinceId.value;fields.provinceId.replaceChildren(new Option('Seleccioná una provincia',''));for(const p of data)fields.provinceId.add(new Option(p.name,p.id));fields.provinceId.value=selected;$('retry-location').hidden=true;}catch{fields.provinceId.replaceChildren(new Option('No se pudieron cargar las provincias',''));$('retry-location').hidden=false;}}
async function loadLocalities(selected=''){
 const sequence=++locationSequence;const province=fields.provinceId.value;localities=[];fields.locality.disabled=true;fields.locality.replaceChildren(new Option(province?'Cargando localidades…':'Elegí una provincia primero',''));preview();if(!province)return;
 try{const {response,data}=await request('/api/ubicaciones?provincia='+encodeURIComponent(province));if(sequence!==locationSequence)return;if(!response.ok||!data.length)throw Error();localities=data;fields.locality.replaceChildren(new Option('Seleccioná una localidad',''));const counts=new Map();for(const l of data)counts.set(l.name,(counts.get(l.name)||0)+1);for(const l of data)fields.locality.add(new Option(counts.get(l.name)>1?l.name+' — '+l.department:l.name,l.id));fields.locality.value=selected;fields.locality.disabled=false;$('retry-location').hidden=true;}
 catch{if(sequence!==locationSequence)return;fields.locality.replaceChildren(new Option('No se pudieron cargar las localidades',''));$('retry-location').hidden=false;}preview();
}
fields.provinceId.addEventListener('change',()=>loadLocalities());
$('retry-location').addEventListener('click',async()=>{await loadProvinces();await loadLocalities();});
let enrollments=[];let catalog=[];let courseEditing=null;let deletion=null;
function element(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function action(text,fn){const b=element('button',text);b.type='button';b.className='text-button';b.addEventListener('click',fn);return b;}
async function showView(view){
 if(view==='entry'&&registered)reset();
 for(const [key,id] of Object.entries({entry:'entry-content',enrollments:'enrollments-panel',courses:'courses-panel'}))$(id).hidden=key!==view;
 $('success-panel').hidden=true;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 history.replaceState(null,'',location.pathname);document.title=(view==='entry'?'Nueva matrícula':view==='courses'?'Cursos':'Matriculados')+' · Aula';
 if(view==='enrollments')await refreshEnrollments();if(view==='courses')await refreshCatalog();if(view==='entry')await loadCourses();
}
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>showView(b.dataset.view));
async function refreshEnrollments(){
 $('enrollments-status').textContent='Cargando matrículas…';try{const {response,data}=await request('/api/matriculas');if(!response.ok)throw Error();enrollments=data;const selected=$('filter-course').value;const options=new Map(data.map(e=>[e.courseId,e.courseName]));$('filter-course').replaceChildren(new Option('Todos los cursos',''));for(const [id,name]of options)$('filter-course').add(new Option(name,id));$('filter-course').value=selected;renderEnrollments();}catch{$('enrollments-status').textContent='No se pudo cargar la lista. Usá Actualizar lista para reintentar.';$('enrollments-body').replaceChildren();}
}
const searchKey=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
function renderEnrollments(){
 const query=searchKey($('search-enrollments').value.trim());const rows=enrollments.filter(e=>(!query||searchKey(e.lastName+' '+e.firstName+' '+e.code).includes(query))&&(!$('filter-course').value||e.courseId===$('filter-course').value)&&(!$('filter-date').value||e.enrollmentDate===$('filter-date').value));
 $('enrollments-body').replaceChildren();$('enrollments-status').textContent=rows.length?`${rows.length} matrícula(s)`:'No hay matrículas para mostrar.';
 for(const e of rows){const tr=document.createElement('tr');for(const value of [e.code+' · '+dateLabel(e.enrollmentDate),e.lastName+', '+e.firstName,e.courseName,[e.locality,e.provinceName||'Provincia no informada'].join(', ')])tr.append(element('td',value));const td=document.createElement('td');td.className='row-actions';td.append(action('Editar',()=>editEnrollment(e)),action('Eliminar',()=>askDelete('matricula',e)));tr.append(td);$('enrollments-body').append(tr);}
}
for(const id of ['search-enrollments','filter-course','filter-date'])$(id).addEventListener('input',renderEnrollments);
$('refresh-enrollments').addEventListener('click',refreshEnrollments);
async function editEnrollment(e){reset();editing=e;await showView('entry');$('form-title').textContent='Editar '+e.code;for(const name of FIELDS)if(name!=='locality')fields[name].value=e[name]||'';await loadLocalities(e.localityId);baseline=fingerprint();busy(false);preview();$('form-title').scrollIntoView({block:'start'});fields.lastName.focus();}
async function refreshCatalog(){
 $('courses-status').textContent='Cargando cursos…';try{const {response,data}=await request('/api/cursos');if(!response.ok)throw Error();catalog=data;$('courses-body').replaceChildren();$('courses-status').textContent=data.length?`${data.length} curso(s) disponible(s)`:'Todavía no hay cursos. Agregá el primero.';for(const c of data){const tr=document.createElement('tr');tr.append(element('td',c.name));const td=document.createElement('td');td.className='row-actions';td.append(action('Editar',()=>openCourse(c)),action('Eliminar',()=>askDelete('curso',c)));tr.append(td);$('courses-body').append(tr);}}catch{$('courses-status').textContent='No se pudieron cargar los cursos. Volvé a abrir esta pestaña para reintentar.';}
}
function openCourse(c=null){courseEditing=c;$('course-dialog-title').textContent=c?'Editar curso':'Agregar curso';$('course-name').value=c?.name||'';$('course-dialog-error').textContent='';$('course-dialog').showModal();$('course-name').focus();}
$('add-course').addEventListener('click',()=>openCourse());$('cancel-course').addEventListener('click',()=>$('course-dialog').close());
$('course-form').addEventListener('submit',async event=>{event.preventDefault();const buttons=$('course-form').querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{const {response,data}=await request('/api/cursos'+(courseEditing?'/'+courseEditing.id:''),{method:courseEditing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('course-name').value,version:courseEditing?.version})});if(!response.ok)throw Error(data.message);$('course-dialog').close();await refreshCatalog();}catch(error){$('course-dialog-error').textContent=error.message||'No se pudo guardar.';}finally{buttons.forEach(b=>b.disabled=false);}});
function askDelete(type,item){deletion={type,item};$('delete-message').textContent=type==='curso'?`¿Eliminar “${item.name}” del catálogo? Las matrículas guardadas se conservan.`:`¿Eliminar la matrícula ${item.code} de ${item.lastName}, ${item.firstName}?`;$('delete-error').textContent='';$('delete-dialog').showModal();$('cancel-delete').focus();}
$('cancel-delete').addEventListener('click',()=>$('delete-dialog').close());
$('confirm-delete').addEventListener('click',async()=>{const {type,item}=deletion;$('confirm-delete').disabled=true;$('cancel-delete').disabled=true;try{const {response,data}=await request('/api/'+(type==='curso'?'cursos':'matriculas')+'/'+item.id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:item.version})});if(!response.ok)throw Error(data.message);$('delete-dialog').close();if(type==='curso')await refreshCatalog();else await refreshEnrollments();}catch(error){$('delete-error').textContent=error.message||'No se pudo eliminar.';}finally{$('confirm-delete').disabled=false;$('cancel-delete').disabled=false;}});

const identity=await request('/api/auth');if(identity.response.ok){$('session-name').textContent=identity.data.name;}
$('logout-button').addEventListener('click',async()=>{if(dirty()){if(!confirm('Tenés cambios sin guardar. ¿Querés cerrar sesión y descartarlos?'))return;}$('logout-button').disabled=true;try{const response=await fetch('/api/auth',{method:'DELETE'});if(!response.ok)throw Error();registered=true;location.replace('/');}catch{$('logout-error').textContent='No se pudo cerrar sesión. Intentá nuevamente.';$('logout-button').disabled=false;}});

window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
