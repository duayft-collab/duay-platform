/**
 * src/modules/pusula_export.js — v3.0.0
 * Pusula — Excel ve JSON export/import
 * Bağımlı: pusula_core.js, database.js
 * Anayasa: K01 ≤800 satır | K04 try-catch
 */

'use strict';

// ── Excel Export ─────────────────────────────────────────────────
function exportTasksXlsx() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  const users = loadUsers();
  const tasks = visTasks();

  const priLabel = { 1:'Kritik', 2:'Önemli', 3:'Normal', 4:'Düşük' };
  const statLabel = { todo:'Yapılacak', inprogress:'Devam', review:'İnceleme', done:'Tamamlandı' };

  // Ana görevler sayfası
  const rows = tasks.map(t => {
    const u    = users.find(x => x.id === t.uid) || { name: '?' };
    const subs = t.subTasks || [];
    return {
      'ID':              t.id,
      'Görev':           t.title,
      'Açıklama':        t.desc || '',
      'Personel':        u.name,
      'Öncelik':         priLabel[t.pri] || '?',
      'Durum':           t.done ? 'Tamamlandı' : (statLabel[t.status] || 'Yapılacak'),
      'Departman':       t.department || '',
      'Başlangıç':       t.start || '',
      'Son Tarih':       t.due || '',
      'İşlem Tutarı':    t.cost ? Number(t.cost).toLocaleString('tr-TR') : '',
      'Etiketler':       (t.tags || []).join(', '),
      'JOB ID':          t.jobId || '',
      'Alt Görev Sayısı':subs.length,
      'Tamamlanan Alt':  subs.filter(s => s.done).length,
      'Oluşturulma':     t.created_at || t.createdAt || '',
      'Link':            t.link || '',
    };
  });

  // Alt görevler sayfası
  const subRows = [];
  tasks.forEach(t => {
    (t.subTasks || []).forEach(s => {
      const su = users.find(x => x.id === s.uid) || { name: '?' };
      subRows.push({
        'Ana Görev ID': t.id,
        'Ana Görev':    t.title,
        'Alt Görev':    s.title,
        'Sorumlu':      su.name,
        'Durum':        s.done ? 'Tamamlandı' : (statLabel[s.status] || 'Yapılacak'),
        'Son Tarih':    s.due || '',
      });
    });
  });

  // Kombine sayfa
  const combinedRows = [];
  tasks.forEach(t => {
    const u = users.find(x => x.id === t.uid) || { name: '?' };
    combinedRows.push({
      'Tür':       'ANA GÖREV',
      'ID':        t.id,
      'Başlık':    t.title,
      'Personel':  u.name,
      'Öncelik':   priLabel[t.pri] || '?',
      'Durum':     t.done ? 'Tamamlandı' : (t.status || 'todo'),
      'Departman': t.department || '',
      'Son Tarih': t.due || '',
      'Açıklama':  t.desc || '',
    });
    (t.subTasks || []).forEach((s, si) => {
      const su = users.find(x => x.id === s.uid) || { name: '?' };
      combinedRows.push({
        'Tür':       `  └ Alt Görev ${si + 1}`,
        'ID':        `${t.id}.${si + 1}`,
        'Başlık':    s.title,
        'Personel':  su.name,
        'Öncelik':   priLabel[s.pri] || '',
        'Durum':     s.done ? '✓ Tamamlandı' : 'Devam',
        'Departman': '',
        'Son Tarih': s.due || '',
        'Açıklama':  '',
      });
    });
  });

  const wb  = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(rows);
  const ws2 = XLSX.utils.json_to_sheet(subRows.length ? subRows : [{ Bilgi: 'Alt görev yok' }]);
  const ws3 = XLSX.utils.json_to_sheet(combinedRows);

  ws1['!cols'] = [{wch:10},{wch:35},{wch:30},{wch:18},{wch:10},{wch:14},{wch:14},{wch:12},{wch:12},{wch:14},{wch:20},{wch:14},{wch:14},{wch:14},{wch:18},{wch:30}];
  ws2['!cols'] = [{wch:12},{wch:35},{wch:35},{wch:18},{wch:14},{wch:12}];
  ws3['!cols'] = [{wch:14},{wch:10},{wch:35},{wch:18},{wch:10},{wch:14},{wch:14},{wch:12},{wch:30}];

  XLSX.utils.book_append_sheet(wb, ws1, 'Görevler');
  XLSX.utils.book_append_sheet(wb, ws2, 'Alt Görevler');
  XLSX.utils.book_append_sheet(wb, ws3, 'Görev + Alt Görev');

  const fname = `Gorevler_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fname);
  logActivity('task', `Görev listesi Excel olarak indirildi (${tasks.length} görev)`);
  window.toast?.(`✅ ${tasks.length} görev Excel'e aktarıldı`, 'ok');
}
window.exportTasksXlsx = exportTasksXlsx;

