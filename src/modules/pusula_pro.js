/* ════════════════════════════════════════════════════════════════
   src/modules/pusula_pro.js — Pusula Pro v1.0
   Firestore: duay_tenant_default/tasks (mevcut veri korunur)
   localStorage: ak_pusula_pro_v1
   5 Mod: akis / calisma / odak / degerlendirme / ceo
════════════════════════════════════════════════════════════════ */
'use strict';

/* ── Sabitler ───────────────────────────────────────────────── */
var PP_KEY        = 'ak_pusula_pro_v1';
var PP_TASK_KEY   = 'ak_tk2';
var PP_MOD        = 'akis';
var PP_MODS       = ['akis','calisma','odak','degerlendirme','ceo'];

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
  } catch(e) { return []; }
}
function _ppStore(d) {
  try {
    var s = JSON.stringify(d);
    if (typeof LZString!=='undefined' && s.length>500) { localStorage.setItem(PP_KEY,'_LZ_'+LZString.compressToUTF16(s)); }
    else { localStorage.setItem(PP_KEY,s); }
  } catch(e) { console.error('[PP]',e); }
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
    var lbl = {akis:'Akış',calisma:'Çalışma',odak:'Odak',degerlendirme:'Değerlendirme',ceo:'CEO'}[m];
    return '<button onclick="event.stopPropagation();window._ppSetMod(\'' + m + '\')" id="pp-mod-' + m + '" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:20px;cursor:pointer;font-family:inherit;background:transparent;color:var(--t2)">' + lbl + '</button>';
  }).join('');
  panel.innerHTML = ''
    + '<div style="display:flex;flex-direction:column;height:100%;background:var(--sf)">'
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
    + '</div>';
  window._ppSetMod('akis');
  setTimeout(function() { window._ppFrogBelirle?.(); window._ppSkorGuncelle?.(); }, 100);
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
    var _grup = function(lbl, cls, arr) {
      if (!arr.length) return '';
      var h = '<div style="display:flex;align-items:center;gap:8px;padding:5px 14px;background:var(--s2);border-bottom:0.5px solid var(--b);position:sticky;top:0">';
      h += '<span style="font-size:8px;padding:2px 7px;border-radius:3px;font-weight:500;' + cls + '">' + lbl + '</span>';
      h += '<span style="font-size:8px;color:var(--t3)">' + arr.length + ' görev</span></div>';
      arr.forEach(function(t) {
        var pr = PP_PRIORITIES[t.oncelik || 'normal'];
        h += '<div onclick="event.stopPropagation();window._ppTaskAc(\'' + t.id + '\')" style="display:grid;grid-template-columns:26px 1fr 90px 80px 70px;align-items:center;padding:7px 10px 7px 14px;border-bottom:0.5px solid var(--b);cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
        h += '<input type="checkbox" onclick="event.stopPropagation();window._ppTamamla(\'' + t.id + '\')" style="width:13px;height:13px;cursor:pointer">';
        h += '<div><div style="font-size:11px;color:var(--t)">' + _ppEsc(t.baslik || t.title || '') + '</div>';
        if (t.altGorevSay) h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Alt görev ' + t.altGorevTam + '/' + t.altGorevSay + '</div>';
        h += '</div>';
        h += '<div style="font-size:9px;color:var(--t2)">' + _ppEsc(t.sorumlu || '—') + '</div>';
        h += '<div style="font-size:9px;color:var(--t3)">' + _ppEsc(t.bitTarih || '—') + '</div>';
        h += '<span style="font-size:8px;padding:2px 6px;border-radius:3px;background:' + pr.bg + ';color:' + pr.c + '">' + pr.l + '</span>';
        h += '</div>';
      });
      return h;
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
  } else if (mod === 'akis') {
    var msgs = window._ppMesajlariOku?.('sirket') || [];
    var tasks = _ppLoad().filter(function(t) { return !t.isDeleted && t.durum !== 'tamamlandi'; });
    var bugun = _ppToday();
    var bugunTasks = tasks.filter(function(t) { return t.bitTarih === bugun || t.oncelik === 'kritik'; });
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
      + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin:16px 0 10px">ŞİRKET YAYINLARI</div>'
      + _msgH
      + '</div>'
      + '<div style="width:240px;border-left:0.5px solid var(--b);padding:12px;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:10px">'
      + window._ppSagPanel()
      + '</div>';
  } else {
    body.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;color:var(--t3);font-size:13px">'
      + window._ppModLabel(mod) + ' modu yakında aktif olacak...</div>';
  }
};

window._ppModLabel = function(mod) {
  return {akis:'Akış',calisma:'Çalışma',odak:'Odak',degerlendirme:'Değerlendirme',ceo:'CEO'}[mod] || mod;
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
  var tasks = _ppLoad().filter(function(t){ return !t.isDeleted && t.durum !== 'tamamlandi'; });
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
  var baslik = prompt('Görev başlığı:');
  if (!baslik || !baslik.trim()) return;
  var yeni = { id: _ppId(), baslik: baslik.trim(), oncelik: 'normal', durum: 'plan', createdAt: _ppNow(), updatedAt: _ppNow(), sorumlu: _ppCu()?.displayName || '' };
  var tasks = _ppLoad(); tasks.unshift(yeni); _ppStore(tasks);
  window.toast?.('Görev eklendi', 'ok');
  window._ppModRender();
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
  var msgs = window._ppMesajlariOku(tip);
  var list = document.getElementById('pp-msg-list');
  if (!list) return;
  document.querySelectorAll('[id^="pp-msg-tab-"]').forEach(function(el){ el.style.borderBottom='none'; el.style.fontWeight=''; el.style.color='var(--t3)'; });
  var aktif = document.getElementById('pp-msg-tab-'+tip);
  if (aktif) { aktif.style.borderBottom='2px solid var(--t)'; aktif.style.fontWeight='500'; aktif.style.color='var(--t)'; }
  list.innerHTML = msgs.length ? msgs.map(function(m){ return '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b)"><div style="font-size:10px;font-weight:500;color:var(--t);margin-bottom:3px">'+_ppEsc(m.gonderen)+'</div><div style="font-size:11px;color:var(--t2)">'+_ppEsc(m.icerik)+'</div><div style="font-size:8px;color:var(--t3);margin-top:4px">'+m.tarih+'</div></div>'; }).join('') : '<div style="padding:30px;text-align:center;color:var(--t3);font-size:12px">Mesaj yok</div>';
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
