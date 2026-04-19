/* user_settings.js — Self-service kullanıcı ayarları paneli
   USER-SETTINGS-SKELETON-001: iskelet + Profil sekmesi
   Tasarım: Apple System Preferences — slide-in panel, minimalist, hairline border */
'use strict';

(function() {
  var PANEL_ID = 'mo-user-settings';
  var aktifSekme = 'profil';

  /* Sekme tanımları — sonraki adımlarda 'aktif:true' eklenecek */
  var SEKMELER = [
    { id: 'profil',      label: 'Profil',       ikon: '👤', aktif: true  },
    { id: 'gorunum',     label: 'Görünüm',      ikon: '🎨', aktif: false },
    { id: 'bildirim',    label: 'Bildirimler',  ikon: '🔔', aktif: false },
    { id: 'guvenlik',    label: 'Güvenlik',     ikon: '🔒', aktif: false }
  ];

  /* Ana panel açıcı */
  window._openUserSettings = function(startSekme) {
    var cu = window.Auth?.getCU?.();
    if (!cu) { window.toast?.('Giriş yapmanız gerekiyor', 'err'); return; }
    aktifSekme = startSekme || 'profil';
    _removeExisting();
    var esc = window._esc || function(x){ return x; };
    var overlay = document.createElement('div');
    overlay.id = PANEL_ID;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.18);z-index:9998;opacity:0;transition:opacity .18s';
    overlay.innerHTML = _renderPanel(cu, esc);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) _close();
    });
    setTimeout(function() {
      overlay.style.opacity = '1';
      var panel = overlay.querySelector('.us-panel');
      if (panel) panel.style.transform = 'translateX(0)';
    }, 10);
  };

  function _close() {
    var overlay = document.getElementById(PANEL_ID);
    if (!overlay) return;
    var panel = overlay.querySelector('.us-panel');
    if (panel) panel.style.transform = 'translateX(100%)';
    overlay.style.opacity = '0';
    setTimeout(function() { overlay.remove(); }, 200);
  }
  window._closeUserSettings = _close;

  function _removeExisting() {
    var ex = document.getElementById(PANEL_ID);
    if (ex) ex.remove();
  }

  function _renderPanel(cu, esc) {
    var sekmeHtml = SEKMELER.map(function(s) {
      var on = s.id === aktifSekme;
      var disabled = !s.aktif;
      var bg = on ? 'var(--s2)' : 'transparent';
      var renk = disabled ? 'var(--t3)' : (on ? 'var(--ac)' : 'var(--t)');
      var yakinda = disabled ? '<span style="margin-left:auto;font-size:9px;padding:1px 6px;border-radius:6px;background:#F1EBDE;color:#8A7030;font-weight:500">Yakında</span>' : '';
      var clickHandler = disabled ? '' : 'onclick="window._usSekmeGec(\'' + s.id + '\')"';
      return '<button type="button" ' + clickHandler + ' ' + (disabled ? 'disabled' : '') + ' style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:none;border-radius:8px;background:' + bg + ';color:' + renk + ';cursor:' + (disabled ? 'not-allowed' : 'pointer') + ';font-family:inherit;font-size:12px;font-weight:' + (on ? '600' : '500') + ';text-align:left;width:100%;transition:background .1s">' + '<span style="font-size:14px">' + s.ikon + '</span><span>' + s.label + '</span>' + yakinda + '</button>';
    }).join('');
    var icerik = _renderIcerik(cu, esc);
    return '<div class="us-panel" style="position:absolute;top:0;right:0;bottom:0;width:480px;max-width:92vw;background:var(--sf,#fff);box-shadow:-1px 0 0 0 var(--b),-8px 0 24px rgba(0,0,0,0.06);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .22s ease-out">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:0.5px solid var(--b)">'
      + '<div style="font-size:15px;font-weight:600;color:var(--t)">Ayarlar</div>'
      + '<button type="button" onclick="window._closeUserSettings()" style="background:transparent;border:none;font-size:20px;color:var(--t3);cursor:pointer;line-height:1;padding:0;width:24px;height:24px">×</button>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:180px 1fr;flex:1;overflow:hidden">'
      + '<div style="border-right:0.5px solid var(--b);padding:14px 10px;display:flex;flex-direction:column;gap:3px;background:var(--sf);overflow-y:auto">' + sekmeHtml + '</div>'
      + '<div id="us-icerik" style="padding:22px 26px;overflow-y:auto">' + icerik + '</div>'
      + '</div>'
      + '</div>';
  }

  function _renderIcerik(cu, esc) {
    if (aktifSekme === 'profil') return _renderProfil(cu, esc);
    return '<div style="color:var(--t3);font-size:11px">Yakında…</div>';
  }

  function _renderProfil(cu, esc) {
    var rolLabel = (window._ftRoleLabel && window._ftRoleLabel(cu.role)) || cu.role || '—';
    var _row = function(label, value, readonly) {
      var input = readonly
        ? '<div style="padding:9px 12px;border:0.5px solid var(--b);border-radius:8px;background:var(--s2);color:var(--t2);font-size:12px">' + esc(value || '—') + '</div>'
        : '<input type="text" data-field="' + label + '" value="' + esc(value || '') + '" style="padding:9px 12px;border:0.5px solid var(--b);border-radius:8px;background:var(--sf);color:var(--t);font-size:12px;font-family:inherit;width:100%;outline:none;transition:border-color .12s" onfocus="this.style.borderColor=\'var(--ac)\'" onblur="this.style.borderColor=\'var(--b)\'">';
      return '<div style="margin-bottom:14px"><label style="display:block;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;margin-bottom:5px">' + label + '</label>' + input + '</div>';
    };
    return '<div style="max-width:420px">'
      + '<div style="font-size:13px;font-weight:600;color:var(--t);margin-bottom:4px">Profil Bilgileri</div>'
      + '<div style="font-size:11px;color:var(--t3);margin-bottom:20px">Ad, e-posta ve iletişim bilgileriniz</div>'
      + _row('Ad Soyad', cu.name, false)
      + _row('E-posta', cu.email, true)
      + _row('Telefon', cu.phone || '', false)
      + _row('Rol', rolLabel, true)
      + _row('Departman', cu.dept || '—', true)
      + '<div style="display:flex;gap:8px;margin-top:24px">'
      + '<button type="button" onclick="window._usKaydetProfil()" style="padding:8px 18px;border:none;border-radius:8px;background:var(--ac);color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:opacity .12s" onmouseenter="this.style.opacity=\'.88\'" onmouseleave="this.style.opacity=\'1\'">Kaydet</button>'
      + '<button type="button" onclick="window._closeUserSettings()" style="padding:8px 18px;border:0.5px solid var(--b);border-radius:8px;background:transparent;color:var(--t2);font-size:12px;font-family:inherit;cursor:pointer">İptal</button>'
      + '</div>'
      + '</div>';
  }

  /* Sekme geçişi — USER-SETTINGS-SEKMEGEC-FIX-001
     Overlay yeniden render etme (panel ekran dışına kayıyordu). Sadece içerik + sol rail aktif state güncellensin. */
  window._usSekmeGec = function(sekme) {
    aktifSekme = sekme;
    var cu = window.Auth?.getCU?.();
    if (!cu) return;
    /* 1) İçerik paneli güncelle */
    var icerikEl = document.getElementById('us-icerik');
    if (icerikEl) icerikEl.innerHTML = _renderIcerik(cu, window._esc || function(x){ return x; });
    /* 2) Sol rail'deki sekme butonlarının aktif/pasif stilini güncelle */
    var overlay = document.getElementById(PANEL_ID);
    if (!overlay) return;
    var railButtons = overlay.querySelectorAll('.us-panel > div:nth-child(2) > div:first-child button');
    railButtons.forEach(function(btn) {
      var onclickAttr = btn.getAttribute('onclick') || '';
      var match = onclickAttr.match(/_usSekmeGec\(['"]([^'"]+)['"]\)/);
      var btnId = match ? match[1] : null;
      if (!btnId) return;
      var aktif = (btnId === sekme);
      btn.style.background = aktif ? 'var(--s2)' : 'transparent';
      btn.style.color = aktif ? 'var(--ac)' : 'var(--t)';
      btn.style.fontWeight = aktif ? '600' : '500';
    });
  };

  /* Profil kaydet */
  window._usKaydetProfil = function() {
    var cu = window.Auth?.getCU?.();
    if (!cu) return;
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    var adInput = panel.querySelector('[data-field="Ad Soyad"]');
    var telInput = panel.querySelector('[data-field="Telefon"]');
    if (adInput && adInput.value.trim() && adInput.value.trim() !== cu.name) cu.name = adInput.value.trim();
    if (telInput) cu.phone = telInput.value.trim() || null;
    cu.updatedAt = new Date().toISOString();
    /* Users listesine yaz */
    try {
      if (typeof loadUsers === 'function' && typeof storeUsers === 'function') {
        var users = loadUsers();
        var idx = users.findIndex(function(u) { return u.id === cu.id; });
        if (idx >= 0) {
          users[idx] = Object.assign({}, users[idx], { name: cu.name, phone: cu.phone, updatedAt: cu.updatedAt });
          storeUsers(users);
        }
      }
    } catch(e) { console.warn('[user_settings] kaydetme hatası:', e); }
    window.toast?.('Profil güncellendi', 'success');
    _close();
  };
})();