// ── Excel Import ─────────────────────────────────────────────────
function importTasksXlsx() {
  let inp = g('_tk-xlsx-import-inp');
  if (!inp) {
    inp        = document.createElement('input');
    inp.type   = 'file';
    inp.id     = '_tk-xlsx-import-inp';
    inp.accept = '.xlsx,.xls,.csv';
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  inp.value = '';
  inp.onchange = function() {
    const file = inp.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb   = XLSX.read(e.target.result, { type:'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) { window.toast?.('Dosya boş', 'err'); return; }

        const users    = loadUsers();
        const existing = loadTasks();
        let imported   = 0;
        let skipped    = 0;

        rows.forEach(row => {
          const title = (row['Görev'] || row['title'] || '').toString().trim();
          if (!title) { skipped++; return; }

          const user   = users.find(u => u.name === (row['Personel'] || '').toString().trim());
          const priMap = { 'Kritik':1, 'Önemli':2, 'Normal':3, 'Düşük':4 };
          const pri    = priMap[row['Öncelik']] || 2;
          const status = row['Durum'] === 'Tamamlandı' ? 'done'
            : row['Durum'] === 'Devam' ? 'inprogress'
            : row['Durum'] === 'İnceleme' ? 'review' : 'todo';

          const task = {
            id:         typeof generateNumericId === 'function' ? generateNumericId() : Date.now() + imported,
            title,
            desc:       (row['Açıklama'] || '').toString(),
            pri,
            due:        (row['Son Tarih'] || '').toString() || null,
            start:      (row['Başlangıç'] || '').toString() || null,
            status,
            done:       status === 'done',
            department: (row['Departman'] || '').toString() || '',
            cost:       parseFloat((row['İşlem Tutarı'] || '').toString().replace(/[^0-9.]/g, '')) || null,
            tags:       (row['Etiketler'] || '').toString().split(',').map(t => t.trim()).filter(Boolean),
            link:       (row['Link'] || '').toString() || '',
            jobId:      (row['JOB ID'] || '').toString().trim() || null,
            uid:        user?.id || _getCU()?.id || 0,
            subTasks:   [],
            created_at: nowTs(),
            createdBy:  _getCU()?.id,
            isImported: true,
          };
          if (!task.jobId) {
            const yr  = new Date().getFullYear();
            const seq = String(existing.filter(t => t.jobId && t.jobId.startsWith('JOB-' + yr)).length + imported + 1).padStart(4, '0');
            task.jobId = `JOB-${yr}-${seq}`;
          }
          existing.push(task);
          imported++;
        });

        saveTasks(existing);
        renderPusula();
        window.toast?.(`✅ ${imported} görev aktarıldı${skipped ? ', ' + skipped + ' satır atlandı' : ''}`, 'ok');
        logActivity('task', `Excel'den ${imported} görev aktarıldı`);
      } catch(err) {
        console.error('[pusula_export] Excel import:', err);
        window.toast?.('Import hatası: ' + err.message, 'err');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  inp.click();
}
window.importTasksXlsx = importTasksXlsx;

// ── Excel Şablon İndir ───────────────────────────────────────────
function downloadTaskTemplate() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kütüphanesi yüklenmedi', 'err'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([{
    'Görev':       'Örnek Görev',
    'Açıklama':    'Görev açıklaması',
    'Personel':    'Ad Soyad',
    'Öncelik':     'Önemli',
    'Durum':       'Yapılacak',
    'Departman':   'İhracat',
    'Başlangıç':   '2026-04-01',
    'Son Tarih':   '2026-04-30',
    'İşlem Tutarı':'1000',
    'Etiketler':   'ihracat,acil',
    'JOB ID':      'JOB-2026-0001',
    'Link':        'https://...',
  }]);
  ws['!cols'] = [{wch:30},{wch:30},{wch:18},{wch:10},{wch:14},{wch:14},{wch:12},{wch:12},{wch:14},{wch:20},{wch:14},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws, 'Görev Şablonu');
  XLSX.writeFile(wb, 'Pusula_Sablon.xlsx');
  window.toast?.('Şablon indirildi', 'ok');
}
window.downloadTaskTemplate = downloadTaskTemplate;

