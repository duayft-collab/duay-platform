/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-modal-task.js — V170.3.11 POPULATE (FIX)
   Sorumluluk: Görev oluştur/düzenle/sil modali + alt görev + dosya + paylaşım
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-MODAL-TASK-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       _ppYeniGorev          L1110-1296  Görev oluştur modali (187 satır)
       _ppPaylasimSecili     L1299       Paylaşım seçim state
       _ppPaylasimFiltre     L1301-1338  Paylaşım combobox filtre
       _ppPaylasimToggle     L1340-1346  Paylaşım toggle
       _ppAltGorevler        L1348       Alt görev state
       _ppAltGorevEkle       L1380-1385
       _ppAltGorevSil        L1386-1389
       _ppDosyaEkleri        L1910       Dosya eki state
       _ppDosyaEkle          L1912-1930
       _ppDosyaListGuncelle  L1932-1957  FIX: dosya listesi UI guncel (_ppDosyaSil çağırır)
       _ppDosyaSil           L1959-1962
       _ppGorevSilYap        L2047-2075  Silme onay modalı
       _ppGorevDuzenle       L2077-2115  Düzenleme modalı
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.modalTask (nested)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ STATE: _ppPaylasimSecili, _ppAltGorevler, _ppDosyaEkleri (3 array)
   ⚠ ATLANDI (actions.js'e Cycle 3.2.13):
       _ppHizliEkle, _ppTamamla, _ppGorevSil
   ⚠ Bağımlılık: store ✓, core ✓, _ppAltGorevRender (render-detail ✓)
                 _ppModRender (render-list ✓), toast, _ppEs
   ⚠ FIX NOTU: İlk POPULATE'da _ppDosyaListGuncelle eksikti — _ppDosyaSil'in
              bağımlılığı runtime test ile tespit edildi, eklendi.
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.modalTask) window.PusulaPro.modalTask = {};
  if (window._ppModalTaskLoaded) return;
  window._ppModalTaskLoaded = true;

