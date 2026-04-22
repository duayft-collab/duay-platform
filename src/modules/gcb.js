/**
 * src/modules/gcb.js — v1.0.0
 * Gümrük Çıkış Beyannamesi (GÇB) Takip Modülü
 * localStorage: ak_gcb1 | Firestore: duay_tenant/gcb
 * Anayasa: K01 IIFE, K04 try-catch, K06 soft-delete
 */
(function GcbModule() {
'use strict';

var _g   = function(id) { return document.getElementById(id); };
var _esc = window._esc;
var _cu  = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _isAdmin = function() { return window.isAdmin?.() || (_cu()?.role === 'admin'); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return window._istNow ? window._istNow() : new Date().toISOString().slice(0,19).replace('T',' '); }; /* [SAAT-FIX-TZ-001] Istanbul saati */

var _load  = function() { try { return JSON.parse(localStorage.getItem('ak_gcb1') || '[]'); } catch(e) { return []; } };
var _store = function(d) { try { localStorage.setItem('ak_gcb1', JSON.stringify(d.slice(0, 200))); } catch(e) {} };

var GCB_STATUS = {
  taslak:    { l:'Taslak',    c:'#6B7280', bg:'rgba(107,114,128,.1)' },
  bekliyor:  { l:'Bekliyor',  c:'#D97706', bg:'rgba(245,158,11,.1)'  },
  onaylandi: { l:'Onaylandı', c:'#185FA5', bg:'rgba(24,95,165,.1)'   },
  kapandi:   { l:'Kapandı',   c:'#16A34A', bg:'rgba(34,197,94,.1)'   },
  iptal:     { l:'İptal',     c:'#DC2626', bg:'rgba(239,68,68,.1)'   },
};

var _search = '';
var _statusF = '';

function _nextGcbNo() {
  var y = new Date().getFullYear();
  var all = _load();
  var max = 0;
  all.forEach(function(r) {
    var m = (r.gcbNo || '').match(/GCB-(\d{4})-(\d{4})/);
    if (m && parseInt(m[1]) === y && parseInt(m[2]) > max) max = parseInt(m[2]);
  });
  return 'GCB-' + y + '-' + String(max + 1).padStart(4, '0');
}

window.renderGcb = function() {
  var panel = _g('panel-gcb');
  if (!panel) return;

  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div class="ph"><div><div class="pht">GCB Takip</div><div class="phs">Gümrük Çıkış Beyannamesi kayıt ve takip</div></div><div class="ur"><button class="btn btnp" onclick="window._gcbOpenModal(null)">+ GCB Ekle</button></div></div>'
      + '<div style="padding:0 20px 14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + '<input class="fi" id="gcb-search" placeholder="GCB No, alici, urun ara..." oninput="window._gcbSearch(this.value)" style="max-width:260px;height:34px;border-radius:7px;font-size:11px">'
      + '<select class="fi" id="gcb-status-f" onchange="window._gcbStatusFilter(this.value)" style="max-width:160px;height:34px;border-radius:7px;font-size:11px"><option value="">Tüm Durumlar</option>' + Object.keys(GCB_STATUS).map(function(k) { return '<option value="' + k + '">' + GCB_STATUS[k].l + '</option>'; }).join('') + '</select>'
      + '<span id="gcb-count" style="font-size:11px;color:var(--t3);margin-left:auto"></span>'
      + '</div>'
      + '<div id="gcb-list" style="padding:0 20px"></div>';
  }

  _gcbRenderList();
};

function _gcbRenderList() {
  var list = _g('gcb-list'); if (!list) return;
  var items = _load().filter(function(r) { return !r.isDeleted; });

  if (_search) { var q = _search.toLowerCase(); items = items.filter(function(r) { return (r.gcbNo || '').toLowerCase().indexOf(q) !== -1 || (r.alici || '').toLowerCase().indexOf(q) !== -1 || (r.urun || '').toLowerCase().indexOf(q) !== -1 || (r.expNo || '').toLowerCase().indexOf(q) !== -1; }); }
  if (_statusF) items = items.filter(function(r) { return r.status === _statusF; });

  var cnt = _g('gcb-count'); if (cnt) cnt.textContent = items.length + ' kayit';

  if (!items.length) {
    list.innerHTML = '<div style="text-align:center;padding:48px;color:var(--t2)"><div style="font-size:40px;margin-bottom:12px">📋</div><div style="font-size:15px;font-weight:500">GCB kaydı bulunamadı</div><div style="margin-top:12px"><button class="btn btnp" onclick="window._gcbOpenModal(null)">+ İlk GCB\'yi Ekle</button></div></div>';
    return;
  }

  var today = new Date().toISOString().slice(0, 10);
  var rows = items.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); }).map(function(r) {
    var st = GCB_STATUS[r.status] || GCB_STATUS.taslak;
    var gecikti = r.kapanisTarih && r.kapanisTarih < today && r.status !== 'kapandi' && r.status !== 'iptal';
    return '<tr>'
      + '<td style="font-family:\'DM Mono\',monospace;font-size:11px;font-weight:600;color:var(--ac)">' + _esc(r.gcbNo) + '</td>'
      + '<td style="font-size:12px;font-weight:500">' + _esc(r.expNo || '—') + '</td>'
      + '<td style="font-size:12px">' + _esc(r.alici || '—') + '</td>'
      + '<td style="font-size:12px">' + _esc(r.urun || '—') + '</td>'
      + '<td style="font-size:11px;font-family:\'DM Mono\',monospace">' + (r.cikis || '—') + '</td>'
      + '<td style="font-size:11px;font-family:\'DM Mono\',monospace;color:' + (gecikti ? '#DC2626' : 'var(--t2)') + '">' + (r.kapanisTarih || '—') + (gecikti ? ' ⚠' : '') + '</td>'
      + '<td><span style="font-size:9px;padding:2px 8px;border-radius:4px;background:' + st.bg + ';color:' + st.c + ';font-weight:500">' + st.l + '</span></td>'
      + '<td><div style="display:flex;gap:4px"><button class="btn btns" onclick="window._gcbOpenModal(' + r.id + ')">✏️</button>' + (_isAdmin() ? '<button class="btn btns btnd" onclick="window._gcbDelete(' + r.id + ')">🗑</button>' : '') + '</div></td>'
      + '</tr>';
  }).join('');

  list.innerHTML = '<table class="tbl"><thead><tr><th>GCB No</th><th>EXP No</th><th>Alici</th><th>Urun</th><th>Cikis</th><th>Kapanis</th><th>Durum</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
}

