/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/docs.js  —  v8.1.0
 * Döküman Yönetimi — V18'den adapte edildi
 * Yükleme, görüntüleme, kategori filtre, Base64 önizleme
 * ════════════════════════════════════════════════════════════════
 */
'use strict';
// closeMo → window.closeMo (app.js)

const _gd  = window.g;
const _std = (id,v) => { const el = _gd(id); if (el) el.textContent = v; };
const _isAdminD = window.isAdmin;
const _CUd      = window.CU;

// Kategori badge renkleri
const DOC_CC = { İK:'bp', Finans:'bb', Operasyon:'bg', Teknik:'ba', Hukuk:'ba', Diğer:'bgr' };
let DOC_CAT  = 'all';

// Sabit dökümanlar (demo)
function _getStaticDocs() {
  return [
    { id:'s1', name:'Onboarding Kılavuzu',      cat:'İK',        type:'PDF',  upd:'20 Şub', icon:'📘', size:'5.1 MB',  acc:'all',    desc:'Yeni başlayan personel için rehber.' },
    { id:'s2', name:'İşe Alım Süreci',           cat:'İK',        type:'DOCX', upd:'8 Mar',  icon:'📝', size:'340 KB',  acc:'all',    desc:'Yeni personel alımları prosedürü.' },
    { id:'s3', name:'Performans Değerlendirme',  cat:'İK',        type:'DOCX', upd:'28 Oca', icon:'⭐', size:'150 KB',  acc:'İK',     desc:'Yıllık performans değerlendirme formu.' },
    { id:'s4', name:'Q3 Raporu 2025',            cat:'Finans',    type:'PDF',  upd:'12 Mar', icon:'📄', size:'2.4 MB',  acc:'Finans', desc:'2025 yılı 3. çeyrek finansal raporu.' },
    { id:'s5', name:'Maaş Tablosu 2026',         cat:'Finans',    type:'XLSX', upd:'1 Mar',  icon:'📊', size:'180 KB',  acc:'Maaş',   desc:'2026 personel maaş tablosu.' },
    { id:'s6', name:'Bütçe Planı 2026',          cat:'Finans',    type:'XLSX', upd:'5 Şub',  icon:'💰', size:'420 KB',  acc:'Finans', desc:'2026 bütçe planlaması.' },
    { id:'s7', name:'Sistem Dökümanı v2',         cat:'Teknik',    type:'PDF',  upd:'15 Şub', icon:'⚙️', size:'1.8 MB',  acc:'Teknik', desc:'Altyapı teknik dökümantasyonu.' },
    { id:'s8', name:'Yazılım Erişim Kılavuzu',   cat:'Teknik',    type:'PDF',  upd:'1 Şub',  icon:'💻', size:'890 KB',  acc:'Teknik', desc:'Yazılım araçları kurulum rehberi.' },
    { id:'s9', name:'Ofis Prosedürleri',          cat:'Operasyon', type:'DOCX', upd:'10 Şub', icon:'🏢', size:'210 KB',  acc:'all',    desc:'Günlük ofis işleyişi.' },
  ];
}

function _getAllDocs() {
  const local = (typeof loadLocalDocs === 'function') ? loadLocalDocs() : [];
  return [..._getStaticDocs(), ...local];
}

