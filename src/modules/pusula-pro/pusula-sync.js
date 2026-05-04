/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-sync.js — V170.3.6 POPULATE
   Sorumluluk: Yedekleme + Excel/JSON Export-Import
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-SYNC-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       _ppExport         L319-335   Eski Pusula yedek JSON download
       _ppExcelExport    L3968-4016 6 bölüm Excel (XLSX SDK lazy-load)
       _ppYedekPaneli    L4018-4055 Yedek modalı (5 buton + tam yedek)
       _ppExcelImport    L4267-4316 Excel içe aktarma (admin only, XLSX)
       _ppJSONImport     L4317-4352 JSON içe aktarma (admin only, 2 format)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.sync (nested core ekosistem)
   ⚠ DEFENSIVE: toplu guard (Object.assign atlanır, eski tanım korunur)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ Bağımlılık: window._ppLoad/_ppStore (store ✓ Cycle 3.2.4)
                 window._ppEsc, _ppNow, _ppToday, _ppId (core ✓ Cycle 3.1)
                 window._ppIsAdmin (core ✓ Cycle 3.1)
                 window._ppTakvimLoad/Store (store ✓ Cycle 3.2.4)
                 window._ppGoalLoad/HabitLoad (yasam ✓ Cycle 3.2.2)
                 window._ppMesajlariOku (iletisim ✓ Cycle 3.2.3)
                 XLSX (global SDK, lazy CDN load + typeof guard orijinalde)
   ⚠ DOM: _ppYedekPaneli modal oluşturur, _ppExcelExport CDN script enjeksiyonu
   ⚠ ADMIN-GATE: _ppExcelImport ve _ppJSONImport _ppIsAdmin() kontrolü
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.sync) window.PusulaPro.sync = {};
  if (window._ppSyncLoaded) return;
  window._ppSyncLoaded = true;

/* ── Eski Pusula Export ─────────────────────────────────────── */
window._ppExport = function() {
  try {
    var raw = localStorage.getItem(PP_TASK_KEY) || '[]';
    var tasks = raw.startsWith('_LZ_') && typeof LZString!=='undefined'
      ? JSON.parse(LZString.decompressFromUTF16(raw.slice(4))||'[]')
      : JSON.parse(raw);
    // PUSULA-IMPORT-FORMAT-FIX-001: export anahtarı 'gorevler' (import'un birincil formatı ile uyumlu)
    var blob = new Blob([JSON.stringify({export_date:new Date().toISOString(),count:tasks.length,gorevler:tasks},null,2)],{type:'application/json'});
    var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='pusula_yedek_'+_ppToday()+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.toast?.('Yedek indirildi — '+tasks.length+' görev','ok');
  } catch(e) { window.toast?.('Export hatası: '+e.message,'err'); }
};

/* ── Panel Render ───────────────────────────────────────────── */
/**
 * PUSULA-EXCEL-EXPORT-001
 * Pusula Pro verilerini Excel (.xlsx) formatında dışa aktarır. XLSX
 * kütüphanesi yüklü değilse CDN'den yükler, sonra tekrar kendini çağırır.
 * @param {string} bolum 'gorevler' | 'takvim' | 'hedefler' | 'aliskanliklar' | 'notlar' | 'tamyedek'
 */
window._ppExcelExport = function(bolum) {
  if (typeof XLSX === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function() { window._ppExcelExport(bolum); };
    document.head.appendChild(s);
    window.toast?.('Excel hazırlanıyor...', 'info');
    return;
  }
  var tarih = new Date().toISOString().slice(0,10).replace(/-/g,'');
  var _temizle = function(arr) {
    return (arr||[]).filter(function(r){return !r.isDeleted;}).map(function(r){
      var o={};
      Object.keys(r).forEach(function(k){
        var v=r[k];
        if(Array.isArray(v)) o[k]=v.map(function(x){return typeof x==='object'?(x.ad||x.name||x.displayName||JSON.stringify(x)):x;}).join(', ');
        else if(typeof v==='object'&&v!==null) o[k]=JSON.stringify(v);
        else o[k]=v;
      });
      return o;
    });
  };
  var bolumler = {
    gorevler: function(){ return _temizle(typeof _ppLoad==='function'?_ppLoad():[]) },
    takvim: function(){ return _temizle(typeof _ppTakvimLoad==='function'?_ppTakvimLoad():[]) },
    hedefler: function(){ return _temizle(typeof window._ppGoalLoad==='function'?window._ppGoalLoad():[]) },
    aliskanliklar: function(){ return _temizle(typeof window._ppHabitLoad==='function'?window._ppHabitLoad():[]) },
    notlar: function(){ return _temizle(typeof window._ppNotlarLoad==='function'?window._ppNotlarLoad():[]) }
  };
  var wb = XLSX.utils.book_new();
  if (bolum === 'tamyedek') {
    Object.keys(bolumler).forEach(function(b){
      var d = bolumler[b]();
      if(d.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), b);
    });
    XLSX.writeFile(wb, 'PusulaPro_TamYedek_'+tarih+'.xlsx');
  } else if (bolumler[bolum]) {
    var data = bolumler[bolum]();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.length?data:[{bilgi:'Veri yok'}]), bolum);
    XLSX.writeFile(wb, 'PusulaPro_'+bolum+'_'+tarih+'.xlsx');
  }
  window.toast?.('Excel hazırlandı ✓', 'ok');
};
/**
 * PUSULA-EXCEL-EXPORT-001
 * Yedek alma panel modalı — 5 bölüm butonu + tam yedek butonu.
 */
