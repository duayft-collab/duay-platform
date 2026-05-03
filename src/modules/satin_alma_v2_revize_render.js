/**
 * SATIS-LIST-REV-TREE-001 (V###.2)
 *
 * Satış teklif listesinde aynı teklifId'ye sahip kayıtları parent-child
 * hiyerarşi ile gruplar:
 *   - R01 (ilk teklif) = parent (ana satır, bold, üstte)
 *   - R02+ (revizyonlar) = child (indented, soluk, altta)
 *
 * window.renderSatisTeklifleri (app_patch.js:2152) override edilir.
 * app_patch.js orijinal kod DOKUNULMAZ (KX9 — 700+ satır yasağı).
 *
 * Persistence/Firestore/data shape sıfır değişiklik. Sadece görsel grouping.
 *
 * Anayasa uyumu:
 *   K01 ≤800 satır · KX3 yeni feature = yeni dosya
 *   KX5 saha test öncesi commit yok · KX8 anchor view birebir kopya
 *   KX9 app_patch.js'e feature eklenmez (override pattern)
 */
(function () {
  'use strict';

  if (window._saV2_revTreeApplied) return;
  window._saV2_revTreeApplied = true;

  /* Orijinal fn'i yedekle (override sonrası çağırmak için) */
  var _origRenderSatisTeklifleri = window.renderSatisTeklifleri;

  /**
   * Override: önce orijinali çağır (panel/header/stats/filtre kurulumu),
   * sonra liste container'ını (#satis-list) parent-child ile yeniden boya.
   */
  window.renderSatisTeklifleri = function () {
    if (typeof _origRenderSatisTeklifleri === 'function') {
      _origRenderSatisTeklifleri();
    }
    _saV2RenderRevTree();
  };

  /**
   * Liste container'ını parent-child hiyerarşi ile yeniden boya.
   * Filtreler orijinal fn ile aynı (search + durum + müşteri).
   */
  function _saV2RenderRevTree() {
    var cont = document.getElementById('satis-list');
    if (!cont) return;

    var d = (typeof loadSatisTeklifleri === 'function' ? loadSatisTeklifleri() : []) || [];
    if (!d.length) return; /* Empty state orijinal fn tarafından zaten yazıldı */

    /* Filtreleri DOM'dan oku (orijinal fn'in oluşturduğu input/select'ler) */
    var _stQ = (document.getElementById('st-srch') && document.getElementById('st-srch').value || '').toLowerCase().trim();
    var _stDur = document.getElementById('st-durum-filtre') && document.getElementById('st-durum-filtre').value || '';
    var _stMus = document.getElementById('st-musteri-filtre') && document.getElementById('st-musteri-filtre').value || '';

    /* Filtre uygula — orijinal fn ile birebir aynı logic */
    var filtreli = d.filter(function (t) {
      var _tMus = t.musteri || t.musteriAd || '';
      if (_stQ && !((t.teklifNo || t.teklifId || '').toLowerCase().indexOf(_stQ) !== -1
                    || _tMus.toLowerCase().indexOf(_stQ) !== -1
                    || (t.jobId || '').toLowerCase().indexOf(_stQ) !== -1)) return false;
      if (_stDur && t.durum !== _stDur) return false;
      if (_stMus && _tMus !== _stMus) return false;
      return true;
    });

    if (!filtreli.length) return; /* Boş filtre durumu orijinal fn yazdı */

    /* Grupla — teklifId paylaşılan grup anahtarı */
    var groups = {};
    filtreli.forEach(function (t) {
      var key = t.teklifId || t.teklifNo || ('_orphan_' + t.id);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    /* Her grup içinde revNo ASC — R01 önce, sonra R02, R03... (R01 = parent) */
    Object.keys(groups).forEach(function (k) {
      groups[k].sort(function (a, b) {
        var ra = parseInt(a.revNo) || 1;
        var rb = parseInt(b.revNo) || 1;
        return ra - rb;
      });
    });

    /* Grupları parent (R01)'in updatedAt/createdAt'ine göre DESC sırala */
    var groupKeys = Object.keys(groups).sort(function (a, b) {
      var pa = groups[a][0];
      var pb = groups[b][0];
      var da = new Date(pa.updatedAt || pa.createdAt || 0).getTime();
      var db = new Date(pb.updatedAt || pb.createdAt || 0).getTime();
      return db - da;
    });

    /* Render: her grup için parent satır + child satırları */
    var html = '';
    groupKeys.forEach(function (k) {
      var groupItems = groups[k];
      var parent = groupItems[0]; /* R01 */
      var children = groupItems.slice(1); /* R02+ */
      var hasChildren = children.length > 0;

      /* Parent satır */
      html += _saV2RenderRevItem(parent, false, hasChildren, k);

      /* Children — sarmalayıcı div ile (toggle hedefi) */
      if (hasChildren) {
        html += '<div class="st-rev-children" data-group="' + _saV2EscAttr(k) + '">';
        children.forEach(function (child) {
          html += _saV2RenderRevItem(child, true, false, k);
        });
        html += '</div>';
      }
    });

    cont.innerHTML = html;
  }

  /**
   * Tek item HTML'i. Parent ve child farkı sadece görsel:
   *   Parent: tam padding, bold müşteri adı 14px, ▼ toggle (children varsa)
   *   Child: sol indent (40px), küçük metin 12px, "└" prefix, marj/ürün-sayısı yok
   *
   * KX8: app_patch.js:2247-2335 item HTML deseninden birebir kopya
   * + indent wrapper + toggle prefix.
   */
  function _saV2RenderRevItem(t, isChild, hasChildren, groupKey) {
    var esc = window._esc || _saV2EscAttr;

    var STAT = { taslak: 'Taslak', gonderildi: 'Gönderildi', onay: 'Onay Bekliyor', kabul: 'Kabul Edildi', red: 'Reddedildi' };
    var badgeColors = { taslak: '#9CA3AF', gonderildi: '#3B82F6', onay: '#D97706', kabul: '#16A34A', red: '#DC2626' };
    var pillS = 'font-size:9px;padding:4px 10px;border-radius:5px;cursor:pointer;font-family:inherit;border:0.5px solid var(--b);background:transparent;color:var(--t2);';

    var bc = badgeColors[t.durum] || '#9CA3AF';
    var _teklifNo = t.teklifNo || t.teklifId || '—';
    var _musteri = t.musteri || t.musteriAd || '—';
    var _genelToplam = parseFloat(t.genelToplam || t.toplamSatis || t.toplam) || 0;
    var _paraBirimi = t.paraBirimi || 'TRY';

    /* Geçerlilik kontrolü */
    var _gec = t.gecerlilikTarihi || t.validUntil || '';
    var _sureBitti = false, _sureUyari = false;
    if (_gec) {
      var _bugun = new Date().toISOString().slice(0, 10);
      if (_gec < _bugun) {
        _sureBitti = true;
      } else {
        var _diffGun = Math.ceil((new Date(_gec).getTime() - new Date(_bugun).getTime()) / 86400000);
        if (_diffGun >= 0 && _diffGun <= 7) _sureUyari = true;
      }
    }
    var _leftBorder = _sureBitti ? '3px solid #A32D2D' : '3px solid transparent';

    /* Marj */
    var _rowMarj = _saV2RowMarj(t);
    var _rowMarjStr = _rowMarj === null ? '—' : '%' + String(_rowMarj.toFixed(1)).replace('.', ',');
    var _rowMarjColor = _rowMarj === null ? 'var(--t3)' : (_rowMarj >= 25 ? '#16A34A' : _rowMarj >= 10 ? '#D97706' : '#DC2626');

    /* CreatedAt */
    var _createdStr = t.createdAt ? new Date(t.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

    /* Ürün özeti — expand panel için */
    var _urunOzet = (t.urunler || []).slice(0, 5).map(function (u) {
      var _uad = esc(u.urunAdi || u.duayKodu || '—');
      var _miktar = parseFloat(u.miktar) || 0;
      var _sf = parseFloat(u.satisFiyat || u.satisF) || 0;
      var _toplam = _miktar * _sf;
      return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:0.5px dotted var(--b)"><span style="color:var(--t)">' + _uad + '</span><span style="color:var(--t3);font-family:monospace">' + _miktar.toLocaleString('tr-TR') + ' × ' + _sf.toLocaleString('tr-TR') + ' = <span style="color:var(--t);font-weight:600">' + _toplam.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + '</span></span></div>';
    }).join('') + ((t.urunler || []).length > 5 ? '<div style="font-size:10px;color:var(--t3);padding:3px 0">… ve ' + ((t.urunler || []).length - 5) + ' ürün daha</div>' : '');

    /* Layout farkı: parent vs child */
    var rowPadding = isChild ? '8px 16px 8px 40px' : '12px 16px';
    var nameSize = isChild ? '12px' : '14px';
    var nameWeight = isChild ? '500' : '700';
    var nameColor = isChild ? 'var(--t2)' : 'var(--t)';
    var bgColor = isChild ? 'transparent' : 'var(--sf)';

    /* Prefix: toggle / └ / · */
    var prefixHTML = '';
    if (isChild) {
      prefixHTML = '<span style="color:var(--t3);font-family:monospace;font-size:11px;flex-shrink:0;width:14px">└</span>';
    } else if (hasChildren) {
      prefixHTML = '<span class="st-rev-toggle" data-group="' + _saV2EscAttr(groupKey) + '" onclick="event.stopPropagation();window._saV2RevToggle(this.dataset.group)" style="color:var(--t2);font-size:11px;cursor:pointer;flex-shrink:0;width:14px;text-align:center;user-select:none" title="Revizyonları aç/kapa">▼</span>';
    } else {
      prefixHTML = '<span style="color:var(--t3);font-size:11px;flex-shrink:0;width:14px;text-align:center">·</span>';
    }

    /* Rev badge — R02+ için sarı, parent (R01 + children var) için mavi "orijinal" */
    var _revBadge = '';
    if (t.revNo && parseInt(t.revNo) > 1) {
      _revBadge = ' <span style="font-size:8px;background:#FEF3C7;color:#92400E;padding:1px 5px;border-radius:3px;font-family:inherit">R' + esc(t.revNo) + '</span>';
    } else if (!isChild && hasChildren) {
      _revBadge = ' <span style="font-size:8px;background:#E6F1FB;color:#0C447C;padding:1px 5px;border-radius:3px;font-family:inherit">R01 · orijinal</span>';
    }

    /* HTML — birebir orijinal pattern + indent + prefix */
    var html = '<div style="border-bottom:0.5px solid var(--b);border-left:' + _leftBorder + ';transition:background .1s;background:' + bgColor + '">';
    html += '<div onclick="event.stopPropagation();window._stToggleExpand && window._stToggleExpand(\'' + t.id + '\')" style="display:flex;align-items:center;gap:14px;padding:' + rowPadding + ';cursor:pointer" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'' + bgColor + '\'">';

    /* Prefix */
    html += prefixHTML;

    /* Sol: Müşteri adı + teklifNo */
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:' + nameSize + ';font-weight:' + nameWeight + ';color:' + nameColor + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(_musteri) + '</div>';
    html += '<div style="font-size:10px;color:var(--t3);margin-top:2px;font-family:monospace">' + esc(_teklifNo) + _revBadge + (t.jobId ? ' · <span style="color:var(--ac)">' + esc(t.jobId) + '</span>' : '') + (window._ordYoneticiMi && window._ordYoneticiMi() && t.ordNo ? ' <span style="margin-left:8px;color:#86868b;letter-spacing:0.3px;font-family:SF Mono,Monaco,monospace">🔒 ' + esc(t.ordNo) + '</span>' : '') + '</div>';
    html += '</div>';

    /* Ürün sayısı badge — parent only (child sade kalsın) */
    if (!isChild) {
      html += '<span style="display:inline-block;padding:2px 8px;font-size:10px;background:var(--s2);color:var(--t2);border-radius:10px;font-weight:500;font-variant-numeric:tabular-nums;flex-shrink:0;white-space:nowrap">' + (t.urunler || []).length + ' ürün</span>';
    }

    /* Tutar */
    html += '<div style="text-align:right;flex-shrink:0;min-width:130px"><div style="font-size:' + nameSize + ';font-weight:' + nameWeight + ';color:' + nameColor + ';white-space:nowrap;font-variant-numeric:tabular-nums">' + _genelToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' <span style="font-size:10px;font-weight:400;color:var(--t3)">' + esc(_paraBirimi) + '</span></div></div>';

    /* Marj — parent only */
    if (!isChild) {
      html += '<div style="text-align:right;flex-shrink:0;min-width:60px"><div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em">Marj</div><div style="font-size:13px;font-weight:700;color:' + _rowMarjColor + ';font-variant-numeric:tabular-nums">' + _rowMarjStr + '</div></div>';
    }

    /* Durum badge + uyarılar */
    html += '<div style="flex-shrink:0;display:flex;align-items:center;gap:4px;flex-wrap:wrap;max-width:170px"><span style="font-size:9px;padding:3px 10px;border-radius:99px;background:' + bc + '18;color:' + bc + ';font-weight:700;white-space:nowrap">' + (STAT[t.durum] || 'Taslak') + '</span>';
    if (_sureBitti) html += '<span style="font-size:9px;padding:2px 8px;border-radius:99px;background:#FCEBEB;color:#A32D2D;font-weight:600;white-space:nowrap" title="Süresi doldu: ' + esc(_gec) + '">Süresi Doldu</span>';
    if (_sureUyari) html += '<span title="Geçerlilik 7 gün içinde dolacak: ' + esc(_gec) + '" style="color:#D97706;font-size:14px;cursor:help">⚠</span>';
    html += '</div>';

    /* Aksiyon butonları (PDF + 📎 + ···) */
    html += '<div style="display:flex;gap:4px;flex-shrink:0">';
    html += '<button onclick="event.stopPropagation();window._btnGuard && window._btnGuard(this, function(){window._printSatisTeklif && window._printSatisTeklif(\'' + t.id + '\');}, 3000)" style="font-size:9px;padding:5px 14px;border-radius:5px;border:none;background:#185FA5;color:#fff;cursor:pointer;font-family:inherit;font-weight:600">PDF</button>';
    if (t.pdfUrls && t.pdfUrls.length) {
      html += '<a href="' + esc(t.pdfUrls[t.pdfUrls.length - 1].url) + '" target="_blank" onclick="event.stopPropagation()" title="Kayıtlı PDF R' + esc(t.pdfUrls[t.pdfUrls.length - 1].revNo) + ' — indir" style="font-size:12px;padding:4px 8px;border-radius:5px;border:0.5px solid var(--b);background:transparent;color:var(--t2);text-decoration:none;line-height:1;cursor:pointer">📎</a>';
    }
    html += '<button onclick="event.stopPropagation();window._stToggleExpand && window._stToggleExpand(\'' + t.id + '\')" title="Detayı aç/kapa" style="font-size:14px;padding:2px 10px;border-radius:5px;border:0.5px solid var(--b);background:transparent;cursor:pointer;font-family:inherit;color:var(--t2);line-height:1">···</button>';
    html += '</div>';

    html += '</div>'; /* satır kapanış */

    /* Inline expand panel — createdAt + ürün özeti + menü butonları */
    var expandPadLeft = isChild ? '40px' : '16px';
    html += '<div id="st-expand-' + t.id + '" style="display:none;padding:12px 16px 14px ' + expandPadLeft + ';background:var(--s2);border-top:0.5px solid var(--b)">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:10px;color:var(--t3)"><span>📅 Oluşturulma: <b style="color:var(--t2);font-family:monospace">' + esc(_createdStr) + '</b>' + (t.createdBy ? ' · <span style="color:var(--t3)">' + esc(t.createdBy) + '</span>' : '') + '</span><span>' + (t.urunler || []).length + ' ürün toplam</span></div>';
    if (_urunOzet) html += '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:6px;padding:8px 10px;margin-bottom:10px">' + _urunOzet + '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    html += '<button onclick="event.stopPropagation();window._stPeekAc && window._stPeekAc(\'' + t.id + '\')" style="' + pillS + '">Detay</button>';
    html += '<button onclick="event.stopPropagation();window._stKarAnaliz && window._stKarAnaliz(\'' + t.id + '\')" style="' + pillS + 'border-color:#0F6E56;color:#0F6E56">📊 Kar Analizi</button>';
    html += '<button onclick="event.stopPropagation();window._stPIGuncelle && window._stPIGuncelle(\'' + t.id + '\')" style="' + pillS + 'border-color:#185FA5;color:#185FA5">PI ↻</button>';
    html += '<button onclick="event.stopPropagation();window._saV2TeklifDuzenle && window._saV2TeklifDuzenle(\'' + t.id + '\')" style="' + pillS + '">Düzenle</button>';
    html += '<button onclick="event.stopPropagation();window._saV2DurumDegistir && window._saV2DurumDegistir(\'' + t.id + '\')" style="' + pillS + '">Durum</button>';
    if (t.durum !== 'taslak') html += '<button onclick="event.stopPropagation();window._reviseSatisTeklif && window._reviseSatisTeklif(\'' + t.id + '\')" style="' + pillS + 'border-color:var(--ac);color:var(--ac)">Rev</button>';
    if (t.durum === 'kabul') html += '<button onclick="event.stopPropagation();window._createPR && window._createPR(\'' + t.id + '\')" style="' + pillS + 'border-color:#D97706;color:#D97706">PR</button>';
    html += '<button onclick="event.stopPropagation();window._saV2TeklifKopya && window._saV2TeklifKopya(\'' + t.id + '\')" style="' + pillS + '">Kopyala</button>';
    html += '<button onclick="event.stopPropagation();window._saV2TeklifSil && window._saV2TeklifSil(\'' + t.id + '\')" style="' + pillS + 'border-color:#A32D2D;color:#A32D2D">Sil</button>';
    html += '</div>';
    html += '</div>'; /* expand kapanış */

    html += '</div>'; /* dış kapanış */

    return html;
  }

  /**
   * Per-row marj hesabı — orijinal fn'deki _stMarjPct'ten birebir kopya.
   */
  function _saV2RowMarj(t) {
    var urunler = t.urunler || [];
    if (!urunler.length) return null;
    var ms = urunler.map(function (u) {
      var sf = parseFloat(u.satisFiyat || u.satisF) || 0;
      var af = parseFloat(u.alisF) || 0;
      return sf > 0 ? ((sf - af) / sf) * 100 : null;
    }).filter(function (m) { return m !== null; });
    if (!ms.length) return null;
    return ms.reduce(function (a, b) { return a + b; }, 0) / ms.length;
  }

  /**
   * HTML attribute ve text escape — window._esc fallback.
   */
  function _saV2EscAttr(s) {
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Toggle (▼/▶) handler — bir grubun child satırlarını aç/kapa.
   * Global: window._saV2RevToggle
   */
  window._saV2RevToggle = function (groupKey) {
    var children = document.querySelector('.st-rev-children[data-group="' + groupKey + '"]');
    var toggle = document.querySelector('.st-rev-toggle[data-group="' + groupKey + '"]');
    if (!children || !toggle) return;
    var hidden = children.style.display === 'none';
    children.style.display = hidden ? 'block' : 'none';
    toggle.textContent = hidden ? '▼' : '▶';
  };

  /* SATIS-LIST-REV-TREE-001 — V###.2 sonu */
})();
