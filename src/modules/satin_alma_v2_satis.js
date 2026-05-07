var _saEsc=window._saEsc, _saNow=window._saNow, _saToday=window._saToday, _saId=window._saId, _saCu=window._saCu;
/* ── Placeholder fonksiyonlar ───────────────────────────────── */
window._saV2TeklifOlustur = function(id) {
  /* BUG-04: Edit mode alg\u0131lama \u2014 _saV2AktifDuzenlemeTeklif set ise
     o kayd\u0131 source of truth yap, bo\u015f bos olu\u015fturma. */
  var duzenleme = window._saV2AktifDuzenlemeTeklif || null;
  if (!id && !duzenleme) {
    var bos = { id: typeof window.generateId === 'function' ? window.generateId() : ('tmp-' + Date.now()), urunler: [], tedarikci: '', jobId: '', teslimYeri: '', teslimMasraf: '', toplamTutar: 0, toplamPara: 'USD', durum: 'taslak' };
    id = bos.id;
    var _eskiLoad = window._saV2Load;
    window._saV2Load = function() { return [bos].concat(typeof _eskiLoad === 'function' ? _eskiLoad() : []); };
    setTimeout(function() { window._saV2Load = _eskiLoad; }, 5000);
  }
  var liste = window._saV2Load?.() || [];
  var t = duzenleme || liste.find(function(x) { return String(x.id) === String(id); });
  if (!t) { window.toast?.('Teklif bulunamad\u0131', 'warn'); return; }
  var mevcut = document.getElementById('sav2-satis-modal'); if(mevcut) mevcut.remove();
  var modal = document.createElement('div');
  modal.id = 'sav2-satis-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  /* BUG-04: backdrop kapanışında edit mode global'ini temizle */
  modal.onclick = function(e){ if(e.target===modal) { modal.remove(); window._saV2AktifDuzenlemeTeklif = null; } };
  var _u0 = (t.urunler && t.urunler.length) ? t.urunler[0] : t;
  var _para = t.toplamPara || _u0.para || t.para || 'USD';
  var kur = DUAY_KUR_GET(_para, true);
  var alisF = t.toplamTutar ? parseFloat(t.toplamTutar) : (parseFloat(_u0.alisF || t.alisF) || 0);
  var alisTl = (alisF*kur).toFixed(2);
  var marj = 33;
  var satisFiyat = (alisF*kur*(1+marj/100)).toFixed(2);
  var miktar = (t.urunler && t.urunler.length) ? t.urunler.reduce(function(s,u){return s+(parseFloat(u.miktar)||0);},0) : (parseFloat(t.miktar)||1);
  var toplamKar = ((alisF*kur*marj/100)).toFixed(2);
  var _urunAdi = (t.urunler && t.urunler.length) ? (_u0.urunAdi || _u0.turkceAdi || '') : (t.urunAdi || '');
  var _duayKodu = (t.urunler && t.urunler.length) ? (_u0.duayKodu || '') : (t.duayKodu || '');
  var musteriKod = '0000';
  // SATIS-EDITMOD-ID-KORU-001: edit modda eski teklifId'yi koru, yeni ID üretme
  var satisId = (window._saV2AktifDuzenlemeTeklif && window._saV2AktifDuzenlemeTeklif.teklifId)
    ? window._saV2AktifDuzenlemeTeklif.teklifId
    : (window._saTeklifId?.(musteriKod)||(musteriKod+'-'+Date.now()));
  var musteriList = (typeof window.loadCari === 'function' ? window.loadCari({tumKullanicilar:true}) : []).filter(function(c){return !c.isDeleted && (c.type==='musteri'||c.type==='M\u00fc\u015fteri'||c.cariType==='onayli'||c.tip==='musteri');});
  /* SATIS-MODAL-WIDTH-DESIGN-001: modal max-width 1680→2016 (%20 ferahlık) */
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:min(2016px,95vw);max-height:92vh;display:flex;flex-direction:column">';

  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:0.5px solid var(--b);flex-shrink:0">';
  ic += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Satış Teklifi Oluştur</div>';
  ic += '<div style="font-size:9px;color:var(--t3);margin-top:2px">'+_saEsc(_urunAdi)+(t.urunler&&t.urunler.length>1?' · '+t.urunler.length+' ürün':'')+'</div></div>';
  ic += '<div style="display:flex;align-items:center;gap:6px">';
  /* PI-D-001: D1+D2 buton bar — alt2-v3 Apple/Corporate stili */
  ['A','B','D1','D2'].forEach(function(d){
    var ak=(window._saV2AktifPITasarim||'A')===d;
    ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\''+d+'\';window._saV2PIOnizlemeGuncelle()" class="pi-tas-btn" style="font-size:9px;padding:2px 8px;min-width:24px;border:0.5px solid var(--b);border-radius:4px;background:'+(ak?'var(--t)':'transparent')+';color:'+(ak?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">'+d+'</button>';
  });
  /* CLAUDE-KURAL-PI-001 madde 4: PI dil seçici kaldırıldı — PDF zorla EN */
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove();window._saV2AktifDuzenlemeTeklif=null" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1;margin-left:4px">×</button>';
  ic += '</div></div>';

  ic += '<div style="display:flex;flex:1;min-height:0;overflow:hidden">';

  ic += '<div style="flex:1;min-width:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;border-right:0.5px solid var(--b)">';
  // MUSTERI-ONCEKI-SATIS-002: önceki teklif uyarı banner placeholder
  ic += '<div id="sav2-prev-warn" style="display:none"></div>';
  ic += '<div style="display:grid;grid-template-columns:2fr 1.5fr 1.2fr 1.1fr 1.3fr 1.1fr 1.4fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ <span style="color:#A32D2D">*</span></div>';
  ic += '<input type="text" id="st-musteri-ac" placeholder="Musteri ara..." autocomplete="off" style="width:100%;padding:8px 10px;border:0.5px solid var(--b);border-radius:8px;font-size:13px;background:var(--sf)">';
      ic += '<div id="st-musteri-dd" style="display:none;position:absolute;background:var(--bg);border:0.5px solid var(--b);border-radius:8px;max-height:280px;overflow-y:auto;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.06);min-width:300px"></div>';
      ic += '<select id="st-musteri-sec" style="display:none" onchange="event.stopPropagation();var sel=this.options[this.selectedIndex];document.getElementById(\'st-musteri-ad\').value=sel.text;document.getElementById(\'st-musteri-kod\').value=sel.dataset.kod||\'0000\';var k=sel.dataset.kod||\'0000\';var sid=(window._saV2AktifDuzenlemeTeklif&&window._saV2AktifDuzenlemeTeklif.teklifId)?window._saV2AktifDuzenlemeTeklif.teklifId:(window._saTeklifId?.(k)||(k+\'-\'+Date.now()));document.getElementById(\'st-id-goster\').textContent=sid;document.getElementById(\'st-id\').value=sid;window._saV2PIOnizlemeGuncelle();window._saV2CheckPrevTeklif?.()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Müşteri seçin...</option>';
  musteriList.forEach(function(c){ic += '<option value="'+_saEsc(c.id||'')+'" data-kod="'+_saEsc(c.kod||(c.id?String(c.id).slice(-4):'0000'))+'" '+(window._crmSatisMusteriData&&(window._crmSatisMusteriData.name===c.name||window._crmSatisMusteriData.ad===c.ad)?'selected':'')+'>'+_saEsc(c.ad||c.name||'')+'</option>';});
  ic += '</select></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">PROFORMA NO</div>';
  ic += '<div id="st-id-goster" style="font-size:10px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t3);font-family:monospace">'+satisId+'</div>';
  ic += '<input id="st-id" type="hidden" value="'+satisId+'"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">GEÇERLİLİK <span style="color:#A32D2D">*</span></div>';
  ic += '<input type="date" id="st-gecerlilik" onchange="event.stopPropagation();window._saV2PIOnizlemeGuncelle()" onclick="event.stopPropagation()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TESLİM KOŞULU <span style="color:#A32D2D">*</span></div>';
  ic += '<select id="st-incoterm" onchange="event.stopPropagation();window._saV2IncotermAutoSart(this.value);window._saV2PIOnizlemeGuncelle()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].forEach(function(inc){ic += '<option value="'+inc+'" '+(inc==='EXW'?'selected':'')+'>'+inc+'</option>';});
  ic += '</select></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">LİMAN / YER</div>';
  ic += '<input id="st-liman" value="Turkey" oninput="event.stopPropagation();window._saV2PIOnizlemeGuncelle()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">PARA BİRİMİ</div>';
  ic += '<select id="st-para-birimi" onchange="event.stopPropagation();window._saV2SatisTabloyuGuncelle?.();window._saV2PIOnizlemeGuncelle();window._saV2BankaGuncelle(this.value);var _kEl=document.getElementById(\'st-kur-mini\');if(_kEl){var _k=window._saKur&&window._saKur[this.value];if(_k){_kEl.style.display=\'block\';_kEl.textContent=\'1 \'+this.value+\' = \'+_k.toFixed(2)+\' TRY\';}else{_kEl.style.display=\'none\';}}" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option>USD</option><option>EUR</option><option>GBP</option><option>TRY</option><option>CNY</option></select></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">KUR</div><div id="st-kur-mini" style="font-size:10px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t3);font-family:monospace">1 USD = '+DUAY_KUR_GET('USD', true).toFixed(2)+' TRY</div></div>';
  ic += '<div id="st-freight-row" style="display:none;padding:8px 16px 0;align-items:center;flex-wrap:wrap;gap:10px">';
  ic += '<button type="button" id="st-freight-toggle" onclick="event.stopPropagation();window._saV2FreightToggle&&window._saV2FreightToggle()" style="height:26px;padding:0 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);font-size:11px;cursor:pointer;font-family:inherit;color:var(--t2)"><span id="st-freight-toggle-icon">○</span> Freight/Ins. ayri satir</button>';
  ic += '<div id="st-freight-inputs" style="display:none;gap:8px;align-items:center">';
  ic += '<label style="font-size:9px;color:var(--t3);letter-spacing:.06em">FREIGHT</label>';
  ic += '<input type="number" id="st-freight-amount" min="0" step="0.01" placeholder="0.00" style="width:90px;height:26px;padding:0 8px;border:0.5px solid var(--b);border-radius:5px;font-size:11px;text-align:right;font-family:monospace" oninput="event.stopPropagation();window._saV2FreightChange&&window._saV2FreightChange(this.value,&#39;freight&#39;)">';
  ic += '<label id="st-insurance-label" style="font-size:9px;color:var(--t3);letter-spacing:.06em;margin-left:8px">INSURANCE</label>';
  ic += '<input type="number" id="st-insurance-amount" min="0" step="0.01" placeholder="0.00" style="width:90px;height:26px;padding:0 8px;border:0.5px solid var(--b);border-radius:5px;font-size:11px;text-align:right;font-family:monospace" oninput="event.stopPropagation();window._saV2FreightChange&&window._saV2FreightChange(this.value,&#39;insurance&#39;)">';
  ic += '</div>';
  ic += '</div>'
  ic += '</div>';
  /* SATIS-MODAL-PDF-FIX-001: V106'da gizlenen ödeme alanı görünür yap, V106 default-empty davranışı korunur (placeholder option intact) */
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">ÖDEME KOŞULU</div>';
  ic += '<select id="st-odeme" onchange="event.stopPropagation();window._saV2PIOnizlemeGuncelle()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  /* SATIS-PI-PAYMENT-DEFAULT-FIX-001: empty placeholder — kullanıcı seçim yapmazsa st-odeme.value='' (modal'da gizli, default "30% Advance" otomatik kayda gitmesin) */
  ic += '<option value=""></option>';
  ['30% Advance, 70% L/C at sight','50% Advance, 50% L/C at sight','100% Advance before shipment','L/C at sight','T/T 30 days after B/L','T/T 60 days after B/L','D/P at sight','Open Account 30 days'].forEach(function(o){ic += '<option>'+o+'</option>';});
  ic += '</select></div>';
  /* T03-8 v2: sol banka div hidden — sağ PI altında yeni görünür div var */
  // V194b: placeholder IBAN (TR12... sahte test değeri) silindi — _saV2BankaGuncelle() runtime'da textContent ile dolduruyor.
  ic += '<div id="st-banka-bilgi" style="display:none;font-size:9px;padding:6px 10px;background:#E6F1FB;border-radius:5px;border:0.5px solid #B5D4F4;color:#0C447C"></div>';
  
  /* SATIS-JOBID-001: Job ID seçimi + tedarikçi karşılaştırma */
  ic += '<div style="display:flex;align-items:end;gap:8px;padding:8px 10px;background:#FFFCF5;border:0.5px solid #F4E4BC;border-radius:5px;margin-top:6px">';
  ic += '<div style="flex:1"><div style="font-size:8px;font-weight:500;color:#854F0B;letter-spacing:.06em;margin-bottom:3px">JOB ID SEÇ (Tedarik Kaynağı)</div>';
  /* JOB-ID-KAYNAK-FIX-001: select → aranabilir input (alış formuyla tutarlı) */
  /* T03-9: input → select (sadece PusulaPro aktif görevler) */
  /* T03-10: onchange'e JOB ürün otomatik yükleme eklendi (yükleme önce, PI önizleme sonra) */
  ic += '<select id="st-job-id" onchange="event.stopPropagation();window._saV2JobUrunYukle?.(this.value);window._saV2PIOnizlemeGuncelle?.()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid #F4E4BC;border-radius:4px;background:#fff;color:var(--t);font-family:inherit">';
  ic += '<option value="">JOB seç...</option>';
  /* [SATIS-JOBID-ALIS-KAYNAK-001] Kaynak: Alış Teklifleri (satın alma) — tedarik referansı */
  ic += (function(){
    try {
      var alisList = (window._saV2Load?.() || window.loadAlisTeklifleri?.() || []).filter(function(t){
        return !t.isDeleted && (t.jobId || t.job_id);
      });
      /* En yeni önce */
      alisList.sort(function(a,b){ return String(b.createdAt||'').localeCompare(String(a.createdAt||'')); });
      /* Benzersiz JOB ID — ilk görülen (en yeni) kayıt label için kullanılır */
      var seen = {};
      var options = [];
      alisList.forEach(function(t){
        var jid = t.jobId || t.job_id || '';
        if (!jid || seen[jid]) return;
        seen[jid] = true;
        var parcalar = [];
        if (t.tedarikci) parcalar.push(t.tedarikci);
        if (t.piNo) parcalar.push('PI ' + t.piNo);
        var meta = parcalar.length ? ' — ' + parcalar.join(' · ').substring(0, 50) : '';
        options.push('<option value="' + _saEsc(jid) + '">' + _saEsc(jid + meta) + '</option>');
      });
      return options.join('');
    } catch(e){ return ''; }
  })();
  ic += '</select>';
  ic += '<datalist id="st-job-list"></datalist>';
  ic += '</div>';
  ic += '<button onclick="event.stopPropagation();window._saV2JobUrunSecModal(document.getElementById(\'st-job-id\').value)" style="font-size:10px;padding:7px 12px;border:none;border-radius:5px;background:#854F0B;color:#fff;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap">+ Tedarikçi Karşılaştır</button>';
  ic += '</div>';

  ic += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--s2);border-radius:6px;margin:6px 0">';
  ic += '<span style="font-size:10px;color:var(--t3)">Toplu Marj:</span>';
  ic += '<input type="number" id="sav2-toplu-marj" min="0" max="500" step="0.5" placeholder="%" onclick="event.stopPropagation()" oninput="event.stopPropagation()" style="width:70px;font-size:10px;padding:4px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t);font-family:inherit">';
  ic += '<button onclick="event.stopPropagation();window._saV2TopluMarjUygula()" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t);font-family:inherit">T\u00fcm\u00fcne Uygula</button>';
  ic += '<span style="font-size:9px;color:var(--t3)">\u2014 sonra tek tek de\u011fi\u015ftirilebilir</span></div>';
  ic += '<div style="border:0.5px solid var(--b);border-radius:6px;overflow:hidden auto;margin-top:6px;min-height:280px;max-height:55vh">';
  /* SATIS-MODAL-WIDTH-DESIGN-001: + Ürün Ekle butonu sticky top:0, hover bg restore var(--sf) */
  ic += '<button onclick="event.stopPropagation();window._saV2UrunSecModal&&window._saV2UrunSecModal()" style="width:100%;padding:8px 12px;border:none;border-bottom:0.5px dashed var(--b);background:var(--sf);color:var(--t3);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;text-align:center;position:sticky;top:0;z-index:3" onmouseover="this.style.background=\'var(--s3)\'" onmouseout="this.style.background=\'var(--sf)\'">+ Ürün Ekle</button>';
  /* SATIS-URUN-TABLO-001: table-layout:fixed + colgroup ile kolon genişlikleri sabit */
  ic += '<table style="width:100%;border-collapse:collapse;table-layout:fixed">';
  /* SATIS-FORM-PARITE-001: 10 kolon — +BİRİM +MENŞEİ eklendi (satış/alış form parité) */
  ic += '<colgroup>'
    /* SATIS-MODAL-UX-FIX-001: # sıra no kolonu + görsel %4→%3 + ürün %26→%24 toplam %100 normalize */
    + '<col style="width:3%">'    /* # sıra no */
    + '<col style="width:3%">'    /* görsel */
    /* SATIS-MODAL-COL-STICKY-FIX-001: ürün col %24→%32 (+8), 7 diğer kolon %1 azalır, MARJ %5 intact, toplam %100 */
    + '<col style="width:32%">'   /* KOD / ÜRÜN ADI */
    + '<col style="width:7%">'    /* MİKTAR */
    + '<col style="width:7%">'    /* BİRİM */
    + '<col style="width:7%">'    /* ALIŞ */
    + '<col style="width:5%">'    /* MARJ % — intact */
    + '<col style="width:7%">'    /* SATIŞ */
    + '<col style="width:8%">'    /* TOPLAM */
    + '<col style="width:10%">'   /* KAR */
    + '<col style="width:7%">'    /* MENŞEİ */
    + '<col style="width:4%">'    /* Kaldır */
    + '</colgroup>';
  /* SATIS-MODAL-WIDTH-DESIGN-001: thead sticky top:36px (Ürün Ekle butonu altı) */
  ic += '<thead style="position:sticky;top:36px;z-index:2;background:var(--sf);box-shadow:0 1px 0 var(--b)"><tr style="background:var(--s2);font-size:8px;font-weight:600;color:var(--t3);letter-spacing:.04em">';
  ic += '<th style="padding:7px 10px;text-align:center;color:var(--t3)">#</th><th style="padding:7px 10px"></th><th style="padding:7px 10px;text-align:left">KOD / ÜRÜN ADI</th><th style="padding:7px 10px">MİKTAR</th><th style="padding:7px 10px">BİRİM</th><th style="padding:7px 10px;text-align:right">ALIŞ</th><th style="padding:7px 10px">MARJ %</th><th style="padding:7px 10px;text-align:right">SATIŞ</th><th style="padding:7px 10px;text-align:right">TOPLAM</th><th style="padding:7px 10px;text-align:right">KAR</th><th style="padding:7px 10px">MENŞEİ</th><th style="padding:7px 10px"></th></tr></thead>';
  ic += '<tbody id="st-urun-tbody"></tbody></table>';
  ic += '</div>';

  ic += '<div style="background:var(--s2);border-radius:6px;padding:10px 12px;border:0.5px solid var(--b)">';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:var(--t3)">Toplam Satış</span><span style="font-size:14px;font-weight:500;color:#0F6E56;font-variant-numeric:tabular-nums" id="st-ozet-toplam-satis">0 USD</span></div>';
  /* TASARIM-01: Toplam Kâr vurgu — bold + büyük + yeşil + marj yan yana */
  ic += '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:10px;color:var(--t3)">Toplam Kâr</span><span style="display:flex;align-items:baseline;gap:6px"><span style="font-size:14px;font-weight:700;color:#0F6E56;font-variant-numeric:tabular-nums" id="st-ozet-toplam-kar">0 USD</span><span style="font-size:11px;color:var(--t3);font-weight:500" id="st-ozet-marj-yan">(%0 marj)</span></span></div>';
  ic += '</div>';
  ic += '<input type="hidden" id="st-musteri-ad" value=""><input type="hidden" id="st-musteri-kod" value="0000">';
  ic += '<input type="hidden" id="st-urun-adi-hidden" value="'+_saEsc(_urunAdi)+'"><input type="hidden" id="st-duay-kodu-hidden" value="'+_saEsc(_duayKodu)+'"><input type="hidden" id="st-alis-tl-hidden" value="'+alisTl+'">';
  ic += '<input type="hidden" id="st-teslim" value="">';
  ic += '</div>';

  ic += '<div style="width:380px;flex-shrink:0;background:var(--s2);overflow-y:auto;padding:12px" id="st-pi-onizleme-panel">';
  ic += '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:8px">CANLI PI ÖNİZLEME</div>';
  /* TASARIM-03: Müşteri geçmişi istatistik kartı — müşteri seçilince doldurulur */
  ic += '<div id="st-musteri-gecmis-kutu" style="display:none;background:#EEF4FA;border:1px solid #B5D4F4;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:11px"></div>';
  ic += '<div id="st-pi-onizleme" style="background:var(--sf);border:0.5px solid var(--b);border-radius:6px;padding:12px;font-size:9px">';
  ic += '<div style="text-align:center;border-bottom:0.5px solid var(--b);padding-bottom:8px;margin-bottom:8px">';
  ic += '<div style="font-size:11px;font-weight:500;color:var(--t)">DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</div>';
  ic += '<div style="font-size:8px;color:var(--t3)">www.duaycor.com · +90 212 625 5 444 · WhatsApp: +90 532 270 5 113</div>';
  ic += '<div style="font-size:11px;font-weight:500;margin-top:6px;color:var(--t)">PROFORMA INVOICE</div>';
  ic += '<div style="font-size:8px;color:var(--t3)">No: '+satisId+'</div>';
  ic += '</div>';
  ic += '<div style="font-size:8px;color:var(--t3);font-style:italic;text-align:center;margin-bottom:8px">Product images shown are for illustrative purposes only.</div>';
  ic += '</div>';
  /* T03-8 v2: PI önizleme kardeşi banka div — sağ panel scroll'u içinde alta yerleşir */
  ic += '<div id="st-banka-bilgi-pi" style="margin-top:10px;font-size:9px;padding:8px 10px;background:#E6F1FB;border-radius:5px;border:0.5px solid #B5D4F4;color:#0C447C;line-height:1.4">USD IBAN: Yükleniyor...</div>';
  ic += '</div>';
  ic += '</div>';

  ic += '<div style="border:0.5px solid var(--b);border-radius:8px;overflow:hidden;margin:0 16px 8px">';
  ic += '<div style="display:grid;grid-template-columns:65% 35%;gap:0">';
  ic += '<div>';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  ic += '<div style="font-size:9px;font-weight:500;color:var(--t2)">TEKL\u0130F \u015eARTLARI <span style="font-size:8px;color:var(--t3)">(max 10)</span></div>';
  ic += '<button onclick="event.stopPropagation();window._saV2SartEkle()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">+ Ekle</button></div>';
  ic += '<div id="st-sartlar-liste" style="padding:6px 10px;max-height:180px;overflow-y:auto"></div>';
  ic += '</div>';
  ic += '<div style="border-left:0.5px solid var(--b);background:var(--s2);padding:14px;display:flex;flex-direction:column;justify-content:center;gap:14px">';
  ic += '<div>';
  ic += '<div style="font-size:10px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin-bottom:6px">HAZIR SART</div>';
  ic += '<div style="display:flex;gap:6px">';
  ic += '<select id="st-sart-sec" onclick="event.stopPropagation()" style="flex:1;font-size:10px;padding:4px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Haz\u0131r \u015fart se\u00e7in...</option>';
  (window._saV2Sartlar?.() || []).forEach(function(s) { ic += '<option value="' + _saEsc(s) + '">' + _saEsc(s.length > 60 ? s.slice(0, 57) + '...' : s) + '</option>'; });
  ic += '</select><button onclick="event.stopPropagation();window._saV2SartComboEkle()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Se\u00e7</button></div>';
  ic += '</div>';
  ic += '<div>';
  ic += '<div style="font-size:10px;font-weight:500;color:var(--t3);letter-spacing:.08em;margin-bottom:6px">MANUEL SART</div>';
  ic += '<div style="display:flex;gap:6px"><input id="st-sart-manuel" placeholder="Manuel \u015fart yaz..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="flex:1;font-size:10px;padding:4px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit">';
  ic += '<button onclick="event.stopPropagation();window._saV2SartManuelEkle()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Ekle</button></div></div></div></div></div>';

  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:0.5px solid var(--b);flex-shrink:0;background:var(--sf)">';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove();window._saV2AktifDuzenlemeTeklif=null" style="font-size:11px;padding:7px 16px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">\u0130ptal</button>';
  ic += '<div style="display:flex;gap:6px">';
  /* SATIS-008: _btnGuard ile \u00e7ift basma engeli + spinner */
  ic += '<button onclick="event.stopPropagation();window._btnGuard?.(this, function(){window._saV2TamOnIzle();}, 3000)" style="font-size:11px;padding:7px 14px;border:0.5px solid #185FA5;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#185FA5;font-weight:500">\u{1F441} Tam \u00d6n \u0130zle</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisKaydet(\''+t.id+'\')" style="font-size:11px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Taslak Kaydet</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisKaydetVeGit(\''+t.id+'\')" style="font-size:11px;padding:7px 20px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-weight:500;font-family:inherit">Teklifi Oluştur →</button>';
  ic += '</div></div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
  window._saV2AktifPITasarim = window._saV2AktifPITasarim || 'A';
  window._saV2AktifPIDil = window._saV2AktifPIDil || 'EN';
  /* BUG-04: create mode'da ürün state'i sıfırla; edit mode'da _saV2TeklifDuzenle zaten doldurdu */
  if (!duzenleme) {
    window._saV2SatisUrunler = [];
    window._saV2SatisUrunEkle(t);
  }
  /* BUG-04 + SATIS-FORM-PI-FIX-001: edit mode'da kayıttaki şartları kullan, yoksa _saV2Sartlar() TÜM listesi (slice(0,5) yanlıştı) */
  window._stSartlar = (duzenleme && duzenleme.sartlar && duzenleme.sartlar.length)
    ? duzenleme.sartlar.slice()
    : (window._saV2Sartlar?.() || []).slice();
  window._stFreightToggle = !!(duzenleme && duzenleme.freightToggle);
  window._stFreightAmount = (duzenleme && parseFloat(duzenleme.freightAmount)) || 0;
  window._stInsuranceAmount = (duzenleme && parseFloat(duzenleme.insuranceAmount)) || 0;
  setTimeout(function() { window._saV2SartListeGuncelle(); }, 100);
  setTimeout(function(){ window._saV2PIOnizlemeGuncelle?.(); }, 50);
  // MUSTERI-ONCEKI-SATIS-002: form açıldığında önceki teklif kontrolü
  setTimeout(function(){ window._saV2CheckPrevTeklif?.(); }, 60);
  /* T03-8 v2: banka init — 150ms sonra default para birimine göre doldur (sağ PI banka div'i) */
  setTimeout(function(){
    var paraEl = document.getElementById('st-para-birimi');
    var defaultPara = (paraEl && paraEl.value) || 'USD';
    window._saV2BankaGuncelle && window._saV2BankaGuncelle(defaultPara);
  }, 150);
  if (duzenleme) {
    setTimeout(function(){
      /* BUG-04: Edit mode — form input'larını kayıttan geri yükle */
      var mAd = duzenleme.musteri || duzenleme.musteriAd || '';
      var mKod = duzenleme.musteriKod || '';
      var mAdEl = document.getElementById('st-musteri-ad');
      var mKodEl = document.getElementById('st-musteri-kod');
      var mSel = document.getElementById('st-musteri-sec');
      if (mAdEl) mAdEl.value = mAd;
      if (mKodEl) mKodEl.value = mKod;
      if (mSel) {
        Array.from(mSel.options).forEach(function(o){
          if (o.text === mAd || o.dataset.kod === mKod) o.selected = true;
        });
      }
      var setVal = function(id, val){
        var el = document.getElementById(id);
        if (el && val != null) el.value = val;
      };
      setVal('st-gecerlilik', duzenleme.gecerlilik || '');
      setVal('st-teslim-yeri', duzenleme.teslim || duzenleme.teslimYeri || '');
      setVal('st-para-birimi', duzenleme.paraBirimi || duzenleme.para || 'USD');
      setVal('st-odeme', duzenleme.odeme || '');
      /* SATIS-FORM-PI-FIX-001: incoterm save'de teslim adıyla yazılıyor → load'da teslim'den parse */
      var _t = (duzenleme.teslim || duzenleme.teslimSekli || '').toString().trim();
      var _incFirst = (_t.split(/\s+/)[0] || '').toUpperCase();
      var _validIncs = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'];
      setVal('st-incoterm', _validIncs.indexOf(_incFirst) >= 0 ? _incFirst : (duzenleme.incoterm || 'EXW'));
      setVal('st-job-id', duzenleme.jobId || '');
      window._saV2SatisTabloyuGuncelle?.();
      window._saV2PIOnizlemeGuncelle?.();
      window._saV2BankaGuncelle?.(duzenleme.paraBirimi || duzenleme.para || 'USD');
      window._saV2SatisValidate?.();
      // Edit mode UI sync — freight/insurance state -> UI
      var inco = (document.getElementById('st-incoterm') || {}).value || '';
      var showRow = (inco === 'CFR' || inco === 'CIF' || inco === 'CIP');
      var row = document.getElementById('st-freight-row');
      if (row) row.style.display = showRow ? 'flex' : 'none';
      if (showRow) {
        var icon = document.getElementById('st-freight-toggle-icon');
        var inputs = document.getElementById('st-freight-inputs');
        var btn = document.getElementById('st-freight-toggle');
        var freightInp = document.getElementById('st-freight-amount');
        var insInp = document.getElementById('st-insurance-amount');
        var insLabel = document.getElementById('st-insurance-label');
        if (icon) icon.textContent = window._stFreightToggle ? '●' : '○';
        if (inputs) inputs.style.display = window._stFreightToggle ? 'flex' : 'none';
        if (btn) btn.style.background = window._stFreightToggle ? 'var(--s3)' : 'var(--s2)';
        if (freightInp) freightInp.value = window._stFreightAmount > 0 ? window._stFreightAmount : '';
        if (insInp) insInp.value = window._stInsuranceAmount > 0 ? window._stInsuranceAmount : '';
        var showIns = (inco === 'CIF' || inco === 'CIP');
        if (insLabel) insLabel.style.display = showIns ? '' : 'none';
        if (insInp) insInp.style.display = showIns ? '' : 'none';
      }
    }, 120);

  }
  /* SATIS-V3-CUSTOMER-AUTOCOMPLETE-FIX-001 */
  setTimeout(function(){
    var input = document.getElementById('st-musteri-ac');
    var sel = document.getElementById('st-musteri-sec');
    var dd = document.getElementById('st-musteri-dd');
    if (!input || !sel || !dd) return;

    // FIX2: Dropdown konum — fixed + viewport koordinati
    dd.style.position = 'fixed';

    function _pozisyonla() {
      var r = input.getBoundingClientRect();
      dd.style.top = (r.bottom + 2) + 'px';
      dd.style.left = r.left + 'px';
      dd.style.minWidth = r.width + 'px';
    }

    if (sel.value && sel.options[sel.selectedIndex]) {
      input.value = sel.options[sel.selectedIndex].text;
    }

    function _sonKullanilan() {
      try {
        var tk = (window.loadSatisTeklifleri && window.loadSatisTeklifleri() || []).filter(function(t){ return !t.isDeleted; });
        tk.sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); });
        var ids = [];
        for (var i=0; i<tk.length && ids.length<5; i++) {
          var mid = tk[i].musteriId || tk[i].cariId;
          if (mid && ids.indexOf(mid) === -1) ids.push(mid);
        }
        return ids;
      } catch(e){ return []; }
    }

    function _trLower(s) {
      try { return (s||'').toLocaleLowerCase('tr-TR'); }
      catch(e) { return (s||'').toLowerCase(); }
    }

    function _renderDD(query) {
      _pozisyonla();
      var q = _trLower((query||'').trim());
      var opts = Array.from(sel.options).filter(function(o){ return o.value; });
      var items = opts.map(function(o){
        return { id: o.value, label: o.text, kod: o.dataset.kod || '' };
      });

      var sonIds = _sonKullanilan();
      var sonItems = sonIds.map(function(id){
        return items.find(function(it){ return it.id === id; });
      }).filter(Boolean);

      var filtered = q ? items.filter(function(it){
        return _trLower(it.label).indexOf(q) !== -1 || _trLower(it.kod).indexOf(q) !== -1;
      }) : items;

      var html = '';
      if (!q && sonItems.length) {
        html += '<div style="padding:6px 12px;font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;font-weight:500;background:rgba(0,0,0,0.02);border-bottom:0.5px solid var(--b)">Son Kullanilan</div>';
        sonItems.forEach(function(it){
          html += '<div class="st-mu-item" data-id="' + it.id + '" data-label="' + (it.label||'').replace(/"/g,'&quot;') + '" style="padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--b);font-size:12px">' + it.label + '</div>';
        });
        html += '<div style="padding:6px 12px;font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;font-weight:500;background:rgba(0,0,0,0.02);border-bottom:0.5px solid var(--b)">Tum Musteriler</div>';
      }

      if (filtered.length === 0) {
        html += '<div style="padding:10px 12px;font-size:11px;color:var(--t3);font-style:italic">Sonuc bulunamadi</div>';
      } else {
        filtered.forEach(function(it){
          html += '<div class="st-mu-item" data-id="' + it.id + '" data-label="' + (it.label||'').replace(/"/g,'&quot;') + '" style="padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--b);font-size:12px">' + it.label + '</div>';
        });
      }

      html += '<div style="padding:8px 12px;font-size:10px;color:var(--t3);background:rgba(0,0,0,0.02);font-style:italic">Musteri yoksa Musteri Iliskileri menusunden ekleyin</div>';

      dd.innerHTML = html;
      dd.style.display = 'block';

      Array.from(dd.querySelectorAll('.st-mu-item')).forEach(function(el){
        el.addEventListener('mouseenter', function(){ el.style.background = 'rgba(0,0,0,0.04)'; });
        el.addEventListener('mouseleave', function(){ el.style.background = ''; });
        el.addEventListener('click', function(){
          var id = el.dataset.id;
          var label = el.dataset.label;
          sel.value = id;
          sel.dispatchEvent(new Event('change'));
          input.value = label;
          dd.style.display = 'none';
        });
      });
    }

    input.addEventListener('focus', function(){ _renderDD(input.value); });
    input.addEventListener('input', function(){ _renderDD(input.value); });
    input.addEventListener('keydown', function(e){
      if (e.key === 'Escape') dd.style.display = 'none';
    });
    document.addEventListener('click', function(e){
      if (!dd.contains(e.target) && e.target !== input) dd.style.display = 'none';
    });
    window.addEventListener('scroll', _pozisyonla, true);
    window.addEventListener('resize', _pozisyonla);
  }, 200);

};

