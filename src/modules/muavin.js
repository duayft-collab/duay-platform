'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/muavin.js — Muavin Defter Kontrol Modülü
   İki Excel karşılaştırma: Muhasebeci ↔ Baran
   B Layout: Sol nav + sağ içerik
   v3.0.0 (2026-04-09) — T3-MV-001: Tam yeniden tasarım
════════════════════════════════════════════════════════════════ */

function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
if (!window._esc) window._esc = _esc;

var _MV_KEY = 'ak_muavin_v1';
var _MV_META_KEY = 'ak_muavin_meta_v1';

/* ── Yardımcı: localStorage ── */
function _mvLoad() {
  try { var r = localStorage.getItem(_MV_KEY); return r ? JSON.parse(r) : []; }
  catch(e) { console.warn('[MUAVİN] load hata:', e); return []; }
}
function _mvStore(d) {
  try { localStorage.setItem(_MV_KEY, JSON.stringify(d)); }
  catch(e) { console.warn('[MUAVİN] store hata:', e); }
}
function _mvMetaLoad() {
  try { var r = localStorage.getItem(_MV_META_KEY); return r ? JSON.parse(r) : {}; }
  catch(e) { console.warn('[MUAVİN] meta load hata:', e); return {}; }
}
function _mvMetaStore(d) {
  try { localStorage.setItem(_MV_META_KEY, JSON.stringify(d)); }
  catch(e) { console.warn('[MUAVİN] meta store hata:', e); }
}

/* ── Dönem yardımcıları ── */
function _mvAktifDonem() {
  return window._mvDonem || (new Date().getFullYear() + 'Q' + Math.ceil((new Date().getMonth() + 1) / 3));
}
function _mvDonemListesi() {
  var buYil = new Date().getFullYear();
  var liste = [];
  liste.push(buYil + '-YIL');
  liste.push((buYil - 1) + '-YIL');
  [buYil, buYil - 1].forEach(function(y) {
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(function(q) { liste.push(y + 'Q' + q.slice(1)); });
  });
  return liste;
}
window._mvDonemListesi = _mvDonemListesi;
function _mvDonemEtiket(d) {
  if (!d) return '\u2014';
  if (d.indexOf('-YIL') !== -1) return d.replace('-YIL', '') + ' \u00b7 Tam Y\u0131l (Oca\u2013Ara)';
  var yil = d.slice(0, 4);
  var q = d.slice(4);
  var aylar = { Q1: 'Oca\u2013Mar', Q2: 'Nis\u2013Haz', Q3: 'Tem\u2013Eyl', Q4: 'Eki\u2013Ara' };
  return yil + ' ' + q + ' \u00b7 ' + (aylar[q] || '');
}
window._mvDonemEtiket = _mvDonemEtiket;
window._mvDonemAralik = function(d) {
  if (!d) return null;
  var yil = parseInt(d.slice(0, 4));
  if (d.indexOf('-YIL') !== -1) return { bas: yil + '-01-01', son: yil + '-12-31' };
  var q = d.slice(4);
  var araliklar = { Q1: [1, 3], Q2: [4, 6], Q3: [7, 9], Q4: [10, 12] };
  var ay = araliklar[q];
  if (!ay) return null;
  var bas = yil + '-' + String(ay[0]).padStart(2, '0') + '-01';
  var son = new Date(yil, ay[1], 0);
  return { bas: bas, son: son.getFullYear() + '-' + String(son.getMonth() + 1).padStart(2, '0') + '-' + String(son.getDate()).padStart(2, '0') };
};

/* ── KPI hesapla ── */
function _mvKpiHesapla(islemlerM, islemlerB) {
  var mSay = islemlerM.length;
  var bSay = islemlerB.length;
  var mFaturaSay = islemlerM.filter(function(i) { return (i.tip || '').toLowerCase().indexOf('fatura') !== -1 || (i.tip || '').toLowerCase().indexOf('mahsup') !== -1; }).length;
  var bFaturaSay = islemlerB.filter(function(i) { return (i.islemTuru || '').indexOf('Fiş') !== -1 || (i.islemTuru || '').indexOf('Fatura') !== -1; }).length;
  var mOdemeSay = islemlerM.filter(function(i) { return (i.tip || '').toLowerCase().indexOf('ödeme') !== -1 || (i.tip || '').toLowerCase().indexOf('tahsilat') !== -1; }).length;
  var bOdemeSay = islemlerB.filter(function(i) { return (i.islemTuru || '').indexOf('Ödeme') !== -1 || (i.islemTuru || '').indexOf('Tahsilat') !== -1; }).length;
  var topBorc = islemlerM.reduce(function(s, i) { return s + (parseFloat(i.borc) || 0); }, 0);
  var topAlacak = islemlerM.reduce(function(s, i) { return s + (parseFloat(i.alacak) || 0); }, 0);
  var eslesen = 0; var farkVar = 0; var sadeceMuhasebe = 0; var sadeceBaran = 0; var dovizFark = 0;
  if (window._mvEslesmeSonucu) {
    eslesen = (window._mvEslesmeSonucu.eslesen || []).length;
    farkVar = (window._mvEslesmeSonucu.farkVar || []).length;
    sadeceMuhasebe = (window._mvEslesmeSonucu.sadeceMuhasebe || []).length;
    sadeceBaran = (window._mvEslesmeSonucu.sadeceBaran || []).length;
    dovizFark = (window._mvEslesmeSonucu.dovizFark || []).length;
  }
  return { mSay: mSay, bSay: bSay, mFaturaSay: mFaturaSay, bFaturaSay: bFaturaSay, mOdemeSay: mOdemeSay, bOdemeSay: bOdemeSay, topBorc: topBorc, topAlacak: topAlacak, net: topBorc - topAlacak, eslesen: eslesen, farkVar: farkVar, sadeceMuhasebe: sadeceMuhasebe, sadeceBaran: sadeceBaran, dovizFark: dovizFark };
}

