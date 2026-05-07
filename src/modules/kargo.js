/**
 * src/modules/kargo.js — v11.0.0
 * Kargo Takip: Deniz / Hava / Kara
 * Konteyner yerleşim, takip zaman çizelgesi, alarm, maliyet analizi
 */
(function() {
'use strict';
var _kargoCanEdit = function() { var r = window.CU?.()?.role || window.CU?.()?.rol || ''; return r === 'admin' || r === 'manager' || r === 'lead'; };

// ═══ STATE ═══
var _tab = localStorage.getItem('ak_kargo_tab') || 'deniz';
var _subTab = 'liste';
var _araQ = '';
var _filtreDurum = '';
var _filtreFirema = '';
var _filtreTur = '';
var _sayfa = 1;
var SAYFA_BOYUT = 50;
var _secili = {};

// ═══ VERİ ═══
function _loadK() { try { return JSON.parse(localStorage.getItem('ak_kargo2') || '[]').filter(function(x) { return !x.isDeleted; }); } catch(e) { return []; } }
function _storeK(arr) { localStorage.setItem('ak_kargo2', JSON.stringify(arr)); }
function _loadKAll() { try { return JSON.parse(localStorage.getItem('ak_kargo2') || '[]'); } catch(e) { return []; } }
function _loadKFirma() { return ['Maersk','CMA CGM','MSC','Turkish Cargo','DHL Express','FedEx','Yurtiçi','Aras','MNG','PTT']; }

// ═══ YARDIMCI ═══
var _esc = window._esc;
function _fmt(n) { return Number(n || 0).toLocaleString('tr-TR'); }
function _tarih(d) { if (!d) return '—'; return d.slice(0, 10); }
function _gun(d1, d2) { try { return Math.ceil((new Date(d2) - new Date(d1)) / 86400000); } catch(e) { return 0; } }
function _kalanGun(d) { if (!d) return null; return _gun(new Date().toISOString().slice(0, 10), d); }
function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function _now() { return window._istNow ? window._istNow() : new Date().toISOString().slice(0, 19).replace('T', ' '); } /* [SAAT-FIX-TZ-001] Istanbul saati */

function _durumBadge(d) {
  var map = { hazirlaniyor: ['#EEEDFE', '#26215C', 'Hazırlanıyor'], yolda: ['#E6F1FB', '#0C447C', 'Yolda'], gumrukte: ['#FAEEDA', '#633806', 'Gümrükte'], teslim: ['#EAF3DE', '#27500A', 'Teslim'], iade: ['#FCEBEB', '#791F1F', 'İade'], gecikti: ['#FCEBEB', '#791F1F', 'Gecikti'] };
  var m = map[d] || ['#F1EFE8', '#2C2C2A', d || '—'];
  return '<span style="display:inline-flex;font-size:10px;padding:2px 8px;border-radius:4px;font-weight:500;background:' + m[0] + ';color:' + m[1] + '">' + m[2] + '</span>';
}
function _tipBadge(tip, tur) {
  var map = { deniz: ['#E6F1FB', '#0C447C'], hava: ['#EAF3DE', '#27500A'], kara: ['#FAEEDA', '#633806'] };
  var m = map[tip] || ['#F1EFE8', '#2C2C2A'];
  return '<span style="display:inline-flex;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:500;background:' + m[0] + ';color:' + m[1] + '">' + _esc(tur || tip) + '</span>';
}

// ═══ ANA RENDER ═══
function renderKargo() {
  var panel = document.getElementById('panel-kargo');
  if (!panel) return;
  var liste = _loadK();
  var kpiYolda = liste.filter(function(k) { return k.durum === 'yolda'; }).length;
  var kpiTeslim = liste.filter(function(k) { return k.durum === 'teslim'; }).length;
  var kpiGecikti = liste.filter(function(k) { return k.durum === 'gecikti' || (k.eta && k.durum !== 'teslim' && _kalanGun(k.eta) < 0); }).length;
  var kpiGumrukte = liste.filter(function(k) { return k.durum === 'gumrukte'; }).length;

  var h = '';
  /* Başlık */
  h += '<div class="ph"><div><div class="pht">Kargo Takip</div><div class="phs">Deniz / Hava / Kara gönderi yönetimi</div></div>';
  h += '<div class="ur"><button class="btn btns" onclick="window._kargoXlsx()">XLSX</button>' + (_kargoCanEdit() ? '<button class="btn btnp" onclick="window._kargoYeniModal()">+ Yeni G\u00f6nderi</button>' : '') + '</div></div>';

  /* Ana sekmeler */
  h += '<div style="display:flex;gap:0;border-bottom:0.5px solid var(--b);padding:0 20px">';
  ['deniz', 'hava', 'kara'].forEach(function(t) {
    var lbl = { deniz: 'Deniz Kargo', hava: 'Hava Kargo', kara: 'Kara Kargo' }[t];
    h += '<div onclick="event.stopPropagation();window._kargoSetTab(\'' + t + '\')" style="padding:8px 18px;font-size:12px;cursor:pointer;border-bottom:2px solid ' + (_tab === t ? '#185FA5;color:#185FA5;font-weight:500' : 'transparent;color:var(--t2)') + '">' + lbl + '</div>';
  });
  h += '<div onclick="event.stopPropagation();window._kargoSetTab(\'alarm\')" style="padding:8px 18px;font-size:12px;cursor:pointer;border-bottom:2px solid ' + (_tab === 'alarm' ? '#DC2626;color:#DC2626' : 'transparent;color:var(--t2)') + '">Alarm' + (kpiGecikti > 0 ? ' <span style="background:#FCEBEB;color:#791F1F;border-radius:10px;padding:1px 6px;font-size:10px">' + kpiGecikti + '</span>' : '') + '</div>';
  h += '</div>';

  /* KPI */
  h += '<div style="display:flex;gap:6px;padding:10px 20px;border-bottom:0.5px solid var(--b)">';
  h += '<div style="background:var(--s2);border-radius:6px;padding:7px 14px;text-align:center;flex:1"><div style="font-size:18px;font-weight:500">' + liste.length + '</div><div style="font-size:9px;color:var(--t3)">Toplam</div></div>';
  h += '<div style="background:#E6F1FB;border-radius:6px;padding:7px 14px;text-align:center;flex:1"><div style="font-size:18px;font-weight:500;color:#0C447C">' + kpiYolda + '</div><div style="font-size:9px;color:#185FA5">Yolda</div></div>';
  h += '<div style="background:#FAEEDA;border-radius:6px;padding:7px 14px;text-align:center;flex:1"><div style="font-size:18px;font-weight:500;color:#633806">' + kpiGumrukte + '</div><div style="font-size:9px;color:#854F0B">Gümrükte</div></div>';
  h += '<div style="background:#EAF3DE;border-radius:6px;padding:7px 14px;text-align:center;flex:1"><div style="font-size:18px;font-weight:500;color:#27500A">' + kpiTeslim + '</div><div style="font-size:9px;color:#3B6D11">Teslim</div></div>';
  h += '<div style="background:#FCEBEB;border-radius:6px;padding:7px 14px;text-align:center;flex:1"><div style="font-size:18px;font-weight:500;color:#791F1F">' + kpiGecikti + '</div><div style="font-size:9px;color:#A32D2D">Geciken</div></div>';
  h += '</div>';

  /* İçerik */
  h += '<div style="padding:0 20px">';
  if (_tab === 'alarm') { h += _renderAlarm(liste); }
  else { h += _renderListe(liste); }
  h += '</div>';

  panel.innerHTML = h;
}

// ═══ LİSTE ═══
function _renderListe(liste) {
  var filtre = liste.filter(function(k) { return k.tip === _tab; });
  if (_araQ) { var q = _araQ.toLowerCase(); filtre = filtre.filter(function(k) { return (k.ref_no || '').toLowerCase().indexOf(q) !== -1 || (k.takip_no || '').toLowerCase().indexOf(q) !== -1 || (k.alici || '').toLowerCase().indexOf(q) !== -1 || (k.firma || '').toLowerCase().indexOf(q) !== -1; }); }
  if (_filtreDurum) filtre = filtre.filter(function(k) { return k.durum === _filtreDurum; });
  if (_filtreFirema) filtre = filtre.filter(function(k) { return k.firma === _filtreFirema; });

  var toplamSayfa = Math.max(1, Math.ceil(filtre.length / SAYFA_BOYUT));
  if (_sayfa > toplamSayfa) _sayfa = toplamSayfa;
  var bas = (_sayfa - 1) * SAYFA_BOYUT;
  var sayfa = filtre.slice(bas, bas + SAYFA_BOYUT);
  var secSayi = Object.keys(_secili).length;

  var firmaOpts = '<option value="">Tüm Firmalar</option>';
  _loadKFirma().forEach(function(f) { firmaOpts += '<option value="' + _esc(f) + '"' + (_filtreFirema === f ? ' selected' : '') + '>' + _esc(f) + '</option>'; });

  var h = '';
  /* Toolbar */
  h += '<div style="display:flex;align-items:center;gap:5px;padding:8px 0;overflow-x:auto">';
  h += '<input class="fi" placeholder="Takip no, alıcı, ref..." value="' + _esc(_araQ) + '" oninput="event.stopPropagation();window._kargoAra(this.value)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:180px;flex-shrink:0">';
  h += '<select class="fi" onchange="event.stopPropagation();window._kargoFiltre(\'durum\',this.value)" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="flex-shrink:0"><option value="">Tüm Durumlar</option><option value="hazirlaniyor"' + (_filtreDurum === 'hazirlaniyor' ? ' selected' : '') + '>Hazırlanıyor</option><option value="yolda"' + (_filtreDurum === 'yolda' ? ' selected' : '') + '>Yolda</option><option value="gumrukte"' + (_filtreDurum === 'gumrukte' ? ' selected' : '') + '>Gümrükte</option><option value="teslim"' + (_filtreDurum === 'teslim' ? ' selected' : '') + '>Teslim</option><option value="gecikti"' + (_filtreDurum === 'gecikti' ? ' selected' : '') + '>Gecikti</option></select>';
  h += '<select class="fi" onchange="event.stopPropagation();window._kargoFiltre(\'firma\',this.value)" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="flex-shrink:0">' + firmaOpts + '</select>';
  if (secSayi > 0) {
    h += '<button class="btn btns" onclick="event.stopPropagation();window._kargoTopluDurum()" style="font-size:11px;flex-shrink:0;color:var(--ac)">' + secSayi + ' Durum Güncelle</button>';
    h += '<button class="btn btns btnd" onclick="event.stopPropagation();window._kargoTopluSil()" style="font-size:11px;flex-shrink:0">' + secSayi + ' Kaydı Sil</button>';
  }
  h += '</div>';

  /* Tablo */
  h += '<div style="overflow-x:auto;border:0.5px solid var(--b);border-radius:8px">';
  h += '<table class="tbl" style="font-size:11px;border-collapse:collapse;width:100%;min-width:900px">';
  h += '<thead><tr>';
  h += '<th style="position:sticky;top:0;background:var(--s2);padding:7px 10px;border-bottom:0.5px solid var(--b);width:28px"><input type="checkbox" onchange="event.stopPropagation();window._kargoTumChk(this.checked)"></th>';
  ['Ref / Takip', 'Firma', 'Alıcı / Güzergah', 'Yükleme', 'ETA', 'KG / m³', 'Maliyet', 'Durum', ''].forEach(function(l) {
    h += '<th style="position:sticky;top:0;background:var(--s2);padding:7px 10px;border-bottom:0.5px solid var(--b);text-align:left;font-size:10px;font-weight:500;color:var(--t3);white-space:nowrap">' + l + '</th>';
  });
  h += '</tr></thead><tbody>';

  if (!sayfa.length) {
    h += '<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--t3)">Kay\u0131t bulunamad\u0131.' + (_kargoCanEdit() ? ' <button class="btn btnp" onclick="window._kargoYeniModal()" style="margin-top:8px">+ Yeni G\u00f6nderi</button>' : '') + '</td></tr>';
  }

  sayfa.forEach(function(k) {
    var gecikti = k.durum === 'gecikti' || (k.eta && k.durum !== 'teslim' && _kalanGun(k.eta) < 0);
    var kalan = _kalanGun(k.eta);
    h += '<tr style="background:' + (gecikti ? '#FCEBEB11' : 'inherit') + '" onclick="event.stopPropagation()">';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b);text-align:center"><input type="checkbox" class="krg-chk" data-id="' + k.id + '"' + (_secili[k.id] ? ' checked' : '') + ' onchange="event.stopPropagation();window._kargoChkDegis(\'' + k.id + '\',this.checked)"></td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b)"><div style="font-weight:500;font-family:monospace;font-size:11px">' + _esc(k.ref_no || '—') + '</div><div style="font-size:10px;color:#185FA5">' + _esc(k.takip_no || k.mawb || '') + '</div><div style="margin-top:2px">' + _tipBadge(k.tip, k.tur) + '</div></td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b)"><span style="font-size:10px;padding:2px 7px;border-radius:4px;background:var(--s2);color:var(--t)">' + _esc(k.firma || '—') + '</span></td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b)"><div style="font-size:11px;font-weight:500">' + _esc(k.alici || '—') + '</div><div style="font-size:10px;color:var(--t3)">' + _esc(k.pol || '') + (k.pod ? ' → ' + _esc(k.pod) : '') + '</div></td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b);font-family:monospace;font-size:10px">' + _tarih(k.yukleme_tarihi) + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b)"><span style="font-family:monospace;font-size:10px;color:' + (gecikti ? '#DC2626' : 'inherit') + '">' + _tarih(k.eta || k.teslim_tarihi) + '</span>' + (kalan !== null && k.durum !== 'teslim' ? '<br><span style="font-size:9px;padding:1px 5px;border-radius:3px;background:' + (kalan < 0 ? '#FCEBEB' : kalan < 3 ? '#FAEEDA' : '#E6F1FB') + ';color:' + (kalan < 0 ? '#791F1F' : kalan < 3 ? '#633806' : '#0C447C') + '">' + (kalan < 0 ? Math.abs(kalan) + 'g gecikti' : kalan + 'g kaldı') + '</span>' : '') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b);font-size:10px">' + (k.brut_kg ? k.brut_kg + 'kg' : '—') + (k.hacim_m3 ? ' / ' + k.hacim_m3 + 'm³' : '') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b);font-weight:500">' + (k.navlun_usd ? '$' + _fmt(k.navlun_usd) : '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b)">' + _durumBadge(gecikti ? 'gecikti' : k.durum) + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:0.5px solid var(--b)"><div style="display:flex;gap:3px"><button class="btn btns" onclick="event.stopPropagation();window._kargoTakipGuncelle(\'' + k.id + '\')" style="font-size:10px;padding:2px 7px">Takip</button><button class="btn btns btnd" onclick="event.stopPropagation();window._kargoSil(\'' + k.id + '\')" style="font-size:10px;padding:2px 5px">Sil</button></div></td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';

  /* Sayfalama */
  if (filtre.length > SAYFA_BOYUT) {
    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:11px;color:var(--t3)">';
    h += '<span>' + (bas + 1) + '–' + Math.min(bas + SAYFA_BOYUT, filtre.length) + ' / ' + filtre.length + '</span>';
    h += '<div style="display:flex;gap:4px">';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._kargoSayfa(' + (_sayfa - 1) + ')" style="font-size:10px;padding:3px 8px"' + (_sayfa <= 1 ? ' disabled' : '') + '>\u2190</button>';
    for (var pi = 1; pi <= Math.min(toplamSayfa, 7); pi++) h += '<button class="btn ' + (pi === _sayfa ? 'btnp' : 'btns') + '" onclick="event.stopPropagation();window._kargoSayfa(' + pi + ')" style="font-size:10px;padding:3px 8px">' + pi + '</button>';
    if (toplamSayfa > 7) h += '<span>...' + toplamSayfa + '</span>';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._kargoSayfa(' + (_sayfa + 1) + ')" style="font-size:10px;padding:3px 8px"' + (_sayfa >= toplamSayfa ? ' disabled' : '') + '>\u2192</button>';
    h += '</div></div>';
  }
  return h;
}

// ═══ ALARM ═══
function _renderAlarm(liste) {
  var alarmlar = [];
  liste.forEach(function(k) {
    var kalan = _kalanGun(k.eta || k.teslim_tarihi);
    if (kalan !== null && kalan < 0 && k.durum !== 'teslim') alarmlar.push({ seviye: 'kritik', baslik: 'Teslim Gecikti', aciklama: (k.ref_no || k.takip_no) + ' · ' + (k.firma || '') + ' · ' + Math.abs(kalan) + ' gün', id: k.id });
    if (k.durum === 'gumrukte' && k.durum_tarihi) { var saat = Math.round((Date.now() - new Date(k.durum_tarihi).getTime()) / 3600000); if (saat > 24) alarmlar.push({ seviye: 'uyari', baslik: 'Gümrük Bekleme', aciklama: (k.ref_no || '') + ' · ' + saat + ' saat', id: k.id }); }
  });
  var h = '<div style="padding:10px 0"><div style="font-size:13px;font-weight:500;margin-bottom:12px">Alarm Merkezi' + (alarmlar.length > 0 ? ' <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:#FCEBEB;color:#791F1F">' + alarmlar.length + ' Aktif</span>' : '') + '</div>';
  if (!alarmlar.length) { h += '<div style="padding:60px;text-align:center;color:var(--t3)">Aktif alarm yok.</div>'; }
  alarmlar.forEach(function(a) {
    var renk = a.seviye === 'kritik' ? ['#FCEBEB', '#DC2626'] : ['#FAEEDA', '#D97706'];
    h += '<div style="border:0.5px solid ' + renk[1] + '33;border-left:3px solid ' + renk[1] + ';border-radius:8px;padding:10px 14px;background:' + renk[0] + '22;margin-bottom:8px"><div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:12px;font-weight:500">' + _esc(a.baslik) + '</span><button class="btn btns" onclick="event.stopPropagation();window._kargoTakipGuncelle(\'' + a.id + '\')" style="font-size:10px;padding:2px 8px">Güncelle</button></div><div style="font-size:11px;color:var(--t2);margin-top:4px">' + _esc(a.aciklama) + '</div></div>';
  });
  h += '</div>';
  return h;
}

// ═══ YENİ KAYIT ═══
window._kargoYeniModal = function() {
  if (!_kargoCanEdit()) { window.toast?.('Bu i\u015flem i\u00e7in yetkiniz yok', 'warn'); return; }
  var old = document.getElementById('mo-kargo-yeni'); if (old) old.remove();
  var firmaOpts = _loadKFirma().map(function(f) { return '<option>' + _esc(f) + '</option>'; }).join('');
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-kargo-yeni';
  mo.innerHTML = '<div class="moc" style="max-width:680px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:600">Yeni Kargo Kaydı</div>'
    + '<div style="padding:18px 20px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'
    + '<div><div class="fl">Kargo Tipi *</div><select class="fi" id="nk-tip" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="deniz">Deniz</option><option value="hava">Hava</option><option value="kara">Kara</option></select></div>'
    + '<div><div class="fl">Tür</div><select class="fi" id="nk-tur" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option>FCL</option><option>LCL</option><option>AWB</option><option>TIR</option><option>FTL</option><option>Parsiyel</option></select></div>'
    + '<div><div class="fl">Firma *</div><select class="fi" id="nk-firma" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">' + firmaOpts + '</select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
    + '<div><div class="fl">Gönderen</div><input class="fi" id="nk-gonderen" value="Duay Global LLC" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">Alıcı *</div><input class="fi" id="nk-alici" placeholder="Alıcı adı" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
    + '<div><div class="fl">Yükleme (POL)</div><input class="fi" id="nk-pol" value="Istanbul" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">Varış (POD)</div><input class="fi" id="nk-pod" placeholder="Abidjan" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:8px">'
    + '<div><div class="fl">Yükleme Tarihi</div><input class="fi" id="nk-ytarih" type="date" onclick="event.stopPropagation()"></div>'
    + '<div><div class="fl">ETA</div><input class="fi" id="nk-eta" type="date" onclick="event.stopPropagation()"></div>'
    + '<div><div class="fl">Brüt KG</div><input class="fi" id="nk-kg" type="number" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">Hacim m³</div><input class="fi" id="nk-m3" type="number" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'
    + '<div><div class="fl">Takip No</div><input class="fi" id="nk-takip" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">Navlun (USD)</div><input class="fi" id="nk-navlun" type="number" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div>'
    + '<div><div class="fl">Durum</div><select class="fi" id="nk-durum" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="hazirlaniyor">Hazırlanıyor</option><option value="yolda">Yolda</option><option value="gumrukte">Gümrükte</option><option value="teslim">Teslim</option></select></div></div>'
    + '<div><div class="fl">Notlar</div><textarea class="fi" id="nk-not" rows="2" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></textarea></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-kargo-yeni\')?.remove()">İptal</button><button class="btn btnp" onclick="event.stopPropagation();window._kargoKaydet()">Kaydet</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._kargoKaydet = function() {
  var g = function(id) { return document.getElementById(id); };
  var alici = (g('nk-alici')?.value || '').trim();
  if (!alici) { window.toast?.('Alıcı zorunlu', 'err'); return; }
  var kayit = { id: _uid(), tip: g('nk-tip')?.value || 'deniz', tur: g('nk-tur')?.value || 'FCL', firma: g('nk-firma')?.value || '', ref_no: 'KRG-' + Date.now().toString().slice(-6), gonderen: g('nk-gonderen')?.value || ((window.SIRKET_DATA && window.SIRKET_DATA.unvan_en) || 'Duay Global LLC'), alici: alici, pol: g('nk-pol')?.value || '', pod: g('nk-pod')?.value || '', yukleme_tarihi: g('nk-ytarih')?.value || '', eta: g('nk-eta')?.value || '', brut_kg: parseFloat(g('nk-kg')?.value) || 0, hacim_m3: parseFloat(g('nk-m3')?.value) || 0, takip_no: g('nk-takip')?.value || '', navlun_usd: parseFloat(g('nk-navlun')?.value) || 0, durum: g('nk-durum')?.value || 'hazirlaniyor', notlar: g('nk-not')?.value || '', belgeler: [], timeline: [], olusturma: _now(), isDeleted: false };
  var liste = _loadKAll(); liste.push(kayit); _storeK(liste);
  g('mo-kargo-yeni')?.remove(); window.toast?.('Kargo kaydı oluşturuldu', 'ok'); _tab = kayit.tip; renderKargo();
};

// ═══ EYLEMLER ═══
window._kargoSetTab = function(t) { _tab = t; _sayfa = 1; _secili = {}; _araQ = ''; renderKargo(); localStorage.setItem('ak_kargo_tab', t); };
window._kargoAra = function(q) { _araQ = q; _sayfa = 1; renderKargo(); };
window._kargoFiltre = function(tip, val) { if (tip === 'durum') _filtreDurum = val; else if (tip === 'firma') _filtreFirema = val; _sayfa = 1; renderKargo(); };
window._kargoSayfa = function(p) { _sayfa = p; renderKargo(); };
window._kargoTumChk = function(c) { _secili = {}; if (c) { _loadK().filter(function(k) { return k.tip === _tab; }).forEach(function(k) { _secili[k.id] = true; }); } renderKargo(); };
window._kargoChkDegis = function(id, c) { if (c) _secili[id] = true; else delete _secili[id]; renderKargo(); };

window._kargoSil = function(id) {
  if (!_kargoCanEdit()) { window.toast?.('Bu i\u015flem i\u00e7in yetkiniz yok', 'warn'); return; }
  var silFunc = function() { var liste = _loadKAll(); var x = liste.find(function(k) { return k.id === id; }); if (x) { x.isDeleted = true; x.deletedAt = _now(); } _storeK(liste); window.toast?.('Silindi', 'ok'); renderKargo(); };
  if (typeof window.confirmModal === 'function') window.confirmModal('Bu kargo kayd\u0131 silinecek?', { danger: true, confirmText: 'Sil', onConfirm: silFunc });
};

window._kargoTopluSil = function() {
  if (!window._yetkiKontrol?.('toplu_sil')) return;
  var ids = Object.keys(_secili); if (!ids.length) return;
  var silFunc = function() { var liste = _loadKAll(); ids.forEach(function(id) { var x = liste.find(function(k) { return k.id === id; }); if (x) { x.isDeleted = true; x.deletedAt = _now(); } }); _storeK(liste); _secili = {}; window.toast?.(ids.length + ' kayıt silindi', 'ok'); renderKargo(); };
  window.confirmModal(ids.length + ' kargo kayd\u0131 silinecek?', { danger: true, confirmText: 'Evet Sil', onConfirm: silFunc });
};

window._kargoTakipGuncelle = function(id) {
  var lokasyon = prompt('Mevcut konum:'); if (!lokasyon) return;
  var aciklama = prompt('Açıklama:', '') || '';
  var liste = _loadKAll(); var k = liste.find(function(x) { return x.id === id; }); if (!k) return;
  if (!k.timeline) k.timeline = [];
  k.timeline.push({ tarih: new Date().toISOString().slice(0, 10), lokasyon: lokasyon, aciklama: aciklama, durum: 'tamamlandi' });
  k.mevcut_konum = lokasyon; k.konum_guncelleme = new Date().toISOString().slice(0, 10); k.guncelleme = _now();
  _storeK(liste); window.toast?.('Konum güncellendi', 'ok'); renderKargo();
};

window._kargoXlsx = function() {
  var liste = _loadK(); if (!liste.length) { window.toast?.('Kayıt yok', 'warn'); return; }
  var baslik = ['Ref No', 'Tip', 'Tür', 'Firma', 'Alıcı', 'POL', 'POD', 'Yükleme', 'ETA', 'KG', 'm³', 'Navlun USD', 'Durum'];
  var satirlar = liste.map(function(k) { return [k.ref_no, k.tip, k.tur, k.firma, k.alici, k.pol, k.pod, k.yukleme_tarihi, k.eta, k.brut_kg, k.hacim_m3, k.navlun_usd, k.durum].join('\t'); });
  var icerik = baslik.join('\t') + '\n' + satirlar.join('\n');
  var blob = new Blob(['\ufeff' + icerik], { type: 'text/tab-separated-values;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kargo_' + new Date().toISOString().slice(0, 10) + '.xls'; a.click();
  window.toast?.('Excel indirildi', 'ok');
};

// ═══ TOPLU DURUM GÜNCELLEME (STANDART-FIX-012) ═══
window._kargoTopluDurum = function() {
  if (!window._yetkiKontrol?.('toplu_guncelle')) return;
  var ids = Object.keys(_secili); if (!ids.length) { window.toast?.('Kayıt seçilmedi', 'warn'); return; }
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-krg-durum';
  mo.innerHTML = '<div class="moc" style="max-width:380px"><div class="moh"><span class="mot">' + ids.length + ' Kargo — Durum Güncelle</span><button class="mcl" onclick="this.closest(\'.mo\').remove()">✕</button></div>'
    + '<div class="mob"><select class="fi" id="krg-tg-durum" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="">— Durum Seç —</option><option value="hazirlaniyor">Hazırlanıyor</option><option value="yolda">Yolda</option><option value="gumrukte">Gümrükte</option><option value="teslim">Teslim</option><option value="gecikti">Gecikti</option><option value="iade">İade</option></select></div>'
    + '<div class="mof"><button class="btn" onclick="this.closest(\'.mo\').remove()">İptal</button><button class="btn btnp" onclick="event.stopPropagation();window._kargoTopluDurumKaydet()">Uygula</button></div></div>';
  document.body.appendChild(mo);
  window.openMo?.('mo-krg-durum');
};

window._kargoTopluDurumKaydet = function() {
  var ids = Object.keys(_secili);
  var durum = document.getElementById('krg-tg-durum')?.value;
  if (!durum) { window.toast?.('Durum seçilmedi', 'warn'); return; }
  var liste = _loadKAll();
  liste.forEach(function(k) {
    if (ids.indexOf(k.id) !== -1) {
      k.durum = durum;
      k.durum_tarihi = new Date().toISOString().slice(0, 10);
      k.guncelleme = _now();
    }
  });
  _storeK(liste);
  _secili = {};
  document.getElementById('mo-krg-durum')?.remove();
  window.toast?.(ids.length + ' kargo güncellendi ✓', 'ok');
  window.logActivity?.('kargo', 'Toplu durum güncelleme: ' + ids.length + ' kargo → ' + durum);
  renderKargo();
};

// ═══ WINDOW EXPORTS ═══
window.renderKargo = renderKargo;
window.loadKargo = _loadK;
window.storeKargo = _storeK;

// [DANGLING-KARGO-ALIAS-001 START]
// UI eski isimlerini modulun gercek fonksiyonlarina yonlendir - isim mismatch duzeltmesi
window.openKargoModal  = window._kargoYeniModal;
window.saveKargo       = window._kargoKaydet;
window.exportKargoXlsx = window._kargoXlsx;
// [DANGLING-KARGO-ALIAS-001 END]

})();