/**
 * MUSTERI-ONCEKI-SATIS-002
 * _saV2TeklifOlustur form'unda müşteri seçildiğinde aynı müşteriye verilmiş
 * önceki satış tekliflerini loadSatisTeklifleri() ile bul, varsa formun üstüne
 * sarı uyarı banner'ı yerleştir. Banner'a tıklanınca en son teklifin peek
 * paneli açılır (window._stPeekAc). Edit modunda mevcut teklif kendisi
 * sayılmaz (window._saV2AktifDuzenlemeTeklif.id ile dışlanır).
 *
 * MUSTERI-ONCEKI-SATIS-001'in (satis_teklif.js) kardeş implementasyonu —
 * aynı banner mantığı, farklı form ID'leri.
 */
window._saV2CheckPrevTeklif = function() {
  var sel = document.getElementById('st-musteri-sec');
  var warn = document.getElementById('sav2-prev-warn');
  if (!sel || !warn) return;
  var customerName = '';
  if (sel.selectedIndex >= 0) {
    var opt = sel.options[sel.selectedIndex];
    customerName = (opt && opt.text) || '';
  }
  // Boş veya placeholder seçim
  if (!customerName || customerName === 'Müşteri seçin...') {
    warn.style.display = 'none'; warn.innerHTML = '';
    /* TASARIM-03: kutu da gizle */
    var k0 = document.getElementById('st-musteri-gecmis-kutu'); if (k0) k0.style.display = 'none';
    return;
  }
  // Edit modunda mevcut teklif id'si (varsa) — kendi kendini exclude et
  var currentDbId = window._saV2AktifDuzenlemeTeklif && window._saV2AktifDuzenlemeTeklif.id;
  var allSatis = (typeof window.loadSatisTeklifleri === 'function') ? window.loadSatisTeklifleri() : [];
  var prev = allSatis.filter(function(x) {
    var match = (x.musteri === customerName || x.customerName === customerName);
    if (!match) return false;
    if (currentDbId != null && String(x.id) === String(currentDbId)) return false;
    return true;
  });
  if (!prev.length) {
    warn.style.display = 'none'; warn.innerHTML = '';
    /* TASARIM-03: kutu da gizle — yeni müşteride eski kart kalmasın (T4) */
    var k1 = document.getElementById('st-musteri-gecmis-kutu'); if (k1) k1.style.display = 'none';
    return;
  }
  // En yeni: createdAt desc sort
  prev.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  var latest = prev[0];
  var dateStr = (latest.createdAt || '').slice(0, 10) || '—';
  var amt = (parseFloat(latest.genelToplam) || parseFloat(latest.toplam) || 0).toLocaleString('tr-TR') + ' ' + (latest.paraBirimi || latest.currency || 'USD');
  var esc = (typeof window._esc === 'function') ? window._esc : function(s) { return String(s == null ? '' : s); };
  warn.style.display = 'block';
  warn.innerHTML = '<div onclick="event.stopPropagation();window._stPeekAc?.(' + latest.id + ')" style="padding:10px 14px;background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;cursor:pointer;font-size:12px;color:#92400E;display:flex;align-items:center;gap:8px;transition:background .15s" onmouseover="this.style.background=\'#FDE68A\'" onmouseout="this.style.background=\'#FEF3C7\'">'
    + '<span style="font-size:16px;flex-shrink:0">⚠️</span>'
    + '<span style="flex:1"><strong>' + esc(customerName) + '</strong> müşterisine daha önce <strong>' + prev.length + '</strong> teklif verildi — en son: <strong>' + esc(dateStr) + '</strong> · <strong>' + esc(amt) + '</strong></span>'
    + '<span style="font-size:10px;opacity:.85;flex-shrink:0">Detayı gör →</span>'
  + '</div>';

  /* TASARIM-03: Mavi istatistik kartı — sağ PI panel üstü */
  var kutu = document.getElementById('st-musteri-gecmis-kutu');
  if (kutu) {
    if (!prev || !prev.length) {
      kutu.style.display = 'none';
    } else {
      kutu.style.display = 'block';

      var sonTeklif = prev[0];
      var sonTarih = (sonTeklif.createdAt || '').slice(0, 10);
      var sonTutar = (parseFloat(sonTeklif.genelToplam) || 0)
        .toLocaleString('tr-TR', {maximumFractionDigits: 0});
      var sonPara = sonTeklif.paraBirimi || 'USD';

      /* Ortalama marj — numeric filtre */
      var marjlar = prev.map(function(t){ return parseFloat(t.ortMarj); })
                        .filter(function(m){ return !isNaN(m); });
      var ortMarj = marjlar.length
        ? (marjlar.reduce(function(s,m){return s+m;}, 0) / marjlar.length).toFixed(1)
        : '0';
      var ortMarjStr = String(ortMarj).replace('.', ',');

      /* Sık ürün — frekans + ilk 2 */
      var urunSay = {};
      prev.forEach(function(t){
        (t.urunler || []).forEach(function(u){
          var ad = (u.urunAdi || '').trim();
          if (ad) urunSay[ad] = (urunSay[ad] || 0) + 1;
        });
      });
      var sikUrunler = Object.keys(urunSay).sort(function(a,b){
        return urunSay[b] - urunSay[a];
      });
      var sikUrunStr = sikUrunler.length
        ? sikUrunler.slice(0, 2).map(function(ad){
            return ad + ' (×' + urunSay[ad] + ')';
          }).join(', ')
        : '—';

      /* Kabul oranı */
      var kabulSay = prev.filter(function(t){
        return ['kabul', 'onaylandi', 'onay'].indexOf(t.durum) >= 0;
      }).length;
      var kabulOran = prev.length
        ? Math.round(kabulSay / prev.length * 100)
        : 0;
      var kabulRenk = kabulOran >= 50 ? '#16A34A'
                    : (kabulOran >= 25 ? '#D97706' : '#DC2626');

      /* Render */
      var musteriAd = _saEsc(sonTeklif.musteri || sonTeklif.musteriAd || '');
      var sonTeklifIdEsc = _saEsc(String(sonTeklif.id || ''));

      kutu.innerHTML =
        '<div style="font-size:10px;font-weight:600;color:#0C447C;letter-spacing:.05em;margin-bottom:8px">'
          + 'MÜŞTERİ GEÇMİŞİ — ' + musteriAd
        + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:4px">'
          + '<div onclick="window._stPeekAc?.(\'' + sonTeklifIdEsc + '\')" '
          + 'style="cursor:pointer;color:var(--t)" '
          + 'title="Tıkla — son teklifi göster">'
            + '<span style="color:var(--t3)">Son teklif:</span> '
            + '<span style="font-weight:500">' + sonTarih + ' · '
            + sonTutar + ' ' + _saEsc(sonPara) + '</span>'
          + '</div>'
          + '<div>'
            + '<span style="color:var(--t3)">Ort. marj:</span> '
            + '<span style="font-weight:500;font-variant-numeric:tabular-nums">%'
            + ortMarjStr + '</span>'
          + '</div>'
          + '<div>'
            + '<span style="color:var(--t3)">Sık ürün:</span> '
            + '<span style="font-weight:500">' + _saEsc(sikUrunStr) + '</span>'
          + '</div>'
          + '<div>'
            + '<span style="color:var(--t3)">Kabul oranı:</span> '
            + '<span style="font-weight:500;color:' + kabulRenk + '">%'
            + kabulOran + ' (' + kabulSay + '/' + prev.length + ')</span>'
          + '</div>'
        + '</div>';
    }
  }
};

