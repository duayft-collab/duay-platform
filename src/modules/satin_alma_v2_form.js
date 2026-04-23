var _saEsc=window._saEsc, _saNow=window._saNow, _saToday=window._saToday, _saId=window._saId, _saCu=window._saCu;
window._saV2Duzenle = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return String(x.id) === String(id); });
  if (!t) return;
  if (t.durum === 'onaylandi') {
    window._saV2GuncellemeTalep(id);
    return;
  }
  window._saV2DuzenleForm(id);
};
window._saV2YeniTeklif = function(duzenleKayit) {
  var mevcut = document.getElementById('sav2-form-modal'); if (mevcut) { mevcut.remove(); if(!duzenleKayit) return; }
  var _isDuzenle = !!duzenleKayit;
  var modal = document.createElement('div');
  modal.id = 'sav2-form-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 0;overflow-y:auto';
  var _draftKey = 'ak_sav2_draft_v1';
  var _draftTimer = null;
  function _draftOku() {
    try { return JSON.parse(localStorage.getItem(_draftKey)||'null'); } catch(e){return null;}
  }
  function _draftSil() {
    localStorage.removeItem(_draftKey);
    if(_draftTimer) clearInterval(_draftTimer);
  }
  function _draftKaydet() {
    var g = function(id){ var el=document.getElementById(id); return el?(el.value||'').trim():''; };
    var draft = {
      ts: new Date().toISOString(),
      tedarikci: g('sav2f-tedarikci'), jobId: g('sav2f-jobId'),
      piNo: g('sav2f-piNo'), piTarih: g('sav2f-piTarih'),
      teslimYeri: g('sav2f-teslimYeri'), teslimMasraf: g('sav2f-teslimMasraf'),
      teslimat: g('sav2f-teslimat')
    };
    try { localStorage.setItem(_draftKey, JSON.stringify(draft)); } catch(e){}
  }
  var _eskiDraft = _draftOku();
  var _draftBanner = _eskiDraft ? '<div id="sav2-draft-banner" style="background:#FAEEDA;border:0.5px solid #854F0B;border-radius:6px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between"><span style="font-size:11px;color:#633806">Kaydedilmemi\u015f taslak bulundu \u2014 '+_eskiDraft.ts.slice(0,16).replace('T',' ')+'</span><div style="display:flex;gap:6px"><button onclick="event.stopPropagation();window._sav2DraftYukle()" style="font-size:10px;padding:4px 10px;border:none;border-radius:4px;background:#854F0B;color:#fff;cursor:pointer;font-family:inherit">Devam Et</button><button onclick="event.stopPropagation();window._sav2DraftSil()" style="font-size:10px;padding:4px 10px;border:0.5px solid #854F0B;border-radius:4px;background:transparent;color:#854F0B;cursor:pointer;font-family:inherit">Sil</button></div></div>' : '';
  modal.onclick = function(e) { if (e.target === modal) { _draftSil(); modal.remove(); } };
  var teklifId = window._saTeklifId?.('0000') || ('0000-' + Date.now());
  /* SAV2-FORM-SON-TEDARIKCI-001: son 5 tedarikçi hızlı seçim */
  var _sonTed = (function() {
    var _liste = typeof window._saV2Load === 'function' ? window._saV2Load().filter(function(s){return !s.isDeleted && s.tedarikci;}) : [];
    _liste.sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
    var _seen = {}, _result = [];
    for (var i = 0; i < _liste.length && _result.length < 5; i++) {
      var _t = _liste[i].tedarikci;
      if (!_seen[_t]) { _seen[_t] = true; _result.push(_t); }
    }
    return _result;
  })();
  var _tedChipHtml = '';
  if (_sonTed.length) {
    _tedChipHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;padding:4px 0 8px 0;align-items:center">'
      + '<span style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-right:4px">Son kullanılan</span>'
      + _sonTed.map(function(t){ return '<button type="button" onclick="(function(){var el=document.getElementById(\'sav2f-tedarikci\');if(el){el.value=' + JSON.stringify(t) + ';el.dispatchEvent(new Event(\'input\',{bubbles:true}));el.dispatchEvent(new Event(\'change\',{bubbles:true}));}})()" style="padding:3px 10px;border-radius:14px;border:0.5px solid var(--b);background:var(--sf);color:var(--t2);font-size:10px;cursor:pointer;font-family:inherit;transition:all .15s" onmouseenter="this.style.background=\'var(--s2)\';this.style.borderColor=\'var(--ac)\'" onmouseleave="this.style.background=\'var(--sf)\';this.style.borderColor=\'var(--b)\'">' + (window._esc?window._esc(t):t) + '</button>'; }).join('')
      + '</div>';
  }
  var _f = function(id, lbl, ph, tip) {
    return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
      + '<input id="sav2f-' + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  };
  var _s = function(id, lbl, opts) {
    return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
      + '<select id="sav2f-' + id + '" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit">' + opts + '</select></div>';
  };
  modal.innerHTML = '<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:min(1690px,98vw);overflow:hidden">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">'
    + '<div>'
    + '<div style="font-size:14px;font-weight:500;color:var(--t)">Yeni Alış Teklifi</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px;font-family:monospace" id="sav2f-id-goster">ID: ' + teklifId + '</div>'
    + '</div>'
    + '<button onclick="event.stopPropagation();window._sav2DraftSil?.();document.getElementById(\'sav2-form-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>'
    + '</div>'
    + '<div style="padding:20px;display:flex;flex-direction:column;gap:12px;max-height:70vh;overflow-y:auto">'
    + _draftBanner
    + '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;padding-bottom:7px;border-bottom:0.5px solid var(--b);margin-bottom:4px">Tedarikçi & İş Bilgisi</div>'
    + _tedChipHtml
    + '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px">'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TEDAR\u0130K\u00c7\u0130</div>'
    + '<input id="sav2f-tedarikci" list="sav2f-ted-list" placeholder="Tedarik\u00e7i ad\u0131" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">'
    + '<datalist id="sav2f-ted-list"></datalist></div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">JOB ID</div>'
    + '<input id="sav2f-jobId" list="sav2f-job-list" placeholder="0041" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._saV2JobIdAra?.(this)" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">'
    + '<datalist id="sav2f-job-list"></datalist></div>'
    + _f('piNo', 'Proforma Fatura No', 'PI-2026-001')
    + _f('piTarih', 'Proforma Tarihi', '', 'date')
    + _f('gecerlilikTarihi', 'Teklif Geçerlilik Tarihi', '', 'date')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 140px 220px;gap:10px">'
    + _f('teslimYeri','Teslim Noktası / Limanı','FOB Shanghai, CIF Mersin')
    + _f('teslimat', '\u00dcretim & Sevkiyat S\u00fcresi (G\u00fcn)', '14', 'number')
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TESL\u0130MAT MASRAFI</div>'
    + '<select id="sav2f-teslimMasraf" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<option value="">Se\u00e7...</option>'
    + '<option value="EXW">EXW \u2014 Fabrikadan Teslim</option>'
    + '<option value="FOB">FOB \u2014 Gemiye Y\u00fcklenmi\u015f</option>'
    + '<option value="CIF">CIF \u2014 Sigorta ve Navlun Dahil</option>'
    + '<option value="DDP">DDP \u2014 G\u00fcmr\u00fck Dahil Teslim</option>'
    + '<option value="DAP">DAP \u2014 Var\u0131\u015f Yerinde Teslim</option>'
    + '</select></div>'
    + '</div>'
    + '<div style="font-size:9px;font-weight:600;color:var(--t3);letter-spacing:.08em;padding-bottom:4px;border-bottom:0.5px solid var(--b);margin-top:6px;display:flex;align-items:center;justify-content:space-between">Ürün Kalemleri<button onclick="event.stopPropagation();window._saV2UrunSatirEkle()" style="font-size:9px;padding:3px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">+ Ürün Ekle</button></div>'
    + '<div style="overflow-x:auto"><div style="display:grid;grid-template-columns:44px 100px 145px 76px 105px 90px 56px 78px 88px 92px 98px 72px 66px 60px 84px 76px 74px 74px 74px 30px 22px;gap:4px;padding:4px 0 6px;border-bottom:0.5px solid var(--b);min-width:1600px;margin-bottom:2px">'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)"></div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">KOD</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">T\u00dcRK\u00c7E ADI</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">M\u0130KTAR</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">\u00d6L\u00c7\u00dc B\u0130R\u0130M\u0130</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">B\u0130R\u0130M F\u0130YAT</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">D\u00d6V\u0130Z</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">KUR (TL)</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">TL/B\u0130R\u0130M</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">TOPLAM TL</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">\u0130NG. ADI *</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">MEN\u015eE</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">GT\u0130P</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">NET A\u011e. (kg) <span title="1 adet \u00fcr\u00fcn\u00fcn a\u011f\u0131rl\u0131\u011f\u0131. Gram yaz\u0131yorsan\u0131z: 100g = 0.100 kg" style="cursor:help;background:#E6F1FB;color:#0C447C;border-radius:50%;padding:0 3px;font-size:7px">i</span></div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">TED. KODU</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">TES. S\u00dcRE</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">NOT M\u00dc\u015e.</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">NOT \u015e\u0130R.</div>'
    +'<div style="font-size:7px;font-weight:500;color:var(--t3)">NOT S\u00d6Z.</div>'
    +'<div></div><div></div>'
    +'</div>'
    +'<div id="sav2f-urunler-container"></div></div>'
    + '<div style="margin-bottom:12px">'
    + '<div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:6px">İÇ NOTLAR <span style="font-size:8px;color:var(--t3)">(Müşteriye gitmez)</span></div>'
    + '<div style="border:0.5px solid var(--b);border-radius:5px;overflow:hidden">'
    + '<div style="display:flex;gap:2px;padding:4px 6px;border-bottom:0.5px solid var(--b);background:var(--s2)">'
    + '<button type="button" onclick="event.stopPropagation();document.execCommand(\'bold\')" style="font-size:11px;font-weight:700;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t)">B</button>'
    + '<button type="button" onclick="event.stopPropagation();document.execCommand(\'italic\')" style="font-size:11px;font-style:italic;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t)">I</button>'
    + '<button type="button" onclick="event.stopPropagation();document.execCommand(\'insertUnorderedList\')" style="font-size:11px;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t)">• —</button>'
    + '<button type="button" onclick="event.stopPropagation();document.execCommand(\'insertOrderedList\')" style="font-size:11px;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t)">1.</button>'
    + '<button type="button" onclick="event.stopPropagation();document.getElementById(\'sav2f-not-div\').innerHTML=\'\'" style="font-size:10px;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t3);margin-left:auto">✕</button>'
    + '</div>'
    + '<div id="sav2f-not-div" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:60px;max-height:150px;overflow-y:auto;padding:8px 10px;font-size:12px;color:var(--t);font-family:inherit;outline:none;line-height:1.5"></div>'
    + '<input type="hidden" id="sav2f-not">'
    + '</div>'
    + '<div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:6px;margin-top:10px">Sözleşme Koşulları <span style="font-size:8px;color:var(--t3)">(Proforma\'ya eklenir)</span></div>'
    + '<div style="border:0.5px solid var(--b);border-radius:5px;overflow:hidden">'
    + '<div style="display:flex;gap:2px;padding:4px 6px;border-bottom:0.5px solid var(--b);background:var(--s2)">'
    + '<button type="button" onclick="event.stopPropagation();document.execCommand(\'bold\')" style="font-size:11px;font-weight:700;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t)">B</button>'
    + '<button type="button" onclick="event.stopPropagation();document.execCommand(\'italic\')" style="font-size:11px;font-style:italic;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t)">I</button>'
    + '<button type="button" onclick="event.stopPropagation();document.getElementById(\'sav2f-teslimatKosul-div\').innerHTML=\'\'" style="font-size:10px;padding:2px 7px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:var(--t3);margin-left:auto">✕</button>'
    + '</div>'
    + '<div id="sav2f-teslimatKosul-div" contenteditable="true" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="min-height:50px;max-height:100px;overflow-y:auto;padding:8px 10px;font-size:12px;color:var(--t);font-family:inherit;outline:none;line-height:1.5"></div>'
    + '<input type="hidden" id="sav2f-teslimatKosul">'
    + '</div></div>'
    + '</div>'
    /* SA-FORM-REDESIGN-001: footer sadeleşti — tek satır, Kaydet mavi CTA */
    + '<div style="display:flex;align-items:center;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2);gap:8px">'
    + '<span style="font-size:9px;color:var(--t3);margin-right:auto">* Zorunlu alanlar · Duay kodu girilince katalogdan otomatik dolar</span>'
    + '<button onclick="event.stopPropagation();window._sav2DraftSil?.();document.getElementById(\'sav2-form-modal\')?.remove()" style="font-size:12px;padding:7px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>'
    + '<button onclick="event.stopPropagation();window._saV2FormKaydet()" style="font-size:12px;padding:7px 20px;border:none;border-radius:6px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(modal);
  _draftTimer = setInterval(_draftKaydet, 10000);
  window._sav2DraftYukle = function() {
    var d = _draftOku(); if(!d) return;
    var s = function(id,v){ var el=document.getElementById(id); if(el) el.value=v; };
    s('sav2f-tedarikci',d.tedarikci||''); s('sav2f-jobId',d.jobId||'');
    s('sav2f-piNo',d.piNo||''); s('sav2f-piTarih',d.piTarih||'');
    s('sav2f-teslimYeri',d.teslimYeri||''); s('sav2f-teslimMasraf',d.teslimMasraf||'');
    s('sav2f-teslimat',d.teslimat||'');
    document.getElementById('sav2-draft-banner')?.remove();
    window.toast?.('Taslak y\u00fcklendi','ok');
  };
  window._sav2DraftSil = function() {
    _draftSil();
    document.getElementById('sav2-draft-banner')?.remove();
    window.toast?.('Taslak silindi','ok');
  };
  window._saV2FormGorselData = null;
  window._saV2UrunSayac = 0;
  /* SA-FORM-DUZENLE-FIX-002: ilk boş satır sadece yeni teklifte, düzenlemede urunler döngüsü ekler */
  if (!_isDuzenle) window._saV2UrunSatirEkle();
  window._saV2DatalistDoldur?.();
  /* Düzenleme modu: mevcut veriyle formu doldur */
  if (_isDuzenle && duzenleKayit) {
    var _set = function(fid, val) { var el = document.getElementById(fid); if(el) el.value = val||''; };
    _set('sav2f-tedarikci', duzenleKayit.tedarikci);
    _set('sav2f-jobId', duzenleKayit.jobId);
    /* SA-FORM-DUZENLE-FIX-001: eski tek-alan ID'ler kaldırıldı, urunler array döngüyle yükleniyor */
    _set('sav2f-piNo', duzenleKayit.piNo);
    _set('sav2f-piTarih', duzenleKayit.piTarih);
    _set('sav2f-gecerlilikTarihi', duzenleKayit.gecerlilikTarihi || duzenleKayit.validUntil);
    _set('sav2f-teslimYeri', duzenleKayit.teslimYeri);
    _set('sav2f-teslimat', duzenleKayit.teslimat);
    var teslimMasrafEl = document.getElementById('sav2f-teslimMasraf');
    if (teslimMasrafEl && duzenleKayit.teslimMasraf) { teslimMasrafEl.value = duzenleKayit.teslimMasraf; }
    var notDiv = document.getElementById('sav2f-not-div');
    if (notDiv && duzenleKayit.icNotlar) notDiv.innerHTML = duzenleKayit.icNotlar;
    var kosulDiv = document.getElementById('sav2f-teslimatKosul-div');
    if (kosulDiv && duzenleKayit.teslimatKosul) kosulDiv.innerHTML = duzenleKayit.teslimatKosul;
    if (duzenleKayit.gorsel) window._saV2FormGorselData = duzenleKayit.gorsel;
    var _urunlerArr = duzenleKayit.urunler || [];
    if (_urunlerArr.length > 0) {
      _urunlerArr.forEach(function(u, i) {
        window._saV2UrunSatirEkle();
        var _satir = document.querySelectorAll('.sav2f-urun-satir')[i];
        if (!_satir) return;
        var _si = _satir.getAttribute('data-urun-satir');
        var _su = function(k, v) { var el = document.getElementById('sav2u-' + _si + '-' + k); if (el && v !== undefined && v !== null) el.value = v; };
        _su('duayKodu', u.duayKodu); _su('urunAdi', u.urunAdi); _su('turkceAdi', u.turkceAdi);
        _su('marka', u.marka); _su('miktar', u.miktar); _su('alisF', u.alisF);
        _su('saticiKodu', u.saticiKodu); _su('netAg', u.netAg); _su('gtip', u.gtip);
        _su('urunTeslimat', u.urunTeslimat);
        var _birimEl = document.getElementById('sav2u-' + _si + '-birim');
        if (_birimEl && u.birim) { Array.from(_birimEl.options).forEach(function(o) { if (o.value === u.birim) o.selected = true; }); }
        var _paraEl = document.getElementById('sav2u-' + _si + '-para');
        if (_paraEl && u.para) { Array.from(_paraEl.options).forEach(function(o) { if (o.value === u.para) o.selected = true; }); }
        var _menEl = document.getElementById('sav2u-' + _si + '-mensei');
        if (_menEl && u.mensei) { Array.from(_menEl.options).forEach(function(o) { if (o.value === u.mensei || o.textContent === u.mensei) o.selected = true; }); }
        var _imgEl = document.getElementById('sav2u-' + _si + '-gorsel-img');
        var _icoEl = document.getElementById('sav2u-' + _si + '-gorsel-ico');
        if (_imgEl && u.gorsel) { _imgEl.src = u.gorsel; _imgEl.style.display = 'block'; if (_icoEl) _icoEl.style.display = 'none'; }
      });
      /* SA-FORM-KUR-FIX-001: düzenleme sonrası kur/TL hesabını tetikle */
      setTimeout(function() {
        document.querySelectorAll('.sav2f-urun-satir').forEach(function(satir) {
          var si = satir.getAttribute('data-urun-satir');
          if (!si) return;
          var paraEl = document.getElementById('sav2u-'+si+'-para');
          var fiyatEl = document.getElementById('sav2u-'+si+'-alisF');
          var miktarEl = document.getElementById('sav2u-'+si+'-miktar');
          var _p = paraEl?.value || 'USD';
          var _kv = parseFloat((window._saKur||window.DUAY_KUR||{})[_p]) || (_p==='USD'?44.55:_p==='EUR'?51.70:_p==='GBP'?59.30:1);
          var _f = parseFloat(fiyatEl?.value) || 0;
          var _m = parseFloat(miktarEl?.value) || 0;
          var kurEl = document.getElementById('sav2u-'+si+'-kurTL');
          var tlbEl = document.getElementById('sav2u-'+si+'-tlBirim');
          var topEl = document.getElementById('sav2u-'+si+'-toplamTL');
          if (kurEl) kurEl.value = _kv.toFixed(2);
          if (tlbEl) tlbEl.value = (_f*_kv).toLocaleString('tr-TR',{maximumFractionDigits:2});
          if (topEl) topEl.value = (_m*_f*_kv).toLocaleString('tr-TR',{maximumFractionDigits:0});
        });
      }, 100);
    } else {
      window._saV2UrunSatirEkle();
    }
    var baslikEl = modal.querySelector('[style*="font-size:14px"]');
    if(baslikEl) baslikEl.textContent = 'Teklif Düzenle';
    var idEl = document.getElementById('sav2f-id-goster');
    if(idEl) idEl.textContent = 'ID: ' + (duzenleKayit.teklifId||duzenleKayit.id);
    window._saV2DuzenleAktifId = duzenleKayit.id;
    /* JOB-ID-KAYNAK-FIX-001: datalist yüklenmeden önce input set edildiyse gecikmeli tekrar restore */
    setTimeout(function() {
      window._saV2DatalistDoldur?.();
      var _restoreIds = ['sav2f-jobId','sav2f-tedarikci','sav2f-notlar'];
      _restoreIds.forEach(function(fid) {
        var el = document.getElementById(fid);
        if (!el) return;
        var key = fid.replace('sav2f-','');
        if (duzenleKayit[key] && !el.value) el.value = duzenleKayit[key];
      });
    }, 120);
  } else {
    window._saV2DuzenleAktifId = null;
  }
  setTimeout(function() { document.getElementById('sav2u-0-duayKodu')?.focus(); }, 100);
};

