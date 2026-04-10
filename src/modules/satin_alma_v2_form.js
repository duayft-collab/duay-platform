var _saEsc=window._saEsc, _saNow=window._saNow, _saToday=window._saToday, _saId=window._saId, _saCu=window._saCu;
window._saV2Duzenle = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  if (t.durum === 'onaylandi') {
    window._saV2GuncellemeTalep(id);
    return;
  }
  window._saV2DuzenleForm(id);
};
window._saV2YeniTeklif = function() {
  var mevcut = document.getElementById('sav2-form-modal'); if (mevcut) { mevcut.remove(); return; }
  var modal = document.createElement('div');
  modal.id = 'sav2-form-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 0;overflow-y:auto';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var teklifId = window._saTeklifId?.('0000') || ('0000-' + Date.now());
  var _f = function(id, lbl, ph, tip) {
    return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
      + '<input id="sav2f-' + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  };
  var _s = function(id, lbl, opts) {
    return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div>'
      + '<select id="sav2f-' + id + '" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit">' + opts + '</select></div>';
  };
  modal.innerHTML = '<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:660px;overflow:hidden">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">'
    + '<div>'
    + '<div style="font-size:14px;font-weight:500;color:var(--t)">Yeni Alış Teklifi</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:2px;font-family:monospace" id="sav2f-id-goster">ID: ' + teklifId + '</div>'
    + '</div>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-form-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>'
    + '</div>'
    + '<div style="padding:20px;display:flex;flex-direction:column;gap:12px;max-height:70vh;overflow-y:auto">'
    + '<div style="font-size:9px;font-weight:600;color:var(--t3);letter-spacing:.08em;padding-bottom:4px;border-bottom:0.5px solid var(--b)">TEKLİF BAŞLIĞI</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TEDAR\u0130K\u00c7\u0130</div>'
    + '<input id="sav2f-tedarikci" list="sav2f-ted-list" placeholder="Tedarik\u00e7i ad\u0131" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">'
    + '<datalist id="sav2f-ted-list"></datalist></div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">JOB ID</div>'
    + '<input id="sav2f-jobId" list="sav2f-job-list" placeholder="0041" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">'
    + '<datalist id="sav2f-job-list"></datalist></div>'
    + _f('piNo', 'SATICI PI NO', 'PI-2026-001')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _f('piTarih', 'PI TAR\u0130H\u0130', '', 'date')
    + _f('teslimYeri','TESL\u0130M YER\u0130','FOB Shanghai, CIF Mersin')
    + _f('teslimat', 'TESL\u0130M S\u00dcRES\u0130 (G\u00fcn)', '14', 'number')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:4px">TESL\u0130MAT MASRAFI</div>'
    + '<select id="sav2f-teslimMasraf" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<option value="">Se\u00e7...</option>'
    + '<option value="EXW">EXW \u2014 Fabrikadan Teslim</option>'
    + '<option value="FOB">FOB \u2014 Gemiye Y\u00fcklenmi\u015f</option>'
    + '<option value="CIF">CIF \u2014 Sigorta ve Navlun Dahil</option>'
    + '<option value="DDP">DDP \u2014 G\u00fcmr\u00fck Dahil Teslim</option>'
    + '<option value="DAP">DAP \u2014 Var\u0131\u015f Yerinde Teslim</option>'
    + '</select></div>'
    + '</div>'
    + '<div style="font-size:9px;font-weight:600;color:var(--t3);letter-spacing:.08em;padding-bottom:4px;border-bottom:0.5px solid var(--b);margin-top:6px;display:flex;align-items:center;justify-content:space-between">ÜRÜNLER<button onclick="event.stopPropagation();window._saV2UrunSatirEkle()" style="font-size:9px;padding:3px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">+ Ürün Ekle</button></div>'
    + '<div id="sav2f-urunler-container"></div>'
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
    + '<div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:6px;margin-top:10px">TESLİMAT KOŞULLARI <span style="font-size:8px;color:var(--t3)">(PI\'ye gider)</span></div>'
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
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">'
    + '<div style="font-size:9px;color:var(--t3)">* Duay kodu girilince katalogdan otomatik dolar</div>'
    + '<div style="display:flex;gap:8px">'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sav2-form-modal\')?.remove()" style="font-size:12px;padding:7px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>'
    + '<button onclick="event.stopPropagation();window._saV2FormKaydet()" style="font-size:12px;padding:7px 20px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>'
    + '</div></div>'
    + '</div>';
  document.body.appendChild(modal);
  window._saV2FormGorselData = null;
  window._saV2UrunSayac = 0;
  window._saV2UrunSatirEkle();
  window._saV2DatalistDoldur?.();
  setTimeout(function() { document.getElementById('sav2f-duayKodu')?.focus(); }, 100);
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
  var val = inp.value.trim().toLowerCase();
  var mevcut = document.getElementById('sa-urun-dropdown');
  if (mevcut) mevcut.remove();
  if (val.length < 2) return;
  var tumListe = (typeof window.loadUrunler === 'function' ? window.loadUrunler() : []).concat(typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : []).filter(function(u) { return !u.isDeleted; });
  var eslesen = tumListe.filter(function(u) {
    return (u.duayKodu || '').toLowerCase().includes(val)
      || (u.urunAdi || '').toLowerCase().includes(val)
      || (u.ingAd || u.standartAdi || '').toLowerCase().includes(val)
      || (u.tedarikci || '').toLowerCase().includes(val)
      || (u.marka || '').toLowerCase().includes(val)
      || (u.saticiKodu || '').toLowerCase().includes(val);
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
      var kodInp = document.getElementById(hedefId || 'sav2f-duayKodu');
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
  var urunler = typeof window.loadUrunler==='function' ? window.loadUrunler() : [];
  var ihrUrunler = typeof window.loadIhracatUrunler==='function' ? window.loadIhracatUrunler() : [];
  var tumUrunler = urunler.concat(ihrUrunler);
  var u = tumUrunler.find(function(x){ return (x.duayKodu||'').toLowerCase()===kod.toLowerCase(); });
  var bilgiEl = document.getElementById('sav2f-katalog-bilgi');
  if (!u) { if(bilgiEl) bilgiEl.innerHTML='<span style="color:#A32D2D">Katalogda bulunamadı</span>'; return; }
  if (bilgiEl) bilgiEl.innerHTML='<span style="color:#0F6E56">✓ '+_saEsc(u.duayAdi||u.urunAdi||'')+'</span>';
  var alanlar = {urunAdi:u.standartAdi||u.urunAdi||u.ingAd,turkceAdi:u.duayAdi||u.urunAdi,marka:u.marka,gtip:u.gtip||u.hscKodu,saticiKodu:u.saticiKodu||u.urunKodu,netAg:u.netAgirlik,brutAg:u.brutAgirlik,tedarikci:u.tedarikci,alisF:u.alisF||u.sonFiyat||u.sonAlisFiyati};
  Object.keys(alanlar).forEach(function(k){ var el=document.getElementById('sav2f-'+k); if(el&&alanlar[k]) el.value=alanlar[k]; });
  var birimEl=document.getElementById('sav2f-birim'); if(birimEl&&u.birim){ Array.from(birimEl.options).forEach(function(o){if(o.value===u.birim)o.selected=true;}); }
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
      mensei: gu('mensei'), gtip: gu('gtip'), saticiKodu: gu('saticiKodu'),
      netAg: parseFloat(gu('netAg')) || 0, brutAg: parseFloat(gu('brutAg')) || 0
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
    teslimYeri: baslik.teslimYeri, teslimMasraf: baslik.teslimMasraf, teslimat: baslik.teslimat,
    teklifId: baslik.teklifId || '',
    urunler: urunler, urunSayisi: urunler.length,
    toplamTutar: toplamTutar.toFixed(2), toplamPara: urunler[0]?.para || 'USD',
    icNotlar: notDiv ? notDiv.innerHTML : '', teslimatKosul: kosulDiv ? kosulDiv.innerHTML : '',
    gorsel: window._saV2FormGorselData || '', durum: 'bekleyen',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: window.CU?.()?.displayName || '', createdById: window.CU?.()?.uid || ''
  };
  var liste = typeof window._saV2Load === 'function' ? window._saV2Load() : [];
  liste.unshift(kayit);
  if (typeof window._saV2Store === 'function') window._saV2Store(liste);
  document.getElementById('sav2-form-modal')?.remove();
  window.toast?.('Teklif kaydedildi \u2014 ' + urunler.length + ' \u00fcr\u00fcn', 'ok');
  window.renderSatinAlmaV2?.();
};

/* ── Onay Akışı ─────────────────────────────────────────────── */
window._saV2YoneticiOnayla = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  t.durum = 'onaylandi';
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
  var t = liste.find(function(x) { return x.id === id; });
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
      var urunler = window.loadUrunler();
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

window._saV2SatisUrunEkle = function(t) {
  var kur = (window._saKur||{})[t.para]||44.55;
  var alisF = parseFloat(t.alisF)||0;
  var alisTl = parseFloat((alisF*kur).toFixed(2));
  window._saV2SatisUrunler.push({ id:t.id, duayKodu:t.duayKodu||'', urunAdi:t.urunAdi||'', gorsel:t.gorsel||'', alisTl:alisTl, miktar:1, marj:33 });
  window._saV2SatisTabloyuGuncelle();
};

window._saV2SatisTabloyuGuncelle = function() {
  var tbody = document.getElementById('st-urun-tbody');
  if (!tbody) return;
  var html = '';
  window._saV2SatisUrunler.forEach(function(u, i) {
    var satisFiyat = (u.alisTl*(1+u.marj/100)).toFixed(2);
    var toplam = (satisFiyat*u.miktar).toFixed(2);
    html += '<tr>';
    html += '<td style="padding:8px">'+(u.gorsel?'<img src="'+u.gorsel+'" style="width:30px;height:30px;border-radius:4px;object-fit:cover">':'<div style="width:30px;height:30px;border-radius:4px;background:var(--s2);border:0.5px solid var(--b)"></div>')+'</td>';
    html += '<td style="padding:8px;font-size:9px;color:#0C447C;font-weight:500">'+_saEsc(u.duayKodu)+'</td>';
    html += '<td style="padding:8px;font-size:11px;font-weight:500">'+_saEsc(u.urunAdi)+'</td>';
    html += '<td style="padding:8px"><input type="number" value="'+u.miktar+'" min="1" style="width:55px;font-size:11px;padding:4px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit" onchange="event.stopPropagation();window._saV2SatisUrunler['+i+'].miktar=parseFloat(this.value)||1;window._saV2SatisOzetGuncelle()"></td>';
    html += '<td style="padding:8px;font-size:11px;color:var(--t2)">₺'+u.alisTl.toFixed(2)+'</td>';
    html += '<td style="padding:8px"><input type="number" value="'+u.marj+'" min="1" max="90" style="width:55px;font-size:11px;padding:4px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit" onchange="event.stopPropagation();window._saV2SatisUrunler['+i+'].marj=parseFloat(this.value)||33;window._saV2SatisOzetGuncelle()"></td>';
    html += '<td style="padding:8px;font-size:11px;font-weight:500;color:#0F6E56">₺'+satisFiyat+'</td>';
    html += '<td style="padding:8px;font-size:11px;font-weight:500">₺'+toplam+'</td>';
    html += '<td style="padding:8px"><button onclick="event.stopPropagation();window._saV2SatisUrunler.splice('+i+',1);window._saV2SatisTabloyuGuncelle();window._saV2SatisOzetGuncelle()" style="font-size:10px;padding:2px 6px;border:0.5px solid var(--b);border-radius:3px;background:transparent;cursor:pointer;color:#A32D2D">Kaldır</button></td>';
    html += '</tr>';
  });
  tbody.innerHTML = html;
  window._saV2SatisOzetGuncelle();
};

window._saV2SatisOzetGuncelle = function() {
  var toplamSatis = 0; var toplamAlis = 0; var toplamMiktar = 0;
  window._saV2SatisUrunler.forEach(function(u) {
    var satisFiyat = u.alisTl*(1+u.marj/100);
    toplamSatis += satisFiyat*u.miktar;
    toplamAlis  += u.alisTl*u.miktar;
    toplamMiktar += u.miktar;
  });
  var toplamKar = toplamSatis - toplamAlis;
  var ortMarj = toplamAlis>0 ? ((toplamKar/toplamAlis)*100).toFixed(1) : 0;
  var eurKur = (window._saKur||{}).EUR || 51.70;
  var usdKur = (window._saKur||{}).USD || 44.55;
  var toplamEUR = (toplamSatis / eurKur * usdKur).toFixed(2);
  var el1 = document.getElementById('st-ozet-toplam-satis'); if(el1) el1.textContent = '₺'+toplamSatis.toFixed(2);
  var el2 = document.getElementById('st-ozet-toplam-kar'); if(el2) el2.textContent = '₺'+toplamKar.toFixed(2);
  var el3 = document.getElementById('st-ozet-ort-marj'); if(el3) el3.textContent = '%'+ortMarj;
  var el4 = document.getElementById('st-ozet-urun-say'); if(el4) el4.textContent = window._saV2SatisUrunler.length+' ürün · '+toplamMiktar+' adet';
  var el5 = document.getElementById('st-ozet-eur'); if(el5) el5.textContent = '€'+toplamEUR;
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
  var katalog = typeof window.loadUrunler==='function' ? window.loadUrunler() : [];
  var ihrUrunler = typeof window.loadIhracatUrunler==='function' ? window.loadIhracatUrunler() : [];
  var tumKatalog = katalog.concat(ihrUrunler).filter(function(u){return !u.isDeleted;});
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
    var payload = JSON.stringify({duayKodu:t.duayKodu,urunAdi:t.urunAdi,alisF:t.alisF,para:t.para||'USD',miktar:1,birim:t.birim,gorsel:t.gorsel||''}).replace(/"/g,'&quot;');
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

/* ── Çoklu ürün satırı ekleme ──────────────────────────────── */
window._saV2UrunSayac = 0;
window._saV2UrunSatirEkle = function() {
  var con = document.getElementById('sav2f-urunler-container');
  if (!con) return;
  var idx = window._saV2UrunSayac++;
  var pre = 'sav2u-' + idx + '-';
  var _uf = function(id, lbl, ph, tip) {
    return '<div><div style="font-size:7px;font-weight:500;color:var(--t3);letter-spacing:.05em;margin-bottom:3px">' + lbl + '</div>'
      + '<input id="' + pre + id + '" type="' + (tip || 'text') + '" placeholder="' + (ph || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  };
  var satir = document.createElement('div');
  satir.className = 'sav2f-urun-satir';
  satir.setAttribute('data-urun-satir', String(idx));
  satir.style.cssText = 'border:0.5px solid var(--b);border-radius:8px;padding:10px 12px;background:var(--s2);display:flex;flex-direction:column;gap:8px;margin-bottom:8px';
  satir.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between">'
    + '<span style="font-size:9px;font-weight:500;color:var(--t2)">Ürün ' + (idx + 1) + '</span>'
    + '<button onclick="event.stopPropagation();this.closest(\'.sav2f-urun-satir\').remove()" style="font-size:12px;border:none;background:none;cursor:pointer;color:#A32D2D;line-height:1">\u00d7</button>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div><div style="font-size:7px;font-weight:500;color:var(--t3);letter-spacing:.05em;margin-bottom:3px">DUAY KODU</div>'
    + '<div style="display:flex;gap:4px">'
    + '<input id="' + pre + 'duayKodu" placeholder="11\u00b7XXXX\u00b7XXX" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._saV2UrunKatalogDoldur?.(\'' + pre + '\',this.value)" style="flex:1;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--sf);color:var(--t);font-family:inherit">'
    + '<button onclick="event.stopPropagation();window._saV2KatalogAra?.()" style="font-size:9px;padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;background:#E6F1FB;color:#0C447C;cursor:pointer;font-family:inherit">Katalog</button>'
    + '</div>'
    + '<div id="' + pre + 'katalog-bilgi" style="font-size:8px;color:var(--t3);margin-top:2px"></div>'
    + '</div>'
    + '<div><div style="font-size:7px;font-weight:500;color:var(--t3);letter-spacing:.05em;margin-bottom:3px">\u00dcR\u00dcN ADI (\u0130ngilizce)</div>'
    + '<input id="' + pre + 'urunAdi" placeholder="Standart ad" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._saV2UrunAdAra?.(\'' + pre + '\',this.value)" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">'
    + '<div id="' + pre + 'urunAdi-dropdown" style="display:none;position:absolute;z-index:10000;background:var(--sf);border:0.5px solid var(--b);border-radius:5px;max-height:120px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.12);width:280px"></div></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
    + _uf('turkceAdi', 'T\u00dcRK\u00c7E ADI', 'T\u00fcrk\u00e7e')
    + _uf('marka', 'MARKA', 'Marka')
    + _uf('saticiKodu', 'SATICI KODU', 'MTL-0412')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">'
    + _uf('miktar', 'M\u0130KTAR', '200')
    + '<div><div style="font-size:7px;font-weight:500;color:var(--t3);letter-spacing:.05em;margin-bottom:3px">B\u0130R\u0130M</div>'
    + '<select id="' + pre + 'birim" onclick="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option>Adet</option><option>Kg</option><option>Ton</option><option>m\u00b2</option><option>Lt</option><option>Koli</option></select></div>'
    + _uf('alisF', 'B\u0130R\u0130M F\u0130YAT', '2.40')
    + '<div><div style="font-size:7px;font-weight:500;color:var(--t3);letter-spacing:.05em;margin-bottom:3px">PARA</div>'
    + '<select id="' + pre + 'para" onclick="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="GBP">GBP</option></select></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">'
    + '<div><div style="font-size:7px;font-weight:500;color:var(--t3);letter-spacing:.05em;margin-bottom:3px">MEN\u015eE\u0130</div>'
    + '<select id="' + pre + 'mensei" onclick="event.stopPropagation()" style="width:100%;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Se\u00e7...</option>' + (window.MENSEI || ['T\u00fcrkiye','\u00c7in','Almanya','\u0130talya','Japonya','Hindistan','ABD','Di\u011fer']).map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') + '</select></div>'
    + _uf('gtip', 'GT\u0130P', '8482.10.10')
    + _uf('netAg', 'NET A\u011e. (kg)', '', 'number')
    + _uf('brutAg', 'BR\u00dcT A\u011e. (kg)', '', 'number')
    + '</div>';
  con.appendChild(satir);
};

/** Ürün satırından katalog otomatik doldurma */
window._saV2UrunKatalogDoldur = function(pre, kod) {
  if (!kod || kod.length < 3) return;
  var urunler = typeof window.loadUrunler === 'function' ? window.loadUrunler() : [];
  var ihrUrunler = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  var tumUrunler = urunler.concat(ihrUrunler);
  var u = tumUrunler.find(function(x) { return (x.duayKodu || '').toLowerCase() === kod.toLowerCase(); });
  var bilgiEl = document.getElementById(pre + 'katalog-bilgi');
  if (!u) { if (bilgiEl) bilgiEl.innerHTML = '<span style="color:#A32D2D">Katalogda bulunamad\u0131</span>'; return; }
  if (bilgiEl) bilgiEl.innerHTML = '<span style="color:#0F6E56">\u2713 ' + _saEsc(u.duayAdi || u.urunAdi || '') + '</span>';
  var alanlar = { urunAdi: u.standartAdi || u.urunAdi || u.ingAd, turkceAdi: u.duayAdi || u.urunAdi, marka: u.marka, gtip: u.gtip || u.hscKodu, saticiKodu: u.saticiKodu || u.urunKodu, netAg: u.netAgirlik, brutAg: u.brutAgirlik, alisF: u.alisF || u.sonFiyat || u.sonAlisFiyati };
  Object.keys(alanlar).forEach(function(k) { var el = document.getElementById(pre + k); if (el && alanlar[k]) el.value = alanlar[k]; });
  var birimEl = document.getElementById(pre + 'birim'); if (birimEl && u.birim) { Array.from(birimEl.options).forEach(function(o) { if (o.value === u.birim) o.selected = true; }); }
  var menEl = document.getElementById(pre + 'mensei'); if (menEl && u.mensei) { Array.from(menEl.options).forEach(function(o) { if (o.value === u.mensei || o.textContent === u.mensei) o.selected = true; }); }
  var paraEl = document.getElementById(pre + 'para'); if (paraEl && u.para) { Array.from(paraEl.options).forEach(function(o) { if (o.value === (u.para || u.paraBirimi)) o.selected = true; }); }
};

/** Ürün adına göre arama dropdown */
window._saV2UrunAdAra = function(pre, deger) {
  var dd = document.getElementById(pre + 'urunAdi-dropdown');
  if (!dd || !deger || deger.length < 2) { if (dd) dd.style.display = 'none'; return; }
  var q = deger.toLowerCase();
  var urunler = typeof window.loadUrunler === 'function' ? window.loadUrunler() : [];
  var ihrUrunler = typeof window.loadIhracatUrunler === 'function' ? window.loadIhracatUrunler() : [];
  var tum = urunler.concat(ihrUrunler);
  var sonuc = tum.filter(function(u) {
    return (u.urunAdi || '').toLowerCase().includes(q) || (u.standartAdi || '').toLowerCase().includes(q) || (u.duayAdi || '').toLowerCase().includes(q) || (u.duayKodu || '').toLowerCase().includes(q);
  }).slice(0, 8);
  if (!sonuc.length) { dd.style.display = 'none'; return; }
  dd.style.display = 'block';
  dd.innerHTML = sonuc.map(function(u) {
    return '<div onclick="event.stopPropagation();window._saV2UrunSecimDoldur?.(\'' + pre + '\',\'' + _saEsc(u.duayKodu || '') + '\')" style="padding:6px 10px;font-size:10px;cursor:pointer;border-bottom:0.5px solid var(--b);color:var(--t)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'var(--sf)\'">'
      + '<span style="font-weight:500;color:#0C447C">' + _saEsc(u.duayKodu || '') + '</span> ' + _saEsc(u.urunAdi || u.standartAdi || '') + ' <span style="color:var(--t3);font-size:9px">' + _saEsc(u.tedarikci || '') + '</span></div>';
  }).join('');
};

window._saV2UrunSecimDoldur = function(pre, duayKodu) {
  var dd = document.getElementById(pre + 'urunAdi-dropdown');
  if (dd) dd.style.display = 'none';
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
  /* Job ID: PP görevler + mevcut teklifler */
  var jobSet = {};
  liste.forEach(function(t) { if (t.jobId) jobSet[t.jobId] = true; });
  var gorevler = typeof window.loadTasks === 'function' ? window.loadTasks() : [];
  gorevler.forEach(function(g) { if (g.jobId) jobSet[g.jobId] = true; if (g.id && !g.isDeleted && g.status !== 'done') jobSet[g.id.slice(-4)] = true; });
  var jobDl = document.getElementById('sav2f-job-list');
  if (jobDl) jobDl.innerHTML = Object.keys(jobSet).sort().map(function(k) { return '<option value="' + _saEsc(k) + '">'; }).join('');
};