/* ── SOL NAV HTML ── */
function _mvSolNavHTML(donem, aktifTab, meta, islemlerM, islemlerB) {
  var kpi = _mvKpiHesapla(islemlerM, islemlerB);
  var onayDurum = (meta[donem] || {}).onay || 'beklemede';
  var h = '<div style="width:200px;flex-shrink:0;border-right:0.5px solid var(--b);background:var(--s2);display:flex;flex-direction:column;min-height:600px">';

  /* Başlık */
  h += '<div style="padding:12px 14px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:13px;font-weight:500;color:var(--t)">Muavin</div>';
  h += '<div style="font-size:10px;color:var(--t3);margin-top:1px">Muhasebe mutabakatı</div>';
  h += '</div>';

  /* Dönem seçici */
  h += '<div style="padding:10px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Dönem</div>';
  _mvDonemListesi().forEach(function(d) {
    var ak = d === donem;
    var dMeta = meta[d] || {};
    var onayBadge = dMeta.onay === 'onaylandi' ? ' ✓' : '';
    h += '<button onclick="event.stopPropagation();window._mvDonem=\'' + d + '\';window.renderMuavin()" style="display:block;width:100%;text-align:left;font-size:11px;padding:5px 8px;border-radius:5px;border:' + (ak ? '0.5px solid var(--b)' : 'none') + ';background:' + (ak ? 'var(--sf)' : 'transparent') + ';cursor:pointer;color:' + (ak ? 'var(--t)' : 'var(--t2)') + ';font-family:inherit;margin-bottom:2px;font-weight:' + (ak ? '500' : '400') + '">' + d.slice(0, 4) + ' ' + d.slice(4) + onayBadge + '</button>';
  });
  h += '</div>';

  /* Sekme listesi */
  var sekmeler = [
    { id: 'karsilastirma', lbl: 'Karşılaştırma', badge: (kpi.farkVar + kpi.sadeceMuhasebe + kpi.sadeceBaran) || null, badgeRenk: 'warn' },
    { id: 'muhasebeci', lbl: 'Muhasebeci Excel', badge: kpi.mSay || null, badgeRenk: 'ok' },
    { id: 'baran', lbl: 'Baran Ekstresi', badge: kpi.bSay || null, badgeRenk: 'info' },
    { id: 'cari', lbl: 'Cari Özet', badge: null },
    { id: 'donem', lbl: 'Dönem Karş.', badge: null },
    { id: 'firma-firma', lbl: 'Firma Firma', badge: (typeof window._mvFirmaListesi === 'function' ? window._mvFirmaListesi().length : null), badgeRenk: 'info' },
    { id: 'toplu-karsilastir', lbl: 'Toplu Kar\u015f.', badge: null },
    { id: 'cari-bakiye', lbl: 'Cari Bakiye', badge: null },
    { id: 'hata-analiz', lbl: 'Hata Analizi' + (window._mvSonKategoriler ? (' (' + Object.values(window._mvSonKategoriler).reduce(function(s, k) { return s + k.items.length; }, 0) + ')') : ''), badge: null, badgeRenk: 'warn' },
    { id: 'notlar', lbl: 'Notlar', badge: ((meta[donem] || {}).notSay) || null, badgeRenk: 'default' }
  ];
  h += '<div style="padding:8px 0;flex:1">';
  h += '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;padding:4px 14px;margin-bottom:2px">Görünümler</div>';
  sekmeler.forEach(function(s) {
    var ak = aktifTab === s.id;
    var badgeRenkMap = { warn: 'background:#FAEEDA;color:#854F0B', ok: 'background:#EAF3DE;color:#3B6D11', info: 'background:#E6F1FB;color:#185FA5', default: 'background:var(--s2);color:var(--t3)' };
    h += '<div onclick="event.stopPropagation();window._mvAktifTab=\'' + s.id + '\';window.renderMuavin()" style="display:flex;align-items:center;justify-content:space-between;padding:7px 14px;font-size:11px;cursor:pointer;color:' + (ak ? 'var(--t)' : 'var(--t2)') + ';font-weight:' + (ak ? '500' : '400') + ';background:' + (ak ? 'var(--sf)' : 'transparent') + ';border-left:2px solid ' + (ak ? 'var(--t)' : 'transparent') + '">';
    h += '<span>' + s.lbl + '</span>';
    if (s.badge) h += '<span style="font-size:9px;padding:1px 6px;border-radius:8px;' + (badgeRenkMap[s.badgeRenk] || badgeRenkMap.default) + '">' + s.badge + '</span>';
    h += '</div>';
  });
  h += '</div>';

  /* Onay durumu */
  h += '<div style="padding:10px 12px;border-top:0.5px solid var(--b)">';
  if (onayDurum === 'onaylandi') {
    h += '<div style="font-size:10px;color:#27500A;background:#EAF3DE;padding:5px 8px;border-radius:5px;font-weight:500">✓ Onaylı</div>';
  } else {
    h += '<div style="font-size:10px;color:var(--t3)">Beklemede</div>';
    if (kpi.mSay && kpi.bSay && kpi.farkVar === 0 && kpi.sadeceMuhasebe === 0 && kpi.sadeceBaran === 0) {
      h += '<button onclick="event.stopPropagation();window._mvDonemiOnayla()" style="font-size:10px;padding:5px 8px;border:0.5px solid #3B6D11;border-radius:5px;background:transparent;cursor:pointer;color:#3B6D11;font-family:inherit;margin-top:4px;width:100%">Dönemi Onayla →</button>';
    }
  }
  h += '</div>';
  h += '</div>';
  return h;
}