window._saV2SatisKaydet = function(alisId) {
  var teklifId = document.getElementById('st-id')?.value||'';
  var musteriAd = document.getElementById('st-musteri-ad')?.value?.trim()||'';
  var urunler = window._saV2SatisUrunler||[];
  var toplamSatis = 0; var toplamAlis = 0;
  urunler.forEach(function(u){ toplamSatis+=u.alisTl*(1+u.marj/100)*u.miktar; toplamAlis+=u.alisTl*u.miktar; });
  var toplamKar = (toplamSatis-toplamAlis).toFixed(2);
  var ortMarj = toplamAlis>0?((toplamSatis-toplamAlis)/toplamAlis*100).toFixed(1):0;
  /* SATIS-REV-DESTEK-001: aynı teklifId için mevcut kayıt varsa revNo otomatik artırılır */
  var _mevcutlar = (typeof window.loadSatisTeklifleri==='function' ? window.loadSatisTeklifleri() : [])
    .filter(function(t){ return t.teklifId===teklifId && !t.isDeleted; });
  var _sonRev = _mevcutlar.length > 0 ? Math.max.apply(null, _mevcutlar.map(function(t){ return parseInt(t.revNo)||1; })) : 0;
  var _yeniRevNo = String(_sonRev + 1).padStart(2,'0');
  /* PARA-BUG: seçilen para birimini oku, toplamSatis (TL) → o para birimine çevir */
  var _paraSec = document.getElementById('st-para-birimi')?.value || 'USD';
  var _kur = DUAY_KUR_GET(_paraSec, true);
  var kayit = {
    id:window._saId?.(),
    teklifId:teklifId,
    revNo: _yeniRevNo,
    alisId:alisId,
    musteriAd:musteriAd,
    musteriKod:document.getElementById('st-musteri-kod')?.value||'',
    urunler:urunler,
    /* SARTLAR-PERSIST: modal session şartlarını kaydet (yoksa boş array) */
    sartlar: (window._stSartlar || []).slice(),
      freightToggle: !!window._stFreightToggle,
      freightAmount: parseFloat(window._stFreightAmount) || 0,
      insuranceAmount: parseFloat(window._stInsuranceAmount) || 0,
    toplamSatis:toplamSatis.toFixed(2),
    toplamEUR: (parseFloat(toplamSatis) / DUAY_KUR_GET("EUR", true) * DUAY_KUR_GET("USD", true)).toFixed(2),
    toplamKar:toplamKar,
    ortMarj:ortMarj,
    teslim:document.getElementById('st-teslim')?.value||document.getElementById('st-incoterm')?.value||'',
    odeme:document.getElementById('st-odeme')?.value||'',
    gecerlilik:document.getElementById('st-gecerlilik')?.value||'',
    durum:'taslak',
    createdAt:window._saNow?.(),
    updatedAt:window._saNow?.(),
    // SATIS-SCHEMA-FIX-001: renderSatisTeklifleri ile uyumlu alan alias'lari
    teklifNo: teklifId,
    musteri: musteriAd,
    genelToplam: parseFloat((toplamSatis / _kur).toFixed(2)),
    paraBirimi: _paraSec,
    createdBy: (window.Auth && window.Auth.getCU && window.Auth.getCU()?.name) || (window.CU && window.CU()?.name) || '',
    jobId: document.getElementById('st-job-id')?.value || ''
  };
  /* FEAT-07e: Kabul durumunda ORD üret (defansif — tüm save akışlarını yakalar) */
  if (kayit.durum === 'kabul' && !kayit.ordNo) {
    if (window._ordKodUret) {
      kayit.ordNo = window._ordKodUret();
      kayit.ordCreatedAt = new Date().toISOString();
      kayit.ordCreatedBy = (window.CU && window.CU() || {}).uid
                        || (window.CU && window.CU() || {}).id
                        || '';

      if (window.logActivity) {
        window.logActivity('ORDER_CREATE', {
          ordNo: kayit.ordNo,
          teklifId: kayit.id,
          teklifNo: kayit.teklifNo || kayit.teklifId,
          tarih: kayit.ordCreatedAt
        });
      }
    }
  }
  var teklifler = typeof window.loadSatisTeklifleri === 'function' ? window.loadSatisTeklifleri() : [];
  teklifler.unshift(kayit);
  if (typeof window.storeSatisTeklifleri === 'function') window.storeSatisTeklifleri(teklifler);
  document.getElementById('sav2-satis-modal')?.remove();
  /* BUG-04: kaydet sonrası edit mode global'ini temizle */
  window._saV2AktifDuzenlemeTeklif = null;
  window._saV2TakipGorevOlustur(kayit);
  window.renderSatisTeklifleri?.();
  window.toast?.('Sat\u0131\u015f teklifi kaydedildi: ' + teklifId, 'ok');
};

