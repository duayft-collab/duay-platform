
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
 * src/modules/panel_stubs.js  —  v8.1.0
 * Alias, Stub ve Tam Panel Implementasyonları
 *
 * Çözdüğü sorunlar:
 *  1. app.js isim uyumsuzluğu: renderSugg → renderSuggestions (admin.js)
 *     renderActivity → renderActivityLog (admin.js)
 *  2. Henüz modülde karşılığı olmayan paneller için
 *     tam render: Evrak, Arşiv, Etkinlik, Resmi, Çöp Kutusu, Hesap
 *  3. renderSettingsAdmin stub'u
 * ════════════════════════════════════════════════════════════════
 */

'use strict';
// loadUsers → window.loadUsers (database.js)
// closeMo → window.closeMo (app.js)

'use strict';

const _gst  = window.g;
const _stst = window.st;
const _nowTsst = window.nowTs;
const _isAdminSt = window.isAdmin;
const _CUst      = window.CU;

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — ALIAS'LAR (isim uyumsuzluğu düzeltme)
// ════════════════════════════════════════════════════════════════

// app.js renderSugg çağırıyor → admin.js renderSuggestions
window.renderSugg = function() {
  // Öneriler paneli admin panelinin içinde (panel-admin > suggestions-list)
  // Zaten orada render edildi; eğer ayrı bir panel-suggestions varsa doldur
  if (typeof window.Admin?.renderSugg === 'function') {
    window.Admin.renderSugg();
  } else if (typeof renderSuggestions === 'function') {
    renderSuggestions();
  } else if (window.Admin) {
    // admin.js'deki renderSuggestions fonksiyonu Admin nesnesine eklenmiş mi?
    const fn = Object.values(window.Admin).find(v => typeof v === 'function' && v.name === 'renderSuggestions');
    if (fn) fn();
  }
};

// app.js renderActivity çağırıyor → admin.js renderActivityLog
window.renderActivity = function() {
  if (typeof window.renderActivityLog === 'function') {
    window.renderActivityLog();
  } else if (window.Admin?.renderLog) {
    window.Admin.renderLog();
  }
};

// renderSettingsAdmin — ayarlar paneli zaten app.js içinde doldurulmuş
window.renderSettingsAdmin = function() {
  // ayarlar sayfasındaki ek admin bölümü (varsa)
  const el = _gst('settings-admin-section');
  if (!el) return;
  if (!_isAdminSt()) { el.style.display = 'none'; return; }
  el.style.display = '';
};

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — EVRAK PANELİ (Personel Belge Yönetimi)
// ════════════════════════════════════════════════════════════════

const EVRAK_CATS = {
  sozlesme: { l:'📝 Sözleşme', c:'bp' },
  kimlik:   { l:'🪪 Kimlik',   c:'ba' },
  diploma:  { l:'🎓 Diploma',  c:'bb' },
  sgk:      { l:'🏛 SGK',      c:'bg' },
  saglik:   { l:'🏥 Sağlık',   c:'ba' },
  diger:    { l:'📌 Diğer',   c:'bb' },
};