window._gcbOpenModal = function(id) {
  var r = id ? _load().find(function(x) { return x.id === id; }) : null;
  var ex = _g('mo-gcb'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-gcb';
  mo.innerHTML = '<div class="moc" style="max-width:600px;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600;color:var(--t)">' + (r ? '✏️ GCB Düzenle' : '+ GCB Ekle') + '</div><button onclick="document.getElementById(\'mo-gcb\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="padding:18px 20px"><input type="hidden" id="gcb-eid" value="' + (r ? r.id : '') + '">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div><div class="fl">GCB No</div><input class="fi" id="gcb-no" value="' + _esc(r ? r.gcbNo : _nextGcbNo()) + '" readonly style="background:#E6F1FB"></div>'
    + '<div><div class="fl">EXP No (baglanti)</div><input class="fi" id="gcb-expno" value="' + _esc(r ? r.expNo : '') + '" placeholder="EXP-2026-0001"></div>'
    + '<div><div class="fl">Alici Firma *</div><input class="fi" id="gcb-alici" value="' + _esc(r ? r.alici : '') + '" placeholder="Firma adi"></div>'
    + '<div><div class="fl">Ulke</div><input class="fi" id="gcb-ulke" value="' + _esc(r ? r.ulke : '') + '" placeholder="Almanya"></div>'
    + '<div><div class="fl">Urun / Aciklama *</div><input class="fi" id="gcb-urun" value="' + _esc(r ? r.urun : '') + '" placeholder="Urun adi"></div>'
    + '<div><div class="fl">Miktar</div><input class="fi" id="gcb-miktar" value="' + _esc(r ? r.miktar : '') + '" placeholder="1000 KGS"></div>'
    + '<div><div class="fl">FOB Tutar (USD)</div><input class="fi" id="gcb-tutar" type="number" value="' + (r ? r.tutar || '' : '') + '" placeholder="0"></div>'
    + '<div><div class="fl">Durum</div><select class="fi" id="gcb-status">' + Object.keys(GCB_STATUS).map(function(k) { return '<option value="' + k + '"' + ((r ? r.status : 'taslak') === k ? ' selected' : '') + '>' + GCB_STATUS[k].l + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Cikis Tarihi</div><input class="fi" type="date" id="gcb-cikis" value="' + (r ? r.cikis || '' : '') + '"></div>'
    + '<div><div class="fl">Kapanis Tarihi</div><input class="fi" type="date" id="gcb-kapanis" value="' + (r ? r.kapanisTarih || '' : '') + '"></div>'
    + '</div>'
    + '<div style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="gcb-not" rows="2" style="resize:vertical">' + _esc(r ? r.not : '') + '</textarea></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-gcb\')?.remove()">Iptal</button><button class="btn btnp" onclick="window._gcbSave()">Kaydet</button></div>'
    + '</div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._gcbSave = function() {
  var alici = (_g('gcb-alici')?.value || '').trim();
  var urun = (_g('gcb-urun')?.value || '').trim();
  if (!alici || !urun) { window.toast?.('Alici ve urun zorunludur', 'err'); return; }

  var d = _load();
  var eid = parseInt(_g('gcb-eid')?.value || '0');
  var entry = {
    gcbNo: _g('gcb-no')?.value || '',
    expNo: (_g('gcb-expno')?.value || '').trim(),
    alici: alici,
    ulke: (_g('gcb-ulke')?.value || '').trim(),
    urun: urun,
    miktar: (_g('gcb-miktar')?.value || '').trim(),
    tutar: parseFloat(_g('gcb-tutar')?.value || 0),
    status: _g('gcb-status')?.value || 'taslak',
    cikis: _g('gcb-cikis')?.value || '',
    kapanisTarih: _g('gcb-kapanis')?.value || '',
    not: (_g('gcb-not')?.value || '').trim(),
    updatedAt: _now(),
    updatedBy: _cu()?.id,
  };

  if (eid) {
    var ex = d.find(function(x) { return x.id === eid; });
    if (ex) Object.assign(ex, entry);
  } else {
    entry.id = _genId();
    entry.createdAt = _now();
    entry.createdBy = _cu()?.id;
    d.unshift(entry);
  }

  _store(d);
  _g('mo-gcb')?.remove();
  _gcbRenderList();
  window.toast?.(eid ? 'GCB güncellendi' : 'GCB eklendi', 'ok');
  window.logActivity?.('finans', (eid ? 'GCB güncellendi: ' : 'GCB eklendi: ') + entry.gcbNo);
};

window._gcbDelete = function(id) {
  if (!_isAdmin()) return;
  window.confirmModal('Bu GCB kaydini silmek istediginizden emin misiniz?', {
    title: 'GCB Sil', danger: true, confirmText: 'Evet, Sil',
    onConfirm: function() {
      var d = _load();
      var r = d.find(function(x) { return x.id === id; }); if (!r) return;
      r.isDeleted = true; r.deletedAt = _now(); r.deletedBy = _cu()?.id;
      _store(d);
      _gcbRenderList();
      window.toast?.('GCB silindi', 'ok');
      window.logActivity?.('finans', 'GCB silindi: ' + r.gcbNo);
    }
  });
};

window._gcbSearch = function(v) { _search = v; _gcbRenderList(); };
window._gcbStatusFilter = function(v) { _statusF = v; _gcbRenderList(); };

})();
