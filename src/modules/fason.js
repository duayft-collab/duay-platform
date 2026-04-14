/* ── FASON ÜRETİM MODÜLÜ ─────────────────────────────────── */
/* FASON-MODUL-001 */
(function() {
  'use strict';

  var _FASON_KEY = 'ak_fason_v1';
  var _FASON_CHECK_KEY = 'ak_fason_check_v1';

  function _fasonLoad() {
    try { return JSON.parse(localStorage.getItem(_FASON_KEY) || '[]'); } catch(e) { return []; }
  }
  function _fasonStore(d) {
    try { localStorage.setItem(_FASON_KEY, JSON.stringify(d)); } catch(e) {}
  }
  function _fasonCheckLoad() {
    try { return JSON.parse(localStorage.getItem(_FASON_CHECK_KEY) || '[]'); } catch(e) { return []; }
  }
  function _fasonCheckStore(d) {
    try { localStorage.setItem(_FASON_CHECK_KEY, JSON.stringify(d)); } catch(e) {}
  }

  window.renderFason = function() {
    var p = document.getElementById('panel-fason');
    if (!p) return;
    if (!p.dataset.injected) {
      p.dataset.injected = '1';
      /* FASON-DEMO-SEED-001: ilk açılışta demo kayıt oluştur */
      if (typeof _fasonLoad === 'function') {
        var _mevcut = _fasonLoad();
        if (!_mevcut.length) {
          _fasonStore([{
            id: 'demo-' + Date.now(),
            urunAdi: 'Polyester Kumaş 8×8',
            fasonFirma: 'Test Fason Ltd.',
            miktar: 50,
            tarih: new Date(Date.now()+30*86400000).toISOString().slice(0,10),
            en: 1.70,
            uzunluk: 1000,
            iplikSpec: '1100dtex',
            atkuCozgu: '8×8',
            fiyat: 2.5,
            notlar: 'Demo kayıt — silinebilir',
            createdAt: new Date().toISOString(),
            durum: 'aktif'
          }]);
        }
      }
      p.innerHTML = '<div style="display:flex;flex-direction:column;height:100%">'
        /* FASON-HEADER-LAYOUT-001: sticky → relative, buton flex-shrink:0 + kısa metin */
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:0.5px solid var(--b);background:var(--sf);position:relative">'
        + '<div style="min-width:0"><div style="font-size:14px;font-weight:600;color:var(--t)">Fason Üretim</div>'
        + '<div style="font-size:10px;color:var(--t3)">Üretim emirleri · Kontrol listeleri · Numune etiketleri</div></div>'
        + '<button onclick="event.stopPropagation();window._fasonYeniEmir()" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;flex-shrink:0;white-space:nowrap">+ Yeni Emir</button>'
        + '</div>'
        + '<div id="fason-liste" style="flex:1;overflow-y:auto;padding:12px 20px"></div>'
        + '</div>';
    }
    window._fasonRenderListe();
  };

  window._fasonRenderListe = function() {
    var cont = document.getElementById('fason-liste');
    if (!cont) return;
    var liste = _fasonLoad().filter(function(e) { return !e.isDeleted; });
    if (!liste.length) {
      cont.innerHTML = '<div style="padding:60px;text-align:center;color:var(--t3)">'
        + '<div style="font-size:32px;margin-bottom:12px">🏭</div>'
        + '<div style="font-size:14px;font-weight:500">Üretim emri yok</div>'
        + '<div style="font-size:11px;margin-top:6px">Polyester kumaş, file, fermuarlı çanta vb. fason üretimlerinizi takip edin</div>'
        + '</div>';
      return;
    }
    var esc = window._esc || function(s) { return String(s || ''); };
    cont.innerHTML = liste.map(function(e) {
      var checkler = _fasonCheckLoad().filter(function(c) { return c.emirId === e.id; });
      var tamamlanan = checkler.filter(function(c) { return c.durum === 'tamam'; }).length;
      var toplamCheck = 8;
      var pct = Math.round((tamamlanan / toplamCheck) * 100);
      var renk = pct >= 100 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
      return '<div style="border:0.5px solid var(--b);border-radius:10px;padding:14px 16px;margin-bottom:10px;background:var(--sf);cursor:pointer" onclick="event.stopPropagation();window._fasonDetay?.(\'' + e.id + '\')">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        + '<div><div style="font-size:13px;font-weight:600;color:var(--t)">' + esc(e.urunAdi || 'İsimsiz') + '</div>'
        + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + esc(e.fasonFirma || '—') + ' · ' + esc(e.tarih || '—') + '</div></div>'
        + '<div style="text-align:right"><div style="font-size:18px;font-weight:700;color:' + renk + '">%' + pct + '</div>'
        + '<div style="font-size:9px;color:var(--t3)">' + tamamlanan + '/' + toplamCheck + ' kontrol</div></div>'
        + '</div>'
        + '<div style="height:4px;background:var(--b);border-radius:2px;overflow:hidden">'
        + '<div style="height:100%;background:' + renk + ';width:' + pct + '%;border-radius:2px;transition:width .3s"></div>'
        + '</div>'
        + '<div style="display:flex;gap:8px;margin-top:8px;font-size:9px;color:var(--t3)">'
        + '<span>📐 ' + esc(String(e.en || 1.70)) + 'm en</span>'
        + '<span>📏 ' + esc(String(e.uzunluk || 1000)) + 'm/top</span>'
        + '<span>🧵 ' + esc(e.iplikSpec || '1100dtex') + '</span>'
        + '<span>🔢 ' + esc(e.atkuCozgu || '8×8') + '/cm</span>'
        + '</div>'
        /* FASON-AKSIYON-001: Düzenle / Sil aksiyon butonları */
        + '<div class="fason-aksiyon" style="display:none;margin-top:8px;display:flex;gap:6px">'
        + '<button onclick="event.stopPropagation();window._fasonDuzenle(\'' + e.id + '\')"'
        + ' style="flex:1;font-size:10px;padding:4px;border:0.5px solid var(--b);border-radius:5px;'
        + 'background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">✏ Düzenle</button>'
        + '<button onclick="event.stopPropagation();window.confirmModal?.(\'Bu üretim emrini silmek istediğinize emin misiniz?\',{onConfirm:function(){window._fasonSil(\'' + e.id + '\')}})"'
        + ' style="flex:1;font-size:10px;padding:4px;border:0.5px solid #DC2626;border-radius:5px;'
        + 'background:transparent;cursor:pointer;font-family:inherit;color:#DC2626">🗑 Sil</button>'
        + '</div>'
        + '</div>';
    }).join('');
  };

  window._fasonYeniEmir = function(mevcut) {
    var mo = document.createElement('div');
    mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center';
    mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
    /* FASON-AKSIYON-001: düzenle modu — mevcut kayıt id'si dataset'e yazılır, _fasonKaydet okur */
    mo.dataset.editId = (mevcut && mevcut.id) || '';
    var _baslik = (mevcut && mevcut.id) ? 'Üretim Emri Düzenle' : 'Yeni Üretim Emri';
    var ic = '<div style="background:var(--sf);border-radius:12px;width:500px;max-height:85vh;overflow-y:auto;padding:20px">'
      + '<div style="font-size:14px;font-weight:600;margin-bottom:16px">' + _baslik + '</div>'
      + _fasonFormAlanlari(mevcut)
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'
      + '<button onclick="event.stopPropagation();this.closest(\'[style*=fixed]\').remove()" style="padding:7px 16px;border:0.5px solid var(--b);border-radius:7px;background:transparent;cursor:pointer;font-family:inherit;font-size:12px">İptal</button>'
      + '<button onclick="event.stopPropagation();window._fasonKaydet(this)" style="padding:7px 16px;border:none;border-radius:7px;background:var(--ac);color:#fff;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500">Kaydet</button>'
      + '</div></div>';
    mo.innerHTML = ic;
    document.body.appendChild(mo);
  };

  function _fasonFormAlanlari(e) {
    e = e || {};
    var esc = window._esc || function(s) { return String(s || ''); };
    var alan = function(lbl, id, val, tip) {
      return '<div style="margin-bottom:10px">'
        + '<div style="font-size:10px;font-weight:500;color:var(--t3);margin-bottom:3px">' + lbl + '</div>'
        + '<input id="fason-' + id + '" value="' + esc(String(val || '')) + '" type="' + (tip || 'text') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;padding:7px 10px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);color:var(--t);font-family:inherit;font-size:12px;box-sizing:border-box">'
        + '</div>';
    };
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">'
      + alan('Ürün Adı', 'urunAdi', e.urunAdi || 'Polyester Kumaş 8×8')
      + alan('Fason Firma', 'fasonFirma', e.fasonFirma || '')
      + alan('Sipariş Miktarı (top)', 'miktar', e.miktar || '', 'number')
      + alan('Termin Tarihi', 'tarih', e.tarih || '', 'date')
      + alan('Kumaş Eni (m)', 'en', e.en || '1.70', 'number')
      + alan('Top Uzunluğu (m)', 'uzunluk', e.uzunluk || '1000', 'number')
      + alan('İplik Spec', 'iplikSpec', e.iplikSpec || '1100dtex')
      + alan('Atkı × Çözgü (/cm)', 'atkuCozgu', e.atkuCozgu || '8×8')
      + alan('Birim Fiyat (USD/m)', 'fiyat', e.fiyat || '', 'number')
      + alan('Notlar', 'notlar', e.notlar || '')
      + '</div>';
  }

  window._fasonKaydet = function(btn) {
    var g = function(id) { return document.getElementById('fason-' + id)?.value?.trim() || ''; };
    var kayit = {
      id: 'fs-' + Date.now(),
      urunAdi: g('urunAdi'),
      fasonFirma: g('fasonFirma'),
      miktar: parseFloat(g('miktar')) || 0,
      tarih: g('tarih'),
      en: parseFloat(g('en')) || 1.70,
      uzunluk: parseFloat(g('uzunluk')) || 1000,
      iplikSpec: g('iplikSpec'),
      atkuCozgu: g('atkuCozgu'),
      fiyat: parseFloat(g('fiyat')) || 0,
      notlar: g('notlar'),
      createdAt: new Date().toISOString(),
      durum: 'aktif'
    };
    if (!kayit.urunAdi) {
      window.toast?.('Ürün adı zorunlu', 'warn');
      return;
    }
    var liste = _fasonLoad();
    /* FASON-AKSIYON-001: düzenle modunda mevcut kaydı güncelle */
    var _modal = btn.closest('[style*="fixed"]');
    var _editId = _modal && _modal.dataset ? _modal.dataset.editId : '';
    if (_editId) {
      var _idx = liste.findIndex(function(x){ return x.id === _editId; });
      if (_idx !== -1) {
        kayit.id = _editId;
        kayit.createdAt = liste[_idx].createdAt || kayit.createdAt;
        kayit.updatedAt = new Date().toISOString();
        liste[_idx] = Object.assign({}, liste[_idx], kayit);
      } else {
        liste.push(kayit);
      }
    } else {
      liste.push(kayit);
    }
    _fasonStore(liste);
    _modal?.remove();
    window.toast?.(_editId ? 'Üretim emri güncellendi ✓' : 'Üretim emri oluşturuldu ✓', 'ok');
    window._fasonRenderListe();
  };

  /* FASON-AKSIYON-001: düzenle + soft sil */
  window._fasonDuzenle = function(id) {
    var liste = _fasonLoad();
    var emir = liste.find(function(e){ return e.id === id; });
    if (!emir) return;
    window._fasonYeniEmir(emir);
  };

  window._fasonSil = function(id) {
    var liste = _fasonLoad();
    var idx = liste.findIndex(function(e){ return e.id === id; });
    if (idx === -1) return;
    liste[idx].isDeleted = true;
    liste[idx].deletedAt = new Date().toISOString();
    _fasonStore(liste);
    window.toast?.('Üretim emri silindi', 'ok');
    window._fasonRenderListe();
  };

})();
