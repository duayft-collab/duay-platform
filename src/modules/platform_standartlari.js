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
        var keyValues = (typeof window.KEYS==='object') ? Object.values(window.KEYS) : [];
        var activeLS = keyValues.filter(function(k){ var v=localStorage.getItem(k); return v!==null && v.length>2; }).length;
        var totalBytes = keyValues.reduce(function(sum,k){ return sum + (localStorage.getItem(k)||'').length; }, 0);
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
          + '</div>'
          /* [VERI-PROTOKOL-EKLE-003] Ana tablo 26 aktif key */
          + (function(){
              var CRITICAL = ['kur','users','tasks','cari','activity','updateLog','trash','pusula','notifications','urunler','bankalar','announcements','satisTeklifleri','alisTeklifleri','teklifSartlar','ihracatDosyalar','crm','kargo','stok'];
              var NOMERGE = ['trash','activity','cari','satinalma','alisTeklifleri','urunler'];
              var rows = keyValues.map(function(phys){
                var logical = Object.keys(window.KEYS||{}).find(function(k){ return window.KEYS[k]===phys; }) || phys;
                var v = localStorage.getItem(phys);
                var size = v ? v.length : 0;
                var lz = v && v.indexOf('_LZ_')===0;
                var count = 'N/A';
                if (v && !lz) { try{ var p=JSON.parse(v); count=Array.isArray(p)?p.length:(p?1:0); }catch(e){} }
                else if (lz && window.LZString) { try{ var d=window.LZString.decompressFromUTF16(v.slice(4)); var p=JSON.parse(d); count=Array.isArray(p)?p.length:(p?1:0); }catch(e){} }
                return { logical:logical, phys:phys, size:size, lz:lz, count:count, rt:CRITICAL.indexOf(logical)>-1, nm:NOMERGE.indexOf(logical)>-1, active:(v!==null && size>2) };
              }).filter(function(r){ return r.active; }).sort(function(a,b){ return b.size - a.size; });
              var tblHtml = '<div style="margin-top:14px;margin-bottom:8px;font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;font-weight:500">Aktif Key Listesi (' + rows.length + ')</div>'
                + '<div style="border:0.5px solid var(--b);border-radius:8px;overflow:hidden;background:var(--sf)">'
                + '<div style="display:grid;grid-template-columns:1.5fr 0.7fr 0.7fr 40px 40px 40px;gap:6px;padding:8px 12px;font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:0.05em;border-bottom:0.5px solid var(--b);background:rgba(0,0,0,0.02)">'
                + '<div>Key</div><div style="text-align:right">Kayit</div><div style="text-align:right">Boyut</div><div style="text-align:center">LZ</div><div style="text-align:center">RT</div><div style="text-align:center">NM</div>'
                + '</div>'
                + rows.map(function(r,i){
                    var sizeDisp = r.size<1024 ? r.size+' B' : Math.round(r.size/1024)+' KB';
                    var bg = i%2 ? 'rgba(0,0,0,0.015)' : 'transparent';
                    return '<div style="display:grid;grid-template-columns:1.5fr 0.7fr 0.7fr 40px 40px 40px;gap:6px;padding:6px 12px;font-size:11px;border-bottom:0.5px solid var(--b);background:' + bg + '">'
                      + '<div style="font-weight:500;color:var(--t)">' + r.logical + '</div>'
                      + '<div style="text-align:right;font-variant-numeric:tabular-nums;color:var(--t2)">' + r.count + '</div>'
                      + '<div style="text-align:right;font-variant-numeric:tabular-nums;color:var(--t2)">' + sizeDisp + '</div>'
                      + '<div style="text-align:center;color:' + (r.lz?'#1A8D6F':'var(--t3)') + '">' + (r.lz?'✓':'−') + '</div>'
                      + '<div style="text-align:center;color:' + (r.rt?'#1A8D6F':'var(--t3)') + '">' + (r.rt?'✓':'−') + '</div>'
                      + '<div style="text-align:center;color:' + (r.nm?'#B4730F':'var(--t3)') + '">' + (r.nm?'✓':'−') + '</div>'
                      + '</div>';
                  }).join('')
                + '</div>';
              return tblHtml;
            })();
      })()
    +'</div>'
    +'</div>';
};

})();
