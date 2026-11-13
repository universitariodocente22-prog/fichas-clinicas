'use strict';
(() => {
 const get=id=>document.getElementById(id),form=get('posture-form');
 const ids=['mmss','brazo','antebrazo','mano','mmii','aparente','muslo','pierna','pie'];
 const views=['anterior','posterior','lateral'];
 const fmt=n=>n.toLocaleString('es-BO',{minimumFractionDigits:1,maximumFractionDigits:1});
 function calculate(){
  ids.forEach(id=>{
   const means=['d','i'].map(side=>{
    const fields=[1,2].map(i=>get(`len_${id}_${side}${i}`));
    const valid=fields.every(el=>el.value!==''&&el.validity.valid&&Number(el.value)>0);
    const mean=valid?fields.reduce((a,el)=>a+Number(el.value),0)/2:null;
    get(`mean_${id}_${side}`).textContent=mean===null?'—':fmt(mean);
    return mean;
   });
   get(`diff_${id}`).textContent=means.every(n=>n!==null)?fmt(Math.abs(means[0]-means[1])):'—';
  });
 }
 form.addEventListener('input',calculate);
 form.addEventListener('submit',e=>e.preventDefault());
 const tokens=Object.fromEntries(views.map(v=>[v,0]));
 let pending=0;
 function clearPhoto(view){
  tokens[view]++;get('foto_'+view).value='';get('img_'+view).removeAttribute('src');get('img_'+view).hidden=true;get('empty_'+view).hidden=false;get('status_'+view).textContent='';
 }
 views.forEach(view=>{
  get('foto_'+view).addEventListener('change',async e=>{
   const file=e.target.files[0];if(!file)return;
   const status=get('status_'+view),token=++tokens[view];
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024){status.textContent='Selecciona JPEG, PNG o WebP de hasta 15 MB. Se conserva la foto anterior, si existe.';e.target.value='';return;}
   pending++;get('posture-print').disabled=true;status.textContent='Preparando fotografía…';
   const url=URL.createObjectURL(file);
   try{
    const image=new Image();image.src=url;await image.decode();
    const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',.9);
    if(token!==tokens[view])return;
    const target=get('img_'+view);target.src=data;await target.decode();if(token!==tokens[view])return;
    target.hidden=false;get('empty_'+view).hidden=true;status.textContent='Fotografía lista para incluir en el PDF.';
   }catch{
    if(token===tokens[view]){status.textContent='No se pudo leer la fotografía. Prueba con otro JPEG o PNG.';e.target.value='';}
   }finally{URL.revokeObjectURL(url);pending--;get('posture-print').disabled=pending>0;}
  });
 });
 document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>clearPhoto(button.dataset.remove)));
 function date(){const d=new Date();return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 get('post-date').value=date();
 get('post-side').addEventListener('change',()=>{get('caption_lateral').textContent='Vista lateral '+get('post-side').value.toLowerCase();});
 get('posture-clear').addEventListener('click',()=>{
  if(!confirm('¿Limpiar los campos y las tres fotografías de esta ficha?'))return;
  form.reset();views.forEach(clearPhoto);get('post-date').value=date();get('caption_lateral').textContent='Vista lateral derecha';calculate();get('posture-status').textContent='Ficha y fotografías limpiadas.';
 });
 get('posture-print').addEventListener('click',()=>{
  if(pending){get('posture-status').textContent='Espera a que terminen de cargarse las fotos.';return;}
  calculate();get('posture-status').textContent='En el diálogo del navegador elige Guardar como PDF.';window.print();
 });
 // Native print inputs may crop long content: mirror full values for the PDF.
 window.addEventListener('beforeprint',()=>{
  document.querySelectorAll('.print-value').forEach(el=>el.remove());
  form.querySelectorAll('input:not([type=file]),select,textarea').forEach(el=>{
   const text=document.createElement('span');text.className='print-value';
   text.textContent=el.type==='checkbox'?(el.checked?'Confirmada':'No confirmada'):(el.value||'—');
   el.insertAdjacentElement('afterend',text);
  });
 });
 window.addEventListener('afterprint',()=>document.querySelectorAll('.print-value').forEach(el=>el.remove()));
 calculate();
})();
