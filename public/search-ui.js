import {optionMatches} from './search-utils.js';
const namespace='http://www.w3.org/2000/svg';
function magnifier(){const svg=document.createElementNS(namespace,'svg');for(const [name,value] of Object.entries({viewBox:'0 0 24 24',width:'18',height:'18',fill:'none',stroke:'currentColor','stroke-width':'1.8','aria-hidden':'true'}))svg.setAttribute(name,value);const circle=document.createElementNS(namespace,'circle');circle.setAttribute('cx','10.5');circle.setAttribute('cy','10.5');circle.setAttribute('r','6.5');const path=document.createElementNS(namespace,'path');path.setAttribute('d','m16 16 4.5 4.5');svg.append(circle,path);return svg;}
let current=null,serial=0;
const always=['courseId','provinceId','locality','filter-course','course-area'];
function enhanceSelect(select){
 if(select.dataset.searchEnhanced||(!always.includes(select.id)&&select.options.length<9))return;
 select.dataset.searchEnhanced='true';
 const id=select.id||'aula-select-'+(++serial),label=document.querySelector('label[for="'+id+'"]'),name=label?.textContent.trim().replace(/\s*\*$/,'')||select.getAttribute('aria-label')||'Opciones';
 const wrap=document.createElement('div');wrap.className='search-select';
 const control=document.createElement('div');control.className='search-select-control';
 const input=document.createElement('input');input.type='search';input.id=id+'-search';input.autocomplete='off';input.spellcheck=false;input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-label',name);if(select.required)input.setAttribute('aria-required','true');
 const clear=document.createElement('button');clear.type='button';clear.className='search-select-clear';clear.textContent='×';clear.setAttribute('aria-label','Limpiar '+name);clear.hidden=true;
 const popup=document.createElement('div');popup.className='search-select-popup';popup.hidden=true;
 const list=document.createElement('div');list.id=id+'-results';list.className='search-select-results';list.setAttribute('role','listbox');list.setAttribute('aria-label','Opciones de '+name);input.setAttribute('aria-controls',list.id);
 const status=document.createElement('p');status.className='search-select-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');popup.append(list,status);
 select.before(wrap);wrap.append(control,select,popup);control.append(magnifier(),input,clear);select.classList.add('search-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');if(label)label.htmlFor=input.id;
 let opened=false,typing=false,query='',visible=[],active=-1,writing=false,notifying=false;
 const source=()=>Array.from(select.options).filter(o=>o.value!==''||(!select.required&&!o.disabled&&!/seleccion|elegí|cargando|no se pudo/i.test(o.textContent))).map(o=>({value:o.value,label:o.textContent,disabled:o.disabled}));
 function paintActive(){Array.from(list.children).forEach((node,i)=>{node.classList.toggle('highlighted',i===active);node.setAttribute('aria-selected',String(i===active))});if(active>=0&&list.children[active]){input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'})}else input.removeAttribute('aria-activedescendant');}
 function render(){const result=optionMatches(source(),query);visible=result.options;active=visible.length?0:-1;list.replaceChildren();for(const [index,o] of visible.entries()){const row=document.createElement('div');row.className='search-select-option';row.id=id+'-option-'+index;row.setAttribute('role','option');row.textContent=o.label;row.addEventListener('pointerdown',e=>e.preventDefault());row.addEventListener('click',()=>choose(o.value));list.append(row)}
 status.textContent=result.count===0?'Sin coincidencias. Probá otra palabra.':result.count>visible.length?visible.length+' de '+result.count+' opciones. Escribí para acotar la búsqueda.':result.count+(result.count===1?' opción disponible':' opciones disponibles');paintActive();}
 function sync(){if(!typing||select.disabled){const selected=Array.from(select.options).find(o=>o.value===select.value);input.value=selected&&select.value!==''?selected.textContent:'';}input.placeholder=select.options[0]?.textContent||'Buscar y seleccionar';input.disabled=select.disabled;clear.disabled=select.disabled;clear.hidden=!input.value;input.setAttribute('aria-invalid',select.getAttribute('aria-invalid')||'false');const described=select.getAttribute('aria-describedby');if(described)input.setAttribute('aria-describedby',described);if(select.disabled)close();if(opened)render();}
 function notify(){notifying=true;try{select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}finally{notifying=false}}
 function close(){opened=false;popup.hidden=true;wrap.classList.remove('is-open');input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(current?.wrap===wrap)current=null;}
 function open(){if(input.disabled)return;if(current?.wrap!==wrap)current?.close();opened=true;popup.hidden=false;wrap.classList.add('is-open');input.setAttribute('aria-expanded','true');const rect=wrap.getBoundingClientRect();wrap.classList.toggle('open-up',window.innerHeight-rect.bottom<260&&rect.top>280);current={wrap,close};render();}
 function choose(value){typing=false;query='';writing=true;select.value=value;writing=false;notify();sync();close();input.focus();}
 const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');Object.defineProperty(select,'value',{configurable:true,get(){return descriptor.get.call(this)},set(value){descriptor.set.call(this,value);if(!writing){typing=false;query='';sync();}}});
 input.addEventListener('focus',()=>{query='';typing=false;open();input.select()});
 input.addEventListener('input',()=>{typing=true;query=input.value;if(select.value!==''){writing=true;select.value='';writing=false;notify()}clear.hidden=!input.value;open()});
 input.addEventListener('keydown',event=>{if(event.isComposing)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!opened)open();else{active=Math.max(0,Math.min(visible.length-1,active+(event.key==='ArrowDown'?1:-1)));paintActive()}}else if(event.key==='Enter'&&opened){event.preventDefault();if(active>=0)choose(visible[active].value)}else if(event.key==='Escape'&&opened){event.preventDefault();event.stopPropagation();close()}else if(event.key==='Tab')close()});
 input.addEventListener('blur',()=>{close();select.dispatchEvent(new FocusEvent('blur'))});
 clear.addEventListener('click',()=>{choose('');input.value='';query='';open()});
 select.addEventListener('focus',()=>input.focus());select.addEventListener('change',()=>{if(!writing&&!notifying){typing=false;query='';sync()}});
 select.form?.addEventListener('reset',()=>queueMicrotask(()=>{typing=false;query='';close();sync()}));
 new MutationObserver(sync).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-invalid','aria-describedby','selected']});
 sync();
}
function decorate(input){if(input.dataset.searchDecorated||input.closest('.search-select'))return;input.dataset.searchDecorated='true';const wrap=document.createElement('div');wrap.className='search-with-icon';input.before(wrap);wrap.append(magnifier(),input);}
function scan(root){for(const select of root.querySelectorAll('select'))enhanceSelect(select);for(const input of root.querySelectorAll('input[type="search"]'))decorate(input);}
document.addEventListener('pointerdown',event=>{if(current&&!current.wrap.contains(event.target))current.close()});
scan(document);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches('select'))enhanceSelect(node);if(node.matches('input[type="search"]'))decorate(node);scan(node)}}).observe(document.body,{childList:true,subtree:true});
