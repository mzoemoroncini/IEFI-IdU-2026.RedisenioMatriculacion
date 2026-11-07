const toggle=document.getElementById('login-motion-toggle');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let preference;try{preference=localStorage.getItem('aula-login-motion')}catch{}
function apply(){const paused=reduced.matches||preference==='paused';document.body.dataset.loginMotion=paused?'paused':'running';toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=reduced.matches?'Fondo sin movimiento':paused?'Reanudar fondo':'Pausar fondo';toggle.disabled=reduced.matches;}
toggle.addEventListener('click',()=>{preference=document.body.dataset.loginMotion==='paused'?'running':'paused';try{localStorage.setItem('aula-login-motion',preference)}catch{}apply()});
reduced.addEventListener('change',apply);
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('login-background-idle',document.hidden));
apply();
