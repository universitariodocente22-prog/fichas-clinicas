'use strict';
(() => {
  const form = document.getElementById('gait-form');
  const get = id => document.getElementById(id);
  const value = id => {
    const el = get(id);
    if (el.value.trim() === '' || !el.validity.valid) return null;
    const n = Number(el.value);
    return Number.isFinite(n) ? n : null;
  };
  const positive = id => { const n = value(id); return n !== null && n > 0 ? n : null; };
  const fmt = n => n.toLocaleString('es-BO', {minimumFractionDigits:2,maximumFractionDigits:2});
  const mean = (ids, read = positive) => {
    const nums = ids.map(read);
    return nums.every(n => n !== null) ? nums.reduce((a,b)=>a+b,0)/nums.length : null;
  };
  function calculate() {
    const times = ['vel_t1','vel_t2'].map(positive);
    const speeds = times.map((t,i) => t === null ? `Intento ${i+1}: —` : `Intento ${i+1}: ${fmt(4/t)} m/s`);
    get('vel_result').textContent = speeds.join(' · ') + (times.every(t => t !== null) ? ` · Más rápido: ${fmt(4/Math.min(...times))} m/s` : ' · Completa dos intentos válidos.');
    for (const [prefix,count] of [['paso',3],['zancada',2]]) {
      const averages = ['d','i'].map(side=>mean(Array.from({length:count},(_,i)=>`${prefix}_${side}${i+1}`)));
      const labels = averages.map((n,i)=>`${i===0?'Derecho':'Izquierdo'}: ${n===null?'—':fmt(n)+' cm'}`);
      get(prefix+'_result').textContent = labels.join(' · ') + (averages.every(n=>n!==null) ? ` · Diferencia absoluta: ${fmt(Math.abs(averages[0]-averages[1]))} cm` : ` · Completa ${count} muestras válidas por lado.`);
    }
    let intervals = 0, seconds = 0, valid = 0;
    for (let i=1;i<=3;i++) {
      const n = value('cad_n'+i), t = positive('cad_t'+i);
      if(n!==null && Number.isInteger(n) && n>=2 && t!==null){intervals+=n-1;seconds+=t;valid++;}
    }
    get('cad_result').textContent = valid===3 ? `Cadencia conjunta: ${fmt(intervals/seconds*60)} pasos/min · ${intervals} intervalos en ${fmt(seconds)} s` : `Cadencia: — · Completa tres secuencias válidas (${valid}/3).`;
    const sides=['d','i'].map((side,i)=>{
      const ns=[value(`uni_${side}1`),value(`uni_${side}2`)];
      return `${i===0?'Derecho':'Izquierdo'}: `+(ns.every(n=>n!==null && n>=0 && n<=30) ? fmt(Math.max(...ns))+' s' : '— (completa dos intentos de 0–30 s)');
    });
    get('uni_result').textContent = sides.join(' · ');
  }
  const status = message => { get('status').textContent = message; };
  const key = 'uno_marcha_carrera_v1';
  form.addEventListener('input',calculate);
  form.addEventListener('change',calculate);
  form.addEventListener('submit',event=>event.preventDefault());
  get('save').addEventListener('click',()=>{
    try {
      const data = Object.fromEntries([...form.querySelectorAll('input,select,textarea')].map(el=>[el.id,el.value]));
      localStorage.setItem(key,JSON.stringify({version:1,fields:data}));
      status('Ficha guardada en este navegador. El próximo guardado reemplazará esta copia.');
    } catch { status('No fue posible guardar. Puedes conservar la ficha mediante Imprimir / PDF.'); }
  });
  get('load').addEventListener('click',()=>{
    try {
      const raw=localStorage.getItem(key);
      if(!raw){status('No hay una ficha guardada en este navegador.');return;}
      const data=JSON.parse(raw);
      if(data.version!==1 || !data.fields || typeof data.fields!=='object') throw new Error('Formato');
      if(!confirm('¿Recuperar la ficha guardada y reemplazar los datos actuales?')) return;
      form.reset();
      document.dispatchEvent(new Event('reset-stopwatches'));
      form.querySelectorAll('input,select,textarea').forEach(el=>{
        if(Object.prototype.hasOwnProperty.call(data.fields,el.id) && typeof data.fields[el.id]==='string') el.value=data.fields[el.id];
      });
      calculate(); status('Ficha recuperada.');
    } catch { status('No fue posible recuperar la ficha guardada.'); }
  });
  get('clear').addEventListener('click',()=>{
    if(!confirm('¿Limpiar esta ficha? También se eliminará la copia guardada en este navegador.'))return;
    form.reset();
    document.dispatchEvent(new Event('reset-stopwatches'));
    let removed=true;
    try{localStorage.removeItem(key);}catch{removed=false;}
    calculate(); status(removed?'Ficha y copia guardada eliminadas.':'Ficha limpiada. No se pudo eliminar la copia guardada.');
  });
  get('print').addEventListener('click',()=>{calculate();window.print();});
  const now=new Date();
  get('fecha').value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  calculate();
})();
