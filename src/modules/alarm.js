/**
 * src/modules/alarm.js — v1.0.0
 * Akıllı Alarm Sistemi — vade, stok, kur, ödeme alarmları
 * localStorage: ak_alarms1, ak_alarm_log1
 * Anayasa: K01 IIFE, GK-16 logActivity
 */
(function AlarmModule() {
'use strict';

var _g = function(id) { return document.getElementById(id); };
var _cu = function() { return window.CU?.() || window.Auth?.getCU?.(); };
var _isAdmin = function() { return window.isAdmin?.() || (_cu()?.role === 'admin'); };
var _genId = function() { return typeof window.generateNumericId === 'function' ? window.generateNumericId() : Date.now(); };
var _now = function() { return new Date().toISOString().slice(0, 19).replace('T', ' '); };
var _today = function() { return new Date().toISOString().slice(0, 10); };
var _esc = function(s) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s || '')) : String(s || ''); };

var ALARM_KEY = 'ak_alarms1';
var ALARM_LOG_KEY = 'ak_alarm_log1';

function _loadAlarms() { try { return JSON.parse(localStorage.getItem(ALARM_KEY) || '[]'); } catch (e) { return []; } }
function _storeAlarms(d) { try { localStorage.setItem(ALARM_KEY, JSON.stringify(d.slice(0, 100))); } catch (e) {} }
function _loadLog() { try { return JSON.parse(localStorage.getItem(ALARM_LOG_KEY) || '[]'); } catch (e) { return []; } }
function _storeLog(d) { try { localStorage.setItem(ALARM_LOG_KEY, JSON.stringify(d.slice(0, 200))); } catch (e) {} }

var ALARM_TYPES = {
  vade: { l: 'Vade', c: '#DC2626', bg: 'rgba(220,38,38,.1)' },
  stok: { l: 'Stok', c: '#D97706', bg: 'rgba(217,119,6,.1)' },
  kur: { l: 'Kur', c: '#7C3AED', bg: 'rgba(124,58,237,.1)' },
  odeme: { l: 'Ödeme', c: '#185FA5', bg: 'rgba(24,95,165,.1)' },
  genel: { l: 'Genel', c: '#16A34A', bg: 'rgba(22,163,74,.1)' },
};

window.renderAlarm = function() {
  var panel = _g('panel-alarm'); if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div class="ph"><div><div class="pht">Akıllı Alarmlar</div><div class="phs">Vade, stok, kur ve ödeme alarmları — otomatik kontrol</div></div><div class="ur"><button class="btn btns" onclick="window._alarmRunNow()">Şimdi Kontrol Et</button><button class="btn btnp" onclick="window._alarmOpenModal(null)">+ Alarm Ekle</button></div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;padding:0 20px;margin-bottom:20px" id="alr-kpi"></div>'
      + '<div style="display:flex;gap:0;border-bottom:1px solid var(--b);margin-bottom:16px;padding:0 20px"><div class="odm-tab on" onclick="window._alrTab(\'aktif\',this)">Aktif Alarmlar</div><div class="odm-tab" onclick="window._alrTab(\'log\',this)">Alarm Geçmişi</div></div>'
      + '<div id="alr-content-aktif" style="padding:0 20px"></div><div id="alr-content-log" style="display:none;padding:0 20px"></div>';
  }
  _alarmRenderKpi();
  _alarmRenderList();
};

function _alarmRenderKpi() {
  var el = _g('alr-kpi'); if (!el) return;
  var alarms = _loadAlarms().filter(function(a) { return !a.isDeleted && a.aktif; });
  var today = _today();
  var tetiklenen = _loadLog().filter(function(l) { return l.ts && l.ts.slice(0, 10) === today; }).length;
  var stats = [
    { l: 'Aktif Alarm', v: alarms.length, c: '#185FA5' },
    { l: 'Bugün Tetiklenen', v: tetiklenen, c: '#D97706' },
    { l: 'Vade Alarmı', v: alarms.filter(function(a) { return a.tur === 'vade'; }).length, c: '#DC2626' },
    { l: 'Stok Alarmı', v: alarms.filter(function(a) { return a.tur === 'stok'; }).length, c: '#7C3AED' },
  ];
  el.innerHTML = stats.map(function(s) { return '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:12px;padding:14px 16px"><div style="font-size:22px;font-weight:700;color:' + s.c + ';font-family:\'DM Mono\',monospace">' + s.v + '</div><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">' + s.l + '</div></div>'; }).join('');
}

