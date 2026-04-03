/**
 * src/modules/pusula_render.js — v4.0.0
 * Pusula — Ana render: Sol/Sag 2 kolon layout
 * Baglanti: pusula_core.js, pusula_task.js, database.js
 * Anayasa: K01 ≤800 satir
 */

'use strict';

// ── State ────────────────────────────────────────────────────
var _pusSayfa    = 1;
var _pusAktifTab = 'tumu';
var _pusSayfaBoyut = 50;
var _pusEn3Donem   = 'bugun';
var _pusKaynaklarAcik = false;

// ── Kategori renk haritasi ───────────────────────────────────
var _CAT_COLORS = {
  'İhracat':   ['#EEEDFE','#26215C'],
  'Satınalma': ['#E6F1FB','#0C447C'],
  'Kargo':     ['#FAEEDA','#633806'],
  'Finans':    ['#EAF3DE','#27500A'],
  'Müşteri':   ['#FCE7F3','#831843'],
  'Genel':     ['#F1EFE8','#2C2C2A']
};

// ── Kaynak verileri ──────────────────────────────────────────
var _KAYNAKLAR = [
  { isim:'Stephen Covey', kitap:'7 Alışkanlık', renk:['#EEEDFE','#26215C'],
    fikir:'Önce önemliyi yap. Acil olan ile önemli olanı ayır; hayatın %80\'ini Kadran II\'de geçir.',
    soz:'Anahtar, programa öncelikleri değil, önceliklere programa vermektir.' },
  { isim:'David Allen', kitap:'Getting Things Done', renk:['#E6F1FB','#0C447C'],
    fikir:'Zihnini topla, işle, organize et, gözden geçir, yap. Açık döngüleri kapat.',
    soz:'Zihniniz fikir üretmek içindir, onları tutmak için değil.' },
  { isim:'Greg McKeown', kitap:'Essentialism', renk:['#EAF3DE','#27500A'],
    fikir:'Daha azı daha iyidir. Hayır demeyi öğren, sadece en yüksek katkıya odaklan.',
    soz:'Neredeyse her şey önemsizdir.' },
  { isim:'Mihaly Csikszentmihalyi', kitap:'Flow', renk:['#FAEEDA','#633806'],
    fikir:'Zorluk ve beceri dengede olduğunda akış haline girersin. Kesintisiz odak performansı katlar.',
    soz:'En iyi anlar, bir insanın vücudu veya zihni zor bir görevi başarmak için gönüllü olarak sınırlarına ulaştığında ortaya çıkar.' }
];

// ════════════════════════════════════════════════════════════════
// ANA RENDER
// ════════════════════════════════════════════════════════════════

