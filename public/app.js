import { restoreFocus } from './focus.js';
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
  locationSequence++;editing=null;$('cancel-edit').hidden=true;$('clear-button').hidden=false;$('form-title').textContent='Nueva matrícula';localities=[];fields.locality.replaceChildren(new Option('Elegí una provincia primero',''));fields.locality.disabled=true;
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
      busy(false);
      errorBanner(response.status===400?'Revisá los campos señalados':'No se pudo confirmar el registro',saved.message||'Tus datos se conservaron. Intentá nuevamente.');
      if(first)fields[first].focus();
      return;
    }
    if(!Number.isSafeInteger(saved.id)||!saved.code)throw new Error('invalid response');
    renderSuccess(saved,editing?'updated':'created');history.replaceState(null,'',`#matricula/${saved.id}`);
  }catch{errorBanner('No se pudo confirmar el registro','Tus datos se conservaron. Reintentá con el botón de abajo. No se duplicará el mismo envío.');}
  finally{busy(false);if(!registered&&!$('submission-error').hidden)$('submit-label').textContent='Reintentar registro';$('live-status').textContent=registered?'Matrícula registrada.':'El registro no pudo confirmarse. Los datos se conservaron.';}
});
function renderSuccess(saved,mode='saved'){
  $('success-heading').textContent=mode==='updated'?'Matrícula actualizada':mode==='created'?'Matrícula registrada':'Matrícula guardada';$('success-eyebrow').textContent=mode==='updated'?'CAMBIOS GUARDADOS':'REGISTRO COMPLETADO';$('success-message').textContent=mode==='updated'?'Los cambios se guardaron correctamente. Se conservó el código de matrícula.':'La inscripción quedó guardada correctamente.';
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
let currentView='entry';let enrollments=[];let catalog=[];let courseEditing=null;let deletion=null;let courseReturnFocus=null;let deleteReturnFocus=null;
function element(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function action(text,fn,subject){const b=element('button',text);b.setAttribute('aria-label',text+' '+subject);b.type='button';b.className='text-button';b.addEventListener('click',fn);return b;}
async function showView(view){
 currentView=view;
 if(view==='entry'&&registered)reset();
 for(const [key,id] of Object.entries({entry:'entry-content',enrollments:'enrollments-panel',courses:'courses-panel'}))$(id).hidden=key!==view;
 $('success-panel').hidden=true;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 history.replaceState(null,'',location.pathname);document.title=(view==='entry'?'Nueva matrícula':view==='courses'?'Cursos':'Matriculados')+' · Aula';
 $(view==='entry'?'form-title':view==='courses'?'courses-heading':'enrollments-heading').focus();
 if(view==='enrollments')await refreshEnrollments();if(view==='courses')await refreshCatalog();if(view==='entry')await loadCourses();
}
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>showView(b.dataset.view));
async function refreshEnrollments(){
 const focused=document.activeElement;$('enrollments-status').textContent='Cargando matrículas…';try{const {response,data}=await request('/api/matriculas');if(!response.ok)throw Error();enrollments=data;const selected=$('filter-course').value;const options=new Map(data.map(e=>[e.courseId,e.courseName]));$('filter-course').replaceChildren(new Option('Todos los cursos',''));for(const [id,name]of options)$('filter-course').add(new Option(name,id));$('filter-course').value=selected;renderEnrollments();if(!focused?.isConnected)restoreFocus(focused,$('refresh-enrollments'));}catch{$('enrollments-status').textContent='No se pudo cargar la lista. Usá Actualizar lista para reintentar.';$('enrollments-body').replaceChildren();}
}
const searchKey=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
function renderEnrollments(){
 const query=searchKey($('search-enrollments').value.trim());const rows=enrollments.filter(e=>(!query||searchKey(e.lastName+' '+e.firstName+' '+e.code).includes(query))&&(!$('filter-course').value||e.courseId===$('filter-course').value)&&(!$('filter-date').value||e.enrollmentDate===$('filter-date').value));
 const filtered=!!(query||$('filter-course').value||$('filter-date').value);$('clear-filters').hidden=!filtered;
 $('enrollments-body').replaceChildren();$('enrollments-status').textContent=rows.length?`${rows.length} de ${enrollments.length} matrícula(s)${filtered?' · Filtros aplicados':''}`:filtered?'No hay coincidencias. Probá otro dato o usá Limpiar filtros.':'Todavía no hay matrículas. Registrá la primera desde Nueva matrícula.';
 for(const e of rows){const tr=document.createElement('tr');for(const value of [e.code+' · '+dateLabel(e.enrollmentDate),e.lastName+', '+e.firstName,e.courseName,[e.locality,e.provinceName||'Provincia no informada'].join(', ')])tr.append(element('td',value));const td=document.createElement('td');td.className='row-actions';td.append(action('Editar',()=>editEnrollment(e),e.code+' de '+e.lastName+', '+e.firstName),action('Eliminar',()=>askDelete('matricula',e),e.code+' de '+e.lastName+', '+e.firstName));tr.append(td);$('enrollments-body').append(tr);}
}
for(const id of ['search-enrollments','filter-course','filter-date'])$(id).addEventListener('input',renderEnrollments);
$('refresh-enrollments').addEventListener('click',refreshEnrollments);
async function editEnrollment(e){if(dirty()&&!confirm('Tenés datos sin guardar. ¿Querés descartarlos para editar esta matrícula?'))return;reset();editing=e;$('cancel-edit').hidden=false;$('clear-button').hidden=true;await showView('entry');$('form-title').textContent='Editar '+e.code;for(const name of FIELDS)if(name!=='locality')fields[name].value=e[name]||'';await loadLocalities(e.localityId);baseline=fingerprint();busy(false);preview();$('form-title').scrollIntoView({block:'start'});fields.lastName.focus();}
async function refreshCatalog(){
 const focused=document.activeElement;$('courses-status').textContent='Cargando cursos…';try{const {response,data}=await request('/api/cursos');if(!response.ok)throw Error();catalog=data;$('courses-body').replaceChildren();$('courses-status').textContent=data.length?`${data.length} curso(s) disponible(s)`:'Todavía no hay cursos. Agregá el primero.';for(const c of data){const tr=document.createElement('tr');const nameCell=element('th',c.name);nameCell.scope='row';tr.append(nameCell);const td=document.createElement('td');td.className='row-actions';td.append(action('Editar',()=>openCourse(c),c.name),action('Eliminar',()=>askDelete('curso',c),c.name));tr.append(td);$('courses-body').append(tr);}if($('courses-body').contains(focused)||!focused?.isConnected)restoreFocus(focused,$('add-course'));}catch{$('courses-status').textContent='No se pudieron cargar los cursos. Volvé a abrir esta pestaña para reintentar.';}
}
function openCourse(c=null){courseReturnFocus=document.activeElement;courseEditing=c;$('course-name').removeAttribute('aria-invalid');$('course-dialog-title').textContent=c?'Editar curso':'Agregar curso';$('course-name').value=c?.name||'';$('course-dialog-error').textContent='';$('course-dialog').showModal();$('course-name').focus();}
$('add-course').addEventListener('click',()=>openCourse());$('cancel-course').addEventListener('click',()=>$('course-dialog').close());
$('course-form').addEventListener('submit',async event=>{event.preventDefault();const buttons=$('course-form').querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{const {response,data}=await request('/api/cursos'+(courseEditing?'/'+courseEditing.id:''),{method:courseEditing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('course-name').value,version:courseEditing?.version})});if(!response.ok)throw Error(data.message);$('course-dialog').close();await refreshCatalog();$('live-status').textContent='Curso guardado correctamente.';restoreFocus(courseReturnFocus,$('add-course'));}catch(error){$('course-dialog-error').textContent=error.message||'No se pudo guardar.';$('course-name').setAttribute('aria-invalid','true');$('course-name').focus();}finally{buttons.forEach(b=>b.disabled=false);}});
function askDelete(type,item){deleteReturnFocus=document.activeElement;deletion={type,item};$('delete-message').textContent=type==='curso'?`¿Mover “${item.name}” a la papelera? Las matrículas guardadas se conservan. Podés recuperar el curso desde Papelera de cursos.`:`¿Mover la matrícula ${item.code} de ${item.lastName}, ${item.firstName} a la papelera? Podés recuperarla desde Papelera de matrículas.`;$('delete-error').textContent='';$('delete-dialog').showModal();$('cancel-delete').focus();}
$('cancel-delete').addEventListener('click',()=>$('delete-dialog').close());
$('confirm-delete').addEventListener('click',async()=>{const {type,item}=deletion;$('confirm-delete').disabled=true;$('cancel-delete').disabled=true;try{const {response,data}=await request('/api/'+(type==='curso'?'cursos':'matriculas')+'/'+item.id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:item.version})});if(!response.ok)throw Error(data.message);$('delete-dialog').close();if(type==='curso')await refreshCatalog();else await refreshEnrollments();$('live-status').textContent=type==='curso'?'Curso enviado a la papelera. Podés recuperarlo desde Papelera de cursos.':'Matrícula enviada a la papelera. Podés recuperarla desde Papelera de matrículas.';restoreFocus(deleteReturnFocus,$(type==='curso'?'add-course':'refresh-enrollments'));}catch(error){$('delete-error').textContent=error.message||'No se pudo eliminar.';}finally{$('confirm-delete').disabled=false;$('cancel-delete').disabled=false;}});