function _canDoc(d) {
  const cu = _CUd();
  if (!cu) return false;
  if (_isAdminD()) return true;
  return d.acc === 'all' || (cu.access || []).includes(d.acc);
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 1 — PANEL INJECT
// ════════════════════════════════════════════════════════════════

function _injectDocsPanel() {
  const p = _gd('panel-docs');
  if (!p || p.dataset.injected) return;
  p.dataset.injected = '1';
  p.innerHTML = `
    <div class="ph">
      <div>
        <div class="pht">📁 Dökümanlar</div>
        <div class="phs">Erişim izniniz olan şirket dökümanları</div>
      </div>
      <div class="ur">
        <button class="btn btns" onclick="window._openDocComposer()" style="display:flex;align-items:center;gap:6px">✍️ Belge Oluştur</button>
        <button class="btn btnp" id="btn-doc-upload" onclick="openDocUploadModal()">↑ Döküman Yükle</button>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <input class="si" id="d-search" placeholder="🔍 Döküman ara..." oninput="renderDocs()" style="flex:1;min-width:200px;max-width:300px">
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="d-chips">
        <button class="chip on" onclick="setDocCat('all',this)">🗂 Tümü</button>
        <button class="chip"    onclick="setDocCat('İK',this)">👥 İK</button>
        <button class="chip"    onclick="setDocCat('Finans',this)">💰 Finans</button>
        <button class="chip"    onclick="setDocCat('Operasyon',this)">⚙️ Operasyon</button>
        <button class="chip"    onclick="setDocCat('Teknik',this)">💻 Teknik</button>
        <button class="chip"    onclick="setDocCat('Hukuk',this)">⚖️ Hukuk</button>
      </div>
    </div>

    <div class="docg" id="d-grid"></div>

    <!-- ── MODAL: Döküman Görüntüle ── -->
    <div class="mo" id="mo-doc-view" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:600px">
        <div class="moh">
          <span class="mot" id="mo-d-t">Döküman</span>
          <button class="mcl" onclick="closeMo('mo-doc-view')">✕</button>
        </div>
        <div class="mob" id="mo-d-b"></div>
        <div class="mof" id="mo-d-f"></div>
      </div>
    </div>

    <!-- ── MODAL: Döküman Yükle/Düzenle ── -->
    <div class="mo" id="mo-doc-upload" role="dialog" aria-modal="true">
      <div class="moc" style="max-width:520px">
        <div class="moh">
          <span class="mot" id="mo-du-title">📄 Döküman Yükle</span>
          <button class="mcl" onclick="closeMo('mo-doc-upload')">✕</button>
        </div>
        <div class="mob">
          <input type="hidden" id="du-eid">
          <div class="fg">
            <label class="fl">Döküman Adı *</label>
            <input class="fi" id="du-name" placeholder="Döküman başlığı..." maxlength="100">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fg">
              <label class="fl">Kategori</label>
              <select class="fi" id="du-cat">
                <option value="İK">👥 İK</option>
                <option value="Finans">💰 Finans</option>
                <option value="Operasyon">⚙️ Operasyon</option>
                <option value="Teknik">💻 Teknik</option>
                <option value="Hukuk">⚖️ Hukuk</option>
                <option value="Diğer">📌 Diğer</option>
              </select>
            </div>
            <div class="fg">
              <label class="fl">Erişim</label>
              <select class="fi" id="du-access">
                <option value="all">🌐 Herkes</option>
                <option value="İK">👥 İK</option>
                <option value="Finans">💰 Finans</option>
                <option value="Teknik">💻 Teknik</option>
                <option value="Maaş">🔒 Maaş</option>
                <option value="Sistem">🔒 Sistem</option>
              </select>
            </div>
          </div>
          <div class="fg">
            <label class="fl">Açıklama</label>
            <textarea class="fi" id="du-desc" rows="2" style="resize:vertical" placeholder="Döküman hakkında kısa açıklama..."></textarea>
          </div>
          <div class="fg">
            <label class="fl">Etiketler (virgülle ayır)</label>
            <input class="fi" id="du-tags" placeholder="rapor, 2026, finans...">
          </div>
          <div class="fg">
            <label class="fl">
              Dosya
              <span id="du-file-req" style="margin-left:6px;background:var(--rdb);color:var(--rdt);padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600">Zorunlu</span>
              <span id="du-file-opt" style="display:none;margin-left:6px;background:var(--grb);color:var(--grt);padding:2px 7px;border-radius:4px;font-size:10px">Opsiyonel</span>
            </label>
            <div id="du-drop-zone" style="border:2px dashed var(--bm);border-radius:var(--r);padding:20px;text-align:center;cursor:pointer;transition:border-color .2s"
                 onclick="_gd('du-file').click()"
                 ondragover="event.preventDefault();this.style.borderColor='var(--ac)'"
                 ondragleave="this.style.borderColor=''"
                 ondrop="event.preventDefault();this.style.borderColor='';if(event.dataTransfer.files[0]){_gd('du-file').files=event.dataTransfer.files;_duPreview(_gd('du-file'))}">
              <div style="font-size:28px;margin-bottom:6px">📂</div>
              <div style="font-size:13px;color:var(--t2)">Dosyayı sürükle veya tıkla</div>
              <div style="font-size:11px;color:var(--t3);margin-top:3px">Maks. 8 MB · PDF, DOCX, XLSX, PNG, JPG</div>
            </div>
            <input type="file" id="du-file" style="display:none" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp" onchange="_duPreview(this)">
            <div id="du-preview" style="margin-top:8px"></div>
          </div>
        </div>
        <div class="mof">
          <button class="btn" onclick="closeMo('mo-doc-upload')">İptal</button>
          <button class="btn btnp" id="btn-du-save" onclick="saveDocUpload()">📤 Yükle</button>
        </div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 2 — RENDER
// ════════════════════════════════════════════════════════════════

function renderDocs() {
  _injectDocsPanel();
  const grid = _gd('d-grid'); if (!grid) return;
  grid.innerHTML = '';

  const search = (_gd('d-search')?.value || '').toLowerCase();
  let docs = _getAllDocs().filter(d => _canDoc(d));
  if (DOC_CAT !== 'all') docs = docs.filter(d => d.cat === DOC_CAT);
  if (search) docs = docs.filter(d =>
    (d.name||'').toLowerCase().includes(search) ||
    (d.desc||'').toLowerCase().includes(search) ||
    (d.tags||[]).some(t => t.toLowerCase().includes(search))
  );

  if (!docs.length) {
    grid.innerHTML = `<div style="padding:48px;text-align:center;color:var(--t2);grid-column:1/-1">
      <div style="font-size:40px;margin-bottom:12px">📂</div>
      <div style="font-size:14px;font-weight:500;margin-bottom:6px">Döküman bulunamadı</div>
      <div style="font-size:12px;margin-bottom:16px">Henüz döküman yüklenmemiş veya erişim izniniz yok.</div>
      <button class="btn btnp" onclick="openDocUploadModal()">↑ İlk Dökümanı Yükle</button>
    </div>`;
    return;
  }

  const TYPE_ICONS = { PDF:'📄', DOCX:'📝', DOC:'📝', XLSX:'📊', XLS:'📊', PPTX:'📊', PPT:'📊', JPG:'🖼️', JPEG:'🖼️', PNG:'🖼️', TXT:'📃', CSV:'📊' };

  const frag = document.createDocumentFragment();
  docs.forEach(d => {
    const catCls = DOC_CC[d.cat] || 'bgr';
    const icon   = TYPE_ICONS[d.type] || '📎';
    const isLocal = typeof d.id === 'number';
    const canEdit = isLocal && (_isAdminD() || d.uid === _CUd()?.id);

    const card = document.createElement('div');
    card.className = 'dc';
    card.style.cssText = 'cursor:pointer;position:relative;overflow:hidden;transition:all .2s';
    card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = 'var(--shm)'; };
    card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = ''; };
    card.onclick = () => viewDoc(d);
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
        <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--s2);flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.name}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:2px">${d.type||'—'} · ${d.size||'—'} · ${d.upd||'—'}</div>
        </div>
      </div>
      ${d.desc ? `<div style="font-size:11px;color:var(--t2);line-height:1.5;margin-bottom:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${d.desc}</div>` : ''}
      ${(d.tags||[]).length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${(d.tags||[]).slice(0,3).map(t=>`<span style="background:var(--al);color:var(--at);font-size:9px;padding:1px 6px;border-radius:99px">${t}</span>`).join('')}</div>` : ''}
      <div style="display:flex;align-items:center;gap:6px">
        <span class="badge ${catCls}" style="font-size:10px">${d.cat}</span>
        ${d.acc && d.acc !== 'all' ? `<span style="font-size:10px;color:var(--t3)">🔒 ${d.acc}</span>` : '<span style="font-size:10px;color:var(--t3)">🌐 Herkes</span>'}
        ${canEdit ? `<div style="margin-left:auto;display:flex;gap:4px" onclick="event.stopPropagation()">
          <button class="btn btns" onclick="openDocUploadModal(${d.id})" style="font-size:11px">✏️</button>
          <button class="btn btns btnd" onclick="delLocalDoc(${d.id})" style="font-size:11px">🗑</button>
        </div>` : ''}
      </div>`;
    frag.appendChild(card);
  });
  grid.replaceChildren(frag);
}

