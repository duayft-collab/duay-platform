/* HESAP-MUTABAKATI-001: Hesap Mütabakatı Modülü */
var HM_KEY = 'duay_hesap_mutabakat';
var _hmEsc = window._esc || function(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
var HM_VER = '1.0.0';

window._hmLoad = function() {
  try { var r = localStorage.getItem(HM_KEY); return r ? JSON.parse(r) : []; }
  catch(e) { console.warn('[HM]', e); return []; }
};

window._hmStore = function(d) {
  try { localStorage.setItem(HM_KEY, JSON.stringify(d)); }
  catch(e) { console.warn('[HM]', e); }
};

window._hmId = function() {
  return 'HM-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
};

window.renderHesapMutabakati = function() {
  var el = document.getElementById('panel-hesap-mutabakati');
  if (!el) return;
  var liste = window._hmLoad().filter(function(m){return !m.isDeleted;});
  var _b = 'var(--color-border-tertiary)';
  var _t = 'var(--color-text-primary)';
  var _t2 = 'var(--color-text-secondary)';
  var _t3 = 'var(--color-text-tertiary)';
  var _sf = 'var(--color-background-primary)';
  var _s2 = 'var(--color-background-secondary)';

  var taslak = liste.filter(function(m){return m.durum==='taslak';}).length;
  var onaylandi = liste.filter(function(m){return m.durum==='onaylandi';}).length;
  var farkli = liste.filter(function(m){return m.fark && parseFloat(m.fark)!==0;}).length;

  var h = '<div style="padding:20px;max-width:1200px;margin:0 auto">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">';
  h += '<div><div style="font-size:18px;font-weight:500;color:'+_t+'">Hesap Mütabakatı</div>';
  h += '<div style="font-size:11px;color:'+_t3+';margin-top:2px">Karşılıklı hesap karşılaştırma ve onay sistemi</div></div>';
  h += '<button onclick="event.stopPropagation();window._hmYeniAc()" style="padding:8px 16px;border:none;border-radius:6px;background:#185FA5;color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">+ Yeni Mütabakat</button>';
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">';
  h += '<div style="background:'+_s2+';border-radius:8px;padding:12px 16px"><div style="font-size:9px;color:'+_t3+';font-weight:500;letter-spacing:.06em">TOPLAM</div><div style="font-size:22px;font-weight:500;color:'+_t+'">'+liste.length+'</div></div>';
  h += '<div style="background:'+_s2+';border-radius:8px;padding:12px 16px"><div style="font-size:9px;color:'+_t3+';font-weight:500;letter-spacing:.06em">TASLAK</div><div style="font-size:22px;font-weight:500;color:#854F0B">'+taslak+'</div></div>';
  h += '<div style="background:'+_s2+';border-radius:8px;padding:12px 16px"><div style="font-size:9px;color:'+_t3+';font-weight:500;letter-spacing:.06em">ONAYLANDI</div><div style="font-size:22px;font-weight:500;color:#0F6E56">'+onaylandi+'</div></div>';
  h += '<div style="background:'+_s2+';border-radius:8px;padding:12px 16px"><div style="font-size:9px;color:'+_t3+';font-weight:500;letter-spacing:.06em">FARK VAR</div><div style="font-size:22px;font-weight:500;color:#A32D2D">'+farkli+'</div></div>';
  h += '</div>';

  h += '<div style="background:'+_sf+';border:0.5px solid '+_b+';border-radius:10px;overflow:hidden">';
  h += '<div style="display:grid;grid-template-columns:1fr 120px 100px 140px 80px 140px;padding:8px 16px;background:'+_s2+';border-bottom:0.5px solid '+_b+'">';
  ['CARİ HESAP','TARİH','DURUM','FARK','PARA',''].forEach(function(l){
    h += '<div style="font-size:9px;font-weight:500;color:'+_t3+';letter-spacing:.05em">'+l+'</div>';
  });
  h += '</div>';

  if (!liste.length) {
    h += '<div style="padding:48px;text-align:center;color:'+_t3+';font-size:12px">Henüz mütabakat yok — + Yeni Mütabakat ile başlayın</div>';
  } else {
    liste.forEach(function(m) {
      var dRenk = {onaylandi:'#0F6E56',kilitli:'#3C3489',islemde:'#185FA5',taslak:'#854F0B'}[m.durum]||'#854F0B';
      var dBg = {onaylandi:'#E1F5EE',kilitli:'#EEEDFE',islemde:'#E6F1FB',taslak:'#FAEEDA'}[m.durum]||'#FAEEDA';
      var dLbl = {taslak:'Taslak',islemde:'İşlemde',onaylandi:'Onaylandı',kilitli:'Kilitli'}[m.durum]||m.durum;
      var farkVal = m.fark ? parseFloat(m.fark) : null;
      var farkStr = farkVal===null ? '—' : farkVal===0 ? '✓ Eşit' : farkVal.toLocaleString('tr-TR',{minimumFractionDigits:2});
      var farkRenk = farkVal===null ? _t3 : farkVal===0 ? '#0F6E56' : '#A32D2D';
      h += '<div style="display:grid;grid-template-columns:1fr 120px 100px 140px 80px 140px;padding:10px 16px;border-bottom:0.5px solid '+_b+';align-items:center;cursor:pointer" onclick="event.stopPropagation();window._hmDetayAc(\''+m.id+'\')" onmouseover="this.style.background=\'var(--color-background-secondary)\'" onmouseout="this.style.background=\'transparent\'">';
      h += '<div><div style="font-size:12px;font-weight:500;color:'+_t+'">'+_hmEsc(m.cari||'—')+'</div>';
      h += '<div style="font-size:10px;color:'+_t3+'">'+_hmEsc(m.aciklama||'')+'</div></div>';
      h += '<div style="font-size:11px;color:'+_t2+'">'+_hmEsc(m.tarih||'—')+'</div>';
      h += '<div><span style="font-size:9px;padding:2px 8px;border-radius:20px;background:'+dBg+';color:'+dRenk+';font-weight:500">'+dLbl+'</span></div>';
      h += '<div style="font-size:11px;font-weight:500;color:'+farkRenk+'">'+farkStr+'</div>';
      h += '<div style="font-size:11px;color:'+_t2+'">'+(m.para||'TRY')+'</div>';
      h += '<div style="display:flex;gap:4px;justify-content:flex-end">';
      h += '<button onclick="event.stopPropagation();window._hmDetayAc(\''+m.id+'\')" style="font-size:10px;padding:4px 10px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;color:'+_t2+';font-family:inherit">Gör</button>';
      if (m.durum !== 'onaylandi' && m.durum !== 'kilitli') {
        h += '<button onclick="event.stopPropagation();window._hmSil(\''+m.id+'\')" style="font-size:10px;padding:4px 10px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Sil</button>';
      }
      h += '</div>';
      h += '</div>';
    });
  }
  h += '</div></div>';
  el.innerHTML = h;
};

window._hmYeniAc = function() {
  var mevcut = document.getElementById('hm-modal'); if (mevcut) mevcut.remove();
  var cariler = typeof window.loadCari==='function' ? window.loadCari({tumKullanicilar:true}).filter(function(c){return !c.isDeleted;}) : [];
  var mo = document.createElement('div');
  mo.id = 'hm-modal';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };
  mo.innerHTML = '<div style="background:var(--color-background-primary);border-radius:12px;border:0.5px solid var(--color-border-tertiary);width:min(480px,95vw);overflow:hidden">'
    +'<div style="padding:16px 20px;border-bottom:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:space-between">'
    +'<div style="font-size:14px;font-weight:500;color:var(--color-text-primary)">Yeni Mütabakat</div>'
    +'<button onclick="event.stopPropagation();document.getElementById(\'hm-modal\').remove()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--color-text-tertiary)">×</button>'
    +'</div>'
    +'<div style="padding:20px;display:flex;flex-direction:column;gap:12px">'
    +'<div><div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.06em;margin-bottom:4px">CARİ HESAP *</div>'
    +'<select id="hm-cari" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);color:var(--color-text-primary);font-family:inherit"><option value="">Seç...</option>'
    +cariler.map(function(c){var ad=c.ad||c.unvan||c.name||'';return '<option value="'+ad+'">'+ad+'</option>';}).join('')
    +'</select></div>'
    +'<div><div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.06em;margin-bottom:4px">PARA BİRİMİ</div>'
    +'<select id="hm-para" onclick="event.stopPropagation()" style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);color:var(--color-text-primary);font-family:inherit"><option value="TRY">TRY — Türk Lirası</option><option value="USD">USD — Dolar</option><option value="EUR">EUR — Euro</option></select></div>'
    +'<div><div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.06em;margin-bottom:4px">AÇIKLAMA</div>'
    +'<input id="hm-aciklama" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="İsteğe bağlı not..." style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);color:var(--color-text-primary);font-family:inherit;box-sizing:border-box"></div>'
    +'<div><div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.06em;margin-bottom:4px">YETKİLİ KİŞİ</div>'
    +'<input id="hm-yetkili" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Ad Soyad" style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);color:var(--color-text-primary);font-family:inherit;box-sizing:border-box"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.06em;margin-bottom:4px">CEP NO</div>'
    +'<input id="hm-cep" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="0532 xxx xx xx" style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);color:var(--color-text-primary);font-family:inherit;box-sizing:border-box"></div>'
    +'<div><div style="font-size:9px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.06em;margin-bottom:4px">E-POSTA</div>'
    +'<input id="hm-email" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="ornek@firma.com" style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);color:var(--color-text-primary);font-family:inherit;box-sizing:border-box"></div></div>'
    +'</div>'
    +'<div style="padding:12px 20px;border-top:0.5px solid var(--color-border-tertiary);display:flex;justify-content:flex-end;gap:8px">'
    +'<button onclick="event.stopPropagation();document.getElementById(\'hm-modal\').remove()" style="font-size:12px;padding:7px 16px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:transparent;cursor:pointer;color:var(--color-text-secondary)">İptal</button>'
    +'<button onclick="event.stopPropagation();window._hmYeniKaydet()" style="font-size:12px;padding:7px 20px;border:none;border-radius:6px;background:#185FA5;color:#fff;cursor:pointer;font-weight:500">Devam Et →</button>'
    +'</div></div>';
  document.body.appendChild(mo);
};

