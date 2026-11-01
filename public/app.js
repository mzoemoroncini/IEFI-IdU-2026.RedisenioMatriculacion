import {FIELDS,clean,normalize,validate,validDate,createRequestId} from './rules.js';
const $=id=>document.getElementById(id);
const form=$('enrollment-form');
const fields=Object.fromEntries(FIELDS.map(name=>[name,$(name)]));
let courses=[];
let coursesReady=false;
let sending=false;
let registered=false;
let baseline='';
let submission=null;
const touched=new Set();
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function values(){return Object.fromEntries(FIELDS.map(name=>[name,fields[name].value]));}
function fingerprint(){return JSON.stringify(normalize(values()));}
function dirty(){return !registered&&fingerprint()!==baseline;}
function dateLabel(value){if(!validDate(value))return 'Sin completar';const [y,m,d]=value.split('-').map(Number);const date=new Date(0);date.setFullYear(y,m-1,d);date.setHours(12,0,0,0);return new Intl.DateTimeFormat('es-AR',{dateStyle:'long'}).format(date);}
function setError(name,message=''){fields[name].setAttribute('aria-invalid',String(!!message));$(name+'-error').textContent=message;}
function preview(){
  const data=normalize(values());const errors=validate(data,courses);
  const previews={course:courses.find(course=>course.id===data.courseId)?.name||'',student:[data.lastName,data.firstName].filter(Boolean).join(', '),date:validDate(data.enrollmentDate)?dateLabel(data.enrollmentDate):'',address:[data.locality,data.address].filter(Boolean).join(' · ')};
  for(const [key,value] of Object.entries(previews)){const element=$('summary-'+key);element.textContent=value||'Sin completar';element.classList.toggle('empty-value',!value);}
  let completed=0;
  for(const [section,names] of Object.entries({course:['courseId','enrollmentDate'],student:['lastName','firstName','sex'],address:['address','locality']})){
    const good=names.every(name=>!errors[name]);completed+=Number(good);const state=$('state-'+section);state.textContent=good?'Completo':'Pendiente';state.classList.toggle('complete',good);
  }
  $('completion-text').textContent=`${completed} de 3 secciones completas`;
  return errors;
}
function errorBanner(title,message){$('error-title').textContent=title;$('error-message').textContent=message;$('submission-error').hidden=false;}
function hideBanner(){$('submission-error').hidden=true;}
function busy(value){sending=value;form.setAttribute('aria-busy',String(value));for(const control of form.querySelectorAll('input,select,button'))control.disabled=value;$('courseId').disabled=value||!coursesReady;$('submit-button').disabled=value||!coursesReady;$('submit-label').textContent=value?'Registrando…':'Registrar matrícula';$('submit-button').querySelector('.spinner').hidden=!value;$('submit-button').querySelector('.button-arrow').hidden=value;}
function reset(){
  form.reset();registered=false;touched.clear();submission=null;fields.enrollmentDate.value=today();fields.enrollmentDate.defaultValue=fields.enrollmentDate.value;
  for(const name of FIELDS){fields[name].removeAttribute('aria-invalid');$(name+'-error').textContent='';}
  hideBanner();busy(false);baseline=fingerprint();preview();
}
async function request(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});
  const data=await response.json();return {response,data};
}
async function loadCourses(){
  const selected=fields.courseId.value;coursesReady=false;fields.courseId.disabled=true;$('submit-button').disabled=true;$('retry-courses').hidden=true;$('course-help').textContent='Cargando los cursos disponibles…';
  try{
    const {response,data}=await request('/api/cursos');
    if(!response.ok||!Array.isArray(data)||!data.length)throw new Error('courses');
    courses=data;fields.courseId.replaceChildren(new Option('Seleccioná un curso',''));
    for(const course of courses)fields.courseId.add(new Option(course.name,course.id));
    if(courses.some(course=>course.id===selected))fields.courseId.value=selected;
    coursesReady=true;fields.courseId.disabled=false;$('submit-button').disabled=false;$('course-help').textContent='';
  }catch{fields.courseId.replaceChildren(new Option('Cursos no disponibles',''));$('course-help').textContent='No se pudieron cargar los cursos. Los demás datos se conservan.';$('retry-courses').hidden=false;}
  preview();
}
for(const name of FIELDS){
  fields[name].addEventListener('input',()=>{const errors=preview();if(touched.has(name))setError(name,errors[name]);hideBanner();if(!sending)$('submit-label').textContent='Registrar matrícula';});
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
    const {response,data:saved}=await request('/api/matriculas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId:submission.requestId})});
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
  registered=true;$('entry-content').hidden=true;$('success-panel').hidden=false;$('registration-code').textContent=saved.code;
  const detail=$('saved-detail');detail.replaceChildren();
  for(const [label,value] of [['Curso',saved.courseName],['Estudiante',`${saved.lastName}, ${saved.firstName}`],['Fecha de matrícula',dateLabel(saved.enrollmentDate)],['Sexo',saved.sex],['Dirección',saved.address],['Localidad',saved.locality]]){
    const group=document.createElement('div');const term=document.createElement('dt');const definition=document.createElement('dd');term.textContent=label;definition.textContent=value;group.append(term,definition);detail.append(group);
  }
  $('saved-time').textContent=`Registrada el ${new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeStyle:'short'}).format(new Date(saved.registeredAt))}`;
  document.title=`${saved.code} · Aula`;$('success-heading').focus();window.scrollTo({top:0,behavior:'auto'});
}
$('retry-courses').addEventListener('click',loadCourses);
$('clear-button').addEventListener('click',()=>{if(!dirty()){reset();fields.courseId.focus();return;}$('clear-dialog').showModal();$('keep-data').focus();});
$('clear-dialog').addEventListener('close',()=>{if($('clear-dialog').returnValue==='clear'){reset();fields.courseId.focus();}else $('clear-button').focus();});
$('clear-dialog').addEventListener('cancel',()=>{$('clear-dialog').returnValue='cancel';});
$('new-enrollment').addEventListener('click',()=>{$('success-panel').hidden=true;$('entry-content').hidden=false;history.replaceState(null,'',location.pathname+location.search);document.title='Nueva matrícula · Aula';reset();fields.courseId.focus();window.scrollTo({top:0,behavior:'auto'});});
window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
fields.enrollmentDate.value=today();fields.enrollmentDate.defaultValue=fields.enrollmentDate.value;baseline=fingerprint();preview();
await loadCourses();
const match=location.hash.match(/^#matricula\/([1-9]\d*)$/);
if(match){try{const {response,data}=await request('/api/matriculas/'+match[1]);if(!response.ok)throw new Error();renderSuccess(data);}catch{errorBanner('No se pudo consultar la matrícula','Revisá el enlace o intentá recargar la página.');}}
