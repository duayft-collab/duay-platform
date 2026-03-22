
// ── Soft Delete Helper (Anayasa Kural 08) ───────────────────────
function _softDel(data, id, label) {
  if (!window.Auth?.getCU?.()?.role !== 'admin' && window.Auth?.getCU?.()?.role !== 'admin') {
    window.toast?.('Silme işlemi yalnızca yöneticiler yapabilir.','err');
    return false;
  }
  if (!confirm(`"${label || id}" silinsin mi?`)) return false;
  const item = data.find(x => x.id === id);
  if (!item) return false;
  item.isDeleted = true;
  item.deletedAt = new Date().toISOString().slice(0,19).replace('T',' ');
  item.deletedBy = window.Auth?.getCU?.()?.id;
  window.logActivity?.('delete', `Silindi: ${label || id}`);
  return true;
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

const _gst  = id  => document.getElementById(id);
const _stst = (id,v) => { const el = _gst(id); if (el) el.textContent = v; };
const _p2st = n   => String(n).padStart(2,'0');
const _nowTsst = () => { const n=new Date(); return `${n.getFullYear()}-${_p2st(n.getMonth()+1)}-${_p2st(n.getDate())} ${_p2st(n.getHours())}:${_p2st(n.getMinutes())}:${_p2st(n.getSeconds())}`; };
const _isAdminSt = () => window.Auth?.getCU?.()?.role === 'admin';
const _CUst      = () => window.Auth?.getCU?.();

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
    else d.unshift({ id: Date.now(), ...entry });
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
  if (!confirm('Bu evrakı silmek istediğinizden emin misiniz?')) return;
  if (typeof storeEvrak === 'function') storeEvrak((typeof loadEvrak==='function'?loadEvrak():[]).filter(x=>x.id!==id));
  renderEvrak();
  window.toast?.('Silindi', 'ok');
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
  else d.push({id:Date.now(),...entry});
  if (typeof storeDolaplar==='function') storeDolaplar(d);
  window.closeMo?.('mo-dolap'); renderArsiv(); window.toast?.('Kaydedildi ✓','ok');
}

function delDolap(id) {
  if (!_isAdminSt()||!confirm('Bu dolabı silmek istediğinizden emin misiniz?')) return;
  if (typeof storeDolaplar==='function') storeDolaplar((typeof loadDolaplar==='function'?loadDolaplar():[]).filter(x=>x.id!==id));
  renderArsiv(); window.toast?.('Silindi','ok');
}

function delArsivBelge(id) {
  if (!_isAdminSt()||!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;
  if (typeof storeArsivBelgeler==='function') storeArsivBelgeler((typeof loadArsivBelgeler==='function'?loadArsivBelgeler():[]).filter(x=>x.id!==id));
  renderArsiv(); window.toast?.('Silindi','ok');
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
      <td><div style="font-weight:500;font-size:13px">${r.konu||'—'}</div>${r.not?`<div style="font-size:10px;color:var(--t3)">${r.not.slice(0,60)}</div>`:''}</td>
      <td style="font-size:12px;color:var(--t2)">${r.taraf||'—'}</td>
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
  if(eid){const ex=d.find(x=>x.id===eid);if(ex)Object.assign(ex,entry);}else d.unshift({id:Date.now(),...entry});
  if(typeof storeResmi==='function')storeResmi(d);
  window.closeMo?.('mo-resmi');renderResmi();window.toast?.(eid?'Güncellendi ✓':'Evrak eklendi ✓','ok');
}

function delResmiEvrak(id) {
  if(!_isAdminSt()||!confirm('Bu evrakı silmek istediğinizden emin misiniz?'))return;
  if(typeof storeResmi==='function')storeResmi((typeof loadResmi==='function'?loadResmi():[]).filter(x=>x.id!==id));
  renderResmi();window.toast?.('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 5 — ETKİNLİK / FUAR PANELİ
// ════════════════════════════════════════════════════════════════

function delEtkinlikItem(id){
  if(!_isAdminSt()||!confirm('Bu etkinliği silmek istediğinizden emin misiniz?'))return;
  if(typeof storeEtkinlik==='function')storeEtkinlik((typeof loadEtkinlik==='function'?loadEtkinlik():[]).filter(x=>x.id!==id));
  renderEtkinlik();window.toast?.('Silindi','ok');
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 6 — ÇÖP KUTUSU PANELİ
// ════════════════════════════════════════════════════════════════

function renderTrashPanel() {
  const p = _gst('panel-trash');
  if (!p) return;
  if (!p.dataset.injected) {
    p.dataset.injected = '1';
    p.innerHTML = `
      <div class="ph">
        <div><div class="pht">🗑 Çöp Kutusu</div><div class="phs">Son 30 gün içinde silinen kayıtlar</div></div>
        <div class="ur">
          ${_isAdminSt() ? `<button class="btn btns btnd" onclick="emptyTrash()">🗑 Tümünü Temizle</button>` : ''}
        </div>
      </div>
      <div id="trash-list"></div>`;
  }
  const items = (typeof loadTrash === 'function') ? loadTrash() : [];
  const cont  = _gst('trash-list'); if (!cont) return;
  if (!items.length) {
    cont.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t2)"><div style="font-size:40px;margin-bottom:12px">🗑</div><div>Çöp kutusu boş</div></div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.slice(0,50).forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid var(--b);border-radius:var(--r);padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px';
    card.innerHTML = `
      <div style="font-size:20px">🗑</div>
      <div style="flex:1">
        <div style="font-weight:500;font-size:13px">${item.name || item.title || JSON.stringify(item).slice(0,50)}</div>
        <div style="font-size:11px;color:var(--t3)">${item.type || 'Kayıt'} · ${item.ts || ''}</div>
      </div>`;
    frag.appendChild(card);
  });
  cont.replaceChildren(frag);
}

function emptyTrash() {
  if (!_isAdminSt()) return;
  if (!confirm('Çöp kutusunu tamamen temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
  if (typeof storeTrash === 'function') storeTrash([]);
  renderTrashPanel();
  window.toast?.('Çöp kutusu temizlendi ✓', 'ok');
  window.logActivity?.('system', 'Çöp kutusu temizlendi');
}

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
  module.exports = { renderEvrak, renderArsiv, renderResmi, renderEtkinlik, renderTrashPanel };
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
  window.renderEtkinlik     = renderEtkinlik;
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
  window.openEtkinlikModal  = openEtkinlikModal;
  window.saveEtkinlik       = saveEtkinlik;
  window.delEtkinlikItem    = delEtkinlikItem;
  window.emptyTrash         = emptyTrash;
}


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
  `;
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
window.renderUsers     = function() { _injectUsers();     window.Admin?.render?.(); };