function renderPusula() {
  populatePusUsers();
  setTimeout(_renderDeptSidebar, 50);

  var todayS  = new Date().toISOString().slice(0, 10);
  var allVis  = visTasks();
  var users   = loadUsers();

  // ── Gecikmiş görev kontrolü (5dk) ──────────────────────────
  var _ovKey = '_pus_ov_check';
  if (!window[_ovKey] || Date.now() - window[_ovKey] > 300000) {
    window[_ovKey] = Date.now();
    setTimeout(checkOverdueTasks, 500);
  }

  // ── Sayaçlar ───────────────────────────────────────────────
  var haftaSonu = new Date();
  haftaSonu.setDate(haftaSonu.getDate() + (7 - haftaSonu.getDay()));
  var hsS       = haftaSonu.toISOString().slice(0, 10);

  var ovCount   = allVis.filter(function(t) { return !t.done && t.status !== 'done' && t.due && t.due < todayS; }).length;
  var todayC    = allVis.filter(function(t) { return !t.done && t.status !== 'done' && t.due === todayS; }).length;
  var weekC     = allVis.filter(function(t) { return !t.done && t.status !== 'done' && t.due && t.due >= todayS && t.due <= hsS; }).length;
  var doneCount = allVis.filter(function(t) { return t.done || t.status === 'done'; }).length;
  var hiPriC    = allVis.filter(function(t) { return !t.done && t.status !== 'done' && t.pri === 1; }).length;

  updatePusBadge();

  // ── Filtreler ──────────────────────────────────────────────
  var fl = allVis.slice();

  // Tab filtresi
  if (_pusAktifTab === 'gecikmis')   fl = fl.filter(function(t) { return !t.done && t.status !== 'done' && t.due && t.due < todayS; });
  else if (_pusAktifTab === 'bugun') fl = fl.filter(function(t) { return !t.done && t.status !== 'done' && t.due === todayS; });
  else if (_pusAktifTab === 'hafta') fl = fl.filter(function(t) { return !t.done && t.status !== 'done' && t.due && t.due >= todayS && t.due <= hsS; });
  else if (_pusAktifTab === 'tamam') fl = fl.filter(function(t) { return t.done || t.status === 'done'; });

  // Toolbar filtreleri
  var fSearch = (g('pus-ara')?.value || '').toLowerCase();
  var fStatus = g('pus-durum')?.value || '';
  var fPri    = parseInt(g('pus-oncelik')?.value || '0');
  var fCat    = g('pus-kategori')?.value || '';

  if (fSearch) fl = fl.filter(function(t) {
    return t.title.toLowerCase().indexOf(fSearch) !== -1 ||
      (t.desc || '').toLowerCase().indexOf(fSearch) !== -1 ||
      (t.tags || []).some(function(tg) { return tg.toLowerCase().indexOf(fSearch) !== -1; }) ||
      (t.jobId || '').toLowerCase().indexOf(fSearch) !== -1;
  });
  if (fStatus) fl = fl.filter(function(t) { return t.status === fStatus || (fStatus === 'done' && t.done); });
  if (fPri > 0) fl = fl.filter(function(t) { return t.pri === fPri; });
  if (fCat) fl = fl.filter(function(t) { return (t.category || t.cat || 'Genel') === fCat; });

  // Sıralama: öncelik → due
  fl.sort(function(a, b) {
    if ((a.pri || 3) !== (b.pri || 3)) return (a.pri || 3) - (b.pri || 3);
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });

  // ── Panel ──────────────────────────────────────────────────
  var panel = g('panel-pusula');
  if (!panel) return;

  // ── Tam ekran modlar (kanban, kadran vb.) ──────────────────
  if (_PUS_FULL_VIEWS.indexOf(PUS_VIEW) !== -1) {
    _renderFullView(panel);
    return;
  }

  // ── Sayfalama ──────────────────────────────────────────────
  var totalPages = Math.max(1, Math.ceil(fl.length / _pusSayfaBoyut));
  if (_pusSayfa > totalPages) _pusSayfa = totalPages;
  var pageStart = (_pusSayfa - 1) * _pusSayfaBoyut;
  var pageFl    = fl.slice(pageStart, pageStart + _pusSayfaBoyut);

  // ── HTML üretimi ───────────────────────────────────────────
  var h = '';

  // ── ÜST BAR ───────────────────────────────────────────────
  var _q = _getDailyQuote();
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--b)">';
  h += '<div><div style="font-size:18px;font-weight:700;color:var(--t)">Pusula</div>';
  h += '<div style="font-style:italic;color:var(--t2);font-size:11px;margin-top:2px">"' + (window.escapeHtml?.(_q.text) || _q.text) + '" — ' + (window.escapeHtml?.(_q.author) || _q.author) + '</div></div>';
  h += '<div style="display:flex;gap:6px;align-items:center">';
  h += '<button class="btn btns" onclick="event.stopPropagation();setPusView(\'kanban\')" style="font-size:11px">Kanban</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();setPusView(\'odak\')" style="font-size:11px">Odak</button>';
  h += '<button class="btn btns" onclick="event.stopPropagation();window._pusXlsxExport?.()" style="font-size:11px">XLSX</button>';
  h += '<button class="btn btnp" onclick="event.stopPropagation();openAddTask()" style="font-size:12px">+ Görev</button>';
  h += '</div></div>';

  // ── GECİKME BANNERI ────────────────────────────────────────
  if (ovCount > 0) {
    h += '<div onclick="event.stopPropagation();window._pusSetTab(\'gecikmis\')" style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:linear-gradient(90deg,#FEF2F2,#FFF7ED);border:1px solid #FECACA;border-radius:10px;font-size:12px;color:#991B1B;cursor:pointer;margin:10px 16px 0">';
    h += '<span style="font-size:18px">⚠️</span>';
    h += '<div><strong>' + ovCount + ' gecikmiş görev</strong>';
    h += '<div style="font-size:11px;color:#B91C1C;margin-top:2px">Teslim tarihi geçmiş görevleri inceleyin</div></div>';
    h += '<span style="margin-left:auto;font-size:11px;padding:4px 12px;border-radius:6px;background:#FEE2E2;color:#991B1B;font-weight:600">Hepsini Gör</span>';
    h += '</div>';
  }

  // ── 2 KOLON LAYOUT ─────────────────────────────────────────
  var _layoutTop = 153 + (ovCount > 0 ? 57 : 0);
  h += '<div style="display:flex;gap:0;overflow:hidden;height:calc(100vh - ' + _layoutTop + 'px);min-height:400px">';

  // ══ SOL KOLON ══════════════════════════════════════════════
  h += '<div style="flex:1;overflow-y:auto;padding:12px 16px">';

  // KPI bar (6 kart)
  h += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">';
  h += _kpiKart('Toplam', allVis.length, 'var(--sf)', 'var(--t)', 'var(--b)');
  h += _kpiKart('Gecikmiş', ovCount, '#FCEBEB', '#DC2626', '#FECACA');
  h += _kpiKart('Bugün', todayC, '#FAEEDA', '#D97706', '#F5D9A0');
  h += _kpiKart('Bu Hafta', weekC, '#E6F1FB', '#185FA5', '#B4D5F7');
  h += _kpiKart('Tamamlandı', doneCount, '#EAF3DE', '#16A34A', '#C6E7B0');
  h += _kpiKart('Yüksek Öncelik', hiPriC, '#EEEDFE', '#534AB7', '#D4D0FB');
  h += '</div>';

  // Toolbar
  h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">';
  h += '<input class="fi" id="pus-ara" placeholder="Ara…" value="' + (fSearch || '') + '" style="flex:1;min-width:120px;padding:7px 10px;font-size:12px;border-radius:6px" oninput="event.stopPropagation();window._pusSayfa=1;renderPusula()" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">';
  h += '<select class="fi" id="pus-durum" style="width:110px;padding:7px 10px;font-size:12px;border-radius:6px" onchange="event.stopPropagation();window._pusSayfa=1;renderPusula()" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">';
  h += '<option value="">Tüm Durum</option><option value="todo"' + (fStatus === 'todo' ? ' selected' : '') + '>Yapılacak</option><option value="inprogress"' + (fStatus === 'inprogress' ? ' selected' : '') + '>Devam</option><option value="review"' + (fStatus === 'review' ? ' selected' : '') + '>İnceleme</option><option value="done"' + (fStatus === 'done' ? ' selected' : '') + '>Tamam</option></select>';
  h += '<select class="fi" id="pus-oncelik" style="width:100px;padding:7px 10px;font-size:12px;border-radius:6px" onchange="event.stopPropagation();window._pusSayfa=1;renderPusula()" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">';
  h += '<option value="0">Tüm Öncelik</option><option value="1"' + (fPri === 1 ? ' selected' : '') + '>Kritik</option><option value="2"' + (fPri === 2 ? ' selected' : '') + '>Önemli</option><option value="3"' + (fPri === 3 ? ' selected' : '') + '>Normal</option></select>';
  h += '<select class="fi" id="pus-kategori" style="width:110px;padding:7px 10px;font-size:12px;border-radius:6px" onchange="event.stopPropagation();window._pusSayfa=1;renderPusula()" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">';
  h += '<option value="">Tüm Kategori</option>';
  ['İhracat','Satınalma','Kargo','Finans','Müşteri','Genel'].forEach(function(c) {
    h += '<option value="' + c + '"' + (fCat === c ? ' selected' : '') + '>' + c + '</option>';
  });
  h += '</select>';

  // Toplu işlem butonları (hidden by default)
  h += '<span id="pus-bulk-actions" style="display:none;gap:6px;align-items:center">';
  h += '<span id="pus-bulk-cnt2" style="font-size:11px;color:var(--ac);font-weight:600">0</span>';
  h += '<button onclick="event.stopPropagation();window._pusBulkDelete?.()" style="padding:3px 10px;border-radius:5px;border:0.5px solid #E24B4A;background:#FCEBEB;color:#791F1F;font-size:10px;cursor:pointer;font-family:inherit">Sil</button>';
  h += '<button onclick="event.stopPropagation();window._pusBulkComplete?.()" style="padding:3px 10px;border-radius:5px;border:0.5px solid #16A34A;background:#EAF3DE;color:#15803D;font-size:10px;cursor:pointer;font-family:inherit">Tamamla</button>';
  h += '<button onclick="event.stopPropagation();window._pusBulkClear?.()" style="padding:3px 10px;border-radius:5px;border:0.5px solid var(--b);background:transparent;color:var(--t3);font-size:10px;cursor:pointer;font-family:inherit">İptal</button>';
  h += '</span>';
  h += '</div>';

  // Sekmeler
  var _tabs = [
    { id:'tumu', lbl:'Tümü (' + allVis.length + ')' },
    { id:'gecikmis', lbl:'Gecikmiş (' + ovCount + ')' },
    { id:'bugun', lbl:'Bugün (' + todayC + ')' },
    { id:'hafta', lbl:'Bu Hafta (' + weekC + ')' },
    { id:'tamam', lbl:'Tamamlandı (' + doneCount + ')' }
  ];
  h += '<div style="display:flex;gap:2px;margin-bottom:12px;border-bottom:1px solid var(--b);padding-bottom:0">';
  _tabs.forEach(function(tab) {
    var active = _pusAktifTab === tab.id;
    h += '<button onclick="event.stopPropagation();window._pusSetTab(\'' + tab.id + '\')" style="padding:6px 14px;font-size:11px;font-weight:' + (active ? '700' : '500') + ';color:' + (active ? 'var(--ac)' : 'var(--t3)') + ';background:none;border:none;border-bottom:2px solid ' + (active ? 'var(--ac)' : 'transparent') + ';cursor:pointer;font-family:inherit;transition:all .15s">' + tab.lbl + '</button>';
  });
  h += '</div>';

  // ── GÖREV LİSTESİ (öncelik gruplu) ─────────────────────────
  if (!pageFl.length) {
    h += '<div style="text-align:center;padding:48px;color:var(--t3)">';
    h += '<div style="font-size:40px;margin-bottom:12px">🎯</div>';
    h += '<div style="font-size:14px;font-weight:500">Görev bulunamadı</div>';
    h += '<div style="font-size:12px;margin-top:4px">Filtreleri değiştirin veya yeni bir görev ekleyin.</div>';
    h += '</div>';
  } else {
    var groups = {};
    pageFl.forEach(function(t) {
      var p = t.pri || 3;
      if (!groups[p]) groups[p] = [];
      groups[p].push(t);
    });
    var priLabels = { 1:'Yüksek', 2:'Orta', 3:'Düşük', 4:'Düşük' };
    var priColors = { 1:'#DC2626', 2:'#D97706', 3:'#B4B2A9', 4:'#64748B' };

    [1, 2, 3, 4].forEach(function(pri) {
      if (!groups[pri] || !groups[pri].length) return;
      var gc = priColors[pri];
      h += '<div style="display:flex;align-items:center;gap:8px;margin:10px 0 6px">';
      h += '<span style="width:8px;height:8px;border-radius:50%;background:' + gc + ';flex-shrink:0"></span>';
      h += '<span style="font-size:11px;font-weight:700;color:' + gc + '">' + priLabels[pri] + ' Öncelik — ' + groups[pri].length + ' görev</span>';
      h += '<div style="flex:1;height:1px;background:var(--b)"></div>';
      h += '</div>';

      groups[pri].forEach(function(t) {
        h += _renderTaskRow(t, todayS, users);
      });
    });
  }

  // Sayfalama
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;font-size:11px;color:var(--t3);margin-top:8px">';
  h += '<span>' + fl.length + ' görev' + (fl.length !== allVis.length ? ' / ' + allVis.length + ' toplam' : '') + '</span>';
  if (totalPages > 1) {
    h += '<div style="display:flex;gap:6px;align-items:center">';
    h += '<button onclick="event.stopPropagation();window._pusSayfa=Math.max(1,window._pusSayfa-1);renderPusula()" style="padding:4px 10px;border-radius:5px;border:1px solid var(--b);background:var(--sf);font-size:11px;cursor:pointer;font-family:inherit"' + (_pusSayfa <= 1 ? ' disabled' : '') + '>Önceki</button>';
    h += '<span>' + _pusSayfa + ' / ' + totalPages + '</span>';
    h += '<button onclick="event.stopPropagation();window._pusSayfa=Math.min(' + totalPages + ',window._pusSayfa+1);renderPusula()" style="padding:4px 10px;border-radius:5px;border:1px solid var(--b);background:var(--sf);font-size:11px;cursor:pointer;font-family:inherit"' + (_pusSayfa >= totalPages ? ' disabled' : '') + '>Sonraki</button>';
    h += '</div>';
  }
  h += '</div>';

  h += '</div>'; // sol kolon sonu

  // ══ SAĞ KOLON ══════════════════════════════════════════════
  h += '<div style="flex:0 0 260px;overflow-y:auto;padding:12px;border-left:1px solid var(--b)">';

  // BLOK 1 — En Önemli 3
  h += _renderEn3Blok(todayS);

  // BLOK 2 — Günün Sözü
  h += _renderSozBlok();

  // BLOK 3 — Kaynaklar
  h += _renderKaynaklarBlok();

  h += '</div>'; // sağ kolon sonu
  h += '</div>'; // 2 kolon layout sonu

  panel.innerHTML = h;

  // Subtask render
  pageFl.forEach(function(t) {
    var stEl = g('st-' + t.id);
    if (stEl && typeof renderSubTasks === 'function') renderSubTasks(t.id, t.subTasks || [], stEl);
  });
}

