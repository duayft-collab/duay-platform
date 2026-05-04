/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-render-detail.js — V170.3.10 POPULATE
   Sorumluluk: Görev detay paneli + alt görev render + peek + mesaj paneli
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-RENDER-DETAIL-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       _ppAltGorevRender       L1349-1378  Alt görev liste render
       _ppTaskAc                L1577-1579  Task açma trampoline
       _ppSagPanel              L1581-1660  Sağ detay paneli
       _ppAltGorevToggle        L2685-2692  Alt görev toggle (modal içi)
       _ppAltGorevToggleRow     L3490-3498  Alt görev satır toggle
       _ppPeekAc                L3512-3547  Peek modal aç
       _ppGorevPeek             L3550-3578  Görev hover peek
       _ppGorevMesajPanelAc     L4505-4607  Mesaj paneli (Firestore onSnapshot)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.renderDetail (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ FIRESTORE: _ppGorevMesajPanelAc içinde onSnapshot listener
                Real-time mesaj sync (firebase.firestore typeof guard'lı)
   ⚠ Bağımlılık: window._ppLoad (store ✓ Cycle 3.2.4)
                 window._ppEsc, _ppNow, _ppCu, _ppIsAdmin (core ✓)
                 window._ppGorevMesajLoad/Save/Gonder (iletisim ✓ Cycle 3.2.3)
                 window._ppSttBaslat (iletisim ✓)
                 window._ppMesajTabSec (iletisim ✓)
                 window._ppAltGorevler (state, modal-task tarafından doldurulur)
                 firebase.firestore (global SDK)
   ⚠ DOM: pp-detay-panel, pp-gorev-mesaj-panel modal'lar
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.renderDetail) window.PusulaPro.renderDetail = {};
  if (window._ppRenderDetailLoaded) return;
  window._ppRenderDetailLoaded = true;

window._ppAltGorevRender = function() {
  var list = document.getElementById('ppf-altGorevList'); if (!list) return;
  var _agUserOpts = (window._ppKullanicilar ? window._ppKullanicilar() : []).map(function(u){ return '<option value="'+_ppEsc(u.displayName||u.email||'')+'">'; }).join('');
  var _agDatalist = '<datalist id="pp-ag-userlist">'+_agUserOpts+'</datalist>';
  /* XSS-SAFE: statik */
  list.innerHTML = _agDatalist + window._ppAltGorevler.map(function(ag, i) {
    var sorVal = _ppEsc(ag.sorumlu || '');
    var bitVal = _ppEsc(ag.bitTarih || '');
    var sureVal = _ppEsc(ag.sure || '');
    return '<div>'
      + '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:0.5px solid var(--b)">'
      + '<input type="checkbox" style="width:12px;height:12px">'
      + '<div id="pp-ag-expand-' + i + '" onclick="event.stopPropagation();window._ppAltGorevToggle(' + i + ')" style="width:16px;height:16px;border:0.5px solid var(--b);border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:var(--pp-meta);color:var(--t3);background:var(--sf);flex-shrink:0">+</div>'
      + '<input id="pp-ag-bas-'+i+'" value="'+_ppEsc(ag.baslik||'')+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="font-size:var(--pp-body);flex:1;border:none;border-bottom:0.5px solid var(--b);background:transparent;color:var(--t);font-family:inherit;width:100%;outline:none;padding:2px 0">'
      + '<button onclick="event.stopPropagation();window._ppAltGorevSil(' + i + ')" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:14px;line-height:1;padding:0">×</button>'
      + '</div>'
      + '<div id="pp-ag-detail-' + i + '" style="display:none;background:var(--sf);border-bottom:0.5px solid var(--b);padding:10px 14px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'
      + '<div><div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:3px;font-weight:500">SORUMLU</div>'
      + '<input id="pp-ag-sor-' + i + '" list="pp-ag-userlist" value="' + sorVal + '" placeholder="Kullanıcı adı" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:5px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
      + '<div><div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:3px;font-weight:500">BİTİŞ TARİHİ</div>'
      + '<input type="date" id="pp-ag-bit-' + i + '" value="' + bitVal + '" onclick="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:5px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
      + '<div><div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:3px;font-weight:500">SÜRE</div>'
      + '<input id="pp-ag-sure-' + i + '" value="' + sureVal + '" placeholder="30 dk" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:5px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
      + '</div>'
      + '<button onclick="event.stopPropagation();window._ppAltGorevDetayKaydet(' + i + ')" style="font-size:var(--pp-meta);padding:4px 12px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Kaydet</button>'
      + '</div>'
      + '</div>';
  }).join('');
};
window._ppTaskAc = function(id) {
  window.toast?.('Görev detayı yakında...', 'info');
};
window._ppSagPanel = function() {
  var challenges = (typeof _ppChallengeLoad === 'function') ? _ppChallengeLoad() : [];
  var aktifChl = challenges.find(function(c) { return !c.tamamlandi; });
  var habits = (typeof _ppHabitLoad === 'function') ? _ppHabitLoad() : [];
  var goals = (typeof _ppGoalLoad === 'function') ? _ppGoalLoad() : [];
  var aktifGoal = goals[0];
  var skor = window._ppSkorOku?.() || { bugun: 0, hafta: 0 };

  var h = '';

  /* Deep Work */
  h += '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px;background:var(--sf)">';
  h += '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:5px;display:flex;justify-content:space-between">DEEP WORK <span id="pp-dw-i" style="cursor:pointer;font-size:var(--pp-meta);width:13px;height:13px;border:0.5px solid var(--b);border-radius:50%;display:flex;align-items:center;justify-content:center">i</span></div>';
  h += '<div style="font-size:26px;font-weight:500;letter-spacing:.02em;margin-bottom:2px" id="pp-dw-timer">00:00:00</div>';
  h += '<div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:7px">90 dk blok · <span id="pp-dw-pct">%0</span></div>';
  h += '<div style="height:3px;background:var(--b);border-radius:2px;margin-bottom:9px"><div id="pp-dw-bar" style="height:3px;background:var(--t);border-radius:2px;width:0%"></div></div>';
  h += '<div style="display:flex;gap:4px">';
  h += '<button onclick="event.stopPropagation();window._ppDwBasla?.()" style="flex:1;font-size:var(--pp-meta);padding:5px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Başla</button>';
  h += '<button onclick="event.stopPropagation();window._ppSetMod(\'odak\')" style="flex:1;font-size:var(--pp-meta);padding:5px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">Odak →</button>';
  h += '</div></div>';

  /* Skor */
  h += '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px;background:var(--sf)">';
  h += '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:5px">BUGÜNKÜ SKOR</div>';
  h += '<div style="font-size:24px;font-weight:500;color:#1D9E75" id="pp-skor-n">' + skor.bugun + '</div>';
  h += '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:2px">Hafta: ' + skor.hafta + ' pt</div>';
  h += '</div>';

  /* Aktif Hedef */
  if (aktifGoal) {
    var gun = aktifGoal.bitTarih ? Math.max(0, Math.ceil((new Date(aktifGoal.bitTarih) - new Date()) / 86400000)) : '?';
    var pct = aktifGoal.pct || 0;
    h += '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px;background:var(--sf)">';
    h += '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:5px;display:flex;justify-content:space-between">AKTİF HEDEF <span onclick="event.stopPropagation();window._ppGoalAc()" style="font-size:var(--pp-meta);color:#378ADD;cursor:pointer">Tümü</span></div>';
    h += '<div style="font-size:var(--pp-body);font-weight:500;margin-bottom:3px;line-height:1.35">' + _ppEsc(aktifGoal.baslik) + '</div>';
    h += '<div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:6px">' + gun + ' gün kaldı · %' + pct + '</div>';
    h += '<div style="height:3px;background:var(--b);border-radius:2px;margin-bottom:3px"><div style="height:3px;background:#378ADD;border-radius:2px;width:' + pct + '%"></div></div>';
    h += '</div>';
  } else {
    h += '<div onclick="event.stopPropagation();window._ppGoalAc()" style="border:0.5px dashed var(--b);border-radius:var(--pp-r-md);padding:12px;text-align:center;cursor:pointer;color:var(--t3);font-size:var(--pp-body)">+ 12 Hedef Ekle</div>';
  }

  /* Aktif Challenge */
  if (aktifChl) {
    var chlPct = aktifChl.hedef ? Math.round((aktifChl.tamamlanan || 0) / aktifChl.hedef * 100) : 0;
    var periyotRenk = {aylik:'var(--pp-warn)',uc_aylik:'#1D9E75',alti_aylik:'var(--pp-info)',yillik:'#534AB7'}[aktifChl.periyot] || 'var(--pp-warn)';
    var periyotBg = {aylik:'#FAEEDA',uc_aylik:'#E1F5EE',alti_aylik:'#E6F1FB',yillik:'#EEEDFE'}[aktifChl.periyot] || '#FAEEDA';
    var periyotLbl = {aylik:'Aylık',uc_aylik:'3 Aylık',alti_aylik:'6 Aylık',yillik:'Yıllık'}[aktifChl.periyot] || 'Aylık';
    h += '<div style="background:' + periyotBg + ';border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px">';
    h += '<div style="font-size:var(--pp-meta);font-weight:500;color:' + periyotRenk + ';letter-spacing:.07em;margin-bottom:4px;display:flex;justify-content:space-between">AKTİF CHALLENGE <span style="font-size:var(--pp-meta);padding:1px 6px;border-radius:3px;background:rgba(0,0,0,.06)">' + periyotLbl + '</span></div>';
    h += '<div style="font-size:var(--pp-body);font-weight:500;color:var(--t);margin-bottom:5px;line-height:1.35">' + _ppEsc(aktifChl.baslik) + '</div>';
    h += '<div style="height:4px;background:rgba(0,0,0,.08);border-radius:2px;margin-bottom:3px"><div style="height:4px;background:' + periyotRenk + ';border-radius:2px;width:' + chlPct + '%"></div></div>';
    h += '<div style="display:flex;justify-content:space-between;font-size:var(--pp-meta);color:' + periyotRenk + '">';
    h += '<span>' + (aktifChl.tamamlanan || 0) + '/' + aktifChl.hedef + ' tamamlandı</span><span>+' + aktifChl.puan + ' pt ödül</span>';
    h += '</div></div>';
  } else {
    h += '<div onclick="event.stopPropagation();window._ppChallengeAc()" style="border:0.5px dashed var(--b);border-radius:var(--pp-r-md);padding:12px;text-align:center;cursor:pointer;color:var(--t3);font-size:var(--pp-body)">+ Challenge Ekle</div>';
  }

  /* Alışkanlıklar */
  h += '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px;background:var(--sf)">';
  h += '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:7px;display:flex;justify-content:space-between">ALIŞKANLIK <span onclick="event.stopPropagation();window._ppHabitEkle()" style="font-size:var(--pp-meta);color:var(--t3);cursor:pointer">+ Ekle</span></div>';
  if (habits.length) {
    habits.slice(0, 4).forEach(function(h2) {
      var streak = h2.streak || 0;
      var dots = '';
      for (var i = 0; i < 7; i++) { dots += '<div style="width:6px;height:6px;border-radius:50%;background:' + (i < streak % 7 ? 'var(--t)' : 'var(--b)') + '"></div>'; }
      h += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:0.5px solid var(--b)">';
      h += '<span style="font-size:var(--pp-meta);flex:1">' + _ppEsc(h2.baslik) + '</span>';
      h += '<div style="display:flex;gap:2px">' + dots + '</div>';
      h += '<span style="font-size:var(--pp-meta);color:var(--t3);min-width:22px;text-align:right">' + streak + 'g</span>';
      h += '</div>';
    });
  } else {
    h += '<div style="font-size:var(--pp-body);color:var(--t3);text-align:center;padding:8px">Henüz alışkanlık yok</div>';
  }
  h += '</div>';

  return h;
};
window._ppAltGorevToggle = function(i) {
  var detail = document.getElementById('pp-ag-detail-' + i);
  var expand = document.getElementById('pp-ag-expand-' + i);
  if (!detail) return;
  var acik = detail.style.display !== 'none';
  detail.style.display = acik ? 'none' : 'block';
  if (expand) expand.textContent = acik ? '+' : '−';
};
window._ppAltGorevToggleRow = function(id) {
  var panel = document.getElementById('pp-ag-panel-'+id);
  var btn = document.getElementById('pp-ag-btn-'+id);
  if (!panel) return;
  var acik = panel.style.display !== 'none';
  panel.style.display = acik ? 'none' : 'block';
  /* XSS-SAFE: statik */
  if (btn) btn.innerHTML = acik ? '&#9658; Göster' : '&#9660; Gizle';
};
window._ppPeekAc = function(id) {
  var mevcut = document.getElementById('pp-peek-modal');
  if (mevcut && mevcut.dataset.id === String(id)) { mevcut.remove(); return; }
  if (mevcut) mevcut.remove();
  var tasks = _ppLoad();
  var t = tasks.find(function(x){ return String(x.id)===String(id); });
  if (!t) return;
  var pr = PP_PRIORITIES[t.oncelik||'normal'];
  var modal = document.createElement('div');
  modal.id = 'pp-peek-modal';
  modal.dataset.id = String(id);
  modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9998;width:420px;background:var(--sf);border:0.5px solid var(--b);border-radius:var(--pp-r-md);box-shadow:0 4px 24px rgba(0,0,0,.12);padding:18px';
  var sorumluAd = Array.isArray(t.sorumlu) ? t.sorumlu.map(function(s){return s.ad||s;}).join(', ') : (t.sorumlu||'—');
  /* XSS-SAFE: statik */
  modal.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:500;color:var(--t)">'+_ppEsc(t.baslik||t.title||'')+'</div>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-peek-modal\')?.remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1">×</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    +'<div style="background:var(--s2);border-radius:var(--pp-r-sm);padding:8px"><div style="font-size:var(--pp-meta);color:var(--t3);font-weight:500;margin-bottom:3px">ÖNCELİK</div><span style="font-size:var(--pp-body);padding:2px 7px;border-radius:3px;background:'+pr.bg+';color:'+pr.c+';font-weight:500">'+pr.l+'</span></div>'
    +'<div style="background:var(--s2);border-radius:var(--pp-r-sm);padding:8px"><div style="font-size:var(--pp-meta);color:var(--t3);font-weight:500;margin-bottom:3px">SORUMLU</div><div style="font-size:var(--pp-body);color:var(--t)">'+_ppEsc(sorumluAd)+'</div></div>'
    +'<div style="background:var(--s2);border-radius:var(--pp-r-sm);padding:8px"><div style="font-size:var(--pp-meta);color:var(--t3);font-weight:500;margin-bottom:3px">BAŞLANGIÇ</div><div style="font-size:var(--pp-body);color:var(--t)">'+(t.basT||'—')+'</div></div>'
    +'<div style="background:var(--s2);border-radius:var(--pp-r-sm);padding:8px"><div style="font-size:var(--pp-meta);color:var(--t3);font-weight:500;margin-bottom:3px">BİTİŞ</div><div style="font-size:var(--pp-body);color:var(--t)">'+(t.bitTarih||'—')+'</div></div>'
    +'</div>'
    +(t.aciklama?'<div style="font-size:var(--pp-body);color:var(--t2);line-height:1.6;margin-bottom:10px;padding:8px;background:var(--s2);border-radius:var(--pp-r-sm)">'+t.aciklama+'</div>':'')
    +(typeof window._ppBagimlilikPanelHTML === 'function' ? window._ppBagimlilikPanelHTML(t) : '')
    +(typeof window._ppZamanPanelHTML === 'function' ? window._ppZamanPanelHTML(t) : '')
    +(typeof window._ppOnayPanelHTML === 'function' ? window._ppOnayPanelHTML(t) : '')
    +'<div style="display:flex;gap:6px;justify-content:flex-end">'
    /* PUSULA-PAYLASIM-002b: modal Düzenle sadece admin'e */
    +((_ppCu()?.role === 'admin' || _ppCu()?.rol === 'admin') ? '<button onclick="event.stopPropagation();document.getElementById(\'pp-peek-modal\')?.remove();window._ppGorevDuzenle(\''+id+'\')" style="font-size:var(--pp-body);padding:6px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Düzenle</button>' : '')
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-peek-modal\')?.remove()" style="font-size:var(--pp-body);padding:6px 14px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Kapat</button>'
    +'</div>';
  document.body.appendChild(modal);
  document.addEventListener('click', function rm(e){ if(!modal.contains(e.target)){modal.remove();document.removeEventListener('click',rm);} });
};
window._ppGorevPeek = function(id) {
  var tasks = _ppLoad();
  var t = tasks.find(function(x){ return String(x.id)===String(id); });
  if (!t) return;
  var mevcut = document.getElementById('pp-peek-panel');
  if (mevcut) mevcut.remove();
  var p = document.createElement('div');
  p.id = 'pp-peek-panel';
  p.style.cssText = 'position:fixed;right:0;top:0;bottom:0;width:320px;background:var(--sf);border-left:0.5px solid var(--b);z-index:500;overflow-y:auto;padding:20px';
  /* XSS-SAFE: statik */
  p.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<div style="font-size:13px;font-weight:600;color:var(--t)">'+_ppEsc(t.baslik||t.title||'')+'</div>'
    + '<button onclick="document.getElementById(\'pp-peek-panel\')?.remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px;font-size:var(--pp-body)">'
    + '<div><span style="color:var(--t3)">Durum:</span> <span style="color:var(--t)">'+_ppEsc(t.durum||'—')+'</span></div>'
    + '<div><span style="color:var(--t3)">Öncelik:</span> <span style="color:var(--t)">'+_ppEsc(t.oncelik||'—')+'</span></div>'
    + '<div><span style="color:var(--t3)">Departman:</span> <span style="color:var(--t)">'+_ppEsc(t.departman||'—')+'</span></div>'
    + '<div><span style="color:var(--t3)">Bitiş:</span> <span style="color:var(--t)">'+_ppEsc(t.bitTarih||'—')+'</span></div>'
    + (t.toplamSureDk ? '<div><span style="color:var(--t3)">Harcanan:</span> <span style="color:var(--t)">'+( t.toplamSureDk>=60 ? Math.floor(t.toplamSureDk/60)+'sa '+t.toplamSureDk%60+'dk' : t.toplamSureDk+'dk' )+'</span></div>' : '')
    + (t.aciklama ? '<div style="margin-top:8px;padding:10px;background:var(--s2);border-radius:var(--pp-r-sm);color:var(--t2);font-size:var(--pp-body)">'+t.aciklama+'</div>' : '')
    + '</div>'
    + '<div style="margin-top:16px;display:flex;gap:8px">'
    /* PUSULA-PAYLASIM-002b: peek panel Düzenle/Sil sadece admin'e */
    + ((_ppCu()?.role === 'admin' || _ppCu()?.rol === 'admin') ? '<button onclick="event.stopPropagation();window._ppGorevDuzenle(\''+id+'\');document.getElementById(\'pp-peek-panel\')?.remove()" style="flex:1;padding:7px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:transparent;cursor:pointer;font-family:inherit;font-size:var(--pp-body);color:var(--t2)">Düzenle</button>' : '')
    + ((_ppCu()?.role === 'admin' || _ppCu()?.rol === 'admin') ? '<button onclick="event.stopPropagation();window._ppGorevSil(\''+id+'\');document.getElementById(\'pp-peek-panel\')?.remove()" style="padding:7px 12px;border:0.5px solid #DC2626;border-radius:var(--pp-r-sm);background:transparent;cursor:pointer;font-family:inherit;font-size:var(--pp-body);color:#DC2626">Sil</button>' : '')
    + '</div>';
  document.body.appendChild(p);
};
window._ppGorevMesajPanelAc = function(taskId, taskAd) {
  var mevcut = document.getElementById('pp-gorev-mesaj-panel'); if(mevcut) mevcut.remove();
  /* PUSULA-PAYLASIM-003: Rol tespiti — admin/sorumlu/etkiliGozlemci yazar, seyirci okur */
  var _me = _ppCu();
  var _uid = _me?.uid || String(_me?.id || '') || _me?.email || '';
  var _isAdmin = _ppIsAdmin();
  var _task = null;
  try { _task = (_ppLoad() || []).find(function(t){ return String(t.id) === String(taskId); }); } catch(e){}
  var _yazabilir = _isAdmin;
  if (!_yazabilir && _task) {
    var _sorumluArr = Array.isArray(_task.sorumlu) ? _task.sorumlu : (_task.sorumlu ? [_task.sorumlu] : []);
    var _sorumluMatch = _sorumluArr.some(function(s){
      if (!s) return false;
      var sUid = typeof s === 'object' ? (s.uid || s.id || '') : '';
      var sAd = typeof s === 'object' ? (s.ad || s.name || s.displayName || s.email || '') : String(s);
      return sUid === _uid || sUid === (_me?.email||'') || sAd === (_me?.displayName || _me?.name || '') || sAd === (_me?.email||'') || String(s) === _uid;
    });
    var _gozlemciArr = Array.isArray(_task.gozlemci) ? _task.gozlemci : (Array.isArray(_task.etkiliGozlemci) ? _task.etkiliGozlemci : []);
    var _gozlemciMatch = _gozlemciArr.some(function(g){ return (g && (g.uid || g)) === _uid; });
    _yazabilir = _sorumluMatch || _gozlemciMatch;
  }
  var mo = document.createElement('div');
  mo.id = 'pp-gorev-mesaj-panel';
  mo.style.cssText = 'position:fixed;right:0;top:0;bottom:0;width:340px;background:var(--sf,#fff);border-left:0.5px solid var(--b);z-index:9500;display:flex;flex-direction:column;box-shadow:-4px 0 20px rgba(0,0,0,.08)';
  mo.onclick = function(e){ e.stopPropagation(); };
  /* XSS-SAFE: statik */
  mo.innerHTML = '<div style="padding:12px 16px;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between;align-items:center">'
    +'<div style="min-width:0;flex:1"><div style="font-size:var(--pp-body);font-weight:500;color:var(--t)">💬 Mesajlar</div>'
    +'<div style="font-size:var(--pp-meta);color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_ppEsc(taskAd||taskId)+'</div></div>'
    +'<button onclick="event.stopPropagation();try{window._ppChatListener&&window._ppChatListener()}catch(e){};window._ppChatListener=null;document.getElementById(\'pp-gorev-mesaj-panel\')?.remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--t3);flex-shrink:0">×</button>'
    +'</div>'
    /* PP-GOREV-MESAJ-EKLER-001: Mesajlar / Ekler tab bar */
    +'<div style="display:flex;border-bottom:0.5px solid var(--b);flex-shrink:0">'
    +'<div id="pp-mesaj-tab-msg" onclick="event.stopPropagation();window._ppMesajTabSec(\'msg\')" style="padding:8px 16px;font-size:var(--pp-meta);font-weight:500;cursor:pointer;border-bottom:2px solid var(--pp-info);color:var(--pp-info)">Mesajlar</div>'
    +'<div id="pp-mesaj-tab-ek" onclick="event.stopPropagation();window._ppMesajTabSec(\'ek\')" style="padding:8px 16px;font-size:var(--pp-meta);cursor:pointer;color:var(--t3)">Ekler</div>'
    +'</div>'
    +'<div id="pp-gorev-mesaj-liste" style="flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px"></div>'
    +'<div id="pp-gorev-ek-liste" style="display:none;flex:1;overflow-y:auto;padding:12px 16px"></div>'
    /* PUSULA-PAYLASIM-003: Seyirci ise input/upload yerine readonly banner */
    + (_yazabilir
        ? '<div style="padding:10px 12px;border-top:0.5px solid var(--b);display:flex;flex-direction:column;gap:6px">'
          +'<textarea id="pp-gorev-mesaj-input" maxlength="2000" placeholder="Mesaj yaz..." rows="2" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);padding:6px 8px;font-size:var(--pp-body);font-family:inherit;resize:none;background:var(--s2);color:var(--t);box-sizing:border-box"></textarea>'
          +'<div style="display:flex;gap:6px">'
          +'<button onclick="event.stopPropagation();var t=document.getElementById(\'pp-gorev-mesaj-input\');if(t.value.trim()){window._ppGorevMesajGonder(\''+taskId+'\',t.value.trim());t.value=\'\'}" style="flex:1;padding:5px;border:none;background:#111;color:#fff;border-radius:5px;font-size:var(--pp-meta);cursor:pointer;font-family:inherit">Gönder</button>'
          /* PP-GOREV-MESAJ-STT-001: SpeechRecognition tr-TR */
          +'<button id="pp-stt-btn" onclick="event.stopPropagation();window._ppSttBaslat(\''+taskId+'\')" style="padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;font-size:var(--pp-body);cursor:pointer;background:transparent;color:var(--t2)" title="Sesli mesaj">🎤</button>'
          +'<label style="padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;font-size:var(--pp-meta);cursor:pointer;color:var(--t2)">📎<input type="file" style="display:none" onchange="event.stopPropagation();if(this.files[0])window._ppGorevMesajGonder(\''+taskId+'\',\'\',this.files[0].name)"></label>'
          +'</div></div>'
        : '<div style="padding:12px 14px;margin:10px 12px;background:#F3F4F6;border:0.5px dashed #CBD5E1;border-radius:var(--pp-r-md);text-align:center;color:#64748B;font-size:var(--pp-meta)">\u{1F441} Seyirci modundas\u0131n \u2014 mesajlar\u0131 okuyabilirsin, yazamazs\u0131n</div>'
      );
  document.body.appendChild(mo);
  window._ppGorevMesajPanelRender = function(tid) {
    var liste = document.getElementById('pp-gorev-mesaj-liste'); if(!liste) return;
    var mesajlar = window._ppGorevMesajLoad(tid||taskId);
    /* XSS-SAFE: statik */
    liste.innerHTML = mesajlar.length ? mesajlar.map(function(m){
      return '<div style="padding:8px 10px;background:var(--s2);border-radius:var(--pp-r-md)">'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:3px">'
        +'<span style="font-size:var(--pp-meta);font-weight:500;color:var(--t2)">'+_ppEsc(m.gonderen)+'</span>'
        +'<span style="font-size:var(--pp-meta);color:var(--t3)">'+new Date(m.tarih).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})+'</span></div>'
        +(m.dosya?'<div style="font-size:var(--pp-meta);color:var(--pp-info)">📎 '+_ppEsc(m.dosya)+'</div>':'')
        +(m.text?'<div style="font-size:var(--pp-body);color:var(--t)">'+_ppEsc(m.text)+'</div>':'')
        +'</div>';
    }).join('') : '<div style="text-align:center;color:var(--t3);font-size:var(--pp-body);padding:20px">Henüz mesaj yok</div>';
    liste.scrollTop = liste.scrollHeight;
    /* PP-GOREV-MESAJ-EKLER-001: Ekler sekmesi render */
    var eklerDiv = document.getElementById('pp-gorev-ek-liste');
    if (eklerDiv) {
      var dosyalar = mesajlar.filter(function(m){ return m.dosya; });
      /* XSS-SAFE: statik */
      eklerDiv.innerHTML = dosyalar.length
        ? dosyalar.map(function(m){
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);margin-bottom:6px">'
              +'<span style="font-size:16px">📎</span>'
              +'<div style="flex:1;min-width:0"><div style="font-size:var(--pp-body);font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_ppEsc(m.dosya)+'</div>'
              +'<div style="font-size:var(--pp-meta);color:var(--t3)">'+_ppEsc(m.gonderen)+' · '+new Date(m.tarih).toLocaleDateString('tr-TR')+'</div></div>'
              +'</div>';
          }).join('')
        : '<div style="text-align:center;color:var(--t3);font-size:var(--pp-body);padding:20px">Henüz ek yok</div>';
    }
  };
  window._ppGorevMesajPanelRender(taskId);
  /* PP-MESAJ-FIRESTORE-001: Realtime listener — platform/taskChats.chat_<taskId> */
  try {
    if (window._ppChatListener) { try { window._ppChatListener(); } catch(e){} window._ppChatListener = null; }
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      window._ppChatListener = firebase.firestore().collection('platform').doc('taskChats').onSnapshot(function(snap){
        var msgs = (snap && snap.data && snap.data()) ? (snap.data()['chat_' + taskId] || []) : [];
        try { localStorage.setItem('ak_pp_gorev_mesaj_'+taskId, JSON.stringify(msgs)); } catch(e) { console.warn('[PP]', e); }
        window._ppGorevMesajPanelRender && window._ppGorevMesajPanelRender(taskId);
      }, function(){});
    }
  } catch(e) { console.warn('[PP]', e); }
  setTimeout(function(){
    document.addEventListener('click', function _gmc(e){
      if(!mo.contains(e.target)){
        try{ window._ppChatListener && window._ppChatListener(); }catch(e){} window._ppChatListener=null;
        mo.remove();
        document.removeEventListener('click',_gmc);
      }
    });
  }, 50);
};

  /* ── V170.3.10 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppSagPanel) {
    Object.assign(window, {
      _ppAltGorevRender: window._ppAltGorevRender,
      _ppTaskAc: window._ppTaskAc,
      _ppSagPanel: window._ppSagPanel,
      _ppAltGorevToggle: window._ppAltGorevToggle,
      _ppAltGorevToggleRow: window._ppAltGorevToggleRow,
      _ppPeekAc: window._ppPeekAc,
      _ppGorevPeek: window._ppGorevPeek,
      _ppGorevMesajPanelAc: window._ppGorevMesajPanelAc
    });
  }

  /* ── V170.3.10 CANONICAL PusulaPro.renderDetail EXPOSE ── */
  Object.assign(window.PusulaPro.renderDetail, {
    _ppAltGorevRender: window._ppAltGorevRender,
    _ppTaskAc: window._ppTaskAc,
    _ppSagPanel: window._ppSagPanel,
    _ppAltGorevToggle: window._ppAltGorevToggle,
    _ppAltGorevToggleRow: window._ppAltGorevToggleRow,
    _ppPeekAc: window._ppPeekAc,
    _ppGorevPeek: window._ppGorevPeek,
    _ppGorevMesajPanelAc: window._ppGorevMesajPanelAc
  });
})();
