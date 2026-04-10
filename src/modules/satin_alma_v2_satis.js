var _saEsc=window._saEsc, _saNow=window._saNow, _saToday=window._saToday, _saId=window._saId, _saCu=window._saCu;
/* ── Placeholder fonksiyonlar ───────────────────────────────── */
window._saV2TeklifOlustur = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x){return x.id===id;});
  if(!t){ window.toast?.('Teklif bulunamadı','warn'); return; }
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
  var satisId = window._saTeklifId?.(musteriKod)||(musteriKod+'-'+Date.now());
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:700px;max-height:90vh;overflow-y:auto">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b);position:sticky;top:0;background:var(--sf);z-index:1">';
  ic += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Satış Teklifi Oluştur</div>';
  ic += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Alış fiyatından hesaplanır — satış fiyatı teklife işlenir, kataloğa değil</div></div>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1;padding:0 4px">×</button>';
  ic += '</div>';
  ic += '<div style="display:flex;align-items:center;gap:6px;padding:8px 20px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  ic += '<span style="font-size:9px;color:var(--t3);font-weight:500">PI TASARIM:</span>';
  ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\'A\';document.querySelectorAll(\'.pi-tas-btn\').forEach(function(b){b.style.background=\'transparent\';b.style.color=\'var(--t2)\'});this.style.background=\'var(--t)\';this.style.color=\'var(--sf)\'" class="pi-tas-btn" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">A — Corporate</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\'B\';document.querySelectorAll(\'.pi-tas-btn\').forEach(function(b){b.style.background=\'transparent\';b.style.color=\'var(--t2)\'});this.style.background=\'#185FA5\';this.style.color=\'#fff\'" class="pi-tas-btn" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit">B — Modern</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2AktifPITasarim=\'C\';document.querySelectorAll(\'.pi-tas-btn\').forEach(function(b){b.style.background=\'transparent\';b.style.color=\'var(--t2)\'});this.style.background=\'#1D9E75\';this.style.color=\'#fff\'" class="pi-tas-btn" style="font-size:10px;padding:3px 10px;border:0.5px solid var(--b);border-radius:4px;background:transparent;color:var(--t2);cursor:pointer;font-family:inherit">C — Premium</button>';
  ic += '</div>';
  /* SA-V2-PI-005: Dil seçici */
  ic += '<div style="display:flex;align-items:center;gap:6px;padding:6px 20px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  ic += '<span style="font-size:9px;color:var(--t3);font-weight:500">PI DİL:</span>';
  ['EN', 'CN', 'AR', 'RU'].forEach(function(d, i) {
    var lblr = { EN: 'English', CN: '中文', AR: 'عربي', RU: 'Русский' };
    var aktif = (window._saV2AktifPIDil || 'EN') === d;
    ic += '<button onclick="event.stopPropagation();window._saV2AktifPIDil=\'' + d + '\';document.querySelectorAll(\'.pi-dil-btn\').forEach(function(b){b.style.background=\'transparent\';b.style.fontWeight=\'400\'});this.style.background=\'var(--bm)\';this.style.fontWeight=\'500\'" class="pi-dil-btn" style="font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:' + (aktif ? 'var(--bm)' : 'transparent') + ';cursor:pointer;font-family:inherit;font-weight:' + (aktif ? '500' : '400') + '">' + (lblr[d] || d) + '</button>';
  });
  ic += '</div>';
  ic += '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">';
  ic += '<div style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:6px;padding:10px 14px;display:flex;align-items:center;gap:12px">';
  if(t.gorsel) ic += '<img src="'+t.gorsel+'" style="width:44px;height:44px;border-radius:5px;object-fit:cover;flex-shrink:0">';
  else ic += '<div style="width:44px;height:44px;border-radius:5px;background:#B5D4F4;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>';
  ic += '<div><div style="font-size:13px;font-weight:500;color:#0C447C">'+_saEsc(_urunAdi||'\u00dcr\u00fcn')+((t.urunler&&t.urunler.length>1)?' <span style="font-size:9px;color:var(--t3)">('+t.urunler.length+' \u00fcr\u00fcn)</span>':'')+'</div>';
  ic += '<div style="font-size:10px;color:#185FA5;margin-top:2px">'+_saEsc(_duayKodu||'\u2014')+' \u00b7 '+_saEsc(t.tedarikci||'\u2014')+' \u00b7 Al\u0131\u015f: '+_saEsc(alisF||'\u2014')+' '+_saEsc(_para)+'</div></div>';
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ KODU</div>';
  ic += '<input id="st-musteri-kod" value="0000" placeholder="3230" oninput="event.stopPropagation();var sid=window._saTeklifId?.(this.value)||(this.value+\'-\'+Date.now());document.getElementById(\'st-id-goster\').textContent=sid;document.getElementById(\'st-id\').value=sid;window._saV2MusteriKodAra(this.value)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:monospace"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">MÜŞTERİ ADI</div>';
  ic += '<input id="st-musteri-ad" placeholder="Müşteri adı" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">GEÇERLİLİK TARİHİ</div>';
  ic += '<input type="date" id="st-gecerlilik" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"></div>';
  ic += '</div>';
  ic += '<div style="border:0.5px solid var(--b);border-radius:6px;overflow:hidden;margin-bottom:12px">';
  ic += '<table style="width:100%;border-collapse:collapse">';
  ic += '<thead><tr style="background:var(--s2);font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em">';
  ic += '<th style="padding:6px 8px;text-align:left">GRS</th><th style="padding:6px 8px;text-align:left">DUAY KODU</th><th style="padding:6px 8px;text-align:left">ÜRÜN ADI</th><th style="padding:6px 8px;text-align:left">MİKTAR</th><th style="padding:6px 8px;text-align:left">ALİŞ TL</th><th style="padding:6px 8px;text-align:left">MARJ %</th><th style="padding:6px 8px;text-align:left">BİRİM SATIŞ</th><th style="padding:6px 8px;text-align:left">TOPLAM</th><th style="padding:6px 8px"></th>';
  ic += '</tr></thead>';
  ic += '<tbody id="st-urun-tbody"></tbody>';
  ic += '</table>';
  ic += '<div style="padding:8px;border-top:0.5px solid var(--b)">';
  ic += '<button onclick="event.stopPropagation();window._saV2UrunSecModal()" style="font-size:10px;padding:4px 12px;border:0.5px dashed var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t3);font-family:inherit">+ Ürün Ekle</button>';
  ic += '</div></div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">TESLİM KOŞULU (INCOTERMS)</div>';
  ic += '<select id="st-teslim" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  ic += '<option value="FOB Istanbul">FOB Istanbul</option>';
  ic += '<option value="CIF Destination">CIF Destination</option>';
  ic += '<option value="EXW Istanbul">EXW Istanbul</option>';
  ic += '<option value="CFR Destination">CFR Destination</option>';
  ic += '<option value="DDP Destination">DDP Destination</option>';
  ic += '<option value="DAP Destination">DAP Destination</option>';
  ic += '<option value="FCA Istanbul">FCA Istanbul</option>';
  ic += '<option value="CPT Destination">CPT Destination</option>';
  ic += '<option value="CIP Destination">CIP Destination</option>';
  ic += '<option value="DPU Destination">DPU Destination</option>';
  ic += '</select></div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">ÖDEME KOŞULU</div>';
  ic += '<select id="st-odeme" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  ic += '<option>30% Advance, 70% L/C at sight</option>';
  ic += '<option>50% Advance, 50% L/C at sight</option>';
  ic += '<option>100% Advance before shipment</option>';
  ic += '<option>L/C at sight</option>';
  ic += '<option>T/T 30 days after B/L</option>';
  ic += '<option>T/T 60 days after B/L</option>';
  ic += '<option>D/P at sight</option>';
  ic += '<option>Open Account 30 days</option>';
  ic += '</select></div>';
  ic += '</div>';
  ic += '<div style="background:var(--s2);border-radius:6px;padding:12px 14px;border:0.5px solid var(--b);margin-bottom:12px">';
  ic += '<div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:8px" id="st-ozet-urun-say">0 ürün</div>';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px"><span style="color:var(--t3)">Toplam satış tutarı</span><span style="font-weight:500" id="st-ozet-toplam-satis">₺0.00</span></div>';
  ic += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:10px"><span style="color:var(--t3)">EUR alternatif</span><span style="color:#185FA5" id="st-ozet-eur">—</span></div>';
  ic += '<div style="height:0.5px;background:var(--b);margin:6px 0"></div>';
  ic += '<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--t3)">Toplam kâr</span><span style="font-weight:500;color:#0F6E56" id="st-ozet-toplam-kar">₺0.00</span></div>';
  ic += '<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:3px"><span style="color:var(--t3)">Ort. marj</span><span style="color:#0F6E56" id="st-ozet-ort-marj">%0</span></div>';
  ic += '</div>';
  ic += '<div style="font-size:9px;font-family:monospace;background:var(--s2);padding:7px 10px;border-radius:4px;border:0.5px solid var(--b);display:flex;align-items:center;justify-content:space-between">';
  ic += '<span style="color:var(--t3)">TEKLİF ID:</span><span style="color:#0C447C;font-weight:500" id="st-id-goster">'+satisId+'</span>';
  ic += '<input id="st-id" type="hidden" value="'+satisId+'"></div>';
  ic += '<div style="display:flex;gap:8px">';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisPDF()" style="flex:1;font-size:12px;padding:9px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-weight:500;font-family:inherit">PDF Oluştur → Gönder</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2SatisKaydet(\''+t.id+'\')" style="font-size:12px;padding:9px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Taslak Kaydet</button>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-satis-modal\')?.remove()" style="font-size:12px;padding:9px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t3)">İptal</button>';
  ic += '</div>';
  ic += '<input type="hidden" id="st-urun-adi-hidden" value="'+_saEsc(_urunAdi)+'"><input type="hidden" id="st-duay-kodu-hidden" value="'+_saEsc(_duayKodu)+'"><input type="hidden" id="st-alis-tl-hidden" value="'+alisTl+'">';
  ic += '</div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
  window._saV2SatisUrunler = [];
  window._saV2SatisUrunEkle(t);
};