window._saV2FormGorsel = function(inp) {
  var f = inp.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024) { window.toast?.('5MB sınırı aşıldı', 'warn'); return; }
  var r = new FileReader();
  r.onload = function(e) {
    window._saV2FormGorselData = e.target.result;
    var oniz = document.getElementById('sav2f-gorsel-oniz');
    if (oniz) oniz.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px">';
    var ad = document.getElementById('sav2f-gorsel-ad');
    if (ad) ad.textContent = f.name;
  };
  r.readAsDataURL(f);
};

/* ── URUN-ARA-001: Anlık Ürün Arama Dropdown ──────────────── */
window._saV2UrunAraDropdown = function(inp, hedefId) {
  /* SATINALMA-FORM-URUN-ARAMA-001: Türkçe normalize (ç/ğ/ı/ö/ş/ü → c/g/i/o/s/u) — cross-file coupling önlendi, self-contained */
  var _norm = function(s) { return !s ? '' : String(s).toLocaleLowerCase('tr-TR').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').trim(); };
  var val = _norm(inp.value);
  var mevcut = document.getElementById('sa-urun-dropdown');
  if (mevcut) mevcut.remove();
  if (val.length < 2) return;
  /* SATINALMA-FORM-VENDOR-FILTER-001: Sadece seçili tedarikçinin ürünleri — #sav2f-tedarikci input (datalist) */
  var _seciliTed = (document.getElementById('sav2f-tedarikci')?.value || '').trim();
  if (!_seciliTed) {
    if (window.toast) window.toast('Önce tedarikçi seçin', 'warn');
    return;
  }
  var _seciliTedN = _norm(_seciliTed);
  var tumListe = (typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true}) : []).filter(function(u) {
    if (u.isDeleted) return false;
    var uTed = _norm(u.tedarikci || u.vendorName || '');
    return uTed === _seciliTedN;
  });
  var eslesen = tumListe.filter(function(u) {
    return _norm(u.duayKodu).includes(val)
      || _norm(u.urunAdi).includes(val)
      || _norm(u.ingAd || u.standartAdi).includes(val)
      || _norm(u.tedarikci).includes(val)
      || _norm(u.marka).includes(val)
      || _norm(u.saticiKodu).includes(val);
  }).slice(0, 8);
  if (!eslesen.length) return;
  var rect = inp.getBoundingClientRect();
  var dd = document.createElement('div');
  dd.id = 'sa-urun-dropdown';
  dd.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + (rect.bottom + 2) + 'px;width:' + Math.max(rect.width, 360) + 'px;background:var(--sf);border:0.5px solid var(--b);border-radius:6px;z-index:9999;max-height:280px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.12)';
  eslesen.forEach(function(u) {
    var item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--b)';
    item.onmouseenter = function() { this.style.background = 'var(--s2)'; };
    item.onmouseleave = function() { this.style.background = ''; };
    var gorsel = u.gorsel ? '<img src="' + u.gorsel + '" style="width:28px;height:28px;border-radius:3px;object-fit:cover;flex-shrink:0">' : '<div style="width:28px;height:28px;border-radius:3px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">📦</div>';
    item.innerHTML = gorsel
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:11px;font-weight:500;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (u.urunAdi || u.ingAd || '—') + '</div>'
      + '<div style="font-size:9px;color:var(--t3)">' + (u.duayKodu || '') + (u.tedarikci ? ' · ' + u.tedarikci : '') + (u.marka ? ' · ' + u.marka : '') + '</div>'
      + '</div>'
      + '<div style="font-size:9px;color:var(--t3);text-align:right">' + (u.birim || '') + '</div>';
    item.onclick = function(e) {
      e.stopPropagation();
      var kodInp = document.getElementById(hedefId || 'sav2u-0-duayKodu');
      if (kodInp) { kodInp.value = u.duayKodu || ''; window._saV2KatalogDoldur(u.duayKodu || ''); }
      dd.remove();
    };
    dd.appendChild(item);
  });
  document.body.appendChild(dd);
  document.addEventListener('click', function rm() { dd.remove(); document.removeEventListener('click', rm); }, { once: true });
};