const identity=await request('/api/auth');if(identity.response.ok){$('session-name').textContent=identity.data.name;}
$('logout-button').addEventListener('click',async()=>{if(dirty()){if(!confirm('Tenés cambios sin guardar. ¿Querés cerrar sesión y descartarlos?'))return;}$('logout-button').disabled=true;try{const response=await fetch('/api/auth',{method:'DELETE'});if(!response.ok)throw Error();registered=true;location.replace('/');}catch{$('logout-error').textContent='No se pudo cerrar sesión. Intentá nuevamente.';$('logout-button').disabled=false;}});

window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});

// Escape and Cancel return to the invoking control; saved/deleted rows may have been replaced.
$('course-dialog').addEventListener('close',()=>restoreFocus(courseReturnFocus,$('add-course')));
$('delete-dialog').addEventListener('close',()=>restoreFocus(deleteReturnFocus,$(deletion?.type==='curso'?'add-course':'refresh-enrollments')));
$('course-name').addEventListener('input',()=>{$('course-name').removeAttribute('aria-invalid');$('course-dialog-error').textContent='';});

$('cancel-edit').addEventListener('click',async()=>{if(dirty()&&!confirm('¿Querés descartar los cambios de esta matrícula? El registro guardado se conserva.'))return;reset();await showView('enrollments');$('live-status').textContent='Edición cancelada. La matrícula guardada se conservó.';});
$('clear-filters').addEventListener('click',()=>{for(const id of ['search-enrollments','filter-course','filter-date'])$(id).value='';renderEnrollments();$('search-enrollments').focus();});