window._ppYeniGorev = function() {
  /* PUSULA-MODAL-HEDEF-FIX-001: modal toggle sırasında eski düzenleme hedefini temizle */
  var mevcut = document.getElementById('pp-gorev-modal'); if(mevcut){ mevcut.remove(); window._ppDuzenleHedef=null; return; }
  var ekip = (typeof window.loadUsers === 'function' ? window.loadUsers() : []).filter(function(u) { return !u.isDeleted; }).map(function(u) { return { val: u.uid || u.id, lbl: u.displayName || u.ad || u.name || u.email || '?' }; });
  if (!ekip.length) ekip = [{ val: '', lbl: 'Baran A.' }, { val: '', lbl: 'Ayşe Y.' }, { val: '', lbl: 'Mehmet K.' }];
  var kpiler = ['—','KPI-01 Satış Hedefi','KPI-02 Nakit Akışı','KPI-03 Satınalma','KPI-07 SGK/Ödemeler'];
  // PUSULA-JOBID-KAYNAK-001: Job ID SADECE resmi Job kaydından alınır.
  // ak_tk2 eski sistem localStorage, _ppLoad() PusulaPro kendi görevleri — ikisi de
  // Job kaynağı değil. PusulaPro görev kendi job_id üretmez, var olan bir Job'a bağlanır.
  // PUSULA-SABLON-001: kayıtlı şablonlar yüklenir (localStorage 'pp_sablonlar')
  var _ppSablonlar = [];
  try { _ppSablonlar = JSON.parse(localStorage.getItem('pp_sablonlar') || '[]'); } catch(e) { _ppSablonlar = []; }
  var _sablonOpts = '<option value="">— Şablon seç —</option>';
  _ppSablonlar.forEach(function(s, i) {
    _sablonOpts += '<option value="'+i+'">'+_ppEsc(s.ad || s.baslik || ('Şablon '+(i+1)))+'</option>';
  });
  var jobOpts = '<option value="">— Job ID seç —</option>';
  try {
    var _jobList = [];
    var _resmiJobs = typeof window.loadTasks === 'function' ? window.loadTasks() : [];
    _resmiJobs.forEach(function(t) {
      var jid = t.jobId || t.job_id || t.id;
      if (jid && _jobList.indexOf(jid) === -1 && !t.isDeleted) _jobList.push(jid);
    });
    if (_jobList.length) {
      _jobList.sort().forEach(function(j) {
        jobOpts += '<option value="'+j+'">'+j+'</option>';
      });
    } else {
      jobOpts += '<option value="" disabled>Henüz Job kaydı yok</option>';
    }
  } catch(e) { console.warn('[PP]', e); }
  var mo = document.createElement('div'); mo.id='pp-gorev-modal';
  mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:30px 0;overflow-y:auto';
  mo.onclick=function(e){if(e.target===mo)mo.remove();};
  var _sel=function(id,lbl,opts,bg){ return '<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">'+lbl+'</div><select id="ppf-'+id+'" onclick="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:'+(bg||'var(--s2)')+';color:var(--t);font-family:inherit">'+opts+'</select></div>'; };
  var _inp=function(id,lbl,type,ph){ return '<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">'+lbl+'</div><input id="ppf-'+id+'" type="'+(type||'text')+'" placeholder="'+(ph||'')+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'; };
  /* XSS-SAFE: statik */
  mo.innerHTML='<div style="background:var(--sf);border-radius:var(--pp-r-lg);border:0.5px solid var(--b);width:620px;overflow:hidden">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b);gap:8px">'
    +'<div style="font-size:14px;font-weight:500;color:var(--t);flex-shrink:0">Yeni Görev</div>'
    // PUSULA-SABLON-001: şablon yükle dropdown + "Şablon Olarak Kaydet" butonu
    +'<div style="display:flex;align-items:center;gap:6px;flex:1;justify-content:flex-end">'
    +'<select id="ppf-sablon" onchange="event.stopPropagation();window._ppSablonAc?.(this.value)" onclick="event.stopPropagation()" style="font-size:var(--pp-meta);padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t2);font-family:inherit;max-width:180px" title="Kayıtlı şablondan yükle">'+_sablonOpts+'</select>'
    +'<button onclick="event.stopPropagation();window._ppSablonKaydet?.()" style="font-size:var(--pp-meta);padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit" title="Bu formu şablon olarak kaydet">💾 Şablon</button>'
    +'<button onclick="event.stopPropagation();window._ppSablonYonet()" style="font-size:var(--pp-meta);padding:4px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">⚙ Yönet</button>'
    +'</div>'
    +'<button onclick="event.stopPropagation();window._ppDuzenleHedef=null;document.getElementById(\'pp-gorev-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1;flex-shrink:0">×</button></div>'
    /* PP-GOREV-VISUAL-002: hero banner — öncelik bazlı gradient + label */
    +'<div id="pp-gorev-hero" style="height:50px;background:linear-gradient(135deg, #E6F1FB 0%, #CCE0F4 100%);display:flex;align-items:center;justify-content:flex-end;padding:0 20px;border-bottom:0.5px solid var(--b)">'
    +'<span id="pp-gorev-hero-label" style="font-size:var(--pp-meta);color:var(--t2);font-weight:500;letter-spacing:.06em">NORMAL ÖNCELİK</span>'
    +'</div>'
    +'<div style="padding:20px;display:flex;flex-direction:column;gap:14px">'
    /* PP-GOREV-VISUAL-001: emoji picker chip row */
    +'<div style="display:flex;align-items:center;gap:6px;padding:4px 0">'
    +'<input type="hidden" id="ppf-emoji" value="📋">'
    +'<span style="font-size:var(--pp-meta);color:var(--t3);letter-spacing:.06em;font-weight:500;margin-right:4px">İKON</span>'
    +['📋','🎯','🚀','💡','🐛','📞','✅','⚡'].map(function(e){var aktif=(e==='📋');return '<button class="pp-emoji-chip" data-emoji="'+e+'" type="button" onclick="event.stopPropagation();window._ppEmojiSec(\''+e+'\')" style="padding:4px 8px;border:1px solid '+(aktif?'var(--t)':'var(--b)')+';border-radius:5px;background:'+(aktif?'var(--sf)':'transparent')+';cursor:pointer;font-size:14px;font-family:inherit">'+e+'</button>';}).join('')
    +'</div>'
    +'<input id="ppf-baslik" placeholder="Görev başlığı..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="font-size:15px;font-weight:500;padding:8px 0;border:none;border-bottom:2px solid var(--bm);border-radius:0;background:transparent;width:100%;color:var(--t);font-family:inherit;outline:none">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +'<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">JOB ID</div>'
    +'<input id="ppf-job_id" placeholder="JOB-2026-XXXX" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
    +_sel('departman','DEPARTMAN','<option>Satış</option><option>Satınalma</option><option>Operasyon</option><option>Finans</option><option>İK</option>')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    /* PUSULA-FORM-V2-001: öncelik görsel pill seçici */
    +'<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:7px;font-weight:500">ÖNCELİK</div>'
    +'<div id="ppf-oncelik-pills" style="display:flex;gap:5px">'
    +'<button type="button" data-val="kritik" onclick="event.stopPropagation();window._ppOncelikSec(this,\'kritik\')" style="flex:1;padding:6px 0;border-radius:var(--pp-r-sm);border:1.5px solid var(--pp-err);background:transparent;color:var(--pp-err);font-size:var(--pp-body);font-weight:500;cursor:pointer;font-family:inherit">Kritik</button>'
    +'<button type="button" data-val="yuksek" onclick="event.stopPropagation();window._ppOncelikSec(this,\'yuksek\')" style="flex:1;padding:6px 0;border-radius:var(--pp-r-sm);border:1.5px solid #BA7517;background:transparent;color:#BA7517;font-size:var(--pp-body);font-weight:500;cursor:pointer;font-family:inherit">Yüksek</button>'
    +'<button type="button" data-val="normal" onclick="event.stopPropagation();window._ppOncelikSec(this,\'normal\')" style="flex:1;padding:6px 0;border-radius:var(--pp-r-sm);border:1.5px solid var(--pp-info);background:var(--pp-info);color:#fff;font-size:var(--pp-body);font-weight:500;cursor:pointer;font-family:inherit">Normal</button>'
    +'<button type="button" data-val="dusuk" onclick="event.stopPropagation();window._ppOncelikSec(this,\'dusuk\')" style="flex:1;padding:6px 0;border-radius:var(--pp-r-sm);border:1.5px solid var(--b);background:transparent;color:var(--t2);font-size:var(--pp-body);cursor:pointer;font-family:inherit">Düşük</button>'
    +'</div><input type="hidden" id="ppf-oncelik" value="normal"></div>'
    +_sel('durum','DURUM','<option value="plan" selected>Plan</option><option value="devam">Devam</option><option value="bekliyor">Bekliyor</option>')
    +_sel('kpi','KPI BAĞLA',kpiler.map(function(k){return '<option>'+k+'</option>';}).join(''))
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    +_inp('basT','BAŞLANGIÇ','date','')
    +_inp('bitT','BİTİŞ TARİHİ','date','')
    +_inp('sure','TAHMİNİ SÜRE','text','örn: 90 dk')
    +'</div>'
    // PUSULA-TEKRAR-001: tekrar seçimi (periyot + bitiş tarihi)
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">TEKRAR</div>'
    + '<select id="ppf-tekrar" onclick="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t);font-family:inherit">'
    + '<option value="">Tekrar yok</option><option value="gunluk">Her gün</option><option value="haftalik">Her hafta</option><option value="aylik">Her ay</option><option value="uc_aylik">Her 3 ayda bir</option><option value="yillik">Her yıl</option>'
    + '</select></div>'
    + '<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">TEKRAR BİTİŞ</div>'
    + '<input id="ppf-tekrarBitis" type="date" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'
    + '</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
    +'<div>'
    +'<div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:5px;font-weight:500">SORUMLU <span style="font-weight:400;font-size:var(--pp-meta)">(birden fazla eklenebilir)</span></div>'
    +window._ppUserTagHTML('ppf-sorumlu','Kullanıcı adı yaz...')
    +'</div>'
    +'<div>'
    +'<div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:5px;font-weight:500">GÖZLEMCİ <span style="font-weight:400;font-size:var(--pp-meta)">(birden fazla eklenebilir)</span></div>'
    +window._ppUserTagHTML('ppf-gozlemci','Kullanıcı adı yaz...')
    +'</div>'
    +_sel('enerji','ENERJİ','<option value="yuksek">Yüksek</option><option value="orta" selected>Orta</option><option value="dusuk">Düşük</option>')
    +'</div>'
    /* PUSULA-GOREV-GIZLILIK-COMBO-001: aranabilir combobox (eski checkbox listesi yerine) */
    +'<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">PAYLAŞIM <span style="font-weight:400;font-size:var(--pp-meta)">(boş = sadece sen görürsün)</span></div>'
    +'<div style="position:relative">'
    +'<input id="pp-paylasim-ara" placeholder="Kişi ara..." onclick="event.stopPropagation()" oninput="event.stopPropagation();window._ppPaylasimFiltre(this.value)" onfocus="event.stopPropagation();window._ppPaylasimFiltre(this.value)" onkeydown="event.stopPropagation()" style="width:100%;padding:6px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm) 6px 0 0;font-size:var(--pp-body);font-family:inherit;background:var(--s2);color:var(--t);box-sizing:border-box">'
    +'<div id="pp-paylasim-liste" style="max-height:120px;overflow-y:auto;border:0.5px solid var(--b);border-top:none;border-radius:0 0 6px 6px;background:var(--sf)"></div>'
    +'<div id="pp-paylasim-secili" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px"></div>'
    +'</div></div>'
    +'<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">AÇIKLAMA / ARAŞTIRMA NOTU</div>'
    +'<div style="display:flex;gap:2px;padding:5px 8px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm) 6px 0 0;background:var(--s2);border-bottom:none">'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'bold\')" style="font-size:var(--pp-body);padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-weight:700;font-family:inherit">B</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'italic\')" style="font-size:var(--pp-body);padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-style:italic;font-family:inherit">I</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'underline\')" style="font-size:var(--pp-body);padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;text-decoration:underline;font-family:inherit">U</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'insertUnorderedList\')" style="font-size:var(--pp-body);padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-family:inherit">• Liste</button>'
    +'<button type="button" onclick="event.stopPropagation();document.execCommand(\'insertOrderedList\')" style="font-size:var(--pp-body);padding:3px 7px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);cursor:pointer;font-family:inherit">1. Liste</button>'
    +'</div>'
    +'<div id="ppf-aciklama" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="window._ppGorevMentionDetect?.(event)" onblur="setTimeout(function(){window._ppGorevMentionKapat?.();},200)" style="min-height:80px;padding:10px;border:0.5px solid var(--b);border-radius:0 0 6px 6px;background:var(--s2);font-size:var(--pp-body);color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
    +'</div>'
    /* PUSULA-FORM-V2-001: Etiket sistemi */
    +'<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:7px;font-weight:500">ETİKETLER</div>'
    +'<div id="ppf-etiket-list" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>'
    +'<div style="display:flex;gap:5px"><input id="ppf-etiket-inp" placeholder="Etiket ekle, Enter ile onayla..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){event.preventDefault();window._ppEtiketEkle()}" style="flex:1;font-size:var(--pp-body);padding:5px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-family:inherit;color:var(--t)"><button onclick="event.stopPropagation();window._ppEtiketEkle()" style="font-size:var(--pp-meta);padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">Ekle</button></div></div>'
    +'<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">ALT GÖREVLER</div>'
    +'<div id="ppf-altGorevList" style="border:0.5px solid var(--b);border-radius:var(--pp-r-sm);overflow:hidden;background:var(--s2)"></div>'
    +'<div style="display:flex;gap:6px;margin-top:6px"><input id="ppf-altYeni" placeholder="+ Alt görev ekle..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){event.preventDefault();window._ppAltGorevEkle()}" style="flex:1;font-size:var(--pp-body);padding:5px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-family:inherit;color:var(--t)">'
    +'<button onclick="event.stopPropagation();window._ppAltGorevEkle()" style="font-size:var(--pp-meta);padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit">Ekle</button></div></div>'
    +'<div><div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:5px;font-weight:500">DOSYA EKİ (PDF, Excel, JPG — maks 5MB)</div>'
    +'<div id="ppf-dosya-list" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px"></div>'
    +'<label style="display:inline-flex;align-items:center;gap:6px;font-size:var(--pp-body);padding:6px 12px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t2);background:var(--s2)">'
    +'<svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M7 1v8M4 4l3-3 3 3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
    +'Dosya Seç <input type="file" id="ppf-dosya" multiple accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png" style="display:none" onchange="event.stopPropagation();window._ppDosyaEkle(this)"></label>'
    +'</div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">'
    +'<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:var(--pp-body);color:var(--t2)"><input type="checkbox" id="ppf-frog" onclick="event.stopPropagation()" style="width:13px;height:13px">Bu görevi bugünün Frogu yap</label>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="event.stopPropagation();window._ppDuzenleHedef=null;document.getElementById(\'pp-gorev-modal\')?.remove()" style="font-size:var(--pp-body);padding:7px 16px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>'
    +'<button onclick="event.stopPropagation();window._ppGorevKaydet()" style="font-size:var(--pp-body);padding:7px 20px;border:none;border-radius:var(--pp-r-sm);background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
    +'</div></div></div>';
  document.body.appendChild(mo);
  setTimeout(function() {
    document.getElementById('ppf-baslik')?.focus();
    /* PUSULA-GOREV-GIZLILIK-COMBO-001: düzenleme restore + combobox ilk render */
    window._ppPaylasimSecili = [];
    if (window._ppDuzenleHedef) {
      try {
        var _mev = _ppLoad().find(function(t) { return String(t.id) === String(window._ppDuzenleHedef); });
        if (_mev && Array.isArray(_mev.paylasilanlar) && _mev.paylasilanlar.length) {
          window._ppPaylasimSecili = _mev.paylasilanlar.slice();
        }
      } catch (e) { console.warn('[PUSULA-GIZLILIK-EDIT]', e.message); }
    }
    window._ppPaylasimFiltre?.('');
  }, 100);
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
  /* PUSULA-BUG-FIX-001: düzenleme modunda mevcut dosyaları form'a yükle */
  if (window._ppDuzenleHedef) {
    setTimeout(function() {
      try {
        var _mevD = _ppLoad().find(function(t){ return String(t.id)===String(window._ppDuzenleHedef); });
        if (_mevD && Array.isArray(_mevD.dosyalar) && _mevD.dosyalar.length) {
          window._ppDosyaEkleri = _mevD.dosyalar.slice();
          window._ppDosyaListGuncelle?.();
        }
        if (_mevD && Array.isArray(_mevD.altGorevler) && _mevD.altGorevler.length) {
          window._ppAltGorevler = _mevD.altGorevler.map(function(ag){ return Object.assign({}, ag); });
          window._ppAltGorevListGuncelle?.();
        }
      } catch(e) { console.warn('[PP-RESTORE]', e.message); }
    }, 150);
  }
};
/* PUSULA-GOREV-GIZLILIK-COMBO-001: paylaşım combobox state + filtre + toggle */
window._ppPaylasimSecili = window._ppPaylasimSecili || [];
window._ppPaylasimFiltre = function(q) {
  var liste = document.getElementById('pp-paylasim-liste');
  if (!liste) return;
  var kl = typeof window._ppKullanicilar === 'function' ? window._ppKullanicilar() : [];
  var qLow = (q || '').toLowerCase();
  var fil = kl.filter(function(k) {
    var n = k.displayName || k.name || k.email || '';
    return n.toLowerCase().indexOf(qLow) !== -1;
  });
  if (!fil.length) {
    /* XSS-SAFE: statik */
    liste.innerHTML = '<div style="padding:6px 10px;font-size:var(--pp-meta);color:var(--t3)">Kişi yok</div>';
  } else {
    /* XSS-SAFE: statik */
    liste.innerHTML = fil.slice(0, 20).map(function(k) {
      var n = k.displayName || k.name || k.email || '—';
      var uid = k.uid || k.email || '';
      var secili = window._ppPaylasimSecili.indexOf(uid) !== -1;
      return '<div onclick="event.stopPropagation();window._ppPaylasimToggle(\'' + String(uid).replace(/'/g, '\\\'') + '\')" style="padding:5px 10px;font-size:var(--pp-meta);cursor:pointer;color:var(--t);background:' + (secili ? 'var(--s2)' : 'transparent') + '" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'' + (secili ? 'var(--s2)' : 'transparent') + '\'">' + (secili ? '✓ ' : '') + _ppEsc(n) + '</div>';
    }).join('');
  }
  /* Seçili chip'leri yeniden render */
  var sec = document.getElementById('pp-paylasim-secili');
  if (sec) {
    if (!window._ppPaylasimSecili.length) {
      /* XSS-SAFE: statik */
      sec.innerHTML = '';
    } else {
      /* XSS-SAFE: statik */
      sec.innerHTML = window._ppPaylasimSecili.map(function(u) {
        var k = (typeof window._ppKullanicilar === 'function' ? window._ppKullanicilar() : [])
          .find(function(x) { return (x.uid || x.email) === u; });
        var n = k ? (k.displayName || k.name || k.email || u) : u;
        return '<span onclick="event.stopPropagation();window._ppPaylasimToggle(\'' + String(u).replace(/'/g, '\\\'') + '\')" title="Kaldır" style="font-size:var(--pp-meta);padding:3px 8px;background:var(--s2);border:0.5px solid var(--b);border-radius:99px;cursor:pointer;color:var(--t)">' + _ppEsc(n) + ' ×</span>';
      }).join('');
    }
  }
};

window._ppPaylasimToggle = function(uid) {
  window._ppPaylasimSecili = window._ppPaylasimSecili || [];
  var idx = window._ppPaylasimSecili.indexOf(uid);
  if (idx >= 0) window._ppPaylasimSecili.splice(idx, 1);
  else window._ppPaylasimSecili.push(uid);
  window._ppPaylasimFiltre(document.getElementById('pp-paylasim-ara')?.value || '');
};
window._ppAltGorevler = [];
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
  /* PUSULA-DOSYA-THUMB-001: 56x56 card view — resim thumbnail + ext ikonu + overlay isim */
  /* XSS-SAFE: statik */
  list.innerHTML = window._ppDosyaEkleri.map(function(d,i) {
    var isImg = d.tip.indexOf('image') !== -1;
    var kb = Math.round(d.boyut/1024);
    var adEsc = _ppEsc(d.ad);
    var body;
    if (isImg && d.data) {
      body = '<img src="'+d.data+'" style="width:56px;height:56px;object-fit:cover;display:block">';
    } else {
      var ext = (d.ad.split('.').pop()||'').toUpperCase().slice(0,4);
      var ikon = d.tip.indexOf('pdf') !== -1 ? '📄' : '📊';
      body = '<div style="width:56px;height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:var(--s2)">'
        +'<span style="font-size:18px;line-height:1">'+ikon+'</span>'
        +'<span style="font-size:var(--pp-meta);font-weight:600;color:var(--t)">'+ext+'</span>'
        +'</div>';
    }
    return '<div style="position:relative;width:56px;height:56px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);overflow:hidden;background:var(--s2);flex-shrink:0" title="'+adEsc+' · '+kb+'KB">'
      + body
      + '<div style="position:absolute;bottom:0;left:0;right:0;padding:2px 3px;background:rgba(0,0,0,.55)"><span style="font-size:var(--pp-meta);color:#fff;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+adEsc+'</span></div>'
      + '<button onclick="event.stopPropagation();window._ppDosyaSil('+i+')" style="position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;font-size:var(--pp-meta);cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;padding:0">×</button>'
      + '</div>';
  }).join('');
};
window._ppDosyaSil = function(i) {
  window._ppDosyaEkleri.splice(i,1);
  window._ppDosyaListGuncelle();
};
window._ppGorevSilYap = function(id) {
  /* PUSULA-PAYLASIM-002: Sadece admin görev siler */
  var _me = _ppCu();
  if (!_me || (_me.role !== 'admin' && _me.rol !== 'admin')) {
    window.toast?.('Sadece yönetici görev silebilir', 'err');
    return;
  }
  /* PP-BTNGUARD-001: double-click koruması */
  if (window._ppIslem) return; window._ppIslem = true; setTimeout(function(){ window._ppIslem = false; }, 1500);
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
  } catch(e) { console.warn('[PP]', e); }
  window.toast?.('G\u00f6rev silindi', 'ok');
  window._ppModRender();
};
window._ppGorevDuzenle = function(id) {
  /* PUSULA-PAYLASIM-002b: admin değilse form bile açılmasın (late feedback önlenir) */
  var _me = _ppCu();
  if (!_me || (_me.role !== 'admin' && _me.rol !== 'admin')) {
    window.toast?.('Sadece yönetici görev düzenleyebilir', 'err');
    return;
  }
  var tasks = _ppLoad();
  var t = tasks.find(function(x) { return String(x.id) === String(id); });
  if (!t) return;
  window._ppDuzenleHedef = id;
  window._ppYeniGorev();
  setTimeout(function() {
    var b = document.getElementById('ppf-baslik'); if (b) b.value = t.baslik || t.title || '';
    /* PP-GOREV-VISUAL-001: emoji preload + chip vurgu güncelle */
    var em = document.getElementById('ppf-emoji'); if (em) em.value = t.emoji || '📋';
    if (typeof window._ppEmojiSec === 'function') window._ppEmojiSec(t.emoji || '📋');
    var d = document.getElementById('ppf-departman'); if (d) d.value = t.departman || '';
    var o = document.getElementById('ppf-oncelik'); if (o) o.value = t.oncelik || 'normal';
    /* PP-GOREV-VISUAL-002: hero banner preload (öncelik sync) */
    var _onc = t.oncelik || 'normal';
    var oncelikBtn = document.querySelector('#ppf-oncelik-pills button[data-val="' + _onc + '"]');
    if (oncelikBtn && typeof window._ppOncelikSec === 'function') window._ppOncelikSec(oncelikBtn, _onc);
    var s = document.getElementById('ppf-durum'); if (s) s.value = t.durum || 'plan';
    var bt = document.getElementById('ppf-basT'); if (bt) bt.value = t.basT || '';
    var bit = document.getElementById('ppf-bitT'); if (bit) bit.value = t.bitTarih || '';
    var sure = document.getElementById('ppf-sure'); if (sure) sure.value = t.sure || '';
    /* XSS-RISK: _esc() zorunlu */
    var acik = document.getElementById('ppf-aciklama'); if (acik) acik.innerHTML = t.aciklama || '';
    /* PUSULA-JOBID-RESTORE-001: edit modunda Job ID input'u da restore */
    var job = document.getElementById('ppf-job_id'); if (job) job.value = t.job_id || t.jobId || '';
    var kaydet = document.querySelector('#pp-gorev-modal button[onclick*="_ppGorevKaydet"]');
    if (kaydet) kaydet.textContent = 'Güncelle';
    /* PUSULA-GUNCELLE-FIX-001: mevcut alt görev + dosya state'ini düzenleme modal'ına yükle */
    window._ppAltGorevler = t.altGorevler || [];
    window._ppDosyaEkleri = t.dosyalar || [];
    if (window._ppAltGorevler.length) window._ppAltGorevRender?.();
  }, 150);
};

  /* ── V170.3.11 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppYeniGorev) {
    Object.assign(window, {
      _ppYeniGorev: window._ppYeniGorev,
      _ppPaylasimFiltre: window._ppPaylasimFiltre,
      _ppPaylasimToggle: window._ppPaylasimToggle,
      _ppAltGorevEkle: window._ppAltGorevEkle,
      _ppAltGorevSil: window._ppAltGorevSil,
      _ppDosyaEkle: window._ppDosyaEkle,
      _ppDosyaListGuncelle: window._ppDosyaListGuncelle,
      _ppDosyaSil: window._ppDosyaSil,
      _ppGorevSilYap: window._ppGorevSilYap,
      _ppGorevDuzenle: window._ppGorevDuzenle
    });
  }

  /* ── V170.3.11 CANONICAL PusulaPro.modalTask EXPOSE ── */
  Object.assign(window.PusulaPro.modalTask, {
    _ppYeniGorev: window._ppYeniGorev,
    _ppPaylasimFiltre: window._ppPaylasimFiltre,
    _ppPaylasimToggle: window._ppPaylasimToggle,
    _ppAltGorevEkle: window._ppAltGorevEkle,
    _ppAltGorevSil: window._ppAltGorevSil,
    _ppDosyaEkle: window._ppDosyaEkle,
    _ppDosyaListGuncelle: window._ppDosyaListGuncelle,
    _ppDosyaSil: window._ppDosyaSil,
    _ppGorevSilYap: window._ppGorevSilYap,
    _ppGorevDuzenle: window._ppGorevDuzenle
  });
})();