window._hmYeniKaydet = function() {
  if (window._ppIslem) return; window._ppIslem = true; setTimeout(function(){ window._ppIslem=false; },1500);
  var cari = document.getElementById('hm-cari')?.value;
  var para = document.getElementById('hm-para')?.value || 'TRY';
  var aciklama = document.getElementById('hm-aciklama')?.value || '';
  if (!cari) { window.toast?.('Cari hesap seçin','warn'); return; }
  var kayit = {
    id: window._hmId(), cari: cari, para: para, aciklama: aciklama,
    yetkili: document.getElementById('hm-yetkili')?.value || '',
    cep: document.getElementById('hm-cep')?.value || '',
    email: document.getElementById('hm-email')?.value || '',
    durum: 'taslak', fark: null,
    tarih: new Date().toLocaleDateString('tr-TR'),
    createdAt: new Date().toISOString(),
    createdBy: window.CU?.()?.displayName || ''
  };
  var liste = window._hmLoad();
  liste.unshift(kayit);
  window._hmStore(liste);
  document.getElementById('hm-modal')?.remove();
  window.toast?.('Mütabakat oluşturuldu','ok');
  window._hmDetayAc(kayit.id);
};

window._hmDetayAc = function(id) {
  var liste = window._hmLoad();
  var m = liste.find(function(x){return x.id===id;});
  if (!m) return;
  var el = document.getElementById('panel-hesap-mutabakati');
  if (!el) return;
  var _b = 'var(--color-border-tertiary)';
  var _t = 'var(--color-text-primary)';
  var _t3 = 'var(--color-text-tertiary)';
  var _sf = 'var(--color-background-primary)';

  var dLbl = {taslak:'Taslak',islemde:'İşlemde',onaylandi:'Onaylandı',kilitli:'Kilitli'}[m.durum]||m.durum;
  var dRenk = {onaylandi:'#0F6E56',kilitli:'#3C3489',islemde:'#185FA5',taslak:'#854F0B'}[m.durum]||'#854F0B';
  var dBg = {onaylandi:'#E1F5EE',kilitli:'#EEEDFE',islemde:'#E6F1FB',taslak:'#FAEEDA'}[m.durum]||'#FAEEDA';

  var h = '<div style="padding:20px;max-width:1200px;margin:0 auto">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">';
  h += '<button onclick="event.stopPropagation();window.renderHesapMutabakati()" style="font-size:11px;padding:5px 12px;border:0.5px solid '+_b+';border-radius:5px;background:transparent;cursor:pointer;color:'+_t3+';font-family:inherit">← Geri</button>';
  h += '<div style="font-size:16px;font-weight:500;color:'+_t+'">'+_hmEsc(m.cari||'—')+'</div>';
  h += '<span style="font-size:9px;padding:2px 8px;border-radius:20px;background:'+dBg+';color:'+dRenk+';font-weight:500">'+dLbl+'</span>';
  h += '<span style="font-size:10px;color:'+_t3+'">'+(m.para||'TRY')+' · '+_hmEsc(m.tarih||'')+'</span>';
  if (m.yetkili || m.cep || m.email) {
    h += '<div style="font-size:11px;color:'+_t3+';margin-top:4px;display:flex;align-items:center;gap:12px">';
    if (m.yetkili) h += '<span>👤 '+_hmEsc(m.yetkili)+'</span>';
    if (m.cep) h += '<span>📞 '+_hmEsc(m.cep)+'</span>';
    if (m.email) h += '<span>✉ '+_hmEsc(m.email)+'</span>';
    h += '</div>';
  }
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">';

  ['ic','karsi'].forEach(function(tip) {
    var dosyaAd = tip==='ic' ? _hmEsc(m.icDosyaAd) : _hmEsc(m.karsiDosyaAd);
    var dosyaVar = tip==='ic' ? !!m.icDosya : !!m.karsiDosya;
    var baslik = tip==='ic' ? 'BİZİM FİRMA DOSYASI' : 'KARŞI FİRMA DOSYASI';
    h += '<div style="background:'+_sf+';border:0.5px solid '+_b+';border-radius:10px;padding:20px">';
    h += '<div style="font-size:10px;font-weight:500;color:'+_t3+';letter-spacing:.06em;margin-bottom:12px">'+baslik+'</div>';
    if (dosyaVar) {
      h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
      h += '<span style="font-size:20px">📊</span>';
      h += '<div><div style="font-size:11px;font-weight:500;color:#0F6E56">'+dosyaAd+'</div>';
      h += '<div style="font-size:9px;color:'+_t3+'">Yüklendi ✓</div></div></div>';
      h += '<button onclick="event.stopPropagation();window._hmDosyaSil(\''+id+'\',\''+tip+'\')" style="font-size:10px;padding:4px 10px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;cursor:pointer;color:#A32D2D;font-family:inherit">Değiştir</button>';
    } else {
      h += '<label style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px;border:1.5px dashed '+_b+';border-radius:8px;cursor:pointer;gap:8px">';
      h += '<span style="font-size:32px">📁</span>';
      h += '<span style="font-size:11px;color:'+_t3+'">Excel dosyası seç veya sürükle</span>';
      h += '<span style="font-size:9px;color:'+_t3+'">.xlsx / .xls</span>';
      h += '<input type="file" accept=".xlsx,.xls" style="display:none" onchange="event.stopPropagation();window._hmDosyaYukle(\''+id+'\',\''+tip+'\',this)">';
      h += '</label>';
    }
    h += '</div>';
  });
  h += '</div>';

  if (m.icDosya && m.karsiDosya && m.icKolonMap && m.karsiKolonMap && m.durum === 'taslak') {
    h += '<div style="text-align:center;padding:20px 0">';
    h += '<button onclick="event.stopPropagation();window._hmKarsilastir(\''+id+'\')" style="padding:12px 36px;border:none;border-radius:8px;background:#185FA5;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">⚡ Karşılaştırmayı Başlat</button>';
    h += '</div>';
  }

  if (m.icDosya && m.karsiDosya && (!m.icKolonMap || !m.karsiKolonMap) && m.durum === 'taslak') {
    h += '<div style="text-align:center;padding:12px;font-size:11px;color:#854F0B;background:#FAEEDA;border-radius:8px;margin-bottom:16px">Her iki dosyanın kolon eşleştirmesi tamamlanmalı</div>';
  }

  if (m.rapor) {
    h += window._hmRaporHTML(m);
  }

  h += '</div>';
  el.innerHTML = h;
};

