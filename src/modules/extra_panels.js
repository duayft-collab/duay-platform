
// ── Soft Delete Helper (Anayasa Kural 08) ───────────────────────
function _softDel(data, id, label, callback) {
  if (!window.Auth?.getCU?.()?.role !== 'admin' && window.Auth?.getCU?.()?.role !== 'admin') {
    window.toast?.('Silme işlemi yalnızca yöneticiler yapabilir.','err');
    return;
  }
  window.confirmModal(`"${label || id}" silinsin mi?`, {
    title: 'Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      const item = data.find(x => x.id === id);
      if (!item) return;
      item.isDeleted = true;
      item.deletedAt = new Date().toISOString().slice(0,19).replace('T',' ');
      item.deletedBy = window.Auth?.getCU?.()?.id;
      window.logActivity?.('delete', `Silindi: ${label || id}`);
      if (typeof callback === 'function') callback();
    }
  });
}

/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/extra_panels.js  —  v8.1.0
 * Ek Panel Wrappers — helpers.js fonksiyonlarına bağlı paneller
 * Links, Rehber, Tebligat, Temizlik, Evrak, Arşiv, Resmi, Etkinlik
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// loadUsers → window.loadUsers (database.js)
// closeMo → window.closeMo (app.js)

const _gex  = window.g;
const _stex = (id,v) => { const el = _gex(id); if (el) el.textContent = v; };
const _isAdminEx = window.isAdmin;

// ════════════════════════════════════════════════════════════════
// YARDIMCI — render wrap
// ════════════════════════════════════════════════════════════════

function _wrapEx(fnName, injectFn) {
  const orig = window[fnName];
  window[fnName] = function(...args) {
    injectFn();
    if (typeof orig === 'function') return orig(...args);
  };
}

// ════════════════════════════════════════════════════════════════
// 1 — HIZLI LİNKLER
// ════════════════════════════════════════════════════════════════