window._saV2KatalogDoldur = function(kod) {
  if (!kod || kod.length < 5) { var be=document.getElementById('sav2f-katalog-bilgi'); if(be) be.textContent=''; return; }
  var urunler = typeof window.loadUrunler==='function' ? window.loadUrunler({tumKullanicilar:true}) : [];
  var tumUrunler = urunler;
  var u = tumUrunler.find(function(x){ return (x.duayKodu||'').toLowerCase()===kod.toLowerCase(); });
  var bilgiEl = document.getElementById('sav2f-katalog-bilgi');
  if (!u) { if(bilgiEl) bilgiEl.innerHTML='<span style="color:#A32D2D">Katalogda bulunamadı</span>'; return; }
  if (bilgiEl) bilgiEl.innerHTML='<span style="color:#0F6E56">✓ '+_saEsc(u.duayAdi||u.urunAdi||'')+'</span>';
  var alanlar = {urunAdi:u.standartAdi||u.urunAdi||u.ingAd,turkceAdi:u.duayAdi||u.urunAdi,marka:u.marka,gtip:u.gtip||u.hscKodu,saticiKodu:u.saticiKodu||u.urunKodu,netAg:u.netAgirlik,brutAg:u.brutAgirlik,tedarikci:u.tedarikci,alisF:u.alisF||u.sonFiyat||u.sonAlisFiyati};
  Object.keys(alanlar).forEach(function(k){ var el=document.getElementById('sav2f-'+k); if(el&&alanlar[k]) el.value=alanlar[k]; });
  /* SA-FORM-DUZENLE-FIX-001: eski sav2f-birim kaldırıldı — V3'te birim ürün satırında (sav2u-idx-birim) */
  var menEl=document.getElementById('sav2f-mensei'); if(menEl&&u.mensei){ Array.from(menEl.options).forEach(function(o){if(o.value===u.mensei||o.textContent===u.mensei)o.selected=true;}); }
  var paraEl=document.getElementById('sav2f-para'); if(paraEl&&u.para){ Array.from(paraEl.options).forEach(function(o){if(o.value===(u.para||u.paraBirimi))o.selected=true;}); }
  if (u.gorsel) {
    window._saV2FormGorselData = u.gorsel;
    var oniz=document.getElementById('sav2f-gorsel-oniz');
    if(oniz) oniz.innerHTML='<img src="'+u.gorsel+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px">';
    var ad=document.getElementById('sav2f-gorsel-ad');
    if(ad) ad.textContent='Katalogdan otomatik';
  }
};

window._saV2KatalogAra = function() { window.toast?.('Katalog arama — yakında', 'info'); };

window._saV2FormKaydet = function() {
  var g = function(id) { var el = document.getElementById('sav2f-' + id); return el ? (el.value || '').trim() : ''; };
  var baslik = {
    tedarikci: g('tedarikci'), jobId: g('jobId'), piNo: g('piNo'), piTarih: g('piTarih'),
    teslimYeri: g('teslimYeri'), teslimMasraf: document.getElementById('sav2f-teslimMasraf')?.value || '',
    teslimat: g('teslimat'), teklifId: window._saTeklifId?.(g('tedarikci').slice(0,4)||'0000') || ''
  };
  if (!baslik.tedarikci) { window.toast?.('Tedarikçi zorunlu', 'warn'); return; }
  var satirlar = document.querySelectorAll('[data-urun-satir]');
  if (!satirlar.length) { window.toast?.('En az 1 ürün ekleyin', 'warn'); return; }
  var urunler = [];
  var hatalar = [];
  satirlar.forEach(function(satir) {
    var idx = satir.getAttribute('data-urun-satir');
    var gu = function(k) { var el = document.getElementById('sav2u-' + idx + '-' + k); return el ? (el.value || '').trim() : ''; };
    var urun = {
      duayKodu: gu('duayKodu'), urunAdi: gu('urunAdi'), turkceAdi: gu('turkceAdi'),
      marka: gu('marka'), miktar: parseFloat(gu('miktar')) || 0, birim: gu('birim') || 'Adet',
      alisF: parseFloat(gu('alisF')) || 0, para: gu('para') || 'USD',
      mensei: gu('mensei'), saticiKodu: gu('saticiKodu'),
      netAg: parseFloat(gu('netAg')) || 0,
      /* SA-FORM-DUZENLE-FIX-002: eksik alanlar eklendi */
      gtip: gu('gtip'),
      urunTeslimat: parseFloat(gu('urunTeslimat')) || 0
    };
    if (!urun.duayKodu && !urun.urunAdi) { hatalar.push('\u00dcr\u00fcn ' + (parseInt(idx) + 1) + ': Kod veya ad zorunlu'); return; }
    if (!urun.miktar) { hatalar.push('\u00dcr\u00fcn ' + (parseInt(idx) + 1) + ': Miktar zorunlu'); return; }
    if (!urun.alisF) { hatalar.push('\u00dcr\u00fcn ' + (parseInt(idx) + 1) + ': Fiyat zorunlu'); return; }
    urun.toplam = (urun.miktar * urun.alisF).toFixed(2);
    urunler.push(urun);
  });
  if (hatalar.length) { window.toast?.(hatalar[0], 'warn'); return; }
  if (!urunler.length) { window.toast?.('Ge\u00e7erli \u00fcr\u00fcn bulunamad\u0131', 'warn'); return; }
  var notDiv = document.getElementById('sav2f-not-div');
  var kosulDiv = document.getElementById('sav2f-teslimatKosul-div');
  var toplamTutar = urunler.reduce(function(s, u) { return s + parseFloat(u.toplam || 0); }, 0);
  var kayit = {
    id: typeof window.generateId === 'function' ? window.generateId() : ('SA' + Date.now()),
    tedarikci: baslik.tedarikci, jobId: baslik.jobId, piNo: baslik.piNo, piTarih: baslik.piTarih,
    // SATINALMA-GECERLILIK-001: geçerlilik tarihi (KPI Süresi Yaklaşan için)
    gecerlilikTarihi: g('gecerlilikTarihi') || g('validUntil') || '',
    teslimYeri: baslik.teslimYeri, teslimMasraf: baslik.teslimMasraf, teslimat: baslik.teslimat,
    teklifId: baslik.teklifId || '',
    urunler: urunler, urunSayisi: urunler.length,
    toplamTutar: toplamTutar.toFixed(2), toplamPara: urunler[0]?.para || 'USD',
    icNotlar: notDiv ? notDiv.innerHTML : '', teslimatKosul: kosulDiv ? kosulDiv.innerHTML : '',
    /* SA-FORM-PIPELINE-001: yeni teklif araştırma aşamasıyla başlar + 72h timer */
      gorsel: window._saV2FormGorselData || '', durum: 'arastirma', pipelineTimerBaslangic: new Date().toISOString(), pipelineTimerSaat: 72, pipelineAdimlari: [{ durum: 'arastirma', yeniDurum: 'arastirma', tarih: new Date().toISOString(), kim: window.CU?.()?.displayName || window.CU?.()?.name || '' }],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: window.CU?.()?.displayName || '', createdById: window.CU?.()?.uid || ''
  };
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  liste.unshift(kayit);
  if (typeof window._saV2Store === 'function') window._saV2Store(liste);
  window._sav2DraftSil?.();
  document.getElementById('sav2-form-modal')?.remove();
  window.toast?.('Teklif kaydedildi \u2014 ' + urunler.length + ' \u00fcr\u00fcn', 'ok');
  window.renderSatinAlmaV2?.();
};

/* ── Onay Akışı ─────────────────────────────────────────────── */
window._saV2YoneticiOnayla = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return String(x.id) === String(id); });
  if (!t) return;
  t.durum = 'onaylandi';
  /* LOJISTIK-SA-ENTEGRE-001: Onaylanan SA V2 otomatik kargo kaydı oluştur */
  try { window._saOnayliKargoOlustur && window._saOnayliKargoOlustur(t); } catch(e) { console.warn('[LOJISTIK-SA-ENTEGRE-001] kargo fail:', e); }
  /* SIPARISLER-AUTO-ONAY-001: onay anında sipariş hazırlık kaydı */
  if (!t.siparisDurumu) t.siparisDurumu = 'hazirlaniyor';
  t.siparisBaslangicTarihi = new Date().toISOString();
  t.onaylayanId = window._saCu?.()?.uid || '';
  t.onaylayanAd = window._saCu?.()?.displayName || '';
  t.onayTarih = window._saNow?.();
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window._saV2ZincirEtkisi(t);
  window.toast?.('Teklif onaylandı — zincirleme etki başlatıldı', 'ok');
  window.renderSatinAlmaV2?.();
};

window._saV2YoneticiReddet = function(id, neden) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return String(x.id) === String(id); });
  if (!t) return;
  t.durum = 'reddedildi';
  t.redNedeni = neden || '';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window.toast?.('Teklif reddedildi', 'warn');
  window.renderSatinAlmaV2?.();
};

window._saV2ZincirEtkisi = function(t) {
  try {
    /* 1. Ürün Kataloğu — son alış fiyatı güncelle */
    if (t.duayKodu && typeof window.loadUrunler === 'function') {
      var urunler = window.loadUrunler({tumKullanicilar:true});
      var u = urunler.find(function(x) { return (x.duayKodu || '') === (t.duayKodu || ''); });
      if (u) {
        u.sonAlisFiyati = t.alisF;
        u.sonAlisPara = t.para;
        u.sonAlisTed = t.tedarikci;
        u.sonAlisTarih = window._saNow?.();
      }
      if (typeof window.saveUrunler === 'function') window.saveUrunler(urunler);
    }
    /* 2. Aktivite logu */
    if (typeof window.logActivity === 'function') {
      window.logActivity('SATINALMA_ONAY', { teklifId: t.teklifId, urun: t.urunAdi, fiyat: t.alisF, para: t.para, tedarikci: t.tedarikci });
    }
    /* 3. Pusula Pro görev oluştur */
    if (typeof window._ppLoad === 'function' && typeof window._ppStore === 'function') {
      var ppTasks = window._ppLoad();
      ppTasks.unshift({
        id: window._saId?.(),
        baslik: 'Sevkiyat: ' + (t.urunAdi || 'Ürün') + ' (' + (t.miktar || '') + ' ' + (t.birim || '') + ')',
        departman: 'Operasyon',
        oncelik: 'yuksek',
        durum: 'plan',
        job_id: t.jobId || '',
        aciklama: 'Satın alma onaylandı. Tedarikçi: ' + (t.tedarikci || ''),
        _ppSource: 'pro',
        createdAt: window._saNow?.(),
        updatedAt: window._saNow?.(),
        _kaynak: 'satinalma_onay'
      });
      window._ppStore(ppTasks);
    }
    console.log('[SAV2] Zincirleme etki tamamlandı:', t.teklifId);
  } catch(e) { console.error('[SAV2] Zincirleme hata:', e); }
};

/* ── Eski renderSatinAlma köprüsü ──────────────────────────── */
if (typeof window.renderSatinAlma !== 'function') {
  window.renderSatinAlma = window.renderSatinAlmaV2;
}