// ════════════════════════════════════════════════════════════════
// YARDIMCI RENDER FONKSİYONLARI
// ════════════════════════════════════════════════════════════════

function _kpiKart(label, val, bg, color, border) {
  return '<div style="flex:1;min-width:80px;padding:10px 12px;background:' + bg + ';border:1px solid ' + border + ';border-radius:8px;text-align:center">'
    + '<div style="font-size:20px;font-weight:700;color:' + color + '">' + val + '</div>'
    + '<div style="font-size:10px;color:' + color + ';opacity:.7">' + label + '</div></div>';
}

/** @description Tek görev satırı HTML'i */
function _renderTaskRow(t, todayS, users) {
  var p       = PRI_MAP[t.pri] || PRI_MAP[4];
  var isDone  = t.done || t.status === 'done';
  var dueChip = getDueChip(t.due, t.done, todayS);
  var catName = t.category || t.cat || 'Genel';
  var catC    = _CAT_COLORS[catName] || _CAT_COLORS['Genel'];
  var subT    = t.subTasks || [];
  var subD    = subT.filter(function(s) { return s.done; }).length;
  var cu      = _getCU();
  var canEdit = (t.uid === cu?.id || window.isAdmin?.());

  var row = '<div class="tk-row' + (isDone ? ' done-row' : '') + '" data-task-id="' + t.id + '" onclick="event.stopPropagation();openPusDetail(' + t.id + ')" style="border-left:3px solid ' + (isDone ? 'var(--b)' : p.color) + ';padding:8px 12px;margin-bottom:4px;cursor:pointer;position:relative">';

  // Checkbox (bulk)
  if (window.isAdmin?.()) {
    row += '<input type="checkbox" class="pus-row-chk" data-id="' + t.id + '" onclick="event.stopPropagation();window._pusBulkCheck2?.()" style="position:absolute;top:8px;left:6px;width:14px;height:14px;cursor:pointer;accent-color:var(--ac);z-index:10">';
  }

  // Task check
  row += '<div style="display:flex;align-items:flex-start;gap:10px' + (window.isAdmin?.() ? ';padding-left:20px' : '') + '">';
  row += '<input type="checkbox" ' + (isDone ? 'checked' : '') + ' onchange="event.stopPropagation();toggleTask(' + t.id + ',this.checked)" onclick="event.stopPropagation()" style="margin-top:3px;accent-color:' + p.color + ';cursor:pointer;flex-shrink:0">';
  row += '<div style="flex:1;min-width:0">';

  // Başlık
  row += '<div style="font-weight:500;font-size:13px;color:' + (isDone ? 'var(--t3)' : 'var(--t)') + ';text-decoration:' + (isDone ? 'line-through' : 'none') + '">';
  if (t.jobId) row += '<span style="font-size:9px;font-family:monospace;color:var(--t3);background:var(--s2);padding:1px 5px;border-radius:3px;margin-right:4px">' + t.jobId + '</span>';
  row += (t.title || '—') + '</div>';

  // Badges
  row += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
  row += dueChip;
  row += '<span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:' + catC[0] + ';color:' + catC[1] + '">' + catName + '</span>';
  if (t.module_ref) row += '<span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:#EEEDFE;color:#6366F1;font-family:monospace">' + t.module_ref + '</span>';
  row += '</div>';

  // Alt satır: due + desc
  if (t.due || t.desc) {
    row += '<div style="font-size:10px;color:var(--t3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">';
    if (t.due) row += '📅 ' + t.due + ' ';
    if (t.desc) {
      var plainDesc = (t.desc || '').replace(/<[^>]*>/g, '').slice(0, 60);
      row += plainDesc;
    }
    row += '</div>';
  }

  // Alt görev bar
  if (subT.length) {
    var subPct = Math.round(subD / subT.length * 100);
    row += '<div style="display:flex;align-items:center;gap:6px;margin-top:4px">';
    row += '<div style="flex:1;height:3px;background:var(--s2);border-radius:2px;max-width:80px"><div style="height:100%;width:' + subPct + '%;background:var(--ac);border-radius:2px"></div></div>';
    row += '<span style="font-size:10px;color:var(--t3)">' + subD + '/' + subT.length + ' alt görev</span>';
    row += '</div>';
  }

  row += '</div>'; // flex:1

  // Butonlar
  if (canEdit) {
    row += '<div style="display:flex;gap:4px;flex-shrink:0;align-items:flex-start">';
    row += '<button onclick="event.stopPropagation();editTask(' + t.id + ')" style="background:none;border:none;cursor:pointer;font-size:13px;padding:2px 4px" title="Düzenle">✏️</button>';
    row += '<button onclick="event.stopPropagation();delTask(' + t.id + ')" style="background:none;border:none;cursor:pointer;font-size:13px;padding:2px 4px;color:#EF4444" title="Sil">✕</button>';
    row += '</div>';
  }

  row += '</div>'; // flex row

  // Subtask placeholder
  row += '<div id="st-' + t.id + '"></div>';
  row += '</div>'; // tk-row

  return row;
}

