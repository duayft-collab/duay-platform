/* PUSULA-ESKI-KAPAT-006: dropdown value pusula→pusula-pro + legacy match korundu */
/**
 * src/modules/talimatlar.js — v1.0.0
 * Talimatlar — Zamanli + Tetikleyici Talimat Sistemi
 * localStorage: ak_talimatlar1
 * Anayasa: K01 ≤800 satir | K06 soft delete | D3 IIFE
 */
(function() {
'use strict';

var _LS_KEY = 'ak_talimatlar1';
var _g = function(id) { return document.getElementById(id); };
var _esc = window._esc;
var _now = function() { return new Date().toISOString(); };
var _today = function() { return new Date().toISOString().slice(0, 10); };
var _cu = function() { return typeof window.CU === 'function' ? window.CU() : window.CU; };

function _load() { try { return JSON.parse(localStorage.getItem(_LS_KEY) || '[]'); } catch(e) { return []; } }
function _store(d) { localStorage.setItem(_LS_KEY, JSON.stringify(d)); }
function _loadVisible() { return _load().filter(function(t) { return !t.isDeleted; }); }

// State
var _aktifSekme = 'aktif';
var _araQ = '';
var _sayfa = 1;
var _SAYFA_BOY = 50;

var TIP_MAP = {
  zamanli:      { l: 'Zamanli',     emoji: '⏰', bg: '#E6F1FB', fg: '#0C447C' },
  tetikleyici:  { l: 'Tetikleyici', emoji: '⚡', bg: '#FAEEDA', fg: '#633806' },
  hatirlatma:   { l: 'Hatirlatma',  emoji: '🔔', bg: '#EEEDFE', fg: '#26215C' },
  rapor:        { l: 'Rapor',       emoji: '📊', bg: '#EAF3DE', fg: '#27500A' },
};

var TEKRAR_MAP = {
  gunluk:       'Gunluk',
  haftalik:     'Haftalik',
  aylik:        'Aylik',
  yillik:       'Yillik',
  tek_seferlik: 'Tek Seferlik',
};

var MODUL_MAP = {
  cari: 'Cari', pirim: 'Pirim', kpi: 'KPI', ihracat: 'Ihracat',
  satinalma: 'Satinalma', kargo: 'Kargo', pusula: 'Pusula', genel: 'Genel',
};

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════

function renderTalimatlar() {
  var panel = _g('panel-talimatlar');
  if (!panel) return;

  var all = _loadVisible();
  var cu = _cu();

  // Istatistikler
  var aktifCount = all.filter(function(t) { return t.aktif; }).length;
  var pasifCount = all.filter(function(t) { return !t.aktif; }).length;
  var bugunCount = all.filter(function(t) { return t.aktif && t.sonraki_calisma === _today(); }).length;

  var h = '';
  // Header
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b);position:sticky;top:0;z-index:200;background:var(--sf)">';
  h += '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Talimatlar</div>';
  h += '<div style="font-size:10px;color:var(--t3)">Zamanli + Tetikleyici Talimat Sistemi</div></div>';
  h += '<div style="display:flex;gap:6px">';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._talimatExport()" style="font-size:11px">XLSX</button>';
  h += '<button class="btn btnp" onclick="event.stopPropagation();window.openTalimatModal()" style="font-size:12px">+ Talimat Ekle</button>';
  h += '</div></div>';

  // KPI bar
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid var(--b)">';
  h += _kpiKart('Toplam', all.length, 'var(--t)');
  h += _kpiKart('Aktif', aktifCount, '#16A34A');
  h += _kpiKart('Pasif', pasifCount, '#D97706');
  h += _kpiKart('Bugun', bugunCount, '#DC2626');
  h += '</div>';

  // Sekmeler
  h += '<div style="display:flex;border-bottom:1px solid var(--b);padding:0 24px">';
  ['aktif', 'takvim', 'gecmis'].forEach(function(s) {
    var lbl = { aktif: 'Aktif Talimatlar', takvim: 'Takvim', gecmis: 'Gecmis' }[s];
    h += '<div onclick="event.stopPropagation();window._talimatSekme(\'' + s + '\')" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid ' + (_aktifSekme === s ? 'var(--ac);color:var(--ac);font-weight:500' : 'transparent;color:var(--t2)') + '">' + lbl + '</div>';
  });
  h += '</div>';

  // Icerik
  h += '<div style="padding:16px 24px">';
  if (_aktifSekme === 'aktif') h += _renderAktifListe(all);
  else if (_aktifSekme === 'takvim') h += _renderTakvim(all);
  else if (_aktifSekme === 'gecmis') h += _renderGecmis(all);
  h += '</div>';

  panel.innerHTML = h;
}

function _kpiKart(label, val, color) {
  return '<div style="padding:14px 20px;border-right:1px solid var(--b)">'
    + '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">' + label + '</div>'
    + '<div style="font-size:22px;font-weight:600;color:' + color + '">' + val + '</div></div>';
}

// ── Aktif Liste ──────────────────────────────────────────────
function _renderAktifListe(all) {
  var h = '';
  // Arama + toplu islem
  h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">';
  h += '<input class="fi" placeholder="Talimat ara..." value="' + _esc(_araQ) + '" oninput="event.stopPropagation();window._talimatAra(this.value)" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="flex:1;max-width:280px">';
  h += '<span id="tlt-bulk-bar" style="display:none;gap:6px;align-items:center">';
  h += '<span id="tlt-bulk-cnt" style="font-size:10px;font-weight:600;color:var(--ac)">0</span>';
  h += '<button class="btn btns btnd" onclick="event.stopPropagation();window._talimatTopluSil()" style="font-size:10px">Sil</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._talimatTopluToggle(true)" style="font-size:10px;color:#16A34A">Aktif Yap</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._talimatTopluToggle(false)" style="font-size:10px;color:#D97706">Pasif Yap</button>';
  h += '</span></div>';

  var fl = all.slice();
  if (_araQ) {
    var q = _araQ.toLowerCase();
    fl = fl.filter(function(t) {
      return (t.baslik || '').toLowerCase().indexOf(q) !== -1 ||
        (t.aciklama || '').toLowerCase().indexOf(q) !== -1 ||
        (t.hedef_modul || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  // Sayfalama
  var toplamS = Math.max(1, Math.ceil(fl.length / _SAYFA_BOY));
  if (_sayfa > toplamS) _sayfa = 1;
  var bas = (_sayfa - 1) * _SAYFA_BOY;
  var sayfaFl = fl.slice(bas, bas + _SAYFA_BOY);

  if (!sayfaFl.length) {
    h += '<div style="text-align:center;padding:48px;color:var(--t3)"><div style="font-size:36px;margin-bottom:12px">📋</div><div>Talimat bulunamadi</div></div>';
    return h;
  }

  sayfaFl.forEach(function(t) {
    var tip = TIP_MAP[t.tip] || TIP_MAP.zamanli;
    var tekrar = TEKRAR_MAP[t.tekrar] || t.tekrar || '—';
    var modul = MODUL_MAP[t.hedef_modul] || t.hedef_modul || '—';
    h += '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b);opacity:' + (t.aktif ? '1' : '.5') + '">';
    h += '<input type="checkbox" class="tlt-bulk-chk" data-id="' + t.id + '" onclick="event.stopPropagation();window._talimatBulkCheck()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--ac);flex-shrink:0">';
    h += '<div style="width:32px;height:32px;border-radius:8px;background:' + tip.bg + ';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">' + tip.emoji + '</div>';
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="font-size:13px;font-weight:500;color:var(--t)">' + _esc(t.baslik || '—') + '</div>';
    h += '<div style="font-size:10px;color:var(--t3);display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">';
    h += '<span style="padding:1px 6px;border-radius:4px;background:' + tip.bg + ';color:' + tip.fg + ';font-weight:600">' + tip.l + '</span>';
    h += '<span>' + tekrar + '</span>';
    if (t.tekrar_gun) h += '<span>Ayın ' + t.tekrar_gun + '.</span>';
    if (t.tekrar_saat) h += '<span>' + t.tekrar_saat + '</span>';
    h += '<span style="padding:1px 6px;border-radius:4px;background:var(--s2)">' + modul + '</span>';
    if (t.sonraki_calisma) h += '<span>Sonraki: ' + t.sonraki_calisma + '</span>';
    h += '</div></div>';
    h += '<div style="display:flex;gap:4px;flex-shrink:0">';
    h += '<button onclick="event.stopPropagation();window.toggleTalimat(\'' + t.id + '\')" class="btn btns" style="font-size:10px;color:' + (t.aktif ? '#D97706' : '#16A34A') + '">' + (t.aktif ? 'Durdur' : 'Baslat') + '</button>';
    h += '<button onclick="event.stopPropagation();window.openTalimatModal(\'' + t.id + '\')" class="btn btns" style="font-size:10px">Duzenle</button>';
    h += '<button onclick="event.stopPropagation();window.delTalimat(\'' + t.id + '\')" class="btn btns btnd" style="font-size:10px">Sil</button>';
    h += '</div></div>';
  });

  // Sayfalama footer
  if (fl.length > _SAYFA_BOY) {
    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;font-size:10px;color:var(--t3)">';
    h += '<span>' + (bas + 1) + '–' + Math.min(bas + _SAYFA_BOY, fl.length) + ' / ' + fl.length + ' talimat</span>';
    h += '<div style="display:flex;gap:4px">';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._talimatSetSayfa(' + (_sayfa - 1) + ')" style="font-size:10px;padding:2px 8px"' + (_sayfa <= 1 ? ' disabled' : '') + '>←</button>';
    h += '<button class="btn btns" onclick="event.stopPropagation();window._talimatSetSayfa(' + (_sayfa + 1) + ')" style="font-size:10px;padding:2px 8px"' + (_sayfa >= toplamS ? ' disabled' : '') + '>→</button>';
    h += '</div></div>';
  }
  return h;
}

// ── Takvim ───────────────────────────────────────────────────
function _renderTakvim(all) {
  var now = new Date();
  var yil = now.getFullYear();
  var ay = now.getMonth();
  var gunSayisi = new Date(yil, ay + 1, 0).getDate();
  var ayAdi = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'][ay];

  var h = '<div style="font-size:13px;font-weight:500;margin-bottom:12px">' + ayAdi + ' ' + yil + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';
  ['Pzt','Sal','Car','Per','Cum','Cmt','Paz'].forEach(function(g) {
    h += '<div style="text-align:center;font-size:10px;font-weight:600;color:var(--t3);padding:4px">' + g + '</div>';
  });

  var ilkGun = new Date(yil, ay, 1).getDay();
  ilkGun = ilkGun === 0 ? 6 : ilkGun - 1;
  for (var i = 0; i < ilkGun; i++) h += '<div></div>';

  for (var gun = 1; gun <= gunSayisi; gun++) {
    var gunStr = yil + '-' + String(ay + 1).padStart(2, '0') + '-' + String(gun).padStart(2, '0');
    var gunTalimatlar = all.filter(function(t) {
      if (!t.aktif) return false;
      if (t.tekrar === 'gunluk') return true;
      if (t.tekrar === 'haftalik') return new Date(gunStr).getDay() === 1;
      if (t.tekrar === 'aylik' && t.tekrar_gun) return t.tekrar_gun === gun;
      if (t.sonraki_calisma === gunStr) return true;
      return false;
    });
    var bugun = gunStr === _today();
    h += '<div style="min-height:48px;padding:4px;border:1px solid ' + (bugun ? 'var(--ac)' : 'var(--b)') + ';border-radius:6px;background:' + (bugun ? 'rgba(99,102,241,.05)' : 'var(--sf)') + '">';
    h += '<div style="font-size:10px;font-weight:' + (bugun ? '700' : '400') + ';color:' + (bugun ? 'var(--ac)' : 'var(--t3)') + '">' + gun + '</div>';
    gunTalimatlar.forEach(function(t) {
      var tip = TIP_MAP[t.tip] || TIP_MAP.zamanli;
      h += '<div style="font-size:8px;padding:1px 3px;border-radius:3px;background:' + tip.bg + ';color:' + tip.fg + ';margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + _esc(t.baslik) + '">' + tip.emoji + ' ' + _esc((t.baslik || '').slice(0, 12)) + '</div>';
    });
    h += '</div>';
  }
  h += '</div>';
  return h;
}

// ── Gecmis ───────────────────────────────────────────────────
function _renderGecmis(all) {
  var loglar = all.filter(function(t) { return t.son_calisma; })
    .sort(function(a, b) { return (b.son_calisma || '').localeCompare(a.son_calisma || ''); })
    .slice(0, 50);
  if (!loglar.length) return '<div style="text-align:center;padding:48px;color:var(--t3)">Henuz gecmis yok</div>';
  var h = '';
  loglar.forEach(function(t) {
    var tip = TIP_MAP[t.tip] || TIP_MAP.zamanli;
    h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">';
    h += '<span style="font-size:14px">' + tip.emoji + '</span>';
    h += '<div style="flex:1"><div style="font-size:12px;font-weight:500">' + _esc(t.baslik) + '</div>';
    h += '<div style="font-size:10px;color:var(--t3)">Son calisma: ' + (t.son_calisma || '—') + '</div></div>';
    h += '<span style="font-size:10px;color:var(--t3)">' + (t.sonraki_calisma || '—') + '</span>';
    h += '</div>';
  });
  return h;
}

// ════════════════════════════════════════════════════════════════
// CRUD
// ════════════════════════════════════════════════════════════════

window.openTalimatModal = function(id) {
  var t = id ? _loadVisible().find(function(x) { return String(x.id) === String(id); }) : null;
  var old = _g('mo-talimat'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-talimat';
  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:14px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700">' + (t ? 'Talimat Duzenle' : '+ Talimat Ekle') + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
    + '<input type="hidden" id="tlt-eid" value="' + (t ? t.id : '') + '">'
    + '<div><div class="fl">Baslik *</div><input class="fi" id="tlt-baslik" value="' + _esc(t?.baslik || '') + '" placeholder="Aylik cari raporu gonder"></div>'
    + '<div><div class="fl">Aciklama</div><textarea class="fi" id="tlt-aciklama" rows="2" style="resize:vertical">' + _esc(t?.aciklama || '') + '</textarea></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">Tip</div><select class="fi" id="tlt-tip" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="zamanli"' + (t?.tip === 'zamanli' ? ' selected' : '') + '>Zamanli</option><option value="tetikleyici"' + (t?.tip === 'tetikleyici' ? ' selected' : '') + '>Tetikleyici</option><option value="hatirlatma"' + (t?.tip === 'hatirlatma' ? ' selected' : '') + '>Hatirlatma</option><option value="rapor"' + (t?.tip === 'rapor' ? ' selected' : '') + '>Rapor</option></select></div>'
    + '<div><div class="fl">Tekrar</div><select class="fi" id="tlt-tekrar" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="gunluk"' + (t?.tekrar === 'gunluk' ? ' selected' : '') + '>Gunluk</option><option value="haftalik"' + (t?.tekrar === 'haftalik' ? ' selected' : '') + '>Haftalik</option><option value="aylik"' + (t?.tekrar === 'aylik' ? ' selected' : '') + '>Aylik</option><option value="yillik"' + (t?.tekrar === 'yillik' ? ' selected' : '') + '>Yillik</option><option value="tek_seferlik"' + (t?.tekrar === 'tek_seferlik' ? ' selected' : '') + '>Tek Seferlik</option></select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    + '<div><div class="fl">Ayin Gunu</div><input class="fi" type="number" id="tlt-gun" min="1" max="31" value="' + (t?.tekrar_gun || '') + '" placeholder="3"></div>'
    + '<div><div class="fl">Saat</div><input class="fi" type="time" id="tlt-saat" value="' + (t?.tekrar_saat || '09:00') + '"></div>'
    + '<div><div class="fl">Hedef Modul</div><select class="fi" id="tlt-modul" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="genel">Genel</option><option value="cari"' + (t?.hedef_modul === 'cari' ? ' selected' : '') + '>Cari</option><option value="pirim"' + (t?.hedef_modul === 'pirim' ? ' selected' : '') + '>Pirim</option><option value="kpi"' + (t?.hedef_modul === 'kpi' ? ' selected' : '') + '>KPI</option><option value="ihracat"' + (t?.hedef_modul === 'ihracat' ? ' selected' : '') + '>Ihracat</option><option value="satinalma"' + (t?.hedef_modul === 'satinalma' ? ' selected' : '') + '>Satinalma</option><option value="kargo"' + (t?.hedef_modul === 'kargo' ? ' selected' : '') + '>Kargo</option><option value="pusula-pro"' + ((t?.hedef_modul === 'pusula-pro' || t?.hedef_modul === 'pusula') ? ' selected' : '') + '>Pusula</option></select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div><div class="fl">Aksiyon</div><select class="fi" id="tlt-aksiyon" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><option value="bildirim"' + (t?.aksiyon === 'bildirim' ? ' selected' : '') + '>Bildirim</option><option value="rapor"' + (t?.aksiyon === 'rapor' ? ' selected' : '') + '>Rapor</option><option value="email"' + (t?.aksiyon === 'email' ? ' selected' : '') + '>Email</option><option value="gorev_olustur"' + (t?.aksiyon === 'gorev_olustur' ? ' selected' : '') + '>Gorev Olustur</option></select></div>'
    + '<div><div class="fl">Baslangic</div><input class="fi" type="date" id="tlt-bas" value="' + (t?.baslangic_tarihi || _today()) + '"></div></div>'
    + '</div>'
    + '<div style="padding:14px 20px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;gap:8px">'
    + '<button class="btn" onclick="this.closest(\'.mo\').remove()">Iptal</button>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window.saveTalimat()">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  window.openMo?.('mo-talimat');
};

window.saveTalimat = function() {
  var baslik = (_g('tlt-baslik')?.value || '').trim();
  if (!baslik) { window.toast?.('Baslik zorunlu', 'err'); return; }
  var d = _load();
  var eid = _g('tlt-eid')?.value;
  var fields = {
    baslik: baslik,
    aciklama: _g('tlt-aciklama')?.value || '',
    tip: _g('tlt-tip')?.value || 'zamanli',
    tekrar: _g('tlt-tekrar')?.value || 'aylik',
    tekrar_gun: parseInt(_g('tlt-gun')?.value) || null,
    tekrar_saat: _g('tlt-saat')?.value || '09:00',
    hedef_modul: _g('tlt-modul')?.value || 'genel',
    aksiyon: _g('tlt-aksiyon')?.value || 'bildirim',
    baslangic_tarihi: _g('tlt-bas')?.value || _today(),
    guncelleme: _now(),
  };
  fields.sonraki_calisma = _hesaplaSonraki(fields);

  if (eid) {
    var t = d.find(function(x) { return String(x.id) === String(eid); });
    if (t) Object.assign(t, fields);
  } else {
    d.unshift(Object.assign({
      id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(),
      aktif: true,
      son_calisma: null,
      olusturan: _cu()?.id,
      olusturma: _now(),
      isDeleted: false,
    }, fields));
  }
  _store(d);
  _g('mo-talimat')?.remove();
  window.toast?.(eid ? 'Guncellendi' : 'Talimat eklendi', 'ok');
  window.logActivity?.('talimat', baslik + (eid ? ' guncellendi' : ' eklendi'));
  renderTalimatlar();
};

window.delTalimat = function(id) {
  if (!window._yetkiKontrol?.('sil')) return;
  window.confirmModal?.('Bu talimat silinecek?', {
    title: 'Talimat Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var d = _load();
      var t = d.find(function(x) { return String(x.id) === String(id); });
      if (t) { t.isDeleted = true; t.deletedAt = _now(); }
      _store(d);
      window.toast?.('Silindi', 'ok');
      renderTalimatlar();
    }
  });
};

window.toggleTalimat = function(id) {
  var d = _load();
  var t = d.find(function(x) { return String(x.id) === String(id); });
  if (t) { t.aktif = !t.aktif; t.guncelleme = _now(); }
  _store(d);
  renderTalimatlar();
};

function _hesaplaSonraki(fields) {
  var bugun = _today();
  if (fields.tekrar === 'gunluk') {
    var yarin = new Date(); yarin.setDate(yarin.getDate() + 1);
    return yarin.toISOString().slice(0, 10);
  }
  if (fields.tekrar === 'haftalik') {
    var haftaya = new Date(); haftaya.setDate(haftaya.getDate() + (7 - haftaya.getDay() + 1));
    return haftaya.toISOString().slice(0, 10);
  }
  if (fields.tekrar === 'aylik' && fields.tekrar_gun) {
    var now = new Date();
    var sonraki = new Date(now.getFullYear(), now.getMonth(), fields.tekrar_gun);
    if (sonraki <= now) sonraki.setMonth(sonraki.getMonth() + 1);
    return sonraki.toISOString().slice(0, 10);
  }
  return bugun;
}

// ════════════════════════════════════════════════════════════════
// TOPLU ISLEM + EXPORT + KONTROL
// ════════════════════════════════════════════════════════════════

window._talimatBulkCheck = function() {
  var n = document.querySelectorAll('.tlt-bulk-chk:checked').length;
  var bar = _g('tlt-bulk-bar');
  var cnt = _g('tlt-bulk-cnt');
  if (bar) bar.style.display = n ? 'flex' : 'none';
  if (cnt) cnt.textContent = n + ' talimat';
};

window._talimatTopluSil = function() {
  if (!window._yetkiKontrol?.('toplu_sil')) return;
  var ids = [];
  document.querySelectorAll('.tlt-bulk-chk:checked').forEach(function(cb) { ids.push(cb.dataset.id); });
  if (!ids.length) return;
  window.confirmModal?.(ids.length + ' talimat silinecek?', {
    title: 'Toplu Sil', danger: true, confirmText: 'Evet',
    onConfirm: function() {
      var d = _load();
      ids.forEach(function(id) {
        var t = d.find(function(x) { return String(x.id) === String(id); });
        if (t) { t.isDeleted = true; t.deletedAt = _now(); }
      });
      _store(d);
      window.toast?.(ids.length + ' talimat silindi', 'ok');
      renderTalimatlar();
    }
  });
};

window._talimatTopluToggle = function(aktif) {
  if (!window._yetkiKontrol?.('toplu_guncelle')) return;
  var ids = [];
  document.querySelectorAll('.tlt-bulk-chk:checked').forEach(function(cb) { ids.push(cb.dataset.id); });
  if (!ids.length) return;
  var d = _load();
  ids.forEach(function(id) {
    var t = d.find(function(x) { return String(x.id) === String(id); });
    if (t) { t.aktif = aktif; t.guncelleme = _now(); }
  });
  _store(d);
  window.toast?.(ids.length + ' talimat ' + (aktif ? 'aktif' : 'pasif') + ' yapildi', 'ok');
  renderTalimatlar();
};

window._talimatExport = function() {
  var liste = _loadVisible();
  if (!liste.length) { window.toast?.('Kayit yok', 'warn'); return; }
  var baslik = ['ID','Baslik','Tip','Tekrar','Gun','Saat','Modul','Aksiyon','Aktif','Sonraki'];
  var satirlar = liste.map(function(t) {
    return [t.id, t.baslik, t.tip, t.tekrar, t.tekrar_gun || '', t.tekrar_saat || '', t.hedef_modul, t.aksiyon, t.aktif ? 'Evet' : 'Hayir', t.sonraki_calisma || ''];
  });
  var csv = [baslik].concat(satirlar)
    .map(function(r) { return r.map(function(c) { return '"' + String(c || '').replace(/"/g, '""') + '"'; }).join(','); })
    .join('\n');
  var a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'talimatlar_' + _today() + '.csv';
  a.click();
  window.toast?.('Export tamamlandi', 'ok');
};

/** Her giris/gunde bir calisir — zamani gelenleri tetikler */
window._talimatKontrol = function() {
  var bugun = _today();
  var d = _load();
  var tetiklenen = 0;
  d.forEach(function(t) {
    if (t.isDeleted || !t.aktif) return;
    if (t.sonraki_calisma && t.sonraki_calisma <= bugun) {
      // Tetikle
      if (t.aksiyon === 'bildirim') {
        window.addNotif?.('📋', t.baslik, 'info', t.hedef_modul || 'genel');
      } else if (t.aksiyon === 'gorev_olustur') {
        window.toast?.('Talimat: ' + t.baslik, 'info');
      }
      t.son_calisma = bugun;
      t.sonraki_calisma = _hesaplaSonraki(t);
      tetiklenen++;
    }
  });
  if (tetiklenen > 0) {
    _store(d);
    window.logActivity?.('talimat', tetiklenen + ' talimat tetiklendi');
  }
};

window._talimatSekme = function(s) { _aktifSekme = s; renderTalimatlar(); };
window._talimatAra = function(q) { _araQ = q; _sayfa = 1; renderTalimatlar(); };
window._talimatSetSayfa = function(p) { _sayfa = p; renderTalimatlar(); };

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════
window.renderTalimatlar = renderTalimatlar;

// Otomatik kontrol — sayfa yuklendiginde 3sn sonra
setTimeout(function() { window._talimatKontrol?.(); }, 3000);

})();
