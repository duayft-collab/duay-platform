'use strict';
/**
 * src/modules/sozler.js — v1.0.0
 * Soz Yonetimi Modulu
 */
(function() {
'use strict';

var _cu = function() { return window.Auth?.getCU?.() || window.CU?.(); };
var _isAdm = function() { return _cu()?.role === 'admin'; };
var _now = function() { return typeof nowTs === 'function' ? nowTs() : new Date().toISOString(); };
var _esc = window._esc;
var _genId = function() { return typeof generateNumericId === 'function' ? generateNumericId() : Date.now(); };

var SOZ_KEYS = { data: 'ak_sozler1', gunun: 'ak_gunun_sozu', gunTarih: 'ak_gunun_sozu_tarih' };
var SOZ_KATEGORILER = ['Yasam','Ilim','Stoicism','Motivasyon','Liderlik','Ticaret','Sabir','Is','Felsefe'];
var SOZ_DILLER = [{k:'TR',l:'Turkce'},{k:'EN',l:'Ingilizce'},{k:'AR',l:'Arapca'},{k:'FA',l:'Farsca'},{k:'DE',l:'Almanca'},{k:'FR',l:'Fransizca'}];

// ══════════════════════════════════════════════════════════════
// BASLANGIC VERISI — 20 soz
// ══════════════════════════════════════════════════════════════
var DEFAULT_SOZLER = [
  {id:1,soz:'Dun ile beraber gitti cancagizim, ne kadar soz varsa dune ait. Simdi yeni seyler soylemek lazim.',yazar:'Mevlana Rumi',kategori:'Yasam',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:2,soz:'Yaralanmis bir yerde yeni bir kapı acılır.',yazar:'Mevlana Rumi',kategori:'Motivasyon',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:3,soz:'Sevgide gunes gibi ol, dostluk ve kardeslikte akarsu gibi ol.',yazar:'Mevlana Rumi',kategori:'Yasam',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:4,soz:'Sen ne kadar kendinden gecersen o kadar dunya sana gelir.',yazar:'Mevlana Rumi',kategori:'Felsefe',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:5,soz:'Her sey ziddıyla kaimdir.',yazar:'Mevlana Rumi',kategori:'Felsefe',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:6,soz:'Hayatta en hakiki mursit ilimdir.',yazar:'Mustafa Kemal Ataturk',kategori:'Ilim',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:7,soz:'Benim naciz vududum bir gun elbet toprak olacaktir, fakat Turkiye Cumhuriyeti ilelebet payidar kalacaktir.',yazar:'Mustafa Kemal Ataturk',kategori:'Liderlik',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:8,soz:'Basarılarda gururu yenmek, felâketlerde ümitsizlige direkmek lazımdır.',yazar:'Mustafa Kemal Ataturk',kategori:'Motivasyon',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:9,soz:'Bilmediklerini bilmek bilginin baslangicindir.',yazar:'Konfucyus',kategori:'Ilim',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:10,soz:'Onde olmak icin one gecmeye gerek yok; one secilmeye gerek var.',yazar:'Konfucyus',kategori:'Liderlik',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:11,soz:'Gercek mutluluk, gelecekteki belirsiz bir seyin beklentisi degil, su anda sahip olduklarinin farkindaliginda yatar.',yazar:'Seneca',kategori:'Stoicism',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:12,soz:'Talih cesur olanlarin yanindadir.',yazar:'Seneca',kategori:'Stoicism',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:13,soz:'Cesaretinizi toplayin. Hayatin sonu geldiginde, onu yasamıs oldugumu soyleyin.',yazar:'Mark Twain',kategori:'Motivasyon',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:14,soz:'Iki onemli gun vardir hayatinizda: dogdugunuz gun ve neden dogdugunuzu anladiginiz gun.',yazar:'Mark Twain',kategori:'Yasam',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:15,soz:'Sen kontrol edemedigin seylere odaklanirsan kontrol edebildiklerini ihmal edersin.',yazar:'Marcus Aurelius',kategori:'Stoicism',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:16,soz:'Dunyayi degistirmek istiyorsan kendinden basla.',yazar:'Marcus Aurelius',kategori:'Felsefe',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:17,soz:'Ilim ilim bilmektir, ilim kendin bilmektir. Sen kendini bilmezsen bu nice okumaktir.',yazar:'Yunus Emre',kategori:'Ilim',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:18,soz:'Sevelim sevilelim. Bu dunya kimseye kalmaz.',yazar:'Yunus Emre',kategori:'Yasam',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:19,soz:'Milletler ve devletler yonetimlerindeki adalete gore yükselir veya cökerler.',yazar:'Ibni Haldun',kategori:'Liderlik',dil:'TR',aktif:true,gosterim:'her_gun'},
  {id:20,soz:'Cografya kaderdir.',yazar:'Ibni Haldun',kategori:'Ticaret',dil:'TR',aktif:true,gosterim:'her_gun'},
];

function _load() { try { var d = JSON.parse(localStorage.getItem(SOZ_KEYS.data)||'null'); if(Array.isArray(d)&&d.length) return d; } catch(e){} return DEFAULT_SOZLER.map(function(s){s.createdAt=s.createdAt||_now();s.gosterimSayisi=0;return s;}); }
function _store(d) { localStorage.setItem(SOZ_KEYS.data,JSON.stringify(d)); var fp=window.DB?._fsPath?.('sozler'); if(fp) window.DB?.storeIddialar?.(d); }

// ══════════════════════════════════════════════════════════════
// GUNUN SOZU
// ══════════════════════════════════════════════════════════════
function _gununSozu() {
  var today = new Date().toISOString().slice(0,10);
  var saved = localStorage.getItem(SOZ_KEYS.gunTarih);
  if (saved === today) {
    try { return JSON.parse(localStorage.getItem(SOZ_KEYS.gunun)); } catch(e) {}
  }
  var all = _load().filter(function(s) { return s.aktif && s.gosterim !== 'pasif'; });
  if (!all.length) return null;
  var soz = all[Math.floor(Math.random() * all.length)];
  soz.gosterimSayisi = (soz.gosterimSayisi||0) + 1;
  soz.sonGosterim = _now();
  _store(_load().map(function(s) { return s.id === soz.id ? soz : s; }));
  localStorage.setItem(SOZ_KEYS.gunun, JSON.stringify(soz));
  localStorage.setItem(SOZ_KEYS.gunTarih, today);
  return soz;
}

// ══════════════════════════════════════════════════════════════
// FIKIR POPUP SEKMESI
// ══════════════════════════════════════════════════════════════
window._fikirSozTab = function() {
  var cont = document.getElementById('fikir-tab-content');
  if (!cont) return;
  var soz = _gununSozu();
  if (!soz) { cont.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3)">Aktif soz yok</div>'; return; }
  cont.innerHTML = '<div style="padding:16px;text-align:center">'
    + '<div style="font-size:28px;margin-bottom:10px;opacity:.7">ℹ</div>'
    + '<div style="font-size:13px;font-style:italic;color:var(--t);line-height:1.6;margin-bottom:12px">"' + _esc(soz.soz) + '"</div>'
    + '<div style="font-size:11px;color:var(--t2);font-weight:600">— ' + _esc(soz.yazar) + '</div>'
    + '<div style="font-size:9px;color:var(--t3);margin-top:4px">' + _esc(soz.kategori||'') + '</div>'
    + '<div style="margin-top:12px;display:flex;gap:6px;justify-content:center">'
      + '<button onclick="window._sozSonraki()" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--b);border-radius:6px;background:var(--sf);color:var(--t2);cursor:pointer;font-family:inherit">Sonraki Soz →</button>'
      + (_isAdm() ? '<button onclick="window._sozYonetimAc()" style="font-size:10px;padding:4px 12px;border:0.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);cursor:pointer;font-family:inherit">Yonet →</button>' : '')
    + '</div>'
  + '</div>';
};

window._sozSonraki = function() {
  localStorage.removeItem(SOZ_KEYS.gunun);
  localStorage.removeItem(SOZ_KEYS.gunTarih);
  window._fikirSozTab?.();
};

// ══════════════════════════════════════════════════════════════
// ADMIN YONETIM
// ══════════════════════════════════════════════════════════════
window._sozYonetimAc = function() {
  if (!_isAdm()) return;
  var old = document.getElementById('mo-soz-yonetim'); if (old) old.remove();
  var all = _load();
  var aktifN = all.filter(function(s){return s.aktif;}).length;
  var katN = new Set(all.map(function(s){return s.kategori;})).size;
  var dilN = new Set(all.map(function(s){return s.dil;})).size;

  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-soz-yonetim';
  mo.innerHTML = '<div class="moc" style="width:700px;max-width:96vw;padding:0;border-radius:14px;max-height:90vh;display:flex;flex-direction:column">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">'
      + '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px;color:#dc2626">ℹ</span><div><div style="font-size:14px;font-weight:700;color:var(--t)">Soz Yonetimi</div><div style="font-size:10px;color:var(--t3)">Sadece Admin</div></div></div>'
      + '<div style="display:flex;gap:4px">'
        + '<button onclick="window._sozExcelExport()" class="btn btns" style="font-size:10px">Excel Aktar</button>'
        + '<button onclick="window._sozEkleModal()" class="btn btnp" style="font-size:10px">+ Soz Ekle</button>'
        + '<button onclick="document.getElementById(\'mo-soz-yonetim\')?.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--t3)">x</button>'
      + '</div>'
    + '</div>'
    // Istatistik
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid var(--b)">'
      + '<div style="padding:10px 14px;border-right:0.5px solid var(--b);text-align:center"><div style="font-size:18px;font-weight:700;color:var(--t)">' + all.length + '</div><div style="font-size:9px;color:var(--t3)">Toplam</div></div>'
      + '<div style="padding:10px 14px;border-right:0.5px solid var(--b);text-align:center"><div style="font-size:18px;font-weight:700;color:#16a34a">' + aktifN + '</div><div style="font-size:9px;color:var(--t3)">Aktif</div></div>'
      + '<div style="padding:10px 14px;border-right:0.5px solid var(--b);text-align:center"><div style="font-size:18px;font-weight:700;color:var(--t)">' + katN + '</div><div style="font-size:9px;color:var(--t3)">Kategori</div></div>'
      + '<div style="padding:10px 14px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--t)">' + dilN + '</div><div style="font-size:9px;color:var(--t3)">Dil</div></div>'
    + '</div>'
    // Liste
    + '<div style="flex:1;overflow-y:auto">'
      + all.map(function(s, i) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:0.5px solid var(--b);font-size:11px">'
          + '<span style="color:var(--t3);width:20px;text-align:right;flex-shrink:0">' + (i+1) + '</span>'
          + '<span style="flex:1;color:var(--t);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(s.soz.slice(0,60)) + (s.soz.length>60?'...':'') + '</span>'
          + '<span style="font-weight:500;color:var(--t2);flex-shrink:0;width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(s.yazar) + '</span>'
          + '<span style="padding:1px 6px;border-radius:4px;background:var(--al);color:var(--ac);font-size:9px;flex-shrink:0">' + _esc(s.kategori||'') + '</span>'
          + '<span style="padding:1px 4px;border-radius:3px;background:var(--s2);font-size:9px;flex-shrink:0">' + (s.dil||'TR') + '</span>'
          + '<span style="width:6px;height:6px;border-radius:50%;background:' + (s.aktif?'#16a34a':'#9CA3AF') + ';flex-shrink:0"></span>'
          + '<button onclick="window._sozEkleModal(' + s.id + ')" style="font-size:9px;padding:2px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t2);cursor:pointer">Duzenle</button>'
          + '<button onclick="window._sozPoster(' + s.id + ')" style="font-size:9px;padding:2px 6px;border:0.5px solid var(--b);border-radius:4px;background:var(--sf);color:var(--t2);cursor:pointer">Poster</button>'
          + '<button onclick="window._sozSil(' + s.id + ')" style="font-size:9px;padding:2px 6px;border:none;border-radius:4px;background:rgba(220,38,38,.08);color:#dc2626;cursor:pointer">Sil</button>'
        + '</div>';
      }).join('')
    + '</div>'
  + '</div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

// ══════════════════════════════════════════════════════════════
// EKLE / DUZENLE MODALI
// ══════════════════════════════════════════════════════════════
window._sozEkleModal = function(editId) {
  var o = editId ? _load().find(function(s){return s.id===editId;}) : null;
  var old = document.getElementById('mo-soz-ekle'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-soz-ekle';
  mo.innerHTML = '<div class="moc" style="width:460px;max-width:96vw;padding:0;border-radius:14px">'
    + '<div style="padding:14px 20px;border-bottom:1px solid var(--b);font-size:14px;font-weight:700;color:var(--t)">' + (o ? 'Soz Duzenle' : '+ Yeni Soz') + '</div>'
    + '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">'
      + '<textarea class="fi" id="soz-f-soz" rows="3" placeholder="Soz metni..." style="font-size:13px;border-radius:8px;resize:none">' + (o?_esc(o.soz):'') + '</textarea>'
      + '<input class="fi" id="soz-f-yazar" placeholder="Yazar" style="font-size:13px;border-radius:8px" value="' + (o?_esc(o.yazar):'') + '">'
      + '<input class="fi" id="soz-f-kaynak" placeholder="Kaynak (opsiyonel)" style="font-size:13px;border-radius:8px" value="' + (o?_esc(o.kaynak||''):'') + '">'
      + '<select class="fi" id="soz-f-kat" style="font-size:13px;border-radius:8px">' + SOZ_KATEGORILER.map(function(k){return '<option value="'+k+'"'+(o&&o.kategori===k?' selected':'')+'>'+k+'</option>';}).join('') + '</select>'
      + '<select class="fi" id="soz-f-dil" style="font-size:13px;border-radius:8px">' + SOZ_DILLER.map(function(d){return '<option value="'+d.k+'"'+(o&&o.dil===d.k?' selected':'')+'>'+d.l+' ('+d.k+')</option>';}).join('') + '</select>'
      + '<select class="fi" id="soz-f-gosterim" style="font-size:13px;border-radius:8px"><option value="her_gun"'+(o&&o.gosterim==='her_gun'?' selected':'')+'>Her gun rastgele</option><option value="haftada_bir"'+(o&&o.gosterim==='haftada_bir'?' selected':'')+'>Haftada bir</option><option value="pasif"'+(o&&o.gosterim==='pasif'?' selected':'')+'>Aktif degil</option></select>'
      + '<input type="hidden" id="soz-f-eid" value="' + (o?o.id:'') + '">'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--b);display:flex;justify-content:flex-end;gap:8px;background:var(--s2)">'
      + '<button class="btn btns" onclick="document.getElementById(\'mo-soz-ekle\')?.remove()" style="font-size:12px;padding:8px 14px;border-radius:8px">Iptal</button>'
      + '<button class="btn btnp" onclick="window._sozKaydet()" style="font-size:12px;padding:8px 14px;border-radius:8px">Kaydet</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._sozKaydet = function() {
  var soz = (document.getElementById('soz-f-soz')?.value||'').trim();
  var yazar = (document.getElementById('soz-f-yazar')?.value||'').trim();
  if (!soz || !yazar) { window.toast?.('Soz ve yazar zorunlu', 'err'); return; }
  var eid = parseInt(document.getElementById('soz-f-eid')?.value||'0');
  var d = _load();
  var entry = {
    soz: soz, yazar: yazar,
    kaynak: document.getElementById('soz-f-kaynak')?.value||'',
    kategori: document.getElementById('soz-f-kat')?.value||'Yasam',
    dil: document.getElementById('soz-f-dil')?.value||'TR',
    gosterim: document.getElementById('soz-f-gosterim')?.value||'her_gun',
    aktif: true, updatedAt: _now(),
  };
  if (eid) {
    var o = d.find(function(s){return s.id===eid;});
    if (o) Object.assign(o, entry);
  } else {
    entry.id = _genId(); entry.createdAt = _now(); entry.createdBy = _cu()?.id; entry.gosterimSayisi = 0;
    d.unshift(entry);
  }
  _store(d);
  document.getElementById('mo-soz-ekle')?.remove();
  document.getElementById('mo-soz-yonetim')?.remove();
  window._sozYonetimAc?.();
  window.toast?.('Soz kaydedildi', 'ok');
};

window._sozSil = function(id) {
  var d = _load();
  d = d.filter(function(s){return s.id!==id;});
  _store(d);
  document.getElementById('mo-soz-yonetim')?.remove();
  window._sozYonetimAc?.();
  window.toast?.('Soz silindi', 'ok');
};

// ══════════════════════════════════════════════════════════════
// POSTER
// ══════════════════════════════════════════════════════════════
window._sozPoster = function(id) {
  var s = _load().find(function(x){return x.id===id;});
  if (!s) return;
  var old = document.getElementById('mo-soz-poster'); if (old) old.remove();
  var mo = document.createElement('div'); mo.className = 'mo'; mo.id = 'mo-soz-poster';
  mo.innerHTML = '<div class="moc" style="width:500px;max-width:96vw;padding:0;border-radius:14px;overflow:hidden">'
    + '<div id="soz-poster-content" style="background:linear-gradient(135deg,#042C53,#0C447C,#185FA5);padding:48px 40px;text-align:center;color:#fff">'
      + '<div style="font-size:36px;margin-bottom:16px;opacity:.7">ℹ</div>'
      + '<div style="font-size:16px;font-style:italic;line-height:1.7;margin-bottom:20px">"' + _esc(s.soz) + '"</div>'
      + '<div style="width:40px;height:1px;background:rgba(255,255,255,.3);margin:0 auto 16px"></div>'
      + '<div style="font-size:13px;font-weight:600">' + _esc(s.yazar) + '</div>'
      + '<div style="font-size:10px;opacity:.5;margin-top:24px">Duay Global · duaycor.com</div>'
    + '</div>'
    + '<div style="padding:12px 20px;display:flex;justify-content:center;gap:8px;background:var(--s2)">'
      + '<button onclick="window._sozPosterPNG(' + id + ')" class="btn btns" style="font-size:11px">PNG Indir</button>'
      + '<button onclick="document.getElementById(\'mo-soz-poster\')?.remove()" class="btn btns" style="font-size:11px">Kapat</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  mo.addEventListener('click', function(e) { if (e.target === mo) mo.remove(); });
  setTimeout(function() { mo.classList.add('open'); }, 10);
};

window._sozPosterPNG = function(id) {
  var s = _load().find(function(x){return x.id===id;});
  if (!s) return;
  var c = document.createElement('canvas'); c.width = 800; c.height = 400;
  var ctx = c.getContext('2d');
  var grd = ctx.createLinearGradient(0,0,800,400);
  grd.addColorStop(0,'#042C53'); grd.addColorStop(0.5,'#0C447C'); grd.addColorStop(1,'#185FA5');
  ctx.fillStyle = grd; ctx.fillRect(0,0,800,400);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = 'italic 18px serif';
  var words = ('"' + s.soz + '"').split(' '); var lines = []; var line = '';
  words.forEach(function(w) { if ((line + ' ' + w).length > 60) { lines.push(line); line = w; } else { line += (line?' ':'')+w; } });
  if (line) lines.push(line);
  var y = 160 - lines.length * 12;
  lines.forEach(function(l) { ctx.fillText(l, 400, y); y += 28; });
  ctx.font = '600 14px sans-serif'; ctx.fillText('— ' + s.yazar, 400, y + 20);
  ctx.font = '10px sans-serif'; ctx.globalAlpha = 0.5; ctx.fillText('Duay Global · duaycor.com', 400, 380);
  c.toBlob(function(blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'duay-soz-' + s.yazar.replace(/\s/g,'-') + '.png'; a.click();
  });
  window.toast?.('PNG indirildi', 'ok');
};

// ══════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ══════════════════════════════════════════════════════════════
window._sozExcelExport = function() {
  if (typeof XLSX === 'undefined') { window.toast?.('XLSX kutuphanesi yuklu degil', 'err'); return; }
  var d = _load();
  var rows = [['Sira','Soz','Yazar','Kaynak','Kategori','Dil','Gosterim','Aktif','Tarih']];
  d.forEach(function(s, i) {
    rows.push([i+1, s.soz, s.yazar, s.kaynak||'', s.kategori||'', s.dil||'TR', s.gosterim||'', s.aktif?'Evet':'Hayir', (s.createdAt||'').slice(0,10)]);
  });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sozler');
  XLSX.writeFile(wb, 'duay-sozler-' + new Date().toISOString().slice(0,10) + '.xlsx');
  window.toast?.('Excel indirildi', 'ok');
};

})();
