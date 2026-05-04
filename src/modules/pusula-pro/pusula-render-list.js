/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-render-list.js — V170.3.8 POPULATE
   Sorumluluk: Liste/Mod render — V170'in EN BÜYÜK dosyası
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-RENDER-LIST-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       Panel başlık     L335        yorum başlık
       _ppRender         L336-399    Panel dispatcher (modlara yönlendirir)
       _ppModRender      L413-876    5 mod render (akis/calisma/odak/takvim/degerlendirme)
                                     ⚠ V175+ patch listesi: bu fn ~464 satır,
                                       mod-specific dosyalara split planlandı
       _ppModLabel       L878-880    Mod label helper
       _ppTopluBarGuncelle L4055-4059 Toplu bar re-render trigger (JSDoc dahil)
       _ppOncelikRender   L4398-4440 Öncelik panel (zaman dilimi × 3 öncelik)
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaPro.renderList (nested)
   ⚠ DEFENSIVE: toplu guard
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ Bağımlılık: window._ppLoad/_ppStore (store ✓ Cycle 3.2.4)
                 window._ppEsc, _ppNow, _ppToday, _ppId, _ppCu (core ✓)
                 window._ppEmptyState (core ✓)
                 window._ppOncelikLoad (yasam ✓ Cycle 3.2.2)
                 window._ppFrogBelirle, _ppHayatKartlariOku (yasam ✓)
                 window._ppGoalLoad, _ppHabitLoad, _ppChallengeLoad (yasam ✓)
                 window._ppMod (state, actions'tan — Cycle 3.2.13'te POPULATE)
                 window._ppFiltre, _ppSira, _ppSidebar (state, actions'tan)
   ⚠ DOM: panel-pusula-pro container, body innerHTML rebuild
   ⚠ V175+ NOT: _ppModRender 464 satır → mod-specific split planlandı
                Bu cycle'da SADECE BÖLME, içeriği aynen taşıyoruz
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaPro) window.PusulaPro = {};
  if (!window.PusulaPro.renderList) window.PusulaPro.renderList = {};
  if (window._ppRenderListLoaded) return;
  window._ppRenderListLoaded = true;