window._hmKolonMapAc = function(id, tip) {
  var liste = window._hmLoad();
  var m = liste.find(function(x){return x.id===id;});
  if (!m) return;
  var dosya = tip==='ic' ? m.icDosya : m.karsiDosya;
  if (!dosya || typeof XLSX==='undefined') { window._hmDetayAc(id); return; }
  try {
    var wb = XLSX.read(new Uint8Array(dosya), {type:'array'});
    var sheet = wb.Sheets[wb.SheetNames[0]];
    var data = XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
    var baslik = data[0] || [];
    var harfler = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, baslik.length);
    var secenek = harfler.map(function(h,i){ return '<option value="'+i+'">'+h+' — '+(baslik[i]||'(boş)')+'</option>'; }).join('');
    var mo = document.createElement('div');
    mo.id = 'hm-map-modal';
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center';
    var baslikStr = tip==='ic' ? 'Bizim Firma' : 'Karşı Firma';
    mo.innerHTML = '<div style="background:var(--color-background-primary);border-radius:12px;border:0.5px solid var(--color-border-tertiary);width:min(500px,95vw);overflow:hidden">'
      +'<div style="padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary);font-size:14px;font-weight:500;color:var(--color-text-primary)">Kolon Eşleştirme — '+baslikStr+'</div>'
      +'<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
      +'<div style="font-size:11px;color:var(--color-text-tertiary);margin-bottom:4px">Excel dosyasında hangi sütun hangi bilgiyi içeriyor?</div>'
      +['tarih','aciklama','borc','alacak','refNo'].map(function(alan){
        var lbl = {tarih:'Tarih *',aciklama:'Açıklama',borc:'Borç Tutarı *',alacak:'Alacak Tutarı',refNo:'Referans No'}[alan];
        var def = {tarih:0,aciklama:1,borc:2,alacak:3,refNo:4}[alan];
        return '<div style="display:grid;grid-template-columns:140px 1fr;gap:8px;align-items:center">'
          +'<div style="font-size:11px;font-weight:500;color:var(--color-text-primary)">'+lbl+'</div>'
          +'<select id="hm-map-'+alan+'" style="font-size:11px;padding:6px 8px;border:0.5px solid var(--color-border-tertiary);border-radius:5px;background:var(--color-background-secondary);color:var(--color-text-primary);font-family:inherit">'
          +'<option value="-1">— Yok —</option>'+secenek+'</select></div>';
      }).join('')
      +'</div>'
      +'<div style="padding:12px 20px;border-top:0.5px solid var(--color-border-tertiary);display:flex;justify-content:flex-end;gap:8px">'
      +'<button onclick="event.stopPropagation();document.getElementById(\'hm-map-modal\').remove();window._hmDetayAc(\''+id+'\')" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:transparent;cursor:pointer;color:var(--color-text-secondary)">İptal</button>'
      +'<button onclick="event.stopPropagation();window._hmKolonMapKaydet(\''+id+'\',\''+tip+'\')" style="font-size:12px;padding:7px 16px;border:none;border-radius:6px;background:#185FA5;color:#fff;cursor:pointer;font-weight:500">Kaydet</button>'
      +'</div></div>';
    document.body.appendChild(mo);
  } catch(e) { console.warn('[HM]',e); window._hmDetayAc(id); }
};