// ── En Önemli 3 bloğu ────────────────────────────────────────
function _renderEn3Blok(todayS) {
  var h = '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px;margin-bottom:12px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
  h += '<span style="font-size:13px;font-weight:700;color:var(--t)">En Önemli 3</span>';
  h += '<select onchange="event.stopPropagation();window._pusEn3Donem=this.value;renderPusula()" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="font-size:10px;padding:3px 8px;border:1px solid var(--b);border-radius:5px;background:var(--sf);color:var(--t3);font-family:inherit;cursor:pointer">';
  ['bugun','hafta','ay','yil'].forEach(function(d) {
    var lbl = { bugun:'Bugün', hafta:'Bu Hafta', ay:'Bu Ay', yil:'Bu Yıl' }[d];
    h += '<option value="' + d + '"' + (_pusEn3Donem === d ? ' selected' : '') + '>' + lbl + '</option>';
  });
  h += '</select></div>';

  var overrideIds = window._pusEn3Load?.();
  var en3;
  if (overrideIds && overrideIds.length) {
    var allTasks = window.loadTasks?.() || [];
    en3 = overrideIds.map(function(id) { return allTasks.find(function(t) { return t.id === id; }); }).filter(Boolean).slice(0, 3);
  } else {
    en3 = window._pusEn3Hesapla?.(_pusEn3Donem) || [];
  }

  if (!en3.length) {
    h += '<div style="text-align:center;padding:16px;font-size:11px;color:var(--t3)">Bu dönemde görev yok</div>';
  } else {
    en3.forEach(function(t, i) {
      var catName = t.category || t.cat || 'Genel';
      var catC = _CAT_COLORS[catName] || _CAT_COLORS['Genel'];
      var isDone = t.done || t.status === 'done';
      h += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;' + (i < en3.length - 1 ? 'border-bottom:1px solid var(--b)' : '') + '">';
      h += '<div style="width:22px;height:22px;border-radius:50%;background:#DC2626;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">' + (i + 1) + '</div>';
      h += '<div style="flex:1;min-width:0">';
      h += '<div style="font-size:12px;font-weight:600;color:' + (isDone ? 'var(--t3)' : 'var(--t)') + ';text-decoration:' + (isDone ? 'line-through' : 'none') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + t.title + '</div>';
      h += '<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:' + catC[0] + ';color:' + catC[1] + ';font-weight:600">' + catName + '</span>';
      h += '</div>';
      h += '<input type="checkbox" ' + (isDone ? 'checked' : '') + ' onchange="event.stopPropagation();toggleTask(' + t.id + ',this.checked)" onclick="event.stopPropagation()" style="accent-color:#DC2626;cursor:pointer;margin-top:2px">';
      h += '</div>';
    });
  }

  h += '<div style="font-size:10px;color:var(--t3);margin-top:8px;text-align:center">';
  h += (overrideIds ? 'Manuel' : 'Otomatik') + ' · <a href="#" onclick="event.stopPropagation();event.preventDefault();window._pusEn3EditMode?.()" style="color:var(--ac);text-decoration:none">Düzenle</a>';
  h += '</div></div>';
  return h;
}

