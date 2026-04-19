/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/satis_teklif.js  —  v1.0.0
 * Satış Teklif Modülü — Proforma Invoice
 * localStorage: ak_satis_teklif1
 * ════════════════════════════════════════════════════════════════
 */
'use strict';

var ST_KEY = 'ak_satis_teklif1';
var ST_CURRENCIES = ['TRY','USD','EUR','GBP','JPY','CNY','AED','XAU','BTC'];
var ST_INCOTERMS = ['EXW','FOB','CFR','CIF','DDP','FCA','CPT','CIP','DAP','DPU'];
var ST_LANGS = ['TR','EN','CN','AR','RU'];

/**
 * Çok dilli teklif çeviri tablosu — form etiketleri + PDF başlıkları.
 * Yeni anahtar eklerken her dile karşılığını eklemek zorunlu.
 */
var ST_T = {
  TR: { customer:'MÜŞTERİ', quoteNo:'TEKLİF NO', date:'TARİH', validity:'GEÇERLİLİK', deliveryTime:'TESLİM SÜRESİ', incoterm:'TESLİM ŞEKLİ', currency:'PARA BİRİMİ', lang:'DİL', items:'ÜRÜN SATIRLARI', addItem:'+ Ürün Ekle', total:'Toplam', terms:'ŞARTLAR & KOŞULLAR', bank:'BANKA BİLGİLERİ', notes:'NOTLAR', save:'Kaydet', cancel:'İptal', no:'NO', desc:'AÇIKLAMA', qty:'MİKTAR', unit:'BİRİM', unitPrice:'BİRİM FİYAT', proforma:'PROFORMA FATURA', ref:'REF', to:'ALICI', details:'BİLGİLER', delivery:'Teslim', termsTitle:'ŞARTLAR & KOŞULLAR', bankTitle:'BANKA BİLGİLERİ', footer:'Bu proforma fatura yalnızca bilgilendirme amaçlıdır.', print:'🖨 Yazdır / PDF' },
  EN: { customer:'CUSTOMER', quoteNo:'QUOTE NO', date:'DATE', validity:'VALIDITY', deliveryTime:'DELIVERY TIME', incoterm:'INCOTERM', currency:'CURRENCY', lang:'LANGUAGE', items:'ITEM LINES', addItem:'+ Add Item', total:'Total', terms:'TERMS & CONDITIONS', bank:'BANKING DETAILS', notes:'NOTES', save:'Save', cancel:'Cancel', no:'NO', desc:'DESCRIPTION', qty:'QTY', unit:'UNIT', unitPrice:'UNIT PRICE', proforma:'PROFORMA INVOICE', ref:'REF', to:'TO', details:'DETAILS', delivery:'Delivery', termsTitle:'TERMS & CONDITIONS', bankTitle:'BANKING DETAILS', footer:'This proforma invoice is for informational purposes only.', print:'🖨 Print / PDF' },
  CN: { customer:'客户', quoteNo:'报价单号', date:'日期', validity:'有效期', deliveryTime:'交货时间', incoterm:'贸易条款', currency:'货币', lang:'语言', items:'产品行', addItem:'+ 添加项目', total:'总计', terms:'条款和条件', bank:'银行详情', notes:'备注', save:'保存', cancel:'取消', no:'编号', desc:'描述', qty:'数量', unit:'单位', unitPrice:'单价', proforma:'形式发票', ref:'参考', to:'收件人', details:'详情', delivery:'交货', termsTitle:'条款和条件', bankTitle:'银行详情', footer:'此形式发票仅供参考。', print:'🖨 打印 / PDF' },
  AR: { customer:'العميل', quoteNo:'رقم العرض', date:'التاريخ', validity:'الصلاحية', deliveryTime:'وقت التسليم', incoterm:'شروط التسليم', currency:'العملة', lang:'اللغة', items:'بنود المنتج', addItem:'+ إضافة بند', total:'المجموع', terms:'الشروط والأحكام', bank:'تفاصيل البنك', notes:'ملاحظات', save:'حفظ', cancel:'إلغاء', no:'الرقم', desc:'الوصف', qty:'الكمية', unit:'الوحدة', unitPrice:'سعر الوحدة', proforma:'فاتورة مبدئية', ref:'مرجع', to:'إلى', details:'التفاصيل', delivery:'التسليم', termsTitle:'الشروط والأحكام', bankTitle:'تفاصيل البنك', footer:'هذه الفاتورة المبدئية للأغراض الإعلامية فقط.', print:'🖨 طباعة / PDF' },
  RU: { customer:'КЛИЕНТ', quoteNo:'НОМЕР ПРЕДЛОЖЕНИЯ', date:'ДАТА', validity:'СРОК ДЕЙСТВИЯ', deliveryTime:'СРОК ДОСТАВКИ', incoterm:'ИНКОТЕРМС', currency:'ВАЛЮТА', lang:'ЯЗЫК', items:'СТРОКИ ТОВАРОВ', addItem:'+ Добавить', total:'Итого', terms:'УСЛОВИЯ', bank:'БАНКОВСКИЕ ДАННЫЕ', notes:'ПРИМЕЧАНИЯ', save:'Сохранить', cancel:'Отмена', no:'НО', desc:'ОПИСАНИЕ', qty:'КОЛ-ВО', unit:'ЕДИНИЦА', unitPrice:'ЦЕНА', proforma:'ПРОФОРМА-СЧЁТ', ref:'РЕФ', to:'КОМУ', details:'ДЕТАЛИ', delivery:'Доставка', termsTitle:'УСЛОВИЯ', bankTitle:'БАНКОВСКИЕ ДАННЫЕ', footer:'Этот проформа-счёт носит только информационный характер.', print:'🖨 Печать / PDF' }
};
function _stT(key, lang) { return (ST_T[lang] || ST_T.TR)[key] || key; }

/**
 * Form içindeki [data-stk] etiketlerini canlı olarak günceller.
 * Dil dropdown onchange ile çağrılır — modal yeniden render edilmeden
 * sadece textContent değişir, kullanıcı verisi korunur.
 * @param {string} newLang Yeni dil kodu (TR/EN/CN/AR/RU)
 */
window._stChangeLang = function(newLang) {
  var modal = document.getElementById('mo-satis-teklif');
  if (!modal) return;
  modal.querySelectorAll('[data-stk]').forEach(function(el) {
    var key = el.getAttribute('data-stk');
    el.textContent = _stT(key, newLang);
  });
};

function _loadST() {
  // SINGLE-SOURCE-OF-TRUTH: Firestore sync'li platform fonksiyonu birincil
  if (typeof window.loadSatisTeklifleri === 'function') {
    try { return window.loadSatisTeklifleri() || []; } catch(e) { console.warn('[_loadST platform]', e); }
  }
  try { return JSON.parse(localStorage.getItem(ST_KEY) || '[]'); } catch(e) { return []; }
}
function _storeST(d) {
  // DUAL-WRITE: localStorage + Firestore birlikte (platform delegate)
  if (typeof window.storeSatisTeklifleri === 'function') {
    try {
      var _r = window.storeSatisTeklifleri(d);
      // EK-A: Platform Promise dönerse async güvenli handle et
      if (_r && typeof _r.then === 'function') {
        _r.then(function(){ /* ok */ }).catch(function(e){ console.error('[_storeST platform async]', e); });
      }
      return _r;
    } catch(e) { console.warn('[_storeST platform]', e); }
  }
  // Fallback: lokal + explicit Firestore
  try { localStorage.setItem(ST_KEY, JSON.stringify(d)); } catch(e) { console.error('[_storeST local]', e); }
  try {
    if (typeof window._syncFirestore === 'function' && typeof window._fsPath === 'function') {
      var _fp = window._fsPath('satisTeklifleri');
      if (_fp) window._syncFirestore(_fp, d);
    }
  } catch(e) { console.error('[_storeST firestore]', e); }
}