window._hmKolonMapKaydet = function(id, tip) {
  var _g = function(alan) { return parseInt(document.getElementById('hm-map-'+alan)?.value ?? -1); };
  var map = { tarih:_g('tarih'), aciklama:_g('aciklama'), borc:_g('borc'), alacak:_g('alacak'), refNo:_g('refNo') };
  if (map.tarih===-1 || map.borc===-1) { window.toast?.('Tarih ve Borç kolonları zorunlu','warn'); return; }
  var liste = window._hmLoad();
  var idx = liste.findIndex(function(x){return x.id===id;});
  if (idx===-1) return;
  if (tip==='ic') liste[idx].icKolonMap = map;
  else liste[idx].karsiKolonMap = map;
  window._hmStore(liste);
  document.getElementById('hm-map-modal')?.remove();
  window.toast?.('Kolon eşleştirmesi kaydedildi','ok');
  window._hmDetayAc(id);
};

window._hmSil = function(id) {
  window.confirmModal?.('Mütabakatı Sil', 'Bu mütabakat silinecek. Emin misin?', function() {
    var liste = window._hmLoad();
    var idx = liste.findIndex(function(x){return x.id===id;});
    if (idx===-1) return;
    if (liste[idx].durum==='onaylandi' || liste[idx].durum==='kilitli') {
      window.toast?.('Onaylı/kilitli kayıt silinemez','warn');
      return;
    }
    liste[idx].isDeleted = true;
    liste[idx].deletedAt = new Date().toISOString();
    liste[idx].deletedBy = window.CU?.()?.displayName || '';
    window._hmStore(liste);
    window.toast?.('Mütabakat silindi','ok');
    window.renderHesapMutabakati();
  });
};