/* ── Panel Render ───────────────────────────────────────────── */
window._ppRender = function() {
  var panel = document.getElementById('panel-pusula-pro');
  if (!panel) return;
  if (panel.dataset.injected) { window._ppModRender(); return; }
  panel.dataset.injected = '1';
  var _modBtns = PP_MODS.map(function(m) {
    var lbl = {akis:'Akış',calisma:'Çalışma',takvim:'Takvim',odak:'Odak',degerlendirme:'Değerlendirme'}[m];
    // PUSULA-SEKME-FIX-001: inline onclick kaldırıldı, aşağıda addEventListener ile bağlanır (Safari propagation fix)
    return '<button id="pp-mod-' + m + '" class="pp-tab">' + lbl + '</button>';
  }).join('');
  /* XSS-SAFE: statik */
  panel.innerHTML = ''
    + '<div style="display:flex;height:100%;width:100%">'
    + '<div id="pp-inner" style="flex:1;display:flex;flex-direction:column;height:100%;background:var(--sf);min-width:0">'
    + '<div id="pp-head" style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:40px;border-bottom:0.5px solid var(--b);flex-shrink:0">'
    + '<div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:7px"><div style="width:6px;height:6px;border-radius:50%;background:#E24B4A"></div>Pusula OS</div>'
    + '<div class="pp-tabs" id="pp-modes">' + _modBtns + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    /* PUSULA-TEMIZLIK-001: skor pill kaldırıldı */
    + '<div id="pp-msg-btn" onclick="event.stopPropagation();window._ppMesajPanelAc()" style="width:30px;height:30px;border:0.5px solid var(--b);border-radius:50%;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative" title="Mesajlar">'
    + '<svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H8l-3 2V10H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/></svg>'
    + '<div id="pp-msg-dot" style="width:6px;height:6px;border-radius:50%;background:#E24B4A;position:absolute;top:4px;right:4px;display:none"></div>'
    + '</div>'
      /* PUSULA-YEDEK-GIZLEME-001: admin only */
      + (window.isAdmin?.() ? ('<button onclick="event.stopPropagation();window._ppExport?.()" style="font-size:var(--pp-meta);padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Yedek Al</button>') : '')
      /* PUSULA-YEDEK-GIZLEME-001: admin only */
      + (window.isAdmin?.() ? ('<button onclick="event.stopPropagation();window._ppYedekPaneli()" style="font-size:var(--pp-meta);padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2);flex-shrink:0">↓ Yedek</button>') : '')
    + '</div></div>'
    /* PUSULA-FROG-001: frog bar — sadece frog varsa kırmızı, yoksa sade collapse */
    + (function(){
        var _hasFrog = !!(window._ppAktifFrog && (window._ppAktifFrog.baslik || window._ppAktifFrog.title));
        if (_hasFrog) {
          var _fTxt = window._ppEsc ? window._ppEsc(window._ppAktifFrog.baslik || window._ppAktifFrog.title || '') : (window._ppAktifFrog.baslik || window._ppAktifFrog.title || '');
          return '<div id="pp-frog-bar" style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:#FCEBEB;border-bottom:0.5px solid #F7C1C1;flex-shrink:0">'
            + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--pp-err);letter-spacing:.08em;min-width:90px">BUGÜNÜN FROGU</div>'
            + '<div id="pp-frog-txt" style="font-size:13px;font-weight:500;color:#501313;flex:1">' + _fTxt + '</div>'
            + '<button onclick="event.stopPropagation();window._ppFrogBasla?.()" style="font-size:var(--pp-meta);padding:5px 14px;background:var(--pp-err);color:#fff;border:none;border-radius:5px;cursor:pointer;font-family:inherit;font-weight:500">Başla →</button>'
            + '</div>';
        }
        return '<div id="pp-frog-bar" style="display:flex;align-items:center;gap:6px;padding:5px 16px;border-bottom:0.5px solid var(--b);flex-shrink:0;opacity:0.55">'
          + '<span style="font-size:var(--pp-body)">🐸</span>'
          + '<div id="pp-frog-txt" style="font-size:var(--pp-meta);color:var(--t3);flex:1">Frog belirlenmedi — kritik görev yoksa otomatik atanır</div>'
          + '</div>';
      })()
    + '<div id="pp-body" style="flex:1;overflow:hidden;display:flex"></div>'
    + '</div>'
    + '<div id="pp-not-panel" style="flex-shrink:0">' + window._ppNotPanelHTML() + '</div>'
    + '</div>';
  // PUSULA-SEKME-FIX-001: Safari inline onclick propagation sorununu önlemek için
  // her sekme butonuna addEventListener ile bağlan. Closure ile 'm' değerini yakala.
  PP_MODS.forEach(function(m) {
    var _btn = document.getElementById('pp-mod-' + m);
    if (_btn) {
      _btn.addEventListener('click', function(e) {
        e.stopPropagation();
        window._ppSetMod(m);
      });
    }
  });
  window._ppSetMod('akis');
  setTimeout(function() { window._ppAktifFrog = null; window._ppFrogBelirle?.(); window._ppSkorGuncelle?.(); }, 100);
  // PUSULA-TAKVIM-BILDIRIM-001: sayfa açılınca 2 saniye sonra takvim hatırlatıcı kontrolü
  window._ppSetTimeout(window._ppTakvimHatirlaticiKontrol, 2000, 'takvim-hatirla');
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
  // PUSULA-AKIS-FIX-001: PP_MOD global state öncelikli (eski akış uyumluluğu)
  var mod = window.PP_MOD || window._ppAktifMod || 'akis';
  if (mod === 'calisma') {
    var tasks = _ppLoad().filter(function(t) { return !t.isDeleted; });
    /* PUSULA-IZOLASYON-001: merkezi filtre — calisma modu */
    tasks = _ppIzolasyonFiltre(tasks);
    /* PUSULA-UX-BUNDLE-001 #1: arama filtresi — _ppSearchQ global state bazlı */
    var _aramaQ = (window._ppSearchQ || '').toLowerCase().trim();
    if (_aramaQ) {
      tasks = tasks.filter(function(t){
        return (t.baslik||t.title||'').toLowerCase().includes(_aramaQ)
          || (t.departman||'').toLowerCase().includes(_aramaQ)
          || (t.aciklama||'').toLowerCase().includes(_aramaQ);
      });
    }
    /* PUSULA-UX-BUNDLE-002 #1: arama highlight — eşleşen kısmı <mark> ile sarmala */
    var hl = function(s) {
      if (!window._ppSearchQ) return _ppEsc(s);
      var re = new RegExp('(' + String(window._ppSearchQ).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return _ppEsc(s).replace(re, '<mark style="background:#FEF08A;border-radius:2px">$1</mark>');
    };
    /* PUSULA-GECIK-001 + PUSULA-PILL-001: filtre state global değişkenlerden okunur */
    var _filtreDurum   = window._ppFiltreDurum   || '';
    var _filtreOncelik = window._ppFiltreOncelik || '';
    var _gecikFiltre   = window._ppGecikFiltre   || false;
    if (_gecikFiltre) {
      var _bugunF = _ppToday();
      tasks = tasks.filter(function(t){ return t.bitTarih && t.bitTarih < _bugunF && t.durum !== 'tamamlandi'; });
    } else {
      if (_filtreDurum)   tasks = tasks.filter(function(t){ return t.durum    === _filtreDurum; });
      if (_filtreOncelik) tasks = tasks.filter(function(t){ return t.oncelik  === _filtreOncelik; });
    }
    /* PUSULA-KISI-FILTRE-001: sorumlu + gözlemci bazlı kullanıcı filtresi */
    var _filtreKisi = document.getElementById('pp-filtre-kisi')?.value || '';
    var _benimUid = window.Auth?.getCU?.()?.uid || window.CU?.()?.uid || '';
    if (_filtreKisi === '__benim__') {
      tasks = tasks.filter(function(t){
        var uid = _benimUid;
        var sorumlu = t.sorumlu||t.assignedTo||[];
        var sorumluArr = Array.isArray(sorumlu) ? sorumlu : [sorumlu];
        var gozlemci = t.gozlemci||[];
        var gozlemciArr = Array.isArray(gozlemci) ? gozlemci : [gozlemci];
        return sorumluArr.some(function(s){ return (s&&s.uid||s)===uid; })
          || gozlemciArr.some(function(g){ return (g&&g.uid||g)===uid; });
      });
    } else if (_filtreKisi) {
      tasks = tasks.filter(function(t){
        var sorumlu = t.sorumlu||t.assignedTo||[];
        var sorumluArr = Array.isArray(sorumlu) ? sorumlu : [sorumlu];
        return sorumluArr.some(function(s){ return (s&&s.uid||s)===_filtreKisi; });
      });
    }
    /* PUSULA-GOREV-SIRALA-001: aktif sıralama kriteri (tarih / oncelik / durum / alfabe) */
    var _ppSK = window._ppSiralaKriter || 'tarih';
    var _oMap = {kritik:0, yuksek:1, normal:2, dusuk:3};
    var _dMap = {devam:0, plan:1, beklemede:2, tamamlandi:3};
    var _ppSort = function(arr) {
      var a2 = arr.slice();
      if (_ppSK === 'oncelik') { a2.sort(function(a,b){ return (_oMap[a.oncelik||'normal']==null?99:_oMap[a.oncelik||'normal']) - (_oMap[b.oncelik||'normal']==null?99:_oMap[b.oncelik||'normal']); }); return a2; }
      if (_ppSK === 'durum')   { a2.sort(function(a,b){ return (_dMap[a.durum||'plan']==null?99:_dMap[a.durum||'plan']) - (_dMap[b.durum||'plan']==null?99:_dMap[b.durum||'plan']); }); return a2; }
      if (_ppSK === 'alfabe')  { a2.sort(function(a,b){ return String(a.baslik||a.title||'').localeCompare(String(b.baslik||b.title||''), 'tr'); }); return a2; }
      /* default: tarih — yakın bitiş tarihi önce */
      a2.sort(function(a,b){ return String(a.bitTarih||'9999-99-99').localeCompare(String(b.bitTarih||'9999-99-99')); });
      return a2;
    };
    var kritik = _ppSort(tasks.filter(function(t) { return t.oncelik === 'kritik'; }));
    var devam  = _ppSort(tasks.filter(function(t) { return t.durum === 'devam' && t.oncelik !== 'kritik'; }));
    var plan   = _ppSort(tasks.filter(function(t) { return (!t.durum || t.durum === 'plan') && t.oncelik !== 'kritik'; }));
    var _grup = function(lbl,cls,arr){
      if (!arr.length) return '';
      var h2 = '<div style="display:flex;align-items:center;gap:8px;padding:5px 14px;background:var(--s2);border-bottom:0.5px solid var(--b);position:sticky;top:0">';
      h2 += '<span style="font-size:var(--pp-meta);padding:2px 7px;border-radius:3px;font-weight:500;'+cls+'">'+lbl+'</span>';
      h2 += ' <span style="font-size:var(--pp-meta);color:var(--t3);font-weight:400">('+arr.length+')</span>';
      h2 += '<span style="font-size:var(--pp-meta);color:var(--t3)">'+arr.length+' görev</span></div>';
      arr.forEach(function(t){
        var pr = PP_PRIORITIES[t.oncelik||'normal'];
        /* PUSULA-GOREV-BAGLANTI-001: sorumlu yoksa assignedToAd fallback */
        var sorumluRaw = t.sorumlu || t.assignedToAd || '';
        var sorumluAd = '—';
        if (Array.isArray(sorumluRaw)) {
          sorumluAd = sorumluRaw.map(function(s) { return s && typeof s === 'object' ? (s.ad || s.name || s.displayName || '?') : String(s || ''); }).filter(Boolean).join(', ') || '—';
        } else if (sorumluRaw && typeof sorumluRaw === 'object') {
          sorumluAd = sorumluRaw.ad || sorumluRaw.name || sorumluRaw.displayName || '—';
        } else if (typeof sorumluRaw === 'string' && sorumluRaw.trim()) {
          sorumluAd = sorumluRaw.trim();
          /* PUSULA-GOREV-SORUMLU-DISPLAY-001: email ise user lookup + @ öncesi fallback */
          if (sorumluAd.indexOf('@') >= 0) {
            var _uList = (typeof loadUsers === 'function' ? loadUsers() : (window.loadUsers ? window.loadUsers() : []));
            var _match = _uList.find(function(u){ return (u.email || '').toLowerCase() === sorumluAd.toLowerCase() || String(u.id) === sorumluAd || String(u.uid) === sorumluAd; });
            sorumluAd = _match ? (_match.name || _match.ad || sorumluAd.split('@')[0]) : sorumluAd.split('@')[0];
          }
        }
        var sorumluIni = sorumluAd !== '—' ? sorumluAd.split(' ').map(function(s) { return s[0] || ''; }).join('').slice(0, 2).toUpperCase() : '?';
        var kenarRenk = t.oncelik==='kritik'?'var(--pp-err)':t.oncelik==='yuksek'?'var(--pp-warn)':'#1D9E75';
        /* PUSULA-GOREV-RENK-001: sol border rengi — kritik öncelik override, aksi halde duruma göre */
        var _borderRenk = t.oncelik==='kritik' ? '#DC2626'
                        : t.durum==='tamamlandi' ? '#15803D'
                        : t.durum==='devam'      ? '#2563EB'
                        : t.durum==='bekliyor'   ? '#D97706'
                        : 'var(--b)';
        var agSay = t.altGorevSay||0; var agTam = t.altGorevTam||0;
        var jobId = t.job_id||t.jobId||'';
        var tarihGec = t.bitTarih && t.bitTarih < _ppToday();
        /* PUSULA-TARIH-001: deadline renk skalası */
        var _ppTarihBadge = function(bitTarih) {
          if (!bitTarih) return { renk: 'var(--t3)', etiket: '—', bold: false };
          var _bugunD = _ppToday();
          var _yarin  = new Date(); _yarin.setDate(_yarin.getDate() + 1);
          var _yarinS = _yarin.toISOString().slice(0,10);
          var _haftaS = new Date(); _haftaS.setDate(_haftaS.getDate() + 7);
          var _haftaStr = _haftaS.toISOString().slice(0,10);
          if (bitTarih < _bugunD)  return { renk: 'var(--pp-err)', etiket: bitTarih.slice(5), bold: true };
          if (bitTarih === _bugunD) return { renk: '#E24B4A', etiket: 'Bugün', bold: true };
          if (bitTarih === _yarinS) return { renk: '#BA7517', etiket: 'Yarın', bold: true };
          if (bitTarih <= _haftaStr) return { renk: '#639922', etiket: bitTarih.slice(5), bold: false };
          return { renk: 'var(--t3)', etiket: bitTarih.slice(5), bold: false };
        };
        var _tbadge = _ppTarihBadge(t.bitTarih);
        h2 += '<div id="pp-tr-'+t.id+'" onclick="window._ppGorevPeek(\''+t.id+'\')" style="border-left:3px solid '+_borderRenk+';border-bottom:0.5px solid var(--b);background:var(--sf);cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'var(--sf)\'">';
        h2 += '<div onclick="event.stopPropagation();window._ppGorevPeek(\''+t.id+'\')" style="display:grid;grid-template-columns:22px 22px minmax(0,1fr) 120px 70px 70px 56px 96px;align-items:center;padding:7px 8px 7px 10px;gap:5px;cursor:pointer">';
        /* PUSULA-LAYOUT-FIX-002: admin değilse checkbox DOM'da yok (grid kolonu kaplar display:none olsa bile) */
        if (_ppIsAdmin()) {
          h2 += '<input type="checkbox" '+(t.durum==='tamamlandi'?'checked':'')+' onclick="event.stopPropagation();if(window._ppIsAdmin&&window._ppIsAdmin())window._ppTamamla(\''+t.id+'\')" title="Tamamla" style="width:13px;height:13px;cursor:pointer">';
        } else {
          /* Grid hizasını koru: non-admin'de yerine boş span */
          h2 += '<span></span>';
        }
        // PUSULA-TOPLU-001: toplu seçim checkbox'ı (tamamlama checkbox'ının hemen sonrası)
        h2 += '<input type="checkbox" '+(window._ppSeciliGorevler[t.id]?'checked':'')+' onchange="event.stopPropagation();window._ppSeciliGorevler=window._ppSeciliGorevler||{};window._ppSeciliGorevler[\''+t.id+'\']=this.checked;window._ppTopluBarGuncelle()" onclick="event.stopPropagation()" style="width:12px;height:12px;accent-color:var(--pp-info);cursor:pointer" title="Toplu işlem için seç">';
        h2 += '<div style="min-width:0;overflow:hidden">';  /* PUSULA-LAYOUT-FIX-001: kolon overflow */
        /* PUSULA-UX-BUNDLE-001 #2: öncelik bayrak emoji (title prefix) */
        var _bayrak = t.oncelik==='kritik' ? '\ud83d\udd34' : t.oncelik==='yuksek' ? '\ud83d\udfe1' : t.oncelik==='normal' ? '\ud83d\udfe2' : '\u26aa';
        /* PUSULA-GOREV-GIZLILIK-001: kısıtlı görevde kilit ikon */
        var _gizliIkon = (t.paylasilanlar && t.paylasilanlar.length) ? '<span title="Kısıtlı görev" style="margin-right:3px">\ud83d\udd12</span>' : '';
        /* PP-GOREV-VISUAL-001: emoji prefix başlıktan önce */
        h2 += '<div style="font-size:var(--pp-body);font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:'+(t.durum==='tamamlandi'?'var(--t3)':'var(--t)')+(t.durum==='tamamlandi'?';text-decoration:line-through':'')+'"><span style="margin-right:4px;font-size:var(--pp-body)">'+_bayrak+'</span>' + _gizliIkon + '<span style="margin-right:4px;font-size:var(--pp-body)">' + (t.emoji || '📋') + '</span>' + hl(t.baslik||t.title||'') + '</div>';
        h2 += '<div style="display:flex;align-items:center;gap:5px;margin-top:2px;min-width:0;overflow:hidden;white-space:nowrap">';  /* PUSULA-LAYOUT-FIX-001 */
        // PUSULA-JOB-BAGLANTI-001: jobId tiklanabilir → openJobIdHub aç
        if (jobId) h2 += '<span onclick="event.stopPropagation();window.openJobIdHub?.(\''+_ppEsc(jobId)+'\')" title="Job Hub aç" style="font-size:var(--pp-meta);padding:1px 6px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-weight:500;cursor:pointer;text-decoration:underline">'+_ppEsc(jobId)+'</span>';
        if (agSay) h2 += '<span style="font-size:var(--pp-meta);color:var(--t3)">Alt görev '+agTam+'/'+agSay+'</span>';
        if (agSay) h2 += '<button onclick="event.stopPropagation();window._ppAltGorevToggleRow(\''+t.id+'\')" id="pp-ag-btn-'+t.id+'" style="font-size:var(--pp-meta);padding:1px 5px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t3)">&#9658; Göster</button>';
        // PUSULA-SURE-TAKIP-001: harcanan toplam süre (sa + dk format)
        if (t.toplamSureDk) {
          var _sureText = t.toplamSureDk >= 60 ? Math.floor(t.toplamSureDk/60)+'sa '+(t.toplamSureDk%60)+'dk' : t.toplamSureDk+'dk';
          h2 += '<span style="color:var(--t3);font-size:var(--pp-meta)" title="Bu göreve harcanan toplam süre">⏱ '+_sureText+'</span>';
        }
        // PUSULA-DURUM-LOG-001: son durum değişikliğini meta satırında göster
        if (t.durumLog && t.durumLog.length) {
          var _sonLog = t.durumLog[t.durumLog.length - 1];
          var _saat = String(_sonLog.zaman || '').slice(11, 16);
          h2 += '<span style="font-size:var(--pp-meta);color:var(--t3);font-family:inherit" title="Son durum değişikliği">'+_ppEsc(_sonLog.kim || '?')+' → '+_ppEsc(_sonLog.e || '?')+(_saat ? ' · '+_saat : '')+'</span>';
        }
        h2 += '</div></div>';
        /* PP-SORUMLU-DEGISTIR-001: sorumlu yanında ↻ buton (kullanıcı listesinden seçim) */
        h2 += '<div style="display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden"><div style="width:20px;height:20px;border-radius:50%;background:'+kenarRenk+';display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:500;color:#fff;flex-shrink:0">'+sorumluIni+'</div><span style="font-size:var(--pp-meta);color:'+(t.oncelik==='kritik'?'#791F1F':t.oncelik==='yuksek'?'#633806':'var(--t2)')+';font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_ppEsc(sorumluAd)+'</span><button onclick="event.stopPropagation();window._ppSorumluDegistir(\''+t.id+'\')" title="Sorumluyu değiştir" style="font-size:var(--pp-meta);padding:1px 4px;border:0.5px solid var(--b);border-radius:3px;cursor:pointer;background:transparent;color:var(--t3);font-family:inherit">↻</button></div>';
        h2 += '<div style="font-size:var(--pp-meta);color:var(--t3)">'+(t.basT?t.basT.slice(0,10):'—')+(t.createdAt?'<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:1px" title="Oluşturulma: '+_ppEsc(t.createdAt)+'">🕐 '+(function(ts){try{var d=new Date((ts||'').replace(' ','T'));return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}catch(e){return '';}})(t.createdAt)+'</div>':'')+'</div>';
        h2 += '<div style="font-size:var(--pp-meta);color:'+_tbadge.renk+(';font-weight:')+(_tbadge.bold?'600':'400')+'">'+(_tbadge.etiket)+'</div>';
        h2 += '<span style="font-size:var(--pp-meta);padding:2px 5px;border-radius:3px;background:'+pr.bg+';color:'+pr.c+';font-weight:500">'+pr.l+'</span>';
        // PUSULA-UX-BUNDLE-003 #2: inline öncelik değiştirme dropdown
        /* PUSULA-PAYLASIM-004: non-admin için öncelik select disabled */
        var _canEditProps = _ppIsAdmin();
        h2 += '<select ' + (_canEditProps ? 'onchange="event.stopPropagation();window._ppOncelikDegistir?.(\''+String(t.id)+'\',this.value)" onclick="event.stopPropagation()"' : 'disabled') + ' style="font-size:var(--pp-meta);border:none;background:transparent;color:var(--t3);cursor:' + (_canEditProps ? 'pointer' : 'not-allowed') + ';font-family:inherit;margin-left:2px" title="' + (_canEditProps ? 'Önceliği değiştir' : 'Sadece yönetici değiştirebilir') + '">'
          + '<option value="kritik"'+(t.oncelik==='kritik'?' selected':'')+'>🔴</option>'
          + '<option value="yuksek"'+(t.oncelik==='yuksek'?' selected':'')+'>🟡</option>'
          + '<option value="normal"'+(t.oncelik==='normal'?' selected':'')+'>🟢</option>'
          + '<option value="dusuk"'+(t.oncelik==='dusuk'?' selected':'')+'>⚪</option>'
          + '</select>';
        h2 += '<div style="display:flex;align-items:center;gap:2px" onclick="event.stopPropagation()">';
        h2 += '<button onclick="event.stopPropagation();window._ppPeekAc(\''+t.id+'\')" title="Hızlı göz at" style="width:22px;height:22px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="6" cy="6" r="3"/><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z"/></svg></button>';
        h2 += '<button onclick="event.stopPropagation();window._ppGorevMesaj(\''+t.id+'\')" title="Mesajlaş" style="width:22px;height:22px;border:0.5px solid #B5D4F4;border-radius:4px;background:transparent;cursor:pointer;color:var(--pp-info);display:flex;align-items:center;justify-content:center;position:relative"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 1h10a1 1 0 011 1v5a1 1 0 01-1 1H7L4.5 11V8H1a1 1 0 01-1-1V2a1 1 0 011-1z"/></svg></button>';
        /* PUSULA-PAYLASIM-002b: row Düzenle/Sil butonları sadece admin'e görünür */
        if (_ppCu()?.role === 'admin' || _ppCu()?.rol === 'admin') {
          h2 += '<button onclick="event.stopPropagation();window._ppGorevDuzenle(\''+t.id+'\')" title="Düzenle" style="width:22px;height:22px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M8 2l2 2-6 6H2V8l6-6z"/></svg></button>';
          h2 += '<button onclick="event.stopPropagation();window._ppGorevSil(\''+t.id+'\')" title="Sil" style="width:22px;height:22px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--pp-err);display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M2 3h8M5 3V2h2v1M4 3v7h4V3H4z"/></svg></button>';
        }
        h2 += '</div></div>';
        h2 += '<div id="pp-ag-panel-'+t.id+'" style="display:none;background:var(--s2);border-top:0.5px solid var(--b);padding:6px 10px 6px 46px">';
        if (agSay && t.altGorevler && t.altGorevler.length) {
          h2 += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><span style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em">ALT GÖREVLER</span><div style="display:flex;gap:4px">' + (_ppIsAdmin() ? '<button onclick="event.stopPropagation();window._ppAltGorevTopluTamamla(\''+t.id+'\')" style="font-size:var(--pp-meta);padding:1px 6px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t3)">Toplu tamamla</button>' : '') + '</div></div>';
          t.altGorevler.forEach(function(ag,i){
            h2 += '<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:0.5px solid var(--b)">';
            h2 += '<input type="checkbox" '+(ag.tamamlandi?'checked':'')+(_ppIsAdmin()?'':' disabled')+' style="width:11px;height:11px;cursor:'+(_ppIsAdmin()?'pointer':'not-allowed')+'">';
            h2 += '<span style="font-size:var(--pp-body);flex:1;color:'+(ag.tamamlandi?'var(--t3)':'var(--t)')+(ag.tamamlandi?';text-decoration:line-through':'')+'">' + _ppEsc(ag.baslik) + '</span>';
            /* PUSULA-UX-BUNDLE-001 #3: alt görev detay satırı (sorumlu + tarihler) */
            var _agSorAd = '';
            if (ag.sorumlu) {
              if (Array.isArray(ag.sorumlu) && ag.sorumlu.length) {
                var _first = ag.sorumlu[0];
                _agSorAd = (typeof _first === 'object') ? (_first.ad || _first.name || '') : String(_first || '');
              } else if (typeof ag.sorumlu === 'string') {
                _agSorAd = ag.sorumlu;
              } else if (typeof ag.sorumlu === 'object') {
                _agSorAd = ag.sorumlu.ad || ag.sorumlu.name || '';
              }
            }
            /* PUSULA-BUG-FIX-001: alt görev sorumlusu avatar + baş harfler */
            var _agIni = _agSorAd ? _agSorAd.split(' ').map(function(s){return s[0]||'';}).join('').slice(0,2).toUpperCase() : '';
            if (_agSorAd) {
              h2 += '<div style="width:18px;height:18px;border-radius:50%;background:var(--pp-info);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:600;color:#fff;flex-shrink:0;margin-left:6px" title="'+_ppEsc(_agSorAd)+'">'+_ppEsc(_agIni)+'</div>';
            }
            h2 += '<span style="font-size:var(--pp-meta);color:var(--t3);margin-left:2px">'
              + (_agSorAd ? _ppEsc(_agSorAd) : '')
              + (ag.basT ? ' \u00b7 \ud83d\udcc5 '+_ppEsc(ag.basT) : '')
              + (ag.bitTarih ? ' \u2192 '+_ppEsc(ag.bitTarih) : '')
              + '</span>';
            h2 += '</div>';
          });
        } else {
          h2 += '<div style="font-size:var(--pp-body);color:var(--t3);padding:4px 0">Alt görev yok</div>';
        }
        h2 += '</div>';
        h2 += '</div>';
      });
      return h2;
    };
    /* PUSULA-ARAMA-FOCUS-FIX-001: re-render öncesi mevcut arama değerini sakla */
    var _aramaDeger = document.getElementById('pp-search')?.value || window._ppSearchQ || '';
    /* XSS-SAFE: statik */
    body.innerHTML = ''
      + '<div style="width:180px;border-right:0.5px solid var(--b);padding:8px 0;overflow-y:auto;flex-shrink:0">'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.08em;padding:8px 14px 3px">ÇALIŞMA ALANI</div>'
      + '<div onclick="event.stopPropagation();window._ppSidebarSec(\'tum\')" style="display:flex;align-items:center;gap:7px;padding:5px 14px;cursor:pointer;font-size:var(--pp-body);background:var(--s2);font-weight:500"><div style="width:5px;height:5px;border-radius:50%;background:#E24B4A"></div>Tüm Görevler<span style="margin-left:auto;font-size:var(--pp-meta);padding:1px 5px;border-radius:var(--pp-r-sm);background:var(--b)">' + tasks.length + '</span></div>'
      + '<div onclick="event.stopPropagation();window._ppSidebarSec(\'kritik\')" style="display:flex;align-items:center;gap:7px;padding:5px 14px;cursor:pointer;font-size:var(--pp-body)"><div style="width:5px;height:5px;border-radius:50%;background:#E24B4A"></div>Kritik<span style="margin-left:auto;font-size:var(--pp-meta);padding:1px 5px;border-radius:var(--pp-r-sm);background:var(--s2)">' + kritik.length + '</span></div>'
      + '<div onclick="event.stopPropagation();window._ppSidebarSec(\'bugun\')" style="display:flex;align-items:center;gap:7px;padding:5px 14px;cursor:pointer;font-size:var(--pp-body)"><div style="width:5px;height:5px;border-radius:50%;background:#EF9F27"></div>Bugün</div>'
      + '</div>'
      + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">'
      + '<div style="display:flex;align-items:center;gap:5px;padding:8px 14px;border-bottom:0.5px solid var(--b);flex-shrink:0">'
      /* PUSULA-PAYLASIM-002: '+ Görev' butonu sadece admin'e görünür */
      + ((function(){ var _r = _ppCu()?.role; return (_r === 'admin' || _ppCu()?.rol === 'admin'); })() ? '<button onclick="event.stopPropagation();window._ppYeniGorev()" style="font-size:var(--pp-meta);padding:4px 10px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">+ Görev</button>' : '')
      + '<input id="pp-search" placeholder="Görev ara..." oninput="event.stopPropagation();window._ppAra(this.value)" onclick="event.stopPropagation()" style="flex:1;max-width:200px;font-size:var(--pp-body);padding:4px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-family:inherit;color:var(--t)">'
      + '<select id="pp-sirala" onchange="event.stopPropagation();window._ppSiralaGorevler(this.value)" onclick="event.stopPropagation()" style="font-size:var(--pp-body);padding:4px 8px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t);font-family:inherit">'
        + '<option value="tarih"'  +(_ppSK==='tarih'?' selected':'')+  '>Son Tarihe Göre</option>'
        + '<option value="oncelik"'+(_ppSK==='oncelik'?' selected':'')+'>Önceliğe Göre</option>'
        + '<option value="durum"'  +(_ppSK==='durum'?' selected':'')+  '>Duruma Göre</option>'
        + '<option value="alfabe"' +(_ppSK==='alfabe'?' selected':'')+ '>A-Z</option>'
      + '</select>'
      /* PUSULA-PILL-001: durum + öncelik pill seçici (global state: _ppFiltreDurum / _ppFiltreOncelik) */
      + (function(){
          var _fd = window._ppFiltreDurum || '';
          var _fo = window._ppFiltreOncelik || '';
          var _ps = function(tip, val, lbl) {
            var aktif = (tip==='d' ? _fd : _fo) === val;
            var _fn = tip==='d' ? '_ppFiltreDurum' : '_ppFiltreOncelik';
            return '<button data-pp-pill="'+tip+'" data-val="'+val+'" onclick="event.stopPropagation();window._ppGecikFiltre=false;window.'+_fn+'=(window.'+_fn+'===\''+val+'\' ? \'\' : \''+val+'\');window._ppModRender?.()" style="font-size:var(--pp-meta);padding:3px 9px;border:0.5px solid var(--b);border-radius:20px;cursor:pointer;font-family:inherit;background:'+(aktif?'var(--t)':'transparent')+';color:'+(aktif?'var(--sf)':'var(--t2)')+'">'+lbl+'</button>';
          };
          return '<div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap">'
            + _ps('d','','Tümü') + _ps('d','devam','Devam') + _ps('d','plan','Plan') + _ps('d','bekliyor','Bekliyor') + _ps('d','tamamlandi','Tamam')
            + '<span style="width:1px;height:14px;background:var(--b);margin:0 3px"></span>'
            + _ps('o','','Tümü') + _ps('o','kritik','🔴') + _ps('o','yuksek','🟡') + _ps('o','normal','🟢') + _ps('o','dusuk','⚪')
            + '</div>';
        })()
      // PUSULA-KISI-FILTRE-001: kullanıcı filtresi (benim + tüm aktif kullanıcılar)
      + '<select id="pp-filtre-kisi" onchange="event.stopPropagation();window._ppModRender?.()" onclick="event.stopPropagation()" style="font-size:var(--pp-body);padding:4px 8px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t2);font-family:inherit">'
        + '<option value="">Tüm Kişiler</option>'
        + '<option value="__benim__">👤 Benim Görevlerim</option>'
        + (typeof window.loadUsers === 'function' ? loadUsers().filter(function(u){ return !u.isDeleted; }).map(function(u){ return '<option value="'+_ppEsc(u.uid||u.id)+'">'+_ppEsc(u.name||u.displayName||'')+'</option>'; }).join('') : '')
      + '</select>'
      + '<button onclick="event.stopPropagation();window._ppFiltreDurum=\'\';window._ppFiltreOncelik=\'\';window._ppGecikFiltre=false;var _k=document.getElementById(\'pp-filtre-kisi\');if(_k)_k.value=\'\';window._ppModRender?.()" style="font-size:var(--pp-meta);padding:4px 9px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:transparent;cursor:pointer;font-family:inherit;color:var(--t3)">✕ Temizle</button>'
      + '</div>'
      /* PUSULA-HIZLI-001: liste üstünde hızlı ekle satırı */
      + '<div style="display:' + (_ppIsAdmin() ? 'flex' : 'none') + ';align-items:center;gap:6px;padding:6px 14px;border-bottom:0.5px solid var(--b);flex-shrink:0;background:var(--sf)">'
      + '<input id="pp-quick-top" placeholder="＋ Hızlı görev ekle — Enter..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){window._ppHizliEkle(this);}" style="flex:1;font-size:var(--pp-body);padding:5px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);font-family:inherit;color:var(--t);outline:none">'
      + '<select id="pp-quick-oncelik" onclick="event.stopPropagation()" onchange="event.stopPropagation()" style="font-size:var(--pp-meta);padding:5px 7px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);color:var(--t2);font-family:inherit">'
      + '<option value="normal">🟢 Normal</option><option value="yuksek">🟡 Yüksek</option><option value="kritik">🔴 Kritik</option><option value="dusuk">⚪ Düşük</option>'
      + '</select>'
      + '</div>'
      + '<div style="flex:1;overflow-y:auto">'
      + '<div style="padding:10px 14px 0"><input id="pp-calisma-ara" placeholder="Görev ara..." oninput="event.stopPropagation();window._ppCalismaFiltre(this.value)" onclick="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box;margin-bottom:10px"></div>'
      + '<div style="display:grid;grid-template-columns:22px 22px minmax(0,1fr) 120px 70px 70px 56px 96px;align-items:center;padding:5px 10px;background:var(--s2);border-bottom:0.5px solid var(--b);gap:5px;position:sticky;top:0">'
      + '<div></div>'
      + '<div></div>'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em">GÖREV / JOB ID</div>'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em">SORUMLU</div>'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em">BAŞLANGIÇ</div>'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em">BİTİŞ</div>'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em">ÖNCELİK</div>'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.06em">AKSİYON</div>'
      + '</div>'
      // PUSULA-TOPLU-001: toplu seçim bar (sadece seçili varsa gösterilir)
      + (function(){
          var _secSay = Object.values(window._ppSeciliGorevler||{}).filter(Boolean).length;
          if (_secSay === 0) return '';
          return '<div id="pp-toplu-bar" style="display:flex;align-items:center;gap:8px;padding:6px 14px;background:#E6F1FB;border-bottom:0.5px solid var(--pp-info);position:sticky;top:32px;z-index:2">'
            + '<span style="font-size:var(--pp-body);font-weight:500;color:#0C447C">' + _secSay + ' görev seçildi</span>'
            + (_ppIsAdmin() ? '<button onclick="event.stopPropagation();window._ppTopluTamamla()" style="font-size:var(--pp-meta);padding:3px 10px;border:none;border-radius:4px;background:#15803D;color:#fff;cursor:pointer;font-family:inherit">✓ Tamamla</button>' : '')
            + '<button onclick="event.stopPropagation();window._ppTopluDurum()" style="font-size:var(--pp-meta);padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Durum Değiştir</button>'
            + '<button onclick="event.stopPropagation();window._ppTopluSil()" style="font-size:var(--pp-meta);padding:3px 10px;border:0.5px solid var(--pp-err);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--pp-err)">Sil</button>'
            + '<button onclick="event.stopPropagation();window._ppSeciliGorevler={};window._ppModRender()" style="font-size:var(--pp-meta);padding:3px 8px;border:none;border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);margin-left:auto">✕ İptal</button>'
            + '</div>';
        })()
      + (function(){
          /* PUSULA-GECIK-001: gecikmiş görev banner — bugün öncesi bitTarih, tamamlanmamış */
          var _bugun = _ppToday();
          var _gecikSayisi = tasks.filter(function(t){ return t.bitTarih && t.bitTarih < _bugun && t.durum !== 'tamamlandi'; }).length;
          if (_gecikSayisi === 0) return '';
          return '<div id="pp-gecik-banner" style="display:flex;align-items:center;gap:8px;padding:6px 14px;background:#FCEBEB;border-bottom:0.5px solid #F7C1C1;flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();window._ppFiltreDurum=\'\';window._ppFiltreOncelik=\'\';document.querySelectorAll(\'[data-pp-filtre-durum]\').forEach(function(b){b.style.background=b.dataset.val===\'gecikti\'?\'var(--t)\':\' transparent\';b.style.color=b.dataset.val===\'gecikti\'?\'var(--sf)\':\' var(--t2)\';});window._ppGecikFiltre=true;window._ppModRender?.();">'
            + '<span style="font-size:var(--pp-meta);font-weight:500;color:var(--pp-err)">⚠ ' + _gecikSayisi + ' görev gecikmiş</span>'
            + '<span style="font-size:var(--pp-meta);color:var(--pp-err);margin-left:auto">Göster →</span>'
            + '</div>';
        })()
      + _grup('KRİTİK', 'background:#FCEBEB;color:var(--pp-err)', kritik)
      + _grup('DEVAM EDİYOR', 'background:#E1F5EE;color:#0F6E56', devam)
      + _grup('PLANLANDI', 'background:#E6F1FB;color:var(--pp-info)', plan)
      /* PUSULA-PAYLASIM-002b: empty state CTA ('+ Yeni görev') sadece admin'e */
      + (tasks.length === 0 ? window._ppEmptyState('calisma', '\u{1F3AF}', 'Aktif görev yok', 'Bugün için planladığın işleri buraya ekle', (_ppCu()?.role === 'admin' || _ppCu()?.rol === 'admin') ? '+ Yeni görev' : '', (_ppCu()?.role === 'admin' || _ppCu()?.rol === 'admin') ? 'event.stopPropagation();window._ppYeniGorev()' : '') : '')
      + '</div>'
      + '<div style="border-top:0.5px solid var(--b);padding:8px 14px;display:' + (_ppIsAdmin() ? 'flex' : 'none') + ';gap:6px;flex-shrink:0">'
      + '<input id="pp-quick" placeholder="Hızlı görev ekle — Enter..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\')window._ppHizliEkle(this)" style="flex:1;font-size:var(--pp-body);padding:6px 10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:transparent;font-family:inherit;color:var(--t)">'
      + '<button onclick="event.stopPropagation();var i=document.getElementById(\'pp-quick\');window._ppHizliEkle(i)" style="font-size:var(--pp-meta);padding:6px 12px;border:none;border-radius:var(--pp-r-sm);background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">+ Ekle</button>'
      + '</div></div>'
      + '<div style="width:240px;border-left:0.5px solid var(--b);padding:12px;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:10px">'
      + window._ppSagPanel()
      + '</div>';
    /* PUSULA-ARAMA-FOCUS-FIX-001: re-render sonrası arama input'u değeri restore + odak */
    var _aramaInput = document.getElementById('pp-search');
    if (_aramaInput) {
      _aramaInput.value = _aramaDeger;
      if (_aramaDeger) _aramaInput.focus();
    }
    return;
  }
  if (mod === 'odak') {
    /* XSS-SAFE: statik */
    body.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;background:var(--sf);overflow-y:auto">'
      + '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center">'
      + '<div style="font-size:var(--pp-body);color:var(--t3);letter-spacing:.1em;margin-bottom:16px">ODAK MODU</div>'
      + '<div id="pp-odak-frog" style="font-size:18px;font-weight:500;color:var(--t);max-width:500px;line-height:1.4;margin-bottom:24px">Frog seçilmedi</div>'
      + '<div style="font-size:48px;font-weight:300;letter-spacing:.04em;color:var(--t);margin-bottom:8px" id="pp-odak-timer">00:00:00</div>'
      + '<div style="font-size:var(--pp-body);color:var(--t3);margin-bottom:24px">Deep Work bloğu</div>'
      + '<div style="display:flex;gap:8px">'
      + '<button onclick="event.stopPropagation();window._ppDwBasla?.()" style="font-size:var(--pp-body);padding:10px 28px;background:var(--t);color:var(--sf);border:none;border-radius:var(--pp-r-sm);cursor:pointer;font-family:inherit;font-weight:500">Başla</button>'
      + '<button onclick="event.stopPropagation();window._ppSetMod(\'calisma\')" style="font-size:var(--pp-body);padding:10px 20px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Çık</button>'
      + '</div></div>'
      /* PP-ONCELIK-ZAMAN-001: 5 zaman dilimi × 3 öncelik grid */
      + '<div style="border-top:0.5px solid var(--b);margin-top:20px"><div style="font-size:var(--pp-meta);color:var(--t3);letter-spacing:.1em;padding:12px 20px 0;text-align:center">ÖNCELİKLER — ZAMAN DİLİMLERİ</div></div>'
      + '<div id="pp-oncelik-panel" style="margin-top:8px"></div>'
      + '</div>';
    /* PP-ONCELIK-RENDER-FIX-001: setTimeout ile DOM mount sonrası render (defensive timing) */
    setTimeout(function() { window._ppOncelikRender?.(); }, 50);
  } else if (mod === 'takvim') {
    if (typeof window._ppTakvimPanelRender === 'function') { window._ppTakvimPanelRender(body); }
    /* XSS-SAFE: statik */
    else { body.innerHTML = '<div style="flex:1;padding:20px"><div style="font-size:13px;color:var(--t3)">Takvim yükleniyor...</div></div>'; }
    return;
  } else if (mod === 'akis') {
    /* PUSULA-AKIS-EMPTY-STATE-001: user'a görev atanmamışsa empty state */
    try {
      var _akisTasks = (_ppIzolasyonFiltre ? _ppIzolasyonFiltre(_ppLoad().filter(function(x){return !x.isDeleted;})) : []);
      if (!_akisTasks.length && typeof window._ppEmptyState === 'function') {
        body.innerHTML = window._ppEmptyState('akis', '🎯', 'Henüz görev yok', 'Yönetici sana görev atadığında burada görünür.', '', '');
        return;
      }
    } catch(e) {}
    /* PUSULA-IZOLASYON-001: akis modu — izolasyon uygulandı (admin/manager hariç) */
    var tasks = _ppIzolasyonFiltre(_ppLoad().filter(function(t){ return !t.isDeleted; }));
    var bugun = _ppToday();
    var kritik = tasks.filter(function(t){ return t.oncelik==='kritik' && t.durum!=='tamamlandi'; });
    var devam = tasks.filter(function(t){ return t.durum==='devam'; });
    var bugunVade = tasks.filter(function(t){ return t.bitTarih===bugun && t.durum!=='tamamlandi'; });
    var frog = tasks.find(function(t){ return t.isFrog && t.durum!=='tamamlandi'; });

    var h = '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">';

    // Frog
    if (frog) {
      h += '<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:var(--pp-r-md);padding:14px 16px">'
        + '<div style="font-size:var(--pp-meta);font-weight:600;color:#92400E;letter-spacing:.08em;margin-bottom:6px">BUGÜNÜN FROGU</div>'
        + '<div style="font-size:14px;font-weight:600;color:#78350F">🐸 '+_ppEsc(frog.baslik||frog.title||'')+'</div>'
        + '<div style="margin-top:8px"><button onclick="event.stopPropagation();window._ppFrogBasla&&window._ppFrogBasla()" style="font-size:var(--pp-body);padding:5px 14px;background:#F59E0B;color:#fff;border:none;border-radius:var(--pp-r-sm);cursor:pointer;font-family:inherit">Başla →</button></div>'
        + '</div>';
    }

    // Özet kartlar
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
    h += '<div style="padding:12px;border:0.5px solid var(--b);border-radius:var(--pp-r-md);text-align:center">'
      + '<div style="font-size:22px;font-weight:700;color:var(--t)">'+devam.length+'</div>'
      + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:2px">Devam Ediyor</div></div>';
    h += '<div style="padding:12px;border:0.5px solid var(--b);border-radius:var(--pp-r-md);text-align:center">'
      + '<div style="font-size:22px;font-weight:700;color:#DC2626">'+kritik.length+'</div>'
      + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:2px">Kritik</div></div>';
    h += '<div style="padding:12px;border:0.5px solid var(--b);border-radius:var(--pp-r-md);text-align:center">'
      + '<div style="font-size:22px;font-weight:700;color:#D97706">'+bugunVade.length+'</div>'
      + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:2px">Bugün Bitiyor</div></div>';
    h += '</div>';

    // Kritik görevler listesi
    if (kritik.length) {
      h += '<div><div style="font-size:var(--pp-meta);font-weight:600;color:var(--t3);letter-spacing:.08em;margin-bottom:6px">KRİTİK GÖREVLER</div>';
      kritik.slice(0,5).forEach(function(t){
        h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--b)">'
          + '<div style="width:6px;height:6px;border-radius:50%;background:#DC2626;flex-shrink:0"></div>'
          + '<span style="font-size:var(--pp-body);color:var(--t);flex:1">'+_ppEsc(t.baslik||t.title||'')+'</span>'
          + '<span style="font-size:var(--pp-meta);color:var(--t3)">'+_ppEsc(t.departman||'')+'</span>'
          + '</div>';
      });
      h += '</div>';
    }

    // Devam edenler
    if (devam.length && !kritik.length) {
      h += '<div><div style="font-size:var(--pp-meta);font-weight:600;color:var(--t3);letter-spacing:.08em;margin-bottom:6px">DEVAM EDİYOR</div>';
      devam.slice(0,5).forEach(function(t){
        h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--b)">'
          + '<div style="width:6px;height:6px;border-radius:50%;background:#2563EB;flex-shrink:0"></div>'
          + '<span style="font-size:var(--pp-body);color:var(--t);flex:1">'+_ppEsc(t.baslik||t.title||'')+'</span>'
          + '</div>';
      });
      h += '</div>';
    }

    if (!tasks.length) {
      /* PUSULA-PRO-REDESIGN-001 PARÇA 5: odak empty state */
      h += window._ppEmptyState('odak', '\u23F1', 'Odak seansı için görev yok', 'Çalışma modundan görev ekle, sonra odak başlat (25 dk pomodoro)', '→ Çalışma Moduna Geç', 'event.stopPropagation();window.PP_MOD=\'calisma\';window._ppModRender?.()');
    }

    h += '</div>';
    /* XSS-RISK: _esc() zorunlu */
    body.innerHTML = h;
    /* PUSULA-AKIS-AKTIF-001: return eklendi — fallback overwrite engellendi */
    return;
  } else if (mod === 'degerlendirme') {
    /* PUSULA-TEMIZLIK-001: skor/habit/challenge kaldırıldı, sadeleştirildi */
    var skor = { bugun: 0, hafta: 0, toplam: 0 };
    var degTasks = _ppLoad().filter(function(t) { return !t.isDeleted; });
    var tamamlanan = degTasks.filter(function(t) { return t.durum === 'tamamlandi'; });
    var bekleyen = degTasks.filter(function(t) { return t.durum !== 'tamamlandi'; });
    /* PUSULA-TEMIZLIK-001: habit render bloğu tamamen silindi */
    var habitH = '';
    /* XSS-SAFE: statik */
    body.innerHTML = '<div style="flex:1;overflow-y:auto;padding:24px;max-width:700px;margin:0 auto;width:100%">'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t3);letter-spacing:.1em;margin-bottom:16px">HAFTALIK DEĞERLENDİRME</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">'
      + '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px;background:var(--sf)"><div style="font-size:var(--pp-meta);color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:6px">HAFTA SKORU</div><div style="font-size:28px;font-weight:500;color:#1D9E75">' + skor.hafta + '</div><div style="font-size:var(--pp-meta);color:var(--t3)">puan</div></div>'
      + '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px;background:var(--sf)"><div style="font-size:var(--pp-meta);color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:6px">TAMAMLANAN</div><div style="font-size:28px;font-weight:500;color:var(--t)">' + tamamlanan.length + '</div><div style="font-size:var(--pp-meta);color:var(--t3)">görev</div></div>'
      + '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:12px;background:var(--sf)"><div style="font-size:var(--pp-meta);color:var(--t3);font-weight:500;letter-spacing:.07em;margin-bottom:6px">BEKLEYEN</div><div style="font-size:28px;font-weight:500;color:var(--pp-err)">' + bekleyen.length + '</div><div style="font-size:var(--pp-meta);color:var(--t3)">görev</div></div>'
      + '</div>'
      + '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:16px;margin-bottom:14px;background:var(--sf)">'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t);margin-bottom:10px">Bu hafta ne yaptım?</div>'
      + '<div id="pp-rev-yapti" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:80px;padding:10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);font-size:var(--pp-body);color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
      + '</div>'
      + '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:16px;margin-bottom:14px;background:var(--sf)">'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t);margin-bottom:10px">Ne öğrendim?</div>'
      + '<div id="pp-rev-ogrendi" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:80px;padding:10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);font-size:var(--pp-body);color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
      + '</div>'
      + '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);padding:16px;margin-bottom:14px;background:var(--sf)">'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t);margin-bottom:10px">Gelecek hafta en kritik 3 hedef</div>'
      + '<div id="pp-rev-hedef" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:60px;padding:10px;border:0.5px solid var(--b);border-radius:var(--pp-r-sm);background:var(--s2);font-size:var(--pp-body);color:var(--t);line-height:1.6;outline:none;font-family:inherit"></div>'
      + '</div>'
      + habitH
      + '<div style="display:flex;justify-content:flex-end;margin-top:8px">'
      + '<button onclick="event.stopPropagation();window._ppRevKaydet()" style="font-size:var(--pp-body);padding:8px 24px;border:none;border-radius:var(--pp-r-sm);background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Değerlendirmeyi Kaydet</button>'
      + '</div>'
      + '</div>';
    setTimeout(function() { window._ppRevYukle?.(); }, 50);
    return;
  }
  /* PUSULA-CEO-REMOVE-001: CEO bloğu kaldırıldı, bilinmeyen mod fallback korundu */
  /* XSS-RISK: _esc() zorunlu */
  body.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;color:var(--t3);font-size:13px">'
    + window._ppModLabel(mod) + ' modu yakında aktif olacak...</div>';
};

