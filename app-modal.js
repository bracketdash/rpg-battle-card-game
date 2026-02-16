(function(){
  // Modal helper module: manages modal element references and listener cleanup
  const $ = (s)=> document.querySelector(s);
  const modal = $('#modal');
  const modalTitle = $('#modal-title');
  const modalBody = $('#modal-body');
  const modalConfirm = $('#modal-confirm');
  const modalCancel = $('#modal-cancel');
  const resetBtn = $('#reset-btn');

  let modalListeners = [];
  function addModalListener(el, evt, fn){
    if (!el) return;
    el.addEventListener(evt, fn);
    modalListeners.push({ el, evt, fn });
  }
  function clearModalListeners(){
    modalListeners.forEach((l)=>{ try{ l.el.removeEventListener(l.evt, l.fn); } catch(e){} });
    modalListeners = [];
  }
  function closeModal(){
    try{ modal.classList.add('hidden'); } catch(e){}
    try{ modalBody.innerHTML = ''; } catch(e){}
    setTimeout(()=> clearModalListeners(), 0);
  }

  // clicking outside modal-inner closes it
  try{ if (modal) modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); }); } catch(e){}
  try{ window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); }); } catch(e){}

  // ensure hidden on init and wire cancel to close by default
  try{ if (modal) modal.classList.add('hidden'); } catch(e){}
  try{ addModalListener(modalCancel, 'click', closeModal); } catch(e){}

  // export API
  try{ if (typeof window !== 'undefined'){ window.rpgGame = window.rpgGame || {}; window.rpgGame.modalModule = { modal, modalTitle, modalBody, modalConfirm, modalCancel, resetBtn, addModalListener, clearModalListeners, closeModal }; } } catch(e){}
})();