const help={
 entry:{title:'Registrar y editar matrículas',steps:['Elegí el curso y la fecha. Completá los datos del estudiante y su domicilio.','Seleccioná primero la provincia; las localidades se cargan según esa elección.','El resumen se actualiza mientras completás el formulario. Revisalo y elegí Registrar matrícula.','Para corregir una matrícula guardada, buscala en Matriculados y elegí Editar. Guardar cambios conserva su código. Cancelar edición conserva el registro anterior.']},
 enrollments:{title:'Buscar y administrar matrículas',steps:['Buscá por nombre, apellido o código. Podés combinar la búsqueda con curso y fecha.','Limpiar filtros vuelve a mostrar todos los registros.','Editar permite corregir una matrícula; Eliminar la envía a Papelera de matrículas, donde podés recuperarla.']},
 courses:{title:'Administrar cursos',steps:['Agregar curso crea una opción para nuevas matrículas. No se admiten nombres repetidos.','Editar cambia el nombre del curso para futuras inscripciones. Las matrículas anteriores conservan el nombre que tenían al guardarse.','Eliminar envía el curso a Papelera de cursos. Para recuperarlo no debe haber otro curso activo con el mismo nombre.']}
};
$('help-button').addEventListener('click',()=>{const topic=help[currentView];$('help-title').textContent=topic.title;const list=document.createElement('ol');for(const step of topic.steps)list.append(element('li',step));$('help-content').replaceChildren(list,element('p','Teclado: Tab y Mayús+Tab recorren los controles. Enter activa los botones y Escape cierra las ventanas.'));$('help-dialog').showModal();$('help-title').focus();});
$('close-help').addEventListener('click',()=>$('help-dialog').close());
$('help-dialog').addEventListener('close',()=>$('help-button').focus());