window._ppModLabel = function(mod) {
  return {akis:'Akış',calisma:'Çalışma',takvim:'Takvim',odak:'Odak',degerlendirme:'Değerlendirme'}[mod] || mod;
};
/**
 * Toplu bar'ı güncellemek için full re-render tetikler. Daha granüler
 * bir update helper'a ihtiyaç duyulursa ileride optimize edilebilir.
 */
window._ppTopluBarGuncelle = function() { window._ppModRender?.(); };
window._ppOncelikRender = function() {
  var cont = document.getElementById('pp-oncelik-panel');
  if (!cont) return;
  var d = window._ppOncelikLoad();
  var esc = window._ppEsc || function(s) { return String(s || '').replace(/[<>&"]/g, function(c) { return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]; }); };
  var ZAMAN = [
    { key: 'gun',    label: 'BUGÜN' },
    { key: 'hafta',  label: 'BU HAFTA' },
    { key: 'ay',     label: 'BU AY' },
    { key: 'ceyrek', label: 'BU ÇEYREK' },
    { key: 'yil',    label: 'BU YIL' }
  ];
  var html = '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:16px 20px">';
  ZAMAN.forEach(function(z) {
    var items = d[z.key] || [];
    var tamamSay = items.filter(function(x) { return x.tamam; }).length;
    html += '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-md);overflow:hidden;background:var(--sf)">';
    html += '<div style="padding:8px 12px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
    html += '<div style="font-size:var(--pp-meta);font-weight:600;color:var(--t3);letter-spacing:.05em">' + z.label + '</div>';
    html += '<div style="font-size:var(--pp-meta);color:var(--t2);margin-top:2px">' + tamamSay + '/3 tamamlandı</div>';
    html += '</div><div style="padding:8px 10px">';
    for (var i = 0; i < 3; i++) {
      var item = items[i];
      if (item) {
        html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:0.5px solid var(--b)">';
        html += '<span onclick="event.stopPropagation();window._ppOncelikToggle(\'' + z.key + '\',\'' + item.id + '\')" style="font-size:14px;cursor:pointer;flex-shrink:0;line-height:1">' + (item.tamam ? '✅' : '⬜') + '</span>';
        html += '<span style="font-size:var(--pp-meta);color:var(--t);flex:1;min-width:0;word-break:break-word;' + (item.tamam ? 'text-decoration:line-through;opacity:.5' : '') + '">' + esc(item.text) + '</span>';
        html += '<span onclick="event.stopPropagation();window._ppOncelikSil(\'' + z.key + '\',\'' + item.id + '\')" title="Sil" style="font-size:var(--pp-body);color:var(--t3);cursor:pointer;padding:1px 4px;flex-shrink:0">×</span>';
        html += '</div>';
      } else {
        html += '<div onclick="event.stopPropagation();var t=window.prompt(\'' + z.label + ' için öncelik:\');if(t&&t.trim())window._ppOncelikEkle(\'' + z.key + '\',t.trim())" style="padding:5px 0;font-size:var(--pp-meta);color:var(--t3);cursor:pointer;border-bottom:0.5px dashed var(--b)">+ ' + (i + 1) + '. öncelik ekle</div>';
      }
    }
    html += '</div></div>';
  });
  html += '</div>';
  /* XSS-RISK: _esc() zorunlu */
  cont.innerHTML = html;
};

/* ── PP-GOREV-MESAJ-001: per-task mesajlaşma sistemi ───────── */
/* Namespace: _ppGorevMesaj* (global _ppMesaj* ile çakışmaz) */


  /* ── V170.3.8 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  if (!window._ppRender) {
    Object.assign(window, {
      _ppRender: window._ppRender,
      _ppModRender: window._ppModRender,
      _ppModLabel: window._ppModLabel,
      _ppTopluBarGuncelle: window._ppTopluBarGuncelle,
      _ppOncelikRender: window._ppOncelikRender
    });
  }

  /* ── V170.3.8 CANONICAL PusulaPro.renderList EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaPro.renderList, {
    _ppRender: window._ppRender,
    _ppModRender: window._ppModRender,
    _ppModLabel: window._ppModLabel,
    _ppTopluBarGuncelle: window._ppTopluBarGuncelle,
    _ppOncelikRender: window._ppOncelikRender
  });
})();
