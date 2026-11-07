import {COURSE_AREAS,COURSE_LEVELS,COURSE_IMAGES,MAX_COURSE_IMAGE_BYTES} from './course-fields.js';
import {courseInfo} from './catalog.js';
import {courseCover} from './course-media.js';
import {restoreFocus} from './focus.js';
const $=id=>document.getElementById(id),money=c=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2,minimumFractionDigits:0}).format(c/100);
let config,editing=null,opener=null,image=null,saving=false,processing=false,imageSequence=0;
function values(){return {id:editing?.id,name:$('course-name').value,description:$('course-description').value,area:$('course-area-edit').value,level:$('course-level').value,duration:$('course-duration').value,feeCents:$('course-fee').value===''?null:Math.round(Number($('course-fee').value)*100),image};}
function preview(){const c=values();$('course-preview-image').src=courseCover(c);$('course-preview-name').textContent=c.name||'Nombre del curso';$('course-preview-description').textContent=c.description||'La descripción del curso va a aparecer acá.';$('course-preview-area').textContent=c.area;$('course-preview-level').textContent=c.level;$('course-preview-duration').textContent=c.duration||'Duración del curso';$('course-preview-fee').textContent=c.feeCents===null?'Importe a definir':c.feeCents===0?'Sin cargo':money(c.feeCents);$('course-description-count').textContent=c.description.length;for(const b of $('course-image-gallery').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.image===image));}
function busy(){for(const input of $('course-form').querySelectorAll('input,select,textarea,button'))input.disabled=saving; // Selecting another file remains possible while an image is processing.
 $('save-course').disabled=saving||processing;$('save-course').textContent=saving?'Guardando…':processing?'Preparando imagen…':'Guardar curso';}
export function initCourseEditor(options){
 config=options;for(const value of COURSE_AREAS)$('course-area-edit').add(new Option(value,value));for(const value of COURSE_LEVELS)$('course-level').add(new Option(value,value));
 for(const [key,label]of COURSE_IMAGES){const b=document.createElement('button');b.type='button';b.dataset.image='/course-images/'+key+'.jpg';b.setAttribute('aria-label','Usar portada: '+label);b.setAttribute('aria-pressed','false');const thumb=document.createElement('img');thumb.src=b.dataset.image;thumb.alt='';thumb.width=160;thumb.height=90;thumb.loading='lazy';const text=document.createElement('span');text.textContent=label;b.append(thumb,text);b.addEventListener('click',()=>{imageSequence++;processing=false;image=b.dataset.image;$('course-image-file').value='';$('course-image-status').textContent='Portada seleccionada: '+label;busy();preview()});$('course-image-gallery').append(b);}
 for(const id of ['course-name','course-description','course-area-edit','course-level','course-duration','course-fee'])$(id).addEventListener('input',preview);
 $('course-image-auto').addEventListener('click',()=>{imageSequence++;processing=false;image=null;$('course-image-file').value='';$('course-image-status').textContent='Se usará una portada relacionada con el curso.';busy();preview()});
 $('course-image-file').addEventListener('change',uploadImage);
 $('add-course').addEventListener('click',()=>openCourse());$('cancel-course').addEventListener('click',()=>{if(!saving)$('course-dialog').close()});
 $('course-dialog').addEventListener('cancel',e=>{if(saving)e.preventDefault()});$('course-dialog').addEventListener('close',()=>{imageSequence++;processing=false;restoreFocus(opener,$('add-course'))});
 $('course-form').addEventListener('submit',save);
}
export function openCourse(course=null){
 opener=document.activeElement;editing=course;imageSequence++;processing=false;saving=false;const c=course?courseInfo(course):{name:'',description:'',area:'Programación',level:'Inicial',duration:'',feeCents:null,image:null};image=c.image??null;
 $('course-dialog-title').textContent=course?'Editar curso':'Agregar curso';for(const [id,value]of [['course-name',c.name],['course-description',c.description],['course-area-edit',c.area],['course-level',c.level],['course-duration',c.duration],['course-fee',c.feeCents==null?'':c.feeCents/100]])$(id).value=value;
 $('course-image-file').value='';$('course-image-status').textContent='';$('course-dialog-error').textContent='';$('course-name').removeAttribute('aria-invalid');busy();preview();$('course-dialog').showModal();$('course-dialog').scrollTop=0;$('course-name').focus();
}
async function uploadImage(){
 const file=$('course-image-file').files[0];if(!file)return;const run=++imageSequence;processing=true;busy();$('course-dialog-error').textContent='';$('course-image-status').textContent='Optimizando imagen…';let bitmap;
 try{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Elegí una imagen JPG, PNG o WebP.');
  if(file.size>5*1024*1024)throw Error('La imagen supera los 5 MB. Elegí una más pequeña.');
  bitmap=await createImageBitmap(file);if(run!==imageSequence)return;
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const context=canvas.getContext('2d');context.fillStyle='#e6eaf6';context.fillRect(0,0,960,540);const scale=Math.max(960/bitmap.width,540/bitmap.height),w=bitmap.width*scale,h=bitmap.height*scale;context.drawImage(bitmap,(960-w)/2,(540-h)/2,w,h);
  let result;for(const quality of [.85,.7,.5]){result=canvas.toDataURL('image/webp',quality);if(atob(result.split(',')[1]).length<=MAX_COURSE_IMAGE_BYTES)break;}
  if(atob(result.split(',')[1]).length>MAX_COURSE_IMAGE_BYTES)throw Error('No se pudo optimizar esta imagen. Probá con otra.');
  if(run!==imageSequence)return;image=result;$('course-image-status').textContent='Imagen lista. Se guardará al confirmar el curso.';preview();
 }catch(error){if(run===imageSequence){$('course-image-status').textContent='Se conserva la portada anterior.';$('course-dialog-error').textContent=error.message||'No se pudo leer la imagen. Probá con otra.';$('course-image-file').value='';}}
 finally{bitmap?.close();if(run===imageSequence){processing=false;busy();}}
}
async function save(event){
 event.preventDefault();if(saving||processing)return;saving=true;busy();$('course-dialog-error').textContent='';
 try{const {id,...body}=values();const result=await config.request('/api/cursos'+(editing?'/'+editing.id:''),{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,version:editing?.version})});if(!result.response.ok)throw Error(result.data.message);$('course-dialog').close();await config.onSaved();$('live-status').textContent='Curso guardado correctamente.';restoreFocus(opener,$('add-course'));}
 catch(error){$('course-dialog-error').textContent=error.message||'No se pudo guardar el curso. Tus cambios se conservan.';}
 finally{saving=false;busy();}
}