window._hmDosyaSil = function(id, tip) {
  window.confirmModal?.('Dosyayı Kaldır', 'Bu dosya kaldırılacak. Emin misin?', function() {
    var liste = window._hmLoad();
    var idx = liste.findIndex(function(x){return x.id===id;});
    if (idx===-1) return;
    if (tip==='ic') { liste[idx].icDosya=null; liste[idx].icDosyaAd=null; }
    else { liste[idx].karsiDosya=null; liste[idx].karsiDosyaAd=null; }
    liste[idx].rapor = null; liste[idx].fark = null;
    window._hmStore(liste);
    window.toast?.('Dosya kaldırıldı','ok');
    window._hmDetayAc(id);
  });
};

window._hmDosyaYukle = function(id, tip, input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { window.toast?.('Dosya 5MB\'dan büyük olamaz','err'); return; }
  window.toast?.('Dosya okunuyor...','info');
  var reader = new FileReader();
  reader.onload = function(e) {
    var liste = window._hmLoad();
    var idx = liste.findIndex(function(x){return x.id===id;});
    if (idx===-1) return;
    var data = Array.from(new Uint8Array(e.target.result));
    if (tip==='ic') { liste[idx].icDosya=data; liste[idx].icDosyaAd=file.name; }
    else { liste[idx].karsiDosya=data; liste[idx].karsiDosyaAd=file.name; }
    window._hmStore(liste);
    window.toast?.(file.name+' yüklendi','ok');
    window._hmKolonMapAc(id, tip);
  };
  reader.onerror = function() { window.toast?.('Dosya okunamadı','err'); };
  reader.readAsArrayBuffer(file);
};

