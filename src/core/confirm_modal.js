/**
 * ════════════════════════════════════════════════════════════════
 * src/core/confirm_modal.js  —  v1.0.0
 * Native confirm() → Custom Modal Replacer
 *
 * Kullanım:
 *   // Eski:
 *   if (confirm('Sil?')) delTask(id);
 *
 *   // Yeni (aynı imza, async):
 *   window.confirmModal('Bu görevi silmek istediğinizden emin misiniz?', {
 *     title:     'Görevi Sil',
 *     danger:    true,
 *     confirmText: 'Evet, Sil',
 *     cancelText:  'İptal',
 *     onConfirm: () => delTask(id)
 *   });
 *
 *   // Veya mevcut confirm() çağrılarıyla birebir uyumlu Promise versiyonu:
 *   window.confirmAsync('Sil?').then(ok => { if(ok) delTask(id); });
 *
 * Yükleme: modals.js'den önce
 * ════════════════════════════════════════════════════════════════
 */
(function() {
'use strict';

// Modal HTML'i inject et
function _ensureConfirmModal() {
  if (document.getElementById('mo-confirm-global')) return;
  const div = document.createElement('div');
  div.innerHTML = `
<div class="mo" id="mo-confirm-global" role="alertdialog" aria-modal="true" aria-labelledby="mo-cf-title">
  <div class="moc" style="max-width:400px;padding:0;overflow:hidden;border-radius:16px">
    <div style="padding:22px 24px 0">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div id="mo-cf-icon" style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;background:rgba(239,68,68,.12)">⚠️</div>
        <div>
          <div id="mo-cf-title" style="font-size:15px;font-weight:700;color:var(--t)">Emin misiniz?</div>
        </div>
      </div>
      <div id="mo-cf-body" style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:22px"></div>
    </div>
    <div style="display:flex;gap:8px;padding:14px 24px 20px;background:var(--s2);border-top:1px solid var(--b)">
      <button id="mo-cf-cancel" class="btn btns" style="flex:1" onclick="window._confirmResolve(false)">İptal</button>
      <button id="mo-cf-ok"     class="btn btnp" style="flex:1" onclick="window._confirmResolve(true)">Onayla</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(div.firstElementChild);
}

let _resolveFn = null;

// Internal resolver
window._confirmResolve = function(result) {
  window.closeMo?.('mo-confirm-global');
  if (_resolveFn) { _resolveFn(result); _resolveFn = null; }
};

/**
 * Promise tabanlı confirm
 * @param {string} message
 * @param {Object} [opts]
 * @returns {Promise<boolean>}
 */
window.confirmAsync = function(message, opts) {
  opts = opts || {};
  _ensureConfirmModal();

  const icon    = document.getElementById('mo-cf-icon');
  const title   = document.getElementById('mo-cf-title');
  const body    = document.getElementById('mo-cf-body');
  const okBtn   = document.getElementById('mo-cf-ok');
  const canBtn  = document.getElementById('mo-cf-cancel');

  if (icon) {
    icon.textContent = opts.danger ? '⚠️' : 'ℹ️';
    icon.style.background = opts.danger
      ? 'rgba(239,68,68,.12)' : 'rgba(99,102,241,.1)';
  }
  if (title)  title.textContent  = opts.title || (opts.danger ? 'Emin misiniz?' : 'Onay');
  if (body)   body.textContent   = message || '';
  if (okBtn) {
    okBtn.textContent = opts.confirmText || (opts.danger ? 'Evet, Devam Et' : 'Tamam');
    okBtn.style.background    = opts.danger ? '#EF4444' : '';
    okBtn.style.borderColor   = opts.danger ? '#EF4444' : '';
  }
  if (canBtn) canBtn.textContent = opts.cancelText || 'İptal';

  window.openMo?.('mo-confirm-global');

  return new Promise(function(resolve) {
    _resolveFn = resolve;
  });
};

/**
 * Callback tabanlı confirmModal
 * @param {string} message
 * @param {Object} opts — { title, danger, confirmText, cancelText, onConfirm, onCancel }
 */
window.confirmModal = function(message, opts) {
  opts = opts || {};
  window.confirmAsync(message, opts).then(function(result) {
    if (result && typeof opts.onConfirm === 'function') opts.onConfirm();
    if (!result && typeof opts.onCancel === 'function') opts.onCancel();
  });
};

// ESC tuşu ile kapat
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _resolveFn) {
    window._confirmResolve(false);
  }
});

console.info('[ConfirmModal] Hazır');
})();