function _generateTeklifNo() {
  var year = new Date().getFullYear();
  var prefix = 'TKF-' + year + '-';
  var existing = _loadST();
  var maxNum = 0;
  existing.forEach(function(t) { var n = parseInt((t.teklifNo || '').replace(prefix, '')) || 0; if (n > maxNum) maxNum = n; });
  return prefix + String(maxNum + 1).padStart(6, '0');
}

/**
 * Teklif listesi render.
 */
function renderSatisTeklif() {
  var panel = document.getElementById('panel-satis-teklifleri');
  if (!panel) return;
  if (!panel.dataset.injected) {
    panel.dataset.injected = '1';
    panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-primary);position:sticky;top:0;z-index:200">'
      + '<div><div style="font-size:14px;font-weight:700;color:var(--t)">📤 Satış Teklifleri</div><div style="font-size:10px;color:var(--t3)">Proforma Invoice yönetimi</div></div>'
      + '<div style="display:flex;gap:6px"><button id="stek-toplu-sil-btn" onclick="event.stopPropagation();window._stekTopluSil()" class="btn btns btnd" style="font-size:11px;display:none">Seçilenleri Sil</button><button class="btn btns" onclick="window._exportSTXlsx?.()" style="font-size:11px">⬇ Excel</button><button class="btn btnp" onclick="window._openSTModal?.(null)" style="font-size:12px;font-weight:600">+ Yeni Teklif</button></div>'
    + '</div>'
    + '<div style="padding:8px 16px;border-bottom:1px solid var(--b);display:flex;gap:8px;background:var(--s2);align-items:center">'
      + '<input class="fi" id="st-search" placeholder="🔍 Teklif no, müşteri ara..." oninput="renderSatisTeklif()" style="font-size:11px;flex:1">'
      + '<select class="fi" id="st-musteri-filter" onchange="renderSatisTeklif()" style="font-size:11px;width:220px"><option value="">Tüm müşteriler</option></select>'
      /* SATIS-LISTE-DURUM-FILTRE-001: durum filtresi dropdown */
      + '<select id="st-durum-filtre" onchange="event.stopPropagation();window.renderSatisTeklif?.()" style="font-size:10px;padding:4px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
        + '<option value="">Tüm Durumlar</option>'
        + '<option value="taslak">Taslak</option>'
        + '<option value="gonderildi">Gönderildi</option>'
        + '<option value="onay">Onay Bekliyor</option>'
        + '<option value="kabul">Kabul</option>'
        + '<option value="red">Reddedildi</option>'
      + '</select>'
    + '</div>'
    + '<div id="st-list"></div>';
  }

  var data = _loadST();
  var search = (document.getElementById('st-search')?.value || '').toLowerCase();
  var musteriFiltre = document.getElementById('st-musteri-filter')?.value || '';
  // SATIS-LISTE-UX-001: Müşteri filter dropdown'ı dinamik populate
  var _musFilEl = document.getElementById('st-musteri-filter');
  if (_musFilEl) {
    var _mevcut = _musFilEl.value;
    var _musSet = {};
    data.forEach(function(t) { if (t.customerName) _musSet[t.customerName] = true; });
    var _opts = '<option value="">Tüm müşteriler</option>' + Object.keys(_musSet).sort().map(function(m) { return '<option value="' + window._esc(m) + '"' + (m === _mevcut ? ' selected' : '') + '>' + window._esc(m) + '</option>'; }).join('');
    if (_musFilEl.innerHTML !== _opts) _musFilEl.innerHTML = _opts;
  }
  /* SATIS-LISTE-DURUM-FILTRE-001: durum filtresi — status veya durum alanını kontrol et */
  var durumFiltre = document.getElementById('st-durum-filtre')?.value || '';
  var fl = data.filter(function(t) {
    if (musteriFiltre && t.customerName !== musteriFiltre) return false;
    if (durumFiltre && (t.status || t.durum || '') !== durumFiltre) return false;
    if (!search) return true;
    return (t.teklifNo || '').toLowerCase().includes(search) || (t.piNo || '').toLowerCase().includes(search) || (t.customerName || '').toLowerCase().includes(search) || (t.jobId || '').toLowerCase().includes(search) || (t.currency || '').toLowerCase().includes(search) || (t.incoterm || '').toLowerCase().includes(search);
  }).sort(function(a, b) { return (b.id || 0) - (a.id || 0); });

  var cont = document.getElementById('st-list');
  if (!cont) return;
  var esc = window._esc;

  /* Sayfalama */
  if (!window._stekSayfa) window._stekSayfa = 1;
  if (search) window._stekSayfa = 1;
  var STEK_SAYFA_BOYUT = 50;
  var stToplamSayfa = Math.max(1, Math.ceil(fl.length / STEK_SAYFA_BOYUT));
  if (window._stekSayfa > stToplamSayfa) window._stekSayfa = stToplamSayfa;
  var stBaslangic = (window._stekSayfa - 1) * STEK_SAYFA_BOYUT;
  var sayfaListe = fl.slice(stBaslangic, stBaslangic + STEK_SAYFA_BOYUT);

  if (!fl.length) {
    cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:28px">📤</div><div style="margin-top:8px">Teklif bulunamadı</div><button class="btn btnp" onclick="window._openSTModal?.(null)" style="margin-top:12px;font-size:12px">+ İlk Teklifi Oluştur</button></div>';
    return;
  }

  // SATIS-LISTE-UX-001: Durum badge renk haritasi
  var ST_DURUM = {
    taslak:     { bg:'#9CA3AF18', color:'#6B7280', label:'Taslak' },
    onaylandi:  { bg:'#16A34A18', color:'#16A34A', label:'Onaylandı' },
    reddedildi: { bg:'#DC262618', color:'#DC2626', label:'Reddedildi' },
    revizyon:   { bg:'#D9770618', color:'#D97706', label:'Revizyon' }
  };
  var html = '<div style="display:grid;grid-template-columns:28px 110px 130px 1fr 140px 100px 90px 120px;padding:6px 16px;background:var(--s2);border-bottom:1px solid var(--b);font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;position:sticky;top:0;z-index:2">'
    + '<div><input type="checkbox" onchange="event.stopPropagation();window._stekTopluChk(this.checked)"></div><div>Teklif No</div><div>PI No</div><div>Müşteri</div><div>Tutar</div><div>Durum</div><div>Tarih</div><div>İşlem</div></div>';

  sayfaListe.forEach(function(t) {
    var total = (t.items || []).reduce(function(a, i) { return a + (parseFloat(i.total) || 0); }, 0);
    var st = ST_DURUM[t.status] || ST_DURUM.taslak;
    /* SATIS-KAR-BADGE-001: kar oranı badge (alış verisi varsa görünür) */
    var karInfo = window._stKarHesapla ? window._stKarHesapla(t) : null;
    var karBadge = (karInfo && karInfo.oran) ? (
      '<span style="font-size:9px;padding:1px 6px;border-radius:99px;margin-left:6px;background:'
      +(karInfo.oran>=20?'#EAF3DE':'#FCEBEB')+';color:'+(karInfo.oran>=20?'#3B6D11':'#A32D2D')+';font-weight:600" title="Kar oranı">'
      +karInfo.oran+'%</span>'
    ) : '';
    html += '<div style="display:grid;grid-template-columns:28px 110px 130px 1fr 140px 100px 90px 120px;padding:8px 16px;border-bottom:1px solid var(--b);align-items:center;font-size:11px;cursor:pointer;transition:background .1s" onclick="event.stopPropagation();window._stPeek?.(' + t.id + ')" onmouseenter="this.style.background=\'var(--s2)\'" onmouseleave="this.style.background=\'\'">'
      + '<div onclick="event.stopPropagation()"><input type="checkbox" class="stek-row-chk" data-id="' + t.id + '" onchange="event.stopPropagation();window._stekChkGuncelle()"></div>'
      + '<div style="font-family:monospace;font-weight:600;color:var(--ac)">' + esc(t.teklifNo || '—') + '</div>'
      + '<div style="font-family:monospace;font-size:11px;color:' + (t.piNo ? 'var(--t2)' : 'var(--t3)') + '">' + esc(t.piNo || '—') + '</div>'
      + '<div style="font-weight:500">' + esc(t.customerName || '—') + '</div>'
      + '<div style="font-weight:700">' + total.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' <span style="font-size:10px;font-weight:400;color:var(--t3)">' + esc(t.currency || 'USD') + '</span>' + karBadge + '</div>'
      + '<div><span style="font-size:9px;padding:3px 10px;border-radius:99px;background:' + st.bg + ';color:' + st.color + ';font-weight:700;white-space:nowrap">' + st.label + '</span></div>'
      + '<div style="color:var(--t3)">' + (t.date || '—') + '</div>'
      + '<div style="display:flex;gap:3px">'
        + '<select onchange="event.stopPropagation();window._stDurumGuncelle?.(' + t.id + ',this.value)" onclick="event.stopPropagation()" style="font-size:9px;padding:2px 4px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t2);font-family:inherit;cursor:pointer">'
          + '<option value="taslak"' + (t.status === 'taslak' ? ' selected' : '') + '>Taslak</option>'
          + '<option value="gonderildi"' + (t.status === 'gonderildi' ? ' selected' : '') + '>Gönderildi</option>'
          + '<option value="onay"' + (t.status === 'onay' ? ' selected' : '') + '>Onay</option>'
          + '<option value="kabul"' + (t.status === 'kabul' ? ' selected' : '') + '>Kabul</option>'
          + '<option value="red"' + (t.status === 'red' ? ' selected' : '') + '>Reddedildi</option>'
        + '</select>'
        + '<button onclick="event.stopPropagation();window._stPreview?.(' + t.id + ',1)" class="btn btns" style="font-size:10px;padding:2px 6px" title="Standard PDF">📄</button>'
        + '<button onclick="event.stopPropagation();window._stKarAnaliz?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px" title="Kar Analizi">📊</button>'
        + '<button onclick="event.stopPropagation();window._openSTModal?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">✏️</button>'
        + '<button onclick="event.stopPropagation();window._stUpdatePI?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px" title="PI Güncelle">🔄</button>'
        + '<button onclick="event.stopPropagation();window._copyST?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px">📋</button>'
        + '<button onclick="event.stopPropagation();window._deleteST?.(' + t.id + ')" class="btn btns" style="font-size:10px;padding:2px 6px;color:#DC2626">🗑</button>'
      + '</div>'
    + '</div>';
  });
  /* Sayfalama footer */
  if (fl.length > STEK_SAYFA_BOYUT) {
    html += '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;font-size:11px;border-top:1px solid var(--b);background:var(--s2)">';
    html += '<span style="color:var(--t2)">' + (stBaslangic + 1) + '–' + Math.min(stBaslangic + STEK_SAYFA_BOYUT, fl.length) + ' / ' + fl.length + ' teklif</span>';
    html += '<div style="margin-left:auto;display:flex;gap:4px">';
    html += '<button class="btn btns" onclick="event.stopPropagation();window._stekSayfa=Math.max(1,window._stekSayfa-1);renderSatisTeklif()" style="font-size:10px;padding:3px 8px"' + (window._stekSayfa <= 1 ? ' disabled' : '') + '>\u2190</button>';
    for (var spi = 1; spi <= Math.min(stToplamSayfa, 7); spi++) { html += '<button class="btn ' + (spi === window._stekSayfa ? 'btnp' : 'btns') + '" onclick="event.stopPropagation();window._stekSayfa=' + spi + ';renderSatisTeklif()" style="font-size:10px;padding:3px 8px">' + spi + '</button>'; }
    if (stToplamSayfa > 7) html += '<span style="color:var(--t3)">... ' + stToplamSayfa + '</span>';
    html += '<button class="btn btns" onclick="event.stopPropagation();window._stekSayfa=Math.min(' + stToplamSayfa + ',window._stekSayfa+1);renderSatisTeklif()" style="font-size:10px;padding:3px 8px"' + (window._stekSayfa >= stToplamSayfa ? ' disabled' : '') + '>\u2192</button>';
    html += '</div></div>';
  }

  cont.innerHTML = html;
}