/* ── SA-V2-COKLU-001: Çoklu ürün ekleme ────────────────────── */
window._saV2SatisUrunler = [];

/* SATIS-KUR-001: Para birimi dönüşüm helper'ı */
window._saV2KurCevir = function(deger, orjPara, hedefPara) {
  var v = parseFloat(deger) || 0;
  if (!v || orjPara === hedefPara) return v;
  var kurlar = window._saKur || {};
  var orjKurTL = (orjPara === 'TRY') ? 1 : (parseFloat(kurlar[orjPara]) || 1);
  var hedefKurTL = (hedefPara === 'TRY') ? 1 : (parseFloat(kurlar[hedefPara]) || 1);
  var tl = v * orjKurTL;
  return tl / hedefKurTL;
};

window._saV2SatisUrunEkle = function(t) {
  // T03-2: ID garantisi — payload'da id yoksa stabil bir ID üret.
  // Bug: payload.id undefined ise tüm ürünler aynı id ile push edilirdi
  // ve _saV2UrunSil filter() hiçbirini silemezdi.
  if (!t.id) {
    t.id = (typeof window.generateId === 'function'
      ? window.generateId()
      : ('urun-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)));
  }
  // SATINALMA-V2-URUN-LIMIT-001: max 100 ürün per satış teklifi
  if ((window._saV2SatisUrunler||[]).length >= 100) {
    window.toast?.('Maksimum 100 ürün eklenebilir', 'warn'); return;
  }
  var orjPara = t.para || 'USD';
  var orjF = parseFloat(t.alisF) || 0;
  var kur = (window._saKur||{})[orjPara] || 44.55;
  var alisTl = parseFloat((orjF*kur).toFixed(2));
  window._saV2SatisUrunler.push({ id:t.id, duayKodu:t.duayKodu||'', urunAdi:t.urunAdi||'', gorsel:t.gorsel||'', alisOrjF:orjF, alisOrjPara:orjPara, alisTl:alisTl, miktar:1, marj:33, birim: t.birim || 'Adet', mensei: t.mensei || '' });
  window._saV2SatisTabloyuGuncelle();
};

/* SATIS-URUN-KALDIR-001: ID bazlı ürün güncelleme helper'ları */
window._saV2UrunMiktar = function(id, val) {
  var arr = window._saV2SatisUrunler || [];
  var i = arr.findIndex(function(x){ return String(x.id) === String(id); });
  if (i < 0) return;
  arr[i].miktar = parseFloat(val) || 1;
  window._saV2SatisTabloyuGuncelle();
  window._saV2SatisOzetGuncelle();
  window._saV2PIOnizlemeGuncelle?.();
};

window._saV2UrunMarj = function(id, val) {
  var arr = window._saV2SatisUrunler || [];
  var i = arr.findIndex(function(x){ return String(x.id) === String(id); });
  if (i < 0) return;
  arr[i].marj = parseFloat(val) || 33;
  window._saV2SatisTabloyuGuncelle();
  window._saV2SatisOzetGuncelle();
  window._saV2PIOnizlemeGuncelle?.();
};

window._saV2UrunSil = function(id) {
  var arr = window._saV2SatisUrunler || [];
  window._saV2SatisUrunler = arr.filter(function(x){ return String(x.id) !== String(id); });
  window._saV2SatisTabloyuGuncelle();
  window._saV2SatisOzetGuncelle();
  window._saV2PIOnizlemeGuncelle?.();
};

/* SATIS-FORM-PARITE-001: mensei + birim state update handlers */
window._saV2UrunMensei = function(id, val) {
  var arr = window._saV2SatisUrunler || [];
  var i = arr.findIndex(function(x){ return String(x.id) === String(id); });
  if (i < 0) return;
  arr[i].mensei = val || '';
  window._saV2PIOnizlemeGuncelle?.();
};

window._saV2UrunBirim = function(id, val) {
  var arr = window._saV2SatisUrunler || [];
  var i = arr.findIndex(function(x){ return String(x.id) === String(id); });
  if (i < 0) return;
  arr[i].birim = val || 'Adet';
  window._saV2PIOnizlemeGuncelle?.();
};

/* SATIS-MARJ-001: Direkt satış fiyatı girilirse marj geri hesaplanır */
window._saV2UrunSatisFiyat = function(id, satisFiyat) {
  var arr = window._saV2SatisUrunler || [];
  var idx = arr.findIndex(function(x){ return String(x.id) === String(id); });
  if (idx < 0) return;
  var u = arr[idx];
  u.satisFiyat = satisFiyat;
  if (u.alisHedef && u.alisHedef > 0) {
    u.marj = Math.round(((satisFiyat / u.alisHedef) - 1) * 100 * 10) / 10;
  }
  u.toplam = satisFiyat * (parseFloat(u.miktar) || 1);
  window._saV2SatisTabloyuGuncelle();
  window._saV2SatisOzetGuncelle();
  window._saV2PIOnizlemeGuncelle?.();
};

window._saV2SatisTabloyuGuncelle = function() {
  var tbody = document.getElementById('st-urun-tbody');
  if (!tbody) return;
  var urunler = window._saV2SatisUrunler || [];
  var boyut = 50;
  var sayfa = window._stUrunSayfa || 1;
  var toplamSayfa = Math.max(1, Math.ceil(urunler.length / boyut));
  if (sayfa > toplamSayfa) sayfa = toplamSayfa;
  window._stUrunSayfa = sayfa;
  var bas = (sayfa - 1) * boyut;
  var goster = urunler.slice(bas, bas + boyut);
  var hedefPara = document.getElementById('st-para-birimi')?.value || 'USD';
  var paraSym = ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3', TRY: '\u20ba', CNY: '\u00a5' })[hedefPara] || (hedefPara + ' ');
  var kurlar = window._saKur || {};
  /* Her \u00fcr\u00fcn\u00fc hesapla */
  urunler.forEach(function(u) {
    var orjPara = u.alisOrjPara || 'TRY';
    var orjF = (u.alisOrjF != null) ? parseFloat(u.alisOrjF) : parseFloat(u.alisTl || 0);
    if (u.alisOrjF == null) orjPara = 'TRY';
    var alisHedef = typeof window._saV2KurCevir === 'function' ? window._saV2KurCevir(orjF, orjPara, hedefPara) : orjF;
    u.alisHedef = alisHedef;
    u.satisFiyat = alisHedef * (1 + (parseFloat(u.marj) || 0) / 100);
    u.toplam = u.satisFiyat * (parseFloat(u.miktar) || 0);
    u.paraBirimi = hedefPara;
  });
  tbody.innerHTML = goster.map(function(u, idx) {
    var gIdx = bas + idx;
    // T03-2: ID eksikliği artık bug — sessizce gIdx'e düşmüyoruz, loglayalım
    if (!u.id) console.error('[T03-2] Ürün ID eksik:', u);
    return '<tr style="border-bottom:0.5px solid var(--b)">'
      + '<td style="padding:4px 6px;width:28px">' + (u.gorsel ? '<img src="' + u.gorsel + '" style="width:26px;height:26px;border-radius:3px;object-fit:cover">' : '<div style="width:26px;height:26px;background:var(--s2);border-radius:3px;border:0.5px solid var(--b)"></div>') + '</td>'
      + '<td style="padding:4px 6px;font-size:10px"><div style="font-weight:500">' + _saEsc(u.duayKodu || '') + (u.duayKodu ? ' \u2014 ' : '') + _saEsc(u.urunAdi || '\u2014') + '</div>' + (u.eskiKod ? '<div style="font-size:8px;color:var(--t3)">(' + _saEsc(u.eskiKod) + ')</div>' : '') + '</td>'
      /* SATIS-URUN-TBODY-STYLE-001: ALIŞ mavi, SATIŞ yeşil, input ortalama, Kaldır kırmızı */
      + '<td style="padding:4px 6px"><input type="number" value="' + (u.miktar || 1) + '" min="1" oninput="event.stopPropagation();window._saV2UrunMiktar(\'' + (u.id || gIdx) + '\', this.value)" style="width:100%;min-width:40px;font-size:10px;padding:3px 5px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);text-align:center;box-sizing:border-box"></td>'
      + '<td style="padding:4px 6px;font-size:10px;color:#185FA5;font-weight:500">' + paraSym + (u.alisHedef || 0).toFixed(2) + '</td>'
      + '<td style="padding:4px 6px"><input type="number" value="' + (u.marj || 33) + '" min="0" max="200" oninput="event.stopPropagation();window._saV2UrunMarj(\'' + (u.id || gIdx) + '\', this.value)" style="width:100%;min-width:40px;font-size:10px;padding:3px 5px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);text-align:center;box-sizing:border-box"></td>'
      + '<td style="padding:3px 4px;color:#16A34A;font-weight:600"><input type="number" min="0" step="0.01" value="' + (u.satisFiyat || 0).toFixed(2) + '" onchange="event.stopPropagation();window._saV2UrunSatisFiyat(\'' + (u.id || gIdx) + '\', parseFloat(this.value)||0)" oninput="event.stopPropagation()" style="width:100%;font-size:10px;padding:3px 5px;border:0.5px solid var(--b);border-radius:4px;background:#E1F5EE;color:#16A34A;font-family:inherit;font-weight:600;box-sizing:border-box"></td>'
      + '<td style="padding:4px 6px;font-size:10px;font-weight:500">' + paraSym + (u.toplam || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '</td>'
      /* SATIS-FORM-PARITE-001: Birim + Menşei inline seçimler */
      + '<td style="padding:4px 6px"><select disabled onclick="event.stopPropagation()" onchange="event.stopPropagation();window._saV2UrunBirim(\'' + (u.id || gIdx) + '\', this.value)" style="width:100%;font-size:10px;padding:3px 4px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t2);cursor:not-allowed;opacity:0.85;font-family:inherit">'
      + ['Adet','Kg','Ton','Mt','m²','m³','Lt','Koli','Çift','Paket','Set','Rulo','Takım'].map(function(b) { return '<option value="' + b + '"' + ((u.birim || 'Adet') === b ? ' selected' : '') + '>' + b + '</option>'; }).join('')
      + '</select></td>'
      + '<td style="padding:4px 6px"><select disabled onclick="event.stopPropagation()" onchange="event.stopPropagation();window._saV2UrunMensei(\'' + (u.id || gIdx) + '\', this.value)" style="width:100%;font-size:10px;padding:3px 4px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t2);cursor:not-allowed;opacity:0.85;font-family:inherit"><option value="">—</option>'
      + (window.MENSEI || ['Türkiye','Çin','Almanya','İtalya','Japonya','Hindistan','ABD','Diğer']).map(function(m) { return '<option value="' + m + '"' + ((u.mensei || '') === m ? ' selected' : '') + '>' + m + '</option>'; }).join('')
      + '</select></td>'
      + '<td style="padding:4px 6px"><button onclick="event.stopPropagation();window._saV2UrunSil(\'' + u.id + '\')" title="Kald\u0131r" style="padding:2px 6px;border:0.5px solid #DC2626;border-radius:4px;background:transparent;color:#DC2626;font-size:14px;cursor:pointer;font-family:inherit">🗑</button></td>'
      + '</tr>';
  }).join('');
  /* Sayfalama */
  var spEl = document.getElementById('st-urun-sayfalama');
  if (!spEl) { spEl = document.createElement('div'); spEl.id = 'st-urun-sayfalama'; tbody.parentElement.parentElement.appendChild(spEl); }
  if (toplamSayfa > 1) {
    spEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:var(--s2);border-top:0.5px solid var(--b);font-size:10px">'
      + '<span style="color:var(--t3)">' + urunler.length + ' \u00fcr\u00fcn \u00b7 Sayfa ' + sayfa + '/' + toplamSayfa + '</span>'
      + '<div style="display:flex;gap:4px">'
      + (sayfa > 1 ? '<button onclick="event.stopPropagation();window._stUrunSayfa=' + (sayfa - 1) + ';window._saV2SatisTabloyuGuncelle()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit">\u2190</button>' : '')
      + (sayfa < toplamSayfa ? '<button onclick="event.stopPropagation();window._stUrunSayfa=' + (sayfa + 1) + ';window._saV2SatisTabloyuGuncelle()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit">\u2192</button>' : '')
      + '</div></div>';
  } else { spEl.innerHTML = ''; }
  /* Kur bilgisi */
  var kurBilgi = document.getElementById('st-kur-bilgi');
  var bankaEl = document.getElementById('st-banka-bilgi');
  if (!kurBilgi && bankaEl) { kurBilgi = document.createElement('div'); kurBilgi.id = 'st-kur-bilgi'; kurBilgi.style.cssText = 'font-size:8px;color:var(--t3);margin-top:3px;font-family:monospace;padding:0 2px'; bankaEl.parentNode.insertBefore(kurBilgi, bankaEl.nextSibling); }
  if (kurBilgi) { var kb = kurlar[hedefPara]; kurBilgi.textContent = hedefPara === 'TRY' ? '' : ('1 ' + hedefPara + ' = ' + (kb ? kb.toFixed(2) : '?') + ' TRY'); }
  window._saV2SatisOzetGuncelle();
};

window._saV2SatisOzetGuncelle = function() {
  var hedefPara = document.getElementById('st-para-birimi')?.value || 'USD';
  var paraSym = ({USD:'$',EUR:'\u20ac',GBP:'\u00a3',TRY:'\u20ba',CNY:'\u00a5'})[hedefPara] || (hedefPara+' ');
  var toplamSatis = 0; var toplamAlis = 0; var toplamMiktar = 0;
  window._saV2SatisUrunler.forEach(function(u) {
    var alisHedef = (u.alisHedef != null) ? u.alisHedef : window._saV2KurCevir((u.alisOrjF!=null?u.alisOrjF:u.alisTl), (u.alisOrjPara||'TRY'), hedefPara);
    var satisFiyat = (u.satisFiyat != null) ? u.satisFiyat : alisHedef*(1+(parseFloat(u.marj)||0)/100);
    var miktar = parseFloat(u.miktar)||0;
    toplamSatis += satisFiyat*miktar;
    toplamAlis  += alisHedef*miktar;
    toplamMiktar += miktar;
  });
  var toplamKar = toplamSatis - toplamAlis;
  var ortMarj = toplamAlis>0 ? ((toplamKar/toplamAlis)*100).toFixed(1) : 0;
  var el1 = document.getElementById('st-ozet-toplam-satis'); if(el1) el1.textContent = paraSym+toplamSatis.toFixed(2)+' '+hedefPara;
  var el2 = document.getElementById('st-ozet-toplam-kar'); if(el2) el2.textContent = paraSym+toplamKar.toFixed(2)+' '+hedefPara;
  /* Eski form ID'leri (geriye uyumluluk) */
  var el3 = document.getElementById('st-ozet-ort-marj'); if(el3) el3.textContent = '%'+ortMarj;
  var el4 = document.getElementById('st-ozet-urun-say'); if(el4) el4.textContent = window._saV2SatisUrunler.length+' \u00fcr\u00fcn \u00b7 '+toplamMiktar+' adet';
  var el5 = document.getElementById('st-ozet-eur');
  if(el5){
    var toplamEUR = window._saV2KurCevir(toplamSatis, hedefPara, 'EUR');
    el5.textContent = '\u20ac'+toplamEUR.toFixed(2);
  }
};

window._saV2UrunSecModal = function() {
  var mevcut = document.getElementById('sav2-urun-sec-modal'); if(mevcut) mevcut.remove();
  var m = document.createElement('div');
  m.id = 'sav2-urun-sec-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  m.onclick = function(e){ if(e.target===m) m.remove(); };
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:600px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid var(--b)"><span style="font-size:13px;font-weight:500">Ürün Seç</span><button onclick="event.stopPropagation();document.getElementById(\'sav2-urun-sec-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3)">×</button></div>';
  ic += '<div style="padding:8px 16px;border-bottom:0.5px solid var(--b)">';
  ic += '<input id="sav2-urun-ara" placeholder="Ürün adı, kod veya tedarikçi ara..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="window._saV2UrunAra(this.value)" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">';
  ic += '</div>';
  ic += '<div id="sav2-urun-liste" style="flex:1;overflow-y:auto">'+window._saV2UrunListHTML('')+'</div>';
  ic += '</div>';
  m.innerHTML = ic;
  document.body.appendChild(m);
  setTimeout(function(){ document.getElementById('sav2-urun-ara')?.focus(); }, 100);
};

window._saV2UrunListHTML = function(filtre) {
  var tumListe = (window._saV2Load?.() || []).filter(function(t){return !t.isDeleted;});
  var katalog = typeof window.loadUrunler==='function' ? window.loadUrunler({tumKullanicilar:true}) : [];
  var tumKatalog = katalog.filter(function(u){return !u.isDeleted;});
  var kaynaklar = tumListe.concat(tumKatalog.map(function(u){
    return {id:u.id||u._id,urunAdi:u.urunAdi||u.ad||u.name||'',duayKodu:u.duayKodu||u.kod||'',tedarikci:u.tedarikci||'',alisF:u.alisF||u.satisFiyati||'',para:'USD',birim:u.birim||'Adet',gorsel:u.gorsel||''};
  }));
  if (filtre && filtre.trim()) {
    var f = filtre.trim().toLowerCase();
    kaynaklar = kaynaklar.filter(function(t){
      return (t.urunAdi||'').toLowerCase().includes(f) || (t.duayKodu||'').toLowerCase().includes(f) || (t.tedarikci||'').toLowerCase().includes(f);
    });
  }
  if (!kaynaklar.length) return '<div style="padding:30px;text-align:center;color:var(--t3);font-size:12px">Ürün bulunamadı</div>';
  return kaynaklar.map(function(t){
    var payload = JSON.stringify({id:t.id||t._id,duayKodu:t.duayKodu,urunAdi:t.urunAdi,alisF:t.alisF,para:t.para||'USD',miktar:1,birim:t.birim||t.unit||'Adet',mensei:t.mensei||t.origin||'',gorsel:t.gorsel||''}).replace(/"/g,'&quot;');
    var gorselSrc = t.gorsel || '';
    return '<div onclick="event.stopPropagation();window._saV2SatisUrunEkle(JSON.parse(this.dataset.p));document.getElementById(\'sav2-urun-sec-modal\')?.remove()" data-p="'+payload+'" style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:0.5px solid var(--b);cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      +(gorselSrc ? '<img src="'+gorselSrc+'" style="width:32px;height:32px;border-radius:4px;object-fit:cover">' : '<div style="width:32px;height:32px;border-radius:4px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:14px">📦</div>')
      +'<div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t)">'+_saEsc(t.urunAdi||'—')+'</div>'
      +'<div style="font-size:10px;color:var(--t3)">'+_saEsc(t.duayKodu||'')+(t.tedarikci?' · '+_saEsc(t.tedarikci):'')+(t.alisF?' · '+t.alisF+' '+(t.para||'USD'):'')+'</div></div>'
      +'</div>';
  }).join('');
};

window._saV2UrunAra = function(deger) {
  var liste = document.getElementById('sav2-urun-liste');
  if (liste) liste.innerHTML = window._saV2UrunListHTML(deger);
};

/* SATIS-URUN-KAYNAK-SEC-001: Kaynak sekme toggle — aktif butona stil + liste yeniden çiz */
window._saV2AktifKaynak = window._saV2AktifKaynak || 'satin';
window._saV2KaynakSec = function(kaynak) {
  window._saV2AktifKaynak = kaynak;
  var btnSatin = document.getElementById('sav2-kaynak-satin');
  var btnKatalog = document.getElementById('sav2-kaynak-katalog');
  if (btnSatin) {
    btnSatin.style.background = kaynak==='satin' ? 'var(--ac)' : 'transparent';
    btnSatin.style.color = kaynak==='satin' ? '#fff' : 'var(--t3)';
    btnSatin.style.fontWeight = kaynak==='satin' ? '500' : '400';
  }
  if (btnKatalog) {
    btnKatalog.style.background = kaynak==='katalog' ? 'var(--ac)' : 'transparent';
    btnKatalog.style.color = kaynak==='katalog' ? '#fff' : 'var(--t3)';
    btnKatalog.style.fontWeight = kaynak==='katalog' ? '500' : '400';
  }
  var ara = document.getElementById('sav2-urun-ara');
  var liste = document.getElementById('sav2-urun-liste');
  if (liste) liste.innerHTML = window._saV2UrunListHTML(ara ? ara.value : '');
};

/* ── Çoklu ürün satırı ekleme ──────────────────────────────── */
window._saV2UrunSayac = 0;
/* SATINALMA-V2-URUN-DATALIST-001: tek seferlik datalist — tüm ürün rows shared */
window._saV2UrunDatalistInit = function() {
  if (document.getElementById('sav2-urun-list')) return;
  var urunler = [];
  try {
    if (typeof loadUrunler === 'function') {
      urunler = loadUrunler().filter(function(u){ return !u.isDeleted; })
        .map(function(u){ return u.ad||u.name||u.urunAdi||''; }).filter(Boolean);
    }
    if (typeof loadAlisTeklifleri === 'function') {
      loadAlisTeklifleri().forEach(function(t){
        (t.urunler||t.items||[]).forEach(function(i){
          var ad = i.urunAdi||i.ad||i.name||'';
          if (ad && urunler.indexOf(ad) === -1) urunler.push(ad);
        });
      });
    }
  } catch(e) {}
  urunler = urunler.slice(0, 50);
  var dl = document.createElement('datalist');
  dl.id = 'sav2-urun-list';
  dl.innerHTML = urunler.map(function(u){
    return '<option value="'+String(u).replace(/"/g,'&quot;')+'">';
  }).join('');
  document.body.appendChild(dl);
};

window._saV2UrunSatirEkle = function() {
  var con = document.getElementById('sav2f-urunler-container');
  if (!con) return;
  // SATINALMA-V2-URUN-LIMIT-001: max 100 ürün per alış teklifi
  if (con.querySelectorAll('.sav2f-urun-satir').length >= 100) {
    window.toast?.('Maksimum 100 ürün eklenebilir', 'warn'); return;
  }
  /* SATINALMA-V2-URUN-DATALIST-001: datalist lazy init (her modal açılışında bir kez) */
  window._saV2UrunDatalistInit();
  var idx = window._saV2UrunSayac++;
  var pre = 'sav2u-' + idx + '-';
  var _uf = function(id, lbl, ph, tip) {
    return '<div><div style="font-size:7px;font-weight:500;color:var(--t3);letter-spacing:.05em;margin-bottom:3px">' + lbl + '</div>'
      + '<input id="' + pre + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  };
  var satir = document.createElement('div');
  satir.className = 'sav2f-urun-satir';
  satir.setAttribute('data-urun-satir', String(idx));
  satir.style.cssText = 'display:grid;grid-template-columns:44px 100px 145px 76px 105px 90px 56px 78px 88px 92px 98px 72px 66px 60px 84px 76px 74px 74px 74px 30px 22px;gap:4px;align-items:center;padding:7px 0;border-bottom:0.5px solid var(--b);min-width:1600px';
  var _hesaplaKur = 'var _p=document.getElementById(\''+pre+'para\')?.value||\'USD\';var _kv=parseFloat((window._saKur||window.DUAY_KUR||{})[_p])||(_p===\'USD\'?44.55:_p===\'EUR\'?51.70:_p===\'GBP\'?59.30:1);var _f=parseFloat(document.getElementById(\''+pre+'alisF\')?.value)||0;var _m=parseFloat(document.getElementById(\''+pre+'miktar\')?.value)||0;var _tlb=_f*_kv;var _top=_m*_tlb;document.getElementById(\''+pre+'kurTL\').value=_kv.toFixed(2);document.getElementById(\''+pre+'tlBirim\').value=_tlb.toLocaleString(\'tr-TR\',{maximumFractionDigits:2});document.getElementById(\''+pre+'toplamTL\').value=_top.toLocaleString(\'tr-TR\',{maximumFractionDigits:0});';

  satir.innerHTML =
    '<div onclick="event.stopPropagation();window._saV2UrunGorselAc?.(\''+pre+'\')" style="width:42px;height:42px;border-radius:6px;background:var(--s2);border:0.5px solid var(--b);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0;cursor:pointer;transition:border-color .12s" onmouseenter="this.style.borderColor=\'var(--ac)\'" onmouseleave="this.style.borderColor=\'var(--b)\'" title="Görseli büyüt"><img id="'+pre+'gorsel-img" src="" style="width:42px;height:42px;object-fit:cover;display:none"><span id="'+pre+'gorsel-ico" style="font-size:18px">\ud83d\udce6</span></div>'
    + '<div style="position:relative"><input id="'+pre+'duayKodu" placeholder="11\u00b7XXXX\u00b7XXX" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._saV2UrunKatalogDoldur?.(\''+pre+'\',this.value);window._saV2UrunAdAra?.(\''+pre+'\',this.value,\''+pre+'duayKodu\')" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--sf);color:var(--t);font-family:inherit"><div id="'+pre+'katalog-bilgi" style="font-size:7px;color:var(--t3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div>'
    + '<input id="'+pre+'turkceAdi" readonly placeholder="Otomatik" onclick="event.stopPropagation()" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid #9FE1CB;border-radius:5px;background:#E1F5EE;color:#085041;font-family:inherit">'
    + '<input id="'+pre+'miktar" type="number" placeholder="0" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();'+_hesaplaKur+'" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;text-align:right">'
    + '<select id="'+pre+'birim" onclick="event.stopPropagation()" style="width:100%;font-size:10px;padding:5px 3px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="Adet">Adet</option><option value="Kg">Kg</option><option value="Ton">Ton</option><option value="Mt">Mt (Metre)</option><option value="m\u00b2">M\u00b2</option><option value="m\u00b3">M\u00b3</option><option value="Lt">Lt (Litre)</option><option value="Koli">Koli</option><option value="Set">Set</option><option value="Paket">Paket</option><option value="Rulo">Rulo</option><option value="Tak\u0131m">Tak\u0131m</option><option value="\u00c7ift">\u00c7ift</option><option value="Palet">Palet</option><option value="g">g (Gram)</option><option value="ml">ml</option><option value="Konteyner">Konteyner</option></select>'
    + '<input id="'+pre+'alisF" type="number" placeholder="0.00" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();'+_hesaplaKur+'" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;text-align:right">'
    + '<select id="'+pre+'para" onclick="event.stopPropagation()" onchange="event.stopPropagation();'+_hesaplaKur+'" style="width:100%;font-size:10px;padding:5px 3px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="GBP">GBP</option><option value="CNY">CNY</option><option value="JPY">JPY</option></select>'
    + '<input id="'+pre+'kurTL" readonly placeholder="\u2014" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid #B5D4F4;border-radius:5px;background:#E6F1FB;color:#0C447C;font-family:monospace;text-align:right">'
    + '<input id="'+pre+'tlBirim" readonly placeholder="\u2014" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid #B5D4F4;border-radius:5px;background:#E6F1FB;color:#0C447C;font-family:monospace;text-align:right">'
    + '<input id="'+pre+'toplamTL" readonly placeholder="\u2014" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid #B5D4F4;border-radius:5px;background:#E6F1FB;color:#185FA5;font-family:monospace;font-weight:600;text-align:right">'
    + '<input id="'+pre+'urunAdi" placeholder="\u0130ng. ad\u0131 * (zorunlu)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._saV2UrunAdAra?.(\''+pre+'\',this.value)" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<select id="'+pre+'mensei" onclick="event.stopPropagation()" style="width:100%;font-size:10px;padding:5px 3px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Men\u015fe...</option>'+(window.MENSEI||['T\u00fcrkiye','\u00c7in','Almanya','\u0130talya','Japonya','Hindistan','ABD','Di\u011fer']).map(function(m){return '<option value="'+m+'">'+m+'</option>';}).join('')+'</select>'
    + '<input id="'+pre+'gtip" placeholder="8482.10" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<input id="'+pre+'netAg" type="number" placeholder="0" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;text-align:right">'
    + '<input id="'+pre+'saticiKodu" placeholder="Kod" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<input id="'+pre+'urunTeslimat" type="number" placeholder="G\u00fcn" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:10px;padding:5px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;text-align:right">'
    + '<button onclick="event.stopPropagation();window._saV2NotAc(\''+pre+'\',\'mus\',this)" style="font-size:9px;padding:3px 4px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);white-space:nowrap" id="'+pre+'notbtn-mus">\ud83d\udcdd \u2014</button>'
    + '<button onclick="event.stopPropagation();window._saV2NotAc(\''+pre+'\',\'sirket\',this)" style="font-size:9px;padding:3px 4px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);white-space:nowrap" id="'+pre+'notbtn-sirket">\ud83d\udd12 \u2014</button>'
    + '<button onclick="event.stopPropagation();window._saV2NotAc(\''+pre+'\',\'sozlesme\',this)" style="font-size:9px;padding:3px 4px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);white-space:nowrap" id="'+pre+'notbtn-sozlesme">\ud83d\udccb \u2014</button>'
    + '<button onclick="event.stopPropagation();window._saV2HilePanelAc(\''+pre+'\','+idx+')" style="font-size:13px;border:none;background:none;cursor:pointer;padding:0" title="Gizli Kalite Tuza\u011f\u0131">\ud83d\udd75\ufe0f</button>'
    + '<button onclick="event.stopPropagation();var s=this.closest(\'.sav2f-urun-satir\');var np=document.getElementById(\''+pre+'not-panel-mus\');if(np)np.remove();var np2=document.getElementById(\''+pre+'not-panel-sirket\');if(np2)np2.remove();var np3=document.getElementById(\''+pre+'not-panel-sozlesme\');if(np3)np3.remove();s.remove()" style="font-size:14px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">\u00d7</button>';

  con.appendChild(satir);
};

/** Ürün satırından katalog otomatik doldurma */
window._saV2UrunKatalogDoldur = function(pre, kod) {
  if (!kod || kod.length < 3) return;
  var urunler = typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true}) : [];
  var tumUrunler = urunler;
  /* SATINALMA-UX-002: lookup hem eski (duayKodu) hem yeni (duayCode) field adlarıyla */
  var _kodLower = kod.toLowerCase();
  var u = tumUrunler.find(function(x) {
    return (x.duayKodu || x.duayCode || '').toLowerCase() === _kodLower;
  });
  var bilgiEl = document.getElementById(pre + 'katalog-bilgi');
  /* SA-FORM-URUN-GRID-V2-001: görsel + türkçe ad otomatik doldur */
  var gorselImg = document.getElementById(pre + 'gorsel-img'); var gorselIco = document.getElementById(pre + 'gorsel-ico');
  var _gorsel = u && (u.gorsel || u.image);
  if (u && _gorsel && gorselImg) { gorselImg.src = _gorsel; gorselImg.style.display = 'block'; if (gorselIco) gorselIco.style.display = 'none'; }
  var turkceEl = document.getElementById(pre + 'turkceAdi'); if (turkceEl && u) { turkceEl.value = u.duayAdi || u.duayName || u.turkceAdi || u.urunAdi || ''; }
  /* SA-FORM-URUN-V3-001: net ağırlık katalogdan otomatik (SATINALMA-UX-002: netW/netWeight fallback) */
  var netAgEl = document.getElementById(pre + 'netAg');
  var _netAg = u && (u.netAgirlik || u.netW || u.netWeight);
  if (netAgEl && _netAg) { netAgEl.value = _netAg; netAgEl.style.background = '#E1F5EE'; netAgEl.style.borderColor = '#9FE1CB'; }
  if (!u) { if (bilgiEl) bilgiEl.innerHTML = '<span style="color:#A32D2D">Katalogda bulunamad\u0131</span>'; return; }
  if (bilgiEl) bilgiEl.innerHTML = '<span style="color:#0F6E56">\u2713 ' + _saEsc(u.duayAdi || u.duayName || u.urunAdi || '') + '</span>';
  /* SATINALMA-UX-002: yeni katalog field adları (origName/origin/unit/netW/grossW/vendorCode) fallback */
  var alanlar = {
    urunAdi: u.standartAdi || u.ingAd || u.origName || u.urunAdi,
    turkceAdi: u.duayAdi || u.duayName || u.turkceAdi || u.urunAdi,
    marka: u.marka,
    gtip: u.gtip || u.hscKodu,
    saticiKodu: u.saticiKodu || u.urunKodu || u.vendorCode,
    netAg: u.netAgirlik || u.netW || u.netWeight,
    brutAg: u.brutAgirlik || u.grossW || u.grossWeight,
    alisF: u.alisF || u.sonFiyat || u.sonAlisFiyati
  };
  Object.keys(alanlar).forEach(function(k) { var el = document.getElementById(pre + k); if (el && alanlar[k]) el.value = alanlar[k]; });
  /* SELECT'ler — yeni + eski field adları */
  var _birim = u.birim || u.unit;
  var birimEl = document.getElementById(pre + 'birim');
  if (birimEl && _birim) { Array.from(birimEl.options).forEach(function(o) { if (o.value === _birim || o.textContent === _birim) o.selected = true; }); }
  var _mensei = u.mensei || u.origin;
  var menEl = document.getElementById(pre + 'mensei');
  if (menEl && _mensei) { Array.from(menEl.options).forEach(function(o) { if (o.value === _mensei || o.textContent === _mensei) o.selected = true; }); }
  var _para = u.para || u.paraBirimi;
  var paraEl = document.getElementById(pre + 'para');
  if (paraEl && _para) { Array.from(paraEl.options).forEach(function(o) { if (o.value === _para) o.selected = true; }); }
};

/** Ürün adına göre arama dropdown (body append + fixed) */
window._saV2UrunAdAra = function(pre, deger, hedefId) {
  var ddId = 'sa-urun-ad-dd-' + pre.replace(/[^a-z0-9]/gi, '') + (hedefId ? '-kod' : '');
  var dd = document.getElementById(ddId);
  var inp = document.getElementById(hedefId || (pre + 'urunAdi'));
  if (!deger || deger.length < 2) { if (dd) dd.remove(); return; }
  /* SATINALMA-UX-001: Türkçe normalize + vendor filter + spam-guarded toast (önceki commit'ler dead _saV2UrunAraDropdown'a gitmişti, gerçek fn bu) */
  var _norm = function(s) { return !s ? '' : String(s).toLocaleLowerCase('tr-TR').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').trim(); };
  var _seciliTed = (document.getElementById('sav2f-tedarikci')?.value || '').trim();
  if (!_seciliTed) {
    if (dd) dd.remove();
    if (!window._sav2TedToastAktif) {
      if (window.toast) window.toast('Önce tedarikçi seçin', 'warn');
      window._sav2TedToastAktif = true;
      setTimeout(function(){ window._sav2TedToastAktif = false; }, 5000);
    }
    return;
  }
  var _seciliTedN = _norm(_seciliTed);
  var q = _norm(deger);
  var urunler = typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true}) : [];
  /* SATINALMA-UX-003: vendorName + vendor fallback (batch form u.vendorName, eski u.tedarikci, nadir u.vendor).
     SATINALMA-UX-004: strict '===' yerine 2-yönlü includes — ufak yazım/boşluk farklarına karşı toleranslı
     ('Weltew' seçimi 'Weltew Mobilya' ürününe eşleşir + tam eşleşme de geçerli). */
  var tum = urunler.filter(function(u){
    if (u.isDeleted) return false;
    var uTedN = _norm(u.tedarikci || u.vendorName || u.vendor || '');
    if (!uTedN) return false;
    return uTedN === _seciliTedN || uTedN.includes(_seciliTedN) || _seciliTedN.includes(uTedN);
  });
  var sonuc = tum.filter(function(u) {
    return _norm(u.urunAdi).includes(q)
      || _norm(u.standartAdi).includes(q)
      || _norm(u.origName).includes(q)
      || _norm(u.duayAdi).includes(q)
      || _norm(u.duayName).includes(q)
      || _norm(u.duayKodu).includes(q)
      || _norm(u.duayCode).includes(q);
  }).slice(0, 8);
  if (!sonuc.length) { if (dd) dd.remove(); return; }
  if (!dd) {
    dd = document.createElement('div');
    dd.id = ddId;
    dd.style.cssText = 'position:fixed;z-index:10001;background:var(--sf);border:0.5px solid var(--b);border-radius:5px;max-height:160px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.12)';
    document.body.appendChild(dd);
    document.addEventListener('click', function rm() { dd.remove(); document.removeEventListener('click', rm); }, { once: true });
  }
  if (inp) {
    var rect = inp.getBoundingClientRect();
    dd.style.left = rect.left + 'px';
    dd.style.top = (rect.bottom + 2) + 'px';
    dd.style.width = Math.max(rect.width, 300) + 'px';
  }
  /* SATINALMA-UX-005: Dropdown item render — eski + yeni format fallback chain (urunAdi→duayName→origName, duayKodu→duayCode, tedarikci→vendorName→vendor). Önceden sadece eski field okuyordu → BERJER gibi yeni ürünler render empty çıkıyordu. */
  dd.innerHTML = sonuc.map(function(u) {
    var _kod = u.duayKodu || u.duayCode || '';
    var _ad = u.duayName || u.duayAdi || u.urunAdi || u.standartAdi || u.origName || '—';
    var _vendor = u.tedarikci || u.vendorName || u.vendor || '';
    var _kodEsc = (_kod + '').replace(/'/g, "\\'");
    return '<div onclick="event.stopPropagation();window._saV2UrunSecimDoldur?.(\'' + pre + '\',\'' + _kodEsc + '\')" style="padding:6px 10px;font-size:10px;cursor:pointer;border-bottom:0.5px solid var(--b);color:var(--t)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'var(--sf)\'">'
      + '<span style="font-weight:500;color:#0C447C">' + _saEsc(_kod) + '</span> ' + _saEsc(_ad) + ' <span style="color:var(--t3);font-size:9px">' + _saEsc(_vendor) + '</span></div>';
  }).join('');
};

window._saV2UrunSecimDoldur = function(pre, duayKodu) {
  /* SA-FORM-DUZENLE-FIX-002: tüm açık dropdown'ları kapat */
  document.querySelectorAll('[id^="sa-urun-ad-dd-"]').forEach(function(el){el.remove();});
  window._saV2UrunKatalogDoldur(pre, duayKodu);
  var kodEl = document.getElementById(pre + 'duayKodu');
  if (kodEl) kodEl.value = duayKodu;
};

/** Tedarikçi (Cari) + Job ID (PP görevler + mevcut teklifler) datalist doldurma */
window._saV2DatalistDoldur = function() {
  var tedSet = {};
  /* Cari listeden tedarikçiler */
  var cariler = typeof window.loadCari === 'function' ? window.loadCari() : [];
  cariler.forEach(function(c) { var ad = c.ad || c.unvan || c.name || ''; if (ad) tedSet[ad] = true; });
  /* Mevcut tekliflerden tedarikçiler */
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  liste.forEach(function(t) { if (t.tedarikci) tedSet[t.tedarikci] = true; });
  var tedDl = document.getElementById('sav2f-ted-list');
  if (tedDl) tedDl.innerHTML = Object.keys(tedSet).sort().map(function(k) { return '<option value="' + _saEsc(k) + '">'; }).join('');
  /* JOB-ID-KAYNAK-FIX-001: PP görevler + mevcut alış tekliflerindeki Job ID'ler */
  var jobSet = {};
  var mevcutTeklifler = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  mevcutTeklifler.forEach(function(t) {
    if (t.jobId && !t.isDeleted) jobSet[t.jobId] = true;
  });
  var gorevler = typeof window.loadTasks === 'function' ? window.loadTasks() : [];
  gorevler.forEach(function(g) {
    if(g.jobId && !g.isDeleted && g.status !== 'done') jobSet[g.jobId] = true;
  });
  var jobDl = document.getElementById('sav2f-job-list');
  if(jobDl) jobDl.innerHTML = Object.keys(jobSet).sort().map(function(k){
    return '<option value="' + _saEsc(k) + '">';
  }).join('');
};

/** Job ID custom dropdown — PP görevler + mevcut teklifler live search */
window._saV2JobIdAra = function(inp) {
  var val = (inp.value || '').trim().toLowerCase();
  var dd = document.getElementById('sav2-jobid-dropdown');
  if (dd) dd.remove();
  if (val.length < 1) return;
  var gorevler = typeof window.loadTasks === 'function' ? window.loadTasks() : [];
  var eslesen = gorevler.filter(function(g) {
    return !g.isDeleted && g.status !== 'done' &&
      ((g.jobId || '').toLowerCase().includes(val) ||
       (g.baslik || g.title || '').toLowerCase().includes(val) ||
       (String(g.id || '')).toLowerCase().includes(val));
  }).slice(0, 8);
  var tumListe = eslesen.map(function(g) { return { id: g.jobId || g.id, ad: g.baslik || g.title || g.jobId || g.id, kaynak: 'PP G\u00f6rev' }; });
  if (!tumListe.length) return;
  var rect = inp.getBoundingClientRect();
  var dd2 = document.createElement('div');
  dd2.id = 'sav2-jobid-dropdown';
  dd2.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + (rect.bottom + 2) + 'px;width:' + Math.max(rect.width, 280) + 'px;background:var(--sf);border:0.5px solid var(--b);border-radius:6px;z-index:10001;max-height:240px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.12)';
  tumListe.forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between;align-items:center';
    row.onmouseenter = function() { this.style.background = 'var(--s2)'; };
    row.onmouseleave = function() { this.style.background = ''; };
    row.innerHTML = '<span style="font-size:11px;font-weight:500;color:var(--t)">' + _saEsc(item.id) + '</span>'
      + '<span style="font-size:9px;color:var(--t3)">' + _saEsc(item.kaynak) + '</span>';
    row.onclick = function(e) { e.stopPropagation(); inp.value = item.id; dd2.remove(); };
    dd2.appendChild(row);
  });
  document.body.appendChild(dd2);
  document.addEventListener('click', function rm() { dd2.remove(); document.removeEventListener('click', rm); }, { once: true });
};

/* \u2500\u2500 SATIS-MARJ-TOPLU-001: Toplu Marj Uygula \u2500\u2500 */
window._saV2TopluMarjUygula = function() {
  var inp = document.getElementById('sav2-toplu-marj');
  var marj = parseFloat(inp?.value);
  if (isNaN(marj) || marj < 0) { window.toast?.('Ge\u00e7erli marj girin', 'warn'); return; }
  (window._saV2SatisUrunler || []).forEach(function(u) {
    u.marj = marj;
    u.satisFiyat = (u.alisHedef || 0) * (1 + marj / 100);
    u.toplam = u.satisFiyat * (parseFloat(u.miktar) || 1);
  });
  window._saV2SatisTabloyuGuncelle?.();
  window._saV2SatisOzetGuncelle?.();
  window._saV2PIOnizlemeGuncelle?.();
  window.toast?.('%' + marj + ' marj t\u00fcm \u00fcr\u00fcnlere uyguland\u0131', 'ok');
};

/* ── SA-FORM-URUN-GRID-V2-001: Not Paneli ──────────────────────── */
window._saV2NotAc = function(pre, tip, btn) {
  var panelId = pre + 'not-panel-' + tip;
  var mevcut = document.getElementById(panelId);
  if (mevcut) { mevcut.remove(); btn.style.background = 'transparent'; btn.style.borderColor = 'var(--b)'; btn.style.color = 'var(--t3)'; return; }
  var renk = tip === 'mus' ? {bg:'#FFFCF5',brd:'#BA7517',lbl:'#633806',em:'\ud83d\udcdd',baslik:'Not \u2014 M\u00fc\u015fteriye G\u00f6sterilebilir'} : tip === 'sirket' ? {bg:'#F8F8FF',brd:'#7F77DD',lbl:'#3C3489',em:'\ud83d\udd12',baslik:'Not \u2014 \u015eirkete \u00d6zel (Gizli)'} : {bg:'#F0FBF6',brd:'#1D9E75',lbl:'#085041',em:'\ud83d\udccb',baslik:'Not \u2014 Al\u0131\u015f S\u00f6zle\u015fmesine Ekle'};
  btn.style.background = renk.bg; btn.style.borderColor = renk.brd; btn.style.color = renk.lbl;
  var panel = document.createElement('div');
  panel.id = panelId;
  panel.style.cssText = 'grid-column:1/-1;padding:10px 12px;background:'+renk.bg+';border-left:2px solid '+renk.brd+';margin:2px 0';
  var maddeler = (window._saV2NotVeri = window._saV2NotVeri || {})[pre+tip] || ['','','','',''];
  if (!Array.isArray(maddeler)) maddeler = ['','','','',''];
  (window._saV2NotVeri = window._saV2NotVeri || {})[pre+tip] = maddeler;
  panel.innerHTML = '<div style="font-size:9px;font-weight:500;color:'+renk.lbl+';margin-bottom:7px">'+renk.em+' '+renk.baslik+' (max 5 madde)</div>'
    + maddeler.map(function(m,i){ return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:var(--t3);width:16px">'+(i+1)+'.</span><input onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();(window._saV2NotVeri=window._saV2NotVeri||{})[\''+pre+tip+'\']['+i+']=this.value;var _c=document.getElementById(\''+pre+'notbtn-'+tip+'\');if(_c){var _n=(window._saV2NotVeri[\''+pre+tip+'\']||[]).filter(function(x){return x&&x.trim();}).length;_c.textContent=\''+renk.em+' \'+(_n||\'\u2014\');}" value="'+_saEsc(m)+'" placeholder="'+(i===0?'Madde yaz...':'+ Ekle...')+'" style="flex:1;font-size:11px;padding:4px 7px;border:0.5px solid '+renk.brd+';border-radius:5px;background:var(--sf);color:var(--t);font-family:inherit"></div>'; }).join('');
  var satir = btn.closest('.sav2f-urun-satir');
  satir.after(panel);
  panel.querySelector('input')?.focus();
};

/* ── SA-FORM-HILE-001: Gizli Kalite Tuzağı Tespiti ─────────────── */
window._saV2HilePanelAc = function(pre, idx) {
  var _mevcut = document.getElementById('sav2-hile-modal'); if (_mevcut) _mevcut.remove();
  var _pre = pre; var _idx = idx;
  var _veri = window._saV2HileVeri = window._saV2HileVeri || {};
  var _key = _pre + _idx;
  var _d = _veri[_key] || { bss10: [{ madde: '', kaynak: '' }], capraz: [{ madde: '', kaynak: '' }] };

  var _satirHTML = function(tip, i, m, k) {
    return '<div style="display:grid;grid-template-columns:20px 1fr 160px 24px;gap:6px;align-items:start;margin-bottom:6px">'
      + '<div style="font-size:10px;color:var(--t3);padding-top:6px;text-align:center">' + (i+1) + '</div>'
      + '<textarea onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" id="sav2-hile-'+tip+'-madde-'+i+'" rows="2" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;resize:none" placeholder="Bulgu veya s\u00f6zle\u015fme maddesi...">' + (m||'') + '</textarea>'
      + '<div><div style="font-size:7px;color:var(--t3);font-weight:500;margin-bottom:3px">KAYNAK (Firma/Ki\u015fi/Tel)</div><input onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" id="sav2-hile-'+tip+'-kaynak-'+i+'" value="'+(k||'')+'" placeholder="Kaynak zorunlu..." style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit"></div>'
      + '<button onclick="event.stopPropagation();this.closest(\'div[style*=grid]\').remove()" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:15px;padding-top:4px">\u00d7</button>'
      + '</div>';
  };

  var _mo = document.createElement('div');
  _mo.id = 'sav2-hile-modal';
  _mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px;overflow-y:auto';
  _mo.onclick = function(e) { if (e.target === _mo) _mo.remove(); };

  _mo.innerHTML = '<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:min(820px,96vw);overflow:hidden">'
    + '<div style="padding:14px 16px;border-bottom:0.5px solid var(--b);display:flex;align-items:flex-start;justify-content:space-between">'
      + '<div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">\ud83d\udd75\ufe0f</span><div style="font-size:14px;font-weight:500;color:var(--t)">Gizli Kalite Tuza\u011f\u0131 Tespiti</div></div>'
      + '<div style="font-size:10px;color:var(--t3);margin-top:3px;padding-left:26px">\u00dcr\u00fcn ' + (_idx+1) + ' \u2014 SAHB-0200-380</div></div>'
      + '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:9px;padding:3px 8px;border-radius:4px;background:#FCEBEB;color:#791F1F;font-weight:500">\u015e\u0130RKET G\u0130ZL\u0130</span><button onclick="event.stopPropagation();document.getElementById(\'sav2-hile-modal\').remove()" style="font-size:18px;border:none;background:none;cursor:pointer;color:var(--t3)">\u00d7</button></div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:0.5px solid var(--b);background:var(--s2)">'
      + '<div style="width:22px;height:22px;border-radius:50%;background:#E6F1FB;color:#0C447C;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0">1</div>'
      + '<div><div style="font-size:11px;font-weight:500;color:var(--t)">BSS-10 \u2014 Fiyat Fark\u0131 Sorgusu</div><div style="font-size:9px;color:var(--t3)">"Fiyat\u0131n\u0131z neden y\u00fcksek?" sorusundan elde edilen bulgular</div></div>'
    + '</div>'
    + '<div id="sav2-hile-bss10-cont" style="padding:12px 16px 8px;border-bottom:0.5px solid var(--b)">'
      + _d.bss10.map(function(r,i){ return _satirHTML('bss10',i,r.madde,r.kaynak); }).join('')
      + '<button onclick="event.stopPropagation();var c=document.getElementById(\'sav2-hile-bss10-cont\');var i=c.querySelectorAll(\'div[style*=grid]\').length;c.insertAdjacentHTML(\'beforeend\',window._saV2HileSatirHTML(\'bss10\',i,\'\',\'\'))" style="font-size:10px;padding:4px 12px;border:0.5px dashed var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t3);font-family:inherit">+ Madde Ekle</button>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:0.5px solid var(--b);background:var(--s2)">'
      + '<div style="width:22px;height:22px;border-radius:50%;background:#EEEDFE;color:#3C3489;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0">2</div>'
      + '<div><div style="font-size:11px;font-weight:500;color:var(--t)">\u00c7apraz Y\u00f6ntem \u2014 En \u0130yi \u00dcr\u00fcn Kar\u015f\u0131la\u015ft\u0131rmas\u0131</div><div style="font-size:9px;color:var(--t3)">"B\u00fct\u00e7e s\u0131k\u0131nt\u0131s\u0131 olmasa en iyi \u00fcr\u00fcn\u00fcn\u00fcz nedir?"</div></div>'
    + '</div>'
    + '<div id="sav2-hile-capraz-cont" style="padding:12px 16px 8px;border-bottom:0.5px solid var(--b)">'
      + _d.capraz.map(function(r,i){ return _satirHTML('capraz',i,r.madde,r.kaynak); }).join('')
      + '<button onclick="event.stopPropagation();var c=document.getElementById(\'sav2-hile-capraz-cont\');var i=c.querySelectorAll(\'div[style*=grid]\').length;c.insertAdjacentHTML(\'beforeend\',window._saV2HileSatirHTML(\'capraz\',i,\'\',\'\'))" style="font-size:10px;padding:4px 12px;border:0.5px dashed var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t3);font-family:inherit">+ Madde Ekle</button>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:0.5px solid var(--b);background:var(--s2)">'
      + '<div style="width:22px;height:22px;border-radius:50%;background:#E1F5EE;color:#085041;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0">3</div>'
      + '<div style="font-size:11px;font-weight:500;color:var(--t)">S\u00f6zle\u015fmeye Eklenecek Maddeler</div>'
    + '</div>'
    + '<div id="sav2-hile-sozlesme" style="padding:12px 16px;border-bottom:0.5px solid var(--b)">'
      + '<div id="sav2-hile-sozlesme-metin" style="font-size:11px;color:#085041;line-height:1.8;font-family:monospace;padding:10px 12px;background:#E1F5EE;border-radius:6px;border:0.5px solid #5DCAA5;min-height:48px">Maddeler kaydedilince burada g\u00f6r\u00fcn\u00fcr.</div>'
      + '<div style="display:flex;gap:6px;margin-top:8px"><button onclick="event.stopPropagation();navigator.clipboard?.writeText(document.getElementById(\'sav2-hile-sozlesme-metin\')?.textContent||\'\')" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">\ud83d\udccb Kopyala</button></div>'
    + '</div>'
    + '<div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:10px;color:var(--t3)">Kaynak belirtme zorunludur \u00b7 SAHB-0200-380</div>'
      + '<div style="display:flex;gap:6px">'
        + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-hile-modal\').remove()" style="font-size:11px;padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">\u0130ptal</button>'
        + '<button onclick="event.stopPropagation();window._saV2HileKaydet(\''+_key+'\')" style="font-size:11px;padding:6px 16px;border:none;border-radius:6px;background:#185FA5;color:#fff;cursor:pointer;font-weight:500">Kaydet</button>'
      + '</div>'
    + '</div>'
    + '</div>';
  document.body.appendChild(_mo);
};

window._saV2HileSatirHTML = function(tip, i, m, k) {
  return '<div style="display:grid;grid-template-columns:20px 1fr 160px 24px;gap:6px;align-items:start;margin-bottom:6px">'
    + '<div style="font-size:10px;color:var(--t3);padding-top:6px;text-align:center">' + (i+1) + '</div>'
    + '<textarea onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" id="sav2-hile-'+tip+'-madde-'+i+'" rows="2" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;resize:none" placeholder="Bulgu veya s\u00f6zle\u015fme maddesi...">' + (m||'') + '</textarea>'
    + '<div><div style="font-size:7px;color:var(--t3);font-weight:500;margin-bottom:3px">KAYNAK (Firma/Ki\u015fi/Tel)</div><input onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" id="sav2-hile-'+tip+'-kaynak-'+i+'" value="'+(k||'')+'" placeholder="Kaynak zorunlu..." style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit"></div>'
    + '<button onclick="event.stopPropagation();this.closest(\'div[style*=grid]\').remove()" style="border:none;background:none;cursor:pointer;color:var(--t3);font-size:15px;padding-top:4px">\u00d7</button>'
    + '</div>';
};

window._saV2HileKaydet = function(key) {
  var _veri = window._saV2HileVeri = window._saV2HileVeri || {};
  var _topla = function(tip) {
    var madde = document.querySelectorAll('[id^="sav2-hile-'+tip+'-madde-"]');
    var arr = [];
    madde.forEach(function(el, i) {
      var m = el.value.trim();
      var k = document.getElementById('sav2-hile-'+tip+'-kaynak-'+i)?.value.trim() || '';
      if (m) arr.push({ madde: m, kaynak: k });
    });
    return arr;
  };
  _veri[key] = { bss10: _topla('bss10'), capraz: _topla('capraz') };
  var _sozEl = document.getElementById('sav2-hile-sozlesme-metin');
  if (_sozEl) {
    var _maddeler = _veri[key].bss10.concat(_veri[key].capraz);
    _sozEl.innerHTML = _maddeler.length
      ? _maddeler.map(function(r,i){ return (i+1)+'. '+r.madde+(r.kaynak?' <span style="font-size:9px;color:#0F6E56">('+r.kaynak+')</span>':''); }).join('<br>')
      : 'Hen\u00fcz madde girilmedi.';
  }
  window.toast?.('Gizli Kalite Tuza\u011f\u0131 kaydedildi \u2713', 'ok');
  document.getElementById('sav2-hile-modal')?.remove();
};

/* SA-URUN-GORSEL-ZOOM-001: thumbnail click → tam ekran zoom */
window._saV2UrunGorselAc = function(pre) {
  var img = document.getElementById(pre + 'gorsel-img');
  if (!img || !img.src || img.src === window.location.href || img.style.display === 'none') {
    window.toast?.('Görsel yok', 'info');
    return;
  }
  var src = img.src;
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  ov.onclick = function() { ov.remove(); };
  ov.innerHTML = '<img src="' + src + '" style="max-width:80vw;max-height:80vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.3)" alt="">';
  document.body.appendChild(ov);
};

/* LOJISTIK-SA-ENTEGRE-001: SA V2 onaylanan teklif → kargo kaydı helper */
window._saOnayliKargoOlustur = function(saTeklif) {
  if (!saTeklif || !saTeklif.id) return null;
  var raw;
  try { raw = JSON.parse(localStorage.getItem('ak_kargo2') || '[]'); } catch(e) { raw = []; }
  if (!Array.isArray(raw)) raw = [];
  /* Dupe kontrolü — aynı SA id için kargo zaten varsa dokunma */
  var mevcut = raw.find(function(k){ return k && k.saKaynakId === saTeklif.id && !k.isDeleted; });
  if (mevcut) return mevcut;
  var _now = new Date().toISOString();
  var _refNo = 'KRG-' + Date.now().toString().slice(-6);
  var kargo = {
    id: _refNo + '_' + Math.random().toString(36).slice(2, 7),
    ref_no: _refNo,
    /* SA V2 entegre alanları (kargo şeması üstüne extension) */
    saKaynakId: saTeklif.id,
    piNo: saTeklif.piNo || '',
    tedarikci: saTeklif.tedarikci || '',
    urunler: (saTeklif.urunler || []).map(function(u){
      return { ad: u.urunAdi || u.ad || '', miktar: u.miktar || 0, birim: u.birim || 'adet' };
    }),
    tutar: saTeklif.toplamTutar || 0,
    para: saTeklif.paraBirim || 'USD',
    /* Mevcut kargo.js şeması */
    tip: 'deniz', tur: 'FCL', firma: '',
    gonderen: saTeklif.tedarikci || '',
    alici: 'Duay Global LLC',
    pol: '', pod: '',
    yukleme_tarihi: '', eta: '',
    brut_kg: 0, hacim_m3: 0,
    takip_no: saTeklif.piNo || '',
    navlun_usd: 0,
    durum: 'hazirlaniyor',
    notlar: 'SA V2 teklif onayı ile otomatik oluşturuldu',
    belgeler: [],
    timeline: [{ tarih: _now.slice(0,10), lokasyon: '', aciklama: 'SA V2 onayı — kargo kaydı oluşturuldu', durum: 'tamamlandi' }],
    olusturma: _now,
    isDeleted: false
  };
  raw.push(kargo);
  if (window.storeKargo) window.storeKargo(raw);
  else localStorage.setItem('ak_kargo2', JSON.stringify(raw));
  window.toast && window.toast('Lojistik/Kargo takibine eklendi: ' + (kargo.piNo || kargo.ref_no), 'ok');
  return kargo;
};
