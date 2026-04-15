'use strict';
/* ═══════════════════════════════════════════════════════════════
   src/modules/muavin.js — Muavin Defter Kontrol Modülü
   İki Excel karşılaştırma: Muhasebeci ↔ Baran
   B Layout: Sol nav + sağ içerik
   v3.0.0 (2026-04-09) — T3-MV-001: Tam yeniden tasarım
════════════════════════════════════════════════════════════════ */

var _esc = window._esc;
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
    /* MUAVIN-ONAY-NOT-001: onay badge — tooltip ile kim/ne zaman/not */
    var _onayTitle = '';
    if (dMeta.onay === 'onaylandi') {
      _onayTitle = (dMeta.onayKisi || 'Bilinmiyor') + ' · ' + (dMeta.onayTarih ? dMeta.onayTarih.slice(0,10) : '');
      if (dMeta.onayNotu) _onayTitle += ' · ' + dMeta.onayNotu;
    }
    var onayBadge = dMeta.onay === 'onaylandi' ? ' <span title="' + _onayTitle + '" style="cursor:help">✓</span>' : '';
    /* MUAVIN-DONEM-BADGE-001: yüklü dönem badge (yeşil onaylı / mavi 2 dosya / turuncu 1 dosya / boş) */
    var muhVar = !!(dMeta.muhasebeci && dMeta.muhasebeci.ad);
    var barVar = !!(dMeta.baran && dMeta.baran.ad);
    var onayVar = !!(dMeta.onayTarih);
    var donemBadge = onayVar ? ' <span style="font-size:7px;padding:0 3px;background:#16A34A;color:#fff;border-radius:2px">✓</span>'
      : (muhVar && barVar) ? ' <span style="font-size:7px;padding:0 3px;background:#185FA5;color:#fff;border-radius:2px">2</span>'
      : (muhVar || barVar) ? ' <span style="font-size:7px;padding:0 3px;background:#D97706;color:#fff;border-radius:2px">1</span>'
      : '';
    h += '<button onclick="event.stopPropagation();window._mvDonem=\'' + d + '\';window.renderMuavin()" style="display:block;width:100%;text-align:left;font-size:11px;padding:5px 8px;border-radius:5px;border:' + (ak ? '0.5px solid var(--b)' : 'none') + ';background:' + (ak ? 'var(--sf)' : 'transparent') + ';cursor:pointer;color:' + (ak ? 'var(--t)' : 'var(--t2)') + ';font-family:inherit;margin-bottom:2px;font-weight:' + (ak ? '500' : '400') + '">' + d.slice(0, 4) + ' ' + d.slice(4) + donemBadge + onayBadge + '</button>';
  });
  h += '</div>';

  /* Sekme listesi */
  var sekmeler = [
    { id: 'karsilastirma', lbl: 'Karşılaştırma', badge: (kpi.farkVar + kpi.sadeceMuhasebe + kpi.sadeceBaran) || null, badgeRenk: 'warn' },
    { id: 'muhasebeci', lbl: 'Muhasebeci Excel', badge: kpi.mSay || null, badgeRenk: 'ok' },
    /* MUAVIN-ORTAK-EXCEL-SEKME-001: birleşik export kısayol sekmesi */
    { id: 'ortak-excel', lbl: 'Ortak Excel', badge: null, badgeRenk: 'ok' },
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
    /* MUAVIN-SAFARI-BTN-001: inline stopPropagation yerine event arg olarak geçir, fonksiyon içinde guarded call */
    h += '<button onclick="window._mvDosyaKaldir(\'muhasebeci\', event)" style="font-size:10px;padding:3px 8px;border:0.5px solid #3B6D11;border-radius:4px;background:transparent;cursor:pointer;color:#3B6D11;font-family:inherit;flex-shrink:0">Kaldır</button>';
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
    h += '<button onclick="window._mvDosyaKaldir(\'baran\', event)" style="font-size:10px;padding:3px 8px;border:0.5px solid #185FA5;border-radius:4px;background:transparent;cursor:pointer;color:#185FA5;font-family:inherit;flex-shrink:0">Kaldır</button>';
  } else {
    h += '<label style="font-size:11px;padding:5px 12px;border:0.5px solid var(--b);border-radius:5px;cursor:pointer;color:var(--t);font-family:inherit;background:var(--s2);white-space:nowrap;flex-shrink:0">+ Baran Yükle<input type="file" accept=".xlsx,.xlsm,.csv,.txt" onchange="window._mvDosyaOku(this,\'baran\')" style="display:none"></label>';
  }
  h += '</div>';
  /* MUAVIN-FIRMAADI-ZORUNLU-001: Zorunlu etiketi + boşsa kırmızı border görsel vurgu */
  h += '<div style="padding:6px 14px;border-top:0.5px solid var(--b);display:flex;align-items:center;gap:8px">';
  h += '<div style="font-size:9px;color:var(--t3);white-space:nowrap">Firma Ad\u0131 (zorunlu) *</div>';
  var _firmaBosMu = !(bMeta.firmaAdi || '').trim();
  h += '<input id="mv-firma-adi" value="' + window._esc(bMeta.firmaAdi || '') + '" placeholder="Baran exceline ait firma ad\u0131n\u0131 yaz\u0131n \u2014 zorunlu" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="flex:1;font-size:10px;padding:4px 8px;border:0.5px solid ' + (_firmaBosMu ? '#DC2626' : 'var(--b)') + ';border-radius:4px;background:' + (_firmaBosMu ? '#FCEBEB' : 'var(--s2)') + ';color:var(--t);font-family:inherit">';
  h += '</div>';

  h += '</div>';

  /* MUAVIN-BIRLESIK-CARI-EXCEL-001: İki dosyadan biri yüklüyse Birleştirilmiş Excel butonu */
  if (mMeta.ad || bMeta.ad) {
    h += '<div style="padding:6px 12px;border-top:0.5px solid var(--b)">'
      + '<button onclick="event.stopPropagation();window._mvBirlesikCariExcelIndir?.()" style="width:100%;font-size:10px;padding:5px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t2);cursor:pointer;font-family:inherit;text-align:left">'
      + '\u2193 Birle\u015ftirilmi\u015f Excel (Cari Adl\u0131)'
      + '</button></div>';
  }
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
  /* MUAVIN-FARK-BANNER-001: Karşılaştırma sonucu büyük renkli fark özeti banner */
  var h = '';
  var eslesen = window._mvEslesmeSonucu;
  if (eslesen) {
    var farkSay = (eslesen.farkVar||[]).length + (eslesen.sadeceMuhasebe||[]).length + (eslesen.sadeceBaran||[]).length;
    var eslesenSay = (eslesen.eslesen||[]).length;
    var toplamSay = farkSay + eslesenSay;
    var farkTL = (eslesen.farkVar||[]).reduce(function(s,r){ return s+Math.abs((r.muhasebeci?r.muhasebeci.tutarTL:0)-(r.sirket?r.sirket.tutarTL:0)); }, 0);
    var oran = toplamSay ? Math.round(eslesenSay/toplamSay*100) : 0;
    /* MUAVIN-FARK-ESIK-001: TL bazlı renk eşiği — 10.000₺+ = kırmızı alarm, 1.000₺+ = sarı uyarı */
    var _buyukFark = farkTL >= 10000;
    var _ortaFark  = farkTL >= 1000 && farkTL < 10000;
    var bannerRenk = farkSay===0 ? '#EAF3DE' : (_buyukFark || farkSay>3) ? '#FCEBEB' : (_ortaFark || farkSay<=3) ? '#FAEEDA' : '#FAEEDA';
    var textRenk   = farkSay===0 ? '#3B6D11' : (_buyukFark || farkSay>3) ? '#A32D2D' : '#854F0B';
    h += '<div style="margin:12px;padding:14px 18px;background:'+bannerRenk+';border-radius:8px;border:0.5px solid '+textRenk+'40">'
      + '<div style="display:flex;align-items:center;justify-content:space-between">'
      + '<div>'
      + '<div style="font-size:13px;font-weight:600;color:'+textRenk+'">'
      + (farkSay===0 ? 'Tam mutabakat — tüm işlemler eşleşiyor' : farkSay+' fark tespit edildi')
      + '</div>'
      + '<div style="font-size:11px;color:'+textRenk+';margin-top:3px;opacity:.8">'
      + eslesenSay+'/'+toplamSay+' işlem eşleşti (%'+oran+')'
      + (farkTL>0 ? ' · <strong>'+Math.round(farkTL).toLocaleString('tr-TR')+' ₺</strong> açıklanamayan fark' + (_buyukFark ? ' ⚠' : '') : '')
      + '</div>'
      + '</div>'
      + '<div style="font-size:28px;font-weight:700;color:'+textRenk+'">%'+oran+'</div>'
      + '</div>'
      + (farkSay===0 ? '' : '<div style="font-size:10px;color:'+textRenk+';margin-top:8px;display:flex;gap:16px">'
      + '<span>Sadece Muhasebeci: <strong>'+(eslesen.sadeceMuhasebe||[]).length+'</strong></span>'
      + '<span>Sadece Baran: <strong>'+(eslesen.sadeceBaran||[]).length+'</strong></span>'
      + '<span>Tutar Farkı: <strong>'+(eslesen.farkVar||[]).length+'</strong></span>'
      + '</div>')
      + '</div>';
  }
  h += '<div style="display:flex;height:100%;gap:0">';
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
  /* MUAVIN-KOLON-UNIF-001: 12-kolon unified başlık (muhasebeci + baran aynı) */
  var _muhasKolonlar = ['TARİH','TİP','EŞLEŞME NO','AÇIKLAMA','TL BORÇ','TL ALACAK','DÖVİZ TUTAR','CİNS','TCMB ALIŞ','TCMB SATIŞ','CARİ ADI','DURUM'];
  _muhasKolonlar.forEach(function(k) {
    var sag = ['TL BORÇ','TL ALACAK','DÖVİZ TUTAR','TCMB ALIŞ','TCMB SATIŞ'].indexOf(k) !== -1;
    h += '<th style="padding:5px 8px;text-align:'+(sag?'right':'left')+';border-bottom:0.5px solid var(--b);font-size:9px;font-weight:500;color:var(--t2);white-space:nowrap">'+k+'</th>';
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
  /* MUAVIN-KOLON-UNIF-001: 12-kolon unified başlık (muhasebeci + baran aynı) */
  var _baranKolonlar = ['TARİH','TİP','EŞLEŞME NO','AÇIKLAMA','TL BORÇ','TL ALACAK','DÖVİZ TUTAR','CİNS','TCMB ALIŞ','TCMB SATIŞ','CARİ ADI','DURUM'];
  _baranKolonlar.forEach(function(k) {
    var sag = ['TL BORÇ','TL ALACAK','DÖVİZ TUTAR','TCMB ALIŞ','TCMB SATIŞ'].indexOf(k) !== -1;
    h += '<th style="padding:5px 8px;text-align:'+(sag?'right':'left')+';border-bottom:0.5px solid var(--b);font-size:9px;font-weight:500;color:var(--t2);white-space:nowrap">'+k+'</th>';
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

  /* MUAVIN-SIHIRBAZ-001: dosya yüklenmemişse adım adım kurulum ekranı göster */
  var ikisiDeBos = !mMeta.ad && !bMeta.ad;
  if (ikisiDeBos) {
    var sihirbazHTML = '<div style="padding:40px 20px;max-width:480px;margin:0 auto">'
      + '<div style="font-size:16px;font-weight:600;color:var(--t);margin-bottom:6px">Muavin Defter Kontrolü</div>'
      + '<div style="font-size:12px;color:var(--t3);margin-bottom:24px">Muhasebeci ve şirket kayıtlarını karşılaştırmak için 3 adımı tamamlayın.</div>'
      + '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<div style="padding:14px 16px;border:0.5px solid var(--b);border-radius:8px;background:var(--sf);display:flex;align-items:center;gap:12px">'
      + '<div style="width:24px;height:24px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">1</div>'
      + '<div><div style="font-size:12px;font-weight:500;color:var(--t)">Dönem seç</div><div style="font-size:10px;color:var(--t3)">Sol panelden yıl veya çeyrek dönem seçin</div></div>'
      + '<div style="margin-left:auto;font-size:10px;padding:3px 8px;background:#EAF3DE;color:#3B6D11;border-radius:4px">Tamamlandı</div>'
      + '</div>'
      + '<div style="padding:14px 16px;border:0.5px solid var(--ac);border-radius:8px;background:#E6F1FB;display:flex;align-items:center;gap:12px">'
      + '<div style="width:24px;height:24px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">2</div>'
      + '<div style="flex:1"><div style="font-size:12px;font-weight:500;color:#185FA5">Muhasebeci dosyasını yükle</div><div style="font-size:10px;color:#185FA5;opacity:.7">Muhasebeciden aldığınız Excel veya CSV dosyası</div></div>'
      + '<label style="font-size:10px;padding:5px 10px;border:none;border-radius:5px;background:var(--ac);color:#fff;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0">+ Yükle<input type="file" accept=".xlsx,.xlsm,.csv,.txt" onchange="window._mvDosyaOku(this,\'muhasebeci\')" style="display:none"></label>'
      + '</div>'
      + '<div style="padding:14px 16px;border:0.5px solid var(--b);border-radius:8px;background:var(--sf);display:flex;align-items:center;gap:12px;opacity:.6">'
      + '<div style="width:24px;height:24px;border-radius:50%;background:var(--b);color:var(--t3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">3</div>'
      + '<div><div style="font-size:12px;font-weight:500;color:var(--t)">Baran ekstresini yükle</div><div style="font-size:10px;color:var(--t3)">Şirket banka/ekstre verisi</div></div>'
      + '</div>'
      + '</div></div>';
    var _hWiz = '<div style="display:flex;min-height:600px">';
    _hWiz += _mvSolNavHTML(donem, aktifTab, meta, islemlerM, islemlerB);
    _hWiz += '<div style="flex:1;overflow-y:auto">' + sihirbazHTML + '</div>';
    _hWiz += '</div>';
    panel.innerHTML = _hWiz;
    return;
  }

  /* Sağ içerik */
  var sagIcerik = '';
  /* Sağ üst başlık */
  var sekmeAdlari = { karsilastirma: 'Kar\u015f\u0131la\u015ft\u0131rma', muhasebeci: 'Muhasebeci Excel', 'ortak-excel': 'Ortak Excel', baran: 'Baran Ekstresi', cari: 'Cari \u00d6zet', donem: 'D\u00f6nem Kar\u015f\u0131la\u015ft\u0131rma', 'firma-firma': 'Firma Firma', 'toplu-karsilastir': 'Toplu Kar\u015f.', 'cari-bakiye': 'Cari Bakiye', 'hata-analiz': 'Hata Analizi', notlar: 'Notlar' };
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
  /* MUAVIN-ORTAK-EXCEL-VIEW-001: cari filtre + TL/Döviz KPI + işlem tablosu + MB alış/satış */
  else if (aktifTab === 'ortak-excel') {
    var _d = meta[donem] || {};
    var _muhArr = (_d.muhasebeci || {}).normalArr || window._mvSonIslemler || [];
    var _barArr = (_d.baran || {}).normalArr || window._mvSonIslemlerB || [];
    var _tumArr = _muhArr.map(function(i){ return Object.assign({}, i, {_kaynak:'Muhasebeci'}); })
      .concat(_barArr.map(function(i){ return Object.assign({}, i, {_kaynak:'Baran'}); }));
    /* Cari listesi — count map */
    var _cariSet = {};
    _tumArr.forEach(function(i){ var c = i.firma || i.cariAd || i.firmaAdi || '—'; _cariSet[c] = (_cariSet[c] || 0) + 1; });
    var _cariList = Object.keys(_cariSet).sort();
    /* Filtre state */
    var _aktifCari = window._mvOrtakCariFiltre || '';
    var _kurTip = window._mvOrtakKurTip || 'alis';
    var _filtreArr = _aktifCari ? _tumArr.filter(function(i){ return (i.firma || i.cariAd || i.firmaAdi || '—') === _aktifCari; }) : _tumArr;
    /* Toplamlar */
    var _tlBorc = 0, _tlAlacak = 0, _dovizMap = {};
    _filtreArr.forEach(function(i) {
      _tlBorc += parseFloat(i.borc || i.borcMeblagh || i.borcMeblag || (i.tip === 'borc' ? i.tutarTL : 0) || 0) || 0;
      _tlAlacak += parseFloat(i.alacak || i.alacakMeblagh || i.alacakMeblag || (i.tip === 'alacak' ? i.tutarTL : 0) || 0) || 0;
      var dc = i.dovizCinsi || i.borcDoviz || 'TRY';
      if (dc && dc !== 'TRY' && dc !== 'TRL') {
        if (!_dovizMap[dc]) _dovizMap[dc] = { borc: 0, alacak: 0, kur: 0 };
        _dovizMap[dc].borc += parseFloat(i.borcMeblagh || i.borcMeblag || 0) || 0;
        _dovizMap[dc].alacak += parseFloat(i.alacakMeblagh || i.alacakMeblag || 0) || 0;
        _dovizMap[dc].kur = parseFloat(_kurTip === 'alis' ? (i.kurAlis || 0) : (i.kurSatis || 0)) || 0;
      }
    });
    var _tlNet = _tlAlacak - _tlBorc;
    var _esc = window._esc || function(s) { return String(s || ''); };

    sagIcerik += '<div style="padding:0">'
      /* Filtre bar */
      + '<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:0.5px solid var(--b);flex-wrap:wrap">'
      + '<select onchange="event.stopPropagation();window._mvOrtakCariFiltre=this.value;window.renderMuavin()" onclick="event.stopPropagation()" style="padding:5px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-size:11px;font-family:inherit;min-width:180px">'
      + '<option value="">Tüm Cariler (' + _cariList.length + ')</option>'
      + _cariList.map(function(c) { return '<option value="' + _esc(c) + '"' + (c === _aktifCari ? ' selected' : '') + '>' + _esc(c) + ' (' + _cariSet[c] + ')</option>'; }).join('')
      + '</select>'
      + '<div style="display:flex;align-items:center;gap:6px;margin-left:auto">'
      + '<span style="font-size:10px;color:var(--t3)">Kur:</span>'
      + '<button onclick="event.stopPropagation();window._mvOrtakKurTip=\'alis\';window.renderMuavin()" style="padding:4px 10px;border-radius:5px;border:0.5px solid var(--b);font-size:10px;cursor:pointer;font-family:inherit;background:' + (_kurTip === 'alis' ? 'var(--t)' : 'transparent') + ';color:' + (_kurTip === 'alis' ? 'var(--sf)' : 'var(--t2)') + '">MB Alış</button>'
      + '<button onclick="event.stopPropagation();window._mvOrtakKurTip=\'satis\';window.renderMuavin()" style="padding:4px 10px;border-radius:5px;border:0.5px solid var(--b);font-size:10px;cursor:pointer;font-family:inherit;background:' + (_kurTip === 'satis' ? 'var(--t)' : 'transparent') + ';color:' + (_kurTip === 'satis' ? 'var(--sf)' : 'var(--t2)') + '">MB Satış</button>'
      + '<button onclick="event.stopPropagation();window._mvBirlesikCariExcelIndir?.()" style="padding:4px 12px;border-radius:5px;border:none;background:#111;color:#fff;font-size:10px;cursor:pointer;font-family:inherit">↓ Excel</button>'
      + '</div></div>'
      /* KPI bar */
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0;border-bottom:0.5px solid var(--b)">'
      + '<div style="padding:10px 16px;border-right:0.5px solid var(--b)"><div style="font-size:9px;color:var(--t3)">TL BORÇ</div><div style="font-size:16px;font-weight:500;color:#A32D2D;font-family:monospace">' + _tlBorc.toLocaleString('tr-TR', {maximumFractionDigits: 2}) + '</div></div>'
      + '<div style="padding:10px 16px;border-right:0.5px solid var(--b)"><div style="font-size:9px;color:var(--t3)">TL ALACAK</div><div style="font-size:16px;font-weight:500;color:#27500A;font-family:monospace">' + _tlAlacak.toLocaleString('tr-TR', {maximumFractionDigits: 2}) + '</div></div>'
      + '<div style="padding:10px 16px;border-right:0.5px solid var(--b)"><div style="font-size:9px;color:var(--t3)">NET BAKİYE</div><div style="font-size:16px;font-weight:500;color:' + (_tlNet >= 0 ? '#27500A' : '#A32D2D') + ';font-family:monospace">' + (_tlNet >= 0 ? '+' : '') + _tlNet.toLocaleString('tr-TR', {maximumFractionDigits: 2}) + '</div></div>'
      + Object.keys(_dovizMap).map(function(cur) {
          var v = _dovizMap[cur];
          var net = v.alacak - v.borc;
          return '<div style="padding:10px 16px;border-right:0.5px solid var(--b)"><div style="font-size:9px;color:var(--t3)">' + _esc(cur) + ' NET' + (v.kur ? ' (₺' + v.kur + ')' : '') + '</div><div style="font-size:16px;font-weight:500;color:' + (net >= 0 ? '#27500A' : '#A32D2D') + ';font-family:monospace">' + (net >= 0 ? '+' : '') + net.toLocaleString('tr-TR', {maximumFractionDigits: 2}) + '</div></div>';
        }).join('')
      + '<div style="padding:10px 16px"><div style="font-size:9px;color:var(--t3)">KAYIT</div><div style="font-size:16px;font-weight:500;color:var(--t)">' + _filtreArr.length + '</div></div>'
      + '</div>'
      /* İşlem listesi */
      + '<div style="overflow:auto;max-height:400px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:11px">'
      + '<thead style="position:sticky;top:0;background:var(--s2)"><tr style="border-bottom:0.5px solid var(--b)">'
      + '<th style="padding:7px 12px;text-align:left;font-weight:500;color:var(--t3)">Cari</th>'
      + '<th style="padding:7px 8px;text-align:left;font-weight:500;color:var(--t3)">Kaynak</th>'
      + '<th style="padding:7px 8px;text-align:left;font-weight:500;color:var(--t3)">Tarih</th>'
      + '<th style="padding:7px 8px;text-align:left;font-weight:500;color:var(--t3)">Tip</th>'
      + '<th style="padding:7px 8px;text-align:left;font-weight:500;color:var(--t3)">Açıklama</th>'
      + '<th style="padding:7px 8px;text-align:right;font-weight:500;color:var(--t3)">TL Borç</th>'
      + '<th style="padding:7px 8px;text-align:right;font-weight:500;color:var(--t3)">TL Alacak</th>'
      + '<th style="padding:7px 8px;text-align:right;font-weight:500;color:var(--t3)">Döviz</th>'
      + '</tr></thead><tbody>'
      + _filtreArr.slice(0, 500).map(function(i) {
          var cari = i.firma || i.cariAd || i.firmaAdi || '—';
          var borc = parseFloat(i.borc || i.borcMeblagh || i.borcMeblag || (i.tip === 'borc' ? i.tutarTL : 0) || 0) || 0;
          var alacak = parseFloat(i.alacak || i.alacakMeblagh || i.alacakMeblag || (i.tip === 'alacak' ? i.tutarTL : 0) || 0) || 0;
          var dc = i.dovizCinsi || i.borcDoviz || '';
          var dv = parseFloat(i.borcMeblagh || i.alacakMeblagh || i.tutarDoviz || 0) || 0;
          var kSrc = i._kaynak === 'Muhasebeci';
          return '<tr style="border-bottom:0.5px solid var(--b)">'
            + '<td style="padding:6px 12px;color:var(--t);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(cari) + '</td>'
            + '<td style="padding:6px 8px"><span style="font-size:9px;padding:2px 6px;border-radius:3px;background:' + (kSrc ? '#E6F1FB' : '#EAF3DE') + ';color:' + (kSrc ? '#0C447C' : '#27500A') + '">' + _esc(i._kaynak) + '</span></td>'
            + '<td style="padding:6px 8px;color:var(--t2);white-space:nowrap">' + _esc(i.tarih || '') + '</td>'
            + '<td style="padding:6px 8px;color:var(--t3)">' + _esc(i.islemTuru || i.tip || '') + '</td>'
            + '<td style="padding:6px 8px;color:var(--t2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(i.aciklama || '') + '">' + _esc((i.aciklama || '').slice(0, 40)) + '</td>'
            + '<td style="padding:6px 8px;text-align:right;color:#A32D2D;font-family:monospace">' + (borc ? borc.toLocaleString('tr-TR', {maximumFractionDigits: 2}) : '') + '</td>'
            + '<td style="padding:6px 8px;text-align:right;color:#27500A;font-family:monospace">' + (alacak ? alacak.toLocaleString('tr-TR', {maximumFractionDigits: 2}) : '') + '</td>'
            + '<td style="padding:6px 8px;text-align:right;color:var(--t2);font-family:monospace">' + (dc && dc !== 'TRY' && dv ? dv.toLocaleString('tr-TR', {maximumFractionDigits: 2}) + ' ' + _esc(dc) : '') + '</td>'
            + '</tr>';
        }).join('')
      + '</tbody></table></div>'
      + (_filtreArr.length > 500 ? '<div style="padding:8px 16px;font-size:10px;color:var(--t3);text-align:center">İlk 500 kayıt gösteriliyor. Excel\'e aktararak tümünü görün.</div>' : '')
      + '</div>';
  }
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

window._mvDosyaKaldir = function(taraf, e) {
  /* MUAVIN-SAFARI-BTN-001: event arg'dan güvenli stopPropagation + fallback */
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
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
  /* MUAVIN-ONAY-NOT-001: onay not alan\u0131 ile modal */
  var _notEl = document.createElement('div');
  _notEl.innerHTML = '<div style="margin-top:10px"><label style="font-size:11px;color:var(--t2)">Onay notu (iste\u011fe ba\u011fl\u0131):</label><input id="mv-onay-not" placeholder="\u00d6rn: muhasebeci ile g\u00f6r\u00fc\u015f\u00fcld\u00fc, farklar kabul edildi" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="margin-top:4px;width:100%;font-size:11px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  window.confirmModal?.(donem + ' d\u00f6nemi i\u00e7in mutabakat onaylanacak.', {
    title: 'D\u00f6nemi Onayla', confirmText: 'Onayla',
    extraEl: _notEl,
    onConfirm: function() {
      var meta = _mvMetaLoad();
      if (!meta[donem]) meta[donem] = {};
      meta[donem].onay = 'onaylandi';
      meta[donem].onayTarih = new Date().toISOString();
      meta[donem].onayKisi = window.CU?.() ? (window.CU().name || window.CU().email || '') : '';
      meta[donem].onayNotu = (document.getElementById('mv-onay-not')?.value || '').trim();
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

/* MUAVIN-BIRLESIK-CARI-EXCEL-001: Karşılaştırma öncesi raw veri export — CARİ ADI kolonlu
   NOT: Mevcut window._mvBirlesikExcelIndir (muavin_export.js) firma-bazlı mutabakat sonuçlarını
        export eder (_mvFirmaListesi gerekir). Bu yeni fonksiyon ise raw normalize edilmiş veriyi
        direkt dışa aktarır — iki export parallel çalışır, L471 ve L484 buttons etkilenmez. */
window._mvBirlesikCariExcelIndir = function() {
  if (typeof XLSX === 'undefined') {
    window.toast?.('Excel kütüphanesi yüklenemedi', 'err');
    return;
  }
  var meta = typeof _mvMetaLoad === 'function' ? _mvMetaLoad() : (window._mvMeta || {});
  var donem = typeof _mvAktifDonem === 'function' ? _mvAktifDonem() : '';
  var d = meta[donem] || {};
  var muhArr = (d.muhasebeci || {}).normalArr || window._mvSonIslemler || [];
  var barArr = (d.baran || {}).normalArr || window._mvSonIslemlerB || [];
  if (!muhArr.length && !barArr.length) {
    window.toast?.('Önce dosya yükleyin', 'warn');
    return;
  }
  /* MUAVIN-EXCEL-CARIAD-FALLBACK-001: firmaAdi meta fallback + açıklama regex çıkarımı */
  var _mFirmaAdi = (d.muhasebeci||{}).firmaAdi || '';
  var _bFirmaAdi = (d.baran||{}).firmaAdi || '';
  var _cariCikarAciklama = function(aciklama) {
    if (!aciklama) return '';
    var s = String(aciklama);
    var m = s.match(/HVL-([^-]+)-/) || s.match(/([A-ZÇĞİÖŞÜa-zçğışöü\s\.]{4,}(?:A\.Ş\.|LTD\.|A\.S\.))/);
    return m ? m[1].trim() : '';
  };
  /* MUAVIN-EXCEL-ISO-PRECHECK-001: ISO/dd.mm kontrolü serial'den ÖNCE — parseFloat("2025-09-09")=2025 bug fix */
  var _fmtTarih = function(t) {
    if (!t && t !== 0) return '';
    var s = String(t).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) { var p=s.slice(0,10).split('-'); return p[2]+'.'+p[1]+'.'+p[0]; }
    if (s.match(/^\d{2}\.\d{2}\.\d{4}$/)) return s;
    var n = parseFloat(s);
    if (!isNaN(n) && n > 1000 && n < 100000) {
      var d = new Date(Math.round((n - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+d.getFullYear();
    }
    if (s.indexOf('.') !== -1 && s.length <= 10) return s;
    var d2 = new Date(s);
    if (!isNaN(d2.getTime())) return ('0'+d2.getDate()).slice(-2)+'.'+('0'+(d2.getMonth()+1)).slice(-2)+'.'+d2.getFullYear();
    return s;
  };
  /* MUAVIN-EXCEL-TAM-FIX-001: Türkçe binlik ayraç parse helper */
  var _fmtSayi = function(v) {
    if (!v && v !== 0) return '';
    var s = String(v).trim();
    if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.indexOf(',') !== -1) {
      s = s.replace(',', '.');
    }
    var n = parseFloat(s);
    return isNaN(n) ? '' : n;
  };
  /* MUAVIN-EXCEL-TAM-FIX-001: kurTip state (MB Alış / MB Satış toggle) */
  var _kurTip = window._mvOrtakKurTip || 'alis';
  var satirlar = [];
  /* MUAVIN-EXCEL-TAM-FIX-001: 15 kolon — TL+DÖVİZ ayrı borç/alacak/bakiye + MB kur */
  satirlar.push(['CARİ ADI', 'KAYNAK', 'CARİ ADI (Normalize)', 'TARİH', 'TİP', 'EŞLEŞME NO', 'AÇIKLAMA', 'TL BORÇ', 'TL ALACAK', 'TL BAKİYE', 'DÖVİZ CİNS', 'DÖVİZ BORÇ', 'DÖVİZ ALACAK', 'DÖVİZ BAKİYE', 'MB KUR']);
  var _muhTLBak = 0;
  muhArr.forEach(function(i) {
    var _borc = _fmtSayi(i.borc || (i.tip === 'borc' ? i.tutarTL : 0) || 0) || 0;
    var _alacak = _fmtSayi(i.alacak || (i.tip === 'alacak' ? i.tutarTL : 0) || 0) || 0;
    var _dovBorc = _fmtSayi(i.dovizBorc || 0) || 0;
    var _dovAlacak = _fmtSayi(i.dovizAlacak || 0) || 0;
    _muhTLBak += _alacak - _borc;
    var _kur = _kurTip === 'alis' ? (_fmtSayi(i.kurAlis) || 0) : (_fmtSayi(i.kurSatis) || 0);
    satirlar.push([
      i.firma || i.cariAd || '—',
      'Muhasebeci',
      i.cariAd || '—',
      _fmtTarih(i.tarih),
      i.tip || '',
      i.snNo || i.faturaNo || i.fisNo || '',
      i.aciklama || '',
      _borc || '',
      _alacak || '',
      Math.round(_muhTLBak * 100) / 100,
      i.dovizCinsi || 'TRY',
      _dovBorc || '',
      _dovAlacak || '',
      Math.round((_dovAlacak - _dovBorc) * 100) / 100,
      _kur || ''
    ]);
  });
  var _barTLBak = 0;
  barArr.forEach(function(i) {
    var _borc = _fmtSayi(i.borcMeblagh || i.borcMeblag || (i.tip === 'borc' ? i.tutarTL : 0) || 0) || 0;
    var _alacak = _fmtSayi(i.alacakMeblagh || i.alacakMeblag || (i.tip === 'alacak' ? i.tutarTL : 0) || 0) || 0;
    var _dovBorc = _fmtSayi(i.borcMeblagh || 0) || 0;
    var _dovAlacak = _fmtSayi(i.alacakMeblagh || 0) || 0;
    var _dc = i.dovizCinsi || i.borcDoviz || i.alacakDoviz || 'TRL';
    _barTLBak += _alacak - _borc;
    var _kur = _kurTip === 'alis' ? (_fmtSayi(i.kurAlis) || 0) : (_fmtSayi(i.kurSatis) || 0);
    satirlar.push([
      i.firma || i.firmaAdi || i.cariAd || '—',
      'Baran Ekstresi',
      (window._mvNormalize?.firmaAdiAyikla?.(i.aciklama || '') || i._firmaAdi || i.firmaAdi || i.firma || '—'),
      _fmtTarih(i.tarih),
      i.islemTuru || i.tip || '',
      i.snNo || i.faturaNo || (i.faturaSeri && i.faturaSira ? i.faturaSeri + i.faturaSira : '') || '',
      i.aciklama || '',
      _borc || '',
      _alacak || '',
      Math.round(_barTLBak * 100) / 100,
      _dc,
      _dovBorc || '',
      _dovAlacak || '',
      Math.round((_dovAlacak - _dovBorc) * 100) / 100,
      _kur || ''
    ]);
  });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(satirlar);
  /* MUAVIN-EXCEL-TAM-FIX-001: 15 kolon genişlikleri */
  ws['!cols'] = [{wch:25},{wch:14},{wch:25},{wch:12},{wch:10},{wch:16},{wch:40},{wch:14},{wch:14},{wch:14},{wch:8},{wch:14},{wch:14},{wch:14},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws, 'Birlesik');
  XLSX.writeFile(wb, 'muavin-birlesik-' + (donem || 'gecerli') + '-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  window.toast?.('Excel indirildi ✓ (' + (muhArr.length + barArr.length) + ' satır)', 'ok');
};

console.log('[MUAVİN] v3.0 B-layout yüklendi');