/**
 * SATIS-DURUM-INLINE-001
 * Satış teklifi durumunu inline dropdown ile günceller.
 * @param {number} id Teklif id
 * @param {string} yeniDurum taslak|gonderildi|onay|kabul|red
 */
window._stDurumGuncelle = function(id, yeniDurum) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) return;
  t.status = yeniDurum;
  t.updatedAt = new Date().toISOString();
  _storeST(data);
  window.toast?.('Durum güncellendi: ' + yeniDurum, 'ok');
  // SATIS-NOTIF-CRM-001: gönderildi durumunda bildirim + CRM follow-up
  if (yeniDurum === 'gonderildi') {
    var _teklifNo = t.teklifNo || ('#' + t.id);
    var _musteri = t.customerName || '';
    window.addNotif?.('📤', 'Satış teklifi müşteriye iletildi: ' + _musteri, 'ok', 'satis');
    window.logActivity?.('satis', 'Satış teklifi gönderildi: ' + _teklifNo);
    if (typeof window.addCRMTask === 'function') {
      var _crm3gun = new Date(); _crm3gun.setDate(_crm3gun.getDate() + 3);
      window.addCRMTask({
        baslik: 'Teklif takibi: ' + _musteri,
        musteriId: t.cariId || '',
        tarih: _crm3gun.toISOString().slice(0, 10),
        not: 'Satış teklifi ' + _teklifNo + ' gönderildi. 3 gün sonra takip.',
        kaynak: 'satis-teklif',
        kaynakId: t.id || ''
      });
    }
  }
  // SATIS-KABUL-TAHSILAT-001: kabul durumunda otomatik tahsilat kaydı oluştur
  if (yeniDurum === 'kabul') {
    window.toast?.('✅ Kabul edildi — Tahsilat oluşturmayı unutmayın!', 'ok');
    if (typeof loadTahsilat === 'function' && typeof storeTahsilat === 'function') {
      var toplamTutar = (t.items||[]).reduce(function(s,i){ return s+(parseFloat(i.total)||0); }, 0);
      if (toplamTutar > 0) {
        var tahsilat = {
          id: typeof generateNumericId==='function' ? generateNumericId() : Date.now(),
          name: 'Satış: ' + (t.teklifNo||t.customerName||'Teklif'),
          cariName: t.customerName || '',
          amount: toplamTutar.toFixed(2),
          currency: t.currency || 'USD',
          tip: 'tahsilat', _src: 'tahsilat', type: 'tahsilat',
          teklifId: t.id,
          due: t.date || new Date().toISOString().slice(0,10),
          collected: false,
          ts: new Date().toISOString(),
          createdBy: window.Auth?.getCU?.()?.uid || '',
          source: 'satis-kabul'
        };
        var tahStore = loadTahsilat();
        tahStore.unshift(tahsilat);
        storeTahsilat(tahStore);
        window.toast?.('📥 Tahsilat kaydı oluşturuldu (' + (t.currency||'USD') + ' ' + toplamTutar.toLocaleString('tr-TR') + ')', 'ok');
        /* SATIS-CARI-ALACAK-001: kabul edilen teklif için müşteri cari hesabına alacak kaydı */
        if (typeof loadCari === 'function' && typeof storeCari === 'function') {
          var cariList = loadCari();
          var cariKayit = cariList.find(function(c) {
            return c.name === t.customerName
              || c.id === t.cariId
              || c.musteri === t.customerName;
          });
          if (cariKayit) {
            if (!Array.isArray(cariKayit.islemler)) cariKayit.islemler = [];
            cariKayit.islemler.unshift({
              tarih: new Date().toISOString().slice(0,10),
              aciklama: 'Satış teklifi kabul: ' + (t.teklifNo||t.piNo||'PI'),
              tutar: toplamTutar,
              para: t.currency||'USD',
              tip: 'alacak',
              teklifId: t.id,
              source: 'satis-kabul'
            });
            cariKayit.updatedAt = new Date().toISOString();
            storeCari(cariList);
            window.toast?.('Cari hesap güncellendi ✓', 'ok');
          }
        }
      }
    }
  }
  renderSatisTeklif();
};