window._saV2SatisPDF = function() {
  var teklifId = document.getElementById('st-id')?.value||'';
  var musteriAd = document.getElementById('st-musteri-ad')?.value||'';
  var musteriKod = document.getElementById('st-musteri-kod')?.value||'';
  var gecerlilik = document.getElementById('st-gecerlilik')?.value||'';
  var teslim = document.getElementById('st-teslim')?.value||document.getElementById('st-incoterm')?.value||'FOB Istanbul';
  var odeme = document.getElementById('st-odeme')?.value||'';
  var tasarim = window._saV2AktifPITasarim || 'A';
  var teklif = {
    teklifId: teklifId,
    musteriAd: musteriAd,
    musteriKod: musteriKod,
    gecerlilik: gecerlilik,
    teslim: teslim,
    odeme: odeme,
    urunler: window._saV2SatisUrunler || [],
    revNo: '01',
    dil: window._saV2AktifPIDil || 'EN',
    /* SATIS-PI-PREVIEW-FIELDS-FIX-001: PI fn'lerinin (subtotal, freight, insurance, sartlar) ihtiyaç duyduğu field'lar */
    toplamSatis: (window._saV2SatisUrunler || []).reduce(function(s, u) {
      return s + (parseFloat(u.satisFiyat) || 0) * (parseFloat(u.miktar) || 0);
    }, 0).toFixed(2),
    sartlar: (window._stSartlar || []).slice(),
    freightToggle: !!window._stFreightToggle,
    freightAmount: parseFloat(window._stFreightAmount) || 0,
    insuranceAmount: parseFloat(window._stInsuranceAmount) || 0
  };
  if (typeof window._piOlustur !== 'function') {
    window.toast?.('PI modülü yüklenmedi','warn'); return;
  }
  window._piOlustur(teklif, tasarim, 'musteri');
};

