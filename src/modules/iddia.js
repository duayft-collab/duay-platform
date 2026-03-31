'use strict';
/**
 * src/modules/iddia.js — v1.0.0 / 2026-03-31
 * Iddia & Challenge Sistemi
 */

(function() {
'use strict';

var _cu = function() { return window.Auth?.getCU?.() || window.CU?.(); };
var _isAdm = function() { return _cu()?.role === 'admin'; };
var _now = function() { return typeof nowTs === 'function' ? nowTs() : new Date().toISOString(); };
var _esc = function(s) { return typeof escapeHtml === 'function' ? escapeHtml(s) : s; };
var _genId = function() { return typeof generateNumericId === 'function' ? generateNumericId() : Date.now(); };

// ════════════════════════════════════════════════════════════════
// ODUL ONERILERI (14 adet)
// ════════════════════════════════════════════════════════════════
var DEFAULT_ODULLER = [
  { ico:'☕', ad:'Kahve ismarla', aciklama:'Ofis kahve molasi — istedigi zaman' },
  { ico:'🍽', ad:'Ogle yemegi', aciklama:'Istedigi restoran, birlikte' },
  { ico:'🎂', ad:'Pasta', aciklama:'Ofise pasta getir' },
  { ico:'🎁', ad:'Kucuk hediye', aciklama:'100-200 TL butce, kazanan secer' },
  { ico:'🧁', ad:'Tatli ikrami', aciklama:'Tum ofise tatli — kek, pogaca, baklava' },
  { ico:'📚', ad:'Kitap hediyesi', aciklama:'Kazananin istedigi kitap' },
  { ico:'🎬', ad:'Sinema bileti', aciklama:'2 kisilik sinema bileti' },
  { ico:'🏆', ad:'Kupa & sertifika', aciklama:'Sirket logolu odul kupasi' },
  { ico:'🌮', ad:'Kahvalti ismarla', aciklama:'Sabah ofis kahvaltisi — ikiniz' },
  { ico:'🧃', ad:'Atistirmalik tabagi', aciklama:'Meyve, kuruyemis, atistirmalik' },
  { ico:'📸', ad:'Fotograf cezasi', aciklama:'Kaybeden profil fotografi degistirir — kazanan secer poz' },
  { ico:'🎤', ad:'Ovgu sunumu', aciklama:'Toplantida kazanani oven 2 dakika sunum' },
  { ico:'🧹', ad:'Ofis gorevi', aciklama:'Bir hafta cay/kahve servisi veya masa toplama' },
  { ico:'🌟', ad:'Sirket ozel odulu', aciklama:'Admin belirler — ekstra izin, bonus vb.' },
];

function _loadOduller() {
  try { var d = JSON.parse(localStorage.getItem('ak_iddia_oduller') || 'null'); if (Array.isArray(d) && d.length) return d; } catch(e) {}
  return DEFAULT_ODULLER;
}
function _storeOduller(d) { localStorage.setItem('ak_iddia_oduller', JSON.stringify(d)); }

// ════════════════════════════════════════════════════════════════
// HAFTALIK HAK KONTROLU
// ════════════════════════════════════════════════════════════════
function _getWeekNumber(d) {
  var date = new Date(d); date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  var week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function _thisWeekKey() {
  var n = new Date();
  return n.getFullYear() + '-W' + _getWeekNumber(n);
}

function _canCreateThisWeek(uid) {
  var d = typeof loadIddialar === 'function' ? loadIddialar() : [];
  var wk = _thisWeekKey();
  var count = d.filter(function(i) { return i.createdBy === uid && i.weekKey === wk && i.tip === 'oz'; }).length;
  return count < 1; // haftada 1 oz iddia
}

// ════════════════════════════════════════════════════════════════
// PANEL INJECT + RENDER
// ════════════════════════════════════════════════════════════════
function _injectPanel() {
  var panel = document.getElementById('panel-iddia');
  if (!panel || panel.dataset.injected) return;
  panel.dataset.injected = '1';

  panel.innerHTML = [
    '<div style="position:sticky;top:0;z-index:200;background:var(--sf);border-bottom:0.5px solid var(--b)">',
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px">',
      '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Iddia & Challenge</div>',
      '<div style="font-size:10px;color:var(--t3);margin-top:2px" id="iddia-sub">Haftalik iddialar ve challengelar</div></div>',
      '<div style="display:flex;gap:6px">',
        '<button onclick="window._openIddiaModal(\'oz\')" class="btn btnp" style="font-size:11px;padding:7px 14px;border-radius:7px">+ Oz Iddia</button>',
        '<button onclick="window._openIddiaModal(\'challenge\')" class="btn" style="font-size:11px;padding:7px 14px;border-radius:7px;background:#D97706;color:#fff;border:none">Challenge Gonder</button>',
        (_isAdm() ? '<button onclick="window._openIddiaOdulYonetimi()" class="btn btns" style="font-size:11px;padding:7px 14px;border-radius:7px">Oduller</button>' : ''),
      '</div>',
    '</div>',
    // Sekmeler
    '<div style="display:flex;border-bottom:0.5px solid var(--b);padding:0 16px">',
      '<div class="iddia-tab on" onclick="window._iddiaTab(\'aktif\',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid var(--ac);color:var(--ac);font-weight:600">Aktif</div>',
      '<div class="iddia-tab" onclick="window._iddiaTab(\'bekleyen\',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2)">Bekleyen</div>',
      '<div class="iddia-tab" onclick="window._iddiaTab(\'tamamlanan\',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2)">Tamamlanan</div>',
      '<div class="iddia-tab" onclick="window._iddiaTab(\'leaderboard\',this)" style="padding:10px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2)">Leaderboard</div>',
    '</div>',
    '</div>',
    '<div id="iddia-list" style="padding:16px 20px"></div>',
  ].join('');
}

var _iddiaCurrentTab = 'aktif';

window._iddiaTab = function(tab, el) {
  _iddiaCurrentTab = tab;
  document.querySelectorAll('.iddia-tab').forEach(function(t) { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--t2)'; t.style.fontWeight = '400'; t.classList.remove('on'); });
  if (el) { el.style.borderBottomColor = 'var(--ac)'; el.style.color = 'var(--ac)'; el.style.fontWeight = '600'; el.classList.add('on'); }
  renderIddia();
};

function renderIddia() {
  _injectPanel();
  var cont = document.getElementById('iddia-list');
  if (!cont) return;
  var cu = _cu();
  var all = typeof loadIddialar === 'function' ? loadIddialar() : [];
  var users = typeof loadUsers === 'function' ? loadUsers() : [];
  var today = new Date().toISOString().slice(0,10);

  // Carsamba hatirlatmasi
  if (new Date().getDay() === 3) {
    var wk = _thisWeekKey();
    var myThis = all.filter(function(i) { return i.createdBy === cu?.id && i.weekKey === wk; });
    if (!myThis.length) window.addNotif?.('🎯', 'Bu hafta henuz iddia olusturmadiniz!', 'warn', 'iddia');
  }

  if (_iddiaCurrentTab === 'leaderboard') { _renderLeaderboard(cont, all, users); return; }

  var filtered = all.filter(function(i) {
    if (i.isDeleted) return false;
    if (_iddiaCurrentTab === 'aktif') return i.status === 'aktif' || i.status === 'accepted';
    if (_iddiaCurrentTab === 'bekleyen') return i.status === 'pending' || i.status === 'challenge_pending';
    if (_iddiaCurrentTab === 'tamamlanan') return i.status === 'kazandi' || i.status === 'kaybetti' || i.status === 'tamamlandi';
    return true;
  });

  if (!filtered.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--t3)"><div style="font-size:40px;margin-bottom:12px">🎯</div><div style="font-size:14px;font-weight:500">Henuz iddia yok</div><div style="margin-top:8px;font-size:12px">Ilk iddianizi olusturun!</div></div>';
    return;
  }

  var html = '';
  filtered.forEach(function(iddia) {
    var creator = users.find(function(u) { return u.id === iddia.createdBy; });
    var target = iddia.targetUid ? users.find(function(u) { return u.id === iddia.targetUid; }) : null;
    var isChallenge = iddia.tip === 'challenge';
    var borderColor = iddia.status === 'kazandi' ? '#16a34a' : iddia.status === 'kaybetti' ? '#dc2626' : isChallenge ? '#D97706' : 'var(--ac)';

    html += '<div style="background:var(--sf);border:1px solid var(--b);border-left:3px solid ' + borderColor + ';border-radius:10px;padding:14px 16px;margin-bottom:10px">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">'
        + '<div style="flex:1">'
          + '<div style="font-size:13px;font-weight:600;color:var(--t)">' + (isChallenge ? '⚔️ ' : '🎯 ') + _esc(iddia.baslik) + '</div>'
          + '<div style="font-size:11px;color:var(--t3);margin-top:4px">' + _esc(iddia.aciklama || '') + '</div>'
          + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;font-size:10px">'
            + '<span style="padding:2px 8px;border-radius:4px;background:var(--s2);color:var(--t2)">' + _esc(creator?.name || '?') + '</span>'
            + (target ? '<span style="padding:2px 8px;border-radius:4px;background:#D9770618;color:#D97706">vs ' + _esc(target.name) + '</span>' : '')
            + '<span style="padding:2px 8px;border-radius:4px;background:var(--s2);color:var(--t3)">' + (iddia.deadline || '—') + '</span>'
            + (iddia.odul ? '<span style="padding:2px 8px;border-radius:4px;background:#F0FDF4;color:#16a34a">' + _esc(iddia.odul) + '</span>' : '')
            + '<span style="padding:2px 8px;border-radius:4px;background:' + (iddia.status==='kazandi'?'#DCFCE7':iddia.status==='kaybetti'?'#FEE2E2':'var(--al)') + ';color:' + (iddia.status==='kazandi'?'#16a34a':iddia.status==='kaybetti'?'#dc2626':'var(--ac)') + ';font-weight:600">' + iddia.status + '</span>'
          + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:4px;flex-shrink:0">';

    // Butonlar
    if (iddia.status === 'pending' && _isAdm()) {
      html += '<button onclick="window._iddiaApprove(' + iddia.id + ')" style="font-size:10px;padding:4px 10px;border:none;border-radius:6px;background:#16a34a;color:#fff;cursor:pointer">Onayla</button>';
      html += '<button onclick="window._iddiaReject(' + iddia.id + ')" style="font-size:10px;padding:4px 10px;border:none;border-radius:6px;background:#dc2626;color:#fff;cursor:pointer">Reddet</button>';
    }
    if (iddia.status === 'challenge_pending' && String(iddia.targetUid) === String(cu?.id)) {
      html += '<button onclick="window._iddiaAcceptChallenge(' + iddia.id + ')" style="font-size:10px;padding:4px 10px;border:none;border-radius:6px;background:#16a34a;color:#fff;cursor:pointer">Kabul</button>';
      html += '<button onclick="window._iddiaRejectChallenge(' + iddia.id + ')" style="font-size:10px;padding:4px 10px;border:none;border-radius:6px;background:#dc2626;color:#fff;cursor:pointer">Reddet</button>';
    }
    if ((iddia.status === 'aktif' || iddia.status === 'accepted') && (String(iddia.createdBy) === String(cu?.id) || _isAdm())) {
      html += '<button onclick="window._iddiaResult(' + iddia.id + ')" style="font-size:10px;padding:4px 10px;border:none;border-radius:6px;background:var(--ac);color:#fff;cursor:pointer">Sonuc Gir</button>';
    }

    html += '</div></div></div>';
  });
  cont.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// IDDIA OLUSTURMA MODALI
// ════════════════════════════════════════════════════════════════
window._openIddiaModal = function(tip) {
  var cu = _cu();
  if (!cu) { window.toast?.('Oturum gerekli', 'err'); return; }
  if (tip === 'oz' && !_canCreateThisWeek(cu.id)) {
    window.toast?.('Bu hafta oz iddia hakkinizi kullandiniz', 'warn');
    return;
  }

  var old = document.getElementById('mo-iddia'); if (old) old.remove();
  var users = typeof loadUsers === 'function' ? loadUsers().filter(function(u) { return u.status === 'active' && u.id !== cu.id; }) : [];
  var isChallenge = tip === 'challenge';

  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-iddia';
  mo.innerHTML = '<div class="moc" style="width:480px;max-width:96vw;padding:0;border-radius:14px;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:15px;font-weight:700;color:var(--t)">' + (isChallenge ? '⚔️ Challenge Gonder' : '🎯 Oz Iddia') + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
      + '<div><label style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:4px;display:block">Baslik</label><input class="fi" id="iddia-f-baslik" placeholder="Ne iddia ediyorsun?" style="font-size:13px;padding:10px 12px;border-radius:8px"></div>'
      + '<div><label style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:4px;display:block">Aciklama</label><textarea class="fi" id="iddia-f-aciklama" rows="2" placeholder="Detay..." style="font-size:13px;padding:10px 12px;border-radius:8px;resize:none"></textarea></div>'
      + (isChallenge ? '<div><label style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:4px;display:block">Hedef Kisi</label><select class="fi" id="iddia-f-target" style="font-size:13px;padding:10px 12px;border-radius:8px"><option value="">— Sec —</option>' + users.map(function(u) { return '<option value="' + u.id + '">' + _esc(u.name) + '</option>'; }).join('') + '</select></div>' : '')
      + '<div><label style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:4px;display:block">Deadline</label><input type="date" class="fi" id="iddia-f-deadline" style="font-size:13px;padding:10px 12px;border-radius:8px"></div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;gap:8px;background:var(--s2)">'
      + '<button class="btn btns" onclick="document.getElementById(\'mo-iddia\')?.remove()" style="font-size:12px;padding:8px 16px;border-radius:8px">Iptal</button>'
      + '<button class="btn btnp" onclick="window._saveIddia(\'' + tip + '\')" style="font-size:12px;padding:8px 16px;border-radius:8px">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._saveIddia = function(tip) {
  var cu = _cu();
  var baslik = (document.getElementById('iddia-f-baslik')?.value || '').trim();
  var aciklama = (document.getElementById('iddia-f-aciklama')?.value || '').trim();
  var deadline = document.getElementById('iddia-f-deadline')?.value || '';
  var targetUid = tip === 'challenge' ? parseInt(document.getElementById('iddia-f-target')?.value || '0') : null;

  if (!baslik) { window.toast?.('Baslik zorunlu', 'err'); return; }
  if (tip === 'challenge' && !targetUid) { window.toast?.('Hedef kisi secin', 'err'); return; }

  var d = typeof loadIddialar === 'function' ? loadIddialar() : [];
  var entry = {
    id: _genId(),
    tip: tip,
    baslik: baslik,
    aciklama: aciklama,
    deadline: deadline,
    createdBy: cu?.id,
    createdByName: cu?.name || '',
    targetUid: targetUid,
    weekKey: _thisWeekKey(),
    status: tip === 'challenge' ? 'challenge_pending' : 'pending',
    odul: null,
    sonuc: null,
    createdAt: _now(),
  };
  d.unshift(entry);
  if (typeof storeIddialar === 'function') storeIddialar(d);

  document.getElementById('mo-iddia')?.remove();

  // Bildirimler
  if (tip === 'challenge' && targetUid) {
    window.addNotif?.('⚔️', _esc(cu?.name) + ' sizi challenge etti: ' + _esc(baslik), 'warn', 'iddia', targetUid);
  }
  // Admin onay bildirimi (oz iddia)
  if (tip === 'oz') {
    var admins = (typeof loadUsers === 'function' ? loadUsers() : []).filter(function(u) { return u.role === 'admin' && u.status === 'active'; });
    admins.forEach(function(a) { window.addNotif?.('🎯', 'Yeni iddia onay bekliyor: ' + _esc(baslik), 'warn', 'iddia', a.id); });
  }

  window.toast?.('Iddia kaydedildi', 'ok');
  renderIddia();
};

// ════════════════════════════════════════════════════════════════
// ADMIN ONAY + CHALLENGE KABUL/RED
// ════════════════════════════════════════════════════════════════
window._iddiaApprove = function(id) {
  var d = loadIddialar(); var o = d.find(function(x) { return x.id === id; }); if (!o) return;
  o.status = 'aktif'; o.approvedBy = _cu()?.id; o.approvedAt = _now();
  storeIddialar(d);
  window.addNotif?.('✅', 'Iddianiz onaylandi: ' + _esc(o.baslik), 'ok', 'iddia', o.createdBy);
  window.toast?.('Onaylandi', 'ok'); renderIddia();
};

window._iddiaReject = function(id) {
  var d = loadIddialar(); var o = d.find(function(x) { return x.id === id; }); if (!o) return;
  o.status = 'reddedildi'; o.rejectedBy = _cu()?.id;
  storeIddialar(d);
  window.addNotif?.('❌', 'Iddianiz reddedildi: ' + _esc(o.baslik), 'err', 'iddia', o.createdBy);
  window.toast?.('Reddedildi', 'ok'); renderIddia();
};

window._iddiaAcceptChallenge = function(id) {
  var d = loadIddialar(); var o = d.find(function(x) { return x.id === id; }); if (!o) return;
  o.status = 'accepted'; o.acceptedAt = _now();
  storeIddialar(d);
  window.addNotif?.('⚔️', _esc(_cu()?.name) + ' challengeinizi kabul etti!', 'ok', 'iddia', o.createdBy);
  window.toast?.('Challenge kabul edildi', 'ok'); renderIddia();
};

window._iddiaRejectChallenge = function(id) {
  var d = loadIddialar(); var o = d.find(function(x) { return x.id === id; }); if (!o) return;
  o.status = 'challenge_rejected';
  storeIddialar(d);
  window.addNotif?.('❌', _esc(_cu()?.name) + ' challengeinizi reddetti', 'warn', 'iddia', o.createdBy);
  window.toast?.('Challenge reddedildi', 'ok'); renderIddia();
};

// ════════════════════════════════════════════════════════════════
// SONUC GIRME + ODUL SECIMI
// ════════════════════════════════════════════════════════════════
window._iddiaResult = function(id) {
  var d = loadIddialar(); var o = d.find(function(x) { return x.id === id; }); if (!o) return;
  var oduller = _loadOduller();

  var old = document.getElementById('mo-iddia-result'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-iddia-result';
  mo.innerHTML = '<div class="moc" style="width:500px;max-width:96vw;padding:0;border-radius:14px;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:15px;font-weight:700;color:var(--t)">Sonuc Gir: ' + _esc(o.baslik) + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px">'
      + '<div style="display:flex;gap:8px">'
        + '<button onclick="document.getElementById(\'iddia-result-val\').value=\'kazandi\';this.style.background=\'#16a34a\';this.style.color=\'#fff\';this.nextElementSibling.style.background=\'\';this.nextElementSibling.style.color=\'\'" class="btn btns" style="flex:1;padding:12px;border-radius:8px;font-size:13px">Kazandim</button>'
        + '<button onclick="document.getElementById(\'iddia-result-val\').value=\'kaybetti\';this.style.background=\'#dc2626\';this.style.color=\'#fff\';this.previousElementSibling.style.background=\'\';this.previousElementSibling.style.color=\'\'" class="btn btns" style="flex:1;padding:12px;border-radius:8px;font-size:13px">Kaybettim</button>'
      + '</div>'
      + '<input type="hidden" id="iddia-result-val" value="">'
      + '<div id="iddia-odul-sec" style="display:none"><label style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:6px;display:block">Odul Sec (kaybeden oduyor):</label>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
        + oduller.map(function(od, i) {
            return '<div onclick="document.querySelectorAll(\'.iddia-odul-opt\').forEach(function(e){e.style.background=\'\';e.style.borderColor=\'var(--b)\'});this.style.background=\'var(--al)\';this.style.borderColor=\'var(--ac)\';document.getElementById(\'iddia-odul-val\').value=\'' + _esc(od.ico + ' ' + od.ad).replace(/'/g,"\\'") + '\'" class="iddia-odul-opt" style="padding:8px 10px;border:1px solid var(--b);border-radius:8px;cursor:pointer;font-size:11px;transition:all .1s">'
              + '<span style="font-size:16px">' + od.ico + '</span> <b>' + _esc(od.ad) + '</b><br><span style="color:var(--t3);font-size:9px">' + _esc(od.aciklama) + '</span></div>';
          }).join('')
        + '</div>'
        + '<input type="hidden" id="iddia-odul-val" value="">'
      + '</div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;gap:8px;background:var(--s2)">'
      + '<button class="btn btns" onclick="document.getElementById(\'mo-iddia-result\')?.remove()" style="font-size:12px;padding:8px 16px;border-radius:8px">Iptal</button>'
      + '<button class="btn btnp" onclick="window._saveIddiaResult(' + id + ')" style="font-size:12px;padding:8px 16px;border-radius:8px">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);

  // Kaybettim secilince odul panelini goster
  var interval = setInterval(function() {
    var val = document.getElementById('iddia-result-val')?.value;
    var sec = document.getElementById('iddia-odul-sec');
    if (sec) sec.style.display = val === 'kaybetti' ? '' : 'none';
    if (!document.getElementById('mo-iddia-result')) clearInterval(interval);
  }, 200);
};

window._saveIddiaResult = function(id) {
  var sonuc = document.getElementById('iddia-result-val')?.value;
  if (!sonuc) { window.toast?.('Sonuc secin', 'err'); return; }
  var odul = document.getElementById('iddia-odul-val')?.value || '';

  var d = loadIddialar(); var o = d.find(function(x) { return x.id === id; }); if (!o) return;
  o.status = sonuc;
  o.sonuc = sonuc;
  o.odul = odul || null;
  o.completedAt = _now();
  storeIddialar(d);

  // Rozet kontrolu — 3 ust uste kazanim
  _checkRozetler(o.createdBy);

  document.getElementById('mo-iddia-result')?.remove();
  window.toast?.('Sonuc kaydedildi', 'ok');
  renderIddia();
};

// ════════════════════════════════════════════════════════════════
// LEADERBOARD + ROZETLER
// ════════════════════════════════════════════════════════════════
function _renderLeaderboard(cont, all, users) {
  var stats = {};
  all.filter(function(i) { return i.status === 'kazandi' || i.status === 'kaybetti'; }).forEach(function(i) {
    var uid = i.createdBy;
    if (!stats[uid]) stats[uid] = { wins: 0, losses: 0, streak: 0 };
    if (i.status === 'kazandi') { stats[uid].wins++; stats[uid].streak++; }
    else { stats[uid].losses++; stats[uid].streak = 0; }
  });

  var board = Object.entries(stats).map(function(e) {
    var u = users.find(function(u2) { return u2.id == e[0]; });
    return { uid: e[0], name: u?.name || '?', wins: e[1].wins, losses: e[1].losses, streak: e[1].streak };
  }).sort(function(a, b) { return b.wins - a.wins; });

  var rozetler = JSON.parse(localStorage.getItem('ak_iddia_rozetler') || '{}');

  var html = '<div style="font-size:13px;font-weight:700;color:var(--t);margin-bottom:12px">Leaderboard</div>';
  if (!board.length) { cont.innerHTML = html + '<div style="text-align:center;padding:24px;color:var(--t3)">Henuz sonuc yok</div>'; return; }

  board.forEach(function(p, i) {
    var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    var userRozetler = rozetler[p.uid] || [];
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--b)">'
      + '<span style="font-size:16px;width:28px;text-align:center">' + medal + '</span>'
      + '<span style="flex:1;font-size:12px;font-weight:500;color:var(--t)">' + _esc(p.name) + '</span>'
      + '<span style="font-size:11px;color:#16a34a;font-weight:600">' + p.wins + 'W</span>'
      + '<span style="font-size:11px;color:#dc2626">' + p.losses + 'L</span>'
      + (p.streak >= 3 ? '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#FEF3C7;color:#D97706;font-weight:600">🔥 ' + p.streak + ' seri</span>' : '')
      + (userRozetler.length ? userRozetler.map(function(r) { return '<span style="font-size:12px" title="' + r + '">' + (r === 'seri3' ? '🔥' : r === 'ilk_kazanim' ? '⭐' : '🏅') + '</span>'; }).join('') : '')
    + '</div>';
  });
  cont.innerHTML = html;
}

function _checkRozetler(uid) {
  var d = loadIddialar();
  var myResults = d.filter(function(i) { return i.createdBy == uid && (i.status === 'kazandi' || i.status === 'kaybetti'); });
  var rozetler = JSON.parse(localStorage.getItem('ak_iddia_rozetler') || '{}');
  if (!rozetler[uid]) rozetler[uid] = [];

  // Ilk kazanim
  var wins = myResults.filter(function(i) { return i.status === 'kazandi'; });
  if (wins.length >= 1 && rozetler[uid].indexOf('ilk_kazanim') === -1) {
    rozetler[uid].push('ilk_kazanim');
    window.addNotif?.('⭐', 'Ilk kazanim rozeti kazandiniz!', 'ok', 'iddia', uid);
  }
  // 3 ust uste seri
  var lastThree = myResults.slice(0, 3);
  if (lastThree.length >= 3 && lastThree.every(function(i) { return i.status === 'kazandi'; }) && rozetler[uid].indexOf('seri3') === -1) {
    rozetler[uid].push('seri3');
    window.addNotif?.('🔥', '3 ust uste kazanim — seri rozeti!', 'ok', 'iddia', uid);
  }

  localStorage.setItem('ak_iddia_rozetler', JSON.stringify(rozetler));
}

// ════════════════════════════════════════════════════════════════
// ADMIN ODUL YONETIMI
// ════════════════════════════════════════════════════════════════
window._openIddiaOdulYonetimi = function() {
  if (!_isAdm()) { window.toast?.('Admin yetkisi gerekli', 'err'); return; }
  var oduller = _loadOduller();
  var old = document.getElementById('mo-iddia-odul'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-iddia-odul';

  var listHtml = oduller.map(function(od, i) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--b)">'
      + '<span style="font-size:18px">' + od.ico + '</span>'
      + '<div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t)">' + _esc(od.ad) + '</div><div style="font-size:10px;color:var(--t3)">' + _esc(od.aciklama) + '</div></div>'
      + '<button onclick="window._iddiaOdulSil(' + i + ')" style="font-size:9px;padding:2px 8px;border:none;border-radius:4px;background:rgba(220,38,38,.08);color:#dc2626;cursor:pointer">Sil</button>'
    + '</div>';
  }).join('');

  mo.innerHTML = '<div class="moc" style="width:500px;max-width:96vw;padding:0;border-radius:14px;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:15px;font-weight:700;color:var(--t)">Odul Yonetimi</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px">'
      + '<div id="iddia-odul-list">' + listHtml + '</div>'
      + '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--b)">'
        + '<div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:8px">+ Yeni Odul Ekle</div>'
        + '<div style="display:flex;gap:6px;margin-bottom:6px"><input class="fi" id="iddia-odul-ico" placeholder="Emoji" style="width:50px;font-size:16px;text-align:center;padding:8px;border-radius:8px"><input class="fi" id="iddia-odul-ad" placeholder="Odul adi" style="flex:1;font-size:12px;padding:8px 10px;border-radius:8px"></div>'
        + '<input class="fi" id="iddia-odul-aciklama" placeholder="Aciklama" style="font-size:12px;padding:8px 10px;border-radius:8px;margin-bottom:8px">'
        + '<button onclick="window._iddiaOdulEkle()" class="btn btnp" style="font-size:11px;padding:6px 14px;border-radius:8px">Ekle</button>'
      + '</div>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);text-align:right;background:var(--s2)">'
      + '<button class="btn btns" onclick="document.getElementById(\'mo-iddia-odul\')?.remove()" style="font-size:12px;padding:8px 16px;border-radius:8px">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._iddiaOdulEkle = function() {
  var ico = (document.getElementById('iddia-odul-ico')?.value || '').trim() || '🎁';
  var ad = (document.getElementById('iddia-odul-ad')?.value || '').trim();
  var aciklama = (document.getElementById('iddia-odul-aciklama')?.value || '').trim();
  if (!ad) { window.toast?.('Odul adi zorunlu', 'err'); return; }
  var oduller = _loadOduller();
  oduller.push({ ico: ico, ad: ad, aciklama: aciklama });
  _storeOduller(oduller);
  document.getElementById('mo-iddia-odul')?.remove();
  window._openIddiaOdulYonetimi();
  window.toast?.('Odul eklendi', 'ok');
};

window._iddiaOdulSil = function(idx) {
  var oduller = _loadOduller();
  oduller.splice(idx, 1);
  _storeOduller(oduller);
  document.getElementById('mo-iddia-odul')?.remove();
  window._openIddiaOdulYonetimi();
  window.toast?.('Odul silindi', 'ok');
};

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════
window.renderIddia = renderIddia;
window._iddiaOdulOnerileri = DEFAULT_ODULLER;

})();