/**
 * Hızlı önizleme paneli (peek) — sağdan kayan slide-in.
 * Teklif satırına tıklanınca açılır, kapat butonu ile kapanır.
 * Gösterilenler: teklif no, müşteri adı, tutar, para birimi, tarih,
 * ürün sayısı, durum. Tüm iç element'ler stopPropagation kullanır.
 * @param {number} id Teklif id
 */
window._stPeek = function(id) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) return;
  var esc = window._esc;
  // Onceki paneli temizle
  var oldPeek = document.getElementById('mo-st-peek');
  if (oldPeek) oldPeek.remove();

  var total = (t.items || []).reduce(function(a, i) { return a + (parseFloat(i.total) || 0); }, 0);
  var itemCount = (t.items || []).length;
  var status = t.status || (t.previousTeklifNo ? 'PI Güncellendi' : 'Aktif');

  var panel = document.createElement('div');
  panel.id = 'mo-st-peek';
  panel.style.cssText = 'position:fixed;top:0;right:0;width:360px;max-width:90vw;height:100vh;background:var(--sf);border-left:1px solid var(--b);box-shadow:-4px 0 24px rgba(0,0,0,.12);z-index:9999;overflow-y:auto;transform:translateX(100%);transition:transform .25s ease-out';
  panel.onclick = function(e) { e.stopPropagation(); };
  panel.innerHTML = ''
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--b);background:var(--s2);position:sticky;top:0;z-index:1">'
      + '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">📤</span><span style="font-size:13px;font-weight:600;color:var(--t)">Teklif Önizleme</span></div>'
      + '<button onclick="event.stopPropagation();document.getElementById(\'mo-st-peek\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3);padding:2px 10px;border-radius:6px;line-height:1" title="Kapat">×</button>'
    + '</div>'
    + '<div style="padding:18px">'
      + '<div style="margin-bottom:14px"><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Teklif No</div><div style="font-family:monospace;font-size:14px;font-weight:700;color:var(--ac)">' + esc(t.teklifNo || '—') + '</div></div>'
      + '<div style="margin-bottom:14px"><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Müşteri</div><div style="font-size:13px;font-weight:500;color:var(--t)">' + esc(t.customerName || '—') + '</div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'
        + '<div><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Tutar</div><div style="font-size:14px;font-weight:700;color:var(--t)">' + total.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</div></div>'
        + '<div><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Para Birimi</div><div style="font-size:14px;font-weight:700;color:var(--t)">' + esc(t.currency || 'USD') + '</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'
        + '<div><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Tarih</div><div style="font-size:12px;color:var(--t2);font-family:monospace">' + esc(t.date || '—') + '</div></div>'
        + '<div><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Ürün Sayısı</div><div style="font-size:12px;color:var(--t)">' + itemCount + ' kalem</div></div>'
      + '</div>'
      + '<div style="margin-bottom:14px"><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Durum</div><div style="font-size:12px"><span style="display:inline-block;padding:3px 12px;border-radius:99px;background:var(--al);color:var(--ac);font-weight:600;font-size:11px">' + esc(status) + '</span></div></div>'
      + '<div style="display:flex;gap:6px;margin-top:18px;padding-top:14px;border-top:1px solid var(--b)">'
        + '<button onclick="event.stopPropagation();window._openSTModal?.(' + t.id + ');document.getElementById(\'mo-st-peek\')?.remove()" class="btn btnp" style="flex:1;font-size:11px">✏️ Düzenle</button>'
        + '<button onclick="event.stopPropagation();window._stPreview?.(' + t.id + ',1)" class="btn btns" style="font-size:11px">📄 PDF</button>'
      + '</div>'
    + '</div>';

  document.body.appendChild(panel);
  // Sağdan kayan animasyon
  setTimeout(function() { panel.style.transform = 'translateX(0)'; }, 10);
};

/**
 * Teklif formu modalı.
 */