window._saV2SatisKaydet = function(alisId) {
  var teklifId = document.getElementById('st-id')?.value||'';
  var musteriAd = document.getElementById('st-musteri-ad')?.value?.trim()||'';
  var urunler = window._saV2SatisUrunler||[];
  var toplamSatis = 0; var toplamAlis = 0;
  urunler.forEach(function(u){ toplamSatis+=u.alisTl*(1+u.marj/100)*u.miktar; toplamAlis+=u.alisTl*u.miktar; });
  var toplamKar = (toplamSatis-toplamAlis).toFixed(2);
  var ortMarj = toplamAlis>0?((toplamSatis-toplamAlis)/toplamAlis*100).toFixed(1):0;
  var kayit = {
    id:window._saId?.(),
    teklifId:teklifId,
    revNo: '01',
    alisId:alisId,
    musteriAd:musteriAd,
    musteriKod:document.getElementById('st-musteri-kod')?.value||'',
    urunler:urunler,
    toplamSatis:toplamSatis.toFixed(2),
    toplamEUR: (parseFloat(toplamSatis) / ((window._saKur||{}).EUR||51.70) * ((window._saKur||{}).USD||44.55)).toFixed(2),
    toplamKar:toplamKar,
    ortMarj:ortMarj,
    teslim:document.getElementById('st-teslim')?.value||'',
    odeme:document.getElementById('st-odeme')?.value||'',
    gecerlilik:document.getElementById('st-gecerlilik')?.value||'',
    durum:'taslak',
    createdAt:window._saNow?.(),
    updatedAt:window._saNow?.()
  };
  var teklifler = window._saTeklifLoad?.() || [];
  teklifler.unshift(kayit);
  window._saTeklifStore?.(teklifler);
  document.getElementById('sav2-satis-modal')?.remove();
  window._saV2TakipGorevOlustur(kayit);
  window.toast?.('Satış teklifi kaydedildi: '+teklifId,'ok');
};

window._saV2SatisPDF = function() {
  var teklifId = document.getElementById('st-id')?.value||'';
  var musteriAd = document.getElementById('st-musteri-ad')?.value||'';
  var musteriKod = document.getElementById('st-musteri-kod')?.value||'';
  var gecerlilik = document.getElementById('st-gecerlilik')?.value||'';
  var teslim = document.getElementById('st-teslim')?.value||'FOB Istanbul';
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