window._hmKarsilastir = function(id) {
  var liste = window._hmLoad();
  var idx = liste.findIndex(function(x){return x.id===id;});
  if (idx===-1) return;
  var m = liste[idx];
  if (!m.icDosya || !m.karsiDosya) { window.toast?.('Her iki dosya da yüklenmeli','warn'); return; }
  liste[idx].durum = 'islemde';
  window._hmStore(liste);
  window._hmDetayAc(id);
  window.toast?.('Karşılaştırma yapılıyor...','info');
  setTimeout(function() {
    window._hmParseVeKarsilastir(id);
  }, 500);
};

window._hmParseVeKarsilastir = function(id) {
  var liste = window._hmLoad();
  var idx = liste.findIndex(function(x){return x.id===id;});
  if (idx===-1) return;
  var m = liste[idx];
  try {
    if (typeof XLSX === 'undefined') { window.toast?.('Excel kütüphanesi yüklenmedi','err'); return; }
    var icWb = XLSX.read(new Uint8Array(m.icDosya), {type:'array'});
    var karsiWb = XLSX.read(new Uint8Array(m.karsiDosya), {type:'array'});
    var icSheet = icWb.Sheets[icWb.SheetNames[0]];
    var karsiSheet = karsiWb.Sheets[karsiWb.SheetNames[0]];
    var icData = XLSX.utils.sheet_to_json(icSheet, {header:1, defval:''});
    var karsiData = XLSX.utils.sheet_to_json(karsiSheet, {header:1, defval:''});

    var _parseRows = function(data, km) {
      /* HM-MAP-001b: kolonMap parametrik, borç/alacak ayrımı */
      var map = km || {tarih:0, aciklama:1, borc:2, alacak:-1, refNo:3};
      var rows = [];
      for (var i=1; i<data.length; i++) {
        var row = data[i];
        if (!row || !row.length) continue;
        var _v = function(k) { return map[k]>=0 ? String(row[map[k]]||'').trim() : ''; };
        var tarih    = _v('tarih');
        var aciklama = _v('aciklama');
        var borc     = parseFloat(String(row[map.borc]||'0').replace(/[^\d.-]/g,'')) || 0;
        var alacak   = map.alacak>=0 ? parseFloat(String(row[map.alacak]||'0').replace(/[^\d.-]/g,'')) || 0 : 0;
        var netTutar = borc - alacak;
        var refNo    = _v('refNo');
        if (!tarih && !borc && !alacak) continue;
        rows.push({tarih:tarih, aciklama:aciklama, borc:borc, alacak:alacak, tutar:netTutar, refNo:refNo, eslesti:false});
      }
      return rows;
    };

    var icRows    = _parseRows(icData,    m.icKolonMap);
    var karsiRows = _parseRows(karsiData, m.karsiKolonMap);

    var icToplam    = icRows.reduce(function(s,r){return s+r.borc;},0);
    var icAlacak    = icRows.reduce(function(s,r){return s+r.alacak;},0);
    var karsiToplam = karsiRows.reduce(function(s,r){return s+r.borc;},0);
    var karsiAlacak = karsiRows.reduce(function(s,r){return s+r.alacak;},0);
    var fark = (icToplam - icAlacak) - (karsiToplam - karsiAlacak);

    var eslesmeyenIc = [], eslesmeyenKarsi = [];
    var karsiKopya = karsiRows.map(function(r){return Object.assign({},r);});

    icRows.forEach(function(ir) {
      var bulunan = karsiKopya.findIndex(function(kr){
        return !kr.eslesti && Math.abs((kr.borc||kr.tutar||0) - (ir.borc||ir.tutar||0)) < 0.01 && Math.abs((kr.alacak||0) - (ir.alacak||0)) < 0.01;
      });
      if (bulunan !== -1) { karsiKopya[bulunan].eslesti = true; ir.eslesti = true; }
      else { eslesmeyenIc.push(ir); }
    });
    karsiKopya.forEach(function(kr){ if (!kr.eslesti) eslesmeyenKarsi.push(kr); });

    liste[idx].rapor = {
      icToplam: icToplam, icAlacak: icAlacak,
      karsiToplam: karsiToplam, karsiAlacak: karsiAlacak, fark: fark,
      icSatirSayisi: icRows.length, karsiSatirSayisi: karsiRows.length,
      eslesmeyenIc: eslesmeyenIc, eslesmeyenKarsi: eslesmeyenKarsi,
      tarih: new Date().toISOString()
    };
    liste[idx].fark = fark;
    liste[idx].durum = 'taslak';
    window._hmStore(liste);
    window.toast?.(fark===0 ? 'Hesaplar eşleşiyor ✓' : 'Fark bulundu: '+fark.toLocaleString('tr-TR',{minimumFractionDigits:2})+' '+m.para, fark===0?'ok':'warn');
    window._hmDetayAc(id);
  } catch(e) {
    console.warn('[HM]', e);
    window.toast?.('Parse hatası: '+e.message,'err');
    liste[idx].durum = 'taslak';
    window._hmStore(liste);
    window._hmDetayAc(id);
  }
};