window._openSTModal = function(id) {
  var old = document.getElementById('mo-satis-teklif'); if (old) old.remove();
  var data = _loadST();
  var t = id ? data.find(function(x) { return x.id === id; }) : null;
  var esc = window._esc;

  // Müşteri listesi — SATIS-MUSTERI-DATALIST-001: cari + geçmiş teklif müşterileri birleşik
  /* SATIS-MUSTERI-MULTIUSER-FIX-001: loadCari({tumKullanicilar:true}) — multi-user ortamda başka kullanıcıların cari kayıtları da görünsün */
  /* SATIS-MUSTERI-FIELD-FIX-001: exhaustive müşteri filtresi — type/tip/cariType alan varyasyonları */
  var cariList = typeof loadCari === 'function' ? loadCari({tumKullanicilar:true}).filter(function(c) {
    return !c.isDeleted && (
      c.type === 'musteri' || c.type === 'Müşteri' || c.tip === 'musteri' || c.cariType === 'onayli' || !c.type
    );
  }) : [];
  /* SATIS-MUSTERI-FALLBACK-001: filtre sonrası boşsa tüm non-deleted cari'leri göster (tüm kullanıcılar) */
  if (cariList.length === 0 && typeof loadCari === 'function') {
    cariList = loadCari({tumKullanicilar:true}).filter(function(c) { return !c.isDeleted; });
  }
  /* SATIS-MUSTERI-TITLE-FALLBACK-001: isim alanı chain'ine c.title + c.unvan eklendi (type-eksik kayıt fallback) */
  var _cariAdlar = cariList.map(function(c) { return c.name || c.ad || c.firmaAdi || c.title || c.unvan || ''; }).filter(Boolean);
  // Geçmiş tekliflerden de unique müşteri adlarını topla (cari'de olmayan eski müşteriler için)
  try {
    var _stGecmis = typeof _loadST === 'function' ? _loadST() : [];
    _stGecmis.forEach(function(st) { if (st.customerName && _cariAdlar.indexOf(st.customerName) === -1) _cariAdlar.push(st.customerName); });
  } catch (e) {}
  _cariAdlar = _cariAdlar.filter(function(m, i, a) { return a.indexOf(m) === i; }).sort(function(a, b) { return a.localeCompare(b, 'tr'); });
  var custOpts = _cariAdlar.map(function(n) { return '<option value="' + esc(n) + '"></option>'; }).join('');
  var curOpts = ST_CURRENCIES.map(function(c) { return '<option value="' + c + '"' + (t?.currency === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
  var incoOpts = ST_INCOTERMS.map(function(i) { return '<option value="' + i + '"' + (t?.incoterm === i ? ' selected' : '') + '>' + i + '</option>'; }).join('');
  // SAT-LANG-001: dil seçici varsayilan EN (mevcut sablon ingilizce), kullanici degistirebilir
  var lang = t?.lang || 'EN';
  var langOpts = ST_LANGS.map(function(L) { return '<option value="' + L + '"' + (lang === L ? ' selected' : '') + '>' + L + '</option>'; }).join('');

  var mo = document.createElement('div');
  mo.className = 'mo'; mo.id = 'mo-satis-teklif'; mo.style.zIndex = '2100';
  mo.innerHTML = '<div class="moc" style="max-width:1100px;padding:0;border-radius:14px;overflow:hidden;max-height:94vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:15px;font-weight:700;color:var(--t)">' + (t ? '✏️ Teklif Düzenle' : '+ Yeni Satış Teklifi') + '</div>'
      + '<button onclick="document.getElementById(\'mo-satis-teklif\').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3)">×</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px">'
      // MUSTERI-ONCEKI-SATIS-001: önceki teklif uyarı banner placeholder
      + '<div id="st-prev-warn" style="display:none"></div>'
      // Satır 1: Müşteri + Teklif No + Tarih
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl"><span data-stk="customer">' + _stT('customer', lang) + '</span> *</div><input list="st-customer-list" class="fi" id="st-customer" value="' + esc(t?.customerName || '') + '" placeholder="Müşteri adı..." onchange="window._stCheckPrevTeklif?.()" autocomplete="off"><datalist id="st-customer-list">' + custOpts + '</datalist></div>'
        + '<div><div class="fl" data-stk="quoteNo">' + _stT('quoteNo', lang) + '</div><input class="fi" id="st-no" value="' + (t?.teklifNo || _generateTeklifNo()) + '" readonly style="background:var(--s2);font-family:monospace"></div>'
        + '<div><div class="fl" data-stk="date">' + _stT('date', lang) + '</div><input type="date" class="fi" id="st-date" value="' + (t?.date || new Date().toISOString().slice(0, 10)) + '"></div>'
      + '</div>'
      // Satır 2: Geçerlilik + Teslim + İncoterm + Döviz + Dil
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:10px">'
        + '<div><div class="fl" data-stk="validity">' + _stT('validity', lang) + '</div><input type="date" class="fi" id="st-validity" value="' + (t?.validity || '') + '"></div>'
        + '<div><div class="fl" data-stk="deliveryTime">' + _stT('deliveryTime', lang) + '</div><input class="fi" id="st-delivery" value="' + (t?.deliveryTime || '') + '" placeholder="30"></div>'
        + '<div><div class="fl" data-stk="incoterm">' + _stT('incoterm', lang) + '</div><select class="fi" id="st-incoterm">' + incoOpts + '</select></div>'
        + '<div><div class="fl" data-stk="currency">' + _stT('currency', lang) + '</div><select class="fi" id="st-currency">' + curOpts + '</select></div>'
        + '<div><div class="fl" data-stk="lang">' + _stT('lang', lang) + '</div><select class="fi" id="st-lang" onchange="window._stChangeLang?.(this.value)">' + langOpts + '</select></div>'
      + '</div>'
      // Ürün satırları
      + '<div style="border:1px solid var(--b);border-radius:10px;padding:14px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
          + '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase" data-stk="items">' + _stT('items', lang) + '</div>'
          + '<button onclick="window._stAddItem?.()" class="btn btns" style="font-size:10px;padding:3px 10px" data-stk="addItem">' + _stT('addItem', lang) + '</button>'
        + '</div>'
        + '<div id="st-items">' + (function() {
            var items = t?.items || [{ no: 1, code: '', desc: '', qty: 1, unit: 'Adet', price: 0, total: 0 }];
            return items.map(function(item, idx) { return window._stItemRow ? window._stItemRow(item, idx) : ''; }).join('') || '<div style="font-size:11px;color:var(--t3);text-align:center;padding:12px">Ürün ekleyin</div>';
          })()
        + '</div>'
        + '<div style="display:flex;justify-content:flex-end;margin-top:10px;font-size:14px;font-weight:700;color:var(--t)"><span data-stk="total">' + _stT('total', lang) + '</span>: <span id="st-total" style="margin-left:8px;color:var(--ac)">0</span></div>'
      + '</div>'
      // Şartlar + Banka + Not
      + '<div><div class="fl" data-stk="terms">' + _stT('terms', lang) + '</div><textarea class="fi" id="st-terms" rows="3" style="resize:none">' + (t?.terms || 'Payment: 30% advance, 70% before shipment\nDelivery: Within 30 days after order confirmation\nValidity: 15 days') + '</textarea></div>'
      + '<div><div class="fl" data-stk="bank">' + _stT('bank', lang) + '</div><textarea class="fi" id="st-bank" rows="2" style="resize:none">' + (t?.bankInfo || 'Bank: ...\nIBAN: ...\nSWIFT: ...') + '</textarea></div>'
      + '<div><div class="fl" data-stk="notes">' + _stT('notes', lang) + '</div><textarea class="fi" id="st-notes" rows="2" style="resize:none">' + (t?.notes || '') + '</textarea></div>'
      + '<input type="hidden" id="st-eid" value="' + (t?.id || '') + '">'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">'
      + '<button class="btn" onclick="document.getElementById(\'mo-satis-teklif\').remove()" data-stk="cancel">' + _stT('cancel', lang) + '</button>'
      + '<button class="btn btnp" onclick="window._saveST?.()" data-stk="save">' + _stT('save', lang) + '</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });

  // Ürün satırlarını render et
  setTimeout(function() {
    var items = t?.items || [{ no: 1, code: '', desc: '', qty: 1, unit: 'Adet', price: 0, total: 0 }];
    var cont = document.getElementById('st-items');
    if (cont) cont.innerHTML = items.map(function(item, idx) { return _stItemRowHTML(item, idx); }).join('');
    _stCalcTotal();
    // MUSTERI-ONCEKI-SATIS-001: form açıldığında önceki teklif kontrolü
    if (typeof window._stCheckPrevTeklif === 'function') window._stCheckPrevTeklif();
  }, 50);
};

/**
 * MUSTERI-ONCEKI-SATIS-001
 * Müşteri seçildiğinde aynı müşteriye verilmiş önceki satış tekliflerini
 * loadSatisTeklifleri() ile bul, varsa formun üstüne sarı uyarı banner'ı
 * yerleştir. Banner'a tıklanınca en son teklifin peek panelini aç.
 * Edit modunda mevcut teklif kendisi sayılmaz (id eşleşmesi ile dışlanır).
 */
window._stCheckPrevTeklif = function() {
  var sel = document.getElementById('st-customer');
  var warn = document.getElementById('st-prev-warn');
  if (!sel || !warn) return;
  var customerName = sel.value || '';
  if (!customerName) { warn.style.display = 'none'; warn.innerHTML = ''; return; }
  var currentId = parseInt(document.getElementById('st-eid')?.value || '0');
  var allSatis = (typeof window.loadSatisTeklifleri === 'function') ? window.loadSatisTeklifleri() : [];
  // Aynı müşteri (musteri alanı) — düzenlenen kayıt hariç
  var prev = allSatis.filter(function(x) {
    return (x.musteri === customerName || x.customerName === customerName) && x.id !== currentId;
  });
  if (!prev.length) { warn.style.display = 'none'; warn.innerHTML = ''; return; }
  // En yeni: createdAt üzerinden sırala (descending)
  prev.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  var latest = prev[0];
  var dateStr = (latest.createdAt || '').slice(0, 10) || '—';
  var amt = (parseFloat(latest.genelToplam) || parseFloat(latest.toplam) || 0).toLocaleString('tr-TR') + ' ' + (latest.paraBirimi || latest.currency || 'USD');
  var esc = (typeof window._esc === 'function') ? window._esc : function(s) { return String(s == null ? '' : s); };
  warn.style.display = 'block';
  warn.innerHTML = '<div onclick="event.stopPropagation();window._stPeekAc?.(' + latest.id + ')" style="padding:10px 14px;background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;cursor:pointer;font-size:12px;color:#92400E;display:flex;align-items:center;gap:8px;transition:background .15s" onmouseover="this.style.background=\'#FDE68A\'" onmouseout="this.style.background=\'#FEF3C7\'">'
    + '<span style="font-size:16px;flex-shrink:0">⚠️</span>'
    + '<span style="flex:1"><strong>' + esc(customerName) + '</strong> müşterisine daha önce <strong>' + prev.length + '</strong> teklif verildi — en son: <strong>' + esc(dateStr) + '</strong> · <strong>' + esc(amt) + '</strong></span>'
    + '<span style="font-size:10px;opacity:.85;flex-shrink:0">Detayı gör →</span>'
  + '</div>';
};

function _stItemRowHTML(item, idx) {
  // Ürün dropdown from urun_db
  var urunList = typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true}).filter(function(u){ return !u.isDeleted && (u.duayKodu||u.urunAdi); }) : [];
  var esc = window._esc || function(s){ return String(s||''); };
  var urunOpts = '<option value="">— Ürün Seçin —</option>' + urunList.map(function(u) { return '<option value="' + esc(u.duayKodu||'') + '">' + esc((u.duayKodu||'') + ' — ' + (u.urunAdi||u.duayAdi||u.ingAd||'')) + '</option>'; }).join('');

  return '<div class="st-item-row" style="display:grid;grid-template-columns:30px 1fr 1fr 70px 60px 80px 80px 30px;gap:6px;margin-bottom:6px;align-items:center;font-size:11px">'
    + '<div style="color:var(--t3);text-align:center">' + (idx + 1) + '</div>'
    + '<select class="fi st-item-code" style="font-size:11px;padding:4px 6px" onchange="window._stItemSelected?.(this)">' + urunOpts + '</select>'
    + '<input class="fi st-item-desc" placeholder="Açıklama" value="' + (item.desc || '') + '" style="font-size:11px;padding:4px 6px">'
    + '<input type="number" class="fi st-item-qty" placeholder="Adet" value="' + (item.qty || 1) + '" style="font-size:11px;padding:4px 6px" oninput="window._stCalcRow?.(this)">'
    + '<input class="fi st-item-unit" placeholder="Birim" value="' + (item.unit || 'Adet') + '" style="font-size:11px;padding:4px 6px">'
    + '<input type="number" class="fi st-item-price" placeholder="Fiyat" value="' + (item.price || '') + '" style="font-size:11px;padding:4px 6px" oninput="window._stCalcRow?.(this)">'
    + '<div class="st-item-total" style="font-weight:600;text-align:right">' + ((item.qty || 0) * (item.price || 0)).toLocaleString('tr-TR') + '</div>'
    + '<button onclick="this.closest(\'.st-item-row\').remove();_stCalcTotal()" style="background:none;border:none;cursor:pointer;color:#DC2626;font-size:12px">✕</button>'
  + '</div>';
}

window._stAddItem = function() {
  var cont = document.getElementById('st-items');
  if (!cont) return;
  var count = cont.querySelectorAll('.st-item-row').length;
  cont.insertAdjacentHTML('beforeend', _stItemRowHTML({ no: count + 1, qty: 1, unit: 'Adet' }, count));
};

window._stItemSelected = function(sel) {
  var code = sel.value;
  if (!code) return;
  var urunList = typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true}) : [];
  var u = urunList.find(function(x) { return x.duayKodu === code; });
  if (!u) return;
  var row = sel.closest('.st-item-row');
  if (!row) return;
  var desc = row.querySelector('.st-item-desc');
  var unit = row.querySelector('.st-item-unit');
  if (desc && !desc.value) desc.value = u.urunAdi || u.duayAdi || u.ingAd || '';
  if (unit) unit.value = u.birim || 'Adet';
};

