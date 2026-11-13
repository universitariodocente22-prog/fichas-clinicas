/* Gráficas locales por intentos: sin servicios externos ni datos de ejemplo. */
'use strict';
(() => {
  const host=document.getElementById('live-chart');
  if(!host)return;
  const byId=id=>document.getElementById(id);
  const read=(id,positive=false)=>{
    const el=byId(id);
    if(!el || el.value.trim()==='' || !el.validity.valid)return null;
    const n=Number(el.value);
    return Number.isFinite(n) && (!positive || n>0) ? n : null;
  };
  const avg=ids=>{
    const ns=ids.map(id=>read(id,true));
    return ns.every(n=>n!==null)?ns.reduce((a,b)=>a+b,0)/ns.length:null;
  };
  const sideNames=['Derecho','Izquierdo'];
  const metric=(id,label,unit,names,values)=>({id,label,unit,names,values});
  const file=location.pathname.split('/').pop();
  let metrics=[];
  if(file==='marcha_carrera.html'){
    metrics=[
      metric('paso','Longitud del paso','cm',sideNames,()=>['d','i'].map(s=>avg([1,2,3].map(i=>`paso_${s}${i}`)))),
      metric('zancada','Longitud de zancada','cm',sideNames,()=>['d','i'].map(s=>avg([1,2].map(i=>`zancada_${s}${i}`)))),
      metric('velocidad','Velocidad habitual','m/s',['Velocidad'],()=>{
        const ts=['vel_t1','vel_t2'].map(id=>read(id,true));
        return [ts.every(n=>n!==null)?4/Math.min(...ts):null];
      }),
      metric('cadencia','Cadencia','pasos/min',['Cadencia'],()=>{
        const ns=[1,2,3].map(i=>read('cad_n'+i)),ts=[1,2,3].map(i=>read('cad_t'+i,true));
        return [ns.every(n=>n!==null&&Number.isInteger(n)&&n>=2)&&ts.every(n=>n!==null)?ns.reduce((a,b)=>a+b-1,0)/ts.reduce((a,b)=>a+b,0)*60:null];
      }),
      metric('apoyo','Apoyo unipodal · mejor de dos','s',sideNames,()=>['d','i'].map(s=>{
        const ns=[1,2].map(i=>read(`uni_${s}${i}`));return ns.every(n=>n!==null&&n>=0&&n<=30)?Math.max(...ns):null;
      }))
    ];
  }else if(file==='respiratoria.html'){
    metrics=[metric('expansion','Expansión torácica','cm',['Axilar','Xifoidea','Basal'],()=>['ax','xi','ba'].map(s=>{
      const a=read(s+'_esp',true),b=read(s+'_ins',true);return a!==null&&b!==null?b-a:null;
    }))];
  }else if(file==='evaluacion_postura_dinamica.html'){
    metrics=[
      metric('frt','Alcance funcional · FRT','cm',['Alcance'],()=>[read('frt-val',true)]),
      metric('tug','Timed Up and Go · TUG','s',['Tiempo'],()=>[read('tug-val',true)]),
      metric('sts','Sit to Stand · STS','s',['Tiempo'],()=>[read('sts-val',true)]),
      metric('sls','Apoyo unipodal · SLS','s',sideNames,()=>[read('sls-r'),read('sls-l')]),
      ...[['ant','Anterior'],['pm','Posteromedial'],['pl','Posterolateral']].map(([dir,name])=>metric('ybt-'+dir,'Y Balance · '+name,'cm',sideNames,()=>['r','l'].map(s=>read(`ybt-${s}-${dir}`))))
    ];
  }else if(file==='ficha_goniometria.html' && typeof DATA!=='undefined'){
    metrics=DATA.map((item,i)=>metric('gonio-'+i,`${item.region} · ${item.mov}`,'°',sideNames,()=>[read(`r${i}_der`),read(`r${i}_izq`)]));
  }
  if(!metrics.length){host.remove();return;}
  host.innerHTML=`<div class="chart-top"><div><h2 id="chart-heading">Registro de intentos</h2><p>La vista «Actual» cambia mientras completas la ficha. Usa Registrar para conservar cada intento en la gráfica.</p></div><span class="live-badge">EN TIEMPO REAL</span></div><div class="chart-controls"><label for="chart-metric">Variable a comparar<select id="chart-metric"></select></label><button type="button" class="chart-primary" id="chart-add">Registrar intento</button><button type="button" id="chart-clear">Vaciar gráfica</button></div><div class="chart-stats" id="chart-stats"></div><div class="chart-plot" id="chart-plot"></div><div class="chart-legend" id="chart-legend"></div><p class="chart-status" id="chart-status" role="status" aria-live="polite"></p><p class="result-note">Eje horizontal: intentos de la misma variable, sin escala de tiempo. No indica evolución entre fechas ni clasifica resultados. Los intentos permanecen solo mientras esta página siga abierta; imprime la gráfica para conservarla. Vacía la gráfica antes de evaluar a otra persona.</p><details class="chart-data"><summary>Ver registros en tabla</summary><div class="table-scroll" id="chart-table"></div></details>`;
  const select=byId('chart-metric');
  metrics.forEach(m=>{const op=document.createElement('option');op.value=m.id;op.textContent=m.label;select.append(op);});
  const history=new Map(metrics.map(m=>[m.id,[]]));
  const colors=['#74B9FF','#79DFCA','#B5A6F3'];
  const fmt=n=>n.toLocaleString('es-BO',{maximumFractionDigits:2});
  const svgNS='http://www.w3.org/2000/svg';
  function svgEl(tag,attrs={},text){const el=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;return el;}
  let selected=metrics[0];
  function render(message){
    select.value=selected.id;
    const current=selected.values(),records=history.get(selected.id);
    const points=[...records.map((values,i)=>({label:String(i+1),values})),{label:'Actual',values:current}];
    byId('chart-add').disabled=!current.every(n=>n!==null&&Number.isFinite(n));
    byId('chart-clear').disabled=records.length===0;
    const stats=byId('chart-stats');stats.replaceChildren();
    selected.names.forEach((name,i)=>{const div=document.createElement('div');div.className='chart-stat';const label=document.createElement('span');label.textContent=name+' · Actual';const val=document.createElement('b');val.textContent=current[i]===null?'—':fmt(current[i])+' '+selected.unit;div.append(label,val);stats.append(div);});
    const valid=points.flatMap(p=>p.values).filter(v=>v!==null&&Number.isFinite(v));
    let lo=valid.length?Math.min(...valid):0,hi=valid.length?Math.max(...valid):10;
    const pad=Math.max((hi-lo)*.15,Math.abs(hi)*.03,.5);lo=Math.floor((lo-pad)*10)/10;hi=Math.ceil((hi+pad)*10)/10;
    if(valid.every(v=>v>=0))lo=Math.max(0,lo);
    const W=800,H=270,L=68,R=26,T=35,B=48;
    const x=i=>points.length===1?W/2:L+(W-L-R)*i/(points.length-1),y=v=>T+(H-T-B)*(hi-v)/(hi-lo);
    const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,class:'chart-svg',role:'img','aria-labelledby':'plot-title plot-description'});
    svg.append(svgEl('title',{id:'plot-title'},`${selected.label}: ${selected.unit} por intento`));
    svg.append(svgEl('desc',{id:'plot-description'},'Gráfica lineal de intentos registrados y lectura actual. Una tabla accesible con los valores está disponible debajo. No se unen puntos sin medición.'));
    svg.append(svgEl('text',{x:L,y:17},selected.label+' ('+selected.unit+')'));
    for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;svg.append(svgEl('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),class:'grid'}));svg.append(svgEl('text',{x:L-10,y:y(v)+4,'text-anchor':'end'},fmt(v)));}
    points.forEach((p,i)=>{if(points.length<10||i%Math.ceil(points.length/8)===0||i===points.length-1)svg.append(svgEl('text',{x:x(i),y:H-27,'text-anchor':'middle'},p.label));});
    svg.append(svgEl('text',{x:(W+L-R)/2,y:H-5,'text-anchor':'middle'},'Intentos'));
    selected.names.forEach((name,s)=>{
      points.forEach((p,i)=>{
        const v=p.values[s];if(v===null||!Number.isFinite(v))return;
        if(i>0){const prev=points[i-1].values[s];if(prev!==null&&Number.isFinite(prev))svg.append(svgEl('line',{x1:x(i-1),x2:x(i),y1:y(prev),y2:y(v),stroke:colors[s], 'stroke-width':2.5,...(i===points.length-1?{'stroke-dasharray':'6 4'}:{})}));}
        const dot=svgEl('circle',{cx:x(i),cy:y(v),r:4.5,fill:colors[s],stroke:'#202B46','stroke-width':2});dot.append(svgEl('title',{},`${name}, ${p.label}: ${fmt(v)} ${selected.unit}`));svg.append(dot);
      });
    });
    if(!valid.length)svg.append(svgEl('text',{x:W/2,y:130,'text-anchor':'middle'},'Completa la variable seleccionada para visualizar los resultados'));
    byId('chart-plot').replaceChildren(svg);
    const legend=byId('chart-legend');legend.replaceChildren();
    selected.names.forEach((name,i)=>{const span=document.createElement('span'),line=document.createElement('i');line.style.setProperty('--series',colors[i]);span.append(line,document.createTextNode(name));legend.append(span);});
    const table=document.createElement('table');table.className='chart-table';const caption=document.createElement('caption');caption.textContent=selected.label+' ('+selected.unit+')';table.append(caption);const head=document.createElement('thead'),hr=document.createElement('tr');['Intento',...selected.names].forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;hr.append(th);});head.append(hr);table.append(head);const body=document.createElement('tbody');points.forEach(p=>{const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=p.label;tr.append(th);p.values.forEach(v=>{const td=document.createElement('td');td.textContent=v===null?'—':fmt(v);tr.append(td);});body.append(tr);});table.append(body);byId('chart-table').replaceChildren(table);
    byId('chart-status').textContent=message||`${records.length} intentos registrados · La línea discontinua corresponde al valor actual, aún sin registrar.`;
  }
  select.addEventListener('change',()=>{selected=metrics.find(m=>m.id===select.value);render();});
  byId('chart-add').addEventListener('click',()=>{
    const values=selected.values();if(!values.every(n=>n!==null&&Number.isFinite(n))){render('Completa todos los valores de la variable seleccionada.');return;}
    const records=history.get(selected.id);if(records.length>=30){render('Límite de 30 intentos por variable. Imprime los resultados antes de vaciar la gráfica.');return;}
    records.push([...values]);render(`Intento ${records.length} registrado. Modifica los campos de la ficha para el siguiente intento.`);
  });
  byId('chart-clear').addEventListener('click',()=>{
    if(!confirm('¿Vaciar los intentos de esta variable en la gráfica? Los campos de la ficha no se modificarán.'))return;
    history.set(selected.id,[]);render('Gráfica vaciada. Los campos actuales siguen visibles.');
  });
  document.addEventListener('input',e=>{if(!host.contains(e.target))render();});
  document.addEventListener('change',e=>{if(!host.contains(e.target))render();});
  const identityIds=['participante','patient-name-input','pat-name','p_nombre','p_hc'];
  document.addEventListener('change',e=>{if(identityIds.includes(e.target.id)){history.forEach((_,key)=>history.set(key,[]));render('Nueva identificación: se han vaciado los intentos de todas las variables.');}});
  // Existing clear/load actions modify values programmatically without input events.
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||host.contains(button))return;
    queueMicrotask(()=>{
      if(button.matches('#btnClear,#clear') || button.getAttribute('onclick')?.includes('clearForm') || button.getAttribute('onclick')?.includes('clearData')){
        if(selected.values().every(v=>v===null)){history.forEach((_,key)=>history.set(key,[]));}
      }
      render();
    });
  });
  window.addEventListener('beforeprint',()=>render());
  render();
})();