function _alarmRenderList() {
  var el = _g('alr-content-aktif'); if (!el) return;
  var alarms = _loadAlarms().filter(function(a) { return !a.isDeleted; });
  if (!alarms.length) { el.innerHTML = '<div style="text-align:center;padding:48px;color:var(--t2)"><div style="font-size:40px;margin-bottom:12px">🔔</div><div style="font-size:14px;font-weight:500">Henüz alarm yok</div><div style="margin-top:12px"><button class="btn btnp" onclick="window._alarmOpenModal(null)">+ İlk Alarmı Ekle</button></div></div>'; return; }
  el.innerHTML = '<table class="tbl"><thead><tr><th>Tür</th><th>Alarm Adı</th><th>Koşul</th><th>Son Tetik</th><th>Durum</th><th></th></tr></thead><tbody>' + alarms.map(function(a) {
    var t = ALARM_TYPES[a.tur] || ALARM_TYPES.genel;
    return '<tr><td><span style="font-size:9px;padding:2px 8px;border-radius:4px;background:' + t.bg + ';color:' + t.c + ';font-weight:500">' + t.l + '</span></td><td style="font-size:12px;font-weight:500">' + _esc(a.ad) + '</td><td style="font-size:11px;color:var(--t2)">' + _esc(a.kosul || '—') + '</td><td style="font-size:10px;font-family:\'DM Mono\',monospace">' + (a.sonTetik || '—') + '</td><td><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px"><input type="checkbox" ' + (a.aktif ? 'checked' : '') + ' onchange="window._alarmToggle(' + a.id + ',this.checked)">' + (a.aktif ? 'Aktif' : 'Pasif') + '</label></td><td><div style="display:flex;gap:4px"><button class="btn btns" onclick="window._alarmOpenModal(' + a.id + ')">✏️</button>' + (_isAdmin() ? '<button class="btn btns btnd" onclick="window._alarmDelete(' + a.id + ')">🗑</button>' : '') + '</div></td></tr>';
  }).join('') + '</tbody></table>';
}

window._alrTab = function(tab, el) {
  document.querySelectorAll('#panel-alarm .odm-tab').forEach(function(b) { b.classList.remove('on'); });
  if (el) el.classList.add('on');
  var aktif = _g('alr-content-aktif'); var log = _g('alr-content-log');
  if (aktif) aktif.style.display = tab === 'aktif' ? '' : 'none';
  if (log) { log.style.display = tab === 'log' ? '' : 'none'; if (tab === 'log') _alarmRenderLog(); }
};

function _alarmRenderLog() {
  var el = _g('alr-content-log'); if (!el) return;
  var logs = _loadLog().slice(0, 50);
  if (!logs.length) { el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--t3)">Henüz alarm tetiklenmedi</div>'; return; }
  el.innerHTML = '<table class="tbl"><thead><tr><th>Zaman</th><th>Alarm</th><th>Mesaj</th><th>Seviye</th></tr></thead><tbody>' + logs.map(function(l) { var c = l.seviye === 'kritik' ? '#DC2626' : l.seviye === 'uyari' ? '#D97706' : '#16A34A'; return '<tr><td style="font-size:10px;font-family:\'DM Mono\',monospace">' + (l.ts || '—') + '</td><td style="font-size:12px;font-weight:500">' + _esc(l.ad || '—') + '</td><td style="font-size:11px">' + _esc(l.mesaj) + '</td><td><span style="font-size:9px;padding:2px 6px;border-radius:4px;background:' + c + '18;color:' + c + ';font-weight:600">' + (l.seviye || 'bilgi') + '</span></td></tr>'; }).join('') + '</tbody></table>';
}

