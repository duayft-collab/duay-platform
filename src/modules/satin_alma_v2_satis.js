var _saEsc=window._saEsc, _saNow=window._saNow, _saToday=window._saToday, _saId=window._saId, _saCu=window._saCu;
/* ── Placeholder fonksiyonlar ───────────────────────────────── */
window._saV2TeklifOlustur = function(id) {
  if (!id) {
    var bos = { id: typeof window.generateId === 'function' ? window.generateId() : ('tmp-' + Date.now()), urunler: [], tedarikci: '', jobId: '', teslimYeri: '', teslimMasraf: '', toplamTutar: 0, toplamPara: 'USD', durum: 'taslak' };
    id = bos.id;
    var _eskiLoad = window._saV2Load;
    window._saV2Load = function() { return [bos].concat(typeof _eskiLoad === 'function' ? _eskiLoad() : []); };
    setTimeout(function() { window._saV2Load = _eskiLoad; }, 5000);
  }
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return String(x.id) === String(id); });
  if (!t) { window.toast?.('Teklif bulunamad\u0131', 'warn'); return; }
  var mevcut = document.getElementById('sav2-satis-modal'); if(mevcut) mevcut.remove();
  var modal = document.createElement('div');
  modal.id = 'sav2-satis-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
  var _u0 = (t.urunler && t.urunler.length) ? t.urunler[0] : t;
  var _para = t.toplamPara || _u0.para || t.para || 'USD';
  var kur = (window._saKur||{})[_para]||44.55;
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
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:min(1680px,95vw);max-height:92vh;display:flex;flex-direction:column">';

  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:0.5px solid var(--b);flex-shrink:0">';
  ic += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Satış Teklifi Oluştur</div>';
  ic += '<div style="font-size:9px;color:var(--t3);margin-top:2px">'+_saEsc(_urunAdi)+(t.urunler&&t.urunler.length>1?' · '+t.urunler.length+' ürün':'')+'</div></div>';
  ic += '<div style="display:flex;align-items:center;gap:6px">';
  ['A','I','L','O'].forEach(function(d){
    var ak=(window._saV2AktifPITasarim||'A')===d;
    ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\''+d+'\';window._saV2PIOnizlemeGuncelle()" class="pi-tas-btn" style="font-size:9px;padding:2px 10px;border:0.5px solid var(--b);border-radius:4px;background:'+(ak?'var(--t)':'transparent')+';color:'+(ak?'var(--sf)':'var(--t2)')+';cursor:pointer;font-family:inherit">'+d+'</button>';
  });
  ic += '<div style="width:0.5px;height:16px;background:var(--b)"></div>';
  ['EN','AR'].forEach(function(d){
    var ak=(window._saV2AktifPIDil||'EN')===d;
    ic += '<button onclick="event.stopPropagation();window._saV2AktifPIDil=\''+d+'\';window._saV2PIOnizlemeGuncelle()" class="pi-dil-btn" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:'+(ak?'var(--bm)':'transparent')+';cursor:pointer;font-family:inherit">'+d+'</button>';
  });
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1;margin-left:4px">×</button>';
  ic += '</div></div>';

  ic += '<div style="display:flex;flex:1;min-height:0;overflow:hidden">';

  ic += '<div style="flex:1;min-width:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;border-right:0.5px solid var(--b)">';
  // MUSTERI-ONCEKI-SATIS-002: önceki teklif uyarı banner placeholder
  ic += '<div id="sav2-prev-warn" style="display:none"></div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ <span style="color:#A32D2D">*</span></div>';
  ic += '<select id="st-musteri-sec" onchange="event.stopPropagation();var sel=this.options[this.selectedIndex];document.getElementById(\'st-musteri-ad\').value=sel.text;document.getElementById(\'st-musteri-kod\').value=sel.dataset.kod||\'0000\';var k=sel.dataset.kod||\'0000\';var sid=(window._saV2AktifDuzenlemeTeklif&&window._saV2AktifDuzenlemeTeklif.teklifId)?window._saV2AktifDuzenlemeTeklif.teklifId:(window._saTeklifId?.(k)||(k+\'-\'+Date.now()));document.getElementById(\'st-id-goster\').textContent=sid;document.getElementById(\'st-id\').value=sid;window._saV2PIOnizlemeGuncelle();window._saV2CheckPrevTeklif?.()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Müşteri seçin...</option>';
  musteriList.forEach(function(c){ic += '<option value="'+_saEsc(c.id||'')+'" data-kod="'+_saEsc(c.kod||(c.id?String(c.id).slice(-4):'0000'))+'" '+(window._crmSatisMusteriData&&(window._crmSatisMusteriData.name===c.name||window._crmSatisMusteriData.ad===c.ad)?'selected':'')+'>'+_saEsc(c.ad||c.name||'')+'</option>';});
  ic += '</select></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">PROFORMA NO</div>';
  ic += '<div id="st-id-goster" style="font-size:10px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t3);font-family:monospace">'+satisId+'</div>';
  ic += '<input id="st-id" type="hidden" value="'+satisId+'"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">GEÇERLİLİK <span style="color:#A32D2D">*</span></div>';
  ic += '<input type="date" id="st-gecerlilik" onchange="event.stopPropagation();window._saV2PIOnizlemeGuncelle()" onclick="event.stopPropagation()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TESLİM KOŞULU <span style="color:#A32D2D">*</span></div>';
  ic += '<select id="st-incoterm" onchange="event.stopPropagation();window._saV2PIOnizlemeGuncelle()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].forEach(function(inc){ic += '<option value="'+inc+'" '+(inc==='EXW'?'selected':'')+'>'+inc+'</option>';});
  ic += '</select></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">LİMAN / YER</div>';
  ic += '<input id="st-liman" value="Turkey" oninput="event.stopPropagation();window._saV2PIOnizlemeGuncelle()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">PARA BİRİMİ</div>';
  ic += '<select id="st-para-birimi" onchange="event.stopPropagation();window._saV2SatisTabloyuGuncelle?.();window._saV2PIOnizlemeGuncelle();window._saV2BankaGuncelle(this.value)" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option>USD</option><option>EUR</option><option>GBP</option><option>TRY</option><option>CNY</option></select></div>';
  ic += '</div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">ÖDEME KOŞULU</div>';
  ic += '<select id="st-odeme" onchange="event.stopPropagation();window._saV2PIOnizlemeGuncelle()" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  ['30% Advance, 70% L/C at sight','50% Advance, 50% L/C at sight','100% Advance before shipment','L/C at sight','T/T 30 days after B/L','T/T 60 days after B/L','D/P at sight','Open Account 30 days'].forEach(function(o){ic += '<option>'+o+'</option>';});
  ic += '</select></div>';
  /* T03-8 v2: sol banka div hidden — sağ PI altında yeni görünür div var */
  ic += '<div id="st-banka-bilgi" style="display:none;font-size:9px;padding:6px 10px;background:#E6F1FB;border-radius:5px;border:0.5px solid #B5D4F4;color:#0C447C">USD IBAN: TR12 0001 2003 4500 0123 4567 89 · Garanti Bankası</div>';
  ic += '<div id="st-kur-bilgi" style="font-size:9px;color:var(--t3);padding:4px 10px;background:var(--s2);border-radius:4px;margin-top:4px">';
  ic += '1 USD = '+(window._saKur?.USD||44.55).toFixed(2)+' TL &nbsp;\u00b7&nbsp; ';
  ic += '1 EUR = '+(window._saKur?.EUR||51.70).toFixed(2)+' TL &nbsp;\u00b7&nbsp; ';
  ic += '1 GBP = '+(window._saKur?.GBP||59.30).toFixed(2)+' TL';
  ic += '</div>';

  /* SATIS-JOBID-001: Job ID seçimi + tedarikçi karşılaştırma */
  ic += '<div style="display:flex;align-items:end;gap:8px;padding:8px 10px;background:#FFFCF5;border:0.5px solid #F4E4BC;border-radius:5px;margin-top:6px">';
  ic += '<div style="flex:1"><div style="font-size:8px;font-weight:500;color:#854F0B;letter-spacing:.06em;margin-bottom:3px">JOB ID SEÇ (Tedarik Kaynağı)</div>';
  /* JOB-ID-KAYNAK-FIX-001: select → aranabilir input (alış formuyla tutarlı) */
  ic += '<input id="st-job-id" placeholder="Job ara... (örn: 0041)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="event.stopPropagation();window._stJobIdAra?.(this)" style="width:100%;font-size:11px;padding:6px 8px;border:0.5px solid #F4E4BC;border-radius:4px;background:#fff;color:var(--t);font-family:inherit">';
  ic += '<datalist id="st-job-list"></datalist>';
  ic += '</div>';
  ic += '<button onclick="event.stopPropagation();window._saV2JobUrunSecModal(document.getElementById(\'st-job-id\').value)" style="font-size:10px;padding:7px 12px;border:none;border-radius:5px;background:#854F0B;color:#fff;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap">+ Tedarikçi Karşılaştır</button>';
  ic += '</div>';

  ic += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--s2);border-radius:6px;margin:6px 0">';
  ic += '<span style="font-size:10px;color:var(--t3)">Toplu Marj:</span>';
  ic += '<input type="number" id="sav2-toplu-marj" min="0" max="500" step="0.5" placeholder="%" onclick="event.stopPropagation()" oninput="event.stopPropagation()" style="width:70px;font-size:10px;padding:4px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t);font-family:inherit">';
  ic += '<button onclick="event.stopPropagation();window._saV2TopluMarjUygula()" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t);font-family:inherit">T\u00fcm\u00fcne Uygula</button>';
  ic += '<span style="font-size:9px;color:var(--t3)">\u2014 sonra tek tek de\u011fi\u015ftirilebilir</span></div>';
  ic += '<div style="border:0.5px solid var(--b);border-radius:6px;overflow:hidden;margin-top:6px">';
  /* SATIS-URUN-TABLO-001: table-layout:fixed + colgroup ile kolon genişlikleri sabit */
  ic += '<table style="width:100%;border-collapse:collapse;table-layout:fixed">';
  /* SATIS-FORM-PARITE-001: 10 kolon — +BİRİM +MENŞEİ eklendi (satış/alış form parité) */
  ic += '<colgroup>'
    + '<col style="width:4%">'    /* görsel */
    + '<col style="width:26%">'   /* KOD / ÜRÜN ADI */
    + '<col style="width:8%">'    /* MİKTAR */
    + '<col style="width:12%">'   /* ALIŞ */
    + '<col style="width:9%">'    /* MARJ % */
    + '<col style="width:12%">'   /* SATIŞ */
    + '<col style="width:9%">'    /* TOPLAM */
    + '<col style="width:8%">'    /* BİRİM */
    + '<col style="width:8%">'    /* MENŞEİ */
    + '<col style="width:4%">'    /* Kaldır */
    + '</colgroup>';
  ic += '<thead><tr style="background:var(--s2);font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.04em">';
  ic += '<th style="padding:7px 10px"></th><th style="padding:7px 10px;text-align:left">KOD / ÜRÜN ADI</th><th style="padding:7px 10px">MİKTAR</th><th style="padding:7px 10px">ALIŞ</th><th style="padding:7px 10px">MARJ %</th><th style="padding:7px 10px">SATIŞ</th><th style="padding:7px 10px">TOPLAM</th><th style="padding:7px 10px">BİRİM</th><th style="padding:7px 10px">MENŞEİ</th><th style="padding:7px 10px"></th></tr></thead>';
  ic += '<tbody id="st-urun-tbody"></tbody></table>';
  ic += '<div style="padding:6px 8px;border-top:0.5px solid var(--b)"><button onclick="event.stopPropagation();window._saV2UrunSecModal()" style="font-size:10px;padding:3px 10px;border:0.5px dashed var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);font-family:inherit">+ Ürün Ekle</button></div>';
  ic += '</div>';

  ic += '<div style="background:var(--s2);border-radius:6px;padding:10px 12px;border:0.5px solid var(--b)">';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:var(--t3)">Toplam Satış</span><span style="font-size:14px;font-weight:500;color:#0F6E56" id="st-ozet-toplam-satis">0 USD</span></div>';
  ic += '<div style="display:flex;justify-content:space-between"><span style="font-size:9px;color:var(--t3)">Toplam Kâr</span><span style="font-size:11px;font-weight:500;color:#185FA5" id="st-ozet-toplam-kar">0 USD</span></div>';
  ic += '</div>';
  ic += '<input type="hidden" id="st-musteri-ad" value=""><input type="hidden" id="st-musteri-kod" value="0000">';
  ic += '<input type="hidden" id="st-urun-adi-hidden" value="'+_saEsc(_urunAdi)+'"><input type="hidden" id="st-duay-kodu-hidden" value="'+_saEsc(_duayKodu)+'"><input type="hidden" id="st-alis-tl-hidden" value="'+alisTl+'">';
  ic += '<input type="hidden" id="st-teslim" value="">';
  ic += '</div>';

  ic += '<div style="width:380px;flex-shrink:0;background:var(--s2);overflow-y:auto;padding:12px" id="st-pi-onizleme-panel">';
  ic += '<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:8px">CANLI PI ÖNİZLEME</div>';
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

  ic += '<div style="border:0.5px solid var(--b);border-radius:6px;overflow:hidden;margin:0 16px 8px">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  ic += '<div style="font-size:9px;font-weight:500;color:var(--t2)">TEKL\u0130F \u015eARTLARI <span style="font-size:8px;color:var(--t3)">(max 10)</span></div>';
  ic += '<button onclick="event.stopPropagation();window._saV2SartEkle()" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">+ Ekle</button></div>';
  ic += '<div id="st-sartlar-liste" style="padding:6px 10px;max-height:140px;overflow-y:auto"></div>';
  ic += '<div style="padding:6px 10px;border-top:0.5px solid var(--b);display:flex;gap:6px">';
  ic += '<select id="st-sart-sec" onclick="event.stopPropagation()" style="flex:1;font-size:10px;padding:4px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Haz\u0131r \u015fart se\u00e7in...</option>';
  (window._saV2Sartlar?.() || []).forEach(function(s) { ic += '<option value="' + _saEsc(s) + '">' + _saEsc(s.length > 60 ? s.slice(0, 57) + '...' : s) + '</option>'; });
  ic += '</select><button onclick="event.stopPropagation();window._saV2SartComboEkle()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Se\u00e7</button></div>';
  ic += '<div style="padding:4px 10px 8px;display:flex;gap:6px"><input id="st-sart-manuel" placeholder="Manuel \u015fart yaz..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="flex:1;font-size:10px;padding:4px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit">';
  ic += '<button onclick="event.stopPropagation();window._saV2SartManuelEkle()" style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Ekle</button></div></div>';

  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:0.5px solid var(--b);flex-shrink:0;background:var(--sf)">';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove()" style="font-size:11px;padding:7px 16px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">\u0130ptal</button>';
  ic += '<div style="display:flex;gap:6px">';
  ic += '<button onclick="event.stopPropagation();window._saV2TamOnIzle()" style="font-size:11px;padding:7px 14px;border:0.5px solid #185FA5;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#185FA5;font-weight:500">\u{1F441} Tam \u00d6n \u0130zle</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisKaydet(\''+t.id+'\')" style="font-size:11px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Taslak Kaydet</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisKaydetVeGit(\''+t.id+'\')" style="font-size:11px;padding:7px 20px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-weight:500;font-family:inherit">Teklifi Oluştur →</button>';
  ic += '</div></div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
  window._saV2AktifPITasarim = window._saV2AktifPITasarim || 'A';
  window._saV2AktifPIDil = window._saV2AktifPIDil || 'EN';
  window._saV2SatisUrunler = [];
  window._saV2SatisUrunEkle(t);
  window._stSartlar = (window._saV2Sartlar?.() || []).slice(0, 5);
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
    warn.style.display = 'none'; warn.innerHTML = ''; return;
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
  if (!prev.length) { warn.style.display = 'none'; warn.innerHTML = ''; return; }
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
  var kayit = {
    id:window._saId?.(),
    teklifId:teklifId,
    revNo: _yeniRevNo,
    alisId:alisId,
    musteriAd:musteriAd,
    musteriKod:document.getElementById('st-musteri-kod')?.value||'',
    urunler:urunler,
    toplamSatis:toplamSatis.toFixed(2),
    toplamEUR: (parseFloat(toplamSatis) / ((window._saKur||{}).EUR||51.70) * ((window._saKur||{}).USD||44.55)).toFixed(2),
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
    genelToplam: parseFloat(toplamSatis),
    paraBirimi: 'TRY',
    createdBy: (window.Auth && window.Auth.getCU && window.Auth.getCU()?.name) || (window.CU && window.CU()?.name) || '',
    jobId: document.getElementById('st-job-id')?.value || ''
  };
  var teklifler = typeof window.loadSatisTeklifleri === 'function' ? window.loadSatisTeklifleri() : [];
  teklifler.unshift(kayit);
  if (typeof window.storeSatisTeklifleri === 'function') window.storeSatisTeklifleri(teklifler);
  document.getElementById('sav2-satis-modal')?.remove();
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
    dil: window._saV2AktifPIDil || 'EN'
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
    console.log('[SA-V2] Takip görevi oluşturuldu:', gorev.baslik);
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
  // BANKA-IBAN-FIX-001: gerçek IBAN'larla güncellendi (Garanti + Albaraka)
  var bankalar = {
    'USD': 'T. GARANTİ BANKASI A.Ş. · USD IBAN: TR39 0006 2001 1810 0009 0812 68 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'EUR': 'T. GARANTİ BANKASI A.Ş. · EUR IBAN: TR66 0006 2001 1810 0009 0812 67 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'TRY': 'T. GARANTİ BANKASI A.Ş. · TL IBAN: TR24 0006 2001 1810 0006 2960 86 · YEŞİLPINAR ŞUBESİ / 1181 | ALBARAKA TÜRK · TL IBAN: TR54 0020 3000 0889 5310 0000 05 · ALİBEYKÖY / 117',
    'GBP': 'T. GARANTİ BANKASI A.Ş. · USD IBAN: TR39 0006 2001 1810 0009 0812 68 · SWIFT: TGBATRIS'
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
    h += '<div style="text-align:right;font-size:10px;font-weight:500;color:#0F6E56;border-top:0.5px solid var(--b);padding-top:4px">TOTAL: '+toplamSatis.toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+para+'</div>';
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
  // BANKA-IBAN-FIX-001: gerçek IBAN'larla güncellendi (Garanti + Albaraka)
  var varsayilan = {
    'USD': 'T. GARANTİ BANKASI A.Ş. · USD IBAN: TR39 0006 2001 1810 0009 0812 68 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'EUR': 'T. GARANTİ BANKASI A.Ş. · EUR IBAN: TR66 0006 2001 1810 0009 0812 67 · SWIFT: TGBATRIS · YEŞİLPINAR ŞUBESİ / 1181',
    'TRY': 'T. GARANTİ BANKASI A.Ş. · TL IBAN: TR24 0006 2001 1810 0006 2960 86 · YEŞİLPINAR ŞUBESİ / 1181 | ALBARAKA TÜRK · TL IBAN: TR54 0020 3000 0889 5310 0000 05 · ALİBEYKÖY / 117',
    'GBP': 'T. GARANTİ BANKASI A.Ş. · USD IBAN: TR39 0006 2001 1810 0009 0812 68 · SWIFT: TGBATRIS'
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
    dil: window._saV2AktifPIDil || 'EN'
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