function viewDoc(d) {
  _gd('mo-d-t').textContent = d.name;
  const catCls = DOC_CC[d.cat] || 'bgr';

  const isImg = d.data?.data && /\.(jpe?g|png|gif|webp)$/i.test(d.data?.name||'');
  const isPdf = d.data?.data && /\.pdf$/i.test(d.data?.name||'');

  const previewHtml = isImg
    ? `<div style="text-align:center;margin-bottom:14px;background:var(--s2);border-radius:10px;padding:10px;overflow:hidden"><img src="${d.data.data}" style="max-width:100%;max-height:320px;border-radius:8px;object-fit:contain" alt="${d.name}"></div>`
    : isPdf
    ? `<div style="margin-bottom:14px;border-radius:10px;overflow:hidden;border:1px solid var(--b)"><iframe src="${d.data.data}" style="width:100%;height:400px;border:none"></iframe></div>`
    : '';

  _gd('mo-d-b').innerHTML = `
    ${previewHtml}
    <div style="font-size:13px;color:var(--t2);margin-bottom:14px;line-height:1.6">${d.desc || 'Açıklama yok.'}</div>
    <div class="dr"><span class="dl">Kategori</span><span class="badge ${catCls}">${d.cat}</span></div>
    <div class="dr"><span class="dl">Erişim</span><span>${d.acc === 'all' ? '🌐 Herkes' : '🔒 ' + d.acc}</span></div>
    <div class="dr"><span class="dl">Dosya Tipi</span><span>${d.type || '—'}</span></div>
    <div class="dr"><span class="dl">Boyut</span><span>${d.size || '—'}</span></div>
    <div class="dr"><span class="dl">Güncelleme</span><span>${d.upd || '—'}</span></div>
    ${(d.tags||[]).length ? `<div class="dr"><span class="dl">Etiketler</span><span>${(d.tags||[]).map(t=>`<span style="background:var(--al);color:var(--at);font-size:10px;padding:1px 7px;border-radius:99px;margin-right:4px">${t}</span>`).join('')}</span></div>` : ''}
  `;

  _gd('mo-d-f').innerHTML = `
    ${d.data?.data ? `<a href="${d.data.data}" download="${d.data.name || d.name}" class="btn btnp" style="text-decoration:none">⬇ İndir</a>` : ''}
    <button class="btn" onclick="closeMo('mo-doc-view')">Kapat</button>
  `;

  window.logActivity?.('doc', `"${d.name}" dökümanını görüntüledi`);
  window.openMo?.('mo-doc-view');
}