/* ── SA-V2-TAKIP-001: Satış takip görev otomasyonu ─────────── */
window._saV2TakipGorevOlustur = function(teklif) {
  try {
    if (typeof window._ppLoad !== 'function' || typeof window._ppStore !== 'function') return;
    var takipTarih = new Date();
    takipTarih.setDate(takipTarih.getDate() + 2);
    var takipStr = takipTarih.toISOString().slice(0,10);
    var gorev = {
      id: window._saId?.() || Date.now()+Math.random().toString(36).slice(2,6),
      baslik: 'Takip: '+_saEsc(teklif.musteriAd||'Müşteri')+' — '+_saEsc(teklif.teklifId||''),
      aciklama: 'Satış teklifi gönderildi. Müşteri yanıtı takip edilmeli. Teklif ID: '+(teklif.teklifId||''),
      departman: 'Satış',
      oncelik: 'yuksek',
      durum: 'plan',
      bitTarih: takipStr,
      basT: takipStr,
      job_id: teklif.teklifId||'',
      _ppSource: 'pro',
      _kaynak: 'satis_takip',
      _teklifId: teklif.teklifId||'',
      _musteriAd: teklif.musteriAd||'',
      _tekrarGun: 3,
      createdAt: window._saNow?.(),
      updatedAt: window._saNow?.()
    };
    var tasks = window._ppLoad();
    tasks.unshift(gorev);
    window._ppStore(tasks);
    /* Teklif objesine takip tarihi yaz */
    var teklifler = window._saTeklifLoad?.() || [];
    var tk = teklifler.find(function(x){return x.teklifId===(teklif.teklifId||'');});
    if(tk){ tk.takipTarih = takipStr; window._saTeklifStore?.(teklifler); }
    /* SATIS-009: production console.log temizliği — debug mesajı kaldırıldı */
  } catch(e) { console.error('[SA-V2] Takip görevi hatası:', e); }
};

window._saV2TakipKontrol = function() {
  try {
    if (typeof window._ppLoad !== 'function') return;
    var tasks = window._ppLoad();
    var bugun = new Date().toISOString().slice(0,10);
    var guncellendi = false;
    tasks.forEach(function(t) {
      if (t._kaynak !== 'satis_takip' || t.durum === 'tamamlandi') return;
      if (t.bitTarih && t.bitTarih <= bugun) {
        var yeniTarih = new Date();
        yeniTarih.setDate(yeniTarih.getDate() + (t._tekrarGun||3));
        t.bitTarih = yeniTarih.toISOString().slice(0,10);
        t.baslik = 'Takip ('+(parseInt(t._tekrarSay||0)+1)+'. hatırlatma): '+(t._musteriAd||'Müşteri');
        t._tekrarSay = (parseInt(t._tekrarSay||0)+1);
        t.updatedAt = window._saNow?.();
        guncellendi = true;
        window.toast?.('Takip hatırlatması: '+(t._musteriAd||'Müşteri'),'info');
      }
    });
    if (guncellendi) window._ppStore(tasks);
  } catch(e) { console.error('[SA-V2] Takip kontrol hatası:', e); }
};

setTimeout(function(){ window._saV2TakipKontrol?.(); }, 3000);

/* ── SATIS-FORM-C-001: Canlı PI Önizleme + Banka + Kaydet&Git ─── */
window._saV2BankaGuncelle = function(para) {
  // BANKA-IBAN-FIX-001 + V194b GBP-DEVRE-DISI: gerçek IBAN'larla güncellendi (Garanti + Albaraka).
  // GBP fallback YANLIS USD IBAN'ı gösteriyordu — devre dışı bırakıldı (gerçek GBP IBAN yok).
  // V194d'de bu blok DUAY_BANKA(cur) accessor'ına bağlanacak.
  var bankalar = {
    'USD': 'T. GARANTİ BANKASI A.Ş. · USD IBAN: TR39 0006 2001 1810 0009 0812 68 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'EUR': 'T. GARANTİ BANKASI A.Ş. · EUR IBAN: TR66 0006 2001 1810 0009 0812 67 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'TRY': 'T. GARANTİ BANKASI A.Ş. · TL IBAN: TR24 0006 2001 1810 0006 2960 86 · YEŞİLPINAR ŞUBESİ / 1181 | ALBARAKA TÜRK · TL IBAN: TR54 0020 3000 0889 5310 0000 05 · ALİBEYKÖY / 117',
    'GBP': 'GBP transfer şu an desteklenmiyor — lütfen USD veya EUR seçin.'
  };
  var el = document.getElementById('st-banka-bilgi');
  if(el) el.textContent = bankalar[para] || bankalar['USD'];
  /* T03-8 v2: sağ PI paneldeki kardeş banka div'i de senkron güncelle */
  var elPI = document.getElementById('st-banka-bilgi-pi');
  if(elPI) elPI.textContent = bankalar[para] || bankalar['USD'];
};

