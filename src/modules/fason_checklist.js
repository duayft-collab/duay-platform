/* ── FASON CHECKLİST SİSTEMİ ─────────────────────────────── */
/* FASON-CHECKLIST-001 */
(function() {
  'use strict';

  /* fason.js ile aynı LS key'leri — veri paylaşımı */
  var _FASON_KEY = 'ak_fason_v1';
  var _FASON_CHECK_KEY = 'ak_fason_check_v1';

  function _fasonLoad() {
    try { return JSON.parse(localStorage.getItem(_FASON_KEY) || '[]'); } catch(e) { return []; }
  }
  function _fasonCheckLoad() {
    try { return JSON.parse(localStorage.getItem(_FASON_CHECK_KEY) || '[]'); } catch(e) { return []; }
  }
  function _fasonCheckStore(d) {
    try { localStorage.setItem(_FASON_CHECK_KEY, JSON.stringify(d)); } catch(e) {}
  }

/* FASON-CHECKPOINTS-SCOPE-FIX-001: IIFE dışına export için window scope */
window._FASON_CHECKPOINTS = [
  /* AŞAMA 1: Ön Üretim */
  { id:'OP01', asama:'on-uretim', asamaLbl:'Ön Üretim', lbl:'İplik dtex testi', hedef:'1100 dtex ±5%', birim:'dtex', zorunlu:true },
  { id:'OP02', asama:'on-uretim', asamaLbl:'Ön Üretim', lbl:'Atkı-çözgü sayısı', hedef:'8×8 /cm', birim:'/cm', zorunlu:true },
  { id:'OP03', asama:'on-uretim', asamaLbl:'Ön Üretim', lbl:'Ham kumaş ağırlığı (gramaj)', hedef:'≥200 gr/m²', birim:'gr/m²', zorunlu:false },
  /* AŞAMA 2: Üretim Sırasında */
  { id:'PR01', asama:'uretim', asamaLbl:'Üretim', lbl:'Kumaş eni ölçümü', hedef:'170 ±2 cm', birim:'cm', zorunlu:true },
  { id:'PR02', asama:'uretim', asamaLbl:'Üretim', lbl:'Görsel hata kontrolü', hedef:'Defekt yok', birim:'', zorunlu:true },
  { id:'PR03', asama:'uretim', asamaLbl:'Üretim', lbl:'Numune fotoğrafı', hedef:'Min. 3 fotoğraf', birim:'', zorunlu:true },
  /* AŞAMA 3: Teslimat */
  { id:'DL01', asama:'teslimat', asamaLbl:'Teslimat', lbl:'Top uzunluğu ölçümü', hedef:'1000m ±1%', birim:'m', zorunlu:true },
  { id:'DL02', asama:'teslimat', asamaLbl:'Teslimat', lbl:'Ambalaj ve top sarımı kontrolü', hedef:'Standart sarım', birim:'', zorunlu:true },
];

window._fasonDetay = function(emirId) {
  var emirler = _fasonLoad();
  var emir = emirler.find(function(e){ return e.id===emirId; });
  if(!emir) return;
  var p = document.getElementById('panel-fason'); if(!p) return;

  var checkler = _fasonCheckLoad();
  var emirCheck = {};
  checkler.filter(function(c){ return c.emirId===emirId; }).forEach(function(c){ emirCheck[c.cpId] = c; });

  var asamalar = ['on-uretim','uretim','teslimat'];
  var asamaLbller = {'on-uretim':'Ön Üretim','uretim':'Üretim Sırasında','teslimat':'Teslimat'};
  var asamaIkon = {'on-uretim':'🔬','uretim':'🏭','teslimat':'📦'};

  var checkHTML = asamalar.map(function(asama) {
    var cplar = window._FASON_CHECKPOINTS.filter(function(cp){ return cp.asama===asama; });
    var asamaTamamlanan = cplar.filter(function(cp){ return emirCheck[cp.id]?.durum==='tamam'; }).length;
    var asamaBg = asamaTamamlanan===cplar.length ? '#EAF3DE' : asamaTamamlanan>0 ? '#FAEEDA' : 'var(--s2)';
    var asamaRenk = asamaTamamlanan===cplar.length ? '#16A34A' : asamaTamamlanan>0 ? '#D97706' : 'var(--t3)';

    var cpHTML = cplar.map(function(cp) {
      var kayit = emirCheck[cp.id] || {};
      var tamam = kayit.durum === 'tamam';
      var olcum = kayit.olcum || '';
      var not = kayit.not || '';
      var foto = kayit.foto ? '<div style="margin-top:6px"><img src="'+kayit.foto+'" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:0.5px solid var(--b)"></div>' : '';

      return '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b);background:'+(tamam?'#F0FAF4':'var(--sf)') + '">'
        + '<div style="display:flex;align-items:center;gap:10px">'
        + '<div onclick="event.stopPropagation();window._fasonCheckToggle(\''+emirId+'\',\''+cp.id+'\')" style="width:20px;height:20px;border-radius:50%;border:2px solid '+(tamam?'#16A34A':'var(--b)')+';background:'+(tamam?'#16A34A':'transparent')+';display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">'
        + (tamam?'<span style="color:#fff;font-size:11px;line-height:1">✓</span>':'')+'</div>'
        + '<div style="flex:1">'
        + '<div style="font-size:11px;font-weight:500;color:var(--t)">'+window._esc(cp.lbl)+(cp.zorunlu?'<span style="color:#DC2626;font-size:8px;margin-left:3px">*</span>':'')+'</div>'
        + '<div style="font-size:9px;color:var(--t3)">Hedef: '+window._esc(cp.hedef)+'</div>'
        + '</div>'
        + (cp.birim ? '<input placeholder="Ölçüm" value="'+window._esc(olcum)+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" onchange="event.stopPropagation();window._fasonCheckOlcum(\''+emirId+'\',\''+cp.id+'\',this.value)" style="width:80px;padding:4px 6px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-size:10px;font-family:inherit;text-align:right"> <span style="font-size:9px;color:var(--t3)">'+window._esc(cp.birim)+'</span>' : '')
        + '</div>'
        + '<div style="margin-top:4px;margin-left:30px;display:flex;gap:6px;align-items:center">'
        + '<input placeholder="Not..." value="'+window._esc(not)+'" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" onchange="event.stopPropagation();window._fasonCheckNot(\''+emirId+'\',\''+cp.id+'\',this.value)" style="flex:1;padding:3px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--s2);color:var(--t);font-size:10px;font-family:inherit">'
        + (cp.id==='PR03' ? '<label style="font-size:9px;padding:3px 8px;border:0.5px solid var(--b);border-radius:4px;cursor:pointer;color:var(--t2);white-space:nowrap;background:var(--s2)">📷 Foto<input type="file" accept="image/*" onchange="event.stopPropagation();window._fasonFotoYukle(\''+emirId+'\',\''+cp.id+'\',this)" style="display:none"></label>' : '')
        + '</div>'
        + foto
        + '</div>';
    }).join('');

    return '<div style="margin-bottom:12px;border:0.5px solid var(--b);border-radius:8px;overflow:hidden">'
      + '<div style="padding:8px 14px;background:'+asamaBg+';display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:11px;font-weight:600;color:'+asamaRenk+'">'+asamaIkon[asama]+' '+asamaLbller[asama]+'</div>'
      + '<div style="font-size:10px;color:'+asamaRenk+'">'+asamaTamamlanan+'/'+cplar.length+'</div>'
      + '</div>'
      + cpHTML + '</div>';
  }).join('');

  /* FASON-RULO-LISTE-001: basılan rulolar listesi — emir bazlı */
  var _rKey2 = 'ak_fason_rulo_v1';
  var _rl = [];
  try { _rl = JSON.parse(localStorage.getItem(_rKey2)||'[]'); } catch(e){}
  var _emirRulolar = _rl.filter(function(r){ return r.emirId===emirId; });

  var ruloListHTML = '<div style="margin-top:16px;border:0.5px solid var(--b);border-radius:8px;overflow:hidden">'
    +'<div style="padding:8px 14px;background:var(--s2);font-size:10px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;display:flex;justify-content:space-between">'
    +'<span>Basılan Rulolar ('+_emirRulolar.length+')</span></div>';
  if(!_emirRulolar.length) {
    ruloListHTML += '<div style="padding:16px;text-align:center;color:var(--t3);font-size:11px">'
      +'Henüz rulo basılmadı — "Rulo Etiket Bas" butonunu kullanın</div>';
  } else {
    ruloListHTML += _emirRulolar.map(function(r) {
      return '<div style="display:flex;align-items:center;padding:8px 14px;border-bottom:0.5px solid var(--b);font-size:11px">'
        +'<div style="font-weight:500;color:var(--t);min-width:80px">RULO #'+r.ruloNo+'</div>'
        +'<div style="color:var(--t3);flex:1">'+r.tarih+'</div>'
        +'<div style="color:var(--t3)">'+r.en+'m × '+r.uzunluk+'m</div>'
        +'<button onclick="event.stopPropagation();window._fasonRuloEtiket(\''+emirId+'\')" '
        +'style="margin-left:8px;font-size:9px;padding:2px 8px;border:0.5px solid var(--b);border-radius:4px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t3)">🖨 Tekrar Bas</button>'
        +'</div>';
    }).join('');
  }
  ruloListHTML += '</div>';

  p.innerHTML = '<div style="display:flex;flex-direction:column;height:100%">'
    + '<div style="display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:0.5px solid var(--b);background:var(--sf)">'
    + '<button onclick="event.stopPropagation();window.renderFason()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--t3)">←</button>'
    + '<div><div style="font-size:14px;font-weight:600">'+window._esc(emir.urunAdi||'')+'</div>'
    + '<div style="font-size:10px;color:var(--t3)">'+window._esc(emir.fasonFirma||'')+(emir.tarih?' · Termin: '+emir.tarih:'')+'</div></div>'
    + '<div style="margin-left:auto;display:flex;gap:8px">'
    + '<button onclick="event.stopPropagation();window._fasonEtiketBas(\''+emirId+'\')" style="padding:6px 12px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-size:11px;font-family:inherit;color:var(--t2)">🏷 Numune Etiketi</button>'
    /* FASON-KALITE-RAPORU-001: Kontrol sonuçları + ölçümler + notlar yazdırılabilir rapor */
    + '<button onclick="event.stopPropagation();window._fasonKaliteRaporu(\''+emirId+'\')" style="padding:6px 12px;border:0.5px solid #185FA5;border-radius:6px;background:transparent;cursor:pointer;font-size:11px;font-family:inherit;color:#185FA5">📋 Kalite Raporu</button>'
    /* FASON-RULO-ETIKET-001: Rulo kayıt + etiket bas */
    + '<button onclick="event.stopPropagation();window._fasonRuloEtiket(\''+emirId+'\')" style="padding:6px 12px;border:0.5px solid #16A34A;border-radius:6px;background:transparent;cursor:pointer;font-size:11px;font-family:inherit;color:#16A34A">🏷 Rulo Etiket Bas</button>'
    + '</div></div>'
    + '<div style="flex:1;overflow-y:auto;padding:14px 20px">'
    /* FASON-RULO-ETIKET-001: 4 KPI → 5 KPI (rulo sayısı eklendi) */
    + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px">'
    + '<div style="padding:8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);text-align:center"><div style="font-size:16px;font-weight:600">'+emir.en+'m</div><div style="font-size:9px;color:var(--t3)">En</div></div>'
    + '<div style="padding:8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);text-align:center"><div style="font-size:16px;font-weight:600">'+emir.uzunluk+'m</div><div style="font-size:9px;color:var(--t3)">Top Uzunluğu</div></div>'
    + '<div style="padding:8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);text-align:center"><div style="font-size:16px;font-weight:600">'+window._esc(emir.iplikSpec||'')+'</div><div style="font-size:9px;color:var(--t3)">İplik</div></div>'
    + '<div style="padding:8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);text-align:center"><div style="font-size:16px;font-weight:600">'+window._esc(emir.atkuCozgu||'')+'</div><div style="font-size:9px;color:var(--t3)">Atkı×Çözgü</div></div>'
    + '<div style="padding:8px;border:0.5px solid var(--b);border-radius:6px;background:var(--s2);text-align:center"><div style="font-size:16px;font-weight:600;color:#16A34A" id="fason-rulo-say">0</div><div style="font-size:9px;color:var(--t3)">Rulo</div></div>'
    + '</div>'
    + checkHTML
    + ruloListHTML
    + '</div></div>';

  /* FASON-RULO-ETIKET-001: render sonrası rulo sayısı güncelle */
  try {
    var _rulolar = JSON.parse(localStorage.getItem('ak_fason_rulo_v1') || '[]');
    var _ruloSay = _rulolar.filter(function(r){ return r.emirId === emirId; }).length;
    var _ruloEl = document.getElementById('fason-rulo-say');
    if (_ruloEl) _ruloEl.textContent = _ruloSay;
  } catch(e) {}
};

window._fasonCheckToggle = function(emirId, cpId) {
  var checkler = _fasonCheckLoad();
  var idx = checkler.findIndex(function(c){ return c.emirId===emirId && c.cpId===cpId; });
  if(idx===-1) {
    checkler.push({emirId:emirId,cpId:cpId,durum:'tamam',updatedAt:new Date().toISOString()});
  } else {
    checkler[idx].durum = checkler[idx].durum==='tamam' ? 'bekliyor' : 'tamam';
    checkler[idx].updatedAt = new Date().toISOString();
  }
  _fasonCheckStore(checkler);
  window._fasonDetay(emirId);
};

window._fasonCheckOlcum = function(emirId, cpId, val) {
  var checkler = _fasonCheckLoad();
  var idx = checkler.findIndex(function(c){ return c.emirId===emirId && c.cpId===cpId; });
  if(idx===-1) { checkler.push({emirId:emirId,cpId:cpId,durum:'bekliyor',olcum:val}); }
  else { checkler[idx].olcum = val; }
  _fasonCheckStore(checkler);
};

window._fasonCheckNot = function(emirId, cpId, val) {
  var checkler = _fasonCheckLoad();
  var idx = checkler.findIndex(function(c){ return c.emirId===emirId && c.cpId===cpId; });
  if(idx===-1) { checkler.push({emirId:emirId,cpId:cpId,durum:'bekliyor',not:val}); }
  else { checkler[idx].not = val; }
  _fasonCheckStore(checkler);
};

window._fasonFotoYukle = function(emirId, cpId, input) {
  if(!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var checkler = _fasonCheckLoad();
    var idx = checkler.findIndex(function(c){ return c.emirId===emirId && c.cpId===cpId; });
    if(idx===-1) { checkler.push({emirId:emirId,cpId:cpId,durum:'bekliyor',foto:ev.target.result}); }
    else { checkler[idx].foto = ev.target.result; checkler[idx].durum='tamam'; }
    _fasonCheckStore(checkler);
    window.toast?.('Fotoğraf kaydedildi ✓','ok');
    window._fasonDetay(emirId);
  };
  reader.readAsDataURL(input.files[0]);
};

window._fasonEtiketBas = function(emirId) {
  var emirler = _fasonLoad();
  var emir = emirler.find(function(e){ return e.id===emirId; });
  if(!emir) return;
  var topNo = 'TOP-' + emirId.slice(-6).toUpperCase();
  var tarih = new Date().toLocaleDateString('tr-TR');
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Numune Etiketi</title>'
    + '<style>body{font-family:monospace;padding:20px;max-width:400px;margin:0 auto}'
    + '.etiket{border:3px solid #000;padding:16px;border-radius:4px}'
    + '.firma{font-size:14px;font-weight:bold;text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px}'
    + '.urun{font-size:18px;font-weight:bold;margin-bottom:8px}'
    + '.row{display:flex;justify-content:space-between;font-size:12px;padding:2px 0;border-bottom:1px dashed #ccc}'
    + '.top-no{font-size:28px;font-weight:bold;text-align:center;letter-spacing:4px;margin:12px 0;padding:8px;background:#f0f0f0}'
    + '.barkod{text-align:center;font-size:9px;letter-spacing:3px;margin-top:8px}'
    + '</style></head><body>'
    + '<div class="etiket">'
    + '<div class="firma">DUAY ULUSLARARASI TİCARET LTD.ŞTİ.</div>'
    + '<div class="urun">'+window._esc(emir.urunAdi||'')+'</div>'
    + '<div class="row"><span>Fason Firma</span><span>'+window._esc(emir.fasonFirma||'—')+'</span></div>'
    + '<div class="row"><span>Kumaş Eni</span><span>'+emir.en+' m</span></div>'
    + '<div class="row"><span>Top Uzunluğu</span><span>'+emir.uzunluk+' m</span></div>'
    + '<div class="row"><span>İplik Spec</span><span>'+window._esc(emir.iplikSpec||'')+'</span></div>'
    + '<div class="row"><span>Atkı × Çözgü</span><span>'+window._esc(emir.atkuCozgu||'')+'</span></div>'
    + '<div class="row"><span>Üretim Tarihi</span><span>'+tarih+'</span></div>'
    + '<div class="top-no">'+topNo+'</div>'
    + '<div class="barkod">||||| '+emirId+' |||||</div>'
    + '</div>'
    + '<script>window.print();<\/script>'
    + '</body></html>';
  var win = window.open('','_blank');
  if(win) { win.document.write(html); win.document.close(); }
};

/* FASON-KALITE-RAPORU-001: Kalite kontrol raporu — 3 aşama × checkpoint × durum/ölçüm/not tablo */
window._fasonKaliteRaporu = function(emirId) {
  var emirler = _fasonLoad();
  var emir = emirler.find(function(e){ return e.id === emirId; });
  if (!emir) return;
  var checkler = _fasonCheckLoad();
  var emirCheck = {};
  checkler.filter(function(c){ return c.emirId === emirId; }).forEach(function(c){ emirCheck[c.cpId] = c; });
  var tarih = new Date().toLocaleDateString('tr-TR');
  var esc = window._esc || function(s){ return String(s || ''); };
  var cpList = window._FASON_CHECKPOINTS || [];
  var satirlar = cpList.map(function(cp) {
    var k = emirCheck[cp.id] || {};
    var durum = k.durum === 'tamam' ? '✓ TAMAM' : '✗ BEKLEYEN';
    var durumRenk = k.durum === 'tamam' ? 'green' : 'red';
    return '<tr><td style="padding:4px 8px;border:1px solid #ddd">' + esc(cp.asamaLbl) + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #ddd">' + esc(cp.lbl) + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:' + durumRenk + '">' + durum + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #ddd">' + esc(cp.hedef) + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #ddd">' + esc(k.olcum || '—') + (k.olcum && cp.birim ? ' ' + esc(cp.birim) : '') + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #ddd">' + esc(k.not || '—') + '</td>'
      + '</tr>';
  }).join('');
  var tamamSay = cpList.filter(function(cp){ return (emirCheck[cp.id] || {}).durum === 'tamam'; }).length;
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kalite Kontrol Raporu</title>'
    + '<style>body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto;color:#111}'
    + 'h1{font-size:16px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px}'
    + 'h2{font-size:11px;color:#555;margin-bottom:12px}'
    + 'table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}'
    + 'th{padding:6px 8px;background:#f0f0f0;border:1px solid #ddd;text-align:left;font-weight:bold}'
    + '.kpi{display:flex;gap:16px;margin:12px 0;font-size:11px;flex-wrap:wrap}'
    + '.kpi div{padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#fafafa}'
    + '.ozet{margin-top:16px;padding:10px 14px;background:#f8f8f8;border-left:4px solid #185FA5;font-size:11px}'
    + '.imza{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;font-size:10px}'
    + '.imza-alan{text-align:center;border-top:1px solid #111;padding-top:6px;margin-top:40px}'
    + '</style></head><body>'
    + '<h1>KALİTE KONTROL RAPORU</h1>'
    + '<h2>Duay Uluslararası Ticaret Ltd. Şti. — Fason Üretim Kontrolü</h2>'
    + '<div class="kpi">'
    + '<div><strong>Ürün:</strong> ' + esc(emir.urunAdi || '—') + '</div>'
    + '<div><strong>Fason Firma:</strong> ' + esc(emir.fasonFirma || '—') + '</div>'
    + '<div><strong>Tarih:</strong> ' + tarih + '</div>'
    + '<div><strong>En:</strong> ' + esc(String(emir.en || '—')) + ' m · <strong>Uzunluk:</strong> ' + esc(String(emir.uzunluk || '—')) + ' m</div>'
    + '<div><strong>İplik:</strong> ' + esc(emir.iplikSpec || '—') + ' · <strong>Atkı×Çözgü:</strong> ' + esc(emir.atkuCozgu || '—') + '</div>'
    + '</div>'
    + '<table><thead><tr><th>Aşama</th><th>Kontrol</th><th>Durum</th><th>Hedef</th><th>Ölçüm</th><th>Not</th></tr></thead>'
    + '<tbody>' + satirlar + '</tbody></table>'
    + '<div class="ozet"><strong>Özet:</strong> ' + tamamSay + ' / ' + cpList.length + ' kontrol tamamlandı · '
    + '<strong>Sonuç:</strong> ' + (tamamSay === cpList.length ? '<span style="color:green">ÜRÜN KABUL EDİLEBİLİR</span>' : '<span style="color:#b45309">EKSİK KONTROL VAR</span>')
    + '</div>'
    + '<div class="imza">'
    + '<div class="imza-alan">Kontrol Eden<br/><br/><span style="font-size:9px;color:#666">İsim / İmza / Tarih</span></div>'
    + '<div class="imza-alan">Fason Firma Yetkilisi<br/><br/><span style="font-size:9px;color:#666">İsim / İmza / Tarih</span></div>'
    + '</div>'
    + '<script>window.print();<\/script></body></html>';
  var win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
};

/* FASON-RULO-ETIKET-001: Rulo kayıt + etiket yazdırma
   - Her emir birden fazla rulo içerebilir
   - localStorage key: ak_fason_rulo_v1
   - Rulo ID format: emirId-R001, emirId-R002, ...
   - Barkod = ruloId */
window._fasonRuloEtiket = function(emirId) {
  var emirler = _fasonLoad();
  var emir = emirler.find(function(e){ return e.id === emirId; });
  if (!emir) return;
  var esc = window._esc || function(s){ return String(s || ''); };

  /* Rulo numarasını bul — bu emir için kaç rulo var */
  var ruloKey = 'ak_fason_rulo_v1';
  var rulolar = [];
  try { rulolar = JSON.parse(localStorage.getItem(ruloKey) || '[]'); } catch(e) {}
  var emirRulolar = rulolar.filter(function(r){ return r.emirId === emirId; });
  var ruloNo = emirRulolar.length + 1;
  var ruloId = emirId + '-R' + String(ruloNo).padStart(3, '0');
  var tarih = new Date().toLocaleDateString('tr-TR');

  /* Ruloyu kayıt et */
  rulolar.push({
    id: ruloId,
    emirId: emirId,
    ruloNo: ruloNo,
    urunAdi: emir.urunAdi,
    en: emir.en,
    uzunluk: emir.uzunluk,
    iplikSpec: emir.iplikSpec,
    atkuCozgu: emir.atkuCozgu,
    fasonFirma: emir.fasonFirma,
    tarih: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  try { localStorage.setItem(ruloKey, JSON.stringify(rulolar)); } catch(e) {}
  window.toast?.('Rulo ' + ruloId + ' kaydedildi ✓', 'ok');

  /* Etiketi bas */
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rulo Etiketi</title>'
    + '<style>body{font-family:monospace;padding:16px;max-width:300px;margin:0 auto}'
    + '.etiket{border:3px solid #000;padding:12px;border-radius:4px}'
    + '.firma{font-size:11px;font-weight:bold;text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px}'
    + '.urun{font-size:14px;font-weight:bold;margin-bottom:6px}'
    + '.row{display:flex;justify-content:space-between;font-size:10px;padding:2px 0;border-bottom:1px dashed #ccc}'
    + '.rulo-no{font-size:32px;font-weight:bold;text-align:center;letter-spacing:4px;margin:10px 0;padding:6px;background:#f0f0f0}'
    + '.barkod{text-align:center;font-size:8px;letter-spacing:2px;margin-top:6px;word-break:break-all}'
    + '</style></head><body>'
    + '<div class="etiket">'
    + '<div class="firma">DUAY ULUSLARARASI TİCARET LTD.ŞTİ.</div>'
    + '<div class="urun">' + esc(emir.urunAdi || '') + '</div>'
    + '<div class="row"><span>Fason Firma</span><span>' + esc(emir.fasonFirma || '—') + '</span></div>'
    + '<div class="row"><span>En</span><span>' + esc(String(emir.en || '—')) + ' m</span></div>'
    + '<div class="row"><span>Uzunluk</span><span>' + esc(String(emir.uzunluk || '—')) + ' m</span></div>'
    + '<div class="row"><span>İplik</span><span>' + esc(emir.iplikSpec || '') + '</span></div>'
    + '<div class="row"><span>Atkı×Çözgü</span><span>' + esc(emir.atkuCozgu || '') + '</span></div>'
    + '<div class="row"><span>Tarih</span><span>' + tarih + '</span></div>'
    + '<div class="rulo-no">RULO #' + ruloNo + '</div>'
    + '<div class="barkod">' + esc(ruloId) + '</div>'
    + '</div>'
    + '<script>window.print();<\/script></body></html>';

  var win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }

  /* Detayı güncelle — rulo sayısı KPI refresh */
  window._fasonDetay(emirId);
};

})();
