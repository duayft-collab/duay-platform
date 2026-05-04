/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-actions.js — V170.3.14 POPULATE
   Sorumluluk: State mutator + görev/takvim/toplu/şablon aksiyonları
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-ACTIONS-POPULATE-001
   Mimari karar (A2 — Mini-Cycle 2.1): "State değiştiriyorsa utils değildir"
   Bu modül utils'ten taşınan setter'lar + tüm görev/takvim aksiyonları.
   ──────────────────────────────────────────────────────────────────
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
     UI durum setter'lar (utils'ten taşındı, A2):
       _ppEtiketEkle           L196-209    Yeni etiket ekle
       _ppEtiketleriAl         L210-214    Etiket listesi al
       _ppSetMod               L401-411    Mod değiştir (akis/calisma/odak/takvim/degerlendirme)
       _ppAra                  L1538-1541  Arama state
       _ppSiralaGorevler       L1544-1547  Sıralama state
       _ppCalismaFiltre        L1564-1570  Çalışma filtre
       _ppSidebarSec           L1572-1575  Sidebar seçim
       _ppOncelikDegistir      L1550-1561  Öncelik değiştir + render trigger
     Görev aksiyonları:
       _ppHizliEkle            L1069-1082  Hızlı görev ekle
       _ppTamamla              L1084-1108  Görev tamamla + skor ekle
       _ppGorevSil             L2038-2045  Silme trampoline → _ppGorevSilYap (modal-task)
     Takvim aksiyonları:
       _ppTakvimTamamla        L2532-2541
       _ppTakvimSil            L2543-2554
     Toplu aksiyonlar (multi-select bar):
       _ppTopluTamamla         L4064-4076
       _ppTopluSil             L4081-4101
       _ppTopluDurum           L4106-4128
       _ppTopluDurumUygula     L4253-4265
     Şablon aksiyonları (KX10 'pp_sablonlar'):
       _ppSablonAc             L4136-4162
       _ppSablonKaydet         L4170-4207
       _ppSablonYonet          L4210-4237
       _ppSablonSil            L4239-4247
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.actions (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ KX10: 'pp_sablonlar' (orijinal, ak_pp_ paterni dışında — KX8 birebir korundu)
   ⚠ Bağımlılık: store ✓, core ✓, render-list ✓, modal-task (_ppGorevSilYap) ✓
                 _ppSkorEkle (yasam ✓), confirmModal (global)
   ⚠ FN ÇAKIŞMASI YOK: _ppGorevSilYap modal-task'ta tek tanım
                       Burada sadece _ppGorevSil trampoline (onay modal'ı tetikleyici)
═══════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.actions) window.PusulaPro.actions = {};
  if (window._ppActionsLoaded) return;
  window._ppActionsLoaded = true;

window._ppEtiketEkle = function() {
  var inp = document.getElementById('ppf-etiket-inp');
  if (!inp || !inp.value.trim()) return;
  var list = document.getElementById('ppf-etiket-list');
  if (!list) return;
  var val = inp.value.trim();
  var tag = document.createElement('span');
  tag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:var(--pp-meta);padding:3px 8px;border-radius:var(--pp-r-lg);background:var(--s2);border:0.5px solid var(--b);color:var(--t)';
  tag.dataset.val = val;
  /* XSS-SAFE: statik */
  tag.innerHTML = _ppEsc(val) + '<span onclick="event.stopPropagation();this.parentElement.remove()" style="cursor:pointer;color:var(--t3);font-size:var(--pp-body);line-height:1">×</span>';
  list.appendChild(tag);
  inp.value = '';
};
window._ppEtiketleriAl = function() {
  var list = document.getElementById('ppf-etiket-list');
  if (!list) return [];
  return Array.from(list.querySelectorAll('[data-val]')).map(function(t){ return t.dataset.val; });
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
window._ppHizliEkle = function(inp) {
  if (!inp || !inp.value.trim()) return;
  /* PUSULA-HIZLI-001: öncelik seçicisini oku (yoksa normal) */
  var _oncelikSel = document.getElementById('pp-quick-oncelik');
  var _oncelik = (_oncelikSel && _oncelikSel.value) ? _oncelikSel.value : 'normal';
  /* PUSULA-IZOLASYON-001: hızlı ekle — sahip kaydedilmeden görev tüm kullanıcılara görünüyordu */
  var _cuNow = _ppCu();
  /* PP-GOREV-ATAMA-FIX-001: sorumlu obje dizisi — uid/id/ad ile izolasyon eşleşir */
  var yeni = { id: _ppId(), baslik: inp.value.trim(), oncelik: _oncelik, durum: 'plan', createdAt: _ppNow(), updatedAt: _ppNow(), sorumlu: [{ uid: _cuNow?.uid || _cuNow?.id || _cuNow?.email || '', ad: _cuNow?.displayName || _cuNow?.name || _cuNow?.email || '' }], olusturanId: _cuNow?.uid || String(_cuNow?.id||'') || _cuNow?.email || '', _ppSource: 'pro' };
  var tasks = _ppLoad(); tasks.unshift(yeni); _ppStore(tasks);
  inp.value = '';
  window.toast?.('Görev eklendi', 'ok');
  window._ppModRender();
};

window._ppTamamla = function(id) {
  /* PUSULA-BUG-FIX-001: toggle — tamamlandi ise plan'a geri al */
  var tasks = _ppLoad(); var t = tasks.find(function(x) { return x.id === id; });
  if (!t) return;
  /* PUSULA-PAYLASIM-004: sadece admin durum değiştirebilir */
  if (!_ppIsAdmin()) { window.toast?.('Sadece yönetici durum değiştirebilir', 'err'); return; }
  if (t.durum === 'tamamlandi') {
    t.durumLog = t.durumLog || [];
    t.durumLog.push({ den: 'tamamlandi', e: 'plan', kim: (_ppCu()?.displayName || _ppCu()?.email || '?'), zaman: _ppNow() });
    t.durum = 'plan'; t.updatedAt = _ppNow(); _ppStore(tasks);
    window.toast?.('Tamamlama geri alındı', 'warn');
    setTimeout(function() { window._ppModRender(); }, 200);
    return;
  }
  var bagKontrol = window._ppBagimlilikKontrol?.(id);
  if (bagKontrol && !bagKontrol.gecerli) {
    window.toast?.('Önce tamamlanması gereken: ' + bagKontrol.eksikler.join(', '), 'warn');
    return;
  }
  t.durumLog = t.durumLog || [];
  t.durumLog.push({ den: t.durum, e: 'tamamlandi', kim: (_ppCu()?.displayName || _ppCu()?.email || '?'), zaman: _ppNow() });
  t.durum = 'tamamlandi'; t.updatedAt = _ppNow(); _ppStore(tasks);
  window.toast?.('Tamamlandı ✓', 'ok');
  setTimeout(function() { window._ppModRender(); }, 400);
};
window._ppAra = function(q) {
  window._ppSearchQ = q;
  window._ppModRender();
};

/* PUSULA-GOREV-SIRALA-001: sıralama kriterini set et + re-render */
window._ppSiralaGorevler = function(kriter) {
  window._ppSiralaKriter = kriter;
  window._ppModRender?.();
};
window._ppOncelikDegistir = function(id, yeniOncelik) {
  /* PUSULA-PAYLASIM-004: sadece admin öncelik değiştirebilir */
  if (!_ppIsAdmin()) { window.toast?.('Sadece yönetici öncelik değiştirebilir', 'err'); return; }
  var tasks = _ppLoad();
  var t = tasks.find(function(x) { return String(x.id) === String(id); });
  if (!t) return;
  t.oncelik = yeniOncelik;
  t.updatedAt = new Date().toISOString();
  _ppStore(tasks);
  window.toast?.('"' + (t.baslik || 'Görev') + '" önceliği: ' + yeniOncelik, 'ok');
  window._ppModRender?.();
};
window._ppCalismaFiltre = function(q) {
  q = (q||'').toLowerCase().trim();
  document.querySelectorAll('[id^="pp-tr-"]').forEach(function(row){
    var text = row.textContent.toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
};

window._ppSidebarSec = function(sec) {
  window._ppSidebarAktif = sec;
  window._ppModRender();
};
window._ppGorevSil = function(id) {
  window.confirmModal?.('G\u00f6revi sil?', {
    title: 'G\u00f6rev silinecek',
    danger: true,
    confirmText: 'Sil',
    onConfirm: function() { window._ppGorevSilYap(id); }
  });
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
/**
 * Seçili görevleri toplu olarak tamamlandı işaretle.
 */
window._ppTopluTamamla = function() {
  var ids = Object.keys(window._ppSeciliGorevler||{}).filter(function(k){return window._ppSeciliGorevler[k];});
  if (!ids.length) return;
  var tasks = _ppLoad();
  ids.forEach(function(id) {
    var t = tasks.find(function(x){return String(x.id)===id;});
    if (t) { t.durum = 'tamamlandi'; t.updatedAt = _ppNow(); }
  });
  _ppStore(tasks);
  window._ppSeciliGorevler = {};
  window._ppModRender?.();
  window.toast?.(ids.length + ' görev tamamlandı', 'ok');
};

/**
 * Seçili görevleri toplu olarak soft-delete.
 */
window._ppTopluSil = function() {
  var ids = Object.keys(window._ppSeciliGorevler||{}).filter(function(k){return window._ppSeciliGorevler[k];});
  if (!ids.length) return;
  /* PUSULA-002: native confirm → confirmModal (K06) */
  window.confirmModal(ids.length + ' görevi silmek istediğinize emin misiniz?', {
    title: 'Toplu Görev Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: function() {
      var tasks = _ppLoad();
      ids.forEach(function(id) {
        var t = tasks.find(function(x){return String(x.id)===id;});
        if (t) { t.isDeleted = true; t.updatedAt = _ppNow(); }
      });
      _ppStore(tasks);
      window._ppSeciliGorevler = {};
      window._ppModRender?.();
      window.toast?.(ids.length + ' görev silindi', 'warn');
    }
  });
};

/**
 * Seçili görevlerin durumunu toplu değiştir (prompt ile yeni durum al).
 */
window._ppTopluDurum = function() {
  var ids = Object.keys(window._ppSeciliGorevler||{}).filter(function(k){return window._ppSeciliGorevler[k];});
  if (!ids.length) return;
  // PUSULA-TOPLU-MODAL-001: prompt() yerine mini modal — tema uyumlu, hatasız
  var _durumlar = ['plan','devam','tamamlandi','beklemede'];
  var mevcut = document.getElementById('pp-toplu-durum-modal');
  if (mevcut) { mevcut.remove(); return; }
  var mo = document.createElement('div');
  mo.id = 'pp-toplu-durum-modal';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  /* XSS-SAFE: statik */
  mo.innerHTML = '<div style="background:var(--sf);border-radius:var(--pp-r-md);border:0.5px solid var(--b);padding:20px;min-width:260px">'
    + '<div style="font-size:13px;font-weight:500;color:var(--t);margin-bottom:14px">'+ids.length+' görev için yeni durum:</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
    + _durumlar.map(function(d){
        return '<button onclick="event.stopPropagation();document.getElementById(\'pp-toplu-durum-modal\')?.remove();window._ppTopluDurumUygula(\''+d+'\')" style="padding:8px 14px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t);cursor:pointer;font-family:inherit;font-size:var(--pp-body);text-align:left">'+d+'</button>';
      }).join('')
    + '</div>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'pp-toplu-durum-modal\')?.remove()" style="margin-top:12px;width:100%;padding:6px;border:none;background:transparent;cursor:pointer;color:var(--t3);font-family:inherit;font-size:var(--pp-body)">İptal</button>'
    + '</div>';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
};
/* ── PUSULA-SABLON-001: Görev şablonu yükle/kaydet ─────────── */

/**
 * Kayıtlı şablonu form alanlarına yükle. localStorage 'pp_sablonlar'
 * key'inden oku, index ile seç, form input/select/textarea'larını doldur.
 */
window._ppSablonAc = function(idx) {
  if (idx === '' || idx == null) return;
  var sablonlar = [];
  try { sablonlar = JSON.parse(localStorage.getItem('pp_sablonlar') || '[]'); } catch(e) { console.warn('[PP]', e); }
  var s = sablonlar[parseInt(idx)];
  if (!s) { window.toast?.('Şablon bulunamadı', 'err'); return; }
  var _setVal = function(id, val) {
    var el = document.getElementById('ppf-' + id);
    if (el && val != null) el.value = val;
  };
  _setVal('baslik', s.baslik);
  _setVal('job_id', s.job_id);
  _setVal('departman', s.departman);
  _setVal('oncelik', s.oncelik);
  _setVal('durum', s.durum);
  _setVal('kpi', s.kpi);
  _setVal('basT', s.basT);
  _setVal('bitT', s.bitT);
  _setVal('sure', s.sure);
  _setVal('tekrar', s.tekrar);
  _setVal('tekrarBitis', s.tekrarBitis);
  _setVal('enerji', s.enerji);
  var aciklamaEl = document.getElementById('ppf-aciklama');
  /* XSS-RISK: _esc() zorunlu */
  if (aciklamaEl && s.aciklama != null) aciklamaEl.innerHTML = s.aciklama;
  window.toast?.('Şablon yüklendi: ' + (s.ad || s.baslik || ''), 'ok');
};

/**
 * Mevcut form içeriğini şablon olarak localStorage'a kaydet. Önce
 * kullanıcıdan şablon adı iste (prompt), boş ise iptal. Aynı isimli
 * şablon varsa eski üzerine yazar (isim unique değil — aynı isim
 * listede iki kere çıkabilir ama çakışma yok).
 */
window._ppSablonKaydet = function() {
  var baslik = document.getElementById('ppf-baslik')?.value?.trim();
  if (!baslik) { window.toast?.('Önce görev başlığı gir', 'warn'); return; }
  var ad = prompt('Şablon adı:', baslik);
  if (!ad) return;
  var _getVal = function(id) {
    var el = document.getElementById('ppf-' + id);
    return el ? el.value : '';
  };
  var sablon = {
    ad: ad,
    baslik: baslik,
    job_id: _getVal('job_id'),
    departman: _getVal('departman'),
    oncelik: _getVal('oncelik'),
    durum: _getVal('durum'),
    kpi: _getVal('kpi'),
    basT: _getVal('basT'),
    bitT: _getVal('bitT'),
    sure: _getVal('sure'),
    tekrar: _getVal('tekrar'),
    tekrarBitis: _getVal('tekrarBitis'),
    enerji: _getVal('enerji'),
    /* XSS-SAFE: statik */
    aciklama: document.getElementById('ppf-aciklama')?.innerHTML || '',
    createdAt: _ppNow()
  };
  var sablonlar = [];
  try { sablonlar = JSON.parse(localStorage.getItem('pp_sablonlar') || '[]'); } catch(e) { console.warn('[PP]', e); }
  sablonlar.push(sablon);
  try {
    localStorage.setItem('pp_sablonlar', JSON.stringify(sablonlar));
    window.toast?.('Şablon kaydedildi: ' + ad, 'ok');
  } catch(e) {
    console.warn('[PP] şablon kaydedilemedi:', e);
    window.toast?.('Şablon kaydedilemedi (localStorage hata)', 'err');
  }
};

/* ── PUSULA-SABLON-YONETIM-001: Şablon listesi modal + sil ─────── */
window._ppSablonYonet = function() {
  var sablonlar = [];
  try { sablonlar = JSON.parse(localStorage.getItem('pp_sablonlar')||'[]'); } catch(e){}
  var mo = document.createElement('div');
  mo.id = 'pp-sablon-yonet-modal';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  /* XSS-SAFE: statik */
  mo.innerHTML = '<div style="background:var(--sf);border-radius:var(--pp-r-md);border:0.5px solid var(--b);width:380px;max-height:70vh;overflow:hidden;display:flex;flex-direction:column">'
    + '<div style="padding:14px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
    + '<span style="font-size:13px;font-weight:500;color:var(--t)">Şablonları Yönet</span>'
    + '<button onclick="document.getElementById(\'pp-sablon-yonet-modal\')?.remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="overflow-y:auto;flex:1">'
    + (sablonlar.length === 0 ? '<div style="padding:24px;text-align:center;color:var(--t3);font-size:var(--pp-body)">Henüz şablon yok</div>' :
      sablonlar.map(function(s,i){
        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:0.5px solid var(--b)">'
          + '<div style="flex:1">'
          + '<div style="font-size:var(--pp-body);font-weight:500;color:var(--t)">'+_ppEsc(s.ad||s.baslik||'Şablon '+(i+1))+'</div>'
          + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:2px">'+_ppEsc(s.departman||'')+(s.oncelik?' · '+s.oncelik:'')+'</div>'
          + '</div>'
          + '<button onclick="event.stopPropagation();window._ppSablonSil('+i+')" style="font-size:var(--pp-body);padding:3px 10px;border:0.5px solid #DC2626;border-radius:5px;background:transparent;cursor:pointer;color:#DC2626;font-family:inherit">Sil</button>'
          + '</div>';
      }).join(''))
    + '</div>'
    + '</div>';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
};

window._ppSablonSil = function(idx) {
  var sablonlar = [];
  try { sablonlar = JSON.parse(localStorage.getItem('pp_sablonlar')||'[]'); } catch(e){}
  sablonlar.splice(idx, 1);
  localStorage.setItem('pp_sablonlar', JSON.stringify(sablonlar));
  window.toast?.('Şablon silindi', 'ok');
  document.getElementById('pp-sablon-yonet-modal')?.remove();
  window._ppSablonYonet();
};
window._ppTopluDurumUygula = function(yeniDurum) {
  var ids = Object.keys(window._ppSeciliGorevler||{}).filter(function(k){return window._ppSeciliGorevler[k];});
  if (!ids.length) return;
  var tasks = _ppLoad();
  ids.forEach(function(id) {
    var t = tasks.find(function(x){return String(x.id)===id;});
    if (t) { t.durum = yeniDurum; t.updatedAt = _ppNow(); }
  });
  _ppStore(tasks);
  window._ppSeciliGorevler = {};
  window._ppModRender?.();
  window.toast?.(ids.length + ' görev → ' + yeniDurum, 'ok');
};

  /* ── V170.3.14 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppSetMod) {
    Object.assign(window, {
      _ppEtiketEkle: window._ppEtiketEkle,
      _ppEtiketleriAl: window._ppEtiketleriAl,
      _ppSetMod: window._ppSetMod,
      _ppHizliEkle: window._ppHizliEkle,
      _ppTamamla: window._ppTamamla,
      _ppAra: window._ppAra,
      _ppSiralaGorevler: window._ppSiralaGorevler,
      _ppOncelikDegistir: window._ppOncelikDegistir,
      _ppCalismaFiltre: window._ppCalismaFiltre,
      _ppSidebarSec: window._ppSidebarSec,
      _ppGorevSil: window._ppGorevSil,
      _ppTakvimTamamla: window._ppTakvimTamamla,
      _ppTakvimSil: window._ppTakvimSil,
      _ppTopluTamamla: window._ppTopluTamamla,
      _ppTopluSil: window._ppTopluSil,
      _ppTopluDurum: window._ppTopluDurum,
      _ppTopluDurumUygula: window._ppTopluDurumUygula,
      _ppSablonAc: window._ppSablonAc,
      _ppSablonKaydet: window._ppSablonKaydet,
      _ppSablonYonet: window._ppSablonYonet,
      _ppSablonSil: window._ppSablonSil
    });
  }

  /* ── V170.3.14 CANONICAL PusulaPro.actions EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.actions, {
    _ppEtiketEkle: window._ppEtiketEkle,
    _ppEtiketleriAl: window._ppEtiketleriAl,
    _ppSetMod: window._ppSetMod,
    _ppHizliEkle: window._ppHizliEkle,
    _ppTamamla: window._ppTamamla,
    _ppAra: window._ppAra,
    _ppSiralaGorevler: window._ppSiralaGorevler,
    _ppOncelikDegistir: window._ppOncelikDegistir,
    _ppCalismaFiltre: window._ppCalismaFiltre,
    _ppSidebarSec: window._ppSidebarSec,
    _ppGorevSil: window._ppGorevSil,
    _ppTakvimTamamla: window._ppTakvimTamamla,
    _ppTakvimSil: window._ppTakvimSil,
    _ppTopluTamamla: window._ppTopluTamamla,
    _ppTopluSil: window._ppTopluSil,
    _ppTopluDurum: window._ppTopluDurum,
    _ppTopluDurumUygula: window._ppTopluDurumUygula,
    _ppSablonAc: window._ppSablonAc,
    _ppSablonKaydet: window._ppSablonKaydet,
    _ppSablonYonet: window._ppSablonYonet,
    _ppSablonSil: window._ppSablonSil
  });
})();
