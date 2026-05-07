'use strict';
/* ════════════════════════════════════════════════════════════
   src/modules/anayasa_admin.js — Anayasa Düzenleme Modülü

   V194e-3c: super_admin için anayasa CRUD + Firestore + versiyonlama.

   Yetki:    super_admin ONLY (admin görür, düzenleyemez)
   Versiyon: son 10 (FIFO, 11. yazılınca en eskisi silinir)
   Editor:   yapısal form (her madde ayrı alan)

   Firestore path:
     duay_company/master/anayasa_content              (canlı)
     duay_company/master/anayasa_versions/{versiyon_id} (snapshot, max 10)

   KX5 + KX10 + KX11 + KX12 uyumlu.
   ════════════════════════════════════════════════════════════ */
(function() {

  var MAX_VERSIONS = 10;

  // ─── RBAC ─────────────────────────────────────────────
  function _isSuperAdmin() {
    var r = window.CU?.()?.role;
    return r === 'super_admin';
  }

  // ─── Düzenle butonu (renderPlatformKurallari header'dan çağrılır) ─────────
  window._anayasaAdminButton = function() {
    if (!_isSuperAdmin()) return '';
    return '<button onclick="window._anayasaOpenEdit()" '
      + 'style="font-size:10px;padding:4px 10px;border:0.5px solid var(--b);'
      + 'border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);'
      + 'font-family:inherit">✏️ Düzenle</button>';
  };

  // ─── Modal aç ─────────────────────────────────────────
  window._anayasaOpenEdit = function() {
    if (!_isSuperAdmin()) { alert('Sadece super_admin düzenleyebilir.'); return; }
    var c = window.DUAY_ANAYASA_GET();
    if (!c) { alert('Anayasa içeriği yüklenemedi.'); return; }

    // Deep clone (Object.freeze'i bozmamak için)
    var draft = JSON.parse(JSON.stringify({
      belgeler: c.belgeler,
      kx_kurallari: c.kx_kurallari
    }));

    var modal = document.createElement('div');
    modal.id = 'anayasa-admin-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

    var html = '<div style="background:var(--s);border-radius:12px;width:1000px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column">';
    // Header
    html += '<div style="padding:16px 20px;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">';
    html += '<div><div style="font-size:14px;font-weight:600;color:var(--t)">Anayasa Düzenle</div>';
    html += '<div style="font-size:10px;color:var(--t3);margin-top:2px">super_admin · son 10 versiyon Firestore\'da tutulur</div></div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button onclick="window._anayasaShowVersions()" style="font-size:11px;padding:6px 12px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">📜 Versiyon Geçmişi</button>';
    html += '<button onclick="document.getElementById(\'anayasa-admin-modal\')?.remove()" style="font-size:13px;padding:6px 12px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">Kapat</button>';
    html += '</div></div>';
    // Tab bar
    html += '<div style="padding:8px 20px 0;border-bottom:0.5px solid var(--b);flex-shrink:0">';
    html += '<button id="aa-tab-belgeler" onclick="window._anayasaTab(\'belgeler\')" class="aa-tab-btn" style="padding:8px 16px;border:none;background:transparent;border-bottom:2px solid var(--t);font-weight:600;font-size:12px;cursor:pointer;color:var(--t)">Belgeler (' + draft.belgeler.length + ')</button>';
    html += '<button id="aa-tab-kx" onclick="window._anayasaTab(\'kx\')" class="aa-tab-btn" style="padding:8px 16px;border:none;background:transparent;border-bottom:2px solid transparent;font-weight:400;font-size:12px;cursor:pointer;color:var(--t3)">KX Kuralları (' + draft.kx_kurallari.length + ')</button>';
    html += '</div>';
    // Body
    html += '<div id="aa-body" style="padding:16px 20px;overflow-y:auto;flex:1"></div>';
    // Footer
    html += '<div style="padding:12px 20px;border-top:0.5px solid var(--b);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">';
    html += '<button onclick="document.getElementById(\'anayasa-admin-modal\')?.remove()" style="font-size:12px;padding:6px 14px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2)">İptal</button>';
    html += '<button onclick="window._anayasaSave()" style="font-size:12px;padding:6px 14px;border:none;border-radius:6px;background:#185FA5;cursor:pointer;color:#fff;font-weight:500">💾 Kaydet ve Yeniden Yükle</button>';
    html += '</div></div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);

    window._anayasaDraft = draft;
    window._anayasaTab('belgeler');
  };

  // ─── Tab değiştirme ──────────────────────────────────
  window._anayasaTab = function(tab) {
    var body = document.getElementById('aa-body');
    if (!body) return;
    ['belgeler', 'kx'].forEach(function(t) {
      var btn = document.getElementById('aa-tab-' + t);
      if (!btn) return;
      btn.style.borderBottom = t === tab ? '2px solid var(--t)' : '2px solid transparent';
      btn.style.fontWeight = t === tab ? '600' : '400';
      btn.style.color = t === tab ? 'var(--t)' : 'var(--t3)';
    });
    body.innerHTML = tab === 'belgeler' ? _renderBelgelerForm() : _renderKxForm();
  };

  // ─── Belgeler form ───────────────────────────────────
  function _renderBelgelerForm() {
    var d = window._anayasaDraft;
    var h = '<div style="display:flex;flex-direction:column;gap:12px">';
    d.belgeler.forEach(function(b, i) {
      h += '<div style="padding:12px;border:0.5px solid var(--b);border-radius:8px">';
      h += '<div style="display:flex;gap:8px;margin-bottom:8px">';
      h += '<div style="flex:1"><label style="font-size:9px;color:var(--t3);text-transform:uppercase">ID</label><input type="text" value="' + _esc(b.id) + '" onchange="window._anayasaDraft.belgeler[' + i + '].id=this.value" style="width:100%;padding:6px 8px;border:0.5px solid var(--b);border-radius:4px;font-size:11px;font-family:monospace"></div>';
      h += '<div style="flex:2"><label style="font-size:9px;color:var(--t3);text-transform:uppercase">Başlık</label><input type="text" value="' + _esc(b.baslik) + '" onchange="window._anayasaDraft.belgeler[' + i + '].baslik=this.value" style="width:100%;padding:6px 8px;border:0.5px solid var(--b);border-radius:4px;font-size:11px"></div>';
      h += '<div style="flex:1"><label style="font-size:9px;color:var(--t3);text-transform:uppercase">Versiyon</label><input type="text" value="' + _esc(b.versiyon) + '" onchange="window._anayasaDraft.belgeler[' + i + '].versiyon=this.value" style="width:100%;padding:6px 8px;border:0.5px solid var(--b);border-radius:4px;font-size:11px"></div>';
      h += '<div style="flex:1"><label style="font-size:9px;color:var(--t3);text-transform:uppercase">Tarih</label><input type="text" value="' + _esc(b.tarih) + '" onchange="window._anayasaDraft.belgeler[' + i + '].tarih=this.value" style="width:100%;padding:6px 8px;border:0.5px solid var(--b);border-radius:4px;font-size:11px"></div>';
      h += '</div>';
      h += '<label style="font-size:9px;color:var(--t3);text-transform:uppercase">İçerik (Markdown)</label>';
      h += '<textarea onchange="window._anayasaDraft.belgeler[' + i + '].icerik=this.value" style="width:100%;min-height:200px;padding:8px;border:0.5px solid var(--b);border-radius:4px;font-size:11px;font-family:monospace;line-height:1.5">' + _esc(b.icerik) + '</textarea>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  // ─── KX form ─────────────────────────────────────────
  function _renderKxForm() {
    var d = window._anayasaDraft;
    var h = '<div style="display:flex;flex-direction:column;gap:8px">';
    d.kx_kurallari.forEach(function(k, i) {
      h += '<div style="padding:10px;border:0.5px solid var(--b);border-radius:6px;display:flex;gap:8px;align-items:flex-start">';
      h += '<div style="width:60px"><label style="font-size:9px;color:var(--t3)">KOD</label><input type="text" value="' + _esc(k.id) + '" onchange="window._anayasaDraft.kx_kurallari[' + i + '].id=this.value" style="width:100%;padding:4px 6px;border:0.5px solid var(--b);border-radius:3px;font-size:10px;font-family:monospace"></div>';
      h += '<div style="flex:1"><label style="font-size:9px;color:var(--t3)">BAŞLIK</label><input type="text" value="' + _esc(k.baslik) + '" onchange="window._anayasaDraft.kx_kurallari[' + i + '].baslik=this.value" style="width:100%;padding:4px 6px;border:0.5px solid var(--b);border-radius:3px;font-size:10px"></div>';
      h += '<div style="flex:3"><label style="font-size:9px;color:var(--t3)">AÇIKLAMA</label><textarea onchange="window._anayasaDraft.kx_kurallari[' + i + '].aciklama=this.value" style="width:100%;min-height:40px;padding:4px 6px;border:0.5px solid var(--b);border-radius:3px;font-size:10px">' + _esc(k.aciklama) + '</textarea></div>';
      h += '<div style="width:80px"><label style="font-size:9px;color:var(--t3)">DURUM</label><select onchange="window._anayasaDraft.kx_kurallari[' + i + '].durum=this.value" style="width:100%;padding:4px 6px;border:0.5px solid var(--b);border-radius:3px;font-size:10px">';
      h += '<option value="aktif"' + (k.durum === 'aktif' ? ' selected' : '') + '>aktif</option>';
      h += '<option value="pasif"' + (k.durum === 'pasif' ? ' selected' : '') + '>pasif</option>';
      h += '<option value="iptal"' + (k.durum === 'iptal' ? ' selected' : '') + '>iptal</option>';
      h += '</select></div>';
      h += '<div style="width:90px"><label style="font-size:9px;color:var(--t3)">TARİH</label><input type="text" value="' + _esc(k.tarih) + '" onchange="window._anayasaDraft.kx_kurallari[' + i + '].tarih=this.value" style="width:100%;padding:4px 6px;border:0.5px solid var(--b);border-radius:3px;font-size:10px;font-family:monospace"></div>';
      h += '<button onclick="window._anayasaKxSil(' + i + ')" style="padding:4px 8px;border:0.5px solid #dc2626;border-radius:3px;background:transparent;color:#dc2626;font-size:10px;cursor:pointer;margin-top:14px">Sil</button>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div style="margin-top:12px"><button onclick="window._anayasaKxEkle()" style="padding:6px 14px;border:0.5px dashed var(--b);border-radius:6px;background:transparent;cursor:pointer;color:var(--t2);font-size:11px">+ Yeni KX Maddesi Ekle</button></div>';
    return h;
  }

  window._anayasaKxEkle = function() {
    var nextNum = window._anayasaDraft.kx_kurallari.length + 1;
    var today = new Date().toISOString().slice(0, 10);
    window._anayasaDraft.kx_kurallari.push({
      id: 'KX' + nextNum,
      baslik: 'Yeni Madde',
      durum: 'aktif',
      tarih: today,
      aciklama: ''
    });
    window._anayasaTab('kx');
  };

  window._anayasaKxSil = function(i) {
    if (!confirm('Bu KX maddesini silmek istediğinize emin misiniz?')) return;
    window._anayasaDraft.kx_kurallari.splice(i, 1);
    window._anayasaTab('kx');
  };

  // ─── Save ────────────────────────────────────────────
  window._anayasaSave = async function() {
    if (!_isSuperAdmin()) { alert('Yetkisiz.'); return; }
    if (!window.FB_DB) { alert('Firestore bağlantısı yok.'); return; }
    if (!confirm('Anayasa güncellenecek ve sayfa yeniden yüklenecek. Devam?')) return;

    try {
      var draft = window._anayasaDraft;
      var user = window.CU?.();
      var ts = Date.now();
      var versiyonNo = new Date(ts).toISOString().replace(/[:.]/g, '-');
      var orgPath = window._fsPathOrg ? window._fsPathOrg('master') : 'duay_company/master';

      var payload = {
        belgeler: draft.belgeler,
        kx_kurallari: draft.kx_kurallari,
        _meta: {
          son_guncelleyen: user?.email || user?.uid || 'unknown',
          son_guncelleme: ts,
          versiyon_no: versiyonNo
        }
      };

      // 1) Snapshot al (versiyon geçmişi)
      await window.FB_DB.collection(orgPath).doc('anayasa_versions').collection('list').doc(versiyonNo).set(payload);

      // 2) Canlı versiyonu güncelle
      await window.FB_DB.collection(orgPath).doc('anayasa_content').set(payload);

      // 3) Eski versiyonları temizle (FIFO, max 10)
      var snap = await window.FB_DB.collection(orgPath).doc('anayasa_versions').collection('list').orderBy('_meta.son_guncelleme', 'desc').get();
      if (snap.size > MAX_VERSIONS) {
        var toDelete = snap.docs.slice(MAX_VERSIONS);
        for (var i = 0; i < toDelete.length; i++) {
          await toDelete[i].ref.delete();
        }
      }

      // 4) Audit log
      if (typeof window._auditLog === 'function') {
        window._auditLog('ANAYASA_EDIT', 'anayasa_content', {
          versiyon_no: versiyonNo,
          belge_sayisi: draft.belgeler.length,
          kx_sayisi: draft.kx_kurallari.length
        });
      }

      alert('✅ Anayasa kaydedildi. Sayfa yeniden yüklenecek.');
      window.location.reload();
    } catch (err) {
      console.error('[ANAYASA_SAVE] HATA:', err);
      alert('❌ Kayıt hatası: ' + (err.message || err));
    }
  };

  // ─── Versiyon Geçmişi ───────────────────────────────
  window._anayasaShowVersions = async function() {
    if (!window.FB_DB) { alert('Firestore yok.'); return; }
    try {
      var orgPath = window._fsPathOrg ? window._fsPathOrg('master') : 'duay_company/master';
      var snap = await window.FB_DB.collection(orgPath).doc('anayasa_versions').collection('list').orderBy('_meta.son_guncelleme', 'desc').get();

      var modal = document.createElement('div');
      modal.id = 'anayasa-versions-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
      var h = '<div style="background:var(--s);border-radius:12px;width:600px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column">';
      h += '<div style="padding:16px 20px;border-bottom:0.5px solid var(--b);display:flex;justify-content:space-between;align-items:center"><div style="font-size:14px;font-weight:600">📜 Versiyon Geçmişi (son ' + MAX_VERSIONS + ')</div><button onclick="document.getElementById(\'anayasa-versions-modal\')?.remove()" style="font-size:13px;padding:6px 12px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer">Kapat</button></div>';
      h += '<div style="padding:12px 20px;overflow-y:auto;flex:1">';
      if (snap.empty) {
        h += '<div style="padding:32px;text-align:center;color:var(--t3);font-size:12px">Henüz versiyon yok.</div>';
      } else {
        snap.forEach(function(doc) {
          var d = doc.data();
          var m = d._meta || {};
          var t = m.son_guncelleme ? new Date(m.son_guncelleme).toLocaleString('tr-TR') : '?';
          h += '<div style="padding:10px;border:0.5px solid var(--b);border-radius:6px;margin-bottom:6px;font-size:11px">';
          h += '<div style="font-weight:600;color:var(--t)">' + _esc(doc.id) + '</div>';
          h += '<div style="color:var(--t3);margin-top:2px">' + t + ' · ' + _esc(m.son_guncelleyen || '?') + ' · ' + (d.belgeler?.length || 0) + ' belge · ' + (d.kx_kurallari?.length || 0) + ' KX</div>';
          h += '</div>';
        });
      }
      h += '</div></div>';
      modal.innerHTML = h;
      document.body.appendChild(modal);
    } catch (err) {
      console.error('[ANAYASA_VERSIONS] HATA:', err);
      alert('❌ Versiyon geçmişi okunamadı: ' + (err.message || err));
    }
  };

  // ─── Helpers ─────────────────────────────────────────
  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  console.log('[ANAYASA_ADMIN] V194e-3c yüklendi (super_admin only).');
})();