window._stCalcRow = function(inp) {
  var row = inp.closest('.st-item-row');
  if (!row) return;
  var qty = parseFloat(row.querySelector('.st-item-qty')?.value || '0') || 0;
  var price = parseFloat(row.querySelector('.st-item-price')?.value || '0') || 0;
  var totalEl = row.querySelector('.st-item-total');
  if (totalEl) totalEl.textContent = (qty * price).toLocaleString('tr-TR');
  _stCalcTotal();
};

function _stCalcTotal() {
  var total = 0;
  document.querySelectorAll('.st-item-row').forEach(function(row) {
    var qty = parseFloat(row.querySelector('.st-item-qty')?.value || '0') || 0;
    var price = parseFloat(row.querySelector('.st-item-price')?.value || '0') || 0;
    total += qty * price;
  });
  var el = document.getElementById('st-total');
  if (el) el.textContent = total.toLocaleString('tr-TR');
}

/**
 * Teklif kaydet.
 */
window._saveST = function() {
  var customer = document.getElementById('st-customer')?.value || '';
  if (!customer) { window.toast?.('Müşteri seçin', 'err'); return; }

  var items = [];
  document.querySelectorAll('.st-item-row').forEach(function(row, idx) {
    var qty = parseFloat(row.querySelector('.st-item-qty')?.value || '0') || 0;
    var price = parseFloat(row.querySelector('.st-item-price')?.value || '0') || 0;
    items.push({
      no: idx + 1,
      code: row.querySelector('.st-item-code')?.value || '',
      desc: row.querySelector('.st-item-desc')?.value || '',
      qty: qty, unit: row.querySelector('.st-item-unit')?.value || 'Adet',
      price: price, total: qty * price,
    });
  });

  var eid = parseInt(document.getElementById('st-eid')?.value || '0');
  var entry = {
    teklifNo: document.getElementById('st-no')?.value || _generateTeklifNo(),
    customerName: customer,
    date: document.getElementById('st-date')?.value || '',
    validity: document.getElementById('st-validity')?.value || '',
    deliveryTime: document.getElementById('st-delivery')?.value || '',
    incoterm: document.getElementById('st-incoterm')?.value || 'FOB',
    currency: document.getElementById('st-currency')?.value || 'USD',
    lang: document.getElementById('st-lang')?.value || 'EN',
    items: items,
    terms: document.getElementById('st-terms')?.value || '',
    bankInfo: document.getElementById('st-bank')?.value || '',
    notes: document.getElementById('st-notes')?.value || '',
    updatedAt: new Date().toISOString(),
  };

  var data = _loadST();
  if (eid) {
    var existing = data.find(function(x) { return x.id === eid; });
    if (existing) Object.assign(existing, entry);
  } else {
    entry.id = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
    entry.createdAt = new Date().toISOString();
    entry.createdBy = window.Auth?.getCU?.()?.id;
    data.unshift(entry);
  }
  _storeST(data);
  document.getElementById('mo-satis-teklif')?.remove();
  renderSatisTeklif();
  window.toast?.('Teklif kaydedildi ✓', 'ok');
};

/**
 * PDF preview — Duay Standard Format.
 */
window._stPreview = function(id) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) return;
  var esc = window._esc;
  var total = (t.items || []).reduce(function(a, i) { return a + (i.total || 0); }, 0);
  // SAT-LANG-001: PDF cikti dil destegi (TR/EN/CN/AR/RU)
  var lang = t.lang || 'EN';
  var L = function(k) { return _stT(k, lang); };
  var dir = lang === 'AR' ? 'rtl' : 'ltr';

  var w = window.open('', '_blank', 'width=800,height=1000');
  w.document.write('<!DOCTYPE html><html dir="' + dir + '" lang="' + lang.toLowerCase() + '"><head><meta charset="UTF-8"><title>' + L('proforma') + ' — ' + esc(t.teklifNo) + '</title>'
    + '<style>body{font-family:"Segoe UI",sans-serif;padding:40px;color:#1a1a2e;max-width:750px;margin:0 auto}'
    + '.hdr{border-bottom:3px solid #1e1b4b;padding-bottom:16px;margin-bottom:20px}'
    + 'table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#1e1b4b;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase}'
    + 'td{border-bottom:1px solid #eee;padding:8px 10px;font-size:12px}'
    + '.total-row{background:#f5f3ff;font-weight:700}'
    + '.section{margin-top:24px;font-size:12px;line-height:1.6}'
    + '.section-title{font-size:11px;font-weight:700;color:#1e1b4b;text-transform:uppercase;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}'
    + '@media print{button{display:none!important}}</style></head><body>'
    + '<div class="hdr"><div style="display:flex;justify-content:space-between;align-items:flex-start">'
      + '<div><div style="font-size:22px;font-weight:800;color:#1e1b4b">DUAY GLOBAL LLC</div><div style="font-size:11px;color:#6b7280;margin-top:4px">International Trade & Consulting</div></div>'
      + '<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:#1e1b4b">' + L('proforma') + '</div><div style="font-size:12px;color:#6b7280;margin-top:4px">' + L('ref') + ': ' + esc(t.teklifNo) + '</div><div style="font-size:11px;color:#6b7280">' + L('date') + ': ' + (t.date || '—') + '</div></div>'
    + '</div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">'
      + '<div><div class="section-title">' + L('to') + '</div><div style="font-size:13px;font-weight:600">' + esc(t.customerName) + '</div></div>'
      + '<div><div class="section-title">' + L('details') + '</div><div style="font-size:11px">' + L('incoterm') + ': <b>' + (t.incoterm || 'FOB') + '</b><br>' + L('currency') + ': <b>' + (t.currency || 'USD') + '</b><br>' + L('delivery') + ': ' + esc(t.deliveryTime || '—') + '<br>' + L('validity') + ': ' + (t.validity || '—') + '</div></div>'
    + '</div>'
    + '<table><tr><th>' + L('no') + '</th><th>' + L('desc') + '</th><th>' + L('qty') + '</th><th>' + L('unit') + '</th><th>' + L('unitPrice') + '</th><th>' + L('total').toUpperCase() + '</th></tr>'
    + (t.items || []).map(function(i) { return '<tr><td>' + i.no + '</td><td>' + esc(i.desc || i.code) + '</td><td>' + (i.qty || 0) + '</td><td>' + (i.unit || '') + '</td><td>' + (i.price || 0).toLocaleString('tr-TR') + '</td><td>' + (i.total || 0).toLocaleString('tr-TR') + '</td></tr>'; }).join('')
    + '<tr class="total-row"><td colspan="5" style="text-align:right">' + L('total').toUpperCase() + '</td><td>' + (t.currency || '$') + ' ' + total.toLocaleString('tr-TR') + '</td></tr></table>'
    + (t.terms ? '<div class="section"><div class="section-title">' + L('termsTitle') + '</div><pre style="white-space:pre-wrap;font-family:inherit">' + esc(t.terms) + '</pre></div>' : '')
    + (t.bankInfo ? '<div class="section"><div class="section-title">' + L('bankTitle') + '</div><pre style="white-space:pre-wrap;font-family:inherit">' + esc(t.bankInfo) + '</pre></div>' : '')
    + '<div style="margin-top:30px;text-align:center;font-size:10px;color:#9ca3af">' + L('footer') + ' · Duay Global LLC · ' + new Date().toLocaleDateString('tr-TR') + '</div>'
    + '<div style="margin-top:20px;text-align:center"><button onclick="window.print()" style="padding:10px 24px;background:#1e1b4b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px">' + L('print') + '</button></div>'
    + '</body></html>');
  w.document.close();
};