// ── Günün Sözü bloğu ─────────────────────────────────────────
function _renderSozBlok() {
  var _q = window._pusQuoteData || _getDailyQuote();
  var h = '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;padding:12px;margin-bottom:12px">';
  h += '<div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:8px">Günün Sözü</div>';
  h += '<div style="font-style:italic;font-size:12px;color:var(--t2);line-height:1.5;margin-bottom:6px">"' + (window.escapeHtml?.(_q.text) || _q.text) + '"</div>';
  h += '<div style="font-size:10px;color:var(--t3);text-align:right">— ' + (window.escapeHtml?.(_q.author) || _q.author) + '</div>';
  h += '<div style="display:flex;gap:6px;margin-top:8px;justify-content:center">';
  h += '<button onclick="event.stopPropagation();window._sozSonraki?.()" style="font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid var(--b);background:var(--sf);cursor:pointer;font-family:inherit;color:var(--t3)">Sonraki →</button>';
  h += '<button onclick="event.stopPropagation();window._sozPoster?.()" style="font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid var(--b);background:var(--sf);cursor:pointer;font-family:inherit;color:var(--t3)">Poster Yap</button>';
  h += '</div></div>';
  return h;
}

// ── Kaynaklar bloğu ──────────────────────────────────────────
function _renderKaynaklarBlok() {
  var h = '<div style="background:var(--sf);border:1px solid var(--b);border-radius:10px;overflow:hidden">';
  h += '<div onclick="event.stopPropagation();window._pusKaynaklarAcik=!window._pusKaynaklarAcik;renderPusula()" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;cursor:pointer">';
  h += '<span style="font-size:12px;font-weight:700;color:var(--t)">Kaynaklar</span>';
  h += '<span style="font-size:12px;color:var(--t3)">' + (_pusKaynaklarAcik ? '▼' : '▶') + '</span>';
  h += '</div>';

  if (_pusKaynaklarAcik) {
    h += '<div style="padding:0 12px 12px;display:flex;flex-direction:column;gap:10px">';
    _KAYNAKLAR.forEach(function(k) {
      h += '<div style="background:' + k.renk[0] + ';border-radius:8px;padding:10px;border-left:3px solid ' + k.renk[1] + '">';
      h += '<div style="font-weight:700;font-size:12px;color:' + k.renk[1] + '">' + k.isim + '</div>';
      h += '<div style="font-size:10px;color:var(--t3);margin-bottom:4px">' + k.kitap + '</div>';
      h += '<div style="font-size:11px;color:var(--t2);line-height:1.4;margin-bottom:6px">' + k.fikir + '</div>';
      h += '<div style="font-style:italic;font-size:10px;color:' + k.renk[1] + ';border-left:2px solid ' + k.renk[1] + ';padding-left:8px">"' + k.soz + '"</div>';
      h += '<button onclick="event.stopPropagation();window._sozEkleModal?.(\'' + k.isim.replace(/'/g, "\\'") + '\')" style="margin-top:6px;font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid ' + k.renk[1] + ';background:transparent;color:' + k.renk[1] + ';cursor:pointer;font-family:inherit">Sözlere Ekle</button>';
      h += '</div>';
    });
    h += '</div>';
  }

  h += '</div>';
  return h;
}

// ── Tam ekran görünüm yardımcısı ─────────────────────────────
function _renderFullView(panel) {
  var _fc = g('pus-fullview-cont');
  if (!_fc) {
    _fc = document.createElement('div');
    _fc.id = 'pus-fullview-cont';
    panel.appendChild(_fc);
  }
  _fc.style.display = '';
  _fc.innerHTML = '';
  var _tasks = visTasks();
  var _users = loadUsers();
  var _today = new Date().toISOString().slice(0, 10);
  if (PUS_VIEW === 'kadran')      _renderKadranView(_tasks, _users, _today, _fc);
  else if (PUS_VIEW === 'kanban') _renderKanbanView(_tasks, _users, _today, _fc);
  else if (PUS_VIEW === 'odak')   _renderOdakView(_tasks, _users, _today, _fc);
  else if (PUS_VIEW === 'gantt')  { setTimeout(function() { window._pfRenderGantt?.(); }, 50); }
}

// ════════════════════════════════════════════════════════════════
// GÖRÜNÜM VE FİLTRE KONTROL
// ════════════════════════════════════════════════════════════════

function setPusView(v, btn) {
  PUS_VIEW = v;
  localStorage.setItem('ak_pus_view', v);
  document.querySelectorAll('.pvt-btn,.pus-seg-btn,.cvb')
    .forEach(function(b) { b.classList.remove('on', 'active'); });
  if (btn) btn.classList.add('on', 'active');
  renderPusula();
}

function _pusSetTab(tab) {
  _pusAktifTab = tab;
  _pusSayfa = 1;
  renderPusula();
}

function setPusQuickFilter(f, btn) {
  PUS_QUICK_FILTER = f;
  document.querySelectorAll('.pus-stat-pill,.psb-tab,.pus-tab,.pus-stat-chip')
    .forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  // Tab mapping
  var tabMap = { overdue:'gecikmis', done:'tamam', all:'tumu' };
  _pusAktifTab = tabMap[f] || 'tumu';
  _pusSayfa = 1;
  renderPusula();
}

function clearPusFilters() {
  _pusAktifTab = 'tumu';
  _pusSayfa = 1;
  PUS_QUICK_FILTER = 'all';
  renderPusula();
}

function updateTkPriBar() {
  var pri = parseInt(g('tk-pri')?.value || '2');
  var bar = g('tk-pri-indicator') || g('tk-pri-bar');
  if (bar) bar.style.background = PRI_MAP[pri]?.color || '#64748B';
}

function _pusFiltre(alan, deger) {
  _pusSayfa = 1;
  renderPusula();
}

// ── Toplu işlem v2 ───────────────────────────────────────────
window._pusBulkCheck2 = function() {
  var checked = document.querySelectorAll('.pus-row-chk:checked');
  var actions = document.getElementById('pus-bulk-actions');
  var cnt = document.getElementById('pus-bulk-cnt2');
  if (actions) actions.style.display = checked.length ? 'flex' : 'none';
  if (cnt) cnt.textContent = checked.length + ' görev';
};

window._pusBulkComplete = function() {
  var checked = document.querySelectorAll('.pus-row-chk:checked');
  var ids = Array.from(checked).map(function(cb) { return parseInt(cb.dataset.id); });
  if (!ids.length) return;
  window.confirmModal?.(ids.length + ' görev tamamlandı olarak işaretlenecek.', {
    title: 'Toplu Tamamla', confirmText: 'Evet, Tamamla',
    onConfirm: function() {
      var tasks = window.loadTasks ? loadTasks() : [];
      tasks.forEach(function(t) {
        if (ids.indexOf(t.id) !== -1) { t.done = true; t.status = 'done'; t.completedAt = new Date().toISOString(); }
      });
      if (typeof window.saveTasks === 'function') saveTasks(tasks);
      renderPusula();
      window.toast?.(ids.length + ' görev tamamlandı ✓', 'ok');
      window.logActivity?.('task', 'Toplu tamamlama: ' + ids.length + ' görev');
    }
  });
};

window._toggleMeFilter = function(checked) {
  PUS_VIEW = checked ? 'me' : (localStorage.getItem('ak_pus_view') === 'me' ? 'list' : localStorage.getItem('ak_pus_view') || 'list');
  renderPusula();
};

// ════════════════════════════════════════════════════════════════
// WINDOW EXPORTS
// ════════════════════════════════════════════════════════════════

window.renderPusula     = renderPusula;
window.setPusView       = setPusView;
window.setPusQuickFilter = setPusQuickFilter;
window.clearPusFilters  = clearPusFilters;
window.updateTkPriBar   = updateTkPriBar;
window._pusSetTab       = _pusSetTab;
window._pusFiltre       = _pusFiltre;
window._pusSayfa        = _pusSayfa;
window._pusAktifTab     = _pusAktifTab;
