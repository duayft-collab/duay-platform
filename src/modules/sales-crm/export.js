/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/export.js
 * V138.2 POPULATE — JSON / Excel / PDF I/O
 * Anayasa: K01 / Belge 3 § 6 (namespace standardı)
 * Cycle: V138.2 SALES-CRM-PRO-POPULATE-001
 * ───────────────────────────────────────────────────── */
(function() {
  'use strict';
  window.SalesCRM = window.SalesCRM || {
    core: {}, data: {}, pages: {}, modal: {}, ui: {}, io: {}
  };

  function exportJSON() {
    var core = window.SalesCRM.core;
    if (!core || !core.D) return;
    var blob = new Blob([JSON.stringify(core.D, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'SatisCRM_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    core.toast('Dışa aktarıldı', '📥');
  }

  function importJSON(input) {
    var core = window.SalesCRM.core;
    if (!core || !core.D) return;
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        Object.assign(core.D, JSON.parse(e.target.result));
        core.saveAll();
        var pages = window.SalesCRM.pages;
        if (pages && pages.renderAll) pages.renderAll();
        core.toast('İçe aktarıldı', '📥');
      } catch (err) {
        core.toast('Hata: dosya okunamadı', '❌');
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    var core = window.SalesCRM.core;
    if (!core) return;
    core.confirmAction('DİKKAT! Tüm Sales CRM verileri silinecek. Devam edilsin mi?', function() {
      Object.keys(core.D).forEach(function(k) {
        if (Array.isArray(core.D[k])) core.D[k] = [];
        else if (typeof core.D[k] === 'object') core.D[k] = {};
      });
      core.saveAll();
      var pages = window.SalesCRM.pages;
      if (pages && pages.renderAll) pages.renderAll();
      core.toast('Sıfırlandı', '🔄');
    });
  }

  function exportExcel() {
    var core = window.SalesCRM.core;
    if (!core) return;
    if (typeof XLSX === 'undefined') {
      core.toast('Excel kütüphanesi yok', '⏳');
      return;
    }
    var D = core.D;
    var rows = [['Ad', 'Firma', 'Sektör', 'Sınıf', 'Durum', 'Email', 'Şehir']]
      .concat(D.contacts.map(function(c) {
        return [c.ad, c.firma, c.sektor, c.potansiyelSinifi, c.durum, c.email, c.sehir];
      }));
    var ws = XLSX.utils.aoa_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');
    var dr = [['Fırsat', 'Müşteri', 'Aşama', 'Değer', 'Olasılık', 'Kapanış']]
      .concat(D.deals.map(function(d) {
        var c = core.gC(d.musteriId);
        return [d.ad, c.ad, d.asama, d.deger, d.olasilik, d.kapanisTarihi];
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dr), 'Fırsatlar');
    XLSX.writeFile(wb, 'SatisCRM_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    core.toast('Excel hazır', '📊');
  }

  function exportPDF() {
    var core = window.SalesCRM.core;
    if (!core) return;
    if (typeof html2pdf === 'undefined') {
      core.toast('PDF kütüphanesi yok', '⏳');
      return;
    }
    var el = document.getElementById('scrm-content');
    if (!el) {
      core.toast('İçerik bulunamadı', '❌');
      return;
    }
    html2pdf().set({
      margin: 8,
      filename: 'SatisCRM_Rapor.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 1.5 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(el).save();
    core.toast('PDF oluşturuluyor', '📄');
  }

  window.SalesCRM.io = {
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAll: resetAll,
    exportExcel: exportExcel,
    exportPDF: exportPDF
  };
})();