window._ppYedekPaneli = function() {
  var mevcut = document.getElementById('pp-yedek-modal');
  if (mevcut) { mevcut.remove(); return; }
  var mo = document.createElement('div');
  mo.id = 'pp-yedek-modal';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };
  var _btn = function(lbl, bolum, tam) {
    return '<button onclick="event.stopPropagation();window._ppExcelExport(\''+bolum+'\')" style="padding:10px 14px;border:0.5px solid var(--b);border-radius:7px;background:'+(tam?'var(--t)':'var(--sf)')+';color:'+(tam?'var(--sf)':'var(--t)')+';font-size:var(--pp-body);font-weight:'+(tam?'600':'400')+';cursor:pointer;font-family:inherit;text-align:left">'+lbl+'</button>';
  };
  /* XSS-SAFE: statik */
  mo.innerHTML = '<div style="background:var(--sf);border-radius:var(--pp-r-lg);border:0.5px solid var(--b);width:420px;padding:24px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    +'<div style="font-size:15px;font-weight:500;color:var(--t)">Yedek Al / Dışa Aktar</div>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'pp-yedek-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3)">×</button></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
    +_btn('📋 Görevler','gorevler')
    +_btn('📅 Takvim Etkinlikleri','takvim')
    +_btn('🎯 Hedefler','hedefler')
    +_btn('🔄 Alışkanlıklar','aliskanliklar')
    +_btn('📝 Notlar','notlar')
    +'</div>'
    +'<button onclick="event.stopPropagation();window._ppExcelExport(\'tamyedek\')" style="width:100%;padding:11px;border:none;border-radius:7px;background:var(--t);color:var(--sf);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:12px">⬇ Tüm Verileri İndir (Tam Yedek)</button>'
    // PUSULA-IMPORT-001: admin için import bölümü (Excel + JSON)
    + (_ppIsAdmin() ? '<div style="border-top:0.5px solid var(--b);margin-top:14px;padding-top:14px"><div style="font-size:var(--pp-meta);font-weight:500;color:var(--t);margin-bottom:8px">İçe Aktar <span style="font-size:var(--pp-meta);color:var(--pp-warn);background:#FAEEDA;padding:1px 6px;border-radius:3px;margin-left:4px">Yalnızca Admin</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label style="padding:8px 12px;border:0.5px solid var(--b);border-radius:7px;cursor:pointer;font-size:var(--pp-body);color:var(--t2);text-align:center;background:var(--s2)">📊 Excel İçe Aktar<input type="file" accept=".xlsx,.xls" style="display:none" onchange="event.stopPropagation();window._ppExcelImport(this)"></label><label style="padding:8px 12px;border:0.5px solid var(--b);border-radius:7px;cursor:pointer;font-size:var(--pp-body);color:var(--t2);text-align:center;background:var(--s2)">{ } JSON İçe Aktar<input type="file" accept=".json" style="display:none" onchange="event.stopPropagation();window._ppJSONImport(this)"></label></div></div>' : '')
    +'<div style="font-size:var(--pp-meta);color:var(--t3);text-align:center">Veriler .xlsx formatında indirilir</div>'
    +'</div>';
  document.body.appendChild(mo);
  setTimeout(function(){ mo.classList.add('open'); }, 10);
};

/* ── PUSULA-TOPLU-001: Toplu seçim/işlem handler'ları ────────── */

/**
/* ── PUSULA-IMPORT-001: Excel + JSON içe aktarma (admin only) ── */