/* SATIS-KAR-BADGE-001: Kar hesaplama helper — liste badge ve detay ekranı için */
window._stKarHesapla = function(teklif) {
  var urunler = typeof loadUrunler === 'function' ? loadUrunler() : [];
  var items = teklif.items || teklif.urunler || [];
  var satisToplam = 0;
  var alisToplam = 0;
  items.forEach(function(i) {
    var qty = parseFloat(i.qty || i.miktar || 0) || 0;
    var satis = parseFloat(i.price || i.birimFiyat || 0) || 0;
    satisToplam += satis * qty;
    // Alış önce item içinden, yoksa catalog lookup (duayKodu === i.code)
    var alis = parseFloat(i.alisF || i.alisFiyat || i.costPrice || 0) || 0;
    if (!alis && i.code) {
      var u = urunler.find(function(x) { return x.duayKodu === i.code; });
      if (u) alis = parseFloat(u.alisF) || 0;
    }
    alisToplam += alis * qty;
  });
  var kar = satisToplam - alisToplam;
  var oran = satisToplam > 0 ? Math.round(kar / satisToplam * 100) : 0;
  return { satis: satisToplam, alis: alisToplam, kar: kar, oran: oran };
};

/**
 * KAR-ANALIZ-001 — Yazdirilabilir kar analizi yeni pencerede.
 * Her urun icin loadUrunler()'dan duayKodu eslesmesiyle alisF (alis fiyati)
 * cekilir, kar/marj hesaplanir. Cost bulunamayan urunler asterisk ile isaretlenir.
 * @param {number} id Teklif id
 */
window._stKarAnaliz = function(id) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) { window.toast?.('Teklif bulunamadı', 'err'); return; }
  var esc = window._esc;
  var urunler = typeof window.loadUrunler === 'function' ? window.loadUrunler({tumKullanicilar:true}) : [];
  var fmt = function(n) { return Number(n||0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}); };
  var cur = t.currency || 'USD';

  var rows = (t.items || []).map(function(i) {
    var u = urunler.find(function(x) { return x.duayKodu === i.code; });
    var alisF = u ? (parseFloat(u.alisF) || 0) : 0;
    var qty = parseFloat(i.qty) || 0;
    var satisF = parseFloat(i.price) || 0;
    var alisToplam = alisF * qty;
    var satisToplam = satisF * qty;
    var kar = satisToplam - alisToplam;
    var marjPct = satisToplam > 0 ? (kar / satisToplam * 100) : 0;
    return { desc: i.desc || i.code || '—', qty: qty, unit: i.unit || '', alisF: alisF, alisToplam: alisToplam, satisF: satisF, satisToplam: satisToplam, kar: kar, marjPct: marjPct, hasCost: alisF > 0 };
  });

  var totalAlis = rows.reduce(function(a, r) { return a + r.alisToplam; }, 0);
  var totalSatis = rows.reduce(function(a, r) { return a + r.satisToplam; }, 0);
  var totalKar = totalSatis - totalAlis;
  var avgMarj = totalSatis > 0 ? (totalKar / totalSatis * 100) : 0;
  var missingCount = rows.filter(function(r) { return !r.hasCost; }).length;
  var marjColor = avgMarj < 10 ? '#dc2626' : avgMarj < 25 ? '#d97706' : '#059669';

  var w = window.open('', '_blank', 'width=900,height=1000');
  w.document.write('<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Kar Analizi — ' + esc(t.teklifNo || '') + '</title>'
    + '<style>body{font-family:"Segoe UI",sans-serif;padding:30px;color:#1a1a2e;max-width:850px;margin:0 auto}'
    + '.hdr{border-bottom:3px solid #1e1b4b;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start}'
    + 'h1{font-size:20px;margin:0;color:#1e1b4b}'
    + '.meta{font-size:11px;color:#6b7280;margin-top:6px}'
    + '.warn{background:#fef3c7;border:1px solid #f59e0b;color:#78350f;padding:10px 14px;border-radius:6px;font-size:12px;margin-bottom:14px}'
    + 'table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}'
    + 'th{background:#1e1b4b;color:#fff;padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em}'
    + 'td{border-bottom:1px solid #eee;padding:7px 6px}'
    + '.r{text-align:right;font-family:"DM Mono",monospace}'
    + '.total{background:#f5f3ff;font-weight:700;border-top:2px solid #1e1b4b}'
    + '.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}'
    + '.sbox{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}'
    + '.slbl{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}'
    + '.sval{font-size:16px;font-weight:700;color:#1e1b4b;font-family:"DM Mono",monospace}'
    + '.kr{color:' + (totalKar >= 0 ? '#059669' : '#dc2626') + '}'
    + '.mj{color:' + marjColor + '}'
    + '.miss{color:#dc2626;font-size:9px;margin-left:4px}'
    + '@media print{button{display:none!important}body{padding:20px}}</style></head><body>'
    + '<div class="hdr"><div><h1>📊 Kar Analizi</h1><div class="meta">REF: <b>' + esc(t.teklifNo || '—') + '</b> · Müşteri: <b>' + esc(t.customerName || '—') + '</b></div><div class="meta">Tarih: ' + (t.date || '—') + ' · Para Birimi: <b>' + esc(cur) + '</b> · Toplam Kalem: ' + rows.length + '</div></div>'
    + '<div style="text-align:right;font-size:10px;color:#9ca3af">Hazırlanan: ' + new Date().toLocaleString('tr-TR') + '<br>Duay Global LLC</div></div>'
    + (missingCount > 0 ? '<div class="warn">⚠️ ' + missingCount + ' ürünün alış fiyatı (alisF) urunler veritabanında bulunamadı — bu satırların kar hesabı 0 olarak gösteriliyor. Ürün kayıtlarını güncelleyin.</div>' : '')
    + '<table><thead><tr><th style="width:34%">ÜRÜN</th><th class="r">ADET</th><th>BİRİM</th><th class="r">ALIŞ F.</th><th class="r">SATIŞ F.</th><th class="r">ALIŞ TOPLAM</th><th class="r">SATIŞ TOPLAM</th><th class="r">KAR</th><th class="r">MARJ%</th></tr></thead><tbody>'
    + rows.map(function(r) {
        var rowMarjColor = r.marjPct < 10 ? '#dc2626' : r.marjPct < 25 ? '#d97706' : '#059669';
        return '<tr><td>' + esc(r.desc) + (r.hasCost ? '' : '<span class="miss">⚠ alisF yok</span>') + '</td>'
          + '<td class="r">' + r.qty + '</td>'
          + '<td>' + esc(r.unit) + '</td>'
          + '<td class="r">' + (r.hasCost ? fmt(r.alisF) : '—') + '</td>'
          + '<td class="r">' + fmt(r.satisF) + '</td>'
          + '<td class="r">' + (r.hasCost ? fmt(r.alisToplam) : '—') + '</td>'
          + '<td class="r">' + fmt(r.satisToplam) + '</td>'
          + '<td class="r" style="color:' + (r.kar >= 0 ? '#059669' : '#dc2626') + ';font-weight:600">' + fmt(r.kar) + '</td>'
          + '<td class="r" style="color:' + rowMarjColor + ';font-weight:600">%' + r.marjPct.toFixed(1) + '</td></tr>';
      }).join('')
    + '<tr class="total"><td colspan="5">TOPLAM</td><td class="r">' + fmt(totalAlis) + '</td><td class="r">' + fmt(totalSatis) + '</td><td class="r kr">' + fmt(totalKar) + '</td><td class="r mj">%' + avgMarj.toFixed(1) + '</td></tr>'
    + '</tbody></table>'
    + '<div class="summary">'
      + '<div class="sbox"><div class="slbl">Toplam Maliyet</div><div class="sval">' + esc(cur) + ' ' + fmt(totalAlis) + '</div></div>'
      + '<div class="sbox"><div class="slbl">Toplam Ciro</div><div class="sval">' + esc(cur) + ' ' + fmt(totalSatis) + '</div></div>'
      + '<div class="sbox"><div class="slbl">Net Kar</div><div class="sval kr">' + esc(cur) + ' ' + fmt(totalKar) + '</div></div>'
      + '<div class="sbox"><div class="slbl">Ortalama Marj</div><div class="sval mj">%' + avgMarj.toFixed(2) + '</div></div>'
    + '</div>'
    + '<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center">Bu rapor sadece dahili kullanım icindir. Müşteriye gönderilmemelidir.</div>'
    + '<div style="margin-top:18px;text-align:center"><button onclick="window.print()" style="padding:10px 24px;background:#1e1b4b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px">🖨 Yazdır / PDF</button></div>'
    + '</body></html>');
  w.document.close();
};