function setDocCat(cat, btn) {
  DOC_CAT = cat;
  document.querySelectorAll('#d-chips .chip').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderDocs();
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 3 — DÖKÜMAN YÜKLEME
// ════════════════════════════════════════════════════════════════

function openDocUploadModal(editId) {
  _injectDocsPanel();
  ['du-name','du-desc','du-tags'].forEach(id => { const el = _gd(id); if (el) el.value = ''; });
  const fi = _gd('du-file'); if (fi) fi.value = '';
  const prev = _gd('du-preview'); if (prev) prev.innerHTML = '';
  _gd('du-eid').value = editId || '';

  if (editId) {
    const doc = (typeof loadLocalDocs === 'function' ? loadLocalDocs() : []).find(x => x.id === editId);
    if (!doc) { window.toast?.('Döküman bulunamadı', 'err'); return; }
    if (_gd('du-name'))    _gd('du-name').value    = doc.name || '';
    if (_gd('du-desc'))    _gd('du-desc').value    = doc.desc || '';
    if (_gd('du-cat'))     _gd('du-cat').value     = doc.cat  || 'İK';
    if (_gd('du-access'))  _gd('du-access').value  = doc.acc  || 'all';
    if (_gd('du-tags'))    _gd('du-tags').value    = (doc.tags||[]).join(', ');
    const reqEl = _gd('du-file-req'); const optEl = _gd('du-file-opt');
    if (reqEl) reqEl.style.display = 'none';
    if (optEl) optEl.style.display = 'inline';
    const btnSave = _gd('btn-du-save'); if (btnSave) btnSave.textContent = '💾 Güncelle';
    const titleEl = _gd('mo-du-title'); if (titleEl) titleEl.textContent = '✏️ Döküman Düzenle';
  } else {
    if (_gd('du-cat'))    _gd('du-cat').value    = 'İK';
    if (_gd('du-access')) _gd('du-access').value = 'all';
    const reqEl = _gd('du-file-req'); const optEl = _gd('du-file-opt');
    if (reqEl) reqEl.style.display = 'inline';
    if (optEl) optEl.style.display = 'none';
    const btnSave = _gd('btn-du-save'); if (btnSave) btnSave.textContent = '📤 Yükle';
    const titleEl = _gd('mo-du-title'); if (titleEl) titleEl.textContent = '📄 Döküman Yükle';
  }
  window.openMo?.('mo-doc-upload');
}

function _duPreview(input) {
  const prev = _gd('du-preview'); if (!prev) return;
  const dz = _gd('du-drop-zone');
  if (input.files && input.files[0]) {
    const f = input.files[0];
    const sizeStr = Math.round(f.size / 1024) + ' KB';
    prev.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--grb);border-radius:8px">
      <span style="font-size:18px">📎</span>
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--grt)">${f.name}</div>
        <div style="font-size:11px;color:var(--grt);opacity:.8">${sizeStr}</div>
      </div>
    </div>`;
    if (dz) dz.style.borderColor = 'var(--gr)';
  } else {
    prev.innerHTML = '';
    if (dz) dz.style.borderColor = '';
  }
}

function saveDocUpload() {
  const name = (_gd('du-name')?.value || '').trim();
  if (!name) { window.toast?.('Döküman adı zorunludur', 'err'); return; }
  const fi  = _gd('du-file');
  const eid = parseInt(_gd('du-eid')?.value || '0');
  const tags = (_gd('du-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
  const cat  = _gd('du-cat')?.value    || 'İK';
  const acc  = _gd('du-access')?.value || 'all';
  const desc = _gd('du-desc')?.value   || '';
  const cu   = _CUd();

  const saveBtn = _gd('btn-du-save');
  const origText = saveBtn?.textContent;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Kaydediliyor...'; }
  const resetBtn = () => { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = origText || '📤 Yükle'; } };

  const doSave = (fileData) => {
    const d = (typeof loadLocalDocs === 'function') ? loadLocalDocs() : [];
    const nowTsFn = () => (window.nowTs ? window.nowTs().slice(0,10) : new Date().toISOString().slice(0,10));

    if (eid) {
      const idx = d.findIndex(x => x.id === eid);
      if (idx === -1) { window.toast?.('Döküman bulunamadı', 'err'); resetBtn(); return; }
      d[idx] = { ...d[idx], name, cat, acc, desc, tags, upd: nowTsFn() };
      if (fileData) { d[idx].data = fileData; d[idx].type = fileData.name.split('.').pop().toUpperCase(); d[idx].size = fileData.sizeStr; }
      if (typeof storeLocalDocs === 'function') storeLocalDocs(d);
      window.closeMo?.('mo-doc-upload');
      renderDocs();
      window.toast?.(name + ' güncellendi ✓', 'ok');
      window.logActivity?.('doc', `"${name}" dökümanını güncelledi`);
    } else {
      if (!fileData) { window.toast?.('Dosya seçiniz', 'err'); resetBtn(); return; }
      const newDoc = {
        id: generateNumericId(), name, cat, acc, desc, tags,
        type:  fileData.name.split('.').pop().toUpperCase(),
        size:  fileData.sizeStr,
        upd:   nowTsFn(),
        uid:   cu?.id, uname: cu?.name, icon: '📄',
        data:  { name: fileData.name, type: fileData.type, data: fileData.dataUrl, sizeStr: fileData.sizeStr },
      };
      d.unshift(newDoc);
      if (typeof storeLocalDocs === 'function') storeLocalDocs(d);
      window.closeMo?.('mo-doc-upload');
      renderDocs();
      window.toast?.(name + ' yüklendi ✓', 'ok');
      window.logActivity?.('doc', `"${name}" dökümanını yükledi (${fileData.sizeStr})`);
    }
    resetBtn();
  };

  if (fi?.files?.[0]) {
    const file = fi.files[0];
    if (file.size > 8 * 1024 * 1024) { window.toast?.('Dosya 8MB\'dan küçük olmalıdır', 'err'); resetBtn(); return; }
    const reader = new FileReader();
    reader.onload  = ev => doSave({ name: file.name, type: file.type, dataUrl: ev.target.result, sizeStr: Math.round(file.size/1024) + ' KB' });
    reader.onerror = () => { window.toast?.('Dosya okunamadı', 'err'); resetBtn(); };
    reader.readAsDataURL(file);
  } else {
    doSave(null);
    resetBtn();
  }
}

function delLocalDoc(id) {
  const d = (typeof loadLocalDocs === 'function') ? loadLocalDocs() : [];
  const doc = d.find(x => x.id === id);
  if (!doc) return;
  if (!_isAdminD() && doc.uid !== _CUd()?.id) { window.toast?.('Sadece yükleyen veya admin silebilir', 'err'); return; }
  window.confirmModal(`"${doc.name}" kalıcı olarak silinsin mi?`, {
    title: 'Doküman Sil',
    danger: true,
    confirmText: 'Evet, Sil',
    onConfirm: () => {
      if (typeof storeLocalDocs === 'function') storeLocalDocs(d.filter(x => x.id !== id));
      renderDocs();
      window.logActivity?.('doc', `"${doc.name}" dökümanını sildi`);
      window.toast?.(doc.name + ' silindi', 'ok');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BÖLÜM 4 — AI BELGE OLUŞTURUCU
// ════════════════════════════════════════════════════════════════

window._openDocComposer = function() {
  _injectDocsPanel();
  if (_gd('mo-doc-composer')) { _gd('mo-doc-composer').remove(); }
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-doc-composer';
  var turOpts = [['resmi-yazi','Resmi Yazı'],['dilekce','Dilekçe'],['talimat','Talimat'],['sozlesme','Sözleşme Taslağı'],['rapor','Rapor'],['ihtar','İhtar / Uyarı'],['referans','Referans Mektubu'],['serbest','Serbest Metin']];
  var tonOpts = [['resmi','Resmi'],['nazik','Nazik'],['sert','Sert'],['bilgilendirici','Bilgilendirici'],['ikna-edici','İkna Edici']];
  mo.innerHTML = '<div class="moc" style="max-width:800px;width:95vw;padding:0;border-radius:14px;overflow:hidden">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600;color:var(--t)">✍️ AI Belge Oluşturucu</div><button onclick="document.getElementById(\'mo-doc-composer\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">x</button></div>'
    + '<div style="padding:20px">'
    // Step 1
    + '<div id="dca-step1">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
    + '<div><div class="fl">Belge Türü *</div><select class="fi" id="dca-tur">' + turOpts.map(function(o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></div>'
    + '<div><div class="fl">Antetli Kağıt</div><select class="fi" id="dca-antet"><option value="antetli">Antetli (Logo + Firma)</option><option value="antsiz">Antetsiz (Sade)</option></select></div>'
    + '<div><div class="fl">Tarih</div><input class="fi" type="date" id="dca-tarih" value="' + new Date().toISOString().slice(0, 10) + '"></div>'
    + '<div><div class="fl">Konu *</div><input class="fi" id="dca-konu" placeholder="Belge konusu..." maxlength="150"></div>'
    + '<div style="grid-column:1/-1"><div class="fl">Alıcı / Muhatap</div><input class="fi" id="dca-alici" placeholder="Kişi, kurum veya departman adı..."></div>'
    + '</div>'
    + '<div style="margin-bottom:12px"><div class="fl">Talimat / İçerik Özeti *</div><textarea class="fi" id="dca-talimat" rows="4" style="resize:vertical" placeholder="AI\'ye ne yazmasını istediğinizi anlatın..."></textarea></div>'
    + '<div style="margin-bottom:16px"><div class="fl">Ton</div><div style="display:flex;gap:8px;flex-wrap:wrap" id="dca-ton-btns">' + tonOpts.map(function(o, i) { return '<button onclick="window._dcaTon(\'' + o[0] + '\',this)" class="odm-chip' + (i === 0 ? ' odm-chip-active' : '') + '" data-ton="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>'
    + '<div style="display:flex;justify-content:flex-end"><button class="btn btnp" onclick="window._dcaGenerate()" id="dca-gen-btn" style="min-width:160px">🤖 AI ile Oluştur</button></div>'
    + '</div>'
    // Step 2
    + '<div id="dca-step2" style="display:none"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:13px;font-weight:600">3 AI Taslağı</div><button class="btn btns" onclick="window._dcaBack()">← Geri</button></div><div id="dca-results"></div></div>'
    // Step 3
    + '<div id="dca-step3" style="display:none"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:13px;font-weight:600">Belgeyi Düzenle</div><button class="btn btns" onclick="window._dcaBackToResults()">← Taslaklar</button></div><div style="border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:14px"><div id="dca-preview-doc" style="background:#fff;padding:40px;min-height:400px;font-family:Arial,sans-serif;font-size:13px;line-height:1.8;color:#1a1a1a" contenteditable="true"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btnp" onclick="window._dcaDownloadPDF()">PDF İndir</button><button class="btn btns" onclick="window._dcaDownloadWord()">Word İndir</button><button class="btn btns" onclick="window._dcaSaveToDocs()">Kaydet</button></div></div>'
    + '</div></div>';
  document.body.appendChild(mo);
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._dcaTon = function(val, btn) { document.querySelectorAll('#dca-ton-btns .odm-chip').forEach(function(b) { b.classList.remove('odm-chip-active'); }); if (btn) btn.classList.add('odm-chip-active'); };
window._dcaBack = function() { [1,2,3].forEach(function(i) { var el = document.getElementById('dca-step' + i); if (el) el.style.display = i === 1 ? '' : 'none'; }); };
window._dcaBackToResults = function() { [1,2,3].forEach(function(i) { var el = document.getElementById('dca-step' + i); if (el) el.style.display = i === 2 ? '' : 'none'; }); };

window._dcaGenerate = async function() {
  var konu = (document.getElementById('dca-konu')?.value || '').trim();
  var talimat = (document.getElementById('dca-talimat')?.value || '').trim();
  if (!konu || !talimat) { window.toast?.('Konu ve talimat zorunludur', 'err'); return; }
  var tur = document.getElementById('dca-tur')?.value || 'resmi-yazi';
  var alici = document.getElementById('dca-alici')?.value || '';
  var tarih = document.getElementById('dca-tarih')?.value || new Date().toISOString().slice(0, 10);
  var ton = (document.querySelector('#dca-ton-btns .odm-chip-active') || {}).dataset?.ton || 'resmi';
  var antet = document.getElementById('dca-antet')?.value || 'antetli';
  var btn = document.getElementById('dca-gen-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Oluşturuluyor...'; }
  var prompt = 'Sen bir profesyonel belge yazarısın. Aşağıdaki bilgilere göre bir ' + tur + ' yaz.\n\nTarih: ' + tarih + '\nKonu: ' + konu + (alici ? '\nMuhatap: ' + alici : '') + '\nTon: ' + ton + '\nTalimat: ' + talimat + '\n\nKURALLAR:\n- Türkçe yaz\n- Düz metin, markdown kullanma\n- Sadece belge metnini yaz\n- Profesyonel ol\n- Boş alanları [...] ile bırak';
  var results = document.getElementById('dca-results');
  if (results) results.innerHTML = '<div style="text-align:center;padding:32px;color:var(--t2)">⏳ AI yazıyor...</div>';
  [1,2,3].forEach(function(i) { var el = document.getElementById('dca-step' + i); if (el) el.style.display = i === 2 ? '' : 'none'; });
  var styles = [
    { isim: 'Kurumsal', emoji: '🔵', extra: 'Çok resmi, kurumsal ve net bir dil kullan.' },
    { isim: 'Samimi', emoji: '🟣', extra: 'Resmi ama biraz daha samimi ve akıcı bir dil kullan.' },
    { isim: 'Özlü', emoji: '🟢', extra: 'Kısa, öz ve doğrudan bir dil kullan.' },
  ];
  var drafts = [];
  for (var si = 0; si < styles.length; si++) {
    var s = styles[si];
    try {
      var res = await fetch('/api/ai-doc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, style: s.extra }) });
      if (res.ok) { var data = await res.json(); drafts.push({ isim: s.isim, emoji: s.emoji, text: data.text || data.content || 'Yanıt alınamadı' }); }
      else { drafts.push({ isim: s.isim, emoji: s.emoji, text: _dcaLocalGenerate(prompt, s.extra) }); }
    } catch (e) { drafts.push({ isim: s.isim, emoji: s.emoji, text: _dcaLocalGenerate(prompt, s.extra) }); }
  }
  if (btn) { btn.disabled = false; btn.textContent = '🤖 AI ile Oluştur'; }
  window._dcaDrafts = drafts;
  window._dcaParams = { tur: tur, konu: konu, alici: alici, tarih: tarih, antet: antet };
  if (results) {
    results.innerHTML = drafts.map(function(d, i) {
      return '<div style="border:1px solid var(--b);border-radius:10px;overflow:hidden;margin-bottom:12px"><div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--s2);border-bottom:1px solid var(--b)"><div style="font-size:12px;font-weight:600">' + d.emoji + ' ' + d.isim + '</div><button class="btn btnp" onclick="window._dcaSelectDraft(' + i + ')" style="font-size:11px">Bu Taslağı Seç →</button></div><div style="padding:16px;font-size:12px;line-height:1.8;white-space:pre-wrap;max-height:200px;overflow-y:auto;color:var(--t)">' + d.text + '</div></div>';
    }).join('');
  }
};

function _dcaLocalGenerate(prompt, style) {
  var konu = (document.getElementById('dca-konu')?.value || '').trim();
  var alici = document.getElementById('dca-alici')?.value || 'İlgili Makam';
  var tarih = document.getElementById('dca-tarih')?.value || new Date().toISOString().slice(0, 10);
  var talimat = (document.getElementById('dca-talimat')?.value || '').trim();
  return 'Tarih: ' + tarih + '\n\nSayın ' + alici + ',\n\nKonu: ' + konu + '\n\n' + talimat + '\n\nBilgilerinize arz ederim.\n\nSaygılarımla,\n[Ad Soyad]\n[Unvan]\nDuay Global LLC';
}

window._dcaSelectDraft = function(i) {
  var draft = (window._dcaDrafts || [])[i]; if (!draft) return;
  var p = window._dcaParams || {};
  var preview = document.getElementById('dca-preview-doc'); if (!preview) return;
  var antetHtml = p.antet === 'antetli'
    ? '<div style="border-bottom:2px solid #0C447C;padding-bottom:16px;margin-bottom:24px"><div style="font-size:18px;font-weight:700;color:#0C447C">DUAY GLOBAL LLC</div><div style="font-size:11px;color:#555">Tarih: ' + (p.tarih || '') + '</div><div style="font-size:11px;color:#555">Konu: ' + (p.konu || '') + '</div>' + (p.alici ? '<div style="font-size:11px;color:#555">Sayın: ' + p.alici + '</div>' : '') + '</div>'
    : '<div style="text-align:right;margin-bottom:20px;font-size:11px;color:#555"><div>Tarih: ' + (p.tarih || '') + '</div>' + (p.konu ? '<div>Konu: ' + p.konu + '</div>' : '') + '</div>';
  preview.innerHTML = antetHtml + '<div style="white-space:pre-wrap">' + draft.text + '</div><div style="margin-top:40px"><div style="font-size:12px">Saygılarımla,</div><div style="margin-top:24px;font-size:12px">[Ad Soyad]</div><div style="font-size:11px;color:#777">[Unvan]</div></div>';
  [1,2,3].forEach(function(n) { var el = document.getElementById('dca-step' + n); if (el) el.style.display = n === 3 ? '' : 'none'; });
};

window._dcaDownloadPDF = function() {
  var preview = document.getElementById('dca-preview-doc'); if (!preview) return;
  var win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Belge</title><style>body{font-family:Arial,sans-serif;font-size:13px;line-height:1.8;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}@media print{body{padding:20px}}</style></head><body>' + preview.innerHTML + '</body></html>');
  win.document.close(); setTimeout(function() { win.print(); }, 500);
};

window._dcaDownloadWord = function() {
  var preview = document.getElementById('dca-preview-doc'); if (!preview) return;
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:13pt;line-height:1.8}</style></head><body>' + preview.innerHTML + '</body></html>';
  var blob = new Blob([html], { type: 'application/msword' }); var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'belge_' + new Date().toISOString().slice(0, 10) + '.doc'; a.click(); URL.revokeObjectURL(url);
};

window._dcaSaveToDocs = function() {
  var preview = document.getElementById('dca-preview-doc');
  var konu = document.getElementById('dca-konu')?.value || 'AI Belgesi';
  if (!preview) return;
  var html = '<html><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:13px;padding:40px}</style></head><body>' + preview.innerHTML + '</body></html>';
  var blob = new Blob([html], { type: 'text/html' });
  var reader = new FileReader();
  reader.onload = function(ev) {
    var d = (typeof loadLocalDocs === 'function') ? loadLocalDocs() : [];
    d.unshift({ id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(), name: konu, cat: 'Diger', acc: 'all', type: 'HTML', size: Math.round(blob.size / 1024) + ' KB', upd: new Date().toISOString().slice(0, 10), uid: _CUd()?.id, icon: '✍️', data: { name: konu + '.html', type: 'text/html', data: ev.target.result } });
    if (typeof storeLocalDocs === 'function') storeLocalDocs(d);
    document.getElementById('mo-doc-composer')?.remove();
    renderDocs();
    window.toast?.('Belge kaydedildi', 'ok');
  };
  reader.readAsDataURL(blob);
};

// ════════════════════════════════════════════════════════════════
// DIŞA AKTARIM
// ════════════════════════════════════════════════════════════════

const Docs = { render: renderDocs, openUpload: openDocUploadModal, save: saveDocUpload, del: delLocalDoc, view: viewDoc, setFilter: setDocCat };

if (typeof module !== 'undefined' && module.exports) { module.exports = Docs; }
else {
  window.Docs              = Docs;
  window.renderDocs        = renderDocs;
  window.openDocUploadModal = openDocUploadModal;
  window.saveDocUpload     = saveDocUpload;
  window.delLocalDoc       = delLocalDoc;
  window.setDocCat         = setDocCat;
  window._duPreview        = _duPreview;
  window.DOC_CC            = DOC_CC;
}