/**
 * Excel dosyası yükleyip görev ve takvim kayıtlarını içe aktarır.
 * XLSX kütüphanesi yoksa CDN'den yüklenir, sonra tekrar çağrılır.
 * Sayfa adları 'gorevler' ve 'takvim' olanlar işlenir. Mevcut kayıtların
 * ID'leri yeni gelenlerle çakışırsa eski hali silinip yeni hali kalır
 * (upsert, tombstone yok — dikkatli kullanım).
 */
window._ppExcelImport = function(input) {
  if (!_ppIsAdmin()) { window.toast?.('Sadece admin içe aktarabilir', 'err'); return; }
  var file = input?.files?.[0]; if (!file) return;
  if (typeof XLSX === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function(){ window._ppExcelImport(input); };
    document.head.appendChild(s);
    window.toast?.('Excel hazırlanıyor...', 'info');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'binary'});
      var ozet = [];
      wb.SheetNames.forEach(function(sheet) {
        var data = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
        if (!data.length) return;
        var key = sheet.toLowerCase();
        if (key === 'gorevler') {
          var mevcut = _ppLoad();
          var yeniIds = new Set(data.map(function(r){return String(r.id||'');}));
          var birlesmis = mevcut.filter(function(t){return !yeniIds.has(String(t.id));}).concat(data);
          _ppStore(birlesmis); ozet.push('Görevler: '+data.length+' kayıt');
        } else if (key === 'takvim') {
          var mevcut2 = typeof _ppTakvimLoad==='function'?_ppTakvimLoad():[];
          var yeniIds2 = new Set(data.map(function(r){return String(r.id||'');}));
          var birlesmis2 = mevcut2.filter(function(t){return !yeniIds2.has(String(t.id));}).concat(data);
          if(typeof _ppTakvimStore==='function') _ppTakvimStore(birlesmis2);
          ozet.push('Takvim: '+data.length+' kayıt');
        }
      });
      window.toast?.(ozet.join(' · ')||'İçe aktarıldı','ok');
      document.getElementById('pp-yedek-modal')?.remove();
      window._ppModRender?.();
    } catch(err){ window.toast?.('Excel hatası: '+err.message,'err'); }
  };
  reader.readAsBinaryString(file);
};

/**
 * JSON dosyası yükleyip görev/takvim verisini içe aktarır. İki format
 * desteklenir:
 * - Düz array → görev listesi (upsert ID bazlı)
 * - Object { gorevler, takvim } → iki koleksiyon ayrı işlenir (replace)
 */
window._ppJSONImport = function(input) {
  if (!_ppIsAdmin()) { window.toast?.('Sadece admin içe aktarabilir','err'); return; }
  var file = input?.files?.[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var ozet = [];
      if (Array.isArray(data)) {
        var mevcut = _ppLoad();
        var yeniIds = new Set(data.map(function(r){return String(r.id||'');}));
        _ppStore(mevcut.filter(function(t){return !yeniIds.has(String(t.id));}).concat(data));
        ozet.push('Görevler: '+data.length);
      } else if (data.gorevler || data.takvim || data.tasks) {
        // PUSULA-IMPORT-FORMAT-FIX-001: data.tasks fallback (eski export formatı uyumlu)
        if ((data.gorevler || data.tasks) && Array.isArray(data.gorevler || data.tasks)) {
          var _gList = data.gorevler || data.tasks;
          _ppStore(_gList); ozet.push('Görevler: ' + _gList.length);
        }
        if (data.takvim && Array.isArray(data.takvim) && typeof _ppTakvimStore==='function') {
          _ppTakvimStore(data.takvim); ozet.push('Takvim: '+data.takvim.length);
        }
      } else { window.toast?.('Tanımlanamayan JSON formatı','warn'); return; }
      window.toast?.(ozet.join(' · ')||'İçe aktarıldı','ok');
      document.getElementById('pp-yedek-modal')?.remove();
      window._ppModRender?.();
    } catch(err){ window.toast?.('JSON hatası: '+err.message,'err'); }
  };
  reader.readAsText(file);
};

  /* ── V170.3.6 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppExport) {
    Object.assign(window, {
      _ppExport: window._ppExport,
      _ppExcelExport: window._ppExcelExport,
      _ppYedekPaneli: window._ppYedekPaneli,
      _ppExcelImport: window._ppExcelImport,
      _ppJSONImport: window._ppJSONImport
    });
  }

  /* ── V170.3.6 CANONICAL PusulaPro.sync EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.sync, {
    _ppExport: window._ppExport,
    _ppExcelExport: window._ppExcelExport,
    _ppYedekPaneli: window._ppYedekPaneli,
    _ppExcelImport: window._ppExcelImport,
    _ppJSONImport: window._ppJSONImport
  });
})();
