/* ════════════════════════════════════════════════════════════════
   src/modules/pusula_pro.js — Pusula Pro v1.0
   Firestore: duay_tenant_default/tasks (mevcut veri korunur)
   localStorage: ak_pusula_pro_v1
   5 Mod: akis / calisma / odak / degerlendirme / ceo
════════════════════════════════════════════════════════════════ */
'use strict';

/* ── İzolasyon Koruması ─────────────────────────────────────── */
(function() {
  if (window._ppIzoleKontrol) return;
  window._ppIzoleKontrol = true;
  var _korunanKeyler = ['ak_pusula_pro_v1','ak_pp_notlar_v1','ak_pp_challenge_v1','ak_pp_habit_v1','ak_pp_goal_v1','ak_pp_mesaj_v1','ak_pp_skor_v1','ak_pp_takvim_v1','ak_pp_hayat_v1','ak_pp_review_v1'];
  var _eskiKeyler = ['ak_tk2','ak_tasks','companyCalendar_events_v1'];
  window._ppEskiVeriKarisiyor = function(key) {
    return _eskiKeyler.indexOf(key) !== -1;
  };
  window._ppKorunanKey = function(key) {
    return _korunanKeyler.indexOf(key) !== -1;
  };
  console.log('[PP-IZOLE] Pusula Pro izolasyon aktif — eski Pusula verisi korunur, karışmaz');
})();

/* ── Sabitler ───────────────────────────────────────────────── */
var PP_KEY        = 'ak_pusula_pro_v1';
var PP_TASK_KEY   = 'ak_tk2';
var PP_MOD        = 'akis';
var PP_MODS       = ['akis','calisma','takvim','odak','degerlendirme','ceo'];

var PP_PRIORITIES = {
  kritik: { l:'Kritik', c:'#A32D2D', bg:'#FCEBEB' },
  yuksek: { l:'Yüksek', c:'#854F0B', bg:'#FAEEDA' },
  normal: { l:'Normal', c:'#5F5E5A', bg:'var(--color-background-secondary)' },
  dusuk:  { l:'Düşük',  c:'#888780', bg:'var(--color-background-secondary)' }
};

