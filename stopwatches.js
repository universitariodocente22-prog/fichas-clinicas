/* Cronómetros por campo, medidos con performance.now para evitar deriva. */
'use strict';
(() => {
 const config={
  'evaluacion_postura_dinamica.html':['tug-val','sts-val','sls-r','sls-l'],
  'marcha_carrera.html':['vel_t1','vel_t2','uni_d1','uni_d2','uni_i1','uni_i2']
 };
 const fields=config[location.pathname.split('/').pop()]||[];
 let active=null;const timers=[];
 fields.forEach(id=>{
  const input=document.getElementById(id);if(!input)return;
  const container=document.createElement('div');container.className='stopwatch';container.setAttribute('role','group');
  const label=input.closest('.input-wrap')?.querySelector('label')?.textContent||input.closest('label')?.childNodes[0]?.textContent||id;
  container.setAttribute('aria-label','Cronómetro · '+label.trim());
  const display=document.createElement('output');display.className='stopwatch-time';display.textContent='00:00.0';display.setAttribute('aria-label','Tiempo transcurrido');
  const start=document.createElement('button');start.type='button';start.textContent='Iniciar';
  const stop=document.createElement('button');stop.type='button';stop.textContent='Detener y usar';stop.disabled=true;
  const reset=document.createElement('button');reset.type='button';reset.textContent='Reiniciar';
  const status=document.createElement('span');status.className='stopwatch-status';status.setAttribute('role','status');
  container.append(display,start,stop,reset,status);
  const parentLabel=input.closest('label');
  if(parentLabel){const wrapper=document.createElement('div');wrapper.className='timed-field';parentLabel.before(wrapper);wrapper.append(parentLabel,container);}
  else input.insertAdjacentElement('afterend',container);
  let origin=0,elapsed=0,running=false,frame=0;
  const show=ms=>{
   const tenths=Math.floor(ms/100);display.textContent=String(Math.floor(tenths/600)).padStart(2,'0')+':'+String(Math.floor(tenths/10)%60).padStart(2,'0')+'.'+tenths%10;
  };
  const tick=()=>{if(!running)return;const ms=performance.now()-origin;const cap=Number(input.max);if(input.max&&cap>0&&ms>=cap*1000){finish(cap*1000,true);return;}show(ms);frame=requestAnimationFrame(tick);};
  const timer={reset(){running=false;cancelAnimationFrame(frame);elapsed=0;show(0);start.disabled=false;stop.disabled=true;status.textContent='';if(active===timer)active=null;}};
  timers.push(timer);
  start.addEventListener('click',()=>{
   if(active&&active!==timer){status.textContent='Detén primero el otro cronómetro.';return;}
   elapsed=0;origin=performance.now();running=true;active=timer;start.disabled=true;stop.disabled=false;status.textContent='En curso. Sigue el inicio y final indicados en el procedimiento.';tick();
  });
  function finish(ms,limited=false){
   if(!running)return;elapsed=ms;running=false;cancelAnimationFrame(frame);active=null;show(elapsed);start.disabled=false;stop.disabled=true;
   const seconds=Math.round(elapsed/100)/10;
   if(seconds<=0){status.textContent='Tiempo demasiado corto para registrar.';return;}
   input.value=seconds.toFixed(1);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
   status.textContent=limited?'Límite del protocolo alcanzado; tiempo aplicado en segundos.':'Tiempo aplicado en segundos. Puedes corregirlo manualmente.';
  }
  stop.addEventListener('click',()=>finish(performance.now()-origin));
  reset.addEventListener('click',()=>{timer.reset();status.textContent='Cronómetro reiniciado; el valor del campo se conserva.';});
 });
 document.addEventListener('reset-stopwatches',()=>timers.forEach(timer=>timer.reset()));
})();