window._saV2PIOnizlemeGuncelle = function() {
  var onizleme = document.getElementById('st-pi-onizleme');
  if(!onizleme) return;
  var musteri = document.getElementById('st-musteri-ad')?.value||'—';
  var gecerlilik = document.getElementById('st-gecerlilik')?.value||'—';
  var incoterm = document.getElementById('st-incoterm')?.value||'EXW';
  var liman = document.getElementById('st-liman')?.value||'Turkey';
  var odeme = document.getElementById('st-odeme')?.value||'—';
  var para = document.getElementById('st-para-birimi')?.value||'USD';
  var piNo = document.getElementById('st-id')?.value||'—';
  var urunler = window._saV2SatisUrunler||[];
  var toplamSatis = urunler.reduce(function(s,u){return s+(parseFloat(u.satisFiyat)||0)*(parseFloat(u.miktar)||0);},0);
  /* PI-TASARIM-PREVIEW-BADGE-001: aktif tasarım + dil görsel feedback (preview hardcoded ama kullanıcı state'i görmeli) */
  var _aktifT = window._saV2AktifPITasarim || 'A';
  var _aktifD = window._saV2AktifPIDil || 'EN';
  var h = '<div style="display:flex;justify-content:flex-end;gap:4px;margin-bottom:4px"><span style="font-size:8px;padding:2px 6px;border-radius:3px;background:var(--t);color:var(--sf);font-family:monospace">'+_aktifT+'</span><span style="font-size:8px;padding:2px 6px;border-radius:3px;background:var(--bm);color:var(--t);font-family:monospace">'+_aktifD+'</span></div>';
  h += '<div style="text-align:center;border-bottom:0.5px solid var(--b);padding-bottom:8px;margin-bottom:8px">';
  h += '<div style="font-size:11px;font-weight:500;color:var(--t)">DUAY ULUSLARARASI TİCARET LTD. ŞTİ.</div>';
  h += '<div style="font-size:8px;color:var(--t3)">www.duaycor.com · +90 212 625 5 444 · WhatsApp: +90 532 270 5 113</div>';
  h += '<div style="font-size:11px;font-weight:500;margin-top:6px;color:var(--t)">PROFORMA INVOICE</div>';
  h += '<div style="font-size:8px;color:var(--t3)">No: '+piNo+'</div>';
  h += '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;font-size:8px">';
  h += '<div><span style="color:var(--t3)">TO: </span><strong>'+musteri+'</strong></div>';
  h += '<div><span style="color:var(--t3)">VALID: </span>'+gecerlilik+'</div>';
  h += '<div><span style="color:var(--t3)">DELIVERY: </span>'+incoterm+' '+liman+'</div>';
  h += '<div><span style="color:var(--t3)">PAYMENT: </span>'+odeme.slice(0,20)+'</div>';
  h += '</div>';
  if(urunler.length){
    h += '<table style="width:100%;border-collapse:collapse;font-size:8px;margin-bottom:6px">';
    h += '<thead><tr style="background:var(--s2)"><th style="padding:3px 4px;text-align:left">IMG</th><th style="padding:3px 4px;text-align:left">DESCRIPTION</th><th style="padding:3px 4px;text-align:right">QTY</th><th style="padding:3px 4px;text-align:right">TOTAL</th></tr></thead><tbody>';
    urunler.forEach(function(u){
      var toplam = ((parseFloat(u.satisFiyat)||0)*(parseFloat(u.miktar)||0)).toLocaleString('tr-TR',{maximumFractionDigits:2});
      h += '<tr style="border-bottom:0.5px solid var(--b)">';
      if(u.gorsel) h += '<td style="padding:3px 4px"><img src="'+u.gorsel+'" style="width:24px;height:24px;border-radius:3px;object-fit:cover"></td>';
      else h += '<td style="padding:3px 4px"><div style="width:24px;height:24px;background:var(--s2);border-radius:3px;border:0.5px solid var(--b)"></div></td>';
      h += '<td style="padding:3px 4px"><div style="font-weight:500">'+(u.duayKodu||'')+(u.duayKodu?' — ':'')+(u.urunAdi||'')+'</div>';
      if(u.eskiKod) h += '<div style="color:var(--t3);">('+u.eskiKod+')</div>';
      h += '</td>';
      h += '<td style="padding:3px 4px;text-align:right">'+u.miktar+' '+(u.birim||'pcs')+'</td>';
      h += '<td style="padding:3px 4px;text-align:right;font-weight:500;color:#0F6E56">'+toplam+' '+para+'</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    if (window._stFreightToggle && (incoterm === 'CFR' || incoterm === 'CIF' || incoterm === 'CIP')) {
        var freight = parseFloat(window._stFreightAmount) || 0;
        var insurance = (incoterm === 'CIF' || incoterm === 'CIP') ? (parseFloat(window._stInsuranceAmount) || 0) : 0;
        var grandTotal = toplamSatis + freight + insurance;
        h += '<div style="border-top:0.5px solid var(--b);padding-top:4px;margin-top:4px;text-align:right;font-size:9px;color:var(--t3)">';
        h += '<div>Subtotal: '+toplamSatis.toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+para+'</div>';
        h += '<div>Freight: '+freight.toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+para+'</div>';
        if (incoterm === 'CIF' || incoterm === 'CIP') {
          h += '<div>Insurance: '+insurance.toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+para+'</div>';
        }
        h += '<div style="font-size:10px;font-weight:500;color:#0F6E56;border-top:0.5px solid var(--b);padding-top:2px;margin-top:2px">TOTAL: '+grandTotal.toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+para+'</div>';
        h += '</div>';
      } else {
        h += '<div style="text-align:right;font-size:10px;font-weight:500;color:#0F6E56;border-top:0.5px solid var(--b);padding-top:4px">TOTAL: '+toplamSatis.toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+para+'</div>';
      }
  } else {
    h += '<div style="text-align:center;color:var(--t3);padding:16px;font-size:9px">Ürün ekleyince burada görünür</div>';
  }
  h += '<div style="margin-top:8px;padding-top:6px;border-top:0.5px solid var(--b);font-size:7px;color:var(--t3);font-style:italic">Product images are for illustration purposes only.</div>';
  h += '<div style="margin-top:4px;font-size:7px;color:var(--t3)">'+window._saV2BankaMetni(para)+'</div>';
  onizleme.innerHTML = h;
  var ozet = document.getElementById('st-ozet-toplam-satis');
  if(ozet) ozet.textContent = toplamSatis.toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+para;
};

window._saV2SatisKaydetVeGit = function(alisId) {
  var musteri = document.getElementById('st-musteri-ad')?.value||'';
  var gecerlilik = document.getElementById('st-gecerlilik')?.value||'';
  if(!musteri){window.toast?.('Müşteri seçin','warn');return;}
  if(!gecerlilik){window.toast?.('Geçerlilik tarihi girin','warn');return;}
  window._saV2SatisKaydet?.(alisId);
  setTimeout(function(){window.App?.nav?.('satis-teklifleri');},300);
};

/** Banka bilgisi — ak_bankalar1 key'inden veya varsayılan */
window._saV2BankaMetni = function(para) {
  var ayarlar = typeof window._loadBankalar === 'function' ? window._loadBankalar() : {};
  // BANKA-IBAN-FIX-001 + V194b GBP-DEVRE-DISI: gerçek IBAN'larla güncellendi (Garanti + Albaraka).
  // GBP fallback YANLIS USD IBAN'ı gösteriyordu — devre dışı bırakıldı (gerçek GBP IBAN yok).
  // V194d'de bu blok DUAY_BANKA(cur) accessor'ına bağlanacak.
  var varsayilan = {
    'USD': 'T. GARANTİ BANKASI A.Ş. · USD IBAN: TR39 0006 2001 1810 0009 0812 68 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'EUR': 'T. GARANTİ BANKASI A.Ş. · EUR IBAN: TR66 0006 2001 1810 0009 0812 67 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'TRY': 'T. GARANTİ BANKASI A.Ş. · TL IBAN: TR24 0006 2001 1810 0006 2960 86 · YEŞİLPINAR ŞUBESİ / 1181 | ALBARAKA TÜRK · TL IBAN: TR54 0020 3000 0889 5310 0000 05 · ALİBEYKÖY / 117',
    'GBP': 'GBP transfer şu an desteklenmiyor — lütfen USD veya EUR seçin.'
  };
  return ayarlar[para] || varsayilan[para] || varsayilan['USD'];
};
window._loadBankalar = function() { try { var d = localStorage.getItem('ak_bankalar1'); return d ? JSON.parse(d) : {}; } catch(e) { return {}; } };
window._saveBankalar = function(obj) { try { localStorage.setItem('ak_bankalar1', JSON.stringify(obj)); } catch(e) {} };

/** PI Şartları — varsayılan 10 madde, ayarlardan yönetilebilir */
window._saV2Sartlar = function() {
  try { var d = localStorage.getItem('ak_pi_sartlar'); if (d) return JSON.parse(d); } catch(e) {}
  return [
    'Payment: 30% deposit, 70% before dispatch/shipment.',
    'Tax Note: 20% VAT applicable for domestic shipments only.',
    'Bank Charges: All transfer fees outside T\u00fcrkiye belong to buyer.',
    'Disputes: Istanbul Courts shall have jurisdiction.',
    'Insurance: Buyer\'s responsibility unless CIF terms.',
    'Attention: Goods must be inspected within 14 days from delivery.',
    'Validity: This offer is valid for the period stated above only.',
    'Packaging: Standard export packaging unless otherwise agreed.',
    'Force Majeure: Seller not liable for delays due to force majeure.',
    'Governing Law: Republic of T\u00fcrkiye law applies to this contract.'
  ];
};
window._saV2SartlarKaydet = function(liste) { try { localStorage.setItem('ak_pi_sartlar', JSON.stringify(liste)); } catch(e) {} };

window._stSartlar = [];
window._saV2SartListeGuncelle = function() {
  var el = document.getElementById('st-sartlar-liste');
  if (!el) return;
  if (!window._stSartlar.length) { el.innerHTML = '<div style="font-size:9px;color:var(--t3);padding:4px 0">Hen\u00fcz \u015fart eklenmedi</div>'; return; }
  el.innerHTML = window._stSartlar.map(function(s, i) {
    return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:0.5px solid var(--b);font-size:9px">'
      + '<span style="color:var(--t3);min-width:14px">' + (i + 1) + '.</span>'
      + '<span style="flex:1;color:var(--t2)">' + s + '</span>'
      + '<button onclick="event.stopPropagation();window._stSartlar.splice(' + i + ',1);window._saV2SartListeGuncelle()" style="font-size:9px;border:none;background:none;cursor:pointer;color:#A32D2D;padding:0 2px">\u2715</button></div>';
  }).join('');
};
window._saV2FreightToggle = function() {
  window._stFreightToggle = !window._stFreightToggle;
  var icon = document.getElementById('st-freight-toggle-icon');
  var inputs = document.getElementById('st-freight-inputs');
  var btn = document.getElementById('st-freight-toggle');
  if (icon) icon.textContent = window._stFreightToggle ? '●' : '○';
  if (inputs) inputs.style.display = window._stFreightToggle ? 'flex' : 'none';
  if (btn) btn.style.background = window._stFreightToggle ? 'var(--s3)' : 'var(--s2)';
  if (typeof window._saV2PIOnizlemeGuncelle === 'function') window._saV2PIOnizlemeGuncelle();
};

window._saV2FreightChange = function(val, key) {
  var n = parseFloat(val) || 0;
  if (key === 'freight') window._stFreightAmount = n;
  else if (key === 'insurance') window._stInsuranceAmount = n;
  if (typeof window._saV2PIOnizlemeGuncelle === 'function') window._saV2PIOnizlemeGuncelle();
};

window._saV2IncotermAutoSart = function(incoterm) {
  if (!Array.isArray(window._stSartlar)) window._stSartlar = [];
  if (typeof window._stFreightToggle !== 'boolean') window._stFreightToggle = false;
  if (typeof window._stFreightAmount !== 'number') window._stFreightAmount = 0;
  if (typeof window._stInsuranceAmount !== 'number') window._stInsuranceAmount = 0;
  var prefixes = ['Freight: Covered by seller', 'Freight & Insurance: Covered by seller', 'Carriage & Insurance: Covered by seller'];
  window._stSartlar = window._stSartlar.filter(function(s) {
    return !prefixes.some(function(p) { return s.indexOf(p) === 0; });
  });
  var msgs = {
    CFR: 'Freight: Covered by seller as per CFR terms.',
    CIF: 'Freight & Insurance: Covered by seller as per CIF terms.',
    CIP: 'Carriage & Insurance: Covered by seller as per CIP terms.'
  };
  if (msgs[incoterm] && window._stSartlar.length < 10) {
    window._stSartlar.push(msgs[incoterm]);
  }
  if (typeof window._saV2SartListeGuncelle === 'function') window._saV2SartListeGuncelle();
  var row = document.getElementById('st-freight-row');
  var insLabel = document.getElementById('st-insurance-label');
  var insInp = document.getElementById('st-insurance-amount');
  var showRow = (incoterm === 'CFR' || incoterm === 'CIF' || incoterm === 'CIP');
  if (row) row.style.display = showRow ? 'flex' : 'none';
  if (!showRow) {
    var inputs = document.getElementById('st-freight-inputs');
    var icon = document.getElementById('st-freight-toggle-icon');
    var btn = document.getElementById('st-freight-toggle');
    var freightInp = document.getElementById('st-freight-amount');
    if (inputs) inputs.style.display = 'none';
    if (icon) icon.textContent = '○';
    if (btn) btn.style.background = 'var(--s2)';
  }
  var showIns = (incoterm === 'CIF' || incoterm === 'CIP');
  if (insLabel) insLabel.style.display = showIns ? '' : 'none';
  if (insInp) insInp.style.display = showIns ? '' : 'none';
};

window._saV2SartEkle = function() {
  if (window._stSartlar.length >= 10) { window.toast?.('Maksimum 10 \u015fart', 'warn'); return; }
  window._stSartlar.push('Yeni \u015fart...');
  window._saV2SartListeGuncelle();
};
window._saV2SartComboEkle = function() {
  var sel = document.getElementById('st-sart-sec');
  if (!sel || !sel.value) { window.toast?.('\u015eart se\u00e7in', 'warn'); return; }
  if (window._stSartlar.length >= 10) { window.toast?.('Maksimum 10 \u015fart', 'warn'); return; }
  if (window._stSartlar.indexOf(sel.value) !== -1) { window.toast?.('Bu \u015fart zaten ekli', 'warn'); return; }
  window._stSartlar.push(sel.value);
  window._saV2SartListeGuncelle();
  sel.value = '';
};
window._saV2SartManuelEkle = function() {
  var inp = document.getElementById('st-sart-manuel');
  if (!inp || !inp.value.trim()) { window.toast?.('\u015eart yaz\u0131n', 'warn'); return; }
  if (window._stSartlar.length >= 10) { window.toast?.('Maksimum 10 \u015fart', 'warn'); return; }
  window._stSartlar.push(inp.value.trim());
  window._saV2SartListeGuncelle();
  inp.value = '';
};

/**
 * T03-10: Bir JOB'a ait tüm alış tekliflerinden, her ürün için
 * en düşük TL fiyatlı tedarikçi teklifini toplar.
 * @param {string} jobId
 * @returns {Array<{duayKodu, urunAdi, alisF, para, miktar, birim, mensei, gorsel, tedarikci}>}
 */
window._saV2JobUrunleriTopla = function(jobId) {
  if (!jobId) return [];
  var kur = window._saKur || {};
  var kurF = function(para){ return parseFloat(kur[para]) || 1; };

  var teklifler = (window.loadAlisTeklifleri?.() || []).filter(function(at){
    return !at.isDeleted && String(at.jobId || '').trim() === String(jobId).trim();
  });

  var urunMap = {};
  teklifler.forEach(function(at){
    var urunler = (at.urunler && at.urunler.length)
      ? at.urunler
      : [{duayKodu:at.duayKodu, urunAdi:at.urunAdi, alisF:at.alisF, para:at.para, miktar:at.miktar, birim:at.birim, mensei:at.mensei}];

    urunler.forEach(function(u){
      var key = u.duayKodu || u.urunAdi || '';
      if (!key) return;
      var alisTl = (parseFloat(u.alisF)||0) * kurF(u.para || 'USD');
      var mevcut = urunMap[key];
      if (!mevcut || alisTl < mevcut._alisTl) {
        urunMap[key] = {
          duayKodu: u.duayKodu || '',
          urunAdi: u.urunAdi || '',
          alisF: parseFloat(u.alisF) || 0,
          para: u.para || 'USD',
          miktar: parseFloat(u.miktar) || 1,
          birim: u.birim || 'Adet',
          mensei: u.mensei || '',
          gorsel: u.gorsel || at.gorsel || '',
          tedarikci: at.tedarikci || '',
          _alisTl: alisTl
        };
      }
    });
  });

  return Object.keys(urunMap).map(function(k){
    var x = urunMap[k];
    delete x._alisTl;
    return x;
  });
};

/**
 * T03-10: Seçilen JOB'un ürünlerini satış formuna otomatik yükler.
 * Mevcut 2+ ürün varsa native confirm ile onay sorar.
 * @param {string} jobId
 */
window._saV2JobUrunYukle = function(jobId) {
  if (!jobId) return;
  var urunler = window._saV2JobUrunleriTopla(jobId);

  if (!urunler.length) {
    window.toast?.('Bu JOB için alış teklifi bulunamadı', 'warn');
    return;
  }

  var mevcut = window._saV2SatisUrunler || [];

  /* SATIS-002: Üzerine yazma akışı — confirm onayı sonrası ortak yükleme */
  function _yukleUrunler() {
    window._saV2SatisUrunler = [];
    urunler.forEach(function(u){
      window._saV2SatisUrunEkle && window._saV2SatisUrunEkle(u);
    });
    // T03-10 miktar fix: _saV2SatisUrunEkle hardcode miktar:1 ile push
    // eder — alış teklifindeki gerçek miktarı geri yaz
    (window._saV2SatisUrunler || []).forEach(function(satis, i){
      if (urunler[i] && urunler[i].miktar) satis.miktar = urunler[i].miktar;
    });
    window._saV2SatisTabloyuGuncelle?.();
    window._saV2PIOnizlemeGuncelle?.();
    window.toast?.(urunler.length + ' ürün JOB\'tan yüklendi', 'ok');
  }

  if (mevcut.length >= 2) {
    /* SATIS-002: native confirm → confirmModal (K06 uyumu) */
    if (typeof window.confirmModal === 'function') {
      window.confirmModal('Formda ' + mevcut.length + ' ürün var. JOB ürünleri üzerine yazılsın mı?', {
        title: 'JOB Ürün Yazma',
        danger: true,
        confirmText: 'Evet, yaz',
        cancelText: 'İptal — mevcut kalsın',
        onConfirm: _yukleUrunler
      });
      return; /* callback bekliyor */
    }
    /* confirmModal yüklenmediyse fallback yok — toast uyar */
    window.toast?.('Onay modali yüklenemedi, işlem iptal', 'err');
    return;
  }

  _yukleUrunler();
};

/* SATIS-JOBID-001 + SATIS-FORM-FIX-001: Job ID'ye göre ürün bazlı tedarikçi karşılaştırma modalı */
window._saV2JobUrunSecModal = function(jobId) {
  if (!jobId) { window.toast?.('Önce Job ID se\u00e7in', 'warn'); return; }
  var mevcut = document.getElementById('st-job-urun-modal');
  if (mevcut) mevcut.remove();
  var alisTeklifleri = typeof window.loadAlisTeklifleri === 'function' ? window.loadAlisTeklifleri() : [];
  var jobTeklifleri = alisTeklifleri.filter(function(at){ return at && !at.isDeleted && String(at.jobId) === String(jobId); });
  if (!jobTeklifleri.length) {
    window.toast?.('Bu Job ID i\u00e7in al\u0131\u015f teklifi bulunamad\u0131', 'warn');
    return;
  }
  /* Ürün bazlı gruplama: { urunKey: [{tedarikci, alisF, ...}, ...] } */
  var urunMap = {};
  jobTeklifleri.forEach(function(at){
    var urunler = Array.isArray(at.urunler) && at.urunler.length ? at.urunler : [{
      duayKodu: at.duayKodu, urunAdi: at.urunAdi, alisF: at.alisF, miktar: at.miktar||1, para: at.para||at.toplamPara||'USD', gorsel: at.gorsel
    }];
    urunler.forEach(function(u){
      var key = (u.duayKodu||u.urunAdi||'_bos').trim().toLowerCase();
      if (!urunMap[key]) urunMap[key] = { duayKodu: u.duayKodu||'', urunAdi: u.urunAdi||'\u2014', gorsel: u.gorsel||'', teklifler: [] };
      urunMap[key].teklifler.push({
        tedarikci: at.tedarikci||'\u2014',
        piNo: at.piNo||'',
        tarih: (at.teklifTarih||at.createdAt||'').slice(0,10),
        alisF: parseFloat(u.alisF)||0,
        miktar: parseFloat(u.miktar)||1,
        para: u.para||at.toplamPara||'USD',
        gorsel: u.gorsel||at.gorsel||''
      });
    });
  });
  var urunKeys = Object.keys(urunMap);
  var modal = document.createElement('div');
  modal.id = 'st-job-urun-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
  var h = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:780px;max-height:85vh;display:flex;flex-direction:column">';
  h += '<div style="padding:14px 18px;border-bottom:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">';
  h += '<div><div style="font-size:13px;font-weight:500;color:var(--t)">\u00dcr\u00fcn Bazl\u0131 Tedarik\u00e7i Kar\u015f\u0131la\u015ft\u0131rma</div>';
  h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Job ID: <strong>'+_saEsc(jobId)+'</strong> \u00b7 '+urunKeys.length+' farkl\u0131 \u00fcr\u00fcn \u00b7 '+jobTeklifleri.length+' teklif</div></div>';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'st-job-urun-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">\u00d7</button>';
  h += '</div>';
  h += '<div style="flex:1;overflow-y:auto;padding:14px 18px">';
  urunKeys.forEach(function(key, ui){
    var u = urunMap[key];
    /* En düşük fiyatı bul (TL bazında) */
    var enDusukIdx = -1; var enDusukTL = Infinity;
    u.teklifler.forEach(function(t, ti){
      var kur = (window._saKur||{})[t.para] || 1;
      var tl = t.alisF * kur;
      if (tl > 0 && tl < enDusukTL) { enDusukTL = tl; enDusukIdx = ti; }
    });
    h += '<div style="border:0.5px solid var(--b);border-radius:6px;padding:10px 12px;margin-bottom:10px;background:var(--s2)">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">';
    if (u.gorsel) h += '<img src="'+u.gorsel+'" style="width:28px;height:28px;border-radius:4px;object-fit:cover">';
    h += '<div><div style="font-size:12px;font-weight:600;color:var(--t)">'+_saEsc(u.duayKodu||'')+(u.duayKodu?' \u2014 ':'')+_saEsc(u.urunAdi)+'</div>';
    h += '<div style="font-size:9px;color:var(--t3)">'+u.teklifler.length+' tedarik\u00e7i teklifi</div></div></div>';
    u.teklifler.forEach(function(t, ti){
      var enDusuk = (ti === enDusukIdx);
      var uniqId = 'job-pu-'+ui+'-'+ti;
      h += '<div style="display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:4px;'+(enDusuk?'background:rgba(15,110,86,.08);border:0.5px solid #0F6E56':'')+'">';
      h += '<input type="checkbox" id="'+uniqId+'"'+(enDusuk?' checked':'')+' data-tedarikci="'+_saEsc(t.tedarikci)+'" data-duaykodu="'+_saEsc(u.duayKodu||'')+'" data-urunadi="'+_saEsc(u.urunAdi)+'" data-alisf="'+t.alisF+'" data-miktar="'+t.miktar+'" data-para="'+t.para+'" data-gorsel="'+_saEsc(t.gorsel)+'" style="width:14px;height:14px;cursor:pointer">';
      h += '<label for="'+uniqId+'" style="flex:1;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between">';
      h += '<div><strong style="color:var(--t)">'+_saEsc(t.tedarikci)+'</strong>';
      if (t.piNo||t.tarih) h += '<span style="font-size:8px;color:var(--t3);margin-left:6px">'+(t.piNo?'PI: '+_saEsc(t.piNo):'')+(t.tarih?(t.piNo?' \u00b7 ':'')+t.tarih:'')+'</span>';
      h += '</div>';
      h += '<div style="text-align:right"><strong style="color:'+(enDusuk?'#0F6E56':'var(--t)')+';font-size:11px">'+t.alisF.toFixed(2)+' '+t.para+'</strong>';
      h += '<div style="font-size:8px;color:var(--t3)">Miktar: '+t.miktar+(enDusuk?' \u00b7 \u2b50 En d\u00fc\u015f\u00fck':'')+'</div></div>';
      h += '</label></div>';
    });
    h += '</div>';
  });
  h += '</div>';
  h += '<div style="padding:10px 16px;border-top:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between;background:var(--s2)">';
  h += '<div style="font-size:9px;color:var(--t3)">Se\u00e7ili \u00fcr\u00fcnler sat\u0131\u015f teklif tablosuna eklenir</div>';
  h += '<div style="display:flex;gap:6px">';
  h += '<button onclick="event.stopPropagation();document.getElementById(\'st-job-urun-modal\')?.remove()" style="font-size:11px;padding:7px 16px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">\u0130ptal</button>';
  h += '<button onclick="event.stopPropagation();window._saV2JobUrunEkle()" style="font-size:11px;padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-weight:500;font-family:inherit">Se\u00e7ilenleri Ekle</button>';
  h += '</div></div>';
  h += '</div>';
  modal.innerHTML = h;
  document.body.appendChild(modal);
};

window._saV2JobUrunEkle = function() {
  var modal = document.getElementById('st-job-urun-modal');
  if (!modal) return;
  var checked = modal.querySelectorAll('input[type="checkbox"]:checked');
  if (!checked.length) { window.toast?.('En az bir \u00fcr\u00fcn se\u00e7in', 'warn'); return; }
  window._saV2SatisUrunler = window._saV2SatisUrunler || [];
  var eklenenSay = 0;
  checked.forEach(function(cb){
    var t = {
      id: typeof window.generateId === 'function' ? window.generateId() : ('jb-'+Date.now()+'-'+eklenenSay),
      duayKodu: cb.dataset.duaykodu || '',
      urunAdi: cb.dataset.urunadi || '',
      gorsel: cb.dataset.gorsel || '',
      alisF: parseFloat(cb.dataset.alisf) || 0,
      para: cb.dataset.para || 'USD',
      miktar: parseFloat(cb.dataset.miktar) || 1,
      tedarikci: cb.dataset.tedarikci || ''
    };
    if (typeof window._saV2SatisUrunEkle === 'function') {
      window._saV2SatisUrunEkle(t);
    }
    eklenenSay++;
  });
  modal.remove();
  window.toast?.(eklenenSay + ' \u00fcr\u00fcn eklendi', 'ok');
  window._saV2PIOnizlemeGuncelle?.();
};

/* SATIS-UI-001: Tam Önizleme — _piOlustur ile gerçek PDF preview */
window._saV2TamOnIzle = function() {
  var musteri = document.getElementById('st-musteri-ad')?.value || '';
  var teklifId = document.getElementById('st-id')?.value || '';
  if (!musteri) { window.toast?.('\u00d6nce m\u00fc\u015fteri se\u00e7in', 'warn'); return; }
  if (!window._saV2SatisUrunler || !window._saV2SatisUrunler.length) {
    window.toast?.('En az bir \u00fcr\u00fcn ekleyin', 'warn');
    return;
  }
  var teklif = {
    teklifId: teklifId,
    musteriAd: musteri,
    musteriKod: document.getElementById('st-musteri-kod')?.value || '',
    gecerlilik: document.getElementById('st-gecerlilik')?.value || '',
    teslim: (document.getElementById('st-incoterm')?.value || 'EXW') + ' ' + (document.getElementById('st-liman')?.value || 'Turkey'),
    odeme: document.getElementById('st-odeme')?.value || '',
    paraBirimi: document.getElementById('st-para-birimi')?.value || 'USD',
    urunler: window._saV2SatisUrunler.map(function(u) {
      return {
        duayKodu: u.duayKodu || '',
        urunAdi: u.urunAdi || '',
        miktar: u.miktar || 1,
        birim: u.birim || 'pcs',
        alisF: u.alisHedef || u.alisOrjF || 0,
        satisFiyat: u.satisFiyat || 0,
        toplam: u.toplam || 0,
        para: u.paraBirimi || 'USD',
        gorsel: u.gorsel || ''
      };
    }),
    revNo: '01',
    dil: window._saV2AktifPIDil || 'EN',
    /* SATIS-PI-PREVIEW-FIELDS-FIX-001: PI fn'lerinin (subtotal, freight, insurance, sartlar) ihtiyaç duyduğu field'lar — canlı önizleme (_saV2PIOnizlemeGuncelle) ile aynı formüller */
    toplamSatis: window._saV2SatisUrunler.reduce(function(s, u) {
      return s + (parseFloat(u.satisFiyat) || 0) * (parseFloat(u.miktar) || 0);
    }, 0).toFixed(2),
    sartlar: (window._stSartlar || []).slice(),
    freightToggle: !!window._stFreightToggle,
    freightAmount: parseFloat(window._stFreightAmount) || 0,
    insuranceAmount: parseFloat(window._stInsuranceAmount) || 0
  };
  var tasarim = window._saV2AktifPITasarim || 'A';
  if (typeof window._piOlustur !== 'function') {
    window.toast?.('PI mod\u00fcl\u00fc y\u00fcklenmedi', 'warn');
    return;
  }
  window._piOlustur(teklif, tasarim, 'musteri');
};

/* ════════════════════════════════════════════════════════════════
 * URUN-ONCEKI-SATIS-001
 * Müşteri seçili iken her ürün satırında, aynı müşteriye daha önce
 * satılmış ürünleri tespit edip turuncu uyarı ikonu (⚠) ekler. Tooltip
 * (title attr) ile geçmiş tarih + fiyat gösterir.
 *
 * Mimari: _saV2SatisTabloyuGuncelle (form.js'te tanımlı) wrapper ile
 * sarılır. Her render sonrası DOM'a uyarı ikonları enjekte edilir.
 * setTimeout(0) ile install — form.js sync yüklendikten sonra çalışır.
 * ════════════════════════════════════════════════════════════════ */

/**
 * Aktif satış teklifi formundaki ürün satırlarına önceki teklif uyarı
 * ikonu ekler. _saV2SatisUrunler dizisindeki her ürün, st-musteri-ad
 * değerinden alınan müşterinin önceki tekliflerinde aranır (urunAdi
 * VEYA duayKodu eşleşmesi). Eşleşme varsa ürün adı hücresine ⚠ ikonu
 * eklenir, title attr'inde geçmiş tarih + fiyat + döviz gösterilir.
 */
window._saV2UrunOncekiUyarilariEkle = function() {
  var customer = (document.getElementById('st-musteri-ad')?.value || '').trim();
  var tbody = document.getElementById('st-urun-tbody');
  if (!tbody) return;
  // Mevcut tüm uyarı ikonlarını temizle (her render'da yeniden hesaplanır)
  tbody.querySelectorAll('.urun-onceki-warn').forEach(function(el) { el.remove(); });
  if (!customer) return;
  var urunler = window._saV2SatisUrunler || [];
  if (!urunler.length) return;
  var allSatis = (typeof window.loadSatisTeklifleri === 'function') ? window.loadSatisTeklifleri() : [];
  var prevTeklifs = allSatis.filter(function(t) {
    return (t.musteri === customer || t.customerName === customer) && !t.isDeleted;
  });
  if (!prevTeklifs.length) return;
  var rows = tbody.querySelectorAll('tr');
  urunler.forEach(function(u, idx) {
    var row = rows[idx];
    if (!row || !row.cells) return;
    var nameCell = row.cells[1]; // ürün adı hücresi
    if (!nameCell) return;
    // Eşleşme ara — önceki tekliflerin urunler dizilerinde
    var match = null;
    var uAd = (u.urunAdi || '').trim().toLowerCase();
    var uKod = (u.duayKodu || '').trim();
    for (var i = 0; i < prevTeklifs.length; i++) {
      var pt = prevTeklifs[i];
      var ptUrunler = pt.urunler || [];
      for (var j = 0; j < ptUrunler.length; j++) {
        var pu = ptUrunler[j];
        var puAd = (pu.urunAdi || pu.turkceAdi || '').trim().toLowerCase();
        var puKod = (pu.duayKodu || '').trim();
        var nameMatch = uAd && puAd && puAd === uAd;
        var kodMatch = uKod && puKod && puKod === uKod;
        if (nameMatch || kodMatch) {
          match = {
            date: (pt.createdAt || '').slice(0, 10) || '—',
            price: parseFloat(pu.satisFiyat) || parseFloat(pu.alisF) || 0,
            currency: pu.para || pt.paraBirimi || pt.toplamPara || ''
          };
          break;
        }
      }
      if (match) break;
    }
    if (match) {
      var icon = document.createElement('span');
      icon.className = 'urun-onceki-warn';
      icon.style.cssText = 'display:inline-block;margin-left:4px;color:#D97706;cursor:help;font-size:11px;font-weight:700';
      icon.textContent = '⚠';
      icon.title = 'Bu ürün bu müşteriye daha önce ' + match.date + ' tarihinde ' + match.price.toFixed(2) + ' ' + match.currency + ' fiyatıyla verildi.';
      nameCell.appendChild(icon);
    }
  });
};

// _saV2SatisTabloyuGuncelle wrapper installation — form.js sync yüklendikten sonra
setTimeout(function() {
  if (typeof window._saV2SatisTabloyuGuncelle !== 'function') {
    console.warn('[urun-onceki-001] _saV2SatisTabloyuGuncelle tanimli degil, wrapper kurulamadi');
    return;
  }
  var _origTabloGuncelle = window._saV2SatisTabloyuGuncelle;
  window._saV2SatisTabloyuGuncelle = function() {
    var ret = _origTabloGuncelle.apply(this, arguments);
    try { window._saV2UrunOncekiUyarilariEkle?.(); } catch (e) { console.warn('[urun-onceki-001] uyari hata:', e); }
    return ret;
  };
}, 0);

// Müşteri değişikliğinde de uyarıları yeniden hesapla
// (_saV2CheckPrevTeklif zaten musteri onchange'de tetikleniyor — onun yanında bunu da çağır)
setTimeout(function() {
  var _origCheckPrev = window._saV2CheckPrevTeklif;
  if (typeof _origCheckPrev !== 'function') return;
  window._saV2CheckPrevTeklif = function() {
    var ret = _origCheckPrev.apply(this, arguments);
    try { window._saV2UrunOncekiUyarilariEkle?.(); } catch (e) { console.warn('[urun-onceki-001] musteri-trigger uyari hata:', e); }
    return ret;
  };
}, 10);

/* JOB-ID-KAYNAK-FIX-001: Satış form st-job-id input live arama (PP + mevcut alış teklifler) */
window._stJobIdAra = function(inp) {
  var val = (inp.value || '').trim().toLowerCase();
  var dd = document.getElementById('st-job-dd');
  if (dd) dd.remove();
  if (!val) return;
  var jobs = {};
  try { (window.loadAlisTeklifleri?.() || []).forEach(function(t){ if(t.jobId) jobs[t.jobId]=(jobs[t.jobId]||0)+1; }); } catch(e){}
  try { (window._ppLoad?.() || window.loadTasks?.() || []).forEach(function(g){ if(g.job_id||g.jobId) { var j=g.job_id||g.jobId; jobs[j]=(jobs[j]||0)+1; } }); } catch(e){}
  var eslesen = Object.keys(jobs).filter(function(j){ return j.toLowerCase().includes(val); }).slice(0,8);
  if (!eslesen.length) return;
  var rect = inp.getBoundingClientRect();
  var dd2 = document.createElement('div');
  dd2.id = 'st-job-dd';
  dd2.style.cssText = 'position:fixed;left:'+rect.left+'px;top:'+(rect.bottom+2)+'px;width:'+Math.max(rect.width,240)+'px;background:var(--sf);border:0.5px solid var(--b);border-radius:6px;z-index:10001;max-height:200px;overflow-y:auto';
  eslesen.forEach(function(jid) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:7px 12px;cursor:pointer;border-bottom:0.5px solid var(--b);font-size:11px;display:flex;justify-content:space-between';
    row.onmouseenter = function(){ this.style.background='var(--s2)'; };
    row.onmouseleave = function(){ this.style.background=''; };
    row.innerHTML = '<span style="font-weight:500;color:var(--t)">'+jid+'</span><span style="font-size:9px;color:var(--t3)">'+jobs[jid]+' kayıt</span>';
    row.onclick = function(e){ e.stopPropagation(); inp.value=jid; dd2.remove(); window._saV2JobUrunSecModal?.(jid); };
    dd2.appendChild(row);
  });
  document.body.appendChild(dd2);
  document.addEventListener('click', function rm(){ dd2.remove(); document.removeEventListener('click',rm); }, {once:true});
};

/* SATIS-EMOJI-NAV-001: Satış teklifi ürün satırından Ürün Kataloğuna nav + filtre */
window._stUrunGoster = function(idOrKod) {
  if (!idOrKod) return;
  if (typeof window._tn2SelectMod === 'function') {
    window._tn2SelectMod('urunler', null);
  } else if (window.App && typeof window.App.nav === 'function') {
    window.App.nav('urunler');
  }
  setTimeout(function() {
    var inp = document.getElementById('urun-search');
    if (inp) {
      inp.value = String(idOrKod);
      inp.dispatchEvent(new Event('input'));
    }
    if (typeof window.renderUrunler === 'function') window.renderUrunler();
  }, 150);
};