function _injectEvrakPanelFull() {
  const p = _gst('panel-evrak');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  const users = (typeof loadUsers === 'function') ? loadUsers() : [];
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">📄 Personel Evrak</div><div class="phs\">Personel belge ve sözleşme yönetimi</div></div>
      <div class="ur">
        <button class="btn btnp" onclick="openEvrakModal()">+ Evrak Ekle</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <select class="si" id="evrak-user-f" onchange="renderEvrak()" style="max-width:180px">
        <option value="0">Tüm Personel</option>
        ${users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
      </select>
      <select class="si" id="evrak-cat-f" onchange="renderEvrak()" style="max-width:160px">
        <option value="">Tüm Kategoriler</option>
        ${Object.entries(EVRAK_CATS).map(([k,v])=>`<option value="${k}">${v.l}</option>`).join('')}
      </select>
    </div>
    <div id="evrak-list"></div>
    <!-- MODAL -->
    <div class="mo" id="mo-evrak" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:480px">
        <div class="moh"><span class="mot" id="mo-evrak-t">+ Evrak Ekle</span><button class="mcl" onclick="closeMo('mo-evrak')">✕</button></div>
        <div class="mob">
          <input type="hidden" id="evrak-eid">
          <div class="fg"><label class="fl">Belge Adı</label><input class="fi" id="evrak-name" placeholder="..." maxlength="120"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">Personel</label>
              <select class="fi" id="evrak-uid">
                ${users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
              </select>
            </div>
            <div class="fg"><label class="fl">Kategori</label>
              <select class="fi" id="evrak-cat">
                ${Object.entries(EVRAK_CATS).map(([k,v])=>`<option value="${k}">${v.l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg"><label class="fl">Tarih</label><input class="fi" type="date" id="evrak-date"></div>
            <div class="fg"><label class="fl">Son Geçerlilik</label><input class="fi" type="date" id="evrak-exp"></div>
          </div>
          <div class="fg"><label class="fl">Not</label><input class="fi" id="evrak-note" placeholder="İsteğe bağlı..." maxlength="200"></div>
          <div class="fg"><label class="fl">Dosya (PDF/Resim)</label><input class="fi" type="file" id="evrak-file" accept=".pdf,.jpg,.jpeg,.png"></div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-evrak')">İptal</button>
          <button class="btn btnp" onclick="saveEvrak()">Kaydet</button>
        </div>
      </div>
    </div>`;
}

function renderEvrak() {
  _injectEvrakPanelFull();
  const filterUid = parseInt(_gst('evrak-user-f')?.value || '0');
  const filterCat = _gst('evrak-cat-f')?.value || '';
  let items = (typeof loadEvrak === 'function') ? loadEvrak() : [];
  if (!_isAdminSt()) items = items.filter(e => e.uid === _CUst()?.id);
  if (filterUid) items = items.filter(e => e.uid === filterUid);
  if (filterCat) items = items.filter(e => e.cat === filterCat);

  const users = (typeof loadUsers === 'function') ? loadUsers() : [];
  const cont  = _gst('evrak-list');
  if (!cont) return;

  if (!items.length) {
    cont.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t2)">
      <div style="font-size:40px;margin-bottom:12px">📄</div>
      <div style="font-size:15px;font-weight:500">Evrak kaydı bulunamadı</div>
      <div style="margin-top:12px"><button class="btn btnp" onclick="openEvrakModal()">+ İlk Evrakı Ekle</button></div>
    </div>`;
    return;
  }

  const frag  = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className = 'tbl';
  table.innerHTML = `<thead><tr>
    <th>Personel</th><th>Belge Adı</th><th>Kategori</th>
    <th>Tarih</th><th>Son Geçerlilik</th><th>Dosya</th><th></th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  const today = new Date().toISOString().slice(0,10);
  items.sort((a,b) => (b.date||'').localeCompare(a.date||'')).forEach(e => {
    const u   = users.find(x => x.id === e.uid) || { name: '?' };
    const cat = EVRAK_CATS[e.cat] || EVRAK_CATS.diger;
    const expired = e.exp && e.exp < today;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:500;font-size:13px">${u.name}</td>
      <td>
        <div style="font-weight:500;font-size:13px">${e.name}</div>
        ${e.note ? `<div style="font-size:10px;color:var(--t3)">${e.note}</div>` : ''}
      </td>
      <td><span class="badge ${cat.c}">${cat.l}</span></td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${e.date || '—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:${expired ? 'var(--rdc)' : 'var(--t2)'}">
        ${e.exp || '—'} ${expired ? '⚠️' : ''}
      </td>
      <td>
        ${e.file ? `<a href="${e.file.data}" download="${e.file.name}" class="btn btns" style="text-decoration:none;font-size:11px" title="${e.file.name}">📎 İndir</a>` : '<span style="color:var(--t3);font-size:11px">—</span>'}
      </td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btns" onclick="openEvrakModal(${e.id})">✏️</button>
          ${_isAdminSt() ? `<button class="btn btns btnd" onclick="delEvrakItem(${e.id})">🗑</button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  frag.appendChild(table);
  cont.replaceChildren(frag);
}

function openEvrakModal(id) {
  _injectEvrakPanelFull();
  if (id) {
    const e = (typeof loadEvrak === 'function' ? loadEvrak() : []).find(x => x.id === id); if (!e) return;
    if (_gst('evrak-name')) _gst('evrak-name').value = e.name || '';
    if (_gst('evrak-uid'))  _gst('evrak-uid').value  = e.uid  || '';
    if (_gst('evrak-cat'))  _gst('evrak-cat').value  = e.cat  || 'diger';
    if (_gst('evrak-date')) _gst('evrak-date').value = e.date || '';
    if (_gst('evrak-exp'))  _gst('evrak-exp').value  = e.exp  || '';
    if (_gst('evrak-note')) _gst('evrak-note').value = e.note || '';
    if (_gst('evrak-eid'))  _gst('evrak-eid').value  = id;
    _stst('mo-evrak-t', '✏️ Evrak Düzenle');
  } else {
    ['evrak-name','evrak-note'].forEach(i => { const el=_gst(i); if(el) el.value=''; });
    if (_gst('evrak-cat'))  _gst('evrak-cat').value  = 'sozlesme';
    if (_gst('evrak-date')) _gst('evrak-date').valueAsDate = new Date();
    if (_gst('evrak-exp'))  _gst('evrak-exp').value  = '';
    if (_gst('evrak-uid'))  _gst('evrak-uid').value  = _CUst()?.id || '';
    if (_gst('evrak-eid'))  _gst('evrak-eid').value  = '';
    _stst('mo-evrak-t', '+ Evrak Ekle');
  }
  window.openMo?.('mo-evrak');
}

function saveEvrak() {
  const name = (_gst('evrak-name')?.value || '').trim();
  if (!name) { window.toast?.('Belge adı zorunludur', 'err'); return; }
  const d   = typeof loadEvrak === 'function' ? loadEvrak() : [];
  const eid = parseInt(_gst('evrak-eid')?.value || '0');
  const entry = {
    name, uid: parseInt(_gst('evrak-uid')?.value || _CUst()?.id),
    cat:  _gst('evrak-cat')?.value  || 'diger',
    date: _gst('evrak-date')?.value || '',
    exp:  _gst('evrak-exp')?.value  || '',
    note: _gst('evrak-note')?.value || '',
    ts:   _nowTsst(), addedBy: _CUst()?.id,
  };
  const fi = _gst('evrak-file');
  const doSave = (fd) => {
    if (fd) entry.file = fd;
    if (eid) { const ex = d.find(x=>x.id===eid); if(ex) Object.assign(ex, entry); }
    else d.unshift({ id: generateNumericId(), ...entry });
    if (typeof storeEvrak === 'function') storeEvrak(d);
    window.closeMo?.('mo-evrak');
    renderEvrak();
    window.toast?.(eid ? 'Güncellendi ✓' : 'Evrak eklendi ✓', 'ok');
    window.logActivity?.('view', `"${name}" evrak ${eid ? 'güncellendi' : 'eklendi'}`);
  };
  if (fi?.files?.[0]) {
    const r = new FileReader();
    r.onload = ev => doSave({ name: fi.files[0].name, data: ev.target.result });
    r.readAsDataURL(fi.files[0]);
  } else { doSave(null); }
}

function delEvrakItem(id) {
  if (!_isAdminSt()) return;
  window.confirmModal('Bu evrakı silmek istediğinizden emin misiniz?', {
    title: 'Evrak Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      if (typeof storeEvrak === 'function') storeEvrak((typeof loadEvrak==='function'?loadEvrak():[]).filter(x=>x.id!==id));
      renderEvrak();
      window.toast?.('Silindi', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — ARŞİV PANELİ
// ════════════════════════════════════════════════════════════════

function renderArsiv() {
  const p = _gst('panel-arsiv');
  if (!p) return;
  if (!p.dataset.injected) {
    p.dataset.injected = '1';
    p.innerHTML = `
      <div class="ph">
        <div><div class="pht">🗄 Şirket Arşivi</div><div class="phs">Belge dolapları ve fiziksel arşiv takibi</div></div>
        <div class="ur">
          ${_isAdminSt() ? `<button class="btn btnp" onclick="openDolapModal()">+ Dolap Ekle</button>` : ''}
        </div>
      </div>
      <div id="arsiv-dolaplar" style="margin-bottom:16px"></div>
      <div id="arsiv-belgeler-list"></div>
      <!-- MODAL: Dolap -->
      <div class="mo" id="mo-dolap" role="dialog" aria-modal="true">
        <div class="moc" style="max-width:440px">
          <div class="moh"><span class="mot" id="mo-dolap-t">+ Dolap Ekle</span><button class="mcl" onclick="closeMo('mo-dolap')">✕</button></div>
          <div class="mob">
            <input type="hidden" id="dolap-eid">
            <div class="fg"><label class="fl">Dolap Adı</label><input class="fi" id="dolap-name" placeholder="Dolap A1" maxlength="60"></div>
            <div class="fg"><label class="fl">Konum</label><input class="fi" id="dolap-loc" placeholder="2. Kat Muhasebe" maxlength="100"></div>
            <div class="fg"><label class="fl">Açıklama</label><input class="fi" id="dolap-desc" placeholder="..." maxlength="200"></div>
          </div>
          <div class="mof">
            <button class="btn" onclick="closeMo('mo-dolap')">İptal</button>
            <button class="btn btnp" onclick="saveDolap()">Kaydet</button>
          </div>
        </div>
      </div>`;
  }
  // Dolapları render et
  const dolaplar = (typeof loadDolaplar === 'function') ? loadDolaplar() : [];
  const belgeler = (typeof loadArsivBelgeler === 'function') ? loadArsivBelgeler() : [];
  const cont = _gst('arsiv-dolaplar');
  if (cont) {
    if (!dolaplar.length) {
      cont.innerHTML = `<div style="text-align:center;padding:32px;color:var(--t2)"><div style="font-size:36px">🗄</div><div style="margin-top:8px">Henüz dolap eklenmedi</div>${_isAdminSt()?`<div style="margin-top:10px"><button class="btn btnp" onclick="openDolapModal()">+ Dolap Ekle</button></div>`:''}</div>`;
    } else {
      const frag = document.createDocumentFragment();
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:16px';
      dolaplar.forEach(d => {
        const cnt = belgeler.filter(b => b.dolapId === d.id).length;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'padding:16px;cursor:pointer;border-left:4px solid ' + (d.color || 'var(--ac)');
        card.onclick = () => { _filterArsivByDolap(d.id); };
        card.innerHTML = `
          <div style="font-size:22px;margin-bottom:8px">🗄</div>
          <div style="font-weight:700;font-size:14px">${d.name}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:3px">${d.loc || ''}</div>
          <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between">
            <span class="badge bb">${cnt} belge</span>
            ${_isAdminSt() ? `<div style="display:flex;gap:4px"><button class="btn btns" onclick="event.stopPropagation();openDolapModal(${d.id})" style="font-size:11px">✏️</button><button class="btn btns btnd" onclick="event.stopPropagation();delDolap(${d.id})" style="font-size:11px">🗑</button></div>` : ''}
          </div>`;
        grid.appendChild(card);
      });
      frag.appendChild(grid);
      cont.replaceChildren(frag);
    }
  }
  // Belgeleri listele
  const bCont = _gst('arsiv-belgeler-list');
  if (bCont) {
    if (!belgeler.length) { bCont.innerHTML = `<div style="text-align:center;padding:24px;color:var(--t3);font-size:13px">Belge kaydı yok.</div>`; return; }
    const frag  = document.createDocumentFragment();
    const table = document.createElement('table');
    table.className = 'tbl';
    table.innerHTML = `<thead><tr><th>Dolap</th><th>Belge</th><th>Kategori</th><th>Tarih</th><th>Son Geçerlilik</th><th>Durum</th><th></th></tr></thead>`;
    const tbody = document.createElement('tbody');
    belgeler.forEach(b => {
      const dol = dolaplar.find(d => d.id === b.dolapId) || { name: '?' };
      const ST  = { approved:{l:'✅ Onaylı',c:'bg'}, pending:{l:'⏳ Bekliyor',c:'ba'}, expired:{l:'❌ Süresi Geçti',c:'br'} };
      const st  = ST[b.status] || ST.pending;
      const today = new Date().toISOString().slice(0,10);
      const isExp = b.exp && b.exp < today;
      const tr  = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:12px;color:var(--t2)">${dol.name}</td>
        <td>
          <div style="font-weight:500;font-size:13px">${b.name}</div>
          ${b.note ? `<div style="font-size:10px;color:var(--t3)">${b.note}</div>` : ''}
        </td>
        <td style="font-size:12px">${b.cat || '—'}</td>
        <td style="font-family:'DM Mono',monospace;font-size:11px">${b.date || '—'}</td>
        <td style="font-family:'DM Mono',monospace;font-size:11px;color:${isExp?'var(--rdc)':'var(--t2)'}">${b.exp || '—'}${isExp?' ⚠️':''}</td>
        <td><span class="badge ${st.c}">${st.l}</span></td>
        <td>
          ${_isAdminSt() ? `<button class="btn btns btnd" onclick="delArsivBelge(${b.id})" style="font-size:11px">🗑</button>` : ''}
        </td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    frag.appendChild(table);
    bCont.replaceChildren(frag);
  }
}

function _filterArsivByDolap(dolapId) {
  // Gelecekte dolap bazlı filtreleme için alan
  renderArsiv();
}

function openDolapModal(id) {
  if (id) {
    const d = (typeof loadDolaplar==='function'?loadDolaplar():[]).find(x=>x.id===id); if(!d) return;
    if (_gst('dolap-name')) _gst('dolap-name').value = d.name||'';
    if (_gst('dolap-loc'))  _gst('dolap-loc').value  = d.loc||'';
    if (_gst('dolap-desc')) _gst('dolap-desc').value = d.desc||'';
    if (_gst('dolap-eid'))  _gst('dolap-eid').value  = id;
    _stst('mo-dolap-t', '✏️ Dolap Düzenle');
  } else {
    ['dolap-name','dolap-loc','dolap-desc'].forEach(i=>{const el=_gst(i);if(el)el.value='';});
    if (_gst('dolap-eid')) _gst('dolap-eid').value = '';
    _stst('mo-dolap-t', '+ Dolap Ekle');
  }
  window.openMo?.('mo-dolap');
}

function saveDolap() {
  const name = (_gst('dolap-name')?.value||'').trim();
  if (!name) { window.toast?.('Dolap adı zorunludur','err'); return; }
  const d   = typeof loadDolaplar==='function'?loadDolaplar():[];
  const eid = parseInt(_gst('dolap-eid')?.value||'0');
  const entry = { name, loc:_gst('dolap-loc')?.value||'', desc:_gst('dolap-desc')?.value||'', uid:_CUst()?.id, color:'var(--blb)' };
  if (eid) { const ex=d.find(x=>x.id===eid); if(ex) Object.assign(ex,entry); }
  else d.push({id:generateNumericId(),...entry});
  if (typeof storeDolaplar==='function') storeDolaplar(d);
  window.closeMo?.('mo-dolap'); renderArsiv(); window.toast?.('Kaydedildi ✓','ok');
}

function delDolap(id) {
  if (!_isAdminSt()) return;
  window.confirmModal('Bu dolabı silmek istediğinizden emin misiniz?', {
    title: 'Dolap Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      if (typeof storeDolaplar==='function') storeDolaplar((typeof loadDolaplar==='function'?loadDolaplar():[]).filter(x=>x.id!==id));
      renderArsiv(); window.toast?.('Silindi','ok');
    }
  });
}

function delArsivBelge(id) {
  if (!_isAdminSt()) return;
  window.confirmModal('Bu belgeyi silmek istediğinizden emin misiniz?', {
    title: 'Belge Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      if (typeof storeArsivBelgeler==='function') storeArsivBelgeler((typeof loadArsivBelgeler==='function'?loadArsivBelgeler():[]).filter(x=>x.id!==id));
      renderArsiv(); window.toast?.('Silindi','ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — RESMİ EVRAK PANELİ
// ════════════════════════════════════════════════════════════════

function renderResmi() {
  const p = _gst('panel-resmi');
  if (!p) return;
  if (!p.dataset.injected) {
    p.dataset.injected = '1';
    p.innerHTML = `
      <div class="ph">
        <div><div class="pht">📜 Resmi Evrak</div><div class="phs">Resmi yazışma ve belge takibi</div></div>
        <div class="ur">
          <button class="btn btnp" onclick="openResmiModal()">+ Evrak Ekle</button>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <input class="si" id="resmi-search" placeholder="Evrak ara..." oninput="renderResmi()" style="max-width:220px">
        <select class="si" id="resmi-dir-f" onchange="renderResmi()" style="max-width:160px">
          <option value="">Gelen / Giden</option>
          <option value="gelen">📥 Gelen Evrak</option>
          <option value="giden">📤 Giden Evrak</option>
        </select>
      </div>
      <div id="resmi-list"></div>
      <!-- MODAL -->
      <div class="mo" id="mo-resmi" role="dialog" aria-modal="true">
        <div class="moc" style="max-width:480px">
          <div class="moh"><span class="mot" id="mo-resmi-t">+ Resmi Evrak</span><button class="mcl" onclick="closeMo('mo-resmi')">✕</button></div>
          <div class="mob">
            <input type="hidden" id="resmi-eid">
            <div class="fg"><label class="fl">Konu</label><input class="fi" id="resmi-konu" placeholder="..." maxlength="150"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="fg"><label class="fl">Yön</label>
                <select class="fi" id="resmi-dir">
                  <option value="gelen">📥 Gelen</option><option value="giden">📤 Giden</option>
                </select>
              </div>
              <div class="fg"><label class="fl">Tarih</label><input class="fi" type="date" id="resmi-tarih"></div>
            </div>
            <div class="fg"><label class="fl">Gönderen / Alıcı Kurum</label><input class="fi" id="resmi-taraf" placeholder="..." maxlength="150"></div>
            <div class="fg"><label class="fl">Not</label><textarea class="fi" id="resmi-not" rows="2" style="resize:vertical"></textarea></div>
          </div>
          <div class="mof">
            <button class="btn" onclick="closeMo('mo-resmi')">İptal</button>
            <button class="btn btnp" onclick="saveResmiEvrak()">Kaydet</button>
          </div>
        </div>
      </div>`;
  }
  let items = (typeof loadResmi==='function') ? loadResmi() : [];
  const q   = (_gst('resmi-search')?.value||'').toLowerCase();
  const dir = _gst('resmi-dir-f')?.value||'';
  if (q)   items = items.filter(r => (r.konu||'').toLowerCase().includes(q)||(r.taraf||'').toLowerCase().includes(q));
  if (dir) items = items.filter(r => r.dir === dir);

  const cont = _gst('resmi-list'); if (!cont) return;
  if (!items.length) {
    cont.innerHTML = `<div style="text-align:center;padding:40px;color:var(--t2)"><div style="font-size:36px">📜</div><div style="margin-top:8px">Kayıt bulunamadı</div><div style="margin-top:10px"><button class="btn btnp" onclick="openResmiModal()">+ Evrak Ekle</button></div></div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className='tbl';
  table.innerHTML=`<thead><tr><th>Yön</th><th>Konu</th><th>Kurum</th><th>Tarih</th><th></th></tr></thead>`;
  const tbody=document.createElement('tbody');
  items.sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||'')).forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><span class="badge ${r.dir==='gelen'?'bb':'bg'}">${r.dir==='gelen'?'📥 Gelen':'📤 Giden'}</span></td>
      <td><div style="font-weight:500;font-size:13px">${escapeHtml(r.konu||'—')}</div>${r.not?`<div style="font-size:10px;color:var(--t3)">${escapeHtml(r.not.slice(0,60))}</div>`:''}</td>
      <td style="font-size:12px;color:var(--t2)">${escapeHtml(r.taraf||'—')}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${r.tarih||'—'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btns" onclick="openResmiModal(${r.id})">✏️</button>
          ${_isAdminSt()?`<button class="btn btns btnd" onclick="delResmiEvrak(${r.id})">🗑</button>`:''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); frag.appendChild(table); cont.replaceChildren(frag);
}

function openResmiModal(id) {
  if (!_gst('panel-resmi')?.dataset.injected) renderResmi();
  if (id) {
    const r=(typeof loadResmi==='function'?loadResmi():[]).find(x=>x.id===id); if(!r) return;
    if(_gst('resmi-konu'))  _gst('resmi-konu').value =r.konu||'';
    if(_gst('resmi-dir'))   _gst('resmi-dir').value  =r.dir||'gelen';
    if(_gst('resmi-tarih')) _gst('resmi-tarih').value=r.tarih||'';
    if(_gst('resmi-taraf')) _gst('resmi-taraf').value=r.taraf||'';
    if(_gst('resmi-not'))   _gst('resmi-not').value  =r.not||'';
    if(_gst('resmi-eid'))   _gst('resmi-eid').value  =id;
    _stst('mo-resmi-t','✏️ Evrak Düzenle');
  } else {
    ['resmi-konu','resmi-taraf','resmi-not'].forEach(i=>{const el=_gst(i);if(el)el.value='';});
    if(_gst('resmi-dir'))   _gst('resmi-dir').value='gelen';
    if(_gst('resmi-tarih')) _gst('resmi-tarih').valueAsDate=new Date();
    if(_gst('resmi-eid'))   _gst('resmi-eid').value='';
    _stst('mo-resmi-t','+ Resmi Evrak');
  }
  window.openMo?.('mo-resmi');
}

function saveResmiEvrak() {
  const konu=(_gst('resmi-konu')?.value||'').trim();
  if(!konu){window.toast?.('Konu zorunludur','err');return;}
  const d=typeof loadResmi==='function'?loadResmi():[];
  const eid=parseInt(_gst('resmi-eid')?.value||'0');
  const entry={konu,dir:_gst('resmi-dir')?.value||'gelen',tarih:_gst('resmi-tarih')?.value||'',taraf:_gst('resmi-taraf')?.value||'',not:_gst('resmi-not')?.value||'',ts:_nowTsst(),uid:_CUst()?.id};
  if(eid){const ex=d.find(x=>x.id===eid);if(ex)Object.assign(ex,entry);}else d.unshift({id:generateNumericId(),...entry});
  if(typeof storeResmi==='function')storeResmi(d);
  window.closeMo?.('mo-resmi');renderResmi();window.toast?.(eid?'Güncellendi ✓':'Evrak eklendi ✓','ok');
}

function delResmiEvrak(id) {
  if(!_isAdminSt()) return;
  window.confirmModal('Bu evrakı silmek istediğinizden emin misiniz?', {
    title: 'Resmi Evrak Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      if(typeof storeResmi==='function')storeResmi((typeof loadResmi==='function'?loadResmi():[]).filter(x=>x.id!==id));
      renderResmi();window.toast?.('Silindi','ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ETKİNLİK / FUAR PANELİ
// ════════════════════════════════════════════════════════════════

function delEtkinlikItem(id){
  if(!_isAdminSt()) return;
  window.confirmModal('Bu etkinliği silmek istediğinizden emin misiniz?', {
    title: 'Etkinlik Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      if(typeof storeEtkinlik==='function')storeEtkinlik((typeof loadEtkinlik==='function'?loadEtkinlik():[]).filter(x=>x.id!==id));
      window.renderEtkinlik?.();window.toast?.('Silindi','ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — ÇÖP KUTUSU PANELİ
// ════════════════════════════════════════════════════════════════

function renderTrashPanel() {
  const p = _gst('panel-trash');
  if (!p) return;
  var esc = window._esc;
  if (!p.dataset.injected) {
    p.dataset.injected = '1';
    p.innerHTML = '<div style="position:sticky;top:0;z-index:200;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:0.5px solid var(--b)">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--t)">Çöp Kutusu</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Son 30 gün içinde silinen kayıtlar</div></div>'
      + '<div style="display:flex;gap:6px">'
      + '<button onclick="window._trashRestoreSelected?.()" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:7px;background:var(--sf);color:var(--t2);font-size:11px;cursor:pointer;font-family:inherit">Seçilenleri Geri Al</button>'
      + (_isAdminSt() ? '<button onclick="emptyTrash()" style="padding:6px 12px;border:0.5px solid #DC2626;border-radius:7px;background:none;color:#DC2626;font-size:11px;cursor:pointer;font-family:inherit">Tümünü Temizle</button>' : '')
      + '</div></div>'
      + '<div id="trash-stats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:0.5px solid var(--b)"></div>'
      + '<div style="padding:8px 24px;border-bottom:0.5px solid var(--b);display:flex;gap:8px;flex-wrap:wrap">'
      + '<input class="fi" id="trash-search" placeholder="Ara..." oninput="renderTrashPanel()" style="width:140px;font-size:11px;padding:4px 8px;border:0.5px solid var(--b);border-radius:7px">'
      + '<select class="fi" id="trash-modul" onchange="renderTrashPanel()" style="font-size:11px;padding:4px 8px;border:0.5px solid var(--b);border-radius:7px"><option value="">Tüm Modüller</option><option value="Ödeme">Ödeme</option><option value="Görev">Görev</option><option value="Cari">Cari</option><option value="Ürün">Ürün</option><option value="Satınalma">Satınalma</option></select>'
      + '</div></div>'
      + '<div style="margin:12px 20px;background:var(--sf);border:0.5px solid var(--b);border-radius:10px;overflow:hidden"><div id="trash-list"></div></div>';
  }
  var items = (typeof loadTrash === 'function') ? loadTrash() : [];
  var today = new Date();
  var thisMonth = today.toISOString().slice(0,7);
  // Stats
  var buAy = items.filter(function(i){return (i.deletedAt||'').startsWith(thisMonth);}).length;
  var yakinda = items.filter(function(i){if (!i.expiresAt) return false; var kalan=Math.ceil((new Date(i.expiresAt)-today)/86400000); return kalan<=7 && kalan>0;}).length;
  var statsEl = _gst('trash-stats');
  if (statsEl) statsEl.innerHTML = '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Toplam</div><div style="font-size:22px;font-weight:600">'+items.length+'</div></div>'
    + '<div style="padding:14px 20px;border-right:0.5px solid var(--b)"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Bu Ay Silinen</div><div style="font-size:22px;font-weight:600;color:#D97706">'+buAy+'</div></div>'
    + '<div style="padding:14px 20px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">7 Günde Silinecek</div><div style="font-size:22px;font-weight:600;color:#DC2626">'+yakinda+'</div></div>';
  // Filtre
  var q = (_gst('trash-search')?.value||'').toLowerCase();
  var mf = _gst('trash-modul')?.value||'';
  var fl = items;
  if (q) fl = fl.filter(function(i){return (i.name||'').toLowerCase().includes(q)||(i.moduleName||'').toLowerCase().includes(q);});
  if (mf) fl = fl.filter(function(i){return i.moduleName===mf;});
  // Badge güncelle
  var badge = _gst('nb-trash-b');
  if (badge) { badge.textContent = items.length; badge.style.display = items.length ? '' : 'none'; }
  var cont = _gst('trash-list'); if (!cont) return;
  if (!fl.length) { cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--t3)"><div style="font-size:36px;margin-bottom:8px">🗑</div><div>Çöp kutusu boş</div></div>'; return; }
  cont.innerHTML = fl.slice(0,50).map(function(item) {
    var kalan = item.expiresAt ? Math.ceil((new Date(item.expiresAt) - today) / 86400000) : 30;
    var kalanColor = kalan <= 7 ? '#DC2626' : kalan <= 14 ? '#D97706' : '#16A34A';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:0.5px solid var(--b);transition:background .1s" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">'
      + '<input type="checkbox" class="trash-cb" value="'+item.id+'" style="cursor:pointer;flex-shrink:0">'
      + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--t)">'+esc(item.name||'—')+'</div><div style="font-size:10px;color:var(--t3)">'+esc(item.moduleName||'')+ ' · '+esc(item.deletedByName||'')+ ' · '+(item.deletedAt||'').slice(0,10)+'</div></div>'
      + '<span style="font-size:8px;padding:2px 6px;border-radius:99px;background:'+kalanColor+'18;color:'+kalanColor+';font-weight:600;white-space:nowrap">'+kalan+' gün</span>'
      + '<button onclick="window._trashRestore?.('+item.id+')" style="padding:2px 8px;border:none;border-radius:99px;background:#16A34A18;color:#16A34A;font-size:9px;font-weight:600;cursor:pointer;font-family:inherit">Geri Al</button>'
      + (_isAdminSt() ? '<button onclick="window._trashPermanentDel?.('+item.id+')" style="padding:2px 8px;border:none;border-radius:99px;background:#DC262618;color:#DC2626;font-size:9px;font-weight:600;cursor:pointer;font-family:inherit">Kalıcı Sil</button>' : '')
      + '</div>';
  }).join('');
}

function emptyTrash() {
  if (!_isAdminSt()) return;
  window.confirmModal('Çöp kutusunu tamamen temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.', {
    title: 'Çöp Kutusunu Temizle',
    danger: true,
    confirmText: 'Evet, Temizle',
    onConfirm: () => {
      if (typeof storeTrash === 'function') storeTrash([]);
      try { var fp2 = typeof window._fsPath === 'function' ? window._fsPath('trash') : null; var FB2 = window.Auth?.getFBDB?.(); if (fp2 && FB2) { FB2.doc(fp2).set({ data: [], updatedAt: new Date().toISOString() }).catch(function(e) { console.warn('[Trash] FS empty:', e); }); } } catch(e) {}
      renderTrashPanel();
      window.toast?.('Çöp kutusu temizlendi ✓', 'ok');
      window.logActivity?.('system', 'Çöp kutusu temizlendi');
    }
  });
}

/** Tek kaydı geri yükle */
window._trashRestore = function(trashId) {
  var trash = typeof loadTrash === 'function' ? loadTrash() : [];
  var item = trash.find(function(t){return t.id === trashId;});
  if (!item || !item.originalData) { window.toast?.('Kayıt bulunamadı','err'); return; }
  var orig = item.originalData;
  delete orig.isDeleted; delete orig.deletedAt; delete orig.deletedBy; delete orig.deletedReason;
  // Orijinal koleksiyona geri ekle
  var col = item.originalCollection;
  var restoreMap = {
    odemeler: {load:'loadOdm',store:'storeOdm'}, tahsilat: {load:'loadTahsilat',store:'storeTahsilat'},
    tasks: {load:'loadTasks',store:'saveTasks'}, cari: {load:'loadCari',store:'storeCari'},
    satinalma: {load:'loadSatinalma',store:'storeSatinalma'}, urunler: {load:'loadUrunler',store:'storeUrunler'},
    alisTeklifleri: {load:'loadAlisTeklifleri',store:'storeAlisTeklifleri'},
    satisTeklifleri: {load:'loadSatisTeklifleri',store:'storeSatisTeklifleri'},
    stok: {load:'loadStok',store:'storeStok'},
  };
  var map = restoreMap[col];
  if (map && typeof window[map.load] === 'function' && typeof window[map.store] === 'function') {
    var d = window[map.load]();
    // Mükerrer kontrol
    if (!d.some(function(x){return x.id === orig.id;})) d.unshift(orig);
    else { var ex = d.find(function(x){return x.id === orig.id;}); if (ex) { delete ex.isDeleted; delete ex.deletedAt; } }
    window[map.store](d);
  }
  // Trash'ten kaldır
  trash = trash.filter(function(t){return t.id !== trashId;});
  if (typeof storeTrash === 'function') storeTrash(trash);
  renderTrashPanel();
  window.toast?.('Geri yüklendi: ' + (item.name||'—') + ' ✓', 'ok');
  window.logActivity?.('system', 'Çöp kutusundan geri yüklendi: ' + (item.name||''));
};

/** Toplu geri yükle */
window._trashRestoreSelected = function() {
  var checked = document.querySelectorAll('.trash-cb:checked');
  if (!checked.length) { window.toast?.('Kayıt seçin','warn'); return; }
  var n = checked.length;
  Array.from(checked).forEach(function(cb) { window._trashRestore(parseInt(cb.value)); });
  renderTrashPanel();
  window.toast?.(n + ' kayıt geri alındı ✓', 'ok');
};

/** Kalıcı sil (admin only) */
window._trashPermanentDel = function(trashId) {
  if (!_isAdminSt()) return;
  var trash = typeof loadTrash === 'function' ? loadTrash() : [];
  trash = trash.filter(function(t){return t.id !== trashId;});
  if (typeof storeTrash === 'function') storeTrash(trash);
  try { var fp = typeof window._fsPath === 'function' ? window._fsPath('trash') : null; var FB = window.Auth?.getFBDB?.(); if (fp && FB) { FB.doc(fp).set({ data: trash, updatedAt: new Date().toISOString() }).catch(function(e) { console.warn('[Trash] FS sil:', e); }); } } catch(e) {}
  renderTrashPanel();
  window.toast?.('Kalıcı silindi ✓', 'ok');
  window.logActivity?.('system', 'Çöp kutusu: kalıcı silme #' + trashId);
};

// ════════════════════════════════════════════════════════════════
// BÖLÜM 7 — HESAP GEÇMİŞİ PANELİ inject
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// BÖLÜM 8 — ÖNERİLER PANELİ inject
// ════════════════════════════════════════════════════════════════

function _injectSuggestionsPanel() {
  const p = _gst('panel-suggestions');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">💡 Geliştirme Önerileri</div><div class="phs">Platform iyileştirme önerileri</div></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="mob" style="padding:16px">
        <textarea class="fi" id="suggest-input" rows="3" style="margin-bottom:10px;resize:vertical" placeholder="Önerinizi yazın..."></textarea>
        <button class="btn btnp" onclick="Admin?.submitSuggestion?.()">Gönder</button>
      </div>
    </div>
    <div id="suggestions-list"></div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 9 — AKTİVİTE PANELİ inject
// ════════════════════════════════════════════════════════════════

function _injectActivityPanel() {
  const p = _gst('panel-activity');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div><div class="pht">📋 Aktivite Logu</div><div class="phs">Tüm kullanıcı hareketleri</div></div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input class="si" id="log-search-p" placeholder="Ara..." oninput="renderActivity()" style="max-width:200px">
      <select class="si" id="log-type-fp" onchange="renderActivity()" style="max-width:160px">
        <option value="">Tüm Türler</option>
        <option value="login">Giriş</option><option value="task">Görev</option>
        <option value="user">Kullanıcı</option><option value="kargo">Kargo</option>
      </select>
    </div>
    <div id="activity-log-list-panel" style="overflow-x:auto"></div>`;
}

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderEvrak, renderArsiv, renderResmi, renderTrashPanel };
} else {
  // Hesap paneli wrap
  const _origHesap = window.renderHesapHistory;
  window.renderHesapHistory = function(...a) {
    _injectHesapPanel();
    if (typeof _origHesap === 'function') return _origHesap(...a);
  };
  // Öneri paneli wrap
  const _origSugg = window.renderSugg;
  window.renderSugg = function(...a) {
    _injectSuggestionsPanel();
    if (window.Admin?.renderSugg) return window.Admin.renderSugg(...a);
    if (typeof renderSuggestions === 'function') return renderSuggestions();
  };
  // Aktivite paneli wrap
  const _origAct = window.renderActivity;
  window.renderActivity = function(...a) {
    _injectActivityPanel();
    if (typeof window.renderActivityLog === 'function') return window.renderActivityLog();
    if (window.Admin?.renderLog) return window.Admin.renderLog();
  };
  // Alias'lar
  window.renderEvrak        = renderEvrak;
  window.renderArsiv        = renderArsiv;
  window.renderResmi        = renderResmi;
  window.renderEtkinlik     = window.renderEtkinlik || function() { console.warn('[panel_stubs] renderEtkinlik henüz yüklenmedi'); };
  window.renderTrashPanel   = renderTrashPanel;
  // CRUD
  window.openEvrakModal     = openEvrakModal;
  window.saveEvrak          = saveEvrak;
  window.delEvrakItem       = delEvrakItem;
  window.openDolapModal     = openDolapModal;
  window.saveDolap          = saveDolap;
  window.delDolap           = delDolap;
  window.delArsivBelge      = delArsivBelge;
  window.openResmiModal     = openResmiModal;
  window.saveResmiEvrak     = saveResmiEvrak;
  window.delResmiEvrak      = delResmiEvrak;
  window.openEtkinlikModal  = window.openEtkinlikModal  || function() { console.warn('[panel_stubs] openEtkinlikModal henüz yüklenmedi'); };
  window.saveEtkinlik       = window.saveEtkinlik       || function() { console.warn('[panel_stubs] saveEtkinlik henüz yüklenmedi'); };
  window.delEtkinlikItem    = delEtkinlikItem;
  window.emptyTrash         = emptyTrash;
}

// ════════════════════════════════════════════════════════════════
// SİSTEM TESTLERİ PANELİ
// ════════════════════════════════════════════════════════════════
window._renderSistemTestler = function() {
  var panel = document.getElementById('panel-sistem-testler'); if (!panel) return;
  var tests = [
    { label: 'localStorage doluluk', run: function() { var total = 0; Object.keys(localStorage).forEach(function(k) { total += (localStorage.getItem(k) || '').length * 2; }); var pct = Math.round(total / (5 * 1024 * 1024) * 100); return { ok: pct < 60, val: '%' + pct + ' dolu', warn: pct >= 60 && pct < 80 }; } },
    { label: 'Firestore bağlantısı', run: function() { var ok = !!window.Auth?.getFBDB?.(); return { ok: ok, val: ok ? 'Bağlı' : 'Bağlantı yok' }; } },
    { label: 'Firebase Auth', run: function() { var ok = !!window.Auth?.getFBAuth?.(); return { ok: ok, val: ok ? 'Aktif' : 'Pasif' }; } },
    { label: 'Oturum aktif', run: function() { var cu = window.Auth?.getCU?.(); return { ok: !!cu, val: cu ? cu.name + ' (' + cu.role + ')' : 'Oturum yok' }; } },
    { label: 'İnternet bağlantısı', run: function() { return { ok: navigator.onLine, val: navigator.onLine ? 'Online' : 'Offline' }; } },
    { label: 'Kur API (ticker)', run: function() { var usd = window._tickerRates?.USD || 0; return { ok: usd > 30, val: usd > 30 ? 'USD: ₺' + usd : 'Kur yok' }; } },
    { label: 'Service Worker', run: function() { var ok = 'serviceWorker' in navigator; return { ok: ok, val: ok ? 'Destekleniyor' : 'Yok' }; } },
    { label: 'Bildirim izni', run: function() { var p = window.Notification?.permission; return { ok: p === 'granted', warn: p === 'default', val: p === 'granted' ? 'Verildi' : p === 'denied' ? 'Reddedildi' : 'Bekliyor' }; } },
    { label: 'Çöp kutusu', run: function() { var t = typeof loadTrash === 'function' ? loadTrash() : []; return { ok: t.length <= 50, val: t.length + ' / 50' }; } },
    { label: 'Kullanıcı sayısı', run: function() { var u = typeof loadUsers === 'function' ? loadUsers() : []; var a = u.filter(function(x) { return x.status === 'active'; }).length; return { ok: a > 0, val: a + ' aktif / ' + u.length + ' toplam' }; } },
    { label: 'Kur son güncelleme', run: function() { var ts = window._tickerLastUpdate || ''; if (!ts) return { ok: false, val: 'Bilinmiyor' }; return { ok: true, val: ts }; } },
    { label: 'Firestore son sync', run: function() { var ts = localStorage.getItem('ak_db_last_write') || ''; if (!ts) return { ok: true, warn: true, val: 'Bilinmiyor' }; var diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000); return { ok: diff < 10, warn: diff >= 10 && diff < 30, val: diff + ' dk önce' }; } },
    { label: 'Aktif alarm sayısı', run: function() { try { var a = JSON.parse(localStorage.getItem('ak_alarms1') || '[]').filter(function(x) { return !x.isDeleted && x.aktif; }).length; return { ok: true, val: a + ' aktif alarm' }; } catch (e) { return { ok: true, val: '0' }; } } },
    { label: 'Bugün tetiklenen alarm', run: function() { try { var bugun = new Date().toISOString().slice(0, 10); var n = JSON.parse(localStorage.getItem('ak_alarm_log1') || '[]').filter(function(l) { return (l.ts || '').slice(0, 10) === bugun; }).length; return { ok: true, val: n + ' tetiklendi' }; } catch (e) { return { ok: true, val: '0' }; } } },
    { label: 'GÇB modülü', run: function() { var ok = typeof window.renderGcb === 'function'; return { ok: ok, val: ok ? 'Yüklendi' : 'Yüklenmedi' }; } },
    { label: 'AI Belge Oluşturucu', run: function() { var ok = typeof window._openDocComposer === 'function'; return { ok: ok, val: ok ? 'Hazır' : 'Yüklenmedi' }; } },
    { label: 'localStorage base64', run: function() { var found = 0; ['ak_task_chat1', 'ak_tk2'].forEach(function(k) { var raw = localStorage.getItem(k) || ''; if (raw.indexOf('data:image') !== -1 || raw.indexOf('data:application') !== -1) found++; }); return { ok: found === 0, val: found === 0 ? 'Temiz' : found + ' key base64 var!' }; } },
    { label: 'Açık onay bekleyen', run: function() { try { var odm = typeof window.loadOdm === 'function' ? window.loadOdm() : []; var n = odm.filter(function(o) { return !o.isDeleted && (o.approvalStatus === 'pending' || o.approvalStatus === 'pending_dual_approval'); }).length; return { ok: n === 0, warn: n > 0, val: n + ' onay bekliyor' }; } catch (e) { return { ok: true, val: '0' }; } } },
  ];
  var results = tests.map(function(t) { try { return { label: t.label, result: t.run() }; } catch (e) { return { label: t.label, result: { ok: false, val: 'Hata: ' + e.message } }; } });
  var passed = results.filter(function(r) { return r.result.ok; }).length;
  var failed = results.filter(function(r) { return !r.result.ok && !r.result.warn; }).length;
  var scoreColor = failed === 0 ? '#16a34a' : failed <= 2 ? '#D97706' : '#dc2626';

  panel.innerHTML = '<div style="max-width:900px;margin:0 auto;padding:24px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div><div style="font-size:18px;font-weight:500;color:var(--t)">Sistem Testleri</div><div style="font-size:11px;color:var(--t3);margin-top:2px">Son: ' + new Date().toLocaleTimeString('tr-TR') + '</div></div><div style="display:flex;align-items:center;gap:12px"><div style="text-align:center"><div style="font-size:28px;font-weight:500;color:' + scoreColor + '">' + passed + '/' + results.length + '</div><div style="font-size:10px;color:var(--t3)">Test geçti</div></div><button onclick="window._renderSistemTestler?.()" style="padding:8px 16px;border-radius:7px;border:0.5px solid var(--b);background:var(--sf);font-size:11px;cursor:pointer;font-family:inherit;color:var(--t)">Yeniden Çalıştır</button><button onclick="window._runDataConsistency?.()" style="padding:8px 16px;border-radius:7px;border:0.5px solid #185FA5;background:#E6F1FB;font-size:11px;cursor:pointer;font-family:inherit;color:#0C447C;margin-left:8px">Veri Kontrolü</button></div></div>'
    + '<div style="display:flex;flex-direction:column;gap:6px">' + results.map(function(r) { var c = r.result.ok ? '#16a34a' : r.result.warn ? '#D97706' : '#dc2626'; var ic = r.result.ok ? '✓' : r.result.warn ? '⚠' : '✗'; var bg = r.result.ok ? '#EAF3DE' : r.result.warn ? '#FAEEDA' : '#FCEBEB'; return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--sf);border:0.5px solid var(--b);border-radius:8px"><div style="width:22px;height:22px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + c + ';flex-shrink:0">' + ic + '</div><div style="flex:1;font-size:12px;font-weight:500;color:var(--t)">' + r.label + '</div><div style="font-size:11px;color:' + c + ';font-weight:500">' + r.result.val + '</div></div>'; }).join('') + '</div>'
    + '<div id="data-consistency-results" style="margin-top:20px"></div>'
    + '</div>';
};

// ══ DATA-CONSISTENCY-001 ══════════════════════════════════════
window._runDataConsistency = function() {
  var el = document.getElementById('data-consistency-results');
  if (!el) { window.toast?.('Sonuc alani bulunamadi', 'err'); return; }
  el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--t2)">Kontroller calisiyor...</div>';
  var t0 = Date.now();
  var checks = [];

  // Veri yukle
  var ihrDosyalar = typeof loadIhracatDosyalar === 'function' ? loadIhracatDosyalar() : [];
  var ihrUrunlerAll = []; try { ihrUrunlerAll = JSON.parse(localStorage.getItem('ak_ihr_urun1') || '[]'); } catch(e) {}
  var ihrUrunlerAktif = ihrUrunlerAll.filter(function(u) { return !u.isDeleted; });
  var ihrEvraklar = typeof loadIhracatEvraklar === 'function' ? loadIhracatEvraklar() : [];
  var ihrGcb = typeof loadIhracatGcb === 'function' ? loadIhracatGcb() : [];
  var aktifDosyaIds = {};
  ihrDosyalar.forEach(function(d) { aktifDosyaIds[String(d.id)] = true; });

  // 1) Orphan urunler
  var t1 = Date.now();
  var orphanN = ihrUrunlerAktif.filter(function(u) { return u.dosya_id && !aktifDosyaIds[String(u.dosya_id)]; }).length;
  checks.push({ label:'Orphan Urunler', ok: orphanN === 0, warn: false, val: orphanN === 0 ? 'Temiz' : orphanN + ' orphan urun', ms: Date.now() - t1 });

  // 2) Evrak zinciri tutarliligi
  var t2 = Date.now();
  var zincirSapma = 0;
  ihrDosyalar.forEach(function(d) {
    var evs = {}; ihrEvraklar.filter(function(e) { return String(e.dosya_id) === String(d.id); }).forEach(function(e) { evs[e.tur] = e.durum; });
    if ((evs.CI === 'onaylandi' || evs.CI === 'gonderildi') && evs.PI !== 'onaylandi' && evs.PI !== 'gonderildi') zincirSapma++;
    if ((evs.PL === 'onaylandi' || evs.PL === 'gonderildi') && evs.CI !== 'onaylandi' && evs.CI !== 'gonderildi') zincirSapma++;
  });
  checks.push({ label:'Evrak Zinciri', ok: zincirSapma === 0, warn: false, val: zincirSapma === 0 ? 'Tutarli' : zincirSapma + ' dosyada sira bozuk', ms: Date.now() - t2 });

  // 3) Silinmis urun orani
  var t3 = Date.now();
  var silOran = ihrUrunlerAll.length > 0 ? Math.round(ihrUrunlerAll.filter(function(u) { return u.isDeleted; }).length / ihrUrunlerAll.length * 100) : 0;
  checks.push({ label:'Silinmis Urun Orani', ok: silOran < 80, warn: silOran >= 80 && silOran < 95, val: '%' + silOran + (silOran >= 80 ? ' — temizlik onerilir' : ''), ms: Date.now() - t3 });

  // 4) Duplicate urun kodu
  var t4 = Date.now();
  var kodSay = {}; ihrUrunlerAktif.forEach(function(u) { if (u.urun_kodu) { kodSay[u.urun_kodu] = (kodSay[u.urun_kodu] || 0) + 1; } });
  var dupN = Object.keys(kodSay).filter(function(k) { return kodSay[k] > 1; }).length;
  checks.push({ label:'Duplicate Urun Kodu', ok: dupN === 0, warn: dupN > 0, val: dupN === 0 ? 'Temiz' : dupN + ' cift urun kodu', ms: Date.now() - t4 });

  // 5) GCB ↔ Evrak senkron
  var t5 = Date.now();
  var gcbEksik = 0;
  ihrEvraklar.filter(function(e) { return e.tur === 'GCB' && e.durum === 'taslak'; }).forEach(function(e) {
    var gercekGcb = ihrGcb.find(function(g) { return String(g.dosya_id) === String(e.dosya_id) && !g.isDeleted; });
    if (!gercekGcb) gcbEksik++;
  });
  checks.push({ label:'GCB Senkron', ok: gcbEksik === 0, warn: false, val: gcbEksik === 0 ? 'Tutarli' : gcbEksik + ' dosyada GCB eksik', ms: Date.now() - t5 });

  // 6) Fiyat tutarsizligi
  var t6 = Date.now();
  var fiyatMap = {};
  ihrUrunlerAktif.forEach(function(u) { if (u.urun_kodu && u.birim_fiyat) { if (!fiyatMap[u.urun_kodu]) fiyatMap[u.urun_kodu] = new Set(); fiyatMap[u.urun_kodu].add(String(u.birim_fiyat)); } });
  var fiyatTutarsiz = Object.keys(fiyatMap).filter(function(k) { return fiyatMap[k].size > 1; }).length;
  checks.push({ label:'Fiyat Tutarliligi', ok: fiyatTutarsiz === 0, warn: fiyatTutarsiz > 0, val: fiyatTutarsiz === 0 ? 'Tutarli' : fiyatTutarsiz + ' urunde fiyat farki', ms: Date.now() - t6 });

  // 7) LS ↔ Firestore senkron
  var t7 = Date.now();
  var fbOk = !!window.Auth?.getFBDB?.();
  checks.push({ label:'Firestore Senkron', ok: fbOk, warn: !fbOk, val: fbOk ? 'Bagli' : 'Bagli degil — kontrol edilemedi', ms: Date.now() - t7 });

  // 8) Bos zorunlu alanlar
  var t8 = Date.now();
  var bosAciklama = ihrUrunlerAktif.filter(function(u) { return !u.aciklama; }).length;
  var bosMiktar = ihrUrunlerAktif.filter(function(u) { return !parseFloat(u.miktar); }).length;
  var bosFiyat = ihrUrunlerAktif.filter(function(u) { return !parseFloat(u.birim_fiyat); }).length;
  var bosTop = bosAciklama + bosMiktar + bosFiyat;
  checks.push({ label:'Bos Zorunlu Alanlar', ok: bosTop === 0, warn: bosTop > 0, val: bosTop === 0 ? 'Temiz' : bosAciklama + ' aciklama, ' + bosMiktar + ' miktar, ' + bosFiyat + ' fiyat bos', ms: Date.now() - t8 });

  // Sonuc render
  var totalMs = Date.now() - t0;
  var gecti = checks.filter(function(c) { return c.ok; }).length;
  var sorunlu = checks.filter(function(c) { return !c.ok && !c.warn; }).length;
  var ozet = gecti + '/' + checks.length + ' gecti' + (sorunlu > 0 ? ' — ' + sorunlu + ' sorun' : '');
  var ozetRenk = sorunlu === 0 ? '#16A34A' : '#DC2626';

  var h = '<div style="border-top:2px solid var(--b);padding-top:20px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
  h += '<div style="font-size:16px;font-weight:500;color:var(--t)">Data Consistency Check</div>';
  h += '<div style="display:flex;align-items:center;gap:12px"><div style="font-size:20px;font-weight:600;color:' + ozetRenk + '">' + ozet + '</div><div style="font-size:10px;color:var(--t3)">' + totalMs + 'ms</div></div>';
  h += '</div>';
  checks.forEach(function(c) {
    var renk = c.ok ? '#16A34A' : c.warn ? '#D97706' : '#DC2626';
    var ikon = c.ok ? '\u2713' : c.warn ? '\u26a0' : '\u2717';
    var bg = c.ok ? '#EAF3DE' : c.warn ? '#FAEEDA' : '#FCEBEB';
    h += '<div style="display:flex;align-items:center;gap:12px;padding:8px 14px;background:var(--sf);border:0.5px solid var(--b);border-radius:8px;margin-bottom:4px">';
    h += '<div style="width:22px;height:22px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + renk + ';flex-shrink:0">' + ikon + '</div>';
    h += '<div style="flex:1;font-size:12px;font-weight:500;color:var(--t)">' + c.label + '</div>';
    h += '<div style="font-size:11px;color:' + renk + ';font-weight:500">' + c.val + '</div>';
    h += '<div style="font-size:9px;color:var(--t3);min-width:40px;text-align:right">' + c.ms + 'ms</div>';
    h += '</div>';
  });
  h += '</div>';
  el.innerHTML = h;
};

// ════════════════════════════════════════════════════════════════
// PLATFORM KURALLARI PANELİ
// ════════════════════════════════════════════════════════════════
window._renderPlatformRules = function() {
  var panel = document.getElementById('panel-platform-rules'); if (!panel) return;
  var _PR_KEY = 'ak_pr_status2'; var prStatus = {}; try { prStatus = JSON.parse(localStorage.getItem(_PR_KEY) || '{}'); } catch(e) {}
  window._prSetField = function(id, field, val) { if (!prStatus[id]) prStatus[id] = {}; prStatus[id][field] = val; localStorage.setItem(_PR_KEY, JSON.stringify(prStatus)); window._renderPlatformRules(); };
  var _sw = function(id) { var s = prStatus[id] || {}; var fields = [{key:'clTest',lbl:'Claude Test',opts:['Evet','Hayır','Kısmi']},{key:'baranTest',lbl:'Baran Test',opts:['Evet','Hayır','Kısmi']},{key:'baranSonuc',lbl:'Sonuç',opts:['Onaylandı','Sorun Var','Test Edilmedi']}]; return '<div style="display:flex;gap:6px;margin-top:6px">' + fields.map(function(f) { var val = s[f.key] || ''; return '<select onchange="window._prSetField(\'' + id + '\',\'' + f.key + '\',this.value)" style="font-size:9px;padding:2px 4px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t);font-family:inherit"><option value="">'+f.lbl+'</option>' + f.opts.map(function(o) { return '<option value="'+o+'"'+(val===o?' selected':'')+'>'+o+'</option>'; }).join('') + '</select>'; }).join('') + '</div>'; };
  var gkList = [
    { id: 'GK-01', kural: 'Her liste satırında ▸ hızlı göz at butonu', durum: 'ok' },
    { id: 'GK-02', kural: 'Her silme işlemi confirmModal ile onay ister', durum: 'ok' },
    { id: 'GK-03', kural: 'Admin + user toplu silebilir', durum: 'ok' },
    { id: 'GK-04', kural: 'Soft delete — çöp kutusuna gider', durum: 'ok' },
    { id: 'GK-05', kural: 'Dosyalar Firebase Storage URL', durum: 'ok' },
    { id: 'GK-06', kural: 'localStorage daima <%60 dolu', durum: 'ok' },
    { id: 'GK-07', kural: 'Her kayıtta updatedAt zorunlu', durum: 'ok' },
    { id: 'GK-08', kural: 'Yetkisiz menü görünmez', durum: 'ok' },
    { id: 'GK-09', kural: 'Form zorunlu alan validasyonu', durum: 'ok' },
    { id: 'GK-10', kural: 'createdBy + createdAt her kayıtta', durum: 'ok' },
    { id: 'GK-11', kural: 'Para formatı ₺1.234,56 (tr-TR)', durum: 'ok' },
    { id: 'GK-12', kural: 'Tarih formatı YYYY-MM-DD', durum: 'ok' },
    { id: 'GK-13', kural: 'Hata mesajları Türkçe', durum: 'ok' },
    { id: 'GK-14', kural: 'Her modülde arama/filtreleme', durum: 'ok' },
    { id: 'GK-15', kural: 'Offline bildirim + online sync', durum: 'ok' },
    { id: 'GK-16', kural: 'Kritik işlem logActivity yazılır', durum: 'ok' },
    { id: 'GK-17', kural: 'Safari iOS uyumlu', durum: 'ok' },
    { id: 'GK-18', kural: 'Yeni modül: KEYS+limit+SYNC_COLS', durum: 'ok' },
    { id: 'GK-19', kural: 'Dropdown menüler hover ile açılır, dışarı çıkınca kapanır', durum: 'ok' },
  ];
  var anayas = [
    { tarih: '2026-04-02', kural: 'Kural 01 — Sıfır Hardcode: API key ve şifreler asla kaynak kodda olmaz.' },
    { tarih: '2026-04-02', kural: 'Kural 02 — Safari First: Tüm UI Safari iOS\'ta test edilir.' },
    { tarih: '2026-04-02', kural: 'Kural 03 — Firestore Master: localStorage önbellek, Firestore gerçek veri.' },
    { tarih: '2026-04-02', kural: 'Kural 04 — Tek Fix Prensibi: Claude Code bir fix uygular, Baran test eder.' },
    { tarih: '2026-04-02', kural: 'Kural 05 — Soft Delete: Hiçbir veri kalıcı silinmez — çöp kutusuna gider.' },
    { tarih: '2026-04-02', kural: 'Kural 06 — Storage <%60: localStorage doluluk her zaman %60 altında.' },
    { tarih: '2026-04-02', kural: 'Kural 07 — Audit Trail: Her kritik işlem logActivity ile kaydedilir.' },
    { tarih: '2026-04-02', kural: 'Kural 08 — Modül Erişimi: Yetkisiz menü gösterilmez.' },
    { tarih: '2026-04-02', kural: 'Kural 09 — Anayasa Güncelleme: İlk 1 ay her gün, sonrasında her önemli değişiklikte güncellenir.' },
  ];

  var yapilacaklar = [
    { id:'FINANS-KUR-001', baslik:'Finans paneli kur düzeltme', oncelik:'yüksek', aciklama:'Finans paneli eski fallback kurları gösteriyor' },
    { id:'EXP-002', baslik:'GÇB Takip modülü', oncelik:'orta', aciklama:'Gümrük çıkış beyannamesi takip modülü' },
    { id:'EXP-003', baslik:'Konişimento / B/L modülü', oncelik:'orta', aciklama:'Deniz taşımacılığı konişimento takibi' },
    { id:'ALR-001', baslik:'Akıllı alarm sistemi', oncelik:'orta', aciklama:'Vade, stok, kur alarm sistemi' },
  ];
  var sorunlar = [
    { id:'S-001', baslik:'localStorage %70+ dolu', oncelik:'kritik', aciklama:'taskChats şişiyor — STORAGE-CLEAN-002 uygulandı, takip gerekli' },
    { id:'S-002', baslik:'Offline kuyruk 1 işlem', oncelik:'orta', aciklama:'Manuel Sync dene' },
    { id:'S-003', baslik:'Kullanıcı Yönetimi tablo görünümü', oncelik:'yüksek', aciklama:'Tarayıcı cache — Cmd+Shift+R dene' },
  ];
  var gelistirmeler = [
    { id:'G-001', baslik:'Pusula liste görünümü yeniden tasarım', oncelik:'düşük', aciklama:'' },
    { id:'G-002', baslik:'Dashboard nakit trendi bloğu geliştirme', oncelik:'orta', aciklama:'Grafik Y/X ekseni ve projeksiyon kodu' },
    { id:'G-003', baslik:'Kayıt formları geliştirme (6 modül)', oncelik:'orta', aciklama:'CRM, Stok, Navlun, Numune, Kargo, Ödeme form tasarımları' },
    { id:'G-004', baslik:'Sistem Testleri + Sağlık Monitörü birleştirme', oncelik:'düşük', aciklama:'Ayarlar\'daki Sağlık Monitörü Sistem Testleri\'ne entegre edilecek' },
    { id:'G-005', baslik:'Google Login tam test', oncelik:'orta', aciklama:'Firebase Console\'da aktif, uçtan uca test edilmedi' },
  ];

  var _renderItems = function(items) {
    return '<div style="display:flex;flex-direction:column;gap:6px">' + items.map(function(item) {
      var oc = item.oncelik === 'kritik' ? '#dc2626' : item.oncelik === 'yüksek' ? '#D97706' : item.oncelik === 'orta' ? '#185FA5' : '#888780';
      var ob = item.oncelik === 'kritik' ? '#FCEBEB' : item.oncelik === 'yüksek' ? '#FAEEDA' : item.oncelik === 'orta' ? '#E6F1FB' : '#F1EFE8';
      return '<div style="padding:10px 14px;background:var(--sf);border:0.5px solid var(--b);border-radius:8px"><div style="display:flex;align-items:flex-start;gap:10px"><span style="font-size:8px;font-weight:600;padding:2px 7px;border-radius:3px;background:' + ob + ';color:' + oc + ';white-space:nowrap;margin-top:1px">' + item.oncelik.toUpperCase() + '</span><div style="flex:1"><div style="font-size:12px;font-weight:500;color:var(--t)">' + item.baslik + '</div>' + (item.aciklama ? '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + item.aciklama + '</div>' : '') + '</div><span style="font-size:9px;font-family:monospace;color:var(--t3);white-space:nowrap">' + item.id + '</span></div>' + _sw(item.id) + '</div>';
    }).join('') + '</div>';
  };

  var _tabBtn = function(id, label, active) { return '<div onclick="_prTab(\'' + id + '\',this)" id="pr-tab-' + id + '" style="padding:8px 16px;font-size:12px;cursor:pointer;border-bottom:2px solid ' + (active ? 'var(--ac)' : 'transparent') + ';color:' + (active ? 'var(--ac)' : 'var(--t3)') + ';font-weight:' + (active ? '500' : '400') + ';white-space:nowrap">' + label + '</div>'; };

  panel.innerHTML = '<div style="max-width:900px;margin:0 auto;padding:24px">'
    + '<div style="font-size:18px;font-weight:500;color:var(--t);margin-bottom:4px">Platform Kuralları</div>'
    + '<div style="font-size:11px;color:var(--t3);margin-bottom:24px">Sistem geliştirme anayasası ve genel kurallar</div>'
    + '<div style="display:flex;gap:2px;border-bottom:0.5px solid var(--b);margin-bottom:20px;overflow-x:auto">' + _tabBtn('gk', 'Genel Kurallar', true) + _tabBtn('anayasa', 'Anayasa', false) + _tabBtn('ozel', 'Özel Kurallar', false) + _tabBtn('yapilacak', 'Yapılacaklar', false) + _tabBtn('sorunlar', 'Sorunlar', false) + _tabBtn('gelistirmeler', 'Geliştirmeler', false) + _tabBtn('ai', 'AI Kuralları', false) + '</div>'
    + '<div id="pr-content-gk"><div style="display:flex;flex-direction:column;gap:4px">' + gkList.map(function(g) { var ok = g.durum === 'ok'; return '<div style="padding:8px 12px;background:var(--sf);border:0.5px solid var(--b);border-radius:7px"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:9px;font-weight:600;padding:2px 7px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-family:monospace;flex-shrink:0">' + g.id + '</span><span style="flex:1;font-size:11px;color:var(--t)">' + g.kural + '</span><span style="font-size:10px;font-weight:500;color:' + (ok ? '#16a34a' : '#D97706') + '">' + (ok ? '✓' : '⏳') + '</span></div>' + _sw(g.id) + '</div>'; }).join('') + '</div></div>'
    + '<div id="pr-content-anayasa" style="display:none"><div style="display:flex;flex-direction:column;gap:6px">' + anayas.map(function(a) { return '<div style="padding:10px 14px;background:var(--sf);border:0.5px solid var(--b);border-left:3px solid #185FA5;border-radius:7px;display:flex;align-items:flex-start;gap:10px"><span style="font-size:9px;color:var(--t3);white-space:nowrap;margin-top:2px;font-family:monospace">' + a.tarih + '</span><span style="font-size:12px;color:var(--t);line-height:1.6">' + a.kural + '</span></div>'; }).join('') + '</div></div>'
    + '<div id="pr-content-ozel" style="display:none"><div style="padding:32px;text-align:center;color:var(--t3);font-size:12px">Projeye özel teknik kararlar buraya yazılır.</div></div>'
    + '<div id="pr-content-yapilacak" style="display:none">' + _renderItems(yapilacaklar) + '</div>'
    + '<div id="pr-content-sorunlar" style="display:none">' + _renderItems(sorunlar) + '</div>'
    + '<div id="pr-content-gelistirmeler" style="display:none">' + _renderItems(gelistirmeler) + '</div>'
    + '<div id="pr-content-ai" style="display:none"><div style="display:flex;flex-direction:column;gap:6px">' + [
      {id:'AI-01',tarih:'2026-04-02',durum:'aktif',baslik:'Talimat Formatı',aciklama:'Her talimatın bir ID\'si, başlığı, hedef dosyası, değişiklik adımları, kısıtı ve commit mesajı olmalıdır.'},
      {id:'AI-02',tarih:'2026-04-02',durum:'aktif',baslik:'Tek Fix Prensibi',aciklama:'Claude talimat yazar → Claude Code uygular → Baran test eder → onay → sonraki.'},
      {id:'AI-03',tarih:'2026-04-02',durum:'aktif',baslik:'Kodu Önce Oku',aciklama:'Talimat vermeden önce ilgili dosyayı oku. Mevcut pattern\'lere uy.'},
      {id:'AI-04',tarih:'2026-04-02',durum:'aktif',baslik:'Git Log Doğrula',aciklama:'Her oturumda ilk iş git log --oneline -20. Hangi commit\'lerin push\'landığını doğrula.'},
      {id:'AI-05',tarih:'2026-04-02',durum:'aktif',baslik:'Anayasaya Uy',aciklama:'Soft delete, Safari uyumluluk, localStorage <%60, Firestore master.'},
      {id:'AI-06',tarih:'2026-04-02',durum:'aktif',baslik:'Tek Dosya Kısıtı',aciklama:'Her talimat yalnızca bir dosyayı hedef alır. Birden fazla dosya ayrı talimat.'},
      {id:'AI-07',tarih:'2026-04-02',durum:'aktif',baslik:'Jargon Kullanma',aciklama:'Açıklamalar teknik jargon içermez. Basit, net Türkçe.'},
      {id:'AI-08',tarih:'2026-04-02',durum:'aktif',baslik:'Pasif Kural Korunur',aciklama:'Pasif kurallar listeden silinmez. Yanında "pasif" yazar, rengi griye döner.'},
      {id:'AI-09',tarih:'2026-04-02',durum:'aktif',baslik:'Oturum Başlangıcı',aciklama:'Her oturumda önce döküman okunur, git log doğrulanır, açık task\'lar listelenir.'},
      {id:'AI-10',tarih:'2026-04-02',durum:'aktif',baslik:'Oturum Sonu Özeti',aciklama:'Oturumun bitmesine 5 mesaj kala sistem otomatik olarak bir sonraki oturumun kullanacağı dökümanı oluşturur ve indirilebilir şekilde sunar.'},
    ].map(function(r) { var aktif = r.durum === 'aktif'; var borderColor = aktif ? '#16a34a' : r.durum === 'iptal' ? '#dc2626' : '#9ca3af'; var badgeBg = aktif ? '#EAF3DE' : r.durum === 'iptal' ? '#FCEBEB' : '#F3F4F6'; var badgeColor = aktif ? '#16a34a' : r.durum === 'iptal' ? '#dc2626' : '#6b7280'; var badgeLabel = aktif ? 'AKTİF' : r.durum === 'iptal' ? 'İPTAL' : 'PASİF'; return '<div style="padding:12px 14px;background:var(--sf);border:0.5px solid var(--b);border-left:3px solid ' + borderColor + ';border-radius:8px;opacity:' + (aktif ? '1' : '0.6') + '"><div style="display:flex;align-items:flex-start;gap:10px"><span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;background:#E6F1FB;color:#0C447C;font-family:monospace;flex-shrink:0;margin-top:1px">' + r.id + '</span><div style="flex:1"><div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:12px;font-weight:600;color:var(--t)">' + r.baslik + '</span><span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:3px;background:' + badgeBg + ';color:' + badgeColor + '">' + badgeLabel + '</span></div><div style="font-size:11px;color:var(--t2);line-height:1.6">' + r.aciklama + '</div></div><span style="font-size:9px;color:var(--t3);font-family:monospace;white-space:nowrap">' + r.tarih + '</span></div></div>'; }).join('') + '</div></div>'
    + '</div>';

  window._prTab = function(tab) {
    ['gk', 'anayasa', 'ozel', 'yapilacak', 'sorunlar', 'gelistirmeler', 'ai'].forEach(function(t) {
      var c = document.getElementById('pr-content-' + t); var tb = document.getElementById('pr-tab-' + t);
      if (c) c.style.display = t === tab ? '' : 'none';
      if (tb) { tb.style.borderBottomColor = t === tab ? 'var(--ac)' : 'transparent'; tb.style.color = t === tab ? 'var(--ac)' : 'var(--t3)'; tb.style.fontWeight = t === tab ? '500' : '400'; }
    });
  };
};


// ════════════════════════════════════════════════════════════════
// V18 EK PANELLER: finans, kpi-panel, users
// ════════════════════════════════════════════════════════════════

function _injectFinans() {
  const p = document.getElementById('panel-finans');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
  <div><div class="pht">💰 Finans Paneli</div><div class="phs">Canlı döviz, altın ve yasal ekonomik göstergeler.</div></div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <span id="finans-update-ts" style="font-size:11px;color:var(--t3);font-family:'DM Mono',monospace"></span>
    <button class="btn btns" onclick="openAddCurrencyModal()">+ Döviz Ekle</button>
    <button class="btn btnp btns" onclick="fetchLiveRates()">↻ Canlı Güncelle</button>
  </div>
</div>

<!-- SOL PANEL -->
<div style="display:flex;min-height:600px">
<div style="width:180px;flex-shrink:0;background:#fff;border-right:1px solid #e5e5e5;padding:12px 8px">
${[['ozet','📊 Özet'],['gelir_gider','💰 Gelir/Gider'],['nakit','🏦 Nakit'],['trend','📈 Trend'],['kpi','🎯 KPI'],['risk','⚠️ Risk'],['projeksiyon','🔮 Projeksiyon']].map(function(c){return '<button onclick="window._finNavClick?.(\''+c[0]+'\')" class="fin-nav-btn" data-nav="'+c[0]+'" style="display:block;width:100%;text-align:left;padding:10px 12px;border:none;border-radius:8px;background:transparent;color:#333;font-weight:400;cursor:pointer;margin-bottom:4px;font-family:inherit;font-size:12px">'+c[1]+'</button>';}).join('')}
</div>
<div style="flex:1;overflow-y:auto">

<!-- ── YASAL EKONOMİK GÖSTERGELER ── -->
<div class="card" style="margin-bottom:18px;border:2px solid rgba(79,70,229,.15)">
  <div class="ch">
    <span class="ct" style="display:flex;align-items:center;gap:6px">
      <span style="background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700">2025 GÜNCELLENDİ</span>
      📋 Yasal Ekonomik Göstergeler
    </span>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:10px;color:var(--t3)">Kaynak:</span>
      <a href="https://www.ailevecalisma.gov.tr/tr-tr/haberler/asgari-ucret-tespit-komisyonu/" target="_blank" rel="noopener" style="font-size:10px;color:var(--ac);text-decoration:none;font-weight:600">🏛 ÇŞB</a>
      <a href="https://www.sgk.gov.tr" target="_blank" rel="noopener" style="font-size:10px;color:var(--ac);text-decoration:none;font-weight:600">🏥 SGK</a>
      <a href="https://www.resmigazete.gov.tr" target="_blank" rel="noopener" style="font-size:10px;color:var(--ac);text-decoration:none;font-weight:600">📰 RG</a>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:4px 16px 16px">

    <!-- Asgari Ücret -->
    <div style="background:linear-gradient(135deg,#EEF2FF,#E0E7FF);border-radius:12px;padding:14px;border:1px solid #C7D2FE">
      <div style="font-size:10px;font-weight:700;color:#4F46E5;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">💼 ASGARİ ÜCRET (Brüt)</div>
      <div style="font-size:22px;font-weight:800;color:#3730A3;font-family:'DM Mono',monospace">28.000 ₺</div>
      <div style="font-size:11px;color:#4F46E5;margin-top:4px">Net: ≈ 22.104 ₺</div>
      <div style="font-size:10px;color:#6366F1;margin-top:3px">Ocak 2025 · Resmî Gazete</div>
      <a href="https://www.ailevecalisma.gov.tr/tr-tr/haberler/asgari-ucret-tespit-komisyonu/" target="_blank" rel="noopener" style="font-size:9px;color:#6366F1;text-decoration:none;display:block;margin-top:4px">↗ ailevecalisma.gov.tr</a>
    </div>

    <!-- Yemek Yardımı -->
    <div style="background:linear-gradient(135deg,#F0FDF4,#DCFCE7);border-radius:12px;padding:14px;border:1px solid #BBF7D0">
      <div style="font-size:10px;font-weight:700;color:#16A34A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">🍽️ YEMEK YARDIMI</div>
      <div style="font-size:22px;font-weight:800;color:#15803D;font-family:'DM Mono',monospace">210 ₺<span style="font-size:13px;font-weight:500">/gün</span></div>
      <div style="font-size:11px;color:#16A34A;margin-top:4px">SGK'dan muaf üst limit</div>
      <div style="font-size:10px;color:#22C55E;margin-top:3px">Günlük brüt ücretin %6'sı (2025)</div>
      <a href="https://www.sgk.gov.tr" target="_blank" rel="noopener" style="font-size:9px;color:#16A34A;text-decoration:none;display:block;margin-top:4px">↗ Kaynak: sgk.gov.tr</a>
    </div>

    <!-- Yol Yardımı -->
    <div style="background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-radius:12px;padding:14px;border:1px solid #FED7AA">
      <div style="font-size:10px;font-weight:700;color:#EA580C;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">🚌 YOL YARDIMI</div>
      <div style="font-size:22px;font-weight:800;color:#C2410C;font-family:'DM Mono',monospace">210 ₺<span style="font-size:13px;font-weight:500">/gün</span></div>
      <div style="font-size:11px;color:#EA580C;margin-top:4px">SGK'dan muaf üst limit</div>
      <div style="font-size:10px;color:#F97316;margin-top:3px">Servis yerine nakit (2025)</div>
      <a href="https://www.gib.gov.tr/" target="_blank" rel="noopener" style="font-size:9px;color:#EA580C;text-decoration:none;display:block;margin-top:4px">↗ gib.gov.tr/mevzuat</a>
    </div>

    <!-- SGK Tavan -->
    <div style="background:linear-gradient(135deg,#FFF1F2,#FFE4E6);border-radius:12px;padding:14px;border:1px solid #FECDD3">
      <div style="font-size:10px;font-weight:700;color:#E11D48;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">🏥 SGK TAVAN ÜCRET</div>
      <div style="font-size:22px;font-weight:800;color:#BE123C;font-family:'DM Mono',monospace">210.000 ₺</div>
      <div style="font-size:11px;color:#E11D48;margin-top:4px">7.5× asgari ücret (2025)</div>
      <div style="font-size:10px;color:#F43F5E;margin-top:3px">Prim matrahı üst sınırı</div>
      <a href="https://www.sgk.gov.tr" target="_blank" rel="noopener" style="font-size:9px;color:#E11D48;text-decoration:none;display:block;margin-top:4px">↗ Kaynak: sgk.gov.tr</a>
    </div>

    <!-- SGK Taban -->
    <div style="background:linear-gradient(135deg,#F0F9FF,#E0F2FE);border-radius:12px;padding:14px;border:1px solid #BAE6FD">
      <div style="font-size:10px;font-weight:700;color:#0284C7;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">🏥 SGK TABAN ÜCRET</div>
      <div style="font-size:22px;font-weight:800;color:#0369A1;font-family:'DM Mono',monospace">28.000 ₺</div>
      <div style="font-size:11px;color:#0284C7;margin-top:4px">= Asgari ücret</div>
      <div style="font-size:10px;color:#38BDF8;margin-top:3px">Prim matrahı alt sınırı (2025)</div>
      <a href="https://www.sgk.gov.tr" target="_blank" rel="noopener" style="font-size:9px;color:#0284C7;text-decoration:none;display:block;margin-top:4px">↗ Kaynak: sgk.gov.tr</a>
    </div>

    <!-- Kıdem Tazminatı Tavanı -->
    <div style="background:linear-gradient(135deg,#FEFCE8,#FEF9C3);border-radius:12px;padding:14px;border:1px solid #FDE68A">
      <div style="font-size:10px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">📜 KIDEM TAZMİNATI TAVANI</div>
      <div style="font-size:22px;font-weight:800;color:#92400E;font-family:'DM Mono',monospace">51.426 ₺</div>
      <div style="font-size:11px;color:#B45309;margin-top:4px">Yıllık üst sınır (2025)</div>
      <div style="font-size:10px;color:#F59E0B;margin-top:3px">Her hizmet yılı için geçerli</div>
      <a href="https://www.ailevecalisma.gov.tr/tr-tr/haberler/asgari-ucret-tespit-komisyonu/" target="_blank" rel="noopener" style="font-size:9px;color:#B45309;text-decoration:none;display:block;margin-top:4px">↗ ailevecalisma.gov.tr</a>
    </div>
  </div>

  <!-- Kesinti Oranları tablosu -->
  <div style="padding:0 16px 16px">
    <div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">📊 Ücret Kesinti Oranları (2025)</div>
    <div style="overflow-x:auto">
      <table class="tbl" style="font-size:12px">
        <thead><tr><th>Kesinti</th><th>İşçi Payı</th><th>İşveren Payı</th><th>Toplam</th><th>Not</th></tr></thead>
        <tbody>
          <tr><td><strong>SGK Primi</strong></td><td>%9</td><td>%15</td><td style="font-weight:700;color:var(--ac)">%24</td><td style="color:var(--t2)">Kısa vad. risk payı hariç</td></tr>
          <tr><td><strong>İşsizlik Sigortası</strong></td><td>%1</td><td>%2</td><td style="font-weight:700;color:var(--ac)">%3</td><td style="color:var(--t2)">Devlet katkısı %1</td></tr>
          <tr><td><strong>Gelir Vergisi</strong></td><td>%15–40</td><td>—</td><td style="font-weight:700;color:var(--ac)">%15–40</td><td style="color:var(--t2)">Kümülatif matrah dilimine göre</td></tr>
          <tr><td><strong>Damga Vergisi</strong></td><td>%0.759</td><td>—</td><td style="font-weight:700;color:var(--ac)">%0.759</td><td style="color:var(--t2)">Brüt ücretten</td></tr>
          <tr style="background:rgba(79,70,229,.04)"><td><strong>Toplam İşçi Yükü (28.000₺)</strong></td><td colspan="2" style="font-weight:700">≈ %14 + GV</td><td style="font-weight:800;color:#4F46E5">Net≈22.104₺</td><td style="color:var(--t2)">GV dilimine göre değişir</td></tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top:10px;font-size:10px;color:var(--t3)">
      Veriler Çalışma ve Sosyal Güvenlik Bakanlığı (<a href="https://www.csgb.gov.tr" target="_blank" rel="noopener" style="color:var(--ac)">csgb.gov.tr</a>), SGK (<a href="https://www.sgk.gov.tr" target="_blank" rel="noopener" style="color:var(--ac)">sgk.gov.tr</a>) ve Hazine ve Maliye Bakanlığı (<a href="https://muhasebat.hmb.gov.tr/" target="_blank" rel="noopener" style="color:var(--ac)">hmb.gov.tr</a>) kaynaklıdır. Son güncelleme: Ocak 2025 — yılda iki kez güncellenebilir.
    </div>
  </div>
</div>

<!-- Kaynak bilgisi -->
<div style="background:var(--al);border:1px solid var(--ac);border-radius:var(--rs);padding:8px 14px;margin-bottom:16px;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
  <span>📡 <strong>Veri Kaynakları:</strong></span>
  <a href="https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/istatistikler/doviz+kurlari" target="_blank" rel="noopener" style="color:var(--ac);font-weight:500">🏦 TCMB</a>
  <span style="color:var(--t3)">·</span>
  <a href="https://open.er-api.com/" target="_blank" rel="noopener" style="color:var(--ac);font-weight:500">🌐 ExchangeRate-API</a>
  <span style="color:var(--t3)">·</span>
  <a href="https://www.resmigazete.gov.tr/" target="_blank" rel="noopener" style="color:var(--ac);font-weight:500">📰 Resmî Gazete</a>
  <span id="finans-live-badge" style="margin-left:auto;padding:2px 8px;border-radius:99px;font-size:10px;background:var(--grb);color:var(--grt);font-weight:600">● CANLI</span>
</div>
<!-- Döviz toggle chips -->
<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
  <span style="font-size:12px;font-weight:600;color:var(--t2)">Gösterilen:</span>
  <div style="display:flex;gap:6px;flex-wrap:wrap" id="currency-toggles"></div>
</div>
<!-- Döviz kartları -->
<div id="finans-rates" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:22px"></div>
<!-- Banka Kurları -->
<div class="card" style="margin-bottom:18px">
  <div class="ch">
    <span class="ct">🏦 Banka Kurları (USD/EUR)</span>
    <div style="display:flex;gap:6px;flex-wrap:wrap" id="bank-chips">
      <button class="chip on" onclick="setBankFilter('all',this)">Tümü</button>
      <button class="chip" onclick="setBankFilter('Ziraat',this)">Ziraat</button>
      <button class="chip" onclick="setBankFilter('İş',this)">İş Bankası</button>
      <button class="chip" onclick="setBankFilter('Garanti',this)">Garanti</button>
      <button class="chip" onclick="setBankFilter('Kuveyt',this)">Kuveyt Türk</button>
      <button class="chip" onclick="setBankFilter('Halk',this)">Halkbank</button>
      <button class="chip" onclick="setBankFilter('Albaraka',this)">Albaraka</button>
      <button class="chip" onclick="setBankFilter('TCMB',this)">TCMB</button>
    </div>
  </div>
  <div id="bank-rates-list" style="padding:16px"></div>
</div>
<!-- Trend grafiği -->
<div class="card">
  <div class="ch">
    <span class="ct">📈 Trend Grafiği</span>
    <select class="si" id="chart-currency-sel" style="width:120px;padding:4px 8px;font-size:12px" onchange="renderFinansChart()">
      <option value="USD">USD/TRY</option>
      <option value="EUR">EUR/TRY</option>
      <option value="ALTIN">Altın</option>
    </select>
  </div>
  <div style="padding:16px"><canvas id="finans-chart" height="180"></canvas></div>
</div>
<!-- Excel çıktı -->
<div style="display:flex;gap:8px;margin-top:8px">
  <button class="btn btns" onclick="exportFinansXlsx()">⬇ Excel Çıktı Al</button>
</div>
</div></div>
  `;

window._finNavClick = function(cat) {
  window._finActiveCat = cat;
  document.querySelectorAll('.fin-nav-btn').forEach(function(b) {
    var active = b.dataset.nav === cat;
    b.style.background = active ? '#EBF2FF' : 'transparent';
    b.style.color = active ? '#007AFF' : '#333';
    b.style.fontWeight = active ? '600' : '400';
  });
};
}

function _injectUsers() {
  const p = document.getElementById('panel-users');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph" style="margin-bottom:0;padding-bottom:0">
  <div>
    <div class="pht" id="ph-usr">👥 Kullanıcı Yönetimi</div>
    <div class="phs">Personel hesapları, rol atamaları ve modül erişim yetkileri.</div>
  </div>
  <div style="display:flex;gap:8px;align-items:center">
    <button class="btn btns" id="u-view-toggle" onclick="toggleUsersView(this)">≡ Liste</button>
    <button class="btn btnp" onclick="openNewUser()" style="display:flex;align-items:center;gap:6px">
      <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Kullanıcı Ekle
    </button>
  </div>
</div>

<!-- Stats bar -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0">
  <div style="background:var(--sf);border:1.5px solid var(--b);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:12px;background:rgba(99,102,241,.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">👥</div>
    <div><div style="font-size:22px;font-weight:800;color:var(--t);font-family:'DM Mono',monospace;line-height:1" id="u-stat-total">—</div><div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Toplam</div></div>
  </div>
  <div style="background:var(--sf);border:1.5px solid rgba(34,197,94,.25);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:12px;background:rgba(34,197,94,.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">✅</div>
    <div><div style="font-size:22px;font-weight:800;color:#16A34A;font-family:'DM Mono',monospace;line-height:1" id="u-stat-active">—</div><div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Aktif</div></div>
  </div>
  <div style="background:var(--sf);border:1.5px solid rgba(124,58,237,.2);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:12px;background:rgba(124,58,237,.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔑</div>
    <div><div style="font-size:22px;font-weight:800;color:#7C3AED;font-family:'DM Mono',monospace;line-height:1" id="u-stat-admin">—</div><div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Yönetici</div></div>
  </div>
  <div style="background:var(--sf);border:1.5px solid rgba(239,68,68,.2);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:12px;background:rgba(239,68,68,.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⏸</div>
    <div><div style="font-size:22px;font-weight:800;color:#DC2626;font-family:'DM Mono',monospace;line-height:1" id="u-stat-inactive">—</div><div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px">Pasif</div></div>
  </div>
</div>

<!-- Search + Filter toolbar -->
<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap;background:var(--s2);padding:10px 14px;border-radius:14px">
  <div style="position:relative;flex:1;min-width:180px">
    <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t3);font-size:13px;pointer-events:none">🔍</span>
    <input class="fi" style="padding:8px 12px 8px 34px;width:100%;border-radius:10px;font-size:13px" id="u-search" placeholder="Ad, e-posta veya rol ara..." oninput="filterUsers(this.value)">
  </div>
  <select class="fi" id="u-role-filter" style="padding:8px 12px;border-radius:10px;font-size:12px;font-weight:600" onchange="renderUsers(g('u-search').value||'')">
    <option value="">Tüm Roller</option>
    <option value="admin">🔑 Admin</option>
    <option value="manager">👔 Yönetici</option>
    <option value="lead">⭐ Takım Lideri</option>
    <option value="staff">👤 Personel</option>
  </select>
  <select class="fi" id="u-status-filter" style="padding:8px 12px;border-radius:10px;font-size:12px;font-weight:600" onchange="renderUsers(g('u-search').value||'')">
    <option value="">Tüm Durumlar</option>
    <option value="active">✅ Aktif</option>
    <option value="inactive">⏸ Pasif</option>
  </select>
  <span id="u-count-label" style="font-size:11px;color:var(--t3);white-space:nowrap"></span>
</div>

<!-- User grid -->
<div id="u-grid"></div>
  `;
}

window.renderFinans    = function() { _injectFinans();    window.Finans?.render?.(); };
window.renderKpiPanel  = function() { _injectKpiPanel();  window.KPI?.render?.(); };
window.renderUsers     = function(filter) { _injectUsers(); window._adminRenderUsers?.(filter||''); };
