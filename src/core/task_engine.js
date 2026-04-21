(function() {
  'use strict';

  /* ENTERPRISE-FLOW-NETWORK-001 PARÇA 4: Task Engine */

  var RULES = [
    { event: 'offer.sent',          task: { title: 'Teklif hatırlatması gönder',            priority: 'normal', dueInDays: 3, category: 'satis' } },
    { event: 'offer.accepted',      task: { title: 'Sipariş oluştur ve üretimi planla',    priority: 'yuksek', dueInDays: 1, category: 'satis' } },
    { event: 'order.confirmed',     task: { title: 'Üretim planlaması başlat',              priority: 'yuksek', dueInDays: 2, category: 'operasyon' } },
    { event: 'purchase.requested',  task: { title: 'Satınalma onayı bekleniyor',            priority: 'normal', dueInDays: 1, category: 'satinalma' } },
    { event: 'purchase.approved',   task: { title: 'Tedarikçiye sipariş ver',               priority: 'yuksek', dueInDays: 1, category: 'satinalma' } },
    { event: 'purchase.ordered',    task: { title: 'Mal kabul hazırlığı yap',               priority: 'normal', dueInDays: 5, category: 'satinalma' } },
    { event: 'payment.planned',     task: { title: 'Ödeme yapılacak',                       priority: 'normal', dueInDays: 0, category: 'muhasebe' } },
    { event: 'payment.overdue',     task: { title: 'Müşteriyi ödemeyle ilgili ara',         priority: 'kritik', dueInDays: 0, category: 'muhasebe' } },
    { event: 'shipment.planned',    task: { title: 'Araç ve yükleme organize et',           priority: 'yuksek', dueInDays: 1, category: 'lojistik' } },
    { event: 'shipment.in_transit', task: { title: 'Alıcıya sevkiyat bilgisi bildir',       priority: 'normal', dueInDays: 0, category: 'lojistik' } },
    { event: 'customer.potential',  task: { title: 'Potansiyel cari onayı iste',            priority: 'normal', dueInDays: 2, category: 'crm' } }
  ];

  var _created = 0, _skipped = 0;

  function _createTaskFromRule(rule, payload) {
    var due = new Date();
    due.setDate(due.getDate() + (rule.task.dueInDays || 0));

    var task = {
      id: 'tsk-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
      title: rule.task.title,
      priority: rule.task.priority || 'normal',
      category: rule.task.category || 'genel',
      dueDate: due.toISOString(),
      relatedEntityType: payload.entityType || null,
      relatedEntityId: payload.entityId || null,
      sourceEvent: rule.event,
      createdAt: new Date().toISOString(),
      status: 'acik',
      auto: true  // Event-driven flag
    };

    // Pusula Pro task store entegrasyon chain (Platform → Pusula → localStorage fallback)
    if (typeof window.addTask === 'function') {
      window.addTask(task);
    } else if (typeof window.loadTasks === 'function' && typeof window.saveTasks === 'function') {
      /* Platform task store (database.js loadTasks/saveTasks — Pusula Pro ile paylaşımlı) */
      var tasks = window.loadTasks() || [];
      tasks.push(task);
      window.saveTasks(tasks);
    } else if (window.PP_TASKS && Array.isArray(window.PP_TASKS)) {
      window.PP_TASKS.push(task);
    } else {
      /* Fallback: localStorage (hiçbir task API'si yoksa) */
      /* LS-SYNC-003: 30 gün TTL + 200 FIFO (mevcut 500'den düşürüldü — ak_auto_tasks_v1 birikimi) */
      var existing = [];
      try { existing = JSON.parse(localStorage.getItem('ak_auto_tasks_v1') || '[]'); } catch(_re) {}
      existing.push(task);
      try {
        var _thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        existing = existing.filter(function(t) {
          try {
            var _t = new Date(String((t && t.createdAt) || '').replace(' ', 'T')).getTime();
            return isNaN(_t) || _t >= _thirtyDaysAgo;
          } catch(_e) { return true; }
        });
      } catch(_ae) {}
      try { localStorage.setItem('ak_auto_tasks_v1', JSON.stringify(existing.slice(-200))); } catch(_se) {}
    }

    _created++;
    return task;
  }

  function _setupSubscribers() {
    if (!window.evBus) {
      console.warn('[TaskEngine] evBus yok, bağlanamadı');
      return false;
    }

    RULES.forEach(function(rule) {
      window.evBus.on(rule.event, function(payload) {
        try {
          _createTaskFromRule(rule, payload || {});
        } catch(e) {
          console.error('[TaskEngine] task oluşturma hata:', rule.event, e.message);
          _skipped++;
        }
      });
    });

    return true;
  }

  /* Expose */
  window.taskEngine = {
    RULES: RULES,
    stats: function() { return { rules: RULES.length, created: _created, skipped: _skipped }; },
    _createTaskFromRule: _createTaskFromRule  // test için
  };

  var ok = _setupSubscribers();
  console.log('[TaskEngine] Task Engine yüklü:', RULES.length, 'rule,', ok ? 'aktif' : 'INAKTIF');
})();
