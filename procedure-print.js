'use strict';
(() => {
 let closed=[];
 window.addEventListener('beforeprint',()=>{closed=[...document.querySelectorAll('details.procedure:not([open])')];closed.forEach(el=>el.open=true);});
 window.addEventListener('afterprint',()=>{closed.forEach(el=>el.open=false);closed=[];});
})();