window._alarmOpenModal = function(id) {
  var a = id ? _loadAlarms().find(function(x) { return x.id === id; }) : null;
  var ex = _g('mo-alarm'); if (ex) ex.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-alarm';
  mo.innerHTML = '<div class="moc" style="max-width:520px;padding:0;border-radius:14px;overflow:hidden"><div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600;color:var(--t)">' + (a ? '✏️ Alarm Düzenle' : '+ Alarm Ekle') + '</div><button onclick="document.getElementById(\'mo-alarm\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div><div style="padding:18px 20px"><input type="hidden" id="alr-eid" value="' + (a ? a.id : '') + '"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="grid-column:1/-1"><div class="fl">Alarm Adı *</div><input class="fi" id="alr-ad" value="' + _esc(a ? a.ad : '') + '" placeholder="USD/TRY 50 üzeri"></div><div><div class="fl">Tür *</div><select class="fi" id="alr-tur">' + Object.keys(ALARM_TYPES).map(function(k) { return '<option value="' + k + '"' + (a && a.tur === k ? ' selected' : '') + '>' + ALARM_TYPES[k].l + '</option>'; }).join('') + '</select></div><div><div class="fl">Seviye</div><select class="fi" id="alr-seviye"><option value="bilgi"' + (a && a.seviye === 'bilgi' ? ' selected' : '') + '>Bilgi</option><option value="uyari"' + (a && a.seviye === 'uyari' ? ' selected' : '') + '>Uyarı</option><option value="kritik"' + (!a || a.seviye === 'kritik' ? ' selected' : '') + '>Kritik</option></select></div><div style="grid-column:1/-1"><div class="fl">Koşul / Açıklama</div><input class="fi" id="alr-kosul" value="' + _esc(a ? a.kosul : '') + '" placeholder="Kur > 50, Stok < 10, Vade 3 gün"></div><div><div class="fl">Eşik Değer</div><input class="fi" type="number" id="alr-esik" value="' + (a ? a.esik || '' : '') + '" placeholder="50"></div><div><div class="fl">Tekrar</div><select class="fi" id="alr-tekrar"><option value="10"' + (a && a.tekrar === 10 ? ' selected' : '') + '>Her 10 dk</option><option value="60"' + (a && a.tekrar === 60 ? ' selected' : '') + '>Her saat</option><option value="1440"' + (a && a.tekrar === 1440 ? ' selected' : '') + '>Günlük</option></select></div></div><div style="margin-top:8px"><div class="fl">Not</div><textarea class="fi" id="alr-not" rows="2" style="resize:vertical">' + _esc(a ? a.not : '') + '</textarea></div></div><div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end"><button class="btn btns" onclick="document.getElementById(\'mo-alarm\')?.remove()">İptal</button><button class="btn btnp" onclick="window._alarmSave()">Kaydet</button></div></div>';
  document.body.appendChild(mo); setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._alarmSave = function() {
  var ad = (_g('alr-ad')?.value || '').trim(); if (!ad) { window.toast?.('Alarm adı zorunlu', 'err'); return; }
  var d = _loadAlarms(); var eid = parseInt(_g('alr-eid')?.value || '0');
  var entry = { ad: ad, tur: _g('alr-tur')?.value || 'genel', seviye: _g('alr-seviye')?.value || 'kritik', kosul: (_g('alr-kosul')?.value || '').trim(), esik: parseFloat(_g('alr-esik')?.value || 0), tekrar: parseInt(_g('alr-tekrar')?.value || 10), not: (_g('alr-not')?.value || '').trim(), aktif: true, updatedAt: _now() };
  if (eid) { var ex = d.find(function(x) { return x.id === eid; }); if (ex) Object.assign(ex, entry); }
  else { entry.id = _genId(); entry.createdAt = _now(); entry.createdBy = _cu()?.id; d.unshift(entry); }
  _storeAlarms(d); _g('mo-alarm')?.remove(); window.renderAlarm?.();
  window.toast?.(eid ? 'Alarm güncellendi' : 'Alarm eklendi', 'ok');
  window.logActivity?.('system', (eid ? 'Alarm güncellendi: ' : 'Alarm eklendi: ') + ad);
};

window._alarmToggle = function(id, aktif) { var d = _loadAlarms(); var a = d.find(function(x) { return x.id === id; }); if (!a) return; a.aktif = aktif; a.updatedAt = _now(); _storeAlarms(d); window.renderAlarm?.(); window.toast?.(aktif ? 'Alarm aktif' : 'Alarm pasif', 'ok'); };

window._alarmDelete = function(id) {
  if (!_isAdmin()) return;
  window.confirmModal('Bu alarmı silmek istediğinizden emin misiniz?', { title: 'Alarm Sil', danger: true, confirmText: 'Evet, Sil', onConfirm: function() { var d = _loadAlarms(); var a = d.find(function(x) { return x.id === id; }); if (!a) return; a.isDeleted = true; a.deletedAt = _now(); _storeAlarms(d); window.renderAlarm?.(); window.toast?.('Alarm silindi', 'ok'); } });
};

function _alarmLog(alarm, mesaj) {
  var log = _loadLog(); log.unshift({ id: _genId(), ad: alarm.ad, tur: alarm.tur, seviye: alarm.seviye, mesaj: mesaj, ts: _now() }); _storeLog(log);
  window.addNotif?.(alarm.seviye === 'kritik' ? '🔴' : alarm.seviye === 'uyari' ? '⚠️' : 'ℹ️', alarm.ad + ': ' + mesaj, alarm.seviye === 'kritik' ? 'err' : 'warn', 'alarm');
}

function _checkAlarms() {
  var alarms = _loadAlarms().filter(function(a) { return !a.isDeleted && a.aktif; });
  if (!alarms.length) return;
  var today = _today(); var now = Date.now();
  alarms.forEach(function(alarm) {
    if (alarm.sonKontrol) { var diff = (now - new Date(alarm.sonKontrol).getTime()) / 60000; if (diff < (alarm.tekrar || 10)) return; }
    var tetiklendi = false; var mesaj = '';
    if (alarm.tur === 'vade') {
      var gun = alarm.esik || 3; var odm = typeof window.loadOdm === 'function' ? window.loadOdm() : [];
      var vadeli = odm.filter(function(o) { if (o.isDeleted || o.paid || !o.due) return false; var kalan = Math.ceil((new Date(o.due) - new Date()) / 86400000); return kalan >= 0 && kalan <= gun; });
      if (vadeli.length > 0) { tetiklendi = true; mesaj = vadeli.length + ' ödemenin vadesi ' + gun + ' gün içinde'; }
    } else if (alarm.tur === 'odeme') {
      var odm2 = typeof window.loadOdm === 'function' ? window.loadOdm() : [];
      var gecikti = odm2.filter(function(o) { return !o.isDeleted && !o.paid && o.due && o.due < today; });
      if (gecikti.length > 0) { tetiklendi = true; mesaj = gecikti.length + ' ödeme gecikmiş'; }
    } else if (alarm.tur === 'kur') {
      var usd = (window._tickerRates || {}).USD || 0; var esik = alarm.esik || 50;
      if (usd > 0 && usd > esik) { tetiklendi = true; mesaj = 'USD/TRY ' + usd.toFixed(2) + ' — eşik (' + esik + ') aşıldı'; }
    } else if (alarm.tur === 'stok') {
      var stok = typeof window.loadStok === 'function' ? window.loadStok() : []; var esik2 = alarm.esik || 5;
      var kritik = stok.filter(function(s) { return !s.isDeleted && (s.miktar || s.qty || 0) <= esik2; });
      if (kritik.length > 0) { tetiklendi = true; mesaj = kritik.length + ' üründe stok kritik (≤' + esik2 + ')'; }
    }
    if (tetiklendi) { _alarmLog(alarm, mesaj); alarm.sonTetik = _now(); }
    alarm.sonKontrol = new Date().toISOString();
    var d = _loadAlarms(); var idx = d.findIndex(function(x) { return x.id === alarm.id; });
    if (idx !== -1) { d[idx].sonTetik = alarm.sonTetik; d[idx].sonKontrol = alarm.sonKontrol; _storeAlarms(d); }
  });
}

window._alarmRunNow = function() { _checkAlarms(); window.renderAlarm?.(); window.toast?.('Alarm kontrolü tamamlandı', 'ok'); };

setInterval(_checkAlarms, 10 * 60 * 1000);
setTimeout(_checkAlarms, 5000);

})();