window._hmRaporHTML = function(m) {
  /* HM-RAPOR-BA-001: borç/alacak ayrı kolonlar */
  var r = m.rapor;
  var _b = 'var(--color-border-tertiary)';
  var _t = 'var(--color-text-primary)';
  var _t2 = 'var(--color-text-secondary)';
  var _t3 = 'var(--color-text-tertiary)';
  var _sf = 'var(--color-background-primary)';
  var _s2 = 'var(--color-background-secondary)';
  var farkRenk = r.fark===0 ? '#0F6E56' : '#A32D2D';

  var h = '<div style="background:'+_sf+';border:0.5px solid '+_b+';border-radius:10px;overflow:hidden;margin-bottom:16px">';
  h += '<div style="padding:12px 16px;background:'+_s2+';border-bottom:0.5px solid '+_b+';font-size:10px;font-weight:500;color:'+_t3+';letter-spacing:.06em">KARŞILAŞTIRMA RAPORU</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0;border-bottom:0.5px solid '+_b+'">';
  [
    ['İç Borç', r.icToplam.toLocaleString('tr-TR',{minimumFractionDigits:2})+' '+m.para, _t],
    ['İç Alacak', (r.icAlacak||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+' '+m.para, _t],
    ['Karşı Borç', r.karsiToplam.toLocaleString('tr-TR',{minimumFractionDigits:2})+' '+m.para, _t],
    ['Karşı Alacak', (r.karsiAlacak||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+' '+m.para, _t],
    ['NET FARK', (r.fark===0?'✓ Eşit':r.fark.toLocaleString('tr-TR',{minimumFractionDigits:2})+' '+m.para), farkRenk],
    ['Durum', r.fark===0?'Mütabık':'Mütabık Değil', farkRenk]
  ].forEach(function(item,i) {
    h += '<div style="padding:16px;'+(i<5?'border-right:0.5px solid '+_b+';':'')+'">';
    h += '<div style="font-size:9px;color:'+_t3+';margin-bottom:4px">'+item[0]+'</div>';
    h += '<div style="font-size:14px;font-weight:500;color:'+item[2]+'">'+item[1]+'</div>';
    h += '</div>';
  });
  h += '</div>';

  if (r.eslesmeyenIc.length || r.eslesmeyenKarsi.length) {
    h += '<div style="padding:16px">';
    if (r.eslesmeyenIc.length) {
      h += '<div style="font-size:10px;font-weight:500;color:#A32D2D;margin-bottom:8px">Eşleşmeyen — Bizim Kayıtlar ('+r.eslesmeyenIc.length+')</div>';
      r.eslesmeyenIc.slice(0,5).forEach(function(row) {
        h += '<div style="display:grid;grid-template-columns:100px 1fr 80px 80px 90px;gap:6px;padding:5px 0;border-bottom:0.5px solid '+_b+';font-size:11px">';
        h += '<div style="color:'+_t3+'">'+_hmEsc(row.tarih)+'</div>';
        h += '<div style="color:'+_t+'">'+_hmEsc(row.aciklama)+'</div>';
        h += '<div style="color:'+_t2+';text-align:right">'+(row.borc||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+'</div>';
        h += '<div style="color:'+_t2+';text-align:right">'+(row.alacak||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+'</div>';
        h += '<div style="color:#A32D2D;font-weight:500;text-align:right">'+(row.tutar||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+'</div>';
        h += '</div>';
      });
      if (r.eslesmeyenIc.length > 5) h += '<div style="font-size:10px;color:'+_t3+';padding-top:4px">+ '+(r.eslesmeyenIc.length-5)+' kayıt daha</div>';
    }
    if (r.eslesmeyenKarsi.length) {
      h += '<div style="font-size:10px;font-weight:500;color:#A32D2D;margin-bottom:8px;margin-top:12px">Eşleşmeyen — Karşı Kayıtlar ('+r.eslesmeyenKarsi.length+')</div>';
      r.eslesmeyenKarsi.slice(0,5).forEach(function(row) {
        h += '<div style="display:grid;grid-template-columns:100px 1fr 80px 80px 90px;gap:6px;padding:5px 0;border-bottom:0.5px solid '+_b+';font-size:11px">';
        h += '<div style="color:'+_t3+'">'+_hmEsc(row.tarih)+'</div>';
        h += '<div style="color:'+_t+'">'+_hmEsc(row.aciklama)+'</div>';
        h += '<div style="color:'+_t2+';text-align:right">'+(row.borc||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+'</div>';
        h += '<div style="color:'+_t2+';text-align:right">'+(row.alacak||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+'</div>';
        h += '<div style="color:#A32D2D;font-weight:500;text-align:right">'+(row.tutar||0).toLocaleString('tr-TR',{minimumFractionDigits:2})+'</div>';
        h += '</div>';
      });
      if (r.eslesmeyenKarsi.length > 5) h += '<div style="font-size:10px;color:'+_t3+';padding-top:4px">+ '+(r.eslesmeyenKarsi.length-5)+' kayıt daha</div>';
    }
    h += '</div>';
  }

  h += '<div style="padding:12px 16px;display:flex;gap:8px;border-top:0.5px solid '+_b+'">';
  if (m.durum !== 'onaylandi' && m.durum !== 'kilitli') {
    h += '<button onclick="event.stopPropagation();window._hmOnayla(\''+m.id+'\')" style="padding:7px 16px;border:none;border-radius:6px;background:#0F6E56;color:#fff;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit">✓ Onayla</button>';
  }
  h += '<button onclick="event.stopPropagation();window._hmExcel(\''+m.id+'\')" style="padding:7px 16px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:transparent;font-size:11px;cursor:pointer;font-family:inherit;color:var(--color-text-secondary)">↓ Excel</button>';
  h += '</div>';
  h += '</div>';
  return h;
};

window._hmOnayla = function(id) {
  window.confirmModal?.('Mütabakatı Onayla', 'Bu işlem geri alınamaz. Onaylıyor musunuz?', function() {
    var liste = window._hmLoad();
    var idx = liste.findIndex(function(x){return x.id===id;});
    if (idx===-1) return;
    liste[idx].durum = 'onaylandi';
    liste[idx].onayTarih = new Date().toISOString();
    liste[idx].onaylayanId = window.CU?.()?.displayName || '';
    window._hmStore(liste);
    window.toast?.('Mütabakat onaylandı','ok');
    window._hmDetayAc(id);
  });
};

window._hmExcel = function(id) {
  window.toast?.('Excel indirme — yakında','info');
};

console.log('[HM] Hesap Mütabakatı v'+HM_VER+' yüklendi');