/* ── Yardımcılar ────────────────────────────────────────────── */
var _ppEsc = function(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
var _ppNow = function() { return new Date().toISOString().slice(0,19).replace('T',' '); };
var _ppToday = function() { return new Date().toISOString().slice(0,10); };
var _ppId = function() { return typeof window.generateId==='function' ? window.generateId() : Date.now()+Math.random().toString(36).slice(2,8); };
var _ppCu = function() { return window.Auth?.getCU?.() || window.CU?.(); };
var _ppIsAdmin = function() { var r=_ppCu()?.role; return r==='admin'||r==='manager'; };

/* ── Veri ───────────────────────────────────────────────────── */
function _ppLoad() {
  try {
    var r = localStorage.getItem(PP_KEY);
    if (!r) return [];
    if (r.startsWith('_LZ_') && typeof LZString!=='undefined') return JSON.parse(LZString.decompressFromUTF16(r.slice(4))||'[]');
    return JSON.parse(r);
  } catch(e) { console.warn('[PP] load hata:', e); return []; }
}
function _ppStore(d) {
  try {
    var s = JSON.stringify(d);
    if (typeof LZString!=='undefined' && s.length>500) { localStorage.setItem(PP_KEY,'_LZ_'+LZString.compressToUTF16(s)); }
    else { localStorage.setItem(PP_KEY,s); }
  } catch(e) { console.error('[PP]',e); }
  /* PUSULA-KAYIT-FIX-001: storeTasks varsa onu kullan (unified store path), yoksa _write fallback */
  if(typeof window.storeTasks==='function') { window.storeTasks(_ppLoad()); }
  else if(typeof window._write === 'function') window._write(window.KEYS?.pusula||'ak_pusula_pro_v1', d);
  if(typeof window._fsPath === 'function' && typeof window._syncFirestore === 'function') {
    var _fp = window._fsPath('pusula');
    if (_fp) window._syncFirestore(_fp, d);
  }
}

/* ── Eski Pusula Export ─────────────────────────────────────── */
window._ppExport = function() {
  try {
    var raw = localStorage.getItem(PP_TASK_KEY) || '[]';
    var tasks = raw.startsWith('_LZ_') && typeof LZString!=='undefined'
      ? JSON.parse(LZString.decompressFromUTF16(raw.slice(4))||'[]')
      : JSON.parse(raw);
    var blob = new Blob([JSON.stringify({export_date:new Date().toISOString(),count:tasks.length,tasks:tasks},null,2)],{type:'application/json'});
    var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='pusula_yedek_'+_ppToday()+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.toast?.('Yedek indirildi — '+tasks.length+' görev','ok');
  } catch(e) { window.toast?.('Export hatası: '+e.message,'err'); }
};

/* ── Panel Render ───────────────────────────────────────────── */
window._ppRender = function() {
  var panel = document.getElementById('panel-pusula-pro');
  if (!panel) return;
  if (panel.dataset.injected) { window._ppModRender(); return; }
  panel.dataset.injected = '1';
  var _modBtns = PP_MODS.map(function(m) {
    var lbl = {akis:'Akış',calisma:'Çalışma',takvim:'Takvim',odak:'Odak',degerlendirme:'Değerlendirme',ceo:'CEO'}[m];
    return '<button onclick="event.stopPropagation();window._ppSetMod(\'' + m + '\')" id="pp-mod-' + m + '" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:20px;cursor:pointer;font-family:inherit;background:transparent;color:var(--t2)">' + lbl + '</button>';
  }).join('');
  panel.innerHTML = ''
    + '<div style="display:flex;height:100%;width:100%">'
    + '<div id="pp-inner" style="flex:1;display:flex;flex-direction:column;height:100%;background:var(--sf);min-width:0">'
    + '<div id="pp-head" style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:40px;border-bottom:0.5px solid var(--b);flex-shrink:0">'
    + '<div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:7px"><div style="width:6px;height:6px;border-radius:50%;background:#E24B4A"></div>Pusula OS</div>'
    + '<div style="display:flex;gap:3px" id="pp-modes">' + _modBtns + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<div id="pp-score-pill" style="font-size:11px;font-weight:500;padding:4px 12px;border-radius:20px;background:var(--s2);color:var(--t);border:0.5px solid var(--b)">Bugün <span style="color:#1D9E75">0 pt</span></div>'
    + '<div id="pp-msg-btn" onclick="event.stopPropagation();window._ppMesajPanelAc()" style="width:30px;height:30px;border:0.5px solid var(--b);border-radius:50%;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative" title="Mesajlar">'
    + '<svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H8l-3 2V10H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/></svg>'
    + '<div id="pp-msg-dot" style="width:6px;height:6px;border-radius:50%;background:#E24B4A;position:absolute;top:4px;right:4px;display:none"></div>'
    + '</div>'
    + '<button onclick="event.stopPropagation();window._ppExport?.()" style="font-size:9px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Yedek Al</button>'
    + '</div></div>'
    + '<div id="pp-frog-bar" style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:#FCEBEB;border-bottom:0.5px solid #F7C1C1;flex-shrink:0">'
    + '<div style="font-size:8px;font-weight:500;color:#A32D2D;letter-spacing:.08em;min-width:90px">BUGÜNÜN FROGU</div>'
    + '<div id="pp-frog-txt" style="font-size:13px;font-weight:500;color:#501313;flex:1">Henüz belirlenmedi — görev ekle</div>'
    + '<button onclick="event.stopPropagation();window._ppFrogBasla?.()" style="font-size:10px;padding:5px 14px;background:#A32D2D;color:#fff;border:none;border-radius:5px;cursor:pointer;font-family:inherit;font-weight:500">Başla →</button>'
    + '</div>'
    + '<div id="pp-body" style="flex:1;overflow:hidden;display:flex"></div>'
    + '</div>'
    + '<div id="pp-not-panel" style="flex-shrink:0">' + window._ppNotPanelHTML() + '</div>'
    + '</div>';
  window._ppSetMod('akis');
  setTimeout(function() { window._ppAktifFrog = null; window._ppFrogBelirle?.(); window._ppSkorGuncelle?.(); }, 100);
};

window._ppSetMod = function(mod) {
  PP_MOD = mod;
  window._ppAktifMod = mod;
  document.querySelectorAll('[id^="pp-mod-"]').forEach(function(btn) {
    var m = btn.id.replace('pp-mod-', '');
    btn.style.background = m === mod ? 'var(--t)' : 'transparent';
    btn.style.color = m === mod ? 'var(--sf)' : 'var(--t2)';
    btn.style.borderColor = m === mod ? 'var(--t)' : 'var(--b)';
  });
  window._ppModRender();
};

window._ppModRender = function() {
  var body = document.getElementById('pp-body');
  if (!body) return;
  var mod = window._ppAktifMod || 'akis';
  if (mod === 'calisma') {
    var tasks = _ppLoad().filter(function(t) { return !t.isDeleted; });
    var kritik = tasks.filter(function(t) { return t.oncelik === 'kritik'; });
    var devam  = tasks.filter(function(t) { return t.durum === 'devam' && t.oncelik !== 'kritik'; });
    var plan   = tasks.filter(function(t) { return (!t.durum || t.durum === 'plan') && t.oncelik !== 'kritik'; });
    var _grup = function(lbl,cls,arr){
      if (!arr.length) return '';
      var h2 = '<div style="display:flex;align-items:center;gap:8px;padding:5px 14px;background:var(--s2);border-bottom:0.5px solid var(--b);position:sticky;top:0">';
      h2 += '<span style="font-size:8px;padding:2px 7px;border-radius:3px;font-weight:500;'+cls+'">'+lbl+'</span>';
      h2 += '<span style="font-size:8px;color:var(--t3)">'+arr.length+' görev</span></div>';
      arr.forEach(function(t){
        var pr = PP_PRIORITIES[t.oncelik||'normal'];
        var sorumluRaw = t.sorumlu;
        var sorumluAd = '—';
        if (Array.isArray(sorumluRaw)) {
          sorumluAd = sorumluRaw.map(function(s) { return s && typeof s === 'object' ? (s.ad || s.name || s.displayName || '?') : String(s || ''); }).filter(Boolean).join(', ') || '—';
        } else if (sorumluRaw && typeof sorumluRaw === 'object') {
          sorumluAd = sorumluRaw.ad || sorumluRaw.name || sorumluRaw.displayName || '—';
        } else if (typeof sorumluRaw === 'string' && sorumluRaw.trim()) {
          sorumluAd = sorumluRaw.trim();
        }
        var sorumluIni = sorumluAd !== '—' ? sorumluAd.split(' ').map(function(s) { return s[0] || ''; }).join('').slice(0, 2).toUpperCase() : '?';
        var kenarRenk = t.oncelik==='kritik'?'#A32D2D':t.oncelik==='yuksek'?'#854F0B':'#1D9E75';
        var agSay = t.altGorevSay||0; var agTam = t.altGorevTam||0;
        var jobId = t.job_id||t.jobId||'';
        var tarihGec = t.bitTarih && t.bitTarih < _ppToday();
        h2 += '<div id="pp-tr-'+t.id+'" style="box-shadow:-3px 0 0 0 '+kenarRenk+';border-bottom:0.5px solid var(--b);background:var(--sf)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'var(--sf)\'">';
        h2 += '<div onclick="event.stopPropagation()" style="display:grid;grid-template-columns:22px 1fr 90px 70px 70px 56px 96px;align-items:center;padding:7px 8px 7px 10px;gap:5px;cursor:default">';
        h2 += '<input type="checkbox" '+(t.durum==='tamamlandi'?'checked':'')+' onclick="event.stopPropagation();window._ppTamamla(\''+t.id+'\')" style="width:13px;height:13px;cursor:pointer">';
        h2 += '<div>';
        h2 += '<div style="font-size:11px;font-weight:500;color:'+(t.durum==='tamamlandi'?'var(--t3)':'var(--t)')+(t.durum==='tamamlandi'?';text-decoration:line-through':'')+'">' + _ppEsc(t.baslik||t.title||'') + '</div>';
        h2 += '<div style="display:flex;align-items:center;gap:5px;margin-top:2px">';
        if (jobId) h2 += '<span style="font-size:8px;padding:1px 6px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500">'+_ppEsc(jobId)+'</span>';
        if (agSay) h2 += '<span style="font-size:8px;color:var(--t3)">Alt görev '+agTam+'/'+agSay+'</span>';
        if (agSay) h2 += '<button onclick="event.stopPropagation();window._ppAltGorevToggleRow(\''+t.id+'\')" id="pp-ag-btn-'+t.id+'" style="font-size:8px;padding:1px 5px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t3)">&#9658; Göster</button>';
        h2 += '</div></div>';
        h2 += '<div style="display:flex;align-items:center;gap:4px"><div style="width:20px;height:20px;border-radius:50%;background:'+kenarRenk+';display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:500;color:#fff;flex-shrink:0">'+sorumluIni+'</div><span style="font-size:9px;color:'+(t.oncelik==='kritik'?'#791F1F':t.oncelik==='yuksek'?'#633806':'var(--t2)')+';font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_ppEsc(sorumluAd)+'</span></div>';
        h2 += '<div style="font-size:9px;color:var(--t3)">'+(t.basT?t.basT.slice(0,10):'—')+'</div>';
        h2 += '<div style="font-size:9px;color:'+(tarihGec?'#A32D2D':'var(--t3)')+(tarihGec?';font-weight:500':'')+'">'+(t.bitTarih?t.bitTarih.slice(0,10):'—')+'</div>';
        h2 += '<span style="font-size:8px;padding:2px 5px;border-radius:3px;background:'+pr.bg+';color:'+pr.c+';font-weight:500">'+pr.l+'</span>';
        h2 += '<div style="display:flex;align-items:center;gap:2px" onclick="event.stopPropagation()">';
        h2 += '<button onclick="event.stopPropagation();window._ppPeekAc(\''+t.id+'\')" title="Hızlı göz at" style="width:22px;height:22px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="6" cy="6" r="3"/><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z"/></svg></button>';
        h2 += '<button onclick="event.stopPropagation();window._ppGorevMesaj(\''+t.id+'\')" title="Mesajlaş" style="width:22px;height:22px;border:0.5px solid #B5D4F4;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;display:flex;align-items:center;justify-content:center;position:relative"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 1h10a1 1 0 011 1v5a1 1 0 01-1 1H7L4.5 11V8H1a1 1 0 01-1-1V2a1 1 0 011-1z"/></svg></button>';
        h2 += '<button onclick="event.stopPropagation();window._ppGorevDuzenle(\''+t.id+'\')" title="Düzenle" style="width:22px;height:22px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M8 2l2 2-6 6H2V8l6-6z"/></svg></button>';
        h2 += '<button onclick="event.stopPropagation();window._ppGorevSil(\''+t.id+'\')" title="Sil" style="width:22px;height:22px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D;display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M2 3h8M5 3V2h2v1M4 3v7h4V3H4z"/></svg></button>';
        h2 += '</div></div>';
        h2 += '<div id="pp-ag-panel-'+t.id+'" style="display:none;background:var(--s2);border-top:0.5px solid var(--b);padding:6px 10px 6px 46px">';
        if (agSay && t.altGorevler && t.altGorevler.length) {
          h2 += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><span style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em">ALT GÖREVLER</span><div style="display:flex;gap:4px"><button onclick="event.stopPropagation();window._ppAltGorevTopluTamamla(\''+t.id+'\')" style="font-size:8px;padding:1px 6px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t3)">Toplu tamamla</button></div></div>';
          t.altGorevler.forEach(function(ag,i){
            h2 += '<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:0.5px solid var(--b)">';
            h2 += '<input type="checkbox" '+(ag.tamamlandi?'checked':'')+' style="width:11px;height:11px">';
            h2 += '<span style="font-size:11px;flex:1;color:'+(ag.tamamlandi?'var(--t3)':'var(--t)')+(ag.tamamlandi?';text-decoration:line-through':'')+'">' + _ppEsc(ag.baslik) + '</span>';
            if (ag.sorumlu) h2 += '<span style="font-size:9px;color:var(--t3)">'+_ppEsc(ag.sorumlu)+'</span>';
            if (ag.bitTarih) h2 += '<span style="font-size:9px;color:var(--t3)">'+ag.bitTarih+'</span>';
            h2 += '</div>';
          });
        } else {
          h2 += '<div style="font-size:11px;color:var(--t3);padding:4px 0">Alt görev yok</div>';
        }
        h2 += '</div>';
        h2 += '</div>';
      });
      return h2;
    };
    body.innerHTML = ''
      + '<div style="width:180px;border-right:0.5px solid var(--b);padding:8px 0;overflow-y:auto;flex-shrink:0">'
      + '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.08em;padding:8px 14px 3px">ÇALIŞMA ALANI</div>'
      + '<div onclick="event.stopPropagation();window._ppSidebarSec(\'tum\')" style="display:flex;align-items:center;gap:7px;padding:5px 14px;cursor:pointer;font-size:11px;background:var(--s2);font-weight:500"><div style="width:5px;height:5px;border-radius:50%;background:#E24B4A"></div>Tüm Görevler<span style="margin-left:auto;font-size:8px;padding:1px 5px;border-radius:6px;background:var(--b)">' + tasks.length + '</span></div>'
      + '<div onclick="event.stopPropagation();window._ppSidebarSec(\'kritik\')" style="display:flex;align-items:center;gap:7px;padding:5px 14px;cursor:pointer;font-size:11px"><div style="width:5px;height:5px;border-radius:50%;background:#E24B4A"></div>Kritik<span style="margin-left:auto;font-size:8px;padding:1px 5px;border-radius:6px;background:var(--s2)">' + kritik.length + '</span></div>'
      + '<div onclick="event.stopPropagation();window._ppSidebarSec(\'bugun\')" style="display:flex;align-items:center;gap:7px;padding:5px 14px;cursor:pointer;font-size:11px"><div style="width:5px;height:5px;border-radius:50%;background:#EF9F27"></div>Bugün</div>'
      + '</div>'
      + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">'
      + '<div style="display:flex;align-items:center;gap:5px;padding:8px 14px;border-bottom:0.5px solid var(--b);flex-shrink:0">'
      + '<button onclick="event.stopPropagation();window._ppYeniGorev()" style="font-size:10px;padding:4px 10px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">+ Görev</button>'
      + '<input id="pp-search" placeholder="Görev ara..." oninput="event.stopPropagation();window._ppAra(this.value)" onclick="event.stopPropagation()" style="flex:1;max-width:200px;font-size:11px;padding:4px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-family:inherit;color:var(--t)">'
      + '</div>'
      + '<div style="flex:1;overflow-y:auto">'
      + '<div style="display:grid;grid-template-columns:22px 1fr 90px 70px 70px 56px 96px;align-items:center;padding:5px 10px;background:var(--s2);border-bottom:0.5px solid var(--b);gap:5px;position:sticky;top:0">'
      + '<div></div>'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em">GÖREV / JOB ID</div>'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em">SORUMLU</div>'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em">BAŞLANGIÇ</div>'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em">BİTİŞ</div>'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em">ÖNCELİK</div>'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em">AKSİYON</div>'
      + '</div>'
      + _grup('KRİTİK', 'background:#FCEBEB;color:#A32D2D', kritik)
      + _grup('DEVAM EDİYOR', 'background:#E1F5EE;color:#0F6E56', devam)
      + _grup('PLANLANDI', 'background:#E6F1FB;color:#185FA5', plan)
      + (tasks.length === 0 ? '<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px">Henüz görev yok<br><br><button onclick="event.stopPropagation();window._ppYeniGorev()" style="font-size:11px;padding:6px 16px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">+ İlk Görevi Ekle</button></div>' : '')
      + '</div>'
      + '<div style="border-top:0.5px solid var(--b);padding:8px 14px;display:flex;gap:6px;flex-shrink:0">'
      + '<input id="pp-quick" placeholder="Hızlı görev ekle — Enter..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\')window._ppHizliEkle(this)" style="flex:1;font-size:11px;padding:6px 10px;border:0.5px solid var(--b);border-radius:6px;background:transparent;font-family:inherit;color:var(--t)">'
      + '<button onclick="event.stopPropagation();var i=document.getElementById(\'pp-quick\');window._ppHizliEkle(i)" style="font-size:10px;padding:6px 12px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">+ Ekle</button>'
      + '</div></div>'
      + '<div style="width:240px;border-left:0.5px solid var(--b);padding:12px;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:10px">'
      + window._ppSagPanel()
      + '</div>';
    return;
  }
  if (mod === 'odak') {
    body.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;background:var(--sf)">'
      + '<div style="font-size:11px;color:var(--t3);letter-spacing:.1em;margin-bottom:16px">ODAK MODU</div>'
      + '<div id="pp-odak-frog" style="font-size:18px;font-weight:500;color:var(--t);max-width:500px;line-height:1.4;margin-bottom:24px">Frog seçilmedi</div>'
      + '<div style="font-size:48px;font-weight:300;letter-spacing:.04em;color:var(--t);margin-bottom:8px" id="pp-odak-timer">00:00:00</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-bottom:24px">Deep Work bloğu</div>'
      + '<div style="display:flex;gap:8px">'
      + '<button onclick="event.stopPropagation();window._ppDwBasla?.()" style="font-size:12px;padding:10px 28px;background:var(--t);color:var(--sf);border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:500">Başla</button>'
      + '<button onclick="event.stopPropagation();window._ppSetMod(\'calisma\')" style="font-size:12px;padding:10px 20px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Çık</button>'
      + '</div></div>';
  } else if (mod === 'takvim') {
    if (typeof window._ppTakvimPanelRender === 'function') { window._ppTakvimPanelRender(body); }
    else { body.innerHTML = '<div style="flex:1;padding:20px"><div style="font-size:13px;color:var(--t3)">Takvim yükleniyor...</div></div>'; }
    return;
  } else if (mod === 'akis') {
    var msgs = window._ppMesajlariOku?.('sirket') || [];
    var tasks = _ppLoad().filter(function(t) { return !t.isDeleted && t.durum !== 'tamamlandi'; });
    var bugun = _ppToday();
    var bugunTasks = tasks.filter(function(t) { return t.bitTarih === bugun || t.oncelik === 'kritik'; });
    var takvimUyari = window._ppTakvimHatirlatmaKontrol?.() || [];
    var _bugunH = bugunTasks.length
      ? bugunTasks.map(function(t) {
          var pr = PP_PRIORITIES[t.oncelik || 'normal'];
          return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:0.5px solid var(--b);border-radius:6px;margin-bottom:6px;background:var(--sf)"><div style="width:5px;height:5px;border-radius:50%;background:' + pr.c + '"></div><span style="font-size:12px;flex:1">' + _ppEsc(t.baslik || t.title || '') + '</span></div>';
        }).join('')
      : '<div style="font-size:12px;color:var(--t3);padding:12px 0">Bugün için kritik görev yok</div>';
    var _msgH = msgs.length
      ? msgs.slice(0, 5).map(function(m) {
          return '<div style="padding:10px 12px;border:0.5px solid var(--b);border-radius:6px;margin-bottom:6px;background:var(--sf)"><div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:3px">' + _ppEsc(m.gonderen || '') + '</div><div style="font-size:11px;color:var(--t2)">' + _ppEsc(m.icerik || '') + '</div></div>';
        }).join('')
      : '<div style="font-size:12px;color:var(--t3);padding:12px 0">Henüz şirket yayını yok</div>';
    body.innerHTML = ''
      + '<div style="flex:1;padding:20px;overflow-y:auto">'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin-bottom:10px">BUGÜN</div>'
      + _bugunH
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin:16px 0 8px">YAKLAŞAN GÖREVLER</div>'
      + (takvimUyari.length ? takvimUyari.slice(0,3).map(function(u){
          var renk = u.kalan===0?'#A32D2D':u.kalan<=2?'#854F0B':'#185FA5';
          var bg = u.kalan===0?'#FCEBEB':u.kalan<=2?'#FAEEDA':'#E6F1FB';
          return '<div style="padding:8px 12px;border:0.5px solid var(--b);border-radius:6px;margin-bottom:6px;background:var(--sf);display:flex;align-items:center;gap:10px">'
            +'<div style="font-size:9px;padding:2px 7px;border-radius:3px;background:'+bg+';color:'+renk+';font-weight:500;white-space:nowrap">'+(u.kalan===0?'Bugün':u.kalan+' gün')+'</div>'
            +'<div style="flex:1"><div style="font-size:11px;font-weight:500;color:var(--t)">'+_ppEsc(u.olay.baslik)+'</div>'
            +'<div style="font-size:9px;color:var(--t3)">'+_ppEsc(u.olay.periyot)+' · '+_ppEsc(u.olay.sorumluUnvan||'')+'</div></div>'
            +'<div style="font-size:9px;color:var(--t3)">'+u.sonraki+'</div>'
            +'</div>';
        }).join('') : '<div style="font-size:12px;color:var(--t3);padding:8px 0">Yaklaşan takvim görevi yok</div>')
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin:16px 0 10px">ŞİRKET YAYINLARI</div>'
      + _msgH
      + '</div>'
      + '<div style="width:240px;border-left:0.5px solid var(--b);padding:12px;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:10px">'
      + window._ppSagPanel()
      + '</div>';
  } else if (mod === 'degerlendirme') {
    var skor = window._ppSkorOku?.() || { bugun: 0, hafta: 0, toplam: 0 };
    var degTasks = _ppLoad().filter(function(t) { return !t.isDeleted; });
    var tamamlanan = degTasks.filter(function(t) { return t.durum === 'tamamlandi'; });
    var bekleyen = degTasks.filter(function(t) { return t.durum !== 'tamamlandi'; });
    var habits = window._ppHabitLoad?.() || [];
    var habitH = '';
    if (habits.length) {
      habitH = '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:14px;background:var(--sf)"><div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:10px">Alışkanlık durumu</div>';
      habits.forEach(function(h2) {
        var s2 = h2.streak || 0;
        var dots = '';
        for (var di = 0; di < 7; di++) { dots += '<div style="width:8px;height:8px;border-radius:50%;background:' + (di < s2 % 7 ? 'var(--t)' : 'var(--b)') + '"></div>'; }
        habitH += '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:0.5px solid var(--b)"><span style="font-size:11px;flex:1">' + _ppEsc(h2.baslik || '') + '</span><div style="display:flex;gap:3px">' + dots + '</div><span style="font-size:9px;color:var(--t3);min-width:28px;text-align:right">' + s2 + ' gün</span></div>';
      });
      habitH += '</div>';
    }
    body.innerHTML = '<div style="flex:1;overflow-y:auto;padding:24px;max-width:700px;margin:0 auto;width:100%">'
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.1em;margin-bottom:16px">HAFTALIK DEĞERLENDİRME</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">'
      + '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:6px">HAFTA SKORU</div><div style="font-size:28px;font-weight:500;color:#1D9E75">' + skor.hafta + '</div><div style="font-size:9px;color:var(--t3)">puan</div></div>'
      + '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:6px">TAMAMLANAN</div><div style="font-size:28px;font-weight:500;color:var(--t)">' + tamamlanan.length + '</div><div style="font-size:9px;color:var(--t3)">görev</div></div>'
      + '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:6px">BEKLEYEN</div><div style="font-size:28px;font-weight:500;color:#A32D2D">' + bekleyen.length + '</div><div style="font-size:9px;color:var(--t3)">görev</div></div>'
      + '</div>'
      + '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:14px;background:var(--sf)">'
      + '<div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:10px">Bu hafta ne yaptım?</div>'
      + '<div id="pp-rev-yapti" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:80px;padding:10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);font-size:12px;color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
      + '</div>'
      + '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:14px;background:var(--sf)">'
      + '<div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:10px">Ne öğrendim?</div>'
      + '<div id="pp-rev-ogrendi" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:80px;padding:10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);font-size:12px;color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
      + '</div>'
      + '<div style="border:0.5px solid var(--b);border-radius:8px;padding:16px;margin-bottom:14px;background:var(--sf)">'
      + '<div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:10px">Gelecek hafta en kritik 3 hedef</div>'
      + '<div id="pp-rev-hedef" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:60px;padding:10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);font-size:12px;color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
      + '</div>'
      + habitH
      + '<div style="display:flex;justify-content:flex-end;margin-top:8px">'
      + '<button onclick="event.stopPropagation();window._ppRevKaydet()" style="font-size:12px;padding:8px 24px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Değerlendirmeyi Kaydet</button>'
      + '</div>'
      + '</div>';
    setTimeout(function() { window._ppRevYukle?.(); }, 50);
    return;
  }
  if (mod === 'ceo') {
    var tasks = _ppLoad().filter(function(t){ return !t.isDeleted && t.durum!=='tamamlandi'; });
    var kritik = tasks.filter(function(t){ return t.oncelik==='kritik'; });
    var depMap = {};
    tasks.forEach(function(t){ var d=t.departman||'Diğer'; if(!depMap[d]) depMap[d]=0; depMap[d]++; });
    var takUyari = window._ppTakvimHatirlatmaKontrol?.() || [];
    var skor = window._ppSkorOku?.() || {bugun:0,hafta:0};
    body.innerHTML = '<div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px">'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.1em">ŞİRKET NABZI</div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
      +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:5px">AKTİF GÖREV</div><div style="font-size:26px;font-weight:500">'+tasks.length+'</div></div>'
      +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:#FCEBEB"><div style="font-size:8px;color:#A32D2D;font-weight:500;letter-spacing:.07em;margin-bottom:5px">KRİTİK</div><div style="font-size:26px;font-weight:500;color:#A32D2D">'+kritik.length+'</div></div>'
      +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:5px">TAKVİM UYARI</div><div style="font-size:26px;font-weight:500;color:'+(takUyari.length>0?'#854F0B':'var(--t)')+'">'+takUyari.length+'</div></div>'
      +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)"><div style="font-size:8px;color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:5px">HAFTA SKORU</div><div style="font-size:26px;font-weight:500;color:#1D9E75">'+skor.hafta+'</div></div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:14px;background:var(--sf)">'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin-bottom:10px">DEPARTMAN BAZLI</div>'
      +Object.keys(depMap).map(function(dep){ var sayi=depMap[dep]; var pct=tasks.length?Math.round(sayi/tasks.length*100):0; return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>'+_ppEsc(dep)+'</span><span style="color:var(--t3)">'+sayi+' görev</span></div><div style="height:3px;background:var(--b);border-radius:2px"><div style="height:3px;background:var(--t);border-radius:2px;width:'+pct+'%"></div></div></div>'; }).join('')
      +'</div>'
      +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:14px;background:var(--sf)">'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin-bottom:10px">KRİTİK BEKLEYENLER</div>'
      +(kritik.length ? kritik.slice(0,6).map(function(t){ return '<div style="padding:6px 0;border-bottom:0.5px solid var(--b);font-size:11px;display:flex;align-items:center;gap:8px"><div style="width:5px;height:5px;border-radius:50%;background:#A32D2D;flex-shrink:0"></div><span style="flex:1">'+_ppEsc(t.baslik||t.title||'')+'</span><span style="font-size:9px;color:var(--t3)">'+(t.bitTarih||'—')+'</span></div>'; }).join('') : '<div style="font-size:12px;color:var(--t3);padding:10px 0">Kritik görev yok</div>')
      +'</div></div>'
      +(takUyari.length ? '<div style="border:0.5px solid var(--b);border-radius:8px;padding:14px;background:#FAEEDA">'
        +'<div style="font-size:9px;font-weight:500;color:#854F0B;letter-spacing:.08em;margin-bottom:10px">TAKVİM UYARILARI</div>'
        +takUyari.map(function(u){ return '<div style="padding:6px 0;border-bottom:0.5px solid rgba(0,0,0,.06);font-size:11px;display:flex;align-items:center;gap:8px"><div style="font-size:8px;padding:2px 6px;border-radius:3px;background:rgba(133,79,11,.15);color:#854F0B;font-weight:500;white-space:nowrap">'+(u.kalan===0?'Bugün':u.kalan+' gün')+'</div><span style="flex:1;color:#633806">'+_ppEsc(u.olay.baslik)+'</span></div>'; }).join('')
        +'</div>' : '')
      +'</div>';
    return;
  } else {
    body.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;color:var(--t3);font-size:13px">'
      + window._ppModLabel(mod) + ' modu yakında aktif olacak...</div>';
  }
};

window._ppModLabel = function(mod) {
  return {akis:'Akış',calisma:'Çalışma',takvim:'Takvim',odak:'Odak',degerlendirme:'Değerlendirme',ceo:'CEO'}[mod] || mod;
};

/* ── Global Export ──────────────────────────────────────────── */
window._ppLoad   = _ppLoad;
window._ppStore  = _ppStore;
window._ppExport = window._ppExport;
window.renderPusulaPro = window._ppRender;
window.PusulaProLoaded = true;
console.log('[PUSULA-PRO] v1.0 yüklendi | Export: window._ppExport()');

/* ── Frog Sistemi ───────────────────────────────────────────── */
window._ppFrogBelirle = function() {
  if (window._ppAktifFrog && window._ppAktifFrog._ppSource === 'pro') return window._ppAktifFrog;
  var tasks = _ppLoad().filter(function(t){ return !t.isDeleted && t.durum !== 'tamamlandi' && (t._ppSource==='pro' || (t.createdAt && t.createdAt > '2026-04-07')); });
  if (!tasks.length) return null;
  var kritik = tasks.filter(function(t){ return t.oncelik==='kritik'; });
  var yuksek = tasks.filter(function(t){ return t.oncelik==='yuksek'; });
  var frog = kritik[0] || yuksek[0] || tasks[0];
  window._ppAktifFrog = frog;
  var el = document.getElementById('pp-frog-txt');
  if (el && frog) el.textContent = frog.baslik || frog.title || '';
  return frog;
};

window._ppFrogBasla = function() {
  var frog = window._ppAktifFrog || window._ppFrogBelirle();
  if (!frog) { window.toast?.('Önce görev ekle', 'warn'); return; }
  window._ppSetMod('odak');
  var el = document.getElementById('pp-odak-frog');
  if (el) el.textContent = frog.baslik || frog.title || '';
  setTimeout(function(){ window._ppDwBasla?.(); }, 300);
};

/* ── Deep Work Sayacı ──────────────────────────────────────── */
var _ppDwInterval = null;
var _ppDwSaniye   = 0;
var _ppDwHedef    = 90 * 60;

window._ppDwBasla = function() {
  if (_ppDwInterval) { clearInterval(_ppDwInterval); _ppDwInterval = null; window.toast?.('Durakladı','info'); return; }
  window.toast?.('Deep Work başladı — 90 dk','ok');
  _ppDwInterval = setInterval(function() {
    _ppDwSaniye++;
    var pct = Math.min((_ppDwSaniye/_ppDwHedef)*100, 100);
    var s = _ppDwSaniye;
    var hh = Math.floor(s/3600);
    var mm = Math.floor((s%3600)/60);
    var ss = s%60;
    var str = (hh?String(hh).padStart(2,'0')+':':'') + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
    var t1 = document.getElementById('pp-dw-timer');
    var t2 = document.getElementById('pp-odak-timer');
    var b1 = document.getElementById('pp-dw-bar');
    if (t1) t1.textContent = str;
    if (t2) t2.textContent = str;
    if (b1) b1.style.width = pct.toFixed(1) + '%';
    if (_ppDwSaniye >= _ppDwHedef) {
      clearInterval(_ppDwInterval); _ppDwInterval = null;
      window.toast?.('Deep Work tamamlandı! 90 dk odak +200 puan','ok');
      window._ppSkorEkle(200);
    }
  }, 1000);
};

/* ── Skor Sistemi ───────────────────────────────────────────── */
var _ppSkorKey = 'ak_pp_skor_v1';

window._ppSkorOku = function() {
  try { return JSON.parse(localStorage.getItem(_ppSkorKey)||'{"bugun":0,"hafta":0,"toplam":0,"tarih":""}'); } catch(e) { return {bugun:0,hafta:0,toplam:0,tarih:''}; }
};

window._ppSkorEkle = function(puan) {
  var s = window._ppSkorOku();
  var bugun = _ppToday();
  if (s.tarih !== bugun) { s.bugun = 0; s.tarih = bugun; }
  s.bugun  += puan;
  s.hafta  += puan;
  s.toplam += puan;
  localStorage.setItem(_ppSkorKey, JSON.stringify(s));
  var el = document.getElementById('pp-skor-n');
  var pl = document.getElementById('pp-score-pill');
  if (el) el.textContent = s.bugun;
  if (pl) pl.innerHTML = 'Bugün <span style="color:#1D9E75">'+s.bugun+' pt</span> · Hafta <span style="color:#1D9E75">'+s.hafta+'</span>';
  return s;
};

window._ppSkorGuncelle = function() {
  var s = window._ppSkorOku();
  var el = document.getElementById('pp-skor-n');
  var pl = document.getElementById('pp-score-pill');
  if (el) el.textContent = s.bugun;
  if (pl) pl.innerHTML = 'Bugün <span style="color:#1D9E75">'+s.bugun+' pt</span> · Hafta <span style="color:#1D9E75">'+s.hafta+'</span>';
};

/* ── PP-003: Çalışma Modu Yardımcıları ──────────────────────── */
window._ppHizliEkle = function(inp) {
  if (!inp || !inp.value.trim()) return;
  var yeni = { id: _ppId(), baslik: inp.value.trim(), oncelik: 'normal', durum: 'plan', createdAt: _ppNow(), updatedAt: _ppNow(), sorumlu: _ppCu()?.displayName || _ppCu()?.email || '' };
  var tasks = _ppLoad(); tasks.unshift(yeni); _ppStore(tasks);
  inp.value = '';
  window.toast?.('Görev eklendi', 'ok');
  window._ppModRender();
};

window._ppTamamla = function(id) {
  var bagKontrol = window._ppBagimlilikKontrol?.(id);
  if (bagKontrol && !bagKontrol.gecerli) {
    window.toast?.('Önce tamamlanması gereken: ' + bagKontrol.eksikler.join(', '), 'warn');
    return;
  }
  var tasks = _ppLoad(); var t = tasks.find(function(x) { return x.id === id; });
  if (t) {
    t.durum = 'tamamlandi'; t.updatedAt = _ppNow(); _ppStore(tasks);
    var puan = t.oncelik==='kritik'?120:t.oncelik==='yuksek'?80:40;
    window._ppSkorEkle?.(puan);
  }
  window.toast?.('Tamamlandı', 'ok');
  setTimeout(function() { window._ppModRender(); }, 400);
};

window._ppYeniGorev = function() {
  var mevcut = document.getElementById('pp-gorev-modal'); if(mevcut){mevcut.remove();return;}
  var ekip = (typeof window.loadUsers === 'function' ? window.loadUsers() : []).filter(function(u) { return !u.isDeleted; }).map(function(u) { return { val: u.uid || u.id, lbl: u.displayName || u.ad || u.name || u.email || '?' }; });
  if (!ekip.length) ekip = [{ val: '', lbl: 'Baran A.' }, { val: '', lbl: 'Ayşe Y.' }, { val: '', lbl: 'Mehmet K.' }];
  var kpiler = ['—','KPI-01 Satış Hedefi','KPI-02 Nakit Akışı','KPI-03 Satınalma','KPI-07 SGK/Ödemeler'];
  var jobOpts = '<option value="">— Seç —</option>';
  try {
    var eskiTasks = JSON.parse(localStorage.getItem('ak_tk2')||'[]');
    var jobIds = [];
    eskiTasks.forEach(function(t){ if(t.jobId && jobIds.indexOf(t.jobId)===-1) jobIds.push(t.jobId); });
    var ppTasks = _ppLoad();
    ppTasks.forEach(function(t){ if(t.job_id && jobIds.indexOf(t.job_id)===-1) jobIds.push(t.job_id); });
    if(jobIds.length) jobIds.forEach(function(j){ jobOpts += '<option value="'+j+'">'+j+'</option>'; });
  } catch(e) {}
  jobOpts += '<option value="yeni">+ Yeni Job ID oluştur</option>';
  var mo = document.createElement('div'); mo.id='pp-gorev-modal';
  mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:30px 0;overflow-y:auto';
  mo.onclick=function(e){if(e.target===mo)mo.remove();};
  var _sel=function(id,lbl,opts,bg){ return '<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">'+lbl+'</div><select id="ppf-'+id+'" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:'+(bg||'var(--s2)')+';color:var(--t);font-family:inherit">'+opts+'</select></div>'; };
  var _inp=function(id,lbl,type,ph){ return '<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">'+lbl+'</div><input id="ppf-'+id+'" type="'+(type||'text')+'" placeholder="'+(ph||'')+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'; };
  mo.innerHTML='<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:620px;overflow:hidden">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">'
    +'<div style="font-size:14px;font-weight:500;color:var(--t)">Yeni Görev</div>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-gorev-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button></div>'
    +'<div style="padding:20px;display:flex;flex-direction:column;gap:14px">'
    +'<input id="ppf-baslik" placeholder="Görev başlığı..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="font-size:15px;font-weight:500;padding:8px 0;border:none;border-bottom:2px solid var(--bm);border-radius:0;background:transparent;width:100%;color:var(--t);font-family:inherit;outline:none">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +'<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">JOB ID</div>'
    +'<input id="ppf-job_id" placeholder="JOB-2026-XXXX" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
    +_sel('departman','DEPARTMAN','<option>Satış</option><option>Satınalma</option><option>Operasyon</option><option>Finans</option><option>İK</option>')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    +_sel('oncelik','ÖNCELİK','<option value="kritik">Kritik</option><option value="yuksek">Yüksek</option><option value="normal" selected>Normal</option><option value="dusuk">Düşük</option>','var(--s2)')
    +_sel('durum','DURUM','<option value="plan" selected>Plan</option><option value="devam">Devam</option><option value="bekliyor">Bekliyor</option>')
    +_sel('kpi','KPI BAĞLA',kpiler.map(function(k){return '<option>'+k+'</option>';}).join(''))
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    +_inp('basT','BAŞLANGIÇ','date','')
    +_inp('bitT','BİTİŞ TARİHİ','date','')
    +_inp('sure','TAHMİNİ SÜRE','text','örn: 90 dk')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    +'<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">SORUMLU (birden fazla eklenebilir)</div>'
    +window._ppUserTagHTML('ppf-sorumlu','Kullanıcı adı yaz...')
    +'</div>'
    +'<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">GÖZLEMCİ (birden fazla eklenebilir)</div>'
    +window._ppUserTagHTML('ppf-gozlemci','Kullanıcı adı yaz...')
    +'</div>'
    +_sel('enerji','ENERJİ','<option value="yuksek">Yüksek</option><option value="orta" selected>Orta</option><option value="dusuk">Düşük</option>')
    +'</div>'
    +'<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">AÇIKLAMA / ARAŞTIRMA NOTU</div>'
    +'<div style="display:flex;gap:2px;padding:5px 8px;border:0.5px solid var(--b);border-radius:6px 6px 0 0;background:var(--s2);border-bottom:none">'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'bold\')" style="font-size:11px;padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-weight:700;font-family:inherit">B</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'italic\')" style="font-size:11px;padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-style:italic;font-family:inherit">I</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'underline\')" style="font-size:11px;padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;text-decoration:underline;font-family:inherit">U</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'insertUnorderedList\')" style="font-size:11px;padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-family:inherit">• Liste</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'insertOrderedList\')" style="font-size:11px;padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-family:inherit">1. Liste</button>'
    +'</div>'
    +'<div id="ppf-aciklama" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:80px;padding:10px;border:0.5px solid var(--b);border-radius:0 0 6px 6px;background:var(--s2);font-size:12px;color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
    +'</div>'
    +'<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">ALT GÖREVLER</div>'
    +'<div id="ppf-altGorevList" style="border:0.5px solid var(--b);border-radius:6px;overflow:hidden;background:var(--s2)"></div>'
    +'<div style="display:flex;gap:6px;margin-top:6px"><input id="ppf-altYeni" placeholder="+ Alt görev ekle..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){event.preventDefault();window._ppAltGorevEkle()}" style="flex:1;font-size:12px;padding:5px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-family:inherit;color:var(--t)">'
    +'<button onclick="event.stopPropagation();window._ppAltGorevEkle()" style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">Ekle</button></div></div>'
    +'<div><div style="font-size:11px;color:var(--t3);margin-bottom:5px;font-weight:500">DOSYA EKİ (PDF, Excel, JPG — maks 5MB)</div>'
    +'<div id="ppf-dosya-list" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px"></div>'
    +'<label style="display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:6px 12px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2);background:var(--s2)">'
    +'<svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M7 1v8M4 4l3-3 3 3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
    +'Dosya Seç <input type="file" id="ppf-dosya" multiple accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png" style="display:none" onchange="event.stopPropagation();window._ppDosyaEkle(this)"></label>'
    +'</div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">'
    +'<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:11px;color:var(--t2)"><input type="checkbox" id="ppf-frog" onclick="event.stopPropagation()" style="width:13px;height:13px">Bu görevi bugünün Frogu yap</label>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-gorev-modal\')?.remove()" style="font-size:12px;padding:7px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>'
    +'<button onclick="event.stopPropagation();window._ppGorevKaydet()" style="font-size:12px;padding:7px 20px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
    +'</div></div></div>';
  document.body.appendChild(mo);
  setTimeout(function(){document.getElementById('ppf-baslik')?.focus();},100);
  var jobSel = document.getElementById('ppf-job_id');
  if(jobSel) jobSel.onchange = function(e){
    e.stopPropagation();
    if(this.value==='yeni'){
      var j = prompt('Yeni Job ID:');
      if(j && j.trim()){
        var o = document.createElement('option');
        o.value = j.trim(); o.text = j.trim(); o.selected = true;
        this.add(o, this.options.length-1);
        this.value = j.trim();
      } else { this.value = ''; }
    }
  };
  window._ppAltGorevler=[];
  window._ppDosyaEkleri=[];
};

window._ppAltGorevler = [];
window._ppAltGorevRender = function() {
  var list = document.getElementById('ppf-altGorevList'); if (!list) return;
  list.innerHTML = window._ppAltGorevler.map(function(ag, i) {
    var sorVal = _ppEsc(ag.sorumlu || '');
    var bitVal = _ppEsc(ag.bitTarih || '');
    var sureVal = _ppEsc(ag.sure || '');
    return '<div>'
      + '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:0.5px solid var(--b)">'
      + '<input type="checkbox" style="width:12px;height:12px">'
      + '<div id="pp-ag-expand-' + i + '" onclick="event.stopPropagation();window._ppAltGorevToggle(' + i + ')" style="width:16px;height:16px;border:0.5px solid var(--b);border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--t3);background:var(--sf);flex-shrink:0">+</div>'
      + '<span style="font-size:12px;flex:1;color:var(--t)">' + _ppEsc(ag.baslik) + '</span>'
      + '<button onclick="event.stopPropagation();window._ppAltGorevSil(' + i + ')" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:14px;line-height:1;padding:0">×</button>'
      + '</div>'
      + '<div id="pp-ag-detail-' + i + '" style="display:none;background:var(--sf);border-bottom:0.5px solid var(--b);padding:10px 14px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'
      + '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px;font-weight:500">SORUMLU</div>'
      + '<input id="pp-ag-sor-' + i + '" value="' + sorVal + '" placeholder="Kullanıcı adı" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
      + '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px;font-weight:500">BİTİŞ TARİHİ</div>'
      + '<input type="date" id="pp-ag-bit-' + i + '" value="' + bitVal + '" onclick="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
      + '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px;font-weight:500">SÜRE</div>'
      + '<input id="pp-ag-sure-' + i + '" value="' + sureVal + '" placeholder="30 dk" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
      + '</div>'
      + '<button onclick="event.stopPropagation();window._ppAltGorevDetayKaydet(' + i + ')" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Kaydet</button>'
      + '</div>'
      + '</div>';
  }).join('');
};

window._ppAltGorevEkle = function() {
  var inp = document.getElementById('ppf-altYeni'); if (!inp || !inp.value.trim()) return;
  window._ppAltGorevler.push({ id: _ppId(), baslik: inp.value.trim(), tamamlandi: false, sorumlu: '', bitTarih: '', sure: '' });
  inp.value = '';
  window._ppAltGorevRender();
};
window._ppAltGorevSil = function(i) {
  window._ppAltGorevler.splice(i, 1);
  window._ppAltGorevRender();
};

window._ppGorevKaydet = function() {
  var baslik = document.getElementById('ppf-baslik')?.value.trim();
  if(!baslik){window.toast?.('Görev başlığı zorunlu','warn');return;}
  var yeni = {
    id: _ppId(),
    baslik: baslik,
    job_id: document.getElementById('ppf-job_id')?.value||'',
    departman: document.getElementById('ppf-departman')?.value||'',
    oncelik: document.getElementById('ppf-oncelik')?.value||'normal',
    durum: document.getElementById('ppf-durum')?.value||'plan',
    kpi: document.getElementById('ppf-kpi')?.value||'',
    basT: document.getElementById('ppf-basT')?.value||'',
    bitTarih: document.getElementById('ppf-bitT')?.value||'',
    sure: document.getElementById('ppf-sure')?.value||'',
    sorumlu: window._ppUserTaglerAl('ppf-sorumlu'),
    gozlemci: window._ppUserTaglerAl('ppf-gozlemci'),
    enerji: document.getElementById('ppf-enerji')?.value||'',
    aciklama: document.getElementById('ppf-aciklama')?.innerHTML||'',
    altGorevler: window._ppAltGorevler||[],
    altGorevSay: (window._ppAltGorevler||[]).length,
    altGorevTam: 0,
    dosyalar: window._ppDosyaEkleri||[],
    dosyaSay: (window._ppDosyaEkleri||[]).length,
    isFrog: document.getElementById('ppf-frog')?.checked||false,
    _ppSource: 'pro',
    createdAt: _ppNow(),
    updatedAt: _ppNow(),
    sorumluId: _ppCu()?.uid||''
  };
  var tasks=_ppLoad();
  if (window._ppDuzenleHedef) {
    var idx = tasks.findIndex(function(t){ return String(t.id) === String(window._ppDuzenleHedef); });
    if (idx !== -1) {
      Object.assign(tasks[idx], yeni);
      tasks[idx].id = window._ppDuzenleHedef;
      tasks[idx].updatedAt = _ppNow();
      _ppStore(tasks);
      window._ppDuzenleHedef = null;
      document.getElementById('pp-gorev-modal')?.remove();
      window.toast?.('Görev güncellendi', 'ok');
      // PUSULA-KAYIT-FIX-001: modal kapanma race condition için setTimeout
      setTimeout(function(){ window._ppModRender?.(); }, 50);
      return;
    }
    window._ppDuzenleHedef = null;
  }
  tasks.unshift(yeni); _ppStore(tasks);
  window.toast?.('Görev eklendi','ok');
  if(yeni.isFrog){window._ppAktifFrog=yeni; var el=document.getElementById('pp-frog-txt'); if(el) el.textContent=yeni.baslik;}
  document.getElementById('pp-gorev-modal')?.remove();
  window._ppDosyaEkleri=[];
  // PUSULA-KAYIT-FIX-001: modal kapanma race condition için setTimeout
  setTimeout(function(){ window._ppModRender?.(); }, 50);
};

window._ppAra = function(q) {
  window._ppSearchQ = q;
  window._ppModRender();
};

window._ppSidebarSec = function(sec) {
  window._ppSidebarAktif = sec;
  window._ppModRender();
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
  h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:5px;display:flex;justify-content:space-between">DEEP WORK <span id="pp-dw-i" style="cursor:pointer;font-size:8px;width:13px;height:13px;border:0.5px solid var(--b);border-radius:50%;display:flex;align-items:center;justify-content:center">i</span></div>';
  h += '<div style="font-size:26px;font-weight:500;letter-spacing:.02em;margin-bottom:2px" id="pp-dw-timer">00:00:00</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-bottom:7px">90 dk blok · <span id="pp-dw-pct">%0</span></div>';
  h += '<div style="height:3px;background:var(--b);border-radius:2px;margin-bottom:9px"><div id="pp-dw-bar" style="height:3px;background:var(--t);border-radius:2px;width:0%"></div></div>';
  h += '<div style="display:flex;gap:4px">';
  h += '<button onclick="event.stopPropagation();window._ppDwBasla?.()" style="flex:1;font-size:10px;padding:5px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Başla</button>';
  h += '<button onclick="event.stopPropagation();window._ppSetMod(\'odak\')" style="flex:1;font-size:10px;padding:5px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">Odak →</button>';
  h += '</div></div>';

  /* Skor */
  h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:5px">BUGÜNKÜ SKOR</div>';
  h += '<div style="font-size:24px;font-weight:500;color:#1D9E75" id="pp-skor-n">' + skor.bugun + '</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Hafta: ' + skor.hafta + ' pt</div>';
  h += '</div>';

  /* Aktif Hedef */
  if (aktifGoal) {
    var gun = aktifGoal.bitTarih ? Math.max(0, Math.ceil((new Date(aktifGoal.bitTarih) - new Date()) / 86400000)) : '?';
    var pct = aktifGoal.pct || 0;
    h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)">';
    h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:5px;display:flex;justify-content:space-between">AKTİF HEDEF <span onclick="event.stopPropagation();window._ppGoalAc()" style="font-size:8px;color:#378ADD;cursor:pointer">Tümü</span></div>';
    h += '<div style="font-size:12px;font-weight:500;margin-bottom:3px;line-height:1.35">' + _ppEsc(aktifGoal.baslik) + '</div>';
    h += '<div style="font-size:9px;color:var(--t3);margin-bottom:6px">' + gun + ' gün kaldı · %' + pct + '</div>';
    h += '<div style="height:3px;background:var(--b);border-radius:2px;margin-bottom:3px"><div style="height:3px;background:#378ADD;border-radius:2px;width:' + pct + '%"></div></div>';
    h += '</div>';
  } else {
    h += '<div onclick="event.stopPropagation();window._ppGoalAc()" style="border:0.5px dashed var(--b);border-radius:8px;padding:12px;text-align:center;cursor:pointer;color:var(--t3);font-size:11px">+ 12 Hedef Ekle</div>';
  }

  /* Aktif Challenge */
  if (aktifChl) {
    var chlPct = aktifChl.hedef ? Math.round((aktifChl.tamamlanan || 0) / aktifChl.hedef * 100) : 0;
    var periyotRenk = {aylik:'#854F0B',uc_aylik:'#1D9E75',alti_aylik:'#185FA5',yillik:'#534AB7'}[aktifChl.periyot] || '#854F0B';
    var periyotBg = {aylik:'#FAEEDA',uc_aylik:'#E1F5EE',alti_aylik:'#E6F1FB',yillik:'#EEEDFE'}[aktifChl.periyot] || '#FAEEDA';
    var periyotLbl = {aylik:'Aylık',uc_aylik:'3 Aylık',alti_aylik:'6 Aylık',yillik:'Yıllık'}[aktifChl.periyot] || 'Aylık';
    h += '<div style="background:' + periyotBg + ';border:0.5px solid var(--b);border-radius:8px;padding:12px">';
    h += '<div style="font-size:8px;font-weight:500;color:' + periyotRenk + ';letter-spacing:.07em;margin-bottom:4px;display:flex;justify-content:space-between">AKTİF CHALLENGE <span style="font-size:8px;padding:1px 6px;border-radius:3px;background:rgba(0,0,0,.06)">' + periyotLbl + '</span></div>';
    h += '<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:5px;line-height:1.35">' + _ppEsc(aktifChl.baslik) + '</div>';
    h += '<div style="height:4px;background:rgba(0,0,0,.08);border-radius:2px;margin-bottom:3px"><div style="height:4px;background:' + periyotRenk + ';border-radius:2px;width:' + chlPct + '%"></div></div>';
    h += '<div style="display:flex;justify-content:space-between;font-size:8px;color:' + periyotRenk + '">';
    h += '<span>' + (aktifChl.tamamlanan || 0) + '/' + aktifChl.hedef + ' tamamlandı</span><span>+' + aktifChl.puan + ' pt ödül</span>';
    h += '</div></div>';
  } else {
    h += '<div onclick="event.stopPropagation();window._ppChallengeAc()" style="border:0.5px dashed var(--b);border-radius:8px;padding:12px;text-align:center;cursor:pointer;color:var(--t3);font-size:11px">+ Challenge Ekle</div>';
  }

  /* Alışkanlıklar */
  h += '<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px;background:var(--sf)">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.07em;margin-bottom:7px;display:flex;justify-content:space-between">ALIŞKANLIK <span onclick="event.stopPropagation();window._ppHabitEkle()" style="font-size:8px;color:var(--t3);cursor:pointer">+ Ekle</span></div>';
  if (habits.length) {
    habits.slice(0, 4).forEach(function(h2) {
      var streak = h2.streak || 0;
      var dots = '';
      for (var i = 0; i < 7; i++) { dots += '<div style="width:6px;height:6px;border-radius:50%;background:' + (i < streak % 7 ? 'var(--t)' : 'var(--b)') + '"></div>'; }
      h += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:0.5px solid var(--b)">';
      h += '<span style="font-size:10px;flex:1">' + _ppEsc(h2.baslik) + '</span>';
      h += '<div style="display:flex;gap:2px">' + dots + '</div>';
      h += '<span style="font-size:8px;color:var(--t3);min-width:22px;text-align:right">' + streak + 'g</span>';
      h += '</div>';
    });
  } else {
    h += '<div style="font-size:11px;color:var(--t3);text-align:center;padding:8px">Henüz alışkanlık yok</div>';
  }
  h += '</div>';

  return h;
};

/* ── Mesajlaşma Sistemi ─────────────────────────────────────── */
var PP_MSG_KEY = 'ak_pp_mesaj_v1';

function _ppMsgLoad() {
  try { var r=localStorage.getItem(PP_MSG_KEY); return r?JSON.parse(r):[]; } catch(e) { return []; }
}
function _ppMsgStore(d) {
  try { localStorage.setItem(PP_MSG_KEY,JSON.stringify(d)); } catch(e) {}
}

window._ppMesajGonder = function(icerik, tip, hedef) {
  if (!icerik || !icerik.trim()) return;
  var cu = _ppCu();
  var msg = {
    id: _ppId(),
    icerik: icerik.trim(),
    tip: tip || 'kisisel',
    hedef: hedef || cu?.uid || '',
    gonderen: cu?.displayName || cu?.email || 'Ben',
    gonderenId: cu?.uid || '',
    tarih: _ppNow(),
    okundu: false
  };
  var msgs = _ppMsgLoad();
  msgs.unshift(msg);
  if (msgs.length > 500) msgs = msgs.slice(0,500);
  _ppMsgStore(msgs);
  window._ppBildirimGuncelle();
  return msg;
};

window._ppMesajlariOku = function(tip) {
  var cu = _ppCu();
  var msgs = _ppMsgLoad();
  return msgs.filter(function(m) {
    if (tip === 'sirket') return m.tip === 'sirket';
    if (tip === 'kisisel') return m.tip === 'kisisel' && (m.hedef===cu?.uid || m.gonderenId===cu?.uid);
    if (tip === 'hayat') return m.tip === 'hayat';
    return true;
  });
};

window._ppBildirimGuncelle = function() {
  var okunmayanlar = _ppMsgLoad().filter(function(m){ return !m.okundu; });
  var n = okunmayanlar.length;
  var btn = document.getElementById('pp-msg-btn');
  var dot = document.getElementById('pp-msg-dot');
  if (dot) dot.style.display = n > 0 ? 'block' : 'none';
  if (btn) btn.title = n > 0 ? n + ' okunmamış mesaj' : 'Mesajlar';
};

window._ppMesajPanelAc = function() {
  var mod = window._ppAktifMod;
  if (mod === 'odak') {
    window.toast?.('Odak modunda mesajlar kuyruğa alındı — blok bitince okunur','info');
    return;
  }
  var msgs = window._ppMesajlariOku('kisisel');
  var mevcut = document.getElementById('pp-msg-panel');
  if (mevcut) { mevcut.remove(); return; }
  var panel = document.createElement('div');
  panel.id = 'pp-msg-panel';
  panel.style.cssText = 'position:fixed;top:80px;right:20px;width:320px;max-height:500px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.12);z-index:9000;display:flex;flex-direction:column;overflow:hidden';
  var _msgRow = function(m) {
    return '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b)">'
      + '<div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:3px">'+_ppEsc(m.gonderen)+'</div>'
      + '<div style="font-size:11px;color:var(--t2);line-height:1.45">'+_ppEsc(m.icerik)+'</div>'
      + '<div style="font-size:8px;color:var(--t3);margin-top:4px">'+m.tarih+'</div>'
      + '</div>';
  };
  panel.innerHTML = '<div style="display:flex;border-bottom:0.5px solid var(--b)">'
    + ['kisisel','sirket','hayat'].map(function(t,i){ var lbl={kisisel:'Kişisel',sirket:'Şirket',hayat:'Hayat'}[t]; return '<div onclick="event.stopPropagation();window._ppMsgTab(\''+t+'\')" id="pp-msg-tab-'+t+'" style="flex:1;padding:8px;text-align:center;font-size:10px;cursor:pointer;'+(i===0?'border-bottom:2px solid var(--t);font-weight:500':'color:var(--t3)')+'">'+lbl+'</div>'; }).join('')
    + '</div>'
    + '<div id="pp-msg-list" style="flex:1;overflow-y:auto;max-height:350px">'
    + (msgs.length ? msgs.map(_msgRow).join('') : '<div style="padding:30px;text-align:center;color:var(--t3);font-size:12px">Mesaj yok</div>')
    + '</div>'
    + '<div style="padding:8px;border-top:0.5px solid var(--b);display:flex;gap:5px">'
    + '<input id="pp-msg-input" placeholder="Mesaj yaz..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\')window._ppMsgGonderForm()" style="flex:1;font-size:11px;padding:5px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-family:inherit;color:var(--t)">'
    + '<button onclick="event.stopPropagation();window._ppMsgGonderForm()" style="font-size:10px;padding:5px 10px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Gönder</button>'
    + '</div>';
  document.body.appendChild(panel);
  var allMsgs = _ppMsgLoad();
  allMsgs.forEach(function(m){ m.okundu=true; });
  _ppMsgStore(allMsgs);
  window._ppBildirimGuncelle();
  document.addEventListener('click', function rm(e){ if(!panel.contains(e.target)){panel.remove();document.removeEventListener('click',rm);} },{once:false});
};

window._ppMsgTab = function(tip) {
  var msgs = tip === 'hayat' ? (window._ppHayatKartlariOku ? window._ppHayatKartlariOku() : []) : window._ppMesajlariOku(tip);
  var list = document.getElementById('pp-msg-list');
  if (!list) return;
  document.querySelectorAll('[id^="pp-msg-tab-"]').forEach(function(el){ el.style.borderBottom='none'; el.style.fontWeight=''; el.style.color='var(--t3)'; });
  var aktif = document.getElementById('pp-msg-tab-'+tip);
  if (aktif) { aktif.style.borderBottom='2px solid var(--t)'; aktif.style.fontWeight='500'; aktif.style.color='var(--t)'; }
  var tipRenk = { aile:'#A32D2D', kitap:'#185FA5', gelisim:'#1D9E75' };
  list.innerHTML = msgs.length ? msgs.map(function(m) {
    var etiket = m.tip ? '<span style="font-size:8px;padding:1px 6px;border-radius:3px;background:var(--s2);color:' + (tipRenk[m.tip] || 'var(--t3)') + ';margin-left:6px">' + _ppEsc(m.tip) + '</span>' : '';
    return '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b)">'
      + '<div style="font-size:8px;color:var(--t3);margin-bottom:3px">' + ((m.tarih || '').slice(0, 16)) + etiket + '</div>'
      + '<div style="font-size:11px;color:var(--t2);line-height:1.5">' + _ppEsc(m.icerik || m.gonderen || '') + '</div>'
      + '</div>';
  }).join('') : '<div style="padding:30px;text-align:center;color:var(--t3);font-size:12px">Henüz kart yok</div>';
};

window._ppMsgGonderForm = function() {
  var inp = document.getElementById('pp-msg-input');
  if (!inp || !inp.value.trim()) return;
  window._ppMesajGonder(inp.value.trim(), 'kisisel', '');
  inp.value = '';
  window._ppMsgTab('kisisel');
  window.toast?.('Mesaj gönderildi','ok');
};

window.PP_MSG_KEY = PP_MSG_KEY;

/* ── Challenge + Alışkanlık + 12 Hedef Verisi ──────────────── */
var PP_CHALLENGE_KEY = 'ak_pp_challenge_v1';
var PP_HABIT_KEY     = 'ak_pp_habit_v1';
var PP_GOAL_KEY      = 'ak_pp_goal_v1';

function _ppChallengeLoad() { try { var r = localStorage.getItem(PP_CHALLENGE_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppChallengeStore(d) { try { localStorage.setItem(PP_CHALLENGE_KEY, JSON.stringify(d)); } catch(e) {} }

function _ppHabitLoad() { try { var r = localStorage.getItem(PP_HABIT_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppHabitStore(d) { try { localStorage.setItem(PP_HABIT_KEY, JSON.stringify(d)); } catch(e) {} }

function _ppGoalLoad() { try { var r = localStorage.getItem(PP_GOAL_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppGoalStore(d) { try { localStorage.setItem(PP_GOAL_KEY, JSON.stringify(d)); } catch(e) {} }

window._ppChallengeLoad = _ppChallengeLoad;
window._ppHabitLoad = _ppHabitLoad;
window._ppGoalLoad = _ppGoalLoad;

window._ppGoalAc = function() {
  var goals = _ppGoalLoad();
  var baslik = prompt('Hedef başlığı (örn: Q2\'de 500K USD ciro):');
  if (!baslik || !baslik.trim()) return;
  var bitTarih = prompt('Bitiş tarihi (YYYY-MM-DD):') || '';
  var yeni = { id: _ppId(), baslik: baslik.trim(), bitTarih: bitTarih, pct: 0, createdAt: _ppNow() };
  goals.unshift(yeni); _ppGoalStore(goals);
  window.toast?.('Hedef eklendi', 'ok');
  window._ppModRender();
};

window._ppChallengeAc = function() {
  var baslik = prompt('Challenge başlığı:');
  if (!baslik || !baslik.trim()) return;
  var periyot = prompt('Periyot (aylik/uc_aylik/alti_aylik/yillik):') || 'aylik';
  var hedef = parseInt(prompt('Hedef sayı (örn: 5 müşteri için 5):') || '1');
  var puan = {aylik:500,uc_aylik:2000,alti_aylik:5000,yillik:20000}[periyot] || 500;
  var yeni = { id: _ppId(), baslik: baslik.trim(), periyot: periyot, hedef: hedef, tamamlanan: 0, puan: puan, createdAt: _ppNow() };
  var challenges = _ppChallengeLoad(); challenges.unshift(yeni); _ppChallengeStore(challenges);
  window.toast?.('Challenge eklendi — ' + puan + ' pt ödül', 'ok');
  window._ppModRender();
};

window._ppHabitEkle = function() {
  var baslik = prompt('Alışkanlık adı (örn: Sabah rutini):');
  if (!baslik || !baslik.trim()) return;
  var yeni = { id: _ppId(), baslik: baslik.trim(), streak: 0, sonTarih: '', createdAt: _ppNow() };
  var habits = _ppHabitLoad(); habits.push(yeni); _ppHabitStore(habits);
  window.toast?.('Alışkanlık eklendi', 'ok');
  window._ppModRender();
};

/* ── Notlar Sistemi ─────────────────────────────────────────── */
var PP_NOT_KEY = 'ak_pp_notlar_v1';
function _ppNotLoad() { try { var r = localStorage.getItem(PP_NOT_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppNotStore(d) { try { localStorage.setItem(PP_NOT_KEY, JSON.stringify(d)); } catch(e) {} }

window._ppNotEkle = function() {
  var ta = document.getElementById('pp-not-input');
  var cat = document.getElementById('pp-not-cat');
  if (!ta || !ta.value.trim()) return;
  var yeni = { id: _ppId(), icerik: ta.value.trim(), kategori: cat?.value || 'Kişisel', tarih: _ppNow(), createdAt: _ppNow() };
  var notlar = _ppNotLoad(); notlar.unshift(yeni); _ppNotStore(notlar);
  ta.value = '';
  window._ppNotRender();
  window.toast?.('Not kaydedildi', 'ok');
};

window._ppNotRender = function() {
  var list = document.getElementById('pp-not-list'); if (!list) return;
  var notlar = _ppNotLoad();
  var katRenk = { 'Satış':'background:#E6F1FB;color:#185FA5', 'Satınalma':'background:#E1F5EE;color:#0F6E56', 'Kişisel':'background:#EEEDFE;color:#3C3489', 'Aile':'background:#FCEBEB;color:#A32D2D', 'Fikir':'background:#FAEEDA;color:#854F0B' };
  list.innerHTML = notlar.length ? notlar.map(function(n) {
    return '<div style="border:0.5px solid var(--b);border-radius:6px;padding:9px;margin-bottom:7px;background:var(--s2);cursor:pointer" onmouseover="this.style.background=\'var(--sf)\'" onmouseout="this.style.background=\'var(--s2)\'">'
      + '<div style="font-size:8px;color:var(--t3);margin-bottom:4px">' + (n.tarih || '').slice(0, 16) + '</div>'
      + '<div style="font-size:11px;color:var(--t);line-height:1.5">' + _ppEsc(n.icerik) + '</div>'
      + '<span style="display:inline-block;font-size:8px;padding:1px 6px;border-radius:3px;margin-top:5px;' + (katRenk[n.kategori] || 'background:var(--s2);color:var(--t3)') + '">' + _ppEsc(n.kategori) + '</span>'
      + '</div>';
  }).join('') : '<div style="font-size:11px;color:var(--t3);text-align:center;padding:20px">Henüz not yok</div>';
};

window._ppNotPanelHTML = function() {
  var notlar = _ppNotLoad();
  var katRenk = { 'Satış':'background:#E6F1FB;color:#185FA5', 'Satınalma':'background:#E1F5EE;color:#0F6E56', 'Kişisel':'background:#EEEDFE;color:#3C3489', 'Aile':'background:#FCEBEB;color:#A32D2D', 'Fikir':'background:#FAEEDA;color:#854F0B' };
  var h = '<div style="width:220px;border-left:0.5px solid var(--b);display:flex;flex-direction:column;flex-shrink:0;height:100%">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0">';
  h += '<div style="font-size:11px;font-weight:500;color:var(--t)">Notlarım</div>';
  h += '</div>';
  h += '<div id="pp-not-list" style="flex:1;overflow-y:auto;padding:8px">';
  h += notlar.length ? notlar.map(function(n) {
    return '<div style="border:0.5px solid var(--b);border-radius:6px;padding:9px;margin-bottom:7px;background:var(--s2)">'
      + '<div style="font-size:8px;color:var(--t3);margin-bottom:4px">' + (n.tarih || '').slice(0, 16) + '</div>'
      + '<div style="font-size:11px;color:var(--t);line-height:1.5">' + _ppEsc(n.icerik) + '</div>'
      + '<span style="display:inline-block;font-size:8px;padding:1px 6px;border-radius:3px;margin-top:5px;' + (katRenk[n.kategori] || 'background:var(--s2);color:var(--t3)') + '">' + _ppEsc(n.kategori) + '</span>'
      + '</div>';
  }).join('') : '<div style="font-size:11px;color:var(--t3);text-align:center;padding:20px">Henüz not yok</div>';
  h += '</div>';
  h += '<div style="border-top:0.5px solid var(--b);padding:8px;flex-shrink:0">';
  h += '<textarea id="pp-not-input" placeholder="Not yaz..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:11px;padding:7px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:none;height:60px;font-family:inherit;box-sizing:border-box"></textarea>';
  h += '<div style="display:flex;gap:4px;margin-top:5px">';
  h += '<select id="pp-not-cat" onclick="event.stopPropagation()" style="flex:1;font-size:9px;padding:4px;border:0.5px solid var(--b);border-radius:4px;background:transparent;color:var(--t2);font-family:inherit">';
  h += '<option>Kişisel</option><option>Satış</option><option>Satınalma</option><option>Aile</option><option>Fikir</option>';
  h += '</select>';
  h += '<button onclick="event.stopPropagation();window._ppNotEkle()" style="font-size:9px;padding:4px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Kaydet</button>';
  h += '</div></div></div>';
  return h;
};

window._ppNotLoad = _ppNotLoad;
window._ppNotStore = _ppNotStore;

/* ── Dosya Eki Sistemi ──────────────────────────────────────── */
window._ppDosyaEkleri = [];

window._ppDosyaEkle = function(inp) {
  if(!inp.files||!inp.files.length) return;
  var dosyalar = Array.from(inp.files);
  var hatalar = [];
  dosyalar.forEach(function(f) {
    if(f.size > 5*1024*1024) { hatalar.push(f.name+' 5MB sınırını aşıyor'); return; }
    var izin = ['application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/jpg','image/png'];
    if(izin.indexOf(f.type)===-1 && !f.name.match(/\.(pdf|xls|xlsx|jpg|jpeg|png)$/i)) { hatalar.push(f.name+' desteklenmiyor'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      var ek = { id:_ppId(), ad:f.name, tip:f.type, boyut:f.size, data:e.target.result, tarih:_ppNow() };
      window._ppDosyaEkleri.push(ek);
      window._ppDosyaListGuncelle();
    };
    reader.readAsDataURL(f);
  });
  if(hatalar.length) window.toast?.(hatalar.join(', '),'warn');
  inp.value='';
};

window._ppDosyaListGuncelle = function() {
  var list = document.getElementById('ppf-dosya-list'); if(!list) return;
  list.innerHTML = window._ppDosyaEkleri.map(function(d,i) {
    var ikon = d.tip.indexOf('pdf')!==-1 ? '📄' : d.tip.indexOf('image')!==-1 ? '🖼' : '📊';
    var kb = Math.round(d.boyut/1024);
    return '<div style="display:flex;align-items:center;gap:5px;padding:4px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);font-size:10px">'
      +'<span style="font-size:12px">'+ikon+'</span>'
      +'<span style="color:var(--t);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_ppEsc(d.ad)+'</span>'
      +'<span style="color:var(--t3)">'+kb+'KB</span>'
      +'<button onclick="event.stopPropagation();window._ppDosyaSil('+i+')" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:12px;line-height:1;padding:0">×</button>'
      +'</div>';
  }).join('');
};

window._ppDosyaSil = function(i) {
  window._ppDosyaEkleri.splice(i,1);
  window._ppDosyaListGuncelle();
};

/* ── Kullanıcı Tag Sistemi ──────────────────────────────────── */
window._ppKullanicilar = function() {
  try {
    var users = [];
    if (typeof window.loadUsers === 'function') {
      var ham = window.loadUsers();
      if (Array.isArray(ham)) users = ham;
    }
    if (!users.length && typeof window.Auth !== 'undefined') {
      var cu = window.Auth?.getCU?.();
      if (cu && cu.uid) users = [cu];
    }
    return users.filter(function(u) { return u && !u.isDeleted && (u.displayName || u.email); });
  } catch(e) {
    console.warn('[PP-IZOLE] loadUsers hatası:', e.message);
    return [];
  }
};

window._ppUserTagHTML = function(containerId, placeholder) {
  return '<div id="'+containerId+'-wrap" style="display:flex;flex-wrap:wrap;gap:5px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);min-height:36px;cursor:text" onclick="event.stopPropagation();this.querySelector(\'input\')?.focus()">'
    + '<input id="'+containerId+'-input" placeholder="'+placeholder+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._ppUserAra(this,\''+containerId+'\')" style="border:none;background:transparent;font-size:11px;outline:none;color:var(--t);min-width:100px;font-family:inherit">'
    + '</div>'
    + '<div id="'+containerId+'-dd" style="display:none;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);margin-top:2px;overflow:hidden;max-height:160px;overflow-y:auto"></div>';
};

window._ppUserAra = function(inp, containerId) {
  var q = inp.value.toLowerCase().trim();
  var dd = document.getElementById(containerId+'-dd');
  if (!dd) return;
  if (!q) { dd.style.display='none'; return; }
  var users = window._ppKullanicilar();
  var eslesme = users.filter(function(u){ return (u.displayName||'').toLowerCase().indexOf(q)!==-1 || (u.email||'').toLowerCase().indexOf(q)!==-1; }).slice(0,6);
  if (!eslesme.length) { dd.style.display='none'; return; }
  dd.innerHTML = eslesme.map(function(u){
    var ini = (u.displayName||'?').slice(0,2).toUpperCase();
    var ad = _ppEsc(u.displayName||u.email||'');
    var uid = _ppEsc(u.uid||u.id||'');
    var rol = _ppEsc(u.role||u.departman||'');
    return '<div onclick="event.stopPropagation();window._ppUserSec(\''+containerId+'\',\''+ad+'\',\''+uid+'\',\''+rol+'\')" style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;font-size:12px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<div style="width:22px;height:22px;border-radius:50%;background:#185FA5;color:#fff;font-size:8px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+ini+'</div>'
      + '<span style="flex:1">'+ad+'</span>'
      + '<span style="font-size:10px;color:var(--t3)">'+rol+'</span>'
      + '</div>';
  }).join('');
  dd.style.display='block';
};

window._ppUserSec = function(containerId, ad, uid, rol) {
  var wrap = document.getElementById(containerId+'-wrap');
  var inp = document.getElementById(containerId+'-input');
  var dd = document.getElementById(containerId+'-dd');
  if (!wrap || !inp) return;
  var tag = document.createElement('div');
  tag.dataset.uid = uid;
  tag.dataset.ad = ad;
  tag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;background:var(--s2);color:var(--t);border:0.5px solid var(--b)';
  tag.innerHTML = ad + '<button onclick="event.stopPropagation();this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:12px;line-height:1;padding:0;margin-left:2px">×</button>';
  wrap.insertBefore(tag, inp);
  inp.value='';
  if (dd) dd.style.display='none';
};

window._ppUserTaglerAl = function(containerId) {
  var wrap = document.getElementById(containerId+'-wrap');
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll('[data-uid]')).map(function(el){ return { uid:el.dataset.uid, ad:el.dataset.ad }; });
};

/* ── PP-012: Görev Sil / Düzenle ────────────────────────────── */
window._ppGorevSil = function(id) {
  window.confirmModal?.('G\u00f6revi sil?', {
    title: 'G\u00f6rev silinecek',
    danger: true,
    confirmText: 'Sil',
    onConfirm: function() { window._ppGorevSilYap(id); }
  });
};

window._ppGorevSilYap = function(id) {
  var tasks = _ppLoad();
  var i = tasks.findIndex(function(t) { return String(t.id) === String(id); });
  if (i === -1) return;
  var gorev = tasks[i];
  var now = _ppNow();
  gorev.isDeleted = true;
  gorev.deletedAt = now;
  gorev.deletedBy = window.CU?.()?.displayName || '';
  _ppStore(tasks);
  window.logActivity?.('delete', 'Pusula g\u00f6rev silindi: ' + (gorev.baslik || gorev.title || gorev.id));
  try {
    var trashRaw = localStorage.getItem('ak_trash1') || '[]';
    var trash = JSON.parse(trashRaw);
    if (!Array.isArray(trash)) trash = [];
    trash.push(Object.assign({}, gorev, { _trashKaynak: 'pusula', _trashTarih: now }));
    localStorage.setItem('ak_trash1', JSON.stringify(trash));
  } catch(e) {}
  window.toast?.('G\u00f6rev silindi', 'ok');
  window._ppModRender();
};

window._ppGorevDuzenle = function(id) {
  var tasks = _ppLoad();
  var t = tasks.find(function(x) { return String(x.id) === String(id); });
  if (!t) return;
  window._ppDuzenleHedef = id;
  window._ppYeniGorev();
  setTimeout(function() {
    var b = document.getElementById('ppf-baslik'); if (b) b.value = t.baslik || t.title || '';
    var d = document.getElementById('ppf-departman'); if (d) d.value = t.departman || '';
    var o = document.getElementById('ppf-oncelik'); if (o) o.value = t.oncelik || 'normal';
    var s = document.getElementById('ppf-durum'); if (s) s.value = t.durum || 'plan';
    var bt = document.getElementById('ppf-basT'); if (bt) bt.value = t.basT || '';
    var bit = document.getElementById('ppf-bitT'); if (bit) bit.value = t.bitTarih || '';
    var sure = document.getElementById('ppf-sure'); if (sure) sure.value = t.sure || '';
    var acik = document.getElementById('ppf-aciklama'); if (acik) acik.innerHTML = t.aciklama || '';
    var kaydet = document.querySelector('#pp-gorev-modal button[onclick*="_ppGorevKaydet"]');
    if (kaydet) kaydet.textContent = 'Güncelle';
  }, 150);
};

/* ── Şirket Takvimi ─────────────────────────────────────────── */
var PP_TAKVIM_KEY = 'ak_pp_takvim_v1';
function _ppTakvimLoad(){ try{ var r=localStorage.getItem(PP_TAKVIM_KEY); return r?JSON.parse(r):[]; }catch(e){ return []; } }
function _ppTakvimStore(d){ try{ localStorage.setItem(PP_TAKVIM_KEY,JSON.stringify(d)); }catch(e){} }

window._ppTakvimSonrakiHesapla = function(olay) {
  var bugun = new Date();
  var pd = (olay.periyotDetay||'').toLowerCase();
  var periyot = (olay.periyot||'').toLowerCase();
  try {
    if (periyot==='günlük'||periyot==='gunluk') {
      var d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); return d.toISOString().slice(0,10);
    }
    if (periyot==='haftalık'||periyot==='haftalik') {
      var gunler = {pazartesi:1,salı:2,sali:2,çarşamba:3,carsamba:3,perşembe:4,persembe:4,cuma:5,cumartesi:6,pazar:0};
      for (var g in gunler) { if (pd.indexOf(g)!==-1) { var hedef=gunler[g]; var d2=new Date(); var cur=d2.getDay(); var delta=(hedef-cur+7)%7||7; d2.setDate(d2.getDate()+delta); d2.setHours(9,0,0,0); return d2.toISOString().slice(0,10); } }
    }
    if (periyot==='aylık'||periyot==='aylik') {
      var m = pd.match(/(\d+)\.\s*g[üu]n/i); if(m){ var gun=parseInt(m[1]); var d3=new Date(); d3.setDate(gun); if(d3<=bugun) d3.setMonth(d3.getMonth()+1); d3.setHours(9,0,0,0); return d3.toISOString().slice(0,10); }
      var dowMap = {pazartesi:1,salı:2,sali:2,çarşamba:3,carsamba:3,perşembe:4,persembe:4,cuma:5,cumartesi:6,pazar:0};
      var mNDow = pd.match(/(\d+)\.\s*([a-zçğışöü]+)/i);
      if (mNDow) {
        var nth = parseInt(mNDow[1]);
        var dowAd = mNDow[2].toLowerCase().replace('ş','s').replace('ğ','g').replace('ü','u').replace('ö','o').replace('ı','i').replace('ç','c');
        var dow = dowMap[dowAd] !== undefined ? dowMap[dowAd] : -1;
        if (dow >= 0) {
          var now2 = new Date();
          for (var ay2=0; ay2<3; ay2++) {
            var y2=now2.getFullYear(), m3=now2.getMonth()+ay2;
            if (m3>11){ m3-=12; y2++; }
            var first=new Date(y2,m3,1); var firstDow=first.getDay();
            var delta2=(dow-firstDow+7)%7; var day2=1+delta2+(nth-1)*7;
            var cand2=new Date(y2,m3,day2); cand2.setHours(9,0,0,0);
            if (cand2.getMonth()===m3 && cand2>new Date()) { return cand2.toISOString().slice(0,10); }
          }
        }
      }
      var mHafta = pd.match(/(\d+)\.\s*hafta/i);
      if (mHafta) {
        var nthH = parseInt(mHafta[1]);
        var now3 = new Date();
        for (var ay3=0; ay3<3; ay3++) {
          var y3=now3.getFullYear(), m4=now3.getMonth()+ay3;
          if (m4>11){ m4-=12; y3++; }
          var d6=new Date(y3,m4,1+(nthH-1)*7); d6.setHours(9,0,0,0);
          if (d6.getMonth()===m4 && d6>new Date()) { return d6.toISOString().slice(0,10); }
        }
      }
      var m2 = pd.match(/ayın son/i); if(m2){ var d4=new Date(); d4.setMonth(d4.getMonth()+1,0); d4.setHours(17,0,0,0); return d4.toISOString().slice(0,10); }
    }
    if (periyot==='yıllık'||periyot==='yillik') {
      var d5=new Date(); d5.setFullYear(d5.getFullYear()+1); d5.setMonth(0,15); d5.setHours(9,0,0,0); return d5.toISOString().slice(0,10);
    }
  } catch(e) {}
  return null;
};

window._ppTakvimHatirlatmaKontrol = function() {
  var olaylar = _ppTakvimLoad().filter(function(o){ return o.durum==='active' && !o.isDeleted; });
  var bugun = _ppToday();
  var uyarilar = [];
  olaylar.forEach(function(o) {
    var sonraki = o.sonrakiCalisma || window._ppTakvimSonrakiHesapla(o);
    if (!sonraki) return;
    var kalan = Math.ceil((new Date(sonraki) - new Date(bugun)) / 86400000);
    var hatirlatma = parseInt(o.hatirlatmaGun||3);
    if (kalan >= 0 && kalan <= hatirlatma) {
      uyarilar.push({ olay:o, sonraki:sonraki, kalan:kalan });
    }
  });
  return uyarilar;
};

window._ppTakvimMigration = function() {
  if (localStorage.getItem('ak_pp_takvim_migration_v1')) return;
  var calEvents = typeof window.loadCal === 'function' ? window.loadCal() : [];
  if (!calEvents || !calEvents.length) return;
  var ppMevcut = _ppTakvimLoad();
  var mevcutIdler = ppMevcut.map(function(o){ return o.id; });
  var tipKategori = { meeting:'TOPLANTI', deadline:'SON TARİH', holiday:'TATİL', task:'GÖREV', personal:'KİŞİSEL' };
  var eklenen = 0;
  calEvents.forEach(function(e) {
    var yeniId = 'CAL-' + e.id;
    if (mevcutIdler.indexOf(yeniId) !== -1) return;
    ppMevcut.push({
      id: yeniId,
      baslik: e.title || e.desc || '—',
      kategori: tipKategori[e.type] || 'DİĞER',
      periyot: 'Tek Seferlik',
      periyotDetay: (e.date || '') + (e.time ? ' ' + e.time : ''),
      sorumluUnvan: '',
      oncelik: e.type === 'deadline' ? 'Yüksek' : 'Normal',
      hatirlatmaGun: 1,
      durum: 'active',
      createdAt: e.updatedAt || _ppNow(),
      sonrakiCalisma: e.date || null,
      aciklama: e.desc || '',
      isDeleted: false,
      kaynak: 'eski-takvim'
    });
    eklenen++;
  });
  if (eklenen > 0) {
    _ppTakvimStore(ppMevcut);
    localStorage.setItem('ak_pp_takvim_migration_v1', '1');
    console.log('[PP-TAKVIM] Migration: ' + eklenen + ' etkinlik aktarıldı');
    window.toast && window.toast('Eski takvimden ' + eklenen + ' etkinlik aktarıldı', 'ok');
  }
};

window._ppTakvimBaslat = function() {
  var mevcut = _ppTakvimLoad();
  var guncellendi = false;
  mevcut.forEach(function(o) {
    if (!o.sonrakiCalisma) {
      o.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(o) || null;
      if (o.sonrakiCalisma) guncellendi = true;
    }
  });
  if (guncellendi) { _ppTakvimStore(mevcut); console.log('[PP-TAKVIM] sonrakiCalisma güncellendi'); }
  if (mevcut.length > 0) return;
  var baslangic = [
    { id:'TAK-001', baslik:'Aylık Ödeme Raporu', kategori:'MUHASEBE', periyot:'Aylık', periyotDetay:'Her ayın 1. Pazartesi 10:00', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'TAK-002', baslik:'SGK Bildirimi', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın 23. günü', sorumluUnvan:'İnsan Kaynakları', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-003', baslik:'Muhtasar Beyanname', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın 26. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-004', baslik:'KDV Beyannamesi', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın 28. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-005', baslik:'Maaş Ödemeleri', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın son iş günü', sorumluUnvan:'İK / Muhasebe', oncelik:'Kritik', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'TAK-006', baslik:'Haftalık Operasyon Toplantısı', kategori:'YÖNETİM', periyot:'Haftalık', periyotDetay:'Her Pazartesi 10:00', sorumluUnvan:'Operasyon Müdürü', oncelik:'Normal', hatirlatmaGun:1, durum:'active', createdAt:_ppNow() },
    { id:'TAK-007', baslik:'Sigorta Poliçe Kontrolü', kategori:'SİGORTA', periyot:'Aylık', periyotDetay:'Her ayın 1. haftası', sorumluUnvan:'Operasyon Yöneticisi', oncelik:'Normal', hatirlatmaGun:7, durum:'active', createdAt:_ppNow() },
    { id:'TAK-008', baslik:'Yıllık Bağımsız Denetim', kategori:'HUKUKİ', periyot:'Yıllık', periyotDetay:'Her yılın Ocak ayı', sorumluUnvan:'Genel Müdür', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-009', baslik:'Geçici Vergi Beyannamesi Q1', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Mayıs ayı 17. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:10, durum:'active', createdAt:_ppNow() },
    { id:'TAK-010', baslik:'Geçici Vergi Beyannamesi Q2', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Ağustos ayı 17. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:10, durum:'active', createdAt:_ppNow() },
    { id:'TAK-011', baslik:'Geçici Vergi Beyannamesi Q3', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Kasım ayı 17. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:10, durum:'active', createdAt:_ppNow() },
    { id:'TAK-012', baslik:'Yıllık Gelir Vergisi Beyannamesi', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Mart ayı 31. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-013', baslik:'Yıllık Kurumlar Vergisi Beyannamesi', kategori:'VERGİ', periyot:'Yıllık', periyotDetay:'Her yılın Nisan ayı 30. günü', sorumluUnvan:'Mali Müşavir', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-014', baslik:'Ba-Bs Formu (Alış/Satış Bildirimi)', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın son günü', sorumluUnvan:'Muhasebe', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-015', baslik:'Damga Vergisi Beyannamesi', kategori:'VERGİ', periyot:'Aylık', periyotDetay:'Her ayın 26. günü', sorumluUnvan:'Muhasebe', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'TAK-016', baslik:'SGK Prim Ödemesi', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın son günü', sorumluUnvan:'İnsan Kaynakları', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-017', baslik:'İşsizlik Sigortası Bildirimi', kategori:'İK', periyot:'Aylık', periyotDetay:'Her ayın 23. günü', sorumluUnvan:'İnsan Kaynakları', oncelik:'Yüksek', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'TAK-018', baslik:'Muavin Defter Kontrol Q1', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Nisan ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-019', baslik:'Muavin Defter Kontrol Q2', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Temmuz ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-020', baslik:'Muavin Defter Kontrol Q3', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Ekim ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-021', baslik:'Muavin Defter Kontrol Q4', kategori:'MUHASEBE', periyot:'Her 3 Ayda 1', periyotDetay:'Her yılın Ocak ayı', sorumluUnvan:'Muhasebe Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-022', baslik:'İhracat Teşvik Başvurusu', kategori:'Operasyon', periyot:'Her 3 Ayda 1', periyotDetay:'Çeyrek sonu son iş günü', sorumluUnvan:'Operasyon Yöneticisi', oncelik:'Yüksek', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'TAK-023', baslik:'Ticaret Sicil Yıllık Tescil', kategori:'HUKUKİ', periyot:'Yıllık', periyotDetay:'Her yılın Ocak ayı', sorumluUnvan:'Genel Müdür', oncelik:'Kritik', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() },
    { id:'TAK-024', baslik:'İş Sağlığı ve Güvenliği Eğitimi', kategori:'İK', periyot:'Yıllık', periyotDetay:'Her yılın Haziran ayı', sorumluUnvan:'İnsan Kaynakları', oncelik:'Normal', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() }
  ];
  baslangic.forEach(function(o){ o.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(o)||null; });
  _ppTakvimStore(baslangic);
  console.log('[PP-TAKVIM] '+baslangic.length+' başlangıç kaydı yüklendi');
};

window._ppTakvimLoad = _ppTakvimLoad;
window._ppTakvimStore = _ppTakvimStore;
window.PusulaProTakvimLoaded = true;
setTimeout(function(){
  window._ppTakvimMigration?.();
  window._ppTakvimBaslat?.();
}, 800);

/* ── PP-013B: Takvim Panel UI ───────────────────────────────── */
window._ppTakvimPanelRender = function(body) {
  if (!body) return;
  var olaylar = _ppTakvimLoad().filter(function(o) { return !o.isDeleted; });
  var bugun = _ppToday();
  var katRenk = { MUHASEBE:'#185FA5', 'İK':'#1D9E75', 'VERGİ':'#A32D2D', 'SİGORTA':'#854F0B', 'YÖNETİM':'#534AB7', 'HUKUKİ':'#888780', 'LOJİSTİK':'#0F6E56', 'OPERASYON':'#854F0B', 'TOPLANTI':'#534AB7', 'SON TARİH':'#A32D2D', 'TATİL':'#1D9E75', 'GÖREV':'#185FA5', 'KİŞİSEL':'#888780', 'DİĞER':'#888780' };
  var katBg = { MUHASEBE:'#E6F1FB', 'İK':'#E1F5EE', 'VERGİ':'#FCEBEB', 'SİGORTA':'#FAEEDA', 'YÖNETİM':'#EEEDFE', 'HUKUKİ':'#F1EFE8', 'LOJİSTİK':'#E1F5EE', 'OPERASYON':'#FAEEDA', 'TOPLANTI':'#EEEDFE', 'SON TARİH':'#FCEBEB', 'TATİL':'#E1F5EE', 'GÖREV':'#E6F1FB', 'KİŞİSEL':'#F1EFE8', 'DİĞER':'#F1EFE8' };
  var filtre = '';
  try { var fEl = document.getElementById('pp-tak-filtre'); if (fEl) filtre = fEl.value; } catch(e) {}
  var liste = filtre ? olaylar.filter(function(o) { return o.kategori === filtre; }) : olaylar;
  var h = '<div style="display:flex;height:100%;flex-direction:column;flex:1">';
  var sekme = window._ppTakSekme || 'etkinlik';
  h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:0.5px solid var(--b);flex-shrink:0">';
  h += '<div style="display:flex;gap:3px;margin-right:8px">';
  h += '<button onclick="event.stopPropagation();window._ppTakSekme=\'etkinlik\';window._ppTakvimPanelRender(document.getElementById(\'pp-body\'))" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:'+(sekme==='etkinlik'?'var(--t)':'transparent')+';color:'+(sekme==='etkinlik'?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">Etkinlikler</button>';
  h += '<button onclick="event.stopPropagation();window._ppTakSekme=\'odeme\';window._ppTakvimPanelRender(document.getElementById(\'pp-body\'))" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:'+(sekme==='odeme'?'var(--t)':'transparent')+';color:'+(sekme==='odeme'?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">Ödemeler</button>';
  h += '<button onclick="event.stopPropagation();window._ppTakSekme=\'abonelik\';window._ppTakvimPanelRender(document.getElementById(\'pp-body\'))" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:'+(sekme==='abonelik'?'var(--t)':'transparent')+';color:'+(sekme==='abonelik'?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">Abonelikler</button>';
  h += '<button onclick="event.stopPropagation();window._ppTakSekme=\'klasik\';window._ppTakvimPanelRender(document.getElementById(\'pp-body\'))" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:'+(sekme==='klasik'?'var(--t)':'transparent')+';color:'+(sekme==='klasik'?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">Takvim Görünümü</button>';
  h += '</div>';
  h += '<button onclick="event.stopPropagation();window._ppTakvimYeniAc()" style="font-size:10px;padding:4px 10px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">+ Etkinlik</button>';
  h += '<label style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2);background:var(--s2);font-family:inherit">CSV Import<input type="file" accept=".csv,.txt" style="display:none" onchange="event.stopPropagation();var r=new FileReader();r.onload=function(e){window._ppTakvimCSVImport(e.target.result);};r.readAsText(this.files[0])"></label>';
  h += '<label style="font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2);background:transparent;font-family:inherit">JSON Import<input type="file" accept=".json" style="display:none" onchange="event.stopPropagation();window._ppTakvimJSONImport(this)"></label>';
  h += '<select id="pp-tak-filtre" onchange="event.stopPropagation();window._ppTakvimPanelRender(document.getElementById(\'pp-body\'))" onclick="event.stopPropagation()" style="font-size:11px;padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;color:var(--t);font-family:inherit">';
  h += '<option value="">Tüm Kategoriler</option>';
  ['MUHASEBE','İK','VERGİ','SİGORTA','YÖNETİM','HUKUKİ','LOJİSTİK','OPERASYON','TOPLANTI','SON TARİH','TATİL','GÖREV','KİŞİSEL','DİĞER'].forEach(function(k) { h += '<option value="' + k + '"' + (filtre === k ? ' selected' : '') + '>' + k + '</option>'; });
  h += '</select>';
  h += '<span style="font-size:11px;color:var(--t3);margin-left:auto">' + liste.length + ' etkinlik</span>';
  h += '</div>';
  if (sekme === 'klasik') {
    body.innerHTML = h + '<div id="pp-klasik-takvim-wrap" style="flex:1;overflow-y:auto"></div></div>';
    setTimeout(function() {
      var wrap = document.getElementById('pp-klasik-takvim-wrap');
      if (!wrap) return;
      if (typeof window.renderCal === 'function') {
        var panelTakvim = document.getElementById('panel-takvim');
        if (panelTakvim && panelTakvim.innerHTML) {
          wrap.innerHTML = panelTakvim.innerHTML;
        } else {
          wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font-size:12px">Takvim yükleniyor...</div>';
          setTimeout(function(){ window.renderCal(); }, 200);
        }
      } else {
        wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font-size:12px">Takvim modülü bulunamadı.</div>';
      }
    }, 50);
    return;
  }
  if (sekme === 'odeme') { window._ppOdemePanelRender(body, h); return; }
  if (sekme === 'abonelik') { window._ppAbonelikPanelRender(body, h); return; }
  h += '<div style="flex:1;overflow-y:auto">';
  if (!liste.length) {
    h += '<div style="padding:40px;text-align:center;color:var(--t3);font-size:12px">Etkinlik yok</div>';
  }
  liste.forEach(function(o) {
    var sonraki = o.sonrakiCalisma || (window._ppTakvimSonrakiHesapla ? window._ppTakvimSonrakiHesapla(o) : '—') || '—';
    var kalan = (sonraki && sonraki !== '—') ? Math.ceil((new Date(sonraki) - new Date(bugun)) / 86400000) : null;
    var kalanRenk = kalan === 0 ? '#A32D2D' : (kalan !== null && kalan <= 3 ? '#854F0B' : '#185FA5');
    var kalanBg = kalan === 0 ? '#FCEBEB' : (kalan !== null && kalan <= 3 ? '#FAEEDA' : '#E6F1FB');
    var kr = katRenk[o.kategori] || '#888780';
    var kb = katBg[o.kategori] || 'var(--s2)';
    h += '<div style="display:grid;grid-template-columns:100px 1fr 100px 90px 80px 70px;align-items:center;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--b);font-size:11px" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
    h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:' + kb + ';color:' + kr + ';font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center">' + _ppEsc(o.kategori || '') + '</span>';
    h += '<div><div style="font-size:11px;font-weight:500;color:var(--t)">' + _ppEsc(o.baslik || '') + '</div><div style="font-size:9px;color:var(--t3);margin-top:1px">' + _ppEsc(o.periyot || '') + (o.periyotDetay ? ' · ' + _ppEsc(o.periyotDetay) : '') + '</div>'
      + '<div style="display:flex;align-items:center;gap:4px;margin-top:2px;flex-wrap:wrap">'
      + (o.altKategori ? '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#E6F1FB;color:#185FA5">' + _ppEsc(o.altKategori) + '</span>' : '')
      + (o.kaynak ? '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#F1EFE8;color:#5F5E5A">' + _ppEsc(o.kaynak) + '</span>' : '')
      + '</div>'
      + '</div>';
    h += '<div style="overflow:hidden"><div style="font-size:9px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _ppEsc(o.sorumluUnvan || '') + '</div>'
      + (o.atananGorevli ? '<div style="font-size:8px;color:var(--t3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _ppEsc(o.atananGorevli) + '</div>' : '')
      + '</div>';
    h += '<div style="font-size:9px;color:var(--t3)">' + _ppEsc(sonraki) + '</div>';
    h += kalan !== null
      ? '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:' + kalanBg + ';color:' + kalanRenk + ';font-weight:500;text-align:center">' + (kalan === 0 ? 'Bugün' : (kalan < 0 ? 'Geçti' : kalan + ' gün')) + '</span>'
      : '<span></span>';
    h += '<div style="display:flex;gap:3px;justify-content:flex-end" onclick="event.stopPropagation()">';
    h += '<button onclick="event.stopPropagation();window._ppTakvimTamamla(\'' + o.id + '\')" title="Tamamlandı" style="font-size:9px;padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:#1D9E75">✓</button>';
    if (o.ilgiliDokuman) h += '<button onclick="event.stopPropagation();window.open(\'' + _ppEsc(o.ilgiliDokuman) + '\')" title="Belge" style="width:22px;height:22px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;display:inline-flex;align-items:center;justify-content:center;padding:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></button>';
    h += '<button onclick="event.stopPropagation();window._ppTakvimSil(\'' + o.id + '\')" title="Sil" style="font-size:9px;padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D">×</button>';
    h += '</div></div>';
  });
  h += '</div></div>';
  body.innerHTML = h;
};

window._ppTakvimTamamla = function(id) {
  var olaylar = _ppTakvimLoad();
  var o = olaylar.find(function(x) { return String(x.id) === String(id); });
  if (!o) return;
  o.sonTamamlandiAt = _ppNow();
  o.sonrakiCalisma = (window._ppTakvimSonrakiHesapla ? window._ppTakvimSonrakiHesapla(o) : null) || null;
  _ppTakvimStore(olaylar);
  window.toast?.('Tamamlandı — Sonraki: ' + (o.sonrakiCalisma || '—'), 'ok');
  window._ppModRender();
};

window._ppTakvimSil = function(id) {
  window.confirmModal('Bu etkinli\u011fi silmek istedi\u011finizden emin misiniz?',{confirmText:'Sil',danger:true,onConfirm:function(){
  var olaylar = _ppTakvimLoad();
  var i = olaylar.findIndex(function(x) { return String(x.id) === String(id); });
  if (i === -1) return;
  olaylar[i].isDeleted = true;
  olaylar[i].deletedAt = _ppNow();
  _ppTakvimStore(olaylar);
  window.toast?.('Etkinlik silindi', 'ok');
  window._ppModRender();
  }});
};

window._ppTakvimYeniAc = function() {
  var mevcut = document.getElementById('pptak-form-modal'); if (mevcut) { mevcut.remove(); return; }
  var modal = document.createElement('div');
  modal.id = 'pptak-form-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var _f = function(id, lbl, ph, tip) { return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div><input id="pptak-' + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'; };
  var _s = function(id, lbl, opts) { return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div><select id="pptak-' + id + '" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">' + opts + '</select></div>'; };
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:600px;max-height:90vh;overflow-y:auto">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)"><div style="font-size:14px;font-weight:500;color:var(--t)">Yeni Takvim Etkinliği</div><button onclick="event.stopPropagation();document.getElementById(\'pptak-form-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button></div>';
  ic += '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">';
  ic += _f('baslik', 'ETKİNLİK ADI *', 'Etkinlik başlığı');
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _s('kategori', 'KATEGORİ', '<option value="">Seç</option><option>İK</option><option>Muhasebe</option><option>Operasyon</option><option>Satış</option><option>Satınalma</option><option>Lojistik</option><option>Yönetim</option><option>Diğer</option>');
  ic += _f('altKategori', 'ALT KATEGORİ', 'Alt kategori');
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _s('periyot', 'PERİYOT', '<option value="Tek Sefer">Tek Sefer</option><option value="Günlük">Günlük</option><option value="Haftalık">Haftalık</option><option value="Aylık">Aylık</option><option value="Yıllık">Yıllık</option><option value="Her 3 Ayda 1">Her 3 Ayda 1</option><option value="Her 6 Ayda 1">Her 6 Ayda 1</option>');
  ic += _f('periyotDetay', 'PERİYOT DETAYI', 'Her ayın 1. Pazartesi');
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _f('basTarih', 'BAŞLANGIÇ TARİHİ', '', 'date');
  ic += _f('sorumlu', 'SORUMLU KİŞİ / EKİP', 'Ad veya departman');
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _f('atananGorevli', 'ATANAN GÖREVLİ', 'Atanan kişi');
  ic += _f('kaynak', 'KAYNAK', 'Yasal zorunluluk, iç prosedür vb.');
  ic += '</div>';
  ic += _f('ilgiliDokuman', 'İLGİLİ DÖKÜMAN (URL)', 'https://...');
  ic += _f('detay', 'ETKİNLİK DETAYI', 'Açıklama');
  ic += '</div>';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">';
  ic += '<div style="font-size:9px;color:var(--t3)">* Etkinlik adı zorunlu</div>';
  ic += '<div style="display:flex;gap:8px"><button onclick="event.stopPropagation();document.getElementById(\'pptak-form-modal\')?.remove()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  ic += '<button onclick="event.stopPropagation();window._ppTakvimFormKaydet()" style="font-size:12px;padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button></div>';
  ic += '</div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
  setTimeout(function() { document.getElementById('pptak-baslik')?.focus(); }, 100);
};

window._ppTakvimFormKaydet = function() {
  var _v = function(id) { return document.getElementById('pptak-' + id)?.value?.trim() || ''; };
  var baslik = _v('baslik');
  if (!baslik) { window.toast?.('Etkinlik adı zorunlu', 'warn'); return; }
  var yeni = {
    id: window._ppId?.() || ('TAK-' + Date.now()),
    name: baslik, baslik: baslik,
    category: _v('kategori'), kategori: _v('kategori'),
    altKategori: _v('altKategori'),
    period: _v('periyot'), periyot: _v('periyot'),
    periodDetail: _v('periyotDetay'), periyotDetay: _v('periyotDetay'),
    startDate: _v('basTarih'),
    resp: _v('sorumlu'), sorumlu: _v('sorumlu'), sorumluUnvan: _v('sorumlu'),
    atananGorevli: _v('atananGorevli'),
    kaynak: _v('kaynak'),
    ilgiliDokuman: _v('ilgiliDokuman'),
    detail: _v('detay'), detay: _v('detay'),
    takvimeEkle: 'Evet',
    oncelik: 'Normal',
    hatirlatmaGun: 3,
    durum: 'active',
    createdAt: _ppNow(),
    updatedAt: _ppNow()
  };
  yeni.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(yeni) || null;
  var liste = window._ppTakvimLoad?.() || [];
  liste.unshift(yeni);
  window._ppTakvimStore?.(liste);
  document.getElementById('pptak-form-modal')?.remove();
  window.toast?.('Etkinlik kaydedildi', 'ok');
  window._ppModRender?.();
};

/* ── PP-DEG-001: Haftalık Değerlendirme ─────────────────────── */
var PP_REV_KEY = 'ak_pp_review_v1';

window._ppHaftaNo = function() {
  var d = new Date();
  var j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var thu = new Date(j); thu.setUTCDate(j.getUTCDate() + (4 - (j.getUTCDay() || 7)));
  var yStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
  return d.getFullYear() + '-W' + Math.ceil((((thu - yStart) / 86400000) + 1) / 7);
};

window._ppRevKaydet = function() {
  var yapti = document.getElementById('pp-rev-yapti')?.innerHTML || '';
  var ogrendi = document.getElementById('pp-rev-ogrendi')?.innerHTML || '';
  var hedef = document.getElementById('pp-rev-hedef')?.innerHTML || '';
  if (!yapti.trim() && !ogrendi.trim() && !hedef.trim()) { window.toast?.('Bir şeyler yaz önce', 'warn'); return; }
  var hafta = window._ppHaftaNo();
  var liste = [];
  try { liste = JSON.parse(localStorage.getItem(PP_REV_KEY) || '[]'); } catch(e) {}
  var idx = liste.findIndex(function(r) { return r.hafta === hafta; });
  var kayit = { id: _ppId(), tarih: _ppToday(), hafta: hafta, yapti: yapti, ogrendi: ogrendi, hedef: hedef, updatedAt: _ppNow() };
  if (idx !== -1) {
    kayit.id = liste[idx].id;
    kayit.createdAt = liste[idx].createdAt || _ppNow();
    liste[idx] = kayit;
  } else {
    kayit.createdAt = _ppNow();
    liste.unshift(kayit);
    if (liste.length > 52) liste = liste.slice(0, 52);
  }
  try { localStorage.setItem(PP_REV_KEY, JSON.stringify(liste)); } catch(e) {}
  window.toast?.('Değerlendirme kaydedildi ✓', 'ok');
};

window._ppRevYukle = function() {
  try {
    var liste = JSON.parse(localStorage.getItem(PP_REV_KEY) || '[]');
    var bugunHafta = window._ppHaftaNo();
    var bugun = liste.find(function(r) { return r.hafta === bugunHafta; });
    if (bugun) {
      var y = document.getElementById('pp-rev-yapti'); if (y) y.innerHTML = bugun.yapti || '';
      var o = document.getElementById('pp-rev-ogrendi'); if (o) o.innerHTML = bugun.ogrendi || '';
      var h = document.getElementById('pp-rev-hedef'); if (h) h.innerHTML = bugun.hedef || '';
    }
  } catch(e) {}
};

/* ── PP-ALT-GOREV-001: Alt Görev Detay Toggle ──────────────── */
window._ppAltGorevToggle = function(i) {
  var detail = document.getElementById('pp-ag-detail-' + i);
  var expand = document.getElementById('pp-ag-expand-' + i);
  if (!detail) return;
  var acik = detail.style.display !== 'none';
  detail.style.display = acik ? 'none' : 'block';
  if (expand) expand.textContent = acik ? '+' : '−';
};

window._ppAltGorevDetayKaydet = function(i) {
  var ag = window._ppAltGorevler[i]; if (!ag) return;
  var sor = document.getElementById('pp-ag-sor-' + i);
  var bit = document.getElementById('pp-ag-bit-' + i);
  var sure = document.getElementById('pp-ag-sure-' + i);
  if (sor) ag.sorumlu = sor.value;
  if (bit) ag.bitTarih = bit.value;
  if (sure) ag.sure = sure.value;
  window._ppAltGorevToggle(i);
  window.toast?.('Alt görev güncellendi', 'ok');
};

/* ── Eski Pusula ile çakışma engeli ────────────────────────── */
if (typeof window.Pusula !== 'undefined' && !window.Pusula._isPro) {
  console.log('[PP-IZOLE] Eski Pusula mevcut — Pusula Pro ayrı namespace kullanıyor');
}
window.PusulaPro = {
  render: window._ppRender,
  setMod: window._ppSetMod,
  version: '1.0',
  _isPro: true
};

/* ── Hayat Kartları ─────────────────────────────────────────── */
var PP_HAYAT_KEY = 'ak_pp_hayat_v1';
function _ppHayatLoad() { try { var r = localStorage.getItem(PP_HAYAT_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppHayatStore(d) { try { localStorage.setItem(PP_HAYAT_KEY, JSON.stringify(d)); } catch(e) {} }

var _ppHayatHavuz = [
  { tip:'aile', icerik:'3 kızınla bu hafta sonu masa oyunu oynayabilirsin. Catan veya Codenames 8 yaş üstü için ideal.' },
  { tip:'aile', icerik:'İstanbul Oyuncak Müzesi — Göztepe. Kızların için harika bir hafta sonu aktivitesi.' },
  { tip:'aile', icerik:'Eşinle baş başa bir akşam planladın mı? Bu hafta bir gece ayrı zaman önemli.' },
  { tip:'aile', icerik:'Kızlarına bu hafta ne öğrettiklerini sor. Dinlemek yeterliyken değer katmak daha güzel.' },
  { tip:'aile', icerik:'Piknik planla — Belgrad Ormanı veya Polonezköy bu mevsimde güzel olur.' },
  { tip:'kitap', icerik:'Cal Newport — Digital Minimalism. Deep Work felsefesinin kişisel hayata uygulaması. 230 sayfa.' },
  { tip:'kitap', icerik:'Gary Keller — The One Thing. Günde bir kritik görev felsefesi — Frog metodunun kitabı.' },
  { tip:'kitap', icerik:'Greg McKeown — Essentialism. Daha az ama daha iyi. İş yükü yönetiminde klasik.' },
  { tip:'kitap', icerik:'Daniel Kahneman — Thinking Fast and Slow. Karar verme mekanizmaları üzerine derin bir okuma.' },
  { tip:'gelisim', icerik:'Tracy şunu söyler: En başarılı insanlar işte en iyi olanlardır çünkü evde en dinlenmiş olanlardır.' },
  { tip:'gelisim', icerik:'Bu hafta 5 kritik görev tamamladın. İyi iş — ama dinlenme de üretkenliğin parçası.' },
  { tip:'gelisim', icerik:'Newport: Derin odak için sabah ilk 2 saati koru. Telefon kapalı, bildirim yok.' },
  { tip:'gelisim', icerik:'80/20 kuralı: Hangi 2 müşteri gelirinizin %80\'ini oluşturuyor? Onlara daha fazla zaman ver.' },
  { tip:'gelisim', icerik:'Haftalık review yapmak, haftanın en verimli 30 dakikasıdır. Planlayan kazanır.' }
];

window._ppHayatKartiGoster = function() {
  var havuz = _ppHayatHavuz;
  var gosterilen = _ppHayatLoad().map(function(h) { return h.icerik; });
  var kalan = havuz.filter(function(h) { return gosterilen.indexOf(h.icerik) === -1; });
  if (!kalan.length) { _ppHayatStore([]); kalan = havuz; }
  var secilen = kalan[Math.floor(Math.random() * kalan.length)];
  var kayit = { id: _ppId(), tip: secilen.tip, icerik: secilen.icerik, tarih: _ppNow(), okundu: false };
  var liste = _ppHayatLoad(); liste.unshift(kayit);
  if (liste.length > 30) liste = liste.slice(0, 30);
  _ppHayatStore(liste);
  window._ppBildirimGuncelle?.();
  return kayit;
};

window._ppHayatKartlariOku = function() {
  return _ppHayatLoad();
};

window._ppHayatBaslat = function() {
  var liste = _ppHayatLoad();
  var bugun = _ppToday();
  var bugunVar = liste.some(function(h) { return h.tarih && h.tarih.slice(0, 10) === bugun; });
  if (!bugunVar) { window._ppHayatKartiGoster(); }
};

window._ppHayatLoad = _ppHayatLoad;
setTimeout(function() { window._ppHayatBaslat?.(); }, 1200);

/* ── Rutin Ödemeler + Abonelik Takibi ──────────────────────── */
var PP_ODEME_KEY = 'ak_pp_odemeler_v1';
var PP_ABONELIK_KEY = 'ak_pp_abonelik_v1';

function _ppOdemeLoad(){ try{ var r=localStorage.getItem(PP_ODEME_KEY); return r?JSON.parse(r):[]; }catch(e){ return []; } }
function _ppOdemeStore(d){ try{ localStorage.setItem(PP_ODEME_KEY,JSON.stringify(d)); }catch(e){} }
function _ppAbonelikLoad(){ try{ var r=localStorage.getItem(PP_ABONELIK_KEY); return r?JSON.parse(r):[]; }catch(e){ return []; } }
function _ppAbonelikStore(d){ try{ localStorage.setItem(PP_ABONELIK_KEY,JSON.stringify(d)); }catch(e){} }

window._ppOdemeBaslat = function() {
  if (_ppOdemeLoad().length > 0) return;
  var odemeler = [
    { id:'OD-001', baslik:'Ofis Kirası', kategori:'Kira', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın 1. günü', sorumlu:'Muhasebe', oncelik:'Kritik', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() },
    { id:'OD-002', baslik:'Elektrik Faturası', kategori:'Fatura', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın 15. günü', sorumlu:'Muhasebe', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'OD-003', baslik:'İnternet / Telefon', kategori:'Fatura', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın 10. günü', sorumlu:'Muhasebe', oncelik:'Normal', hatirlatmaGun:3, durum:'active', createdAt:_ppNow() },
    { id:'OD-004', baslik:'Muhasebe / Mali Müşavir', kategori:'Hizmet', tutar:'', para:'TRY', periyot:'Aylık', periyotDetay:'Her ayın son iş günü', sorumlu:'Yönetim', oncelik:'Normal', hatirlatmaGun:5, durum:'active', createdAt:_ppNow() }
  ];
  odemeler.forEach(function(o){ o.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(o)||null; });
  _ppOdemeStore(odemeler);
};

window._ppAbonelikBaslat = function() {
  if (_ppAbonelikLoad().length > 0) return;
  var abonelikler = [
    { id:'AB-001', baslik:'Google Workspace', kategori:'SaaS', tutar:'', para:'USD', periyot:'Aylık', yenileme:'', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'AB-002', baslik:'GitHub', kategori:'SaaS', tutar:'', para:'USD', periyot:'Aylık', yenileme:'', hatirlatmaGun:14, durum:'active', createdAt:_ppNow() },
    { id:'AB-003', baslik:'Domain / Hosting', kategori:'Altyapı', tutar:'', para:'USD', periyot:'Yıllık', yenileme:'', hatirlatmaGun:30, durum:'active', createdAt:_ppNow() }
  ];
  _ppAbonelikStore(abonelikler);
};

setTimeout(function(){ window._ppOdemeBaslat?.(); window._ppAbonelikBaslat?.(); }, 1500);

window._ppOdemePanelRender = function(body, h) {
  var odemeler = _ppOdemeLoad().filter(function(o){ return !o.isDeleted; });
  var bugun = _ppToday();
  h += '<div style="flex:1;overflow-y:auto">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:9px;color:var(--t3)">'+odemeler.length+' rutin ödeme</div>';
  h += '<button onclick="event.stopPropagation();window._ppOdemeYeniAc()" style="font-size:10px;padding:3px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">+ Ekle</button>';
  h += '</div>';
  odemeler.forEach(function(o) {
    var sonraki = o.sonrakiCalisma || (window._ppTakvimSonrakiHesapla?.(o)) || '—';
    var kalan = sonraki&&sonraki!=='—' ? Math.ceil((new Date(sonraki)-new Date(bugun))/86400000) : null;
    var kRenk = kalan===0?'#A32D2D':kalan!==null&&kalan<=5?'#854F0B':'#185FA5';
    var kBg = kalan===0?'#FCEBEB':kalan!==null&&kalan<=5?'#FAEEDA':'#E6F1FB';
    h += '<div style="display:grid;grid-template-columns:120px 1fr 80px 90px 70px 60px;align-items:center;padding:8px 12px;border-bottom:0.5px solid var(--b)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
    h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#E6F1FB;color:#185FA5;font-weight:500">'+_ppEsc(o.kategori||'')+'</span>';
    h += '<div><div style="font-size:11px;font-weight:500;color:var(--t)">'+_ppEsc(o.baslik)+'</div><div style="font-size:9px;color:var(--t3)">'+_ppEsc(o.periyotDetay||'')+'</div></div>';
    h += '<div style="font-size:9px;color:var(--t2)">'+_ppEsc(o.tutar?(o.tutar+' '+o.para):'—')+'</div>';
    h += '<div style="font-size:9px;color:var(--t3)">'+sonraki+'</div>';
    h += kalan!==null?'<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:'+kBg+';color:'+kRenk+';font-weight:500">'+(kalan===0?'Bugün':kalan+' gün')+'</span>':'<span></span>';
    h += '<div style="display:flex;gap:3px;justify-content:flex-end" onclick="event.stopPropagation()"><button onclick="event.stopPropagation();window._ppOdemeSil(\''+o.id+'\')" style="font-size:9px;padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D">×</button></div>';
    h += '</div>';
  });
  h += '</div>';
  body.innerHTML = h;
};

window._ppOdemeYeniAc = function() {
  var baslik=prompt('Ödeme adı:'); if(!baslik||!baslik.trim()) return;
  var kategori=prompt('Kategori (Kira/Fatura/Hizmet/Vergi):')||'Fatura';
  var tutar=prompt('Tutar (opsiyonel):')||'';
  var periyotDetay=prompt('Ne zaman? (örn: Her ayın 15. günü):')||'';
  var yeni={id:'OD-'+Date.now(),baslik:baslik.trim(),kategori:kategori,tutar:tutar,para:'TRY',periyot:'Aylık',periyotDetay:periyotDetay,sorumlu:'',oncelik:'Normal',hatirlatmaGun:3,durum:'active',createdAt:_ppNow()};
  yeni.sonrakiCalisma=window._ppTakvimSonrakiHesapla?.(yeni)||null;
  var liste=_ppOdemeLoad(); liste.unshift(yeni); _ppOdemeStore(liste);
  window.toast?.('Ödeme eklendi','ok'); window._ppModRender();
};

window._ppOdemeSil = function(id) {
  window.confirmModal('Bu \u00f6demeyi silmek istedi\u011finizden emin misiniz?',{confirmText:'Sil',danger:true,onConfirm:function(){
  var liste=_ppOdemeLoad(); var i=liste.findIndex(function(x){return x.id===id;}); if(i===-1) return;
  liste[i].isDeleted=true; liste[i].deletedAt=_ppNow(); _ppOdemeStore(liste);
  window.toast?.('\u00d6deme silindi','ok'); window._ppModRender();
  }});
};

window._ppAbonelikPanelRender = function(body, h) {
  var abonelikler = _ppAbonelikLoad().filter(function(a){ return !a.isDeleted; });
  var bugun = _ppToday();
  h += '<div style="flex:1;overflow-y:auto">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:9px;color:var(--t3)">'+abonelikler.length+' abonelik</div>';
  h += '<button onclick="event.stopPropagation();window._ppAbonelikYeniAc()" style="font-size:10px;padding:3px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">+ Ekle</button>';
  h += '</div>';
  abonelikler.forEach(function(a) {
    var yenileme = a.yenileme || '—';
    var kalan = yenileme&&yenileme!=='—' ? Math.ceil((new Date(yenileme)-new Date(bugun))/86400000) : null;
    var kRenk = kalan!==null&&kalan<=30?'#A32D2D':'#185FA5';
    var kBg = kalan!==null&&kalan<=30?'#FCEBEB':'#E6F1FB';
    h += '<div style="display:grid;grid-template-columns:100px 1fr 80px 100px 80px 60px;align-items:center;padding:8px 12px;border-bottom:0.5px solid var(--b)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
    h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:#EEEDFE;color:#3C3489;font-weight:500">'+_ppEsc(a.kategori||'')+'</span>';
    h += '<div><div style="font-size:11px;font-weight:500;color:var(--t)">'+_ppEsc(a.baslik)+'</div><div style="font-size:9px;color:var(--t3)">'+_ppEsc(a.periyot||'')+'</div></div>';
    h += '<div style="font-size:9px;color:var(--t2)">'+_ppEsc(a.tutar?(a.tutar+' '+a.para):'—')+'</div>';
    h += '<div style="font-size:9px;color:var(--t3)">'+yenileme+'</div>';
    h += kalan!==null?'<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:'+kBg+';color:'+kRenk+';font-weight:500">'+kalan+' gün</span>':'<span></span>';
    h += '<div style="display:flex;gap:3px;justify-content:flex-end" onclick="event.stopPropagation()"><button onclick="event.stopPropagation();window._ppAbonelikSil(\''+a.id+'\')" style="font-size:9px;padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:#A32D2D">×</button></div>';
    h += '</div>';
  });
  h += '</div>';
  body.innerHTML = h;
};

window._ppAbonelikYeniAc = function() {
  var baslik=prompt('Abonelik adı:'); if(!baslik||!baslik.trim()) return;
  var kategori=prompt('Kategori (SaaS/Altyapı/Lisans):')||'SaaS';
  var tutar=prompt('Aylık tutar (opsiyonel):')||'';
  var para=prompt('Para birimi (TRY/USD/EUR):')||'USD';
  var yenileme=prompt('Yenileme tarihi (YYYY-MM-DD):')||'';
  var yeni={id:'AB-'+Date.now(),baslik:baslik.trim(),kategori:kategori,tutar:tutar,para:para,periyot:'Aylık',yenileme:yenileme,hatirlatmaGun:14,durum:'active',createdAt:_ppNow()};
  var liste=_ppAbonelikLoad(); liste.unshift(yeni); _ppAbonelikStore(liste);
  window.toast?.('Abonelik eklendi','ok'); window._ppModRender();
};

window._ppAbonelikSil = function(id) {
  window.confirmModal('Bu aboneli\u011fi silmek istedi\u011finizden emin misiniz?',{confirmText:'Sil',danger:true,onConfirm:function(){
  var liste=_ppAbonelikLoad(); var i=liste.findIndex(function(x){return x.id===id;}); if(i===-1) return;
  liste[i].isDeleted=true; liste[i].deletedAt=_ppNow(); _ppAbonelikStore(liste);
  window.toast?.('Abonelik silindi','ok'); window._ppModRender();
  }});
};

window._ppOdemeLoad = _ppOdemeLoad;
window._ppAbonelikLoad = _ppAbonelikLoad;

/* ── PP-GOREV-SATIR-001: Yeni satır helper'ları ─────────────── */
window._ppAltGorevToggleRow = function(id) {
  var panel = document.getElementById('pp-ag-panel-'+id);
  var btn = document.getElementById('pp-ag-btn-'+id);
  if (!panel) return;
  var acik = panel.style.display !== 'none';
  panel.style.display = acik ? 'none' : 'block';
  if (btn) btn.innerHTML = acik ? '&#9658; Göster' : '&#9660; Gizle';
};

window._ppAltGorevTopluTamamla = function(id) {
  var tasks = _ppLoad();
  var t = tasks.find(function(x){ return String(x.id)===String(id); });
  if (!t || !t.altGorevler) return;
  t.altGorevler.forEach(function(ag){ ag.tamamlandi = true; });
  t.altGorevTam = t.altGorevler.length;
  t.updatedAt = _ppNow();
  _ppStore(tasks);
  window.toast?.('Tüm alt görevler tamamlandı','ok');
  window._ppModRender();
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
  modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9998;width:420px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.12);padding:18px';
  var sorumluAd = Array.isArray(t.sorumlu) ? t.sorumlu.map(function(s){return s.ad||s;}).join(', ') : (t.sorumlu||'—');
  modal.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:500;color:var(--t)">'+_ppEsc(t.baslik||t.title||'')+'</div>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-peek-modal\')?.remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1">×</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    +'<div style="background:var(--s2);border-radius:6px;padding:8px"><div style="font-size:8px;color:var(--t3);font-weight:500;margin-bottom:3px">ÖNCELİK</div><span style="font-size:11px;padding:2px 7px;border-radius:3px;background:'+pr.bg+';color:'+pr.c+';font-weight:500">'+pr.l+'</span></div>'
    +'<div style="background:var(--s2);border-radius:6px;padding:8px"><div style="font-size:8px;color:var(--t3);font-weight:500;margin-bottom:3px">SORUMLU</div><div style="font-size:11px;color:var(--t)">'+_ppEsc(sorumluAd)+'</div></div>'
    +'<div style="background:var(--s2);border-radius:6px;padding:8px"><div style="font-size:8px;color:var(--t3);font-weight:500;margin-bottom:3px">BAŞLANGIÇ</div><div style="font-size:11px;color:var(--t)">'+(t.basT||'—')+'</div></div>'
    +'<div style="background:var(--s2);border-radius:6px;padding:8px"><div style="font-size:8px;color:var(--t3);font-weight:500;margin-bottom:3px">BİTİŞ</div><div style="font-size:11px;color:var(--t)">'+(t.bitTarih||'—')+'</div></div>'
    +'</div>'
    +(t.aciklama?'<div style="font-size:11px;color:var(--t2);line-height:1.6;margin-bottom:10px;padding:8px;background:var(--s2);border-radius:6px">'+t.aciklama+'</div>':'')
    +(typeof window._ppBagimlilikPanelHTML === 'function' ? window._ppBagimlilikPanelHTML(t) : '')
    +(typeof window._ppZamanPanelHTML === 'function' ? window._ppZamanPanelHTML(t) : '')
    +(typeof window._ppOnayPanelHTML === 'function' ? window._ppOnayPanelHTML(t) : '')
    +'<div style="display:flex;gap:6px;justify-content:flex-end">'
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-peek-modal\')?.remove();window._ppGorevDuzenle(\''+id+'\')" style="font-size:11px;padding:6px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Düzenle</button>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-peek-modal\')?.remove()" style="font-size:11px;padding:6px 14px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Kapat</button>'
    +'</div>';
  document.body.appendChild(modal);
  document.addEventListener('click', function rm(e){ if(!modal.contains(e.target)){modal.remove();document.removeEventListener('click',rm);} });
};

window._ppGorevMesaj = function(id) {
  var tasks = _ppLoad();
  var t = tasks.find(function(x){ return String(x.id)===String(id); });
  if (!t) return;
  window._ppMesajGonder?.('Görev: '+_ppEsc(t.baslik||t.title||''), 'kisisel', '');
  window._ppMesajPanelAc?.();
  window.toast?.('Görev mesajına geçildi','info');
};

/* ── PP-TAK-V2-001: CSV Import ──────────────────────────────── */
window._ppTakvimCSVImport = function(csvText) {
  if (!csvText || !csvText.trim()) { window.toast?.('CSV boş', 'warn'); return; }
  var satirlar = csvText.trim().split(/\r?\n/);
  if (satirlar.length < 2) { window.toast?.('Veri yok', 'warn'); return; }
  var basliklar = satirlar[0].split(',').map(function(s) { return s.trim().toLowerCase().replace(/['"]/g, ''); });
  var kolonMap = {
    'no': 'no', 'periyot': 'periyot', 'kategori': 'kategori',
    'alt kategori': 'altKategori', 'altkategori': 'altKategori',
    'kaynak': 'kaynak',
    'etkinlik adi': 'baslik', 'etkinlik adı': 'baslik',
    'etkinlik detayi': 'periyotDetay', 'etkinlik detayı': 'periyotDetay',
    'periyot detayi': 'periyotDetay', 'periyot detayı': 'periyotDetay',
    'sorumlu kisi': 'sorumluUnvan', 'sorumlu kişi': 'sorumluUnvan',
    'atanmis gorevli': 'atananGorevli', 'atanmış görevli': 'atananGorevli',
    'ilgili dokuman': 'ilgiliDokuman', 'ilgili döküman': 'ilgiliDokuman'
  };
  var liste = window._ppTakvimLoad?.() || [];
  var eklenen = 0;
  var atlanan = 0;
  for (var i = 1; i < satirlar.length; i++) {
    var kolonlar = satirlar[i].split(',').map(function(s) { return s.trim().replace(/^["']|["']$/g, ''); });
    if (!kolonlar.some(function(k) { return k.length > 0; })) continue;
    var vals = {};
    basliklar.forEach(function(b, idx) {
      var key = kolonMap[b] || b;
      vals[key] = kolonlar[idx] || '';
    });
    if (!vals.baslik) { atlanan++; continue; }
    var yeni = {
      id: window._ppId?.() || Date.now() + Math.random().toString(36).slice(2, 6),
      no: vals.no || '',
      baslik: vals.baslik,
      kategori: vals.kategori || 'Genel',
      altKategori: vals.altKategori || '',
      kaynak: vals.kaynak || '',
      periyot: vals.periyot || 'Tek Seferlik',
      periyotDetay: vals.periyotDetay || '',
      sorumluUnvan: vals.sorumluUnvan || '',
      atananGorevli: vals.atananGorevli || '',
      ilgiliDokuman: vals.ilgiliDokuman || '',
      takvimeEkle: 'Evet',
      oncelik: 'Normal',
      hatirlatmaGun: 1,
      durum: 'active',
      createdAt: window._ppNow?.(),
      isDeleted: false
    };
    yeni.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(yeni) || null;
    liste.push(yeni);
    eklenen++;
  }
  window._ppTakvimStore?.(liste);
  window.toast?.(eklenen + ' etkinlik eklendi, ' + atlanan + ' atlandı', 'ok');
  window._ppModRender?.();
};

/* ── PP-TAK-V2-004: JSON Import ─────────────────────────────── */
window._ppTakvimJSONImport = function(inp) {
  var f = inp.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) { window.toast?.('Geçersiz format — dizi bekleniyor', 'warn'); return; }
      var liste = window._ppTakvimLoad?.() || [];
      var eklenen = 0;
      data.forEach(function(ev) {
        if (!ev.name && !ev.baslik) return;
        var yeni = {
          id: window._ppId?.() || (Date.now() + Math.random().toString(36).slice(2, 6)),
          name: ev.name || ev.baslik || '',
          baslik: ev.baslik || ev.name || '',
          period: ev.period || ev.periyot || '',
          periyot: ev.periyot || ev.period || '',
          periodDetail: ev.periodDetail || ev.periyotDetay || '',
          periyotDetay: ev.periyotDetay || ev.periodDetail || '',
          category: ev.category || ev.kategori || '',
          kategori: ev.kategori || ev.category || '',
          altKategori: ev.altKategori || ev.subCategory || '',
          kaynak: ev.kaynak || ev.source || '',
          resp: ev.resp || ev.sorumlu || '',
          sorumlu: ev.sorumlu || ev.resp || '',
          sorumluUnvan: ev.sorumluUnvan || ev.sorumlu || ev.resp || '',
          atananGorevli: ev.atananGorevli || ev.assigned || '',
          ilgiliDokuman: ev.ilgiliDokuman || ev.doc || '',
          detail: ev.detail || ev.detay || '',
          detay: ev.detay || ev.detail || '',
          addToCalendar: ev.addToCalendar || ev.takvimeEkle || 'Evet',
          takvimeEkle: ev.takvimeEkle || ev.addToCalendar || 'Evet',
          priority: ev.priority || ev.oncelik || 'Normal',
          oncelik: ev.oncelik || ev.priority || 'Normal',
          startDate: ev.startDate || ev.basTarih || '',
          basTarih: ev.basTarih || ev.startDate || '',
          durum: ev.status || ev.durum || 'active',
          status: ev.status || ev.durum || 'active',
          no: ev.no || '',
          hatirlatmaGun: ev.hatirlatmaGun || 3,
          createdAt: window._ppNow?.(),
          updatedAt: window._ppNow?.()
        };
        yeni.sonrakiCalisma = window._ppTakvimSonrakiHesapla?.(yeni) || null;
        liste.push(yeni);
        eklenen++;
      });
      window._ppTakvimStore?.(liste);
      window.toast?.(eklenen + ' etkinlik içe aktarıldı', 'ok');
      window._ppModRender?.();
    } catch(err) {
      window.toast?.('JSON parse hatası: ' + err.message, 'warn');
    }
  };
  r.readAsText(f, 'UTF-8');
};

/* ── PP-BAGIMLILIK-001: Görev Önkoşul Zinciri ──────────────── */
window._ppBagimlilikEkle = function(gorevId, onkosulId) {
  var tasks = window._ppLoad?.() || [];
  var t = tasks.find(function(x) { return x.id === gorevId; });
  var o = tasks.find(function(x) { return x.id === onkosulId; });
  if (!t || !o) { window.toast?.('Görev bulunamadı', 'warn'); return; }
  if (gorevId === onkosulId) { window.toast?.('Görev kendisine bağlanamaz', 'warn'); return; }
  if (!t.onkosullar) t.onkosullar = [];
  if (t.onkosullar.indexOf(onkosulId) !== -1) { window.toast?.('Bağımlılık zaten var', 'warn'); return; }
  t.onkosullar.push(onkosulId);
  t.updatedAt = _ppNow();
  window._ppStore?.(tasks);
  window.toast?.('Önkoşul eklendi: ' + _ppEsc(o.baslik || ''), 'ok');
  window._ppModRender?.();
};

window._ppBagimlilikKaldir = function(gorevId, onkosulId) {
  var tasks = window._ppLoad?.() || [];
  var t = tasks.find(function(x) { return x.id === gorevId; });
  if (!t || !t.onkosullar) return;
  t.onkosullar = t.onkosullar.filter(function(id) { return id !== onkosulId; });
  t.updatedAt = _ppNow();
  window._ppStore?.(tasks);
  window.toast?.('Önkoşul kaldırıldı', 'ok');
  window._ppModRender?.();
};

window._ppBagimlilikKontrol = function(gorevId) {
  var tasks = window._ppLoad?.() || [];
  var t = tasks.find(function(x) { return x.id === gorevId; });
  if (!t || !t.onkosullar || !t.onkosullar.length) return { gecerli: true, eksikler: [] };
  var eksikler = t.onkosullar.filter(function(oid) {
    var o = tasks.find(function(x) { return x.id === oid; });
    return !o || o.durum !== 'tamamlandi';
  }).map(function(oid) {
    var o = tasks.find(function(x) { return x.id === oid; });
    return o ? o.baslik : oid;
  });
  return { gecerli: eksikler.length === 0, eksikler: eksikler };
};

window._ppBagimlilikPanelHTML = function(gorev) {
  if (!gorev) return '';
  var tasks = window._ppLoad?.() || [];
  var kontrol = window._ppBagimlilikKontrol(gorev.id);
  var h = '<div style="background:var(--s2);border:0.5px solid var(--b);border-radius:6px;padding:10px 12px;margin-bottom:8px">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:6px">ÖNKOŞULLAR';
  if (!kontrol.gecerli) h += ' <span style="color:#A32D2D;font-weight:700">⚠ ' + kontrol.eksikler.length + ' eksik</span>';
  h += '</div>';
  if (gorev.onkosullar && gorev.onkosullar.length) {
    gorev.onkosullar.forEach(function(oid) {
      var o = tasks.find(function(x) { return x.id === oid; });
      if (!o) return;
      var tamam = o.durum === 'tamamlandi';
      h += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:0.5px solid var(--b)">';
      h += '<span style="font-size:10px;color:' + (tamam ? '#0F6E56' : '#854F0B') + '">' + (tamam ? '✓' : '○') + '</span>';
      h += '<span style="font-size:11px;color:var(--t2);flex:1">' + _ppEsc(o.baslik || '') + '</span>';
      h += '<button onclick="event.stopPropagation();window._ppBagimlilikKaldir(\'' + gorev.id + '\',\'' + oid + '\')" style="font-size:9px;border:none;background:none;cursor:pointer;color:var(--t3)">×</button>';
      h += '</div>';
    });
  } else {
    h += '<div style="font-size:10px;color:var(--t3);padding:4px 0">Önkoşul yok</div>';
  }
  h += '</div>';
  return h;
};

/* ── PP-ZAMAN-001: Görev Zaman Takibi ──────────────────────── */
var _ppZamanAktif = null;
var _ppZamanBaslangic = null;

window._ppZamanBaslat = function(gorevId) {
  if (_ppZamanAktif && _ppZamanAktif !== gorevId) {
    window._ppZamanDurdur(_ppZamanAktif);
  }
  _ppZamanAktif = gorevId;
  _ppZamanBaslangic = Date.now();
  window.toast?.('Zaman başlatıldı', 'ok');
  window._ppZamanUIGuncelle();
};

window._ppZamanDurdur = function(gorevId) {
  if (!_ppZamanAktif || !_ppZamanBaslangic) return;
  var sure = Math.floor((Date.now() - _ppZamanBaslangic) / 1000);
  var tasks = window._ppLoad?.() || [];
  var t = tasks.find(function(x) { return x.id === gorevId; });
  if (t) {
    if (!t.zamanKayitlari) t.zamanKayitlari = [];
    t.zamanKayitlari.push({
      baslangic: new Date(_ppZamanBaslangic).toISOString().slice(0, 19).replace('T', ' '),
      sure: sure,
      kullanici: (window._saCu?.() || _ppCu())?.displayName || ''
    });
    t.toplamSure = (t.toplamSure || 0) + sure;
    t.updatedAt = _ppNow();
    window._ppStore?.(tasks);
  }
  _ppZamanAktif = null;
  _ppZamanBaslangic = null;
  var dk = Math.floor(sure / 60); var sn = sure % 60;
  window.toast?.('Zaman durduruldu: ' + dk + 'dk ' + sn + 'sn', 'ok');
  window._ppModRender?.();
};

window._ppZamanUIGuncelle = function() {
  var el = document.getElementById('pp-zaman-badge');
  if (!el) return;
  if (!_ppZamanAktif) { el.textContent = ''; return; }
  var gecen = Math.floor((Date.now() - _ppZamanBaslangic) / 1000);
  var dk = Math.floor(gecen / 60); var sn = gecen % 60;
  el.textContent = dk + 'dk ' + String(sn).padStart(2, '0') + 'sn';
  setTimeout(window._ppZamanUIGuncelle, 1000);
};

window._ppZamanFormatla = function(saniye) {
  if (!saniye) return '—';
  var sa = Math.floor(saniye / 3600);
  var dk = Math.floor((saniye % 3600) / 60);
  if (sa > 0) return sa + 's ' + dk + 'dk';
  return dk + 'dk ' + (saniye % 60) + 'sn';
};

window._ppZamanPanelHTML = function(gorev) {
  if (!gorev) return '';
  var aktif = _ppZamanAktif === gorev.id;
  var h = '<div style="background:var(--s2);border:0.5px solid var(--b);border-radius:6px;padding:10px 12px;margin-bottom:8px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em">ZAMAN TAKİBİ</div>';
  h += '<div style="font-size:10px;font-weight:500;color:var(--t)">' + window._ppZamanFormatla(gorev.toplamSure || 0) + '</div>';
  h += '</div>';
  if (aktif) {
    h += '<div id="pp-zaman-badge" style="font-size:11px;color:#0F6E56;font-weight:500;margin-bottom:6px">0dk 00sn</div>';
    h += '<button onclick="event.stopPropagation();window._ppZamanDurdur(\'' + gorev.id + '\')" style="font-size:10px;padding:5px 12px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">■ Durdur</button>';
  } else {
    h += '<button onclick="event.stopPropagation();window._ppZamanBaslat(\'' + gorev.id + '\')" style="font-size:10px;padding:5px 12px;border:0.5px solid #0F6E56;border-radius:5px;background:transparent;cursor:pointer;color:#0F6E56;font-family:inherit">▶ Başlat</button>';
  }
  if (gorev.zamanKayitlari && gorev.zamanKayitlari.length) {
    h += '<div style="margin-top:8px;border-top:0.5px solid var(--b);padding-top:6px">';
    gorev.zamanKayitlari.slice(-3).reverse().forEach(function(k) {
      h += '<div style="font-size:9px;color:var(--t3);padding:2px 0">' + (k.baslangic || '').slice(0, 16) + ' · ' + window._ppZamanFormatla(k.sure) + '</div>';
    });
    h += '</div>';
  }
  h += '</div>';
  return h;
};

/* ── PP-ONAY-001: Görev Onay Akışı ─────────────────────────── */
window._ppOnayGonder = function(gorevId) {
  var tasks = window._ppLoad?.() || [];
  var t = tasks.find(function(x) { return x.id === gorevId; });
  if (!t) return;
  t.onayDurum = 'bekliyor';
  t.onayTalep = _ppNow();
  t.onayTalepEden = (_ppCu() || {}).displayName || (_ppCu() || {}).email || '';
  t.durum = 'bekliyor';
  t.updatedAt = t.onayTalep;
  window._ppStore?.(tasks);
  window.toast?.('Onay talebi gönderildi', 'ok');
  if (typeof window.addNotif === 'function') {
    var admins = (typeof window.loadUsers === 'function' ? window.loadUsers() : []).filter(function(u) { return u.rol === 'admin' || u.rol === 'manager' || u.role === 'admin' || u.role === 'manager'; });
    admins.forEach(function(a) { window.addNotif('✅', 'Görev onay bekliyor: ' + _ppEsc(t.baslik || ''), 'warn', 'pusula', a.uid || a.id, gorevId); });
  }
  window._ppModRender?.();
};

window._ppOnayKabul = function(gorevId, aciklama) {
  var tasks = window._ppLoad?.() || [];
  var t = tasks.find(function(x) { return x.id === gorevId; });
  if (!t) return;
  t.onayDurum = 'onaylandi';
  t.onayTarih = _ppNow();
  t.onayYapan = (_ppCu() || {}).displayName || (_ppCu() || {}).email || '';
  t.onayAciklama = aciklama || '';
  t.durum = 'tamamlandi';
  t.updatedAt = t.onayTarih;
  window._ppStore?.(tasks);
  window.toast?.('Görev onaylandı', 'ok');
  window._ppModRender?.();
};

window._ppOnayReddet = function(gorevId, aciklama) {
  var tasks = window._ppLoad?.() || [];
  var t = tasks.find(function(x) { return x.id === gorevId; });
  if (!t) return;
  t.onayDurum = 'reddedildi';
  t.onayTarih = _ppNow();
  t.onayYapan = (_ppCu() || {}).displayName || (_ppCu() || {}).email || '';
  t.onayAciklama = aciklama || '';
  t.durum = 'devam';
  t.updatedAt = t.onayTarih;
  window._ppStore?.(tasks);
  window.toast?.('Görev reddedildi: ' + _ppEsc(aciklama || ''), 'warn');
  window._ppModRender?.();
};

window._ppOnayPanelHTML = function(gorev) {
  if (!gorev) return '';
  var h = '<div style="background:var(--s2);border:0.5px solid var(--b);border-radius:6px;padding:10px 12px;margin-bottom:8px">';
  h += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:6px">ONAY AKIŞI</div>';
  var renk = { bekliyor: '#854F0B', onaylandi: '#0F6E56', reddedildi: '#A32D2D' };
  var lbl = { bekliyor: 'Onay Bekleniyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  if (gorev.onayDurum) {
    h += '<div style="font-size:10px;font-weight:500;color:' + (renk[gorev.onayDurum] || 'var(--t2)') + '">' + (lbl[gorev.onayDurum] || gorev.onayDurum) + '</div>';
    if (gorev.onayTalepEden) h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Talep eden: ' + _ppEsc(gorev.onayTalepEden) + '</div>';
    if (gorev.onayYapan) h += '<div style="font-size:9px;color:var(--t3)">İşlem yapan: ' + _ppEsc(gorev.onayYapan) + '</div>';
    if (gorev.onayAciklama) h += '<div style="font-size:9px;color:var(--t3)">Not: ' + _ppEsc(gorev.onayAciklama) + '</div>';
    if (gorev.onayDurum === 'bekliyor') {
      h += '<div style="display:flex;gap:6px;margin-top:8px">';
      h += '<button onclick="event.stopPropagation();window._ppOnayKabul(\'' + gorev.id + '\',\'\')" style="font-size:10px;padding:4px 10px;border:0.5px solid #0F6E56;border-radius:5px;background:transparent;cursor:pointer;color:#0F6E56;font-family:inherit">Onayla</button>';
      h += '<button onclick="event.stopPropagation();var a=prompt(\'Red nedeni:\');if(a!==null)window._ppOnayReddet(\'' + gorev.id + '\',a)" style="font-size:10px;padding:4px 10px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Reddet</button>';
      h += '</div>';
    }
  } else {
    if (gorev.durum === 'devam' || gorev.durum === 'bekliyor') {
      h += '<button onclick="event.stopPropagation();window._ppOnayGonder(\'' + gorev.id + '\')" style="font-size:10px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Onaya Gönder</button>';
    } else {
      h += '<div style="font-size:10px;color:var(--t3)">Onay akışı başlatılmadı</div>';
    }
  }
  h += '</div>';
  return h;
};