window._copyST = function(id) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) return;
  var copy = JSON.parse(JSON.stringify(t));
  copy.id = typeof generateNumericId === 'function' ? generateNumericId() : Date.now();
  copy.teklifNo = _generateTeklifNo();
  copy.date = new Date().toISOString().slice(0, 10);
  copy.createdAt = new Date().toISOString();
  data.unshift(copy);
  _storeST(data);
  renderSatisTeklif();
  window.toast?.('Teklif kopyalandı: ' + copy.teklifNo, 'ok');
};

/**
 * PI numarasını yenile — mevcut teklifNo'nun son 4 rakamını koruyup
 * yeni format (XXXX-YYMMDDHHMI) ile değiştirir. Eski numara
 * previousTeklifNo alanında saklanır, updatedAt güncellenir, Firestore'a
 * storeSatisTeklifleri üzerinden senkronize edilir.
 * @param {number} id Teklif id
 */
window._stUpdatePI = function(id) {
  var data = _loadST();
  var t = data.find(function(x) { return x.id === id; });
  if (!t) return;
  var oldNo = t.teklifNo || '—';
  window.confirmModal?.('"' + oldNo + '" teklifinin PI numarası yenilenecek. Eski numara previousTeklifNo alanında saklanacak. Devam edilsin mi?', {
    title: 'PI Güncelle', confirmText: 'Evet, Güncelle',
    onConfirm: function() {
      var d = new Date();
      var pad = function(n) { return String(n).padStart(2, '0'); };
      var ts = String(d.getFullYear()).slice(-2) + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes());
      var digits = (t.teklifNo || '').replace(/[^0-9]/g, '');
      var xxxx = digits.length >= 4 ? digits.slice(-4) : String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      var newPI = xxxx + '-' + ts;
      t.previousTeklifNo = t.teklifNo;
      t.teklifNo = newPI;
      t.updatedAt = new Date().toISOString();
      _storeST(data);
      if (typeof window.storeSatisTeklifleri === 'function') {
        try { window.storeSatisTeklifleri(data); } catch (e) { console.warn('[satis_teklif] Firestore sync hata:', e); }
      }
      renderSatisTeklif();
      window.toast?.('PI güncellendi: ' + newPI, 'ok');
    }
  });
};

window._deleteST = function(id) {
  window.confirmModal?.('Bu teklifi silmek istediğinizden emin misiniz?', {
    title: 'Teklif Sil', danger: true, confirmText: 'Evet',
    onConfirm: function() {
      var liste = _loadST();
      var x = liste.find(function(s) { return String(s.id) === String(id); });
      if (x) { x.isDeleted = true; x.deletedAt = new Date().toISOString(); }
      window.storeSatisTeklifleri?.(liste) || _storeST(liste);
      renderSatisTeklif();
      window.toast?.('Silindi', 'ok');
    }
  });
};

window._exportSTXlsx = function() {
  var data = _loadST();
  if (!data.length || typeof XLSX === 'undefined') return;
  // SATIS-EXCEL-10KOLON-001: 6 kolon → 10 kolon (ürün sayısı, durum, rev, dil)
  var rows = [['TeklifNo','Müşteri','Tarih','Para','Incoterm','Ürün Sayısı','Toplam','Durum','Rev','Dil']];
  data.forEach(function(t) {
    var total = (t.items||[]).reduce(function(a,i){return a+(i.total||0);},0);
    rows.push([
      t.teklifNo || '',
      t.customerName || '',
      t.date || '',
      t.currency || '',
      t.incoterm || '',
      (t.items||[]).length,
      parseFloat(total.toFixed(2)),
      t.status || 'taslak',
      t.revNo || '01',
      t.dil || t.lang || 'EN'
    ]);
  });
  var ws = XLSX.utils.aoa_to_sheet(rows); var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Teklifler');
  XLSX.writeFile(wb, 'SatisTeklif_' + new Date().toISOString().slice(0,10) + '.xlsx');
  window.toast?.('Excel indirildi ✓', 'ok');
};

// Exports
window.renderSatisTeklif = renderSatisTeklif;
/* SATIS-TEKLIF-ROUTING-001: app_patch.js nav routing bu ismi çağırır */
window.renderSatisTeklifleri = renderSatisTeklif;
window._stekTopluChk = function(c) { document.querySelectorAll('.stek-row-chk').forEach(function(x) { x.checked = c; }); window._stekChkGuncelle(); };
window._stekChkGuncelle = function() { var n = document.querySelectorAll('.stek-row-chk:checked').length; var btn = document.getElementById('stek-toplu-sil-btn'); if (btn) { btn.style.display = n ? 'inline-flex' : 'none'; btn.textContent = n + ' Teklif Sil'; } };
window._stekTopluSil = function() { if (!window._yetkiKontrol?.('toplu_sil')) return; var ids = []; document.querySelectorAll('.stek-row-chk:checked').forEach(function(c) { ids.push(c.dataset.id); }); if (!ids.length) return; window.confirmModal?.(ids.length + ' teklif silinecek?', { danger: true, confirmText: 'Evet Sil', onConfirm: function() { var list = _loadST(); ids.forEach(function(id) { var x = list.find(function(s) { return String(s.id) === String(id); }); if (x) { x.isDeleted = true; x.deletedAt = new Date().toISOString(); } }); _storeST(list); window.toast?.(ids.length + ' teklif silindi', 'ok'); renderSatisTeklif(); } }); };
window._openSTModal = window._openSTModal;
window._stItemRow = _stItemRowHTML;