let trashKind='matriculas',trashOpener=null,trashSequence=0,restoring=false;
async function openTrash(kind,opener){trashKind=kind;trashOpener=opener;$('trash-title').textContent=kind==='cursos'?'Papelera de cursos':'Papelera de matrículas';$('trash-error').textContent='';$('trash-dialog').showModal();$('close-trash').focus();await loadTrash();}
async function loadTrash(){
 const sequence=++trashSequence,kind=trashKind;$('trash-status').textContent='Cargando papelera…';$('trash-list').replaceChildren();
 try{const {response,data}=await request('/api/'+kind+'/papelera');if(sequence!==trashSequence)return;if(!response.ok||!Array.isArray(data))throw Error();$('trash-status').textContent=data.length?`${data.length} registro(s) para recuperar.`:'La papelera está vacía.';
 for(const item of data){const name=kind==='cursos'?item.name:item.code+' · '+item.lastName+', '+item.firstName;const row=element('div','');row.className='trash-item';const info=element('div','');info.append(element('strong',name));if(kind==='matriculas')info.append(element('p',item.courseName+' · '+dateLabel(item.enrollmentDate)));const button=element('button','Recuperar');button.type='button';button.className='button secondary';button.setAttribute('aria-label','Recuperar '+name);button.addEventListener('click',()=>recoverItem(kind,item));row.append(info,button);$('trash-list').append(row);}
 }catch{if(sequence===trashSequence)$('trash-status').textContent='No se pudo cargar la papelera. Usá Actualizar papelera para reintentar.';}
}
async function recoverItem(kind,item){
 if(restoring)return;restoring=true;$('trash-error').textContent='';$('refresh-trash').disabled=true;for(const b of $('trash-list').querySelectorAll('button'))b.disabled=true;
 try{const {response,data}=await request('/api/'+kind+'/'+encodeURIComponent(item.id)+'/restaurar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:item.version})});if(!response.ok)throw Error(data.message||'No se pudo recuperar el registro.');
 if(kind==='cursos'){await refreshCatalog();if(currentView==='entry')await loadCourses();}else await refreshEnrollments();
 if($('trash-dialog').open&&trashKind===kind){await loadTrash();$('close-trash').focus();}$('live-status').textContent=kind==='cursos'?'Curso recuperado. Ya está disponible en el catálogo.':'Matrícula recuperada con sus datos originales.';
 }catch(error){if($('trash-dialog').open)$('trash-error').textContent=error.message||'No se pudo recuperar el registro. Intentá nuevamente.';else $('live-status').textContent='No se pudo recuperar el registro. Volvé a abrir la papelera para reintentar.';}
 finally{restoring=false;$('refresh-trash').disabled=false;for(const b of $('trash-list').querySelectorAll('button'))b.disabled=false;}
}
$('enrollments-trash').addEventListener('click',()=>openTrash('matriculas',$('enrollments-trash')));
$('courses-trash').addEventListener('click',()=>openTrash('cursos',$('courses-trash')));
$('refresh-trash').addEventListener('click',()=>{if(!restoring){$('trash-error').textContent='';loadTrash();}});
$('close-trash').addEventListener('click',()=>$('trash-dialog').close());
$('trash-dialog').addEventListener('close',()=>{trashSequence++;restoreFocus(trashOpener,$('help-button'));});