// ── JSON Tam Yedek ───────────────────────────────────────────────
function exportPusulaJSON() {
  try {
    const backup = {
      version:    '3.0',
      exportedAt: nowTs(),
      exportedBy: _getCU()?.name || '?',
      data: {
        tasks:     loadTasks(),
        taskChats: typeof loadTaskChats === 'function' ? loadTaskChats() : {},
        templates: typeof _pfLoadTemplates === 'function' ? _pfLoadTemplates() : [],
        deps:      typeof _pfLoadDeps === 'function'      ? _pfLoadDeps()      : {},
        timeLog:   typeof _pfLoadTimeLog === 'function'   ? _pfLoadTimeLog()   : {},
        scores:    typeof _pfLoadScores === 'function'    ? _pfLoadScores()    : {},
        taskLog:   typeof _pfLoadTaskLog === 'function'   ? _pfLoadTaskLog()   : {},
      }
    };
    const taskCount = backup.data.tasks.length;
    const subCount  = backup.data.tasks.reduce((s, t) => s + (t.subTasks?.length || 0), 0);
    const json      = JSON.stringify(backup, null, 2);
    const blob      = new Blob([json], { type: 'application/json' });
    const url       = URL.createObjectURL(blob);
    const a         = document.createElement('a');
    a.href          = url;
    a.download      = `Pusula_Yedek_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logActivity('task', `Pusula yedeği alındı — ${taskCount} görev, ${subCount} alt görev`);
    window.toast?.(`✅ Yedek alındı — ${taskCount} görev, ${subCount} alt görev`, 'ok');
  } catch(e) {
    console.error('[pusula_export] JSON export:', e);
    window.toast?.('Yedek alınamadı: ' + e.message, 'err');
  }
}
window.exportPusulaJSON = exportPusulaJSON;

// ── JSON Yedek Yükle ─────────────────────────────────────────────
function importPusulaJSON() {
  let inp = g('_pus-json-import');
  if (!inp) {
    inp             = document.createElement('input');
    inp.type        = 'file';
    inp.accept      = '.json';
    inp.id          = '_pus-json-import';
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  inp.onchange = function() {
    const file = inp.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const backup = JSON.parse(e.target.result);
        if (!backup.data || !backup.data.tasks) { window.toast?.('Geçersiz yedek dosyası', 'err'); return; }
        const taskCount = backup.data.tasks.length;
        if (typeof window.confirmModal === 'function') {
          window.confirmModal(`${taskCount} görev yüklenecek. Mevcut verinin üzerine yazılacak. Devam?`, _doImportPusulaJSON.bind(null, backup));
        } else {
          _doImportPusulaJSON(backup);
        }
      } catch(err) { window.toast?.('JSON okunamadı: ' + err.message, 'err'); }
    };
    reader.readAsText(file);
    inp.value = '';
  };
  inp.click();
}
window.importPusulaJSON = importPusulaJSON;

function _doImportPusulaJSON(backup) {
  try {
    const d = backup.data;
    if (Array.isArray(d.tasks)) saveTasks(d.tasks);
    if (d.taskChats && typeof storeTaskChats === 'function') storeTaskChats(d.taskChats);
    if (d.templates && typeof _pfSaveTemplates === 'function') _pfSaveTemplates(d.templates);
    if (d.deps      && typeof _pfSaveDeps      === 'function') _pfSaveDeps(d.deps);
    if (d.timeLog   && typeof _pfSaveTimeLog   === 'function') _pfSaveTimeLog(d.timeLog);
    if (d.scores    && typeof _pfSaveScores    === 'function') _pfSaveScores(d.scores);
    if (d.taskLog   && typeof _pfSaveTaskLog   === 'function') _pfSaveTaskLog(d.taskLog);
    const taskCount = d.tasks?.length || 0;
    logActivity('task', `Pusula yedeği yüklendi — ${taskCount} görev`);
    window.toast?.(`✅ ${taskCount} görev yüklendi`, 'ok');
    renderPusula();
    updatePusBadge();
  } catch(err) {
    console.error('[pusula_export] import:', err);
    window.toast?.('Yükleme hatası: ' + err.message, 'err');
  }
}
window._doImportPusulaJSON = _doImportPusulaJSON;