function _injectLinksPanel() {
  const p = _gex('panel-links');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">🔗 Hızlı Linkler</div><div class="phs">Sık kullanılan bağlantılar</div></div>
      <div class="ur"><button class="btn btnp" onclick="openLinkModal()">+ Link Ekle</button></div>
    </div>
    <div id="links-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>
    <!-- MODAL -->
    <div class="mo" id="mo-link" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:420px">
        <div class="moh"><span class="mot" id="mo-link-t">+ Link Ekle</span><button class="mcl" onclick="closeMo('mo-link')">✕</button></div>
        <div class="mob">
          <input type="hidden" id="link-eid">
          <div class="fg"><label class="fl">Başlık</label><input class="fi" id="link-name" placeholder="Google Drive" maxlength="60"></div>
          <div class="fg"><label class="fl">URL</label><input class="fi" id="link-url" placeholder="https://..." type="url"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">İkon (Emoji)</label><input class="fi" id="link-icon" placeholder="🔗" maxlength="4"></div>
            <div class="fg"><label class="fl">Görünürlük</label>
              <select class="fi" id="link-vis">
                <option value="all">Herkes</option>
                <option value="admin">Sadece Admin</option>
                <option value="me">Sadece Ben</option>
              </select>
            </div>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-link')">İptal</button>
          <button class="btn btnp" onclick="saveLink()">Kaydet</button>
        </div>
      </div>
    </div>`;
}

function _renderLinksPanel() {
  _injectLinksPanel();
  const cu    = window.Auth?.getCU?.();
  if (!cu) return;
  const links = (typeof loadLinks === 'function') ? loadLinks() : [];
  const vis   = links.filter(l => l.vis === 'all' || (l.vis === 'admin' && _isAdminEx()) || (l.vis === 'me' && l.owner === cu.id) || l.owner === 0);
  const cont  = _gex('links-list'); if (!cont) return;
  if (!vis.length) { cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t2)"><div style="font-size:36px">🔗</div><div style="margin-top:10px">Henüz link yok</div></div>`; return; }
  const frag = document.createDocumentFragment();
  vis.forEach(l => {
    const card = document.createElement('a');
    card.href   = l.url; card.target = '_blank'; card.rel = 'noopener';
    card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--sf);border:1.5px solid var(--b);border-radius:var(--r);text-decoration:none;color:var(--t);transition:border-color .15s,transform .15s;cursor:pointer';
    card.onmouseenter = () => { card.style.borderColor='var(--ac)'; card.style.transform='translateY(-1px)'; };
    card.onmouseleave = () => { card.style.borderColor='var(--b)'; card.style.transform=''; };
    card.innerHTML = `
      <div style="font-size:24px;flex-shrink:0">${l.icon || '🔗'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.name}</div>
        <div style="font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.url}</div>
      </div>
      ${(_isAdminEx() || l.owner === cu.id) ? `<div onclick="event.preventDefault();event.stopPropagation();delLink(${l.id})" style="color:var(--rdc);cursor:pointer;padding:4px;font-size:14px;opacity:.6" title="Sil">🗑</div>` : ''}`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function openLinkModal(id) {
  _injectLinksPanel();
  if (id) {
    const l = (typeof loadLinks==='function'?loadLinks():[]).find(x=>x.id===id); if (!l) return;
    if (_gex('link-name')) _gex('link-name').value = l.name; if (_gex('link-url')) _gex('link-url').value = l.url;
    if (_gex('link-icon')) _gex('link-icon').value = l.icon||'🔗'; if (_gex('link-vis')) _gex('link-vis').value = l.vis||'all';
    if (_gex('link-eid'))  _gex('link-eid').value  = id;
    _stex('mo-link-t', '✏️ Link Düzenle');
  } else {
    ['link-name','link-url'].forEach(i=>{const el=_gex(i);if(el)el.value='';});
    if (_gex('link-icon')) _gex('link-icon').value = '🔗'; if (_gex('link-vis')) _gex('link-vis').value = 'all';
    if (_gex('link-eid'))  _gex('link-eid').value  = '';
    _stex('mo-link-t', '+ Link Ekle');
  }
  window.openMo?.('mo-link');
}

function saveLink() {
  const name = (_gex('link-name')?.value||'').trim(); const url = (_gex('link-url')?.value||'').trim();
  if (!name || !url) { window.toast?.('Başlık ve URL zorunludur','err'); return; }
  const d = typeof loadLinks==='function'?loadLinks():[];
  const eid = parseInt(_gex('link-eid')?.value||'0');
  const cu  = window.Auth?.getCU?.();
  const entry = { name, url, icon:_gex('link-icon')?.value||'🔗', vis:_gex('link-vis')?.value||'all', owner:cu?.id };
  if (eid) { const l=d.find(x=>x.id===eid); if(l) Object.assign(l,entry); } else d.push({id:generateNumericId(),...entry});
  if (typeof saveLinks==='function') saveLinks(d);
  window.closeMo?.('mo-link'); _renderLinksPanel(); window.toast?.('Kaydedildi ✓','ok');
}

function delLink(id) {
  window.confirmModal('Bu linki silmek istediğinizden emin misiniz?', {
    title: 'Link Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      if (typeof saveLinks==='function') saveLinks((typeof loadLinks==='function'?loadLinks():[]).filter(x=>x.id!==id));
      _renderLinksPanel(); window.toast?.('Silindi','ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// 2 — ACİL REHBER
// ════════════════════════════════════════════════════════════════

function _injectRehberPanel() {
  const p = _gex('panel-rehber');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">📞 Acil Rehber</div><div class="phs">Acil durum iletişim bilgileri</div></div>
      <div class="ur"><button class="btn btnp" onclick="openRehberModal()">+ Kişi Ekle</button></div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px">
      <input class="si" id="rh-search" placeholder="İsim veya rol ara..." oninput="renderRehber()" style="max-width:240px">
    </div>
    <div id="rehber-list"></div>
    <!-- MODAL -->
    <div class="mo" id="mo-rh" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:440px">
        <div class="moh"><span class="mot" id="mo-rh-t">+ Rehber Kaydı</span><button class="mcl" onclick="closeMo('mo-rh')">✕</button></div>
        <div class="mob">
          <input type="hidden" id="rh-eid">
          <div class="fg"><label class="fl">Ad Soyad / Kurum</label><input class="fi" id="rh-name" placeholder="..." maxlength="80"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">Rol / Ünvan</label><input class="fi" id="rh-role" placeholder="Acil Müdür" maxlength="60"></div>
            <div class="fg"><label class="fl">Kategori</label>
              <select class="fi" id="rh-cat">
                <option value="acil">🚨 Acil</option><option value="medikal">🏥 Medikal</option>
                <option value="teknik">🔧 Teknik</option><option value="yonetim">👔 Yönetim</option>
                <option value="tedarik">📦 Tedarikçi</option><option value="diger">📌 Diğer</option>
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">Telefon</label><input class="fi" id="rh-phone" placeholder="0 xxx xxx xx xx" type="tel"></div>
            <div class="fg"><label class="fl">E-posta</label><input class="fi" id="rh-email" placeholder="..." type="email"></div>
          </div>
          <div class="fg"><label class="fl">Not</label><input class="fi" id="rh-note" placeholder="İsteğe bağlı..." maxlength="200"></div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-rh')">İptal</button>
          <button class="btn btnp" onclick="saveRehber()">Kaydet</button>
        </div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// 3 — TEBLİGAT TAKİBİ
// ════════════════════════════════════════════════════════════════

function _injectTebligatPanel() {
  const p = _gex('panel-tebligat');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">📬 Tebligat Takibi</div><div class="phs">Yasal tebligatlar ve son tarih takibi</div></div>
      <div class="ur">
        <button class="btn btnp" onclick="openTebModal()">+ Tebligat Ekle</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input class="si" id="teb-search" placeholder="Tebligat ara..." oninput="renderTebligat()" style="max-width:200px">
      <select class="si" id="teb-cat-f" onchange="renderTebligat()" style="max-width:160px">
        <option value="">Tüm Kategoriler</option>
        <option value="mahkeme">⚖️ Mahkeme</option>
        <option value="vergi">📋 Vergi</option>
        <option value="sgk">🏛️ SGK</option>
        <option value="icra">💼 İcra</option>
        <option value="diger">📌 Diğer</option>
      </select>
      <select class="si" id="teb-status-f" onchange="renderTebligat()" style="max-width:160px">
        <option value="">Tüm Durumlar</option>
        <option value="yeni">🔵 Yeni</option>
        <option value="islemde">🟡 İşlemde</option>
        <option value="tamamlandi">🟢 Tamamlandı</option>
        <option value="suresi-gecti">🔴 Süresi Geçti</option>
      </select>
    </div>
    <div id="tebligat-list"></div>
    <!-- MODAL: Tebligat Ekle -->
    <div class="mo" id="mo-teb" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:540px">
        <div class="moh"><span class="mot" id="mo-teb-t">+ Tebligat Ekle</span><button class="mcl" onclick="closeMo('mo-teb')">✕</button></div>
        <div class="mob">
          <input type="hidden" id="teb-eid">
          <div class="fg"><label class="fl">Konu / Başlık</label><input class="fi" id="teb-title" placeholder="..." maxlength="150"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">Kategori</label>
              <select class="fi" id="teb-cat">
                <option value="mahkeme">⚖️ Mahkeme</option><option value="vergi">📋 Vergi</option>
                <option value="sgk">🏛️ SGK</option><option value="icra">💼 İcra</option><option value="diger">📌 Diğer</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Geliş Tarihi</label><input class="fi" type="date" id="teb-date"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">Son Yanıt Tarihi</label><input class="fi" type="date" id="teb-deadline"></div>
            <div class="fg"><label class="fl">Durum</label>
              <select class="fi" id="teb-status">
                <option value="yeni">🔵 Yeni</option><option value="islemde">🟡 İşlemde</option>
                <option value="tamamlandi">🟢 Tamamlandı</option>
              </select>
            </div>
          </div>
          <div class="fg"><label class="fl">Açıklama</label><textarea class="fi" id="teb-desc" rows="3" style="resize:vertical"></textarea></div>
          <div class="fg"><label class="fl">Atanan Kişi</label>
            <select class="fi" id="teb-assigned"></select>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-teb')">İptal</button>
          <button class="btn btnp" onclick="saveTebligat()">Kaydet</button>
        </div>
      </div>
    </div>
    <!-- MODAL: Aşama Ekle -->
    <div class="mo" id="mo-teb-asama" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:420px">
        <div class="moh"><span class="mot">Aşama Ekle</span><button class="mcl" onclick="closeMo('mo-teb-asama')">✕</button></div>
        <div class="mob">
          <input type="hidden" id="teb-asama-teb-id">
          <div class="fg"><label class="fl">Aşama Notu</label><textarea class="fi" id="teb-asama-note" rows="3" style="resize:vertical" placeholder="Yapılan işlem..."></textarea></div>
          <div class="fg"><label class="fl">Tarih</label><input class="fi" type="date" id="teb-asama-date"></div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-teb-asama')">İptal</button>
          <button class="btn btnp" onclick="saveTebAsama()">Ekle</button>
        </div>
      </div>
    </div>`;
  // assigned select doldur
  const sel = _gex('teb-assigned');
  if (sel && typeof loadUsers === 'function') {
    const users = loadUsers();
    sel.innerHTML = '<option value="">Atanmadı</option>' + users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  }
}

// ════════════════════════════════════════════════════════════════
// 4 — TEMİZLİK KONTROLLERİ
// ════════════════════════════════════════════════════════════════

function _injectTemizlikPanel() {
  const p = _gex('panel-temizlik');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">🧹 Temizlik Kontrol</div><div class="phs">Temizlik rutinleri ve kontrol listeleri</div></div>
      <div class="ur">
        <button class="btn btns" onclick="openRutinSablon()" style="font-size:12px">📋 Şablonlar</button>
        <button class="btn btnp" onclick="openTemizlikModal()">+ Rutin Ekle</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <select class="si" id="tmz-freq-f" onchange="renderTemizlik()" style="max-width:160px">
        <option value="">Tüm Sıklık</option>
        <option value="gunluk">📅 Günlük</option>
        <option value="haftalik">📆 Haftalık</option>
        <option value="aylik">🗓 Aylık</option>
      </select>
      <select class="si" id="tmz-area-f" onchange="renderTemizlik()" style="max-width:160px">
        <option value="">Tüm Alanlar</option>
        <option value="ofis">💼 Ofis</option>
        <option value="mutfak">🍽 Mutfak</option>
        <option value="wc">🚽 WC/Banyo</option>
        <option value="depo">📦 Depo</option>
        <option value="diger">📌 Diğer</option>
      </select>
    </div>
    <div id="temizlik-list"></div>
    <!-- MODAL: Rutin Ekle -->
    <div class="mo" id="mo-tmz" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:500px">
        <div class="moh"><span class="mot" id="mo-tmz-t">+ Temizlik Rutini</span><button class="mcl" onclick="closeMo('mo-tmz')">✕</button></div>
        <div class="mob">
          <input type="hidden" id="tmz-eid">
          <div class="fg"><label class="fl">Başlık</label><input class="fi" id="tmz-title" placeholder="Örn: Ofis Günlük Temizlik" maxlength="100"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">Alan</label>
              <select class="fi" id="tmz-area">
                <option value="ofis">💼 Ofis</option><option value="mutfak">🍽 Mutfak</option>
                <option value="wc">🚽 WC/Banyo</option><option value="depo">📦 Depo</option><option value="diger">📌 Diğer</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Sıklık</label>
              <select class="fi" id="tmz-freq">
                <option value="gunluk">📅 Günlük</option>
                <option value="haftalik">📆 Haftalık</option>
                <option value="aylik">🗓 Aylık</option>
              </select>
            </div>
          </div>
          <div class="fg"><label class="fl">Sorumlu Personel</label>
            <select class="fi" id="tmz-uid"></select>
          </div>
          <!-- Kontrol Listesi -->
          <div style="margin-top:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span class="fl" style="margin:0">Kontrol Maddeleri</span>
              <button class="btn btns" onclick="addTmzItem()" style="font-size:11px">+ Madde Ekle</button>
            </div>
            <div id="tmz-items-editor" style="max-height:180px;overflow-y:auto"></div>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-tmz')">İptal</button>
          <button class="btn btnp" onclick="saveTemizlik()">Kaydet</button>
        </div>
      </div>
    </div>
    <!-- MODAL: Şablon Seç -->
    <div class="mo" id="mo-tmz-sablon" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:480px">
        <div class="moh"><span class="mot">📋 Hazır Şablonlar</span><button class="mcl" onclick="closeMo('mo-tmz-sablon')">✕</button></div>
        <div class="mob">
          <div style="font-size:13px;color:var(--t2);margin-bottom:12px">Seçilen şablonlar listeye otomatik eklenecek.</div>
          <div id="tmz-sablon-list"></div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-tmz-sablon')">İptal</button>
          <button class="btn btnp" onclick="addSeciliRutinler()">Seçilenleri Ekle</button>
        </div>
      </div>
    </div>`;
  // Sorumlu personel doldur
  const sel = _gex('tmz-uid');
  if (sel && typeof loadUsers === 'function') {
    const users = loadUsers();
    sel.innerHTML = '<option value="0">Genel / Tüm Personel</option>' + users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  }
}

// ════════════════════════════════════════════════════════════════
// 5 — PERSONEL EVRAK
// ════════════════════════════════════════════════════════════════

function _injectEvrakPanel() {
  const p = _gex('panel-evrak');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">📄 Personel Evrak</div><div class="phs">Personel belge ve sözleşme yönetimi</div></div>
      <div class="ur">
        <button class="btn btnp" onclick="openEvrakModal?.()">+ Evrak Ekle</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <select class="si" id="evrak-user-f" onchange="renderEvrak?.()" style="max-width:180px">
        <option value="0">Tüm Personel</option>
      </select>
      <select class="si" id="evrak-cat-f" onchange="renderEvrak?.()" style="max-width:160px">
        <option value="">Tüm Kategoriler</option>
        <option value="sozlesme">📝 Sözleşme</option>
        <option value="kimlik">🪪 Kimlik</option>
        <option value="diploma">🎓 Diploma</option>
        <option value="sgk">🏛 SGK</option>
        <option value="diger">📌 Diğer</option>
      </select>
    </div>
    <div id="evrak-list"></div>`;
  // personel select doldur
  const sel = _gex('evrak-user-f');
  if (sel && typeof loadUsers === 'function') {
    const users = loadUsers();
    sel.innerHTML = '<option value="0">Tüm Personel</option>' + users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  }
}

// ════════════════════════════════════════════════════════════════
// 6 — ŞİRKET ARŞİVİ
// ════════════════════════════════════════════════════════════════

function _injectArsivPanel() {
  const p = _gex('panel-arsiv');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">🗄 Şirket Arşivi</div><div class="phs">Belge dolapları ve arşiv yönetimi</div></div>
      <div class="ur">
        <button class="btn btnp" onclick="openDolapModal?.()">+ Dolap Ekle</button>
      </div>
    </div>
    <div id="arsiv-dolaplar" style="margin-bottom:16px"></div>
    <div id="arsiv-belgeler-list"></div>`;
}

// ════════════════════════════════════════════════════════════════
// 7 — RESMİ EVRAK
// ════════════════════════════════════════════════════════════════

function _injectResmiPanel() {
  const p = _gex('panel-resmi');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">📜 Resmi Evrak</div><div class="phs">Resmi yazışma ve belge yönetimi</div></div>
      <div class="ur">
        <button class="btn btnp" onclick="openResmiModal?.()">+ Evrak Ekle</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px">
      <input class="si" id="resmi-search" placeholder="Evrak ara..." oninput="renderResmi?.()" style="max-width:220px">
    </div>
    <div id="resmi-list"></div>`;
}

// ════════════════════════════════════════════════════════════════
// 8 — ETKİNLİK / FUAR
// ════════════════════════════════════════════════════════════════

function _injectEtkinlikPanel() {
  const p = _gex('panel-etkinlik');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">🎪 Etkinlik / Fuar</div><div class="phs">Fuar katılımları ve etkinlik yönetimi</div></div>
      <div class="ur">
        <button class="btn btnp" onclick="openEtkinlikModal?.()">+ Etkinlik Ekle</button>
      </div>
    </div>
    <div id="etkinlik-list"></div>`;
}

// ════════════════════════════════════════════════════════════════
// BAŞLATMA — tüm wrap'leri uygula
// ════════════════════════════════════════════════════════════════

function _initExtraPanels() {
  _wrapEx('renderLinks',    _injectLinksPanel);
  _wrapEx('renderRehber',   _injectRehberPanel);
  _wrapEx('renderTebligat', _injectTebligatPanel);
  _wrapEx('renderTemizlik', _injectTemizlikPanel);
  _wrapEx('renderEvrak',    _injectEvrakPanel);
  _wrapEx('renderArsiv',    _injectArsivPanel);
  _wrapEx('renderResmi',    _injectResmiPanel);
  _wrapEx('renderEtkinlik', _injectEtkinlikPanel);

  // openLinkModal, saveLink, delLink global'e ekle
  window.openLinkModal = openLinkModal;
  window.saveLink      = saveLink;
  window.delLink       = delLink;

  // renderLinks özel — inject + çağır
  const _origLinks = window.renderLinks;
  window.renderLinks = function(...a) {
    _injectLinksPanel();
    if (typeof _origLinks === 'function') return _origLinks(...a);
    else _renderLinksPanel();
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initExtraPanels: _initExtraPanels };
} else {
  window.ExtraPanels = { init: _initExtraPanels };
  _initExtraPanels();
}
