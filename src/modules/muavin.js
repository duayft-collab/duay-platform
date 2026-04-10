'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/muavin.js — Muavin Defter Kontrol Modülü
   İki Excel karşılaştırma: Muhasebeci ↔ Baran
   B Layout: Sol nav + sağ içerik
   v3.0.0 (2026-04-09) — T3-MV-001: Tam yeniden tasarım
════════════════════════════════════════════════════════════════ */

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
  var yil = new Date().getFullYear();
  var sonuclar = [];
  [yil, yil - 1].forEach(function(y) {
    ['Q1','Q2','Q3','Q4'].forEach(function(q) { sonuclar.push(y + q); });
  });
  return sonuclar;
}
function _mvDonemEtiket(d) {
  var yil = d.slice(0, 4);
  var q = d.slice(4);
  var aylar = { Q1: 'Oca–Mar', Q2: 'Nis–Haz', Q3: 'Tem–Eyl', Q4: 'Eki–Ara' };
  return yil + ' ' + q + ' · ' + (aylar[q] || '');
}

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
    h += '<button onclick="event.stopPropagation();window._mvDosyaKaldir(\'muhasebeci\')" style="font-size:10px;padding:3px 8px;border:0.5px solid #3B6D11;border-radius:4px;background:transparent;cursor:pointer;color:#3B6D11;font-family:inherit;flex-shrink:0">Kaldır</button>';
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
    h += '<button onclick="event.stopPropagation();window._mvDosyaKaldir(\'baran\')" style="font-size:10px;padding:3px 8px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit;flex-shrink:0">Kaldır</button>';
  } else {
    h += '<label style="font-size:11px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t);font-family:inherit;background:var(--s2);white-space:nowrap;flex-shrink:0">+ Baran Yükle<input type="file" accept=".xlsx,.xlsm,.csv,.txt" onchange="window._mvDosyaOku(this,\'baran\')" style="display:none"></label>';
  }
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

/* ── KARŞILAŞTIRMA SEKMESİ HTML ── */
function _mvKarsilastirmaIcerikHTML(kpi, meta, donem) {
  var mMeta = (meta[donem] || {}).muhasebeci || {};
  var bMeta = (meta[donem] || {}).baran || {};
  var h = '';
  if (!mMeta.ad || !bMeta.ad) {
    h += '<div style="padding:40px;text-align:center">';
    h += '<div style="font-size:13px;color:var(--t2);font-weight:500;margin-bottom:8px">İki dosya da yüklenmeli</div>';
    h += '<div style="font-size:11px;color:var(--t3);margin-bottom:16px">Sol panelden Muhasebeci ve Baran Excel dosyalarını yükleyin</div>';
    if (!mMeta.ad) h += '<div style="font-size:11px;color:#A32D2D;margin-bottom:4px">✗ Muhasebeci Excel eksik</div>';
    if (!bMeta.ad) h += '<div style="font-size:11px;color:#A32D2D">✗ Baran Ekstresi eksik</div>';
    h += '</div>';
    return h;
  }
  /* Dosya özet başlığı */
  h += '<div style="display:flex;gap:12px;padding:12px;background:var(--s2);border-bottom:0.5px solid var(--b)">';
  h += '<div style="flex:1;border:0.5px solid #97C459;border-radius:6px;padding:8px 10px;background:#EAF3DE">';
  h += '<div style="font-size:9px;font-weight:500;color:#27500A;text-transform:uppercase;letter-spacing:.04em">Muhasebeci Excel</div>';
  h += '<div style="font-size:11px;font-weight:500;color:#0C3A1E;margin-top:2px">' + window._esc(mMeta.ad) + '</div>';
  h += '<div style="font-size:10px;color:#3B6D11;margin-top:2px">' + mMeta.satir + ' işlem · ' + mMeta.tarih + ' · ' + mMeta.boyut + '</div>';
  h += '</div>';
  h += '<div style="display:flex;align-items:center;font-size:18px;color:var(--t3)">↔</div>';
  h += '<div style="flex:1;border:0.5px solid #85B7EB;border-radius:6px;padding:8px 10px;background:#E6F1FB">';
  h += '<div style="font-size:9px;font-weight:500;color:#0C447C;text-transform:uppercase;letter-spacing:.04em">Baran Ekstresi</div>';
  h += '<div style="font-size:11px;font-weight:500;color:#042C53;margin-top:2px">' + window._esc(bMeta.ad) + '</div>';
  h += '<div style="font-size:10px;color:#185FA5;margin-top:2px">' + bMeta.satir + ' işlem · ' + bMeta.tarih + ' · ' + bMeta.boyut + '</div>';
  h += '</div>';
  h += '<div style="display:flex;align-items:center">';
  h += '<button onclick="event.stopPropagation();window._mvEslestir()" style="font-size:11px;padding:8px 16px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Karşılaştır →</button>';
  h += '</div>';
  h += '</div>';
  /* Sonuç tablosu */
  if (window._mvEslesmeSonucu) {
    h += window._mvEslesmeSonucHTML ? window._mvEslesmeSonucHTML() : '<div style="padding:20px;text-align:center;color:var(--t3);font-size:11px">Sonuç yükleniyor...</div>';
  } else {
    h += '<div style="padding:40px;text-align:center;color:var(--t3);font-size:11px">Her iki dosyayı yükledikten sonra "Karşılaştır" butonuna basın</div>';
  }
  return h;
}

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
  var sekmeAdlari = { karsilastirma: 'Karşılaştırma', muhasebeci: 'Muhasebeci Excel', baran: 'Baran Ekstresi', cari: 'Cari Özet', donem: 'Dönem Karşılaştırma', notlar: 'Notlar' };
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
  else if (aktifTab === 'donem') sagIcerik += (window._mvDonemKarsilastirHTML ? window._mvDonemKarsilastirHTML() : '<div style="padding:40px;text-align:center;color:var(--t3)">Dönem verisi yok</div>');
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
  window.confirmModal('Dosyayı kaldır', '"' + taraf + '" dosyası kaldırılacak. Eşleştirme sonuçları da sıfırlanacak.', function() {
    var meta = _mvMetaLoad();
    if (!meta[donem]) meta[donem] = {};
    if (taraf === 'muhasebeci') { delete meta[donem].muhasebeci; window._mvSonIslemler = []; }
    if (taraf === 'baran') { delete meta[donem].baran; window._mvSonIslemlerB = []; }
    window._mvEslesmeSonucu = null;
    _mvMetaStore(meta);
    window.toast && window.toast('Dosya kaldırıldı', 'ok');
    window.renderMuavin();
  });
};

/* ── Dönem onayla ── */
window._mvDonemiOnayla = function() {
  var donem = _mvAktifDonem();
  window.confirmModal('Dönemi Onayla', donem + ' dönemi için mutabakat onaylanacak. Bu işlem kaydedilecek.', function() {
    var meta = _mvMetaLoad();
    if (!meta[donem]) meta[donem] = {};
    meta[donem].onay = 'onaylandi';
    meta[donem].onayTarih = new Date().toLocaleString('tr-TR');
    meta[donem].onayKisi = window.CU && window.CU() ? (window.CU().name || window.CU().email || '') : '';
    _mvMetaStore(meta);
    window.toast && window.toast(donem + ' onaylandı ✓', 'ok');
    window.renderMuavin();
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