/* ── ÜST DOSYA YÜKLEME BARI ── */
function _mvUstDosyaBarHTML(meta, donem) {
  var mMeta = (meta[donem] || {}).muhasebeci || {};
  var bMeta = (meta[donem] || {}).baran || {};
  var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--b);border-bottom:0.5px solid var(--b)">';

  /* Muhasebeci */
  h += '<div style="background:var(--sf);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px">';
  h += '<div style="display:flex;align-items:center;gap:8px">';
  if (mMeta.ad) {
    h += '<div style="width:8px;height:8px;border-radius:50%;background:#27500A;flex-shrink:0"></div>';
    h += '<div>';
    h += '<div style="font-size:11px;font-weight:500;color:#27500A">' + window._esc(mMeta.ad) + '</div>';
    h += '<div style="font-size:10px;color:#3B6D11;margin-top:1px">' + (mMeta.satir||0) + ' işlem · ' + (mMeta.boyut||'') + ' · ' + (mMeta.tarih||'') + '</div>';
    h += '</div>';
  } else {
    h += '<div style="width:8px;height:8px;border-radius:50%;background:var(--b);flex-shrink:0"></div>';
    h += '<div style="font-size:11px;color:var(--t3)">Muhasebeci Excel yüklenmedi</div>';
  }
  h += '</div>';
  if (mMeta.ad) {
    h += '<button onclick="(event||window.event||{stopPropagation:function(){}}).stopPropagation();window._mvDosyaKaldir(\'muhasebeci\')" style="font-size:10px;padding:3px 8px;border:0.5px solid #3B6D11;border-radius:4px;background:transparent;cursor:pointer;color:#3B6D11;font-family:inherit;flex-shrink:0">Kaldır</button>';
  } else {
    h += '<label style="font-size:11px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t);font-family:inherit;background:var(--s2);white-space:nowrap;flex-shrink:0">+ Muhasebeci Yükle<input type="file" accept=".xlsx,.xlsm,.csv,.txt" onchange="window._mvDosyaOku(this,\'muhasebeci\')" style="display:none"></label>';
  }
  h += '</div>';

  /* Baran */
  h += '<div style="background:var(--sf);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-left:0.5px solid var(--b)">';
  h += '<div style="display:flex;align-items:center;gap:8px">';
  if (bMeta.ad) {
    h += '<div style="width:8px;height:8px;border-radius:50%;background:#0C447C;flex-shrink:0"></div>';
    h += '<div>';
    h += '<div style="font-size:11px;font-weight:500;color:#0C447C">' + window._esc(bMeta.ad) + '</div>';
    h += '<div style="font-size:10px;color:#185FA5;margin-top:1px">' + (bMeta.satir||0) + ' işlem · ' + (bMeta.boyut||'') + ' · ' + (bMeta.tarih||'') + '</div>';
    h += '</div>';
  } else {
    h += '<div style="width:8px;height:8px;border-radius:50%;background:var(--b);flex-shrink:0"></div>';
    h += '<div style="font-size:11px;color:var(--t3)">Baran Ekstresi yüklenmedi</div>';
  }
  h += '</div>';
  if (bMeta.ad) {
    h += '<button onclick="(event||window.event||{stopPropagation:function(){}}).stopPropagation();window._mvDosyaKaldir(\'baran\')" style="font-size:10px;padding:3px 8px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit;flex-shrink:0">Kaldır</button>';
  } else {
    h += '<label style="font-size:11px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t);font-family:inherit;background:var(--s2);white-space:nowrap;flex-shrink:0">+ Baran Yükle<input type="file" accept=".xlsx,.xlsm,.csv,.txt" onchange="window._mvDosyaOku(this,\'baran\')" style="display:none"></label>';
  }
  h += '</div>';
  h += '<div style="padding:6px 14px;border-top:0.5px solid var(--b);display:flex;align-items:center;gap:8px">';
  h += '<div style="font-size:9px;color:var(--t3);white-space:nowrap">Firma Ad\u0131</div>';
  h += '<input id="mv-firma-adi" value="' + window._esc(bMeta.firmaAdi || '') + '" placeholder="Dosya ad\u0131ndan otomatik al\u0131n\u0131r..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="flex:1;font-size:10px;padding:4px 8px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-family:inherit">';
  h += '</div>';

  h += '</div>';
  return h;
}

