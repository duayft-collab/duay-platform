/* ── PLATFORM STANDARTLARI MODÜLÜ ─────────────────────────── */
/* PLATFORM-STANDARTLARI-001 */
(function() {
  'use strict';

window.renderPlatformStandartlari = function() {
  var p = document.getElementById('panel-platform-standartlari'); if(!p) return;

  var IBAN_DATA = [
    { banka:'Garanti Bankası', sube:'Yeşilpınar/1181',
      TL:'TR24 0006 2001 1810 0006 2960 86',
      USD:'TR39 0006 2001 1810 0009 0812 68',
      EUR:'TR66 0006 2001 1810 0009 0812 67' },
    { banka:'Albaraka Türk', sube:'Alibeyköy/117',
      TL:'TR54 0020 3000 0889 5310 0000 05',
      USD:'TR27 0020 3000 0889 5310 0000 06',
      EUR:'TR97 0020 3000 0889 5310 0000 07' },
    { banka:'Kuveyt Türk', sube:'Yeşilpınar/267',
      TL:'TR06 0020 5000 0956 8147 5000 01',
      USD:'TR22 0020 5000 0956 8147 5000 01',
      EUR:'TR92 0020 5000 0956 8147 5000 02' },
  ];

  var ibanHTML = IBAN_DATA.map(function(b) {
    return '<div style="border:0.5px solid var(--b);border-radius:8px;padding:14px 16px;margin-bottom:10px;background:var(--sf)">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      +'<div><div style="font-size:13px;font-weight:500;color:var(--t)">'+window._esc(b.banka)+'</div>'
      +'<div style="font-size:10px;color:var(--t3)">'+window._esc(b.sube)+'</div></div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:6px">'
      +['TL','USD','EUR'].map(function(cur){
        return '<div style="display:flex;align-items:center;gap:10px">'
          +'<span style="font-size:9px;font-weight:500;color:var(--t3);min-width:28px">'+cur+'</span>'
          +'<code style="font-size:11px;font-family:monospace;color:var(--t);flex:1;background:var(--s2);padding:4px 8px;border-radius:4px;letter-spacing:.04em">'+window._esc(b[cur])+'</code>'
          +'<button onclick="event.stopPropagation();navigator.clipboard.writeText(\''+b[cur].replace(/\s/g,'')+'\').then(function(){window.toast?.(\'IBAN kopyalandı ✓\',\'ok\')})" style="font-size:9px;padding:3px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;color:var(--t2);font-family:inherit">Kopyala</button>'
          +'</div>';
      }).join('')
      +'</div></div>';
  }).join('');

  var SARTLAR = [
    'Payment: 30% deposit, 70% before dispatch/shipment.',
    'Tax Note: 20% VAT applicable for domestic shipments only.',
    'Bank Charges: All transfer fees outside Türkiye belong to buyer.',
    'Disputes: Istanbul Courts shall have jurisdiction.',
    'Insurance: Buyer\'s responsibility unless CIF terms.',
  ];

  var sartlarHTML = SARTLAR.map(function(s,i){
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--b);font-size:11px">'
      +'<span style="color:var(--t3);min-width:16px">'+(i+1)+'.</span>'
      +'<span style="color:var(--t)">'+window._esc(s)+'</span>'
      +'</div>';
  }).join('');

  p.innerHTML = '<div style="max-width:700px;margin:0 auto;padding:24px">'
    +'<div style="font-size:16px;font-weight:600;color:var(--t);margin-bottom:4px">Platform Standartları</div>'
    +'<div style="font-size:11px;color:var(--t3);margin-bottom:24px">IBAN bilgileri, varsayılan şartlar, kodlama standartları</div>'

    +'<div style="font-size:12px;font-weight:500;color:var(--t);margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Banka IBAN Bilgileri</div>'
    +ibanHTML

    +'<div style="font-size:12px;font-weight:500;color:var(--t);margin-top:20px;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Varsayılan Teklif Şartları</div>'
    +'<div style="border:0.5px solid var(--b);border-radius:8px;overflow:hidden;background:var(--sf)">'
    +'<div style="padding:10px 14px">'+sartlarHTML+'</div>'
    +'</div>'

    +'<div style="font-size:12px;font-weight:500;color:var(--t);margin-top:20px;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Kodlama Standartları</div>'
    +'<div style="border:0.5px solid var(--b);border-radius:8px;padding:12px 16px;background:var(--sf)">'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:0.5px solid var(--b)"><span style="color:var(--t3)">Proforma No Formatı</span><code style="font-family:monospace;color:var(--t)">XXXX-YYMMDDHHMI</code></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:0.5px solid var(--b)"><span style="color:var(--t3)">Müşteri Kodu</span><code style="font-family:monospace;color:var(--t)">C-YYYY-ABC-NNNN</code></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0"><span style="color:var(--t3)">Duay Kodu</span><code style="font-family:monospace;color:var(--t)">DUAY-XXX-NNN</code></div>'
    +'</div>'
    /* [VERI-PROTOKOL-EKLE-001] Veri Protokolu bolumu (iskelet) */
    +'<div style="font-size:12px;font-weight:500;color:var(--t);margin-top:20px;margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--b)">Veri Protokolu</div>'
    +'<div id="veri-protokol-container" style="border:0.5px solid var(--b);border-radius:8px;padding:12px 16px;background:var(--sf)">'
      +(function(){
        /* [VERI-PROTOKOL-EKLE-002] Runtime canli veri + 2 hardcode */
        /* [VERI-PROTOKOL-EKLE-002-HARDCODE] CRITICAL_COLS.length=19, _noMergeCols.length=6 — manuel guncel */
        var totalKeys = (typeof window.KEYS==='object') ? Object.keys(window.KEYS).length : 0;
        var activeLS = Object.keys(localStorage).length;
        var totalBytes = Object.keys(localStorage).reduce(function(s,k){ return s + (localStorage.getItem(k)||'').length; }, 0);
        var ls_kb = Math.round(totalBytes/1024);
        var cacheMatch = Array.from(document.scripts).map(function(sc){return sc.src;}).join(' ').match(/\?v=(\d{8}[A-Z]{2})/);
        var cache = cacheMatch ? cacheMatch[1] : '—';
        var realtimeCount = 19;
        var noMergeCount = 6;
        var cards = [
          {lbl:'Toplam Key', val:totalKeys, sub:'logical keys', c:'var(--t)'},
          {lbl:'Aktif LS', val:activeLS, sub:'localStorage', c:'var(--t)'},
          {lbl:'Realtime', val:realtimeCount, sub:'CRITICAL_COLS', c:'#1A8D6F'},
          {lbl:'No-Merge', val:noMergeCount, sub:'_noMergeCols', c:'#B4730F'},
          {lbl:'LS Boyut', val:ls_kb+' KB', sub:'~5000 KB limit', c:'var(--t)'},
          {lbl:'Cache', val:cache, sub:'active version', c:'var(--t3)'}
        ];
        return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">'
          + cards.map(function(k){
              return '<div style="background:var(--sf);border:0.5px solid var(--b);border-radius:8px;padding:10px 12px">'
                + '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-weight:500;letter-spacing:0.05em">' + k.lbl + '</div>'
                + '<div style="font-size:16px;font-weight:600;color:' + k.c + ';margin-top:3px;font-variant-numeric:tabular-nums">' + k.val + '</div>'
                + '<div style="font-size:10px;color:var(--t3);margin-top:2px">' + k.sub + '</div>'
                + '</div>';
            }).join('')
          + '</div>';
      })()
    +'</div>'
    +'</div>';
};

})();
