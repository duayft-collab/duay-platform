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
  var musteriKod = '0000';
  var teklifId = window._saTeklifId?.(musteriKod) || (musteriKod + '-' + Date.now());
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
    + '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">DUAY ÜRÜN KODU</div>'
    + '<div style="display:flex;gap:5px">'
    + '<input id="sav2f-duayKodu" placeholder="11·XXXX·XXX" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._saV2KatalogDoldur(this.value);window._saV2UrunAraDropdown?.(this,\'sav2f-duayKodu\')" style="flex:1;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<button onclick="event.stopPropagation();window._saV2KatalogAra()" style="font-size:10px;padding:6px 10px;border:0.5px solid var(--b);border-radius:6px;background:#E6F1FB;color:#0C447C;cursor:pointer;font-family:inherit;white-space:nowrap">Katalog</button>'
    + '</div>'
    + '<div id="sav2f-katalog-bilgi" style="font-size:9px;color:var(--t3);margin-top:3px"></div>'
    + '</div>'
    + _f('urunAdi', 'ÜRÜN ADI (İngilizce)', 'Standart İngilizce ad')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _f('turkceAdi', 'TÜRKÇE ÜRÜN ADI', 'Türkçe ad')
    + _f('marka', 'MARKA', 'Marka')
    + _s('birim', 'BİRİM', '<option>Adet</option><option>Kg</option><option>Ton</option><option>m²</option><option>Lt</option><option>Koli</option>')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _s('mensei', 'MENŞEİ', '<option value="">Seç...</option>'+(window.MENSEI||['Türkiye','Çin','Almanya','İtalya','Japonya','Hindistan','ABD','Diğer']).map(function(m){return '<option value="'+m+'">'+m+'</option>';}).join(''))
    + _f('gtip', 'GTİP KODU', '8482.10.10')
    + _f('saticiKodu', 'SATICI ÜRÜN KODU', 'MTL-0412')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _f('tedarikci', 'TEDARİKÇİ', 'Tedarikçi adı')
    + _f('alisF', 'BİRİM ALIŞ FİYATI', '2.40')
    + _s('para', 'PARA BİRİMİ', '<option value="USD">USD</option><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="GBP">GBP</option>')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + _f('miktar', 'MİKTAR', '200')
    + _f('jobId', 'JOB ID', '0041')
    + _f('teslimat', 'TAHMİNİ TESLİM SÜRESİ (Gün)', '14', 'number')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + _f('teslimYeri','TESLİM YERİ','Örn: İstanbul Depo, FOB Shanghai, CIF Mersin')
    + '<div><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:4px">TESLİMAT MASRAFI <span style="color:#A32D2D">*</span></div>'
    + '<select id="sav2f-teslimMasraf" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
    + '<option value="">Seç...</option>'
    + '<option value="Alıcı">Alıcı Öder</option>'
    + '<option value="Satıcı">Satıcı Öder</option>'
    + '<option value="Paylaşımlı">Paylaşımlı</option>'
    + '<option value="EXW">EXW — Fabrikadan Teslim</option>'
    + '<option value="FOB">FOB — Gemiye Yüklenmiş</option>'
    + '<option value="CIF">CIF — Sigorta ve Navlun Dahil</option>'
    + '<option value="DDP">DDP — Gümrük Dahil Teslim</option>'
    + '<option value="DAP">DAP — Varış Yerinde Teslim</option>'
    + '</select></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + _f('netAg', 'NET AĞIRLIK (kg)', '', 'number')
    + _f('brutAg', 'BRÜT AĞIRLIK (kg)', '', 'number')
    + '</div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">GÖRSEL (maks 5MB)</div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<div id="sav2f-gorsel-oniz" style="width:48px;height:48px;border-radius:6px;background:var(--s2);border:0.5px solid var(--b);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>'
    + '<label style="font-size:10px;padding:6px 12px;border:0.5px solid var(--b);border-radius:6px;cursor:pointer;color:var(--t2);background:var(--s2)">Görsel Seç<input type="file" accept="image/*" style="display:none" onchange="event.stopPropagation();window._saV2FormGorsel(this)"></label>'
    + '<span id="sav2f-gorsel-ad" style="font-size:9px;color:var(--t3)">Seçilmedi</span>'
    + '</div></div>'
    + '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ KODU (Teklif ID için)</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + '<input id="sav2f-musteriKod" placeholder="3230" oninput="event.stopPropagation();var tid=window._saTeklifId?.(this.value)||\'0000-\'+Date.now();document.getElementById(\'sav2f-id-goster\').textContent=\'ID: \'+tid;document.getElementById(\'sav2f-teklifId\').value=tid" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100px;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:monospace">'
    + '<input id="sav2f-teklifId" value="' + teklifId + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="flex:1;font-size:11px;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:#0C447C;font-family:monospace">'
    + '</div></div>'
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
  var _v = function(id) { return document.getElementById('sav2f-' + id)?.value?.trim() || ''; };
  var duayKodu = _v('duayKodu');
  var urunAdi = _v('urunAdi');
  if (!urunAdi) { window.toast?.('Ürün adı zorunlu', 'warn'); return; }
  var yeni = {
    id: window._saId?.() || Date.now() + Math.random().toString(36).slice(2, 8),
    teklifId: _v('teklifId'),
    duayKodu: duayKodu,
    urunAdi: urunAdi,
    turkceAdi: _v('turkceAdi'),
    marka: _v('marka'),
    birim: document.getElementById('sav2f-birim')?.value || 'Adet',
    mensei: document.getElementById('sav2f-mensei')?.value || 'TR',
    gtip: _v('gtip'),
    saticiKodu: _v('saticiKodu'),
    tedarikci: _v('tedarikci'),
    alisF: _v('alisF'),
    para: document.getElementById('sav2f-para')?.value || 'USD',
    miktar: _v('miktar'),
    jobId: _v('jobId'),
    teslimat: _v('teslimat'),
    netAgirlik: _v('netAg'),
    brutAgirlik: _v('brutAg'),
    teslimYeri: _v('teslimYeri'),
    teslimMasraf: document.getElementById('sav2f-teslimMasraf')?.value || '',
    gorsel: window._saV2FormGorselData || '',
    icNotlar: document.getElementById('sav2f-not-div')?.innerHTML || '',
    teslimatKosul: document.getElementById('sav2f-teslimatKosul-div')?.innerHTML || '',
    durum: 'bekleyen',
    karMarji: 33,
    createdAt: window._saNow?.(),
    updatedAt: window._saNow?.(),
    olusturan: window._saCu?.()?.displayName || ''
  };
  var liste = window._saV2Load?.() || [];
  liste.unshift(yeni);
  window._saV2Store?.(liste);
  document.getElementById('sav2-form-modal')?.remove();
  window.toast?.('Teklif kaydedildi', 'ok');
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