/* ── KPI ŞERİDİ HTML ── */
function _mvKpiSeritHTML(kpi) {
  var kartlar = [
    { lbl: 'Muhasebeci', val: kpi.mSay, alt: kpi.mFaturaSay + ' fatura · ' + kpi.mOdemeSay + ' ödeme', renk: 'var(--t)' },
    { lbl: 'Baran', val: kpi.bSay, alt: kpi.bFaturaSay + ' fiş · ' + kpi.bOdemeSay + ' ödeme', renk: 'var(--t)' },
    { lbl: 'Eşleşen', val: kpi.eslesen, alt: kpi.mSay ? Math.round(kpi.eslesen / kpi.mSay * 100) + '% uyum' : '—', renk: '#27500A' },
    { lbl: 'Fark / Uyarı', val: kpi.farkVar + kpi.dovizFark, alt: kpi.dovizFark + ' döviz farkı', renk: '#854F0B' },
    { lbl: 'Sadece Muhasebe', val: kpi.sadeceMuhasebe, alt: 'Ekstrede yok', renk: '#A32D2D' },
    { lbl: 'Sadece Baran', val: kpi.sadeceBaran, alt: 'Muavinde yok', renk: '#633806' }
  ];
  var h = '<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-bottom:0.5px solid var(--b)">';
  kartlar.forEach(function(k, i) {
    h += '<div style="padding:10px 12px;border-right:' + (i < 5 ? '0.5px solid var(--b)' : 'none') + '">';
    h += '<div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.04em;text-transform:uppercase">' + k.lbl + '</div>';
    h += '<div style="font-size:18px;font-weight:500;color:' + k.renk + ';margin-top:2px;line-height:1.2">' + (k.val !== null && k.val !== undefined ? k.val : '—') + '</div>';
    h += '<div style="font-size:9px;color:var(--t3);margin-top:2px">' + k.alt + '</div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

/* \u2500\u2500 KAR\u015eILA\u015eTIRMA SEKMES\u0130 HTML \u2014 Split Panel \u2500\u2500 */
function _mvKarsilastirmaIcerikHTML(kpi, meta, donem) {
  var firmalar = typeof window._mvFirmaListesi === 'function' ? window._mvFirmaListesi() : [];
  var aktifFirma = window._mvAktifFirma || (firmalar.length ? firmalar[0].ad : null);
  window._mvAktifFirma = aktifFirma;
  var aktif = firmalar.find(function(f) { return f.ad === aktifFirma; });
  var mMeta = (meta[donem] || {}).muhasebeci || {};
  var bMeta = (meta[donem] || {}).baran || {};
  if (!mMeta.ad || !bMeta.ad) {
    var h2 = '<div style="padding:40px;text-align:center">';
    h2 += '<div style="font-size:13px;color:var(--t2);font-weight:500;margin-bottom:8px">\u0130ki dosya da y\u00fcklenmeli</div>';
    h2 += '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">Sol panelden Muhasebeci ve Baran Excel dosyalar\u0131n\u0131 y\u00fckleyin</div>';
    if (!mMeta.ad) h2 += '<div style="font-size:11px;color:#A32D2D;margin-bottom:4px">\u2717 Muhasebeci Excel eksik</div>';
    if (!bMeta.ad) h2 += '<div style="font-size:11px;color:#A32D2D">\u2717 Baran Ekstresi eksik</div>';
    h2 += '</div>';
    return h2;
  }
  var h = '<div style="display:flex;height:100%;gap:0">';
  /* Sol: Firma listesi */
  h += '<div style="width:240px;flex-shrink:0;border-right:0.5px solid var(--b);overflow-y:auto">';
  h += '<div style="padding:8px 12px;font-size:9px;font-weight:500;color:var(--t3);border-bottom:0.5px solid var(--b)">' + firmalar.length + ' F\u0130RMA</div>';
  if (!firmalar.length) {
    h += '<div style="padding:20px;text-align:center;font-size:10px;color:var(--t3)">\u00d6nce dosya y\u00fckleyin</div>';
  } else {
    firmalar.forEach(function(f) {
      var secili = f.ad === aktifFirma;
      var renk = f.skor >= 90 ? '#0F6E56' : f.skor >= 70 ? '#854F0B' : '#A32D2D';
      h += '<div onclick="event.stopPropagation();window._mvAktifFirma=\'' + f.ad.replace(/'/g, "\\'") + '\';window._mvKarsilastirmaYenile()" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:0.5px solid var(--b);cursor:pointer;background:' + (secili ? '#E6F1FB' : 'transparent') + ';border-left:' + (secili ? '2px solid #185FA5' : '2px solid transparent') + '">';
      h += '<div style="font-size:10px;font-weight:' + (secili ? '500' : '400') + ';color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">' + window._esc(f.ad) + '</div>';
      h += '<div style="font-size:10px;font-weight:500;color:' + renk + '">%' + f.skor + '</div></div>';
    });
  }
  h += '</div>';
  /* Sa\u011f: Detay */
  h += '<div style="flex:1;overflow-y:auto">';
  h += typeof window._mvFirmaKarsilastirHTML === 'function' ? window._mvFirmaKarsilastirHTML(aktif) : '<div style="padding:40px;text-align:center;color:var(--t3)">Firma se\u00e7in</div>';
  h += '</div></div>';
  return h;
}

window._mvKarsilastirmaYenile = function() {
  var sagEl = document.querySelector('#mv-icerik .mv-sag-icerik') || document.getElementById('mv-icerik');
  if (!sagEl) { window.renderMuavin?.(); return; }
  var kpi = typeof _mvKpiHesapla === 'function' ? _mvKpiHesapla(window._mvSonIslemler || [], window._mvSonIslemlerB || []) : {};
  var meta = typeof _mvMetaLoad === 'function' ? _mvMetaLoad() : {};
  var donem = typeof _mvAktifDonem === 'function' ? _mvAktifDonem() : '';
  window.renderMuavin?.();
};

/* ── MUHASEBE İŞLEMLER SEKMESİ ── */
function _mvMuhasebeIcerikHTML(islemlerM) {
  if (!islemlerM.length) {
    return '<div style="padding:40px;text-align:center"><div style="font-size:13px;color:var(--t2);font-weight:500;margin-bottom:8px">Muhasebeci Excel yüklenmedi</div><div style="font-size:11px;color:var(--t3)">Sol panelden dosya yükleyin</div></div>';
  }
  var h = '<div style="display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<input id="mv-ara-m" placeholder="Cari, fiş no, tarih, tutar ara..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="window._mvAraM(this.value)" style="flex:1;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  h += '<span id="mv-ara-m-sonuc" style="font-size:10px;color:var(--t3);white-space:nowrap"></span>';
  h += '<button onclick="event.stopPropagation();window._mvCSVExport()" style="font-size:10px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">CSV</button>';
  h += '<button onclick="event.stopPropagation();window._mvXLSMExport()" style="font-size:10px;padding:5px 8px;border:0.5px solid #3B6D11;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#3B6D11">Excel</button>';
  h += '<button onclick="event.stopPropagation();window._mvPDFRaporu()" style="font-size:10px;padding:5px 8px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#A32D2D">PDF</button>';
  h += '</div>';
  h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:900px">';
  h += '<thead><tr style="background:var(--s2)">';
  ['TARİH','TİP','FİŞ NO','CARİ ADI','AÇIKLAMA','BORÇ','ALACAK','BAKİYE','B/A','DURUM'].forEach(function(k) {
    h += '<th style="padding:5px 8px;text-align:' + (['BORÇ','ALACAK','BAKİYE'].indexOf(k) !== -1 ? 'right' : 'left') + ';border-bottom:0.5px solid var(--b);font-size:9px;font-weight:500;color:var(--t2);white-space:nowrap">' + k + '</th>';
  });
  h += '</tr></thead>';
  h += '<tbody id="mv-tablo-m">';
  h += window._mvIslemSatirHTML ? window._mvIslemSatirHTML(islemlerM) : '';
  h += '</tbody></table></div>';
  /* Sayfalama placeholder */
  h += '<div id="mv-sayfalama-m" style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-top:0.5px solid var(--b);background:var(--s2)">';
  h += '<span style="font-size:11px;color:var(--t3)">' + islemlerM.length + ' işlem</span>';
  h += '</div>';
  return h;
}

/* ── BARAN EKSTRESI SEKMESİ ── */
function _mvBaranIcerikHTML(islemlerB) {
  if (!islemlerB.length) {
    return '<div style="padding:40px;text-align:center"><div style="font-size:13px;color:var(--t2);font-weight:500;margin-bottom:8px">Baran Ekstresi yüklenmedi</div><div style="font-size:11px;color:var(--t3)">Sol panelden hesap ekstresi dosyasını yükleyin</div></div>';
  }
  var h = '<div style="display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:0.5px solid var(--b)">';
  h += '<input id="mv-ara-b" placeholder="İşlem türü, açıklama, tutar ara..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" oninput="window._mvAraB(this.value)" style="flex:1;font-size:11px;padding:5px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  h += '<span id="mv-ara-b-sonuc" style="font-size:10px;color:var(--t3);white-space:nowrap"></span>';
  h += '</div>';
  h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:900px">';
  h += '<thead><tr style="background:var(--s2)">';
  ['İŞLEM TÜRÜ','TARİH','AÇIKLAMA','FATURA SERİ','FATURA SIRA','BORÇ','BORÇ DÖV','ALACAK','ALACAK DÖV','TL BAKİYE','DURUM'].forEach(function(k) {
    h += '<th style="padding:5px 8px;text-align:' + (['BORÇ','ALACAK','TL BAKİYE'].indexOf(k) !== -1 ? 'right' : 'left') + ';border-bottom:0.5px solid var(--b);font-size:9px;font-weight:500;color:var(--t2);white-space:nowrap">' + k + '</th>';
  });
  h += '</tr></thead>';
  h += '<tbody id="mv-tablo-b">';
  h += window._mvBaranSatirHTML ? window._mvBaranSatirHTML(islemlerB) : '';
  h += '</tbody></table></div>';
  h += '<div style="padding:7px 12px;border-top:0.5px solid var(--b);background:var(--s2);font-size:11px;color:var(--t3)">' + islemlerB.length + ' işlem</div>';
  return h;
}

/* ── NOTLAR SEKMESİ ── */
function _mvNotlarIcerikHTML(donem) {
  var h = '<div style="padding:16px;max-width:700px">';
  h += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  h += '<input id="mv-not-inp" onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\')window._mvNotKaydet()" placeholder="Not ekle — Örn: Q1 2026 · 3 eksik fiş, muhasebeciye iletildi..." style="flex:1;font-size:11px;padding:6px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">';
  h += '<button onclick="event.stopPropagation();window._mvNotKaydet()" style="font-size:11px;padding:6px 14px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Kaydet</button>';
  h += '</div>';
  h += '<div id="mv-not-panel"></div>';
  h += '<div style="margin-top:16px;padding-top:12px;border-top:0.5px solid var(--b)">';
  h += '<button onclick="event.stopPropagation();window._mvTopluMutabakatPDF()" style="font-size:11px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">Toplu Mutabakat Raporu (Tüm Dönemler)</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

/* ── ANA RENDER ── */
window.renderMuavin = function() {
  var panel = document.getElementById('panel-muavin');
  if (!panel) return;
  var donem = _mvAktifDonem();
  var aktifTab = window._mvAktifTab || 'karsilastirma';
  var meta = _mvMetaLoad();
  var mMeta = (meta[donem] || {}).muhasebeci || {};
  var bMeta = (meta[donem] || {}).baran || {};
  var islemlerM = window._mvSonIslemler || [];
  var islemlerB = window._mvSonIslemlerB || [];
  var kpi = _mvKpiHesapla(islemlerM, islemlerB);

  /* Sağ içerik */
  var sagIcerik = '';
  /* Sağ üst başlık */
  var sekmeAdlari = { karsilastirma: 'Kar\u015f\u0131la\u015ft\u0131rma', muhasebeci: 'Muhasebeci Excel', baran: 'Baran Ekstresi', cari: 'Cari \u00d6zet', donem: 'D\u00f6nem Kar\u015f\u0131la\u015ft\u0131rma', 'firma-firma': 'Firma Firma', 'toplu-karsilastir': 'Toplu Kar\u015f.', 'cari-bakiye': 'Cari Bakiye', 'hata-analiz': 'Hata Analizi', notlar: 'Notlar' };
  sagIcerik += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:0.5px solid var(--b)">';
  sagIcerik += '<div>';
  sagIcerik += '<div style="font-size:13px;font-weight:500;color:var(--t)">' + (sekmeAdlari[aktifTab] || aktifTab) + '</div>';
  sagIcerik += '<div style="font-size:10px;color:var(--t3);margin-top:1px">' + donem + (mMeta.ad ? ' · ' + window._esc(mMeta.ad) : '') + '</div>';
  sagIcerik += '</div>';
  sagIcerik += '<div style="display:flex;gap:6px">';
  if (aktifTab === 'karsilastirma' && mMeta.ad && bMeta.ad) {
    sagIcerik += '<button onclick="event.stopPropagation();window._mvEslestir()" style="font-size:11px;padding:5px 12px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Karşılaştır →</button>';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvMutabakatPDFRaporu()" style="font-size:11px;padding:5px 12px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;color:#A32D2D;cursor:pointer;font-family:inherit">PDF Raporu</button>';
  }
  sagIcerik += '</div>';
  sagIcerik += '</div>';

  /* KPI şeridi — her sekmede göster */
  sagIcerik += _mvUstDosyaBarHTML(meta, donem);
  sagIcerik += _mvKpiSeritHTML(kpi);

  /* Sekme içeriği */
  if (aktifTab === 'karsilastirma') sagIcerik += _mvKarsilastirmaIcerikHTML(kpi, meta, donem);
  else if (aktifTab === 'muhasebeci') sagIcerik += _mvMuhasebeIcerikHTML(islemlerM);
  else if (aktifTab === 'baran') sagIcerik += _mvBaranIcerikHTML(islemlerB);
  else if (aktifTab === 'cari') sagIcerik += (window._mvCariOzetHTML ? window._mvCariOzetHTML() : '<div style="padding:40px;text-align:center;color:var(--t3)">Önce Excel yükleyin</div>');
  else if (aktifTab === 'donem') sagIcerik += (window._mvDonemKarsilastirHTML ? window._mvDonemKarsilastirHTML() : '<div style="padding:40px;text-align:center;color:var(--t3)">D\u00f6nem verisi yok</div>');
  else if (aktifTab === 'firma-firma') {
    var _firmalar = typeof window._mvFirmaListesi === 'function' ? window._mvFirmaListesi() : [];
    sagIcerik += '<div style="display:flex;justify-content:flex-end;padding:8px 12px;border-bottom:0.5px solid var(--b)"><button onclick="event.stopPropagation();window._mvFirmaEslestirmeMenuAc?.()" style="font-size:10px;padding:5px 12px;border:0.5px solid #185FA5;border-radius:5px;background:#E6F1FB;cursor:pointer;font-family:inherit;color:#185FA5">\u2194 Firma E\u015fle\u015ftir</button></div>';
    if (!_firmalar.length) { sagIcerik += '<div style="padding:40px;text-align:center;color:var(--t3)">\u00d6nce dosya y\u00fckleyin ve kar\u015f\u0131la\u015ft\u0131r\u0131n</div>'; }
    else { sagIcerik += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:12px">'; _firmalar.forEach(function(f) { var renk = f.skor >= 90 ? '#0F6E56' : f.skor >= 70 ? '#854F0B' : '#A32D2D'; sagIcerik += '<div onclick="event.stopPropagation();window._mvAktifFirma=\'' + f.ad.replace(/'/g, "\\'") + '\';window._mvAktifTab=\'karsilastirma\';window.renderMuavin()" style="border:0.5px solid var(--b);border-radius:8px;padding:12px;cursor:pointer;background:var(--sf)" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'var(--sf)\'"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:12px;font-weight:500;color:var(--t)">' + window._esc(f.ad) + '</div><div style="font-size:18px;font-weight:700;color:' + renk + '">%' + f.skor + '</div></div><div style="display:flex;gap:8px;margin-top:8px;font-size:10px"><span style="color:var(--t3)">' + f.toplam + ' i\u015flem</span><span style="color:#0F6E56">' + (f.toplam - f.fark) + ' mutab\u0131k</span><span style="color:#A32D2D">' + f.fark + ' fark</span></div></div>'; }); sagIcerik += '</div>'; }
  }
  else if (aktifTab === 'toplu-karsilastir') {
    sagIcerik += '<div style="padding:16px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div style="font-size:13px;font-weight:500">Toplu Kar\u015f\u0131la\u015ft\u0131rma</div>';
    sagIcerik += '<div style="display:flex;gap:6px">';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvBirlesikExcelIndir?.()" style="font-size:10px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">\u2b07 Birle\u015fik Excel</button>';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvTopluMutabakatPDF?.()" style="font-size:10px;padding:5px 12px;border:0.5px solid #A32D2D;border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:#A32D2D">\u2399 PDF Raporu</button>';
    sagIcerik += '</div></div>';
    sagIcerik += '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">T\u00fcm firmalar\u0131n mutabakat \u00f6zeti</div>';
    var _tf = typeof window._mvFirmaListesi === 'function' ? window._mvFirmaListesi() : [];
    var _topSkor = _tf.length ? Math.round(_tf.reduce(function(s, f) { return s + f.skor; }, 0) / _tf.length) : 0;
    sagIcerik += '<div style="font-size:28px;font-weight:700;color:' + (_topSkor >= 90 ? '#0F6E56' : _topSkor >= 70 ? '#854F0B' : '#A32D2D') + ';margin-bottom:12px">%' + _topSkor + ' Genel Mutabakat</div>';
    sagIcerik += '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:var(--s2);border-bottom:0.5px solid var(--b)"><th style="padding:6px 8px;text-align:left">Firma</th><th style="padding:6px 8px;text-align:right">Skor</th><th style="padding:6px 8px;text-align:right">Toplam</th><th style="padding:6px 8px;text-align:right">Fark</th></tr></thead><tbody>';
    _tf.forEach(function(f) { var r = f.skor >= 90 ? '#0F6E56' : f.skor >= 70 ? '#854F0B' : '#A32D2D'; sagIcerik += '<tr style="border-bottom:0.5px solid var(--b)"><td style="padding:6px 8px;font-weight:500">' + window._esc(f.ad) + '</td><td style="padding:6px 8px;text-align:right;color:' + r + ';font-weight:500">%' + f.skor + '</td><td style="padding:6px 8px;text-align:right">' + f.toplam + '</td><td style="padding:6px 8px;text-align:right;color:#A32D2D">' + f.fark + '</td></tr>'; });
    sagIcerik += '</tbody></table></div>';
  }
  else if (aktifTab === 'cari-bakiye') {
    sagIcerik += '<div style="padding:16px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div style="font-size:13px;font-weight:500">Cari Bakiye \u00d6zeti</div>';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvBirlesikExcelIndir?.()" style="font-size:10px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">\u2b07 Excel</button></div>';
    sagIcerik += '<div style="font-size:11px;color:var(--t3);margin-bottom:12px">Muhasebeci ve \u015firket verisi aras\u0131ndaki net bakiye fark\u0131</div>';
    var _cf = typeof window._mvFirmaListesi === 'function' ? window._mvFirmaListesi() : [];
    var _topFark = _cf.reduce(function(s, f) { return s + f.sonuc.reduce(function(a, r) { return a + (r.farkTL || 0); }, 0); }, 0);
    sagIcerik += '<div style="font-size:22px;font-weight:700;color:' + (_topFark < 100 ? '#0F6E56' : '#A32D2D') + ';margin-bottom:12px">Toplam Fark: \u20ba' + _topFark.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '</div>';
    sagIcerik += '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:var(--s2);border-bottom:0.5px solid var(--b)"><th style="padding:6px 8px;text-align:left">Firma</th><th style="padding:6px 8px;text-align:right">Muhasebeci TL</th><th style="padding:6px 8px;text-align:right">\u015eirket TL</th><th style="padding:6px 8px;text-align:right">Fark TL</th></tr></thead><tbody>';
    _cf.forEach(function(f) { var muhTL = f.sonuc.reduce(function(s, r) { return s + (r.muhasebeci ? r.muhasebeci.tutarTL : 0); }, 0); var sirTL = f.sonuc.reduce(function(s, r) { return s + (r.sirket ? r.sirket.tutarTL : 0); }, 0); var fark = Math.abs(muhTL - sirTL); sagIcerik += '<tr style="border-bottom:0.5px solid var(--b)"><td style="padding:6px 8px;font-weight:500">' + window._esc(f.ad) + '</td><td style="padding:6px 8px;text-align:right">' + muhTL.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '</td><td style="padding:6px 8px;text-align:right">' + sirTL.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '</td><td style="padding:6px 8px;text-align:right;color:' + (fark < 1 ? '#0F6E56' : '#A32D2D') + '">' + fark.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '</td></tr>'; });
    sagIcerik += '</tbody></table></div>';
  }
  else if (aktifTab === 'hata-analiz') {
    sagIcerik += '<div style="padding:12px">';
    sagIcerik += '<div style="display:flex;gap:8px;margin-bottom:12px;justify-content:flex-end">';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvHataKategoriHTML&&window.renderMuavin()" style="font-size:10px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">↺ Yenile</button>';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvOnlemRaporuPDF()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:#A32D2D;color:#fff;cursor:pointer;font-family:inherit">⎙ Önlem Raporu PDF</button>';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvMuhasebeciyeGonderPDF()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit">📤 Muhasebeciye Gönder</button>';
    sagIcerik += '<button onclick="event.stopPropagation();window._mvIcMuhasebeRaporuPDF()" style="font-size:10px;padding:5px 12px;border:none;border-radius:5px;background:#111;color:#fff;cursor:pointer;font-family:inherit">📋 İç Muhasebe Aksiyon</button>';
    sagIcerik += '</div>';
    sagIcerik += (window._mvHataKategoriHTML ? window._mvHataKategoriHTML() : '<div style="padding:40px;text-align:center;color:var(--t3)">Önce her iki Excel\'i yükleyin</div>');
    sagIcerik += '</div>';
  }
  else if (aktifTab === 'notlar') sagIcerik += _mvNotlarIcerikHTML(donem);

  /* Ana yapı: Sol nav + Sağ içerik */
  var h = '<div style="display:flex;min-height:600px">';
  h += _mvSolNavHTML(donem, aktifTab, meta, islemlerM, islemlerB);
  h += '<div style="flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden">';
  h += sagIcerik;
  h += '</div></div>';

  panel.innerHTML = h;

  setTimeout(function() {
    window._mvNotPanelGuncelle && window._mvNotPanelGuncelle();
  }, 50);
};

/* ── Dosya kaldır ── */
window._mvYuklemeBaslat = function(taraf) {
  var meta = _mvMetaLoad();
  var donem = _mvAktifDonem();
  if (!meta[donem]) meta[donem] = {};
  meta[donem][taraf] = { ad: 'Yükleniyor...', satir: 0, tarih: '', boyut: '' };
  _mvMetaStore(meta);
  window.renderMuavin && window.renderMuavin();
};

window._mvDosyaKaldir = function(taraf) {
  var donem = _mvAktifDonem();
  window.confirmModal?.('\u201c' + taraf + '\u201d dosyas\u0131 kald\u0131r\u0131lacak. E\u015fle\u015ftirme sonu\u00e7lar\u0131 da s\u0131f\u0131rlanacak.', {
    title: 'Dosyay\u0131 kald\u0131r', danger: true, confirmText: 'Kald\u0131r',
    onConfirm: function() {
      var meta = _mvMetaLoad();
      if (!meta[donem]) meta[donem] = {};
      if (taraf === 'muhasebeci') { delete meta[donem].muhasebeci; window._mvSonIslemler = []; }
      if (taraf === 'baran') { delete meta[donem].baran; window._mvSonIslemlerB = []; }
      window._mvEslesmeSonucu = null;
      _mvMetaStore(meta);
      window.toast?.('Dosya kald\u0131r\u0131ld\u0131', 'ok');
      window.renderMuavin();
    }
  });
};

/* ── Dönem onayla ── */
window._mvDonemiOnayla = function() {
  var donem = _mvAktifDonem();
  window.confirmModal?.(donem + ' d\u00f6nemi i\u00e7in mutabakat onaylanacak. Bu i\u015flem kaydedilecek.', {
    title: 'D\u00f6nemi Onayla', confirmText: 'Onayla',
    onConfirm: function() {
      var meta = _mvMetaLoad();
      if (!meta[donem]) meta[donem] = {};
      meta[donem].onay = 'onaylandi';
      meta[donem].onayTarih = new Date().toISOString();
      meta[donem].onayKisi = window.CU?.() ? (window.CU().name || window.CU().email || '') : '';
      _mvMetaStore(meta);
      window.toast?.(donem + ' onayland\u0131 \u2713', 'ok');
      window.renderMuavin();
    }
  });
};

/* ── Arama: Muhasebeci ── */
window._mvAraM = function(deger) {
  var tbody = document.getElementById('mv-tablo-m');
  var sonuc = document.getElementById('mv-ara-m-sonuc');
  if (!tbody) return;
  var islemler = window._mvSonIslemler || [];
  if (!deger.trim()) {
    tbody.innerHTML = window._mvIslemSatirHTML ? window._mvIslemSatirHTML(islemler) : '';
    if (sonuc) sonuc.textContent = '';
    return;
  }
  var f = deger.toLowerCase();
  var filtre = islemler.filter(function(i) {
    return (i.cariAd || '').toLowerCase().indexOf(f) !== -1 ||
      (i.fisNo || '').toLowerCase().indexOf(f) !== -1 ||
      (i.aciklama || '').toLowerCase().indexOf(f) !== -1 ||
      String(i.borc || '').indexOf(f) !== -1 ||
      String(i.alacak || '').indexOf(f) !== -1 ||
      (i.tarih || '').indexOf(f) !== -1;
  });
  tbody.innerHTML = window._mvIslemSatirHTML ? window._mvIslemSatirHTML(filtre) : '';
  if (sonuc) sonuc.textContent = filtre.length + ' sonuç';
};

/* ── Arama: Baran ── */
window._mvAraB = function(deger) {
  var tbody = document.getElementById('mv-tablo-b');
  var sonuc = document.getElementById('mv-ara-b-sonuc');
  if (!tbody) return;
  var islemler = window._mvSonIslemlerB || [];
  if (!deger.trim()) {
    tbody.innerHTML = window._mvBaranSatirHTML ? window._mvBaranSatirHTML(islemler) : '';
    if (sonuc) sonuc.textContent = '';
    return;
  }
  var f = deger.toLowerCase();
  var filtre = islemler.filter(function(i) {
    return (i.aciklama || '').toLowerCase().indexOf(f) !== -1 ||
      (i.islemTuru || '').toLowerCase().indexOf(f) !== -1 ||
      (i.faturaSira || '').toLowerCase().indexOf(f) !== -1 ||
      String(i.borcMeblağ || '').indexOf(f) !== -1 ||
      String(i.alacakMeblağ || '').indexOf(f) !== -1;
  });
  tbody.innerHTML = window._mvBaranSatirHTML ? window._mvBaranSatirHTML(filtre) : '';
  if (sonuc) sonuc.textContent = filtre.length + ' sonuç';
};

console.log('[MUAVİN] v3.0 B-layout yüklendi');
