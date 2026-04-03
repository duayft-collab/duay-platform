/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/numuneler.js  —  v8.2.0
 * NMS-001 — Numune Yönetim Sistemi tam modül
 *
 * Firestore: duay_tenant_default/numuneler + numune_islemler
 * Anayasa: K01, K08 strict, D3 IIFE, D6 multi-tenant, D10 generateId
 * ════════════════════════════════════════════════════════════════
 */
(function NumunelerModule() {
'use strict';

/* ── Kısayollar ─────────────────────────────────────────────── */
const _g   = id => document.getElementById(id);
const _esc = s => typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s)) : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _cu  = () => window.CU?.() || window.Auth?.getCU?.();
const _isA = () => { const r = _cu()?.role; return r === 'admin' || r === 'manager'; };
const _genId = () => typeof window.generateId === 'function' ? window.generateId() : Date.now() + Math.random().toString(36).slice(2,8);
const _now = () => new Date();
const _today = () => _now().toISOString().slice(0,10);
const _fmt = d => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

/* ── Stiller ────────────────────────────────────────────────── */
const BG1='var(--sf)',BG2='var(--s2)',BD='var(--b)',BDM='var(--bm)',T1='var(--t)',T2='var(--t2)',T3='var(--t3)';
const BLUE='#185FA5',GREEN='#27500A',RED='#A32D2D',AMBER='#EF9F27',NAVY='#042C53',PURPLE='#3C3489';
const S_WK = 'background:'+BG1+';border:0.5px solid '+BD+';border-radius:8px;padding:12px 14px';

/* ── Veri ────────────────────────────────────────────────────── */
const _load = () => typeof window.loadNumune === 'function' ? window.loadNumune() : [];
const _store = d => { if (typeof window.storeNumune === 'function') window.storeNumune(d); };
const _loadIslem = () => JSON.parse(localStorage.getItem('ak_numune_islemler') || '[]');
const _storeIslem = d => localStorage.setItem('ak_numune_islemler', JSON.stringify(d));
const _loadU = () => typeof window.loadUrunler === 'function' ? window.loadUrunler() : [];
const _loadCari = () => typeof window.loadCari === 'function' ? window.loadCari().filter(c => !c.isDeleted) : [];
const _loadUsers = () => typeof window.loadUsers === 'function' ? window.loadUsers() : [];

/* ── NMS ID Üretimi ─────────────────────────────────────────── */
function _nmsId() {
  const y = _now().getFullYear();
  const all = _load();
  const cnt = all.filter(n => (n.nmsId || '').includes(String(y))).length;
  return 'NMS-' + y + '-' + String(cnt + 1).padStart(4, '0');
}
function _tutanakNo(prefix) {
  const y = _now().getFullYear();
  const all = _loadIslem();
  const cnt = all.filter(i => (i.tutanakNo || '').startsWith(prefix + '-' + y)).length;
  return prefix + '-' + y + '-' + String(cnt + 1).padStart(4, '0');
}
function _saklamaBitis(tarih, sure) {
  if (!tarih || sure === 'suresiz') return null;
  const d = new Date(tarih);
  const gunMap = { '1yil': 365, '2yil': 730, '5yil': 1825 };
  d.setDate(d.getDate() + (gunMap[sure] || 365));
  return d.toISOString().slice(0, 10);
}

/* ── Sabitler ───────────────────────────────────────────────── */
const TIPLER = [
  { v: 'gelen', l: 'Gelen', bg: '#E6F1FB', fg: NAVY },
  { v: 'giden', l: 'Giden', bg: '#EAF3DE', fg: GREEN },
  { v: 'sahit', l: 'Şahit', bg: '#EEEDFE', fg: PURPLE },
  { v: 'sikayet', l: 'Şikayet', bg: '#FCEBEB', fg: RED },
  { v: 'referans', l: 'Referans', bg: '#FAEEDA', fg: AMBER },
];
const DURUMLAR = ['taslak','bekliyor','onaylandi','arsivde','kullanımda','analizde','karantina','imha_bekliyor','imha'];
const SAKLAMA = [{v:'1yil',l:'1 Yıl'},{v:'2yil',l:'2 Yıl'},{v:'5yil',l:'5 Yıl'},{v:'suresiz',l:'Süresiz'}];
const KALITE = [{v:'A',l:'A Kalite'},{v:'B',l:'B Kalite'},{v:'test',l:'Test'}];
const GONDERIM_AMAC = ['Müşteriye gösterim','Fuar','Lab analizi','Denetim','Tedarikçiye iade','Satış numunesi','Karşılaştırma'];
const SIKAYET_KONUSU = ['Renk farkı','Boyut uyumsuzluğu','Ağırlık farkı','Hammadde sorunu','Sertifika eksik','Görsel hasar','Diğer'];
const KARAR = ['Kabul','Red','Koşullu kabul','İade','İmha','Yeniden üretim'];
const KARSILASTIRMA_KRITER = ['Renk/Yüzey','Ağırlık','Boyut','Hammadde/TDS','Sertifika','Görsel Durum'];
const FARK_SEC = ['Uyumlu','Küçük fark','Önemli fark','Uyumsuz'];
const ALICI_TARAF = ['Müşteri','Avukat','Mahkeme','Lab','Denetim','Tedarikçi'];
const ARSIV_SEBEP = ['Analiz','Karşılaştırma','Müşteri talebi','Hukuki süreç','İmha değerlendirme','Diğer'];
const FIZIKSEL_DURUM = ['Sağlam','Hafif hasar','Hasarlı','Kullanılamaz'];
const KULLANIM_SONUC = ['Kullanıldı - sağlam','Kullanıldı - hasarlı','Kullanılmadı','Kısmen kullanıldı'];

/* ── State ──────────────────────────────────────────────────── */
let _filter = 'all';
let _search = '';
let _peekId = null;

/* ── Form Yardımcıları ──────────────────────────────────────── */
function _lbl(t, req) { return '<div style="font-size:10px;margin-bottom:3px;color:'+(req?'#DC2626':T3)+'">'+_esc(t)+(req?' *':'')+'</div>'; }
function _inp(id, label, o) {
  const opts = o||{};
  return '<div>'+_lbl(label,opts.req)+'<input class="fi" id="nms-'+id+'" type="'+(opts.type||'text')+'" value="'+_esc(opts.val||'')+'"'
    +(opts.ro?' readonly':'')+(opts.req?' data-req="1"':'')+' placeholder="'+_esc(opts.ph||'')+'"'
    +' style="font-size:11px;padding:8px 10px;height:38px;border-radius:8px;border:0.5px solid '+BDM+';'+(opts.ro?'background:#E6F1FB':'')+'"></div>';
}
function _sel(id, label, options, o) {
  const opts = o||{};
  let h = '<div>'+_lbl(label,opts.req)+'<select class="fi" id="nms-'+id+'"'+(opts.req?' data-req="1"':'')+' style="font-size:11px;padding:8px 10px;height:38px;border-radius:8px;border:0.5px solid '+BDM+'"><option value="">— Seçin —</option>';
  options.forEach(v => { const val=typeof v==='object'?v.v:v,lbl=typeof v==='object'?v.l:v; h+='<option value="'+_esc(val)+'"'+(String(opts.sel)===String(val)?' selected':'')+'>'+_esc(lbl)+'</option>'; });
  return h+'</select></div>';
}
function _ta(id, label, o) {
  const opts = o||{};
  return '<div'+(opts.span?' style="grid-column:span '+opts.span+'"':'')+'>'
    +_lbl(label,opts.req)+'<textarea class="fi" id="nms-'+id+'" rows="'+(opts.rows||2)+'"'+(opts.req?' data-req="1"':'')+' placeholder="'+_esc(opts.ph||'')+'" style="font-size:11px;padding:8px 10px;resize:none;min-height:56px;border-radius:8px;border:0.5px solid '+BDM+'">'+_esc(opts.val||'')+'</textarea></div>';
}
function _upload(id, label, o) {
  const opts = o||{};
  return '<div>'+_lbl(label,opts.req)+'<div style="border:1.5px dashed '+BD+';border-radius:10px;padding:12px;text-align:center;cursor:pointer;font-size:9px;color:'+T3+';min-height:60px'+(opts.req?';border-color:#DC2626':'')+'" onclick="document.getElementById(\'nms-'+id+'-f\').click()"><div id="nms-'+id+'-p">Dosya yükle</div></div><input type="file" id="nms-'+id+'-f" accept="image/*" style="display:none" multiple onchange="window._nmsFileChange?.(\''+id+'\',this)"><input type="hidden" id="nms-'+id+'-v"></div>';
}
function _grid(c, inner) { return '<div style="display:grid;grid-template-columns:repeat('+c+',minmax(0,1fr));gap:12px">'+inner+'</div>'; }
function _section(title, inner) { return '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:'+T3+';margin-bottom:8px">'+_esc(title)+'</div>'+inner+'</div>'; }
function _badge(t,bg,fg) { return '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:'+bg+';color:'+fg+'">'+_esc(t)+'</span>'; }
function _tipBadge(tip) { const t=TIPLER.find(x=>x.v===tip)||TIPLER[0]; return _badge(t.l,t.bg,t.fg); }
function _durumBadge(d) {
  const m={'taslak':['Taslak',BG2,T3],'bekliyor':['Onay Bekliyor','#FAEEDA',AMBER],'onaylandi':['Onaylı','#EAF3DE',GREEN],'arsivde':['Arşivde','#E6F1FB',BLUE],'kullanımda':['Kullanımda','#EEEDFE',PURPLE],'analizde':['Analizde','#FAEEDA','#633806'],'karantina':['Karantina','#FCEBEB',RED],'imha_bekliyor':['İmha Bkl.','#FCEBEB',RED],'imha':['İmha','#ddd','#666']};
  const c=m[d]||m.taslak; return _badge(c[0],c[1],c[2]);
}
function _imzaKutusu(id, label) {
  return '<div style="'+S_WK+';text-align:center"><div style="font-size:10px;font-weight:500;color:'+T1+';margin-bottom:6px">'+_esc(label)+'</div>'
    +_inp(id+'-ad','Ad Soyad',{req:true})
    +'<div style="font-size:9px;color:'+T3+';margin-top:4px" id="nms-'+id+'-ts">İmza bekleniyor</div>'
    +'<button onclick="window._nmsImza(\''+id+'\')" style="margin-top:6px;padding:4px 12px;border:0.5px solid '+BD+';border-radius:6px;background:'+BG1+';font-size:10px;cursor:pointer;font-family:inherit;color:'+BLUE+'">İmzala</button></div>';
}

/* ════════════════════════════════════════════════════════════════
   ANA LİSTE — renderNumuneler()
   ════════════════════════════════════════════════════════════════ */
function renderNumuneler() {
  const panel = _g('panel-numune');
  if (!panel) return;
  const all = _load().filter(n => !n.isDeleted);
  const today = _today();

  // Metrikler
  const total = all.length;
  const onayli = all.filter(n => n.approvalStatus==='approved' || n.tip==='sahit').length;
  const bekliyor = all.filter(n => n.approvalStatus==='pending').length;
  const sureDolan = all.filter(n => n.saklamaBitis && n.saklamaBitis < today && n.durum==='arsivde').length;
  const analizde = all.filter(n => n.durum==='analizde').length;
  const karantina = all.filter(n => n.durum==='karantina').length;
  const sikayet = all.filter(n => n.tip==='sikayet').length;
  const imhaBekl = all.filter(n => n.durum==='imha_bekliyor').length;

  const mk = (l,v,c) => '<div style="background:'+BG2+';border-radius:7px;padding:10px 14px"><div style="font-size:9px;color:'+T3+';text-transform:uppercase">'+l+'</div><div style="font-size:20px;font-weight:600;color:'+c+'">'+v+'</div></div>';

  let h = '<div style="padding:16px 24px;display:flex;flex-direction:column;gap:12px">';
  // Header
  h += '<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:16px;font-weight:700;color:'+T1+'">Numune Arşivi</div><div style="font-size:10px;color:'+T3+'">NMS — Numune Yönetim Sistemi</div></div>';
  h += '<div style="display:flex;gap:6px">';
  TIPLER.forEach(t => { h += '<button onclick="window.openNumuneForm(\''+t.v+'\')" style="padding:5px 10px;border:0.5px solid '+BD+';border-radius:6px;background:'+t.bg+';color:'+t.fg+';font-size:10px;cursor:pointer;font-family:inherit">+ '+t.l+'</button>'; });
  h += '</div></div>';

  // Metrik kartlar
  h += _grid(4, mk('Toplam',total,T1)+mk('Onaylı/Şahit',onayli,GREEN)+mk('Onay Bekliyor',bekliyor,AMBER)+mk('Süresi Dolan',sureDolan,RED));
  h += _grid(4, mk('Analizde',analizde,'#633806')+mk('Karantina',karantina,RED)+mk('Şikayet',sikayet,RED)+mk('İmha Bekliyor',imhaBekl,RED));

  // Filtre bar
  const chips = [['all','Tümü'],['gelen','Gelen'],['giden','Giden'],['sahit','Şahit'],['sikayet','Şikayet'],['analizde','Analizde'],['karantina','Karantina'],['sureDolan','Süresi Dolan']];
  h += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
  chips.forEach(([f,l]) => { h += '<span onclick="window._nmsFilter(\''+f+'\')" style="padding:4px 10px;border-radius:12px;font-size:10px;cursor:pointer;'+(_filter===f?'background:'+BLUE+';color:#fff':'background:'+BG2+';color:'+T2)+'">'+l+'</span>'; });
  h += '</div>';

  // Arama
  h += '<input class="fi" id="nms-search" placeholder="Numune ara (NMS ID, ürün, lot...)" oninput="window._nmsSearch(this.value)" value="'+_esc(_search)+'" style="border:0.5px solid '+BD+';border-radius:8px;font-size:11px;padding:8px 12px">';

  // Filtreleme
  let filtered = all;
  if (_filter !== 'all') {
    if (_filter === 'sureDolan') filtered = all.filter(n => n.saklamaBitis && n.saklamaBitis < today && n.durum==='arsivde');
    else if (_filter === 'analizde' || _filter === 'karantina') filtered = all.filter(n => n.durum===_filter);
    else filtered = all.filter(n => n.tip===_filter);
  }
  if (_search) { const q=_search.toLowerCase(); filtered=filtered.filter(n=>(n.nmsId||'').toLowerCase().includes(q)||(n.urunAdi||'').toLowerCase().includes(q)||(n.lotNo||'').toLowerCase().includes(q)||(n.tedarikciAdi||'').toLowerCase().includes(q)); }

  // Liste
  h += '<div style="'+S_WK+';padding:0;overflow:hidden">';
  if (!filtered.length) { h += '<div style="padding:24px;text-align:center;font-size:11px;color:'+T3+'">Numune bulunamadı</div>'; }
  filtered.forEach(n => {
    const sureDoldu = n.saklamaBitis && n.saklamaBitis < today && n.durum==='arsivde';
    h += '<div onclick="window._nmsPeek(\''+n.id+'\')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:0.5px solid '+BD+';cursor:pointer;transition:background .1s'+(sureDoldu?';background:#FEF2F2':'')+'" onmouseover="this.style.background=\''+BG2+'\'" onmouseout="this.style.background=\''+(sureDoldu?'#FEF2F2':'')+'\'"><div style="display:flex;align-items:center;gap:10px">'
      +(window.isAdmin?.() ? '<input type="checkbox" class="nms-bulk-chk" data-id="'+n.id+'" onclick="event.stopPropagation();_nmsBulkCheck()" style="width:14px;height:14px;cursor:pointer;flex-shrink:0;accent-color:var(--ac)">' : '')
      +_tipBadge(n.tip)
      +'<div><div style="font-size:12px;font-weight:500;color:'+T1+'">'+_esc(n.nmsId||'—')+' · '+_esc(n.urunAdi||'')+'</div>'
      +'<div style="font-size:9px;color:'+T3+'">'+_esc(n.urnKodu||'')+' · Lot: '+_esc(n.lotNo||'—')+' · '+_esc(n.tedarikciAdi||'')+' · '+_esc(n.depoKodu||'')+'</div></div></div>'
      +'<div style="display:flex;align-items:center;gap:8px">'+_durumBadge(n.durum)+(sureDoldu?_badge('Süre Doldu','#FCEBEB',RED):'')+'<span style="font-size:9px;color:'+T3+'">'+_fmt(n.saklamaBitis)+'</span></div></div>';
  });
  h += '</div>';

  // Peek panel
  if (_peekId) h += _renderPeek(_peekId);

  h += '</div>';
  panel.dataset.injected = '1';
  panel.innerHTML = h;
}

/* ── Peek Panel ─────────────────────────────────────────────── */
function _renderPeek(id) {
  const n = _load().find(x => String(x.id) === String(id));
  if (!n) return '';
  const isAdmin = _isA();
  let h = '<div style="position:fixed;right:0;top:0;bottom:0;width:420px;background:'+BG1+';border-left:0.5px solid '+BD+';z-index:300;overflow-y:auto;padding:16px;box-shadow:-4px 0 20px rgba(0,0,0,0.1)">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span style="font-size:14px;font-weight:600;color:'+T1+'">'+_esc(n.nmsId||'')+'</span><span onclick="window._nmsPeekClose()" style="cursor:pointer;font-size:16px;color:'+T3+'">✕</span></div>';
  h += _tipBadge(n.tip)+' '+_durumBadge(n.durum)+(n.locked?' '+_badge('Kilitli','#ddd','#666'):'');
  h += '<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;font-size:11px;color:'+T2+'">';
  const row = (l,v) => '<div style="display:flex;justify-content:space-between"><span style="color:'+T3+'">'+l+'</span><span style="color:'+T1+';font-weight:500">'+_esc(v||'—')+'</span></div>';
  h += row('Ürün',n.urunAdi)+row('URN',n.urnKodu)+row('Lot',n.lotNo)+row('Tedarikçi',n.tedarikciAdi)+row('Depo',n.depoKodu)+row('Kalite',n.kalite)+row('Ağırlık',n.agirlik)+row('Adet',n.adet)+row('Saklama',n.saklamaSuresi)+row('Bitiş',_fmt(n.saklamaBitis))+row('Sorumlu',n.sorumluId)+row('Tarih',_fmt(n.gelisTarihi||n.createdAt));
  if (n.notlar) h += '<div style="margin-top:6px;padding:8px;border-radius:6px;background:'+BG2+';font-size:10px">'+_esc(n.notlar)+'</div>';
  h += '</div>';

  // Butonlar
  h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px">';
  const btn = (label,fn,bg,fg) => '<button onclick="'+fn+'" style="padding:5px 10px;border:0.5px solid '+BD+';border-radius:6px;background:'+bg+';color:'+fg+';font-size:10px;cursor:pointer;font-family:inherit">'+label+'</button>';
  if (!n.locked) h += btn('Düzenle',"window.openNumuneForm('"+n.tip+"','"+n.id+"')",BG1,BLUE);
  if (isAdmin && n.approvalStatus==='pending') { h += btn('Onayla',"window.onaylaNumune('"+n.id+"')",'#EAF3DE',GREEN); h += btn('Reddet',"window.reddedNumune('"+n.id+"')",'#FCEBEB',RED); }
  if (isAdmin && !n.locked) h += btn('Kilitle',"window._nmsKilitle('"+n.id+"')",BG2,T2);
  h += btn('Teslim Al',"window.openIslemForm('teslim_alma','"+n.id+"')",BG1,BLUE);
  h += btn('Dış Teslim',"window.openIslemForm('dis_teslim','"+n.id+"')",BG1,BLUE);
  h += btn('Arşivden Çıkar',"window.openIslemForm('arsiv_cikaris','"+n.id+"')",BG1,AMBER);
  h += btn('Arşive İade',"window.openIslemForm('arsiv_iade','"+n.id+"')",BG1,GREEN);
  h += btn('Karşılaştır',"window.openKarsilastirmaForm('"+n.id+"')",BG1,PURPLE);
  h += btn('Analize Gönder',"window._nmsDurumDegistir('"+n.id+"','analizde')",BG1,'#633806');
  h += btn('Karantinaya Al',"window._nmsDurumDegistir('"+n.id+"','karantina')",'#FCEBEB',RED);
  h += btn('İmhaya Ayır',"window._nmsDurumDegistir('"+n.id+"','imha_bekliyor')",'#FCEBEB',RED);
  h += btn('Etiket Bas',"window.openEtiketForm('"+n.id+"')",BG2,T1);
  h += '</div>';

  // Log
  if (n.loglar?.length) { h += '<div style="margin-top:12px;font-size:10px;font-weight:500;color:'+T1+'">Loglar</div>'; n.loglar.forEach(l => { h += '<div style="font-size:9px;color:'+T3+';margin-top:3px">'+_fmt(l.tarih)+' — '+_esc(l.kim||'')+': '+_esc(l.not||'')+'</div>'; }); }
  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   KAYIT FORMU — openNumuneForm(tip, id)
   ════════════════════════════════════════════════════════════════ */
function openNumuneForm(tip, id) {
  const panel = _g('panel-numune');
  if (!panel) { window.renderNumuneler?.(); setTimeout(() => openNumuneForm(tip,id), 150); return; }
  const n = id ? _load().find(x => String(x.id) === String(id)) || {} : {};
  const isEdit = !!id;
  const ro = n.locked;
  const nmsId = n.nmsId || _nmsId();
  const urunOpts = _loadU().map(u => ({v:u.id||u.urunKodu,l:(u.urunAdi||u.duayAdi||'')+(u.urunKodu?' ('+u.urunKodu+')':'')}));
  const cariOpts = _loadCari().map(c => ({v:c.id||c.ad,l:c.ad||c.firma||''}));
  const userOpts = _loadUsers().filter(u=>u.status==='active').map(u=>({v:u.id,l:u.name||''}));
  const numOpts = _load().filter(x=>x.tip==='sahit'&&!x.isDeleted).map(x=>({v:x.nmsId,l:x.nmsId+' '+_esc(x.urunAdi||'')}));

  delete panel.dataset.injected;
  let h = '<div style="max-width:860px;margin:0 auto;padding:20px 32px;display:flex;flex-direction:column;gap:14px">';
  h += '<div><span onclick="window.renderNumuneler()" style="font-size:10px;color:'+BLUE+';cursor:pointer">← Numune Listesi</span></div>';
  h += '<div style="font-size:15px;font-weight:600;color:'+T1+'">'+(isEdit?'Numune Düzenle':'Yeni '+_esc((TIPLER.find(t=>t.v===tip)||{}).l||'')+' Numune')+'</div>';
  h += '<input type="hidden" id="nms-edit-id" value="'+_esc(id||'')+'">';
  h += '<input type="hidden" id="nms-tip" value="'+_esc(tip||'gelen')+'">';

  // Ortak alanlar
  h += _section('Temel Bilgiler', _grid(4,
    _inp('nmsid','NMS ID',{val:nmsId,ro:true})+_sel('urn','URN Ürün Kodu',urunOpts,{req:true,sel:n.urnKodu})+_inp('lot','Lot/Parti No',{req:true,val:n.lotNo,ro})+_inp('tarih','Tarih',{type:'date',req:true,val:n.gelisTarihi||_today(),ro})
  )+_grid(4,
    _sel('tedarikci','Tedarikçi',cariOpts,{sel:n.tedarikciId})+_inp('depo','Depo Kodu (Dolap-Raf-Kutu)',{val:n.depoKodu,ro})+_sel('sorumlu','Sorumlu',userOpts,{sel:n.sorumluId})+_sel('saklama','Saklama Süresi',SAKLAMA,{sel:n.saklamaSuresi})
  )+_grid(4,
    _inp('job-id','Job ID',{val:n.jobId,ph:'JOB-26-0001'})+'<div></div><div></div><div></div>'
  ));

  // Tip'e özel alanlar
  if (tip === 'gelen') {
    h += _section('Gelen Numune Bilgileri', _grid(4,
      _inp('sevkiyat','Sevkiyat/Kargo No',{val:n.sevkiyatNo,ro})+_inp('ihracat-dosya','İhracat Dosya No',{val:n.ihracatDosyaNo,ro})+_inp('konteyner','Konteyner No',{val:n.konteynerNo,ro})+_inp('agirlik','Ağırlık',{val:n.agirlik,ro})
    )+_grid(4,
      _inp('adet','Adet',{type:'number',val:n.adet,ro})+_inp('renk','Renk/Seri',{val:n.renk,ro})+_sel('kalite','Kalite Sınıfı',KALITE,{sel:n.kalite})+_sel('analiz','Analiz Gerekiyor mu?',[{v:'evet',l:'Evet'},{v:'hayir',l:'Hayır'}],{sel:n.analizGerekiyor?'evet':'hayir'})
    ));
  } else if (tip === 'giden') {
    h += _section('Giden Numune Bilgileri', _grid(3,
      _sel('alici','Alıcı (Cari)',cariOpts,{req:true,sel:n.musteri})+_inp('teslim-alan','Teslim Alan Kişi',{val:n.teslimAlan})+_sel('gonderim-amac','Gönderim Amacı',GONDERIM_AMAC,{sel:n.gonderimAmaci})
    )+_grid(3,
      _sel('iade-bekleniyor','İade Bekleniyor?',[{v:'evet',l:'Evet'},{v:'hayir',l:'Hayır'}],{sel:n.iadeBekleniyor||'hayir'})+_inp('iade-tarih','İade Tarihi',{type:'date',val:n.iadeTarihi})+_inp('kargo-takip','Kargo Takip No',{val:n.kargoTakipNo})
    ));
  } else if (tip === 'sahit') {
    h += _section('Şahit Numune Bilgileri', _grid(3,
      _sel('bagli-musteri','Bağlı Müşteri',cariOpts,{sel:n.musteri})+_inp('sevkiyat','Sevkiyat No',{val:n.sevkiyatNo,ro})+_inp('uretim-tarihi','Üretim Tarihi',{type:'date',val:n.uretimTarihi,ro})
    ));
    if (ro) h += '<div style="padding:8px;border-radius:6px;background:#FAEEDA;font-size:10px;color:#633806">Onay sonrası form kilitli. Sadece log eklenebilir.</div>';
    h += _ta('log-ekle','Log Ekle',{ph:'Yeni not ekleyin...'});
  } else if (tip === 'sikayet') {
    h += _section('Şikayet / Dönen Numune', _grid(2,
      _sel('bagli-sahit','Bağlı Şahit Numune',numOpts,{sel:n.bagliSahit})+_sel('sikayet-eden','Şikayet Eden',cariOpts,{req:true,sel:n.sikayetEden})
    )+_grid(2,
      _sel('sikayet-konusu','Şikayet Konusu',SIKAYET_KONUSU,{sel:n.sikayetKonusu})+_sel('karar','Karar',KARAR,{sel:n.karar})
    )+_ta('musteri-ifade','Müşterinin İfadesi',{val:n.musteriIfadesi})+_ta('karsilastirma-sonuc','Karşılaştırma Sonucu',{val:n.karsilastirmaSonucu}));
    h += _section('Fark Fotoğrafları (min 2)', _grid(2, _upload('fark1','Fark 1',{req:true})+_upload('fark2','Fark 2',{req:true})));
  } else if (tip === 'referans') {
    h += _section('Referans Numune', _grid(2,
      _inp('agirlik','Ağırlık',{val:n.agirlik})+_inp('adet','Adet',{type:'number',val:n.adet})
    )+_inp('renk','Renk/Seri',{val:n.renk})+_ta('referans-not','Referans Notu',{val:n.referansNotu}));
  }

  // Ortak: Fotoğraf + Not
  h += _section('Fotoğraflar (min 3 zorunlu)', _grid(3, _upload('foto1','Fotoğraf 1',{req:true})+_upload('foto2','Fotoğraf 2',{req:true})+_upload('foto3','Fotoğraf 3',{req:true})));
  h += _ta('notlar','Notlar',{val:n.notlar,span:2});

  // Kaydet
  h += '<div style="display:flex;gap:8px;margin-top:8px"><button onclick="window.saveNumune()" style="padding:8px 20px;border:none;border-radius:8px;background:'+BLUE+';color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Kaydet</button>'
    +'<button onclick="window.renderNumuneler()" style="padding:8px 20px;border:0.5px solid '+BD+';border-radius:8px;background:'+BG1+';color:'+T2+';font-size:12px;cursor:pointer;font-family:inherit">İptal</button></div>';
  h += '</div>';
  panel.innerHTML = h;
}

/* ════════════════════════════════════════════════════════════════
   İŞLEM FORMLARI — openIslemForm(islemTip, nmsId)
   ════════════════════════════════════════════════════════════════ */
function openIslemForm(islemTip, nmsId) {
  const panel = _g('panel-numune');
  if (!panel) return;
  const n = _load().find(x => String(x.id) === String(nmsId)) || {};
  const prefixMap = {teslim_alma:'TSL',dis_teslim:'DTS',arsiv_cikaris:'ARV',arsiv_iade:'IAD'};
  const tutNo = _tutanakNo(prefixMap[islemTip]||'TSL');
  const userOpts = _loadUsers().filter(u=>u.status==='active').map(u=>({v:u.id,l:u.name||''}));

  delete panel.dataset.injected;
  let h = '<div style="max-width:860px;margin:0 auto;padding:20px 32px;display:flex;flex-direction:column;gap:14px">';
  h += '<div><span onclick="window.renderNumuneler()" style="font-size:10px;color:'+BLUE+';cursor:pointer">← Numune Listesi</span></div>';

  const titleMap = {teslim_alma:'Teslim Alma',dis_teslim:'Dış Teslim',arsiv_cikaris:'Arşivden Çıkarma',arsiv_iade:'Arşive İade'};
  h += '<div style="font-size:15px;font-weight:600;color:'+T1+'">'+_esc(titleMap[islemTip]||'İşlem')+'</div>';
  h += '<input type="hidden" id="nms-islem-tip" value="'+_esc(islemTip)+'">';
  h += '<input type="hidden" id="nms-islem-nmsid" value="'+_esc(nmsId)+'">';

  // Numune bilgileri readonly
  h += _section('Numune Bilgileri', _grid(4,
    _inp('i-nmsid','NMS ID',{val:n.nmsId,ro:true})+_inp('i-urun','Ürün',{val:n.urunAdi,ro:true})+_inp('i-lot','Lot',{val:n.lotNo,ro:true})+_inp('i-depo','Depo',{val:n.depoKodu,ro:true})
  ));
  h += _inp('i-tutanak','Tutanak No',{val:tutNo,ro:true});

  if (islemTip === 'teslim_alma') {
    h += _section('Teslim Bilgileri', _grid(3,
      _sel('i-alan','Teslim Alan',userOpts,{req:true})+_sel('i-amac','Teslim Amacı',GONDERIM_AMAC,{req:true})+_inp('i-iade-tarih','Tahmini İade Tarihi',{type:'date',req:true})
    )+_ta('i-not','Notlar',{}));
    h += _section('Fotoğraflar (min 2)', _grid(3, _upload('i-foto1','Fotoğraf 1',{req:true})+_upload('i-foto2','Fotoğraf 2',{req:true})+_upload('i-foto3','Fotoğraf 3',{})));
    h += _section('İmzalar', _grid(2, _imzaKutusu('i-teslim-eden','Teslim Eden')+_imzaKutusu('i-teslim-alan','Teslim Alan')));
  } else if (islemTip === 'dis_teslim') {
    h += _section('Alıcı Bilgileri', _grid(3,
      _sel('i-alici-taraf','Alıcı Taraf',ALICI_TARAF,{req:true})+_inp('i-kurum','Firma/Kurum Adı',{req:true})+_inp('i-kisi','Teslim Alan Kişi',{req:true})
    )+_grid(3,
      _sel('i-amac','Teslim Amacı',GONDERIM_AMAC,{req:true})+_sel('i-iade-bekl','İade Bekleniyor',[{v:'evet',l:'Evet'},{v:'hayir',l:'Hayır'}])+_inp('i-iade-tarih','İade Tarihi',{type:'date'})
    )+_ta('i-kosullar','Teslim Koşulları',{}));
    h += _section('Noterlik (opsiyonel)', _grid(3, _inp('i-noter-ad','Noterlik Adı')+_inp('i-noter-no','Tutanak No')+_inp('i-noter-tarih','Tarih',{type:'date'})));
    h += _section('Fotoğraflar (min 2)', _grid(3, _upload('i-foto1','Fotoğraf 1',{req:true})+_upload('i-foto2','Fotoğraf 2',{req:true})+_upload('i-foto3','Fotoğraf 3',{})));
    h += _section('İmzalar', _grid(2, _imzaKutusu('i-teslim-eden','Teslim Eden (Duay)')+_imzaKutusu('i-teslim-alan','Teslim Alan (Dış Taraf)')));
    h += _grid(2, _inp('i-tc','TC Kimlik No')+_inp('i-kase','Kaşe'));
  } else if (islemTip === 'arsiv_cikaris') {
    h += _section('Çıkarma Bilgileri', _grid(2,
      _sel('i-sebep','Sebep',ARSIV_SEBEP,{req:true})+_sel('i-talep','Talep Eden',userOpts,{req:true})
    )+_ta('i-aciklama','Detaylı Açıklama',{req:true})+_grid(2,
      _inp('i-iade-tarih','Tahmini İade Tarihi',{type:'date',req:true})+_inp('i-nereye','Nereye Götürülecek')
    ));
    if (_isA()) {
      h += _section('Yönetici Onay', '<div style="padding:10px;border-radius:6px;background:#FAEEDA;font-size:10px;color:#633806">Arşivden çıkarma yönetici onayı gerektirir.</div>'
        +'<div style="display:flex;gap:6px;margin-top:6px"><button onclick="window._nmsArsivOnay(\''+nmsId+'\',true)" style="padding:5px 12px;border:none;border-radius:6px;background:'+GREEN+';color:#fff;font-size:10px;cursor:pointer;font-family:inherit">Onayla</button>'
        +'<button onclick="window._nmsArsivOnay(\''+nmsId+'\',false)" style="padding:5px 12px;border:0.5px solid '+BD+';border-radius:6px;background:'+BG1+';color:'+RED+';font-size:10px;cursor:pointer;font-family:inherit">Reddet</button></div>');
    } else { h += '<div style="padding:10px;border-radius:6px;background:#FAEEDA;font-size:10px;color:#633806">Onay bekleniyor — yönetici onayı gereklidir.</div>'; }
  } else if (islemTip === 'arsiv_iade') {
    const cikis = _loadIslem().find(i => i.nmsId === nmsId && i.islemTip === 'arsiv_cikaris');
    h += _section('İade Bilgileri', _grid(2,
      _inp('i-arsiv-ref','Bağlı Çıkarma (ARV)',{val:cikis?.tutanakNo||'',ro:true})+_sel('i-eden','İade Eden',userOpts,{req:true})
    )+_grid(2,
      _sel('i-kullanim','Kullanım Sonucu',KULLANIM_SONUC,{req:true})+_sel('i-fiziksel','Fiziksel Durum',FIZIKSEL_DURUM,{req:true})
    )+_grid(2,
      _sel('i-etiket','Etiket Durumu',['Sağlam','Hasar','Kayıp'],{req:true})+_sel('i-ambalaj','Ambalaj Durumu',['Sağlam','Hasar','Açılmış'],{})
    )+_ta('i-durum-notu','Durum Notu',{})+_grid(2,
      _inp('i-konum','Yerleştirilecek Konum',{req:true})+_sel('i-arsiv-sorumlu','Arşiv Sorumlusu',userOpts,{req:true})
    ));
    h += _section('Fotoğraflar (min 2)', _grid(3, _upload('i-foto1','Fotoğraf 1',{req:true})+_upload('i-foto2','Fotoğraf 2',{req:true})+_upload('i-foto3','Fotoğraf 3',{})));
    h += _section('İmzalar', _grid(2, _imzaKutusu('i-eden-imza','İade Eden')+_imzaKutusu('i-sorumlu-imza','Arşiv Sorumlusu')));
  }

  h += '<div style="display:flex;gap:8px;margin-top:8px"><button onclick="window.saveIslem()" style="padding:8px 20px;border:none;border-radius:8px;background:'+BLUE+';color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Kaydet</button>'
    +'<button onclick="window.renderNumuneler()" style="padding:8px 20px;border:0.5px solid '+BD+';border-radius:8px;background:'+BG1+';color:'+T2+';font-size:12px;cursor:pointer;font-family:inherit">İptal</button></div>';
  h += '</div>';
  panel.innerHTML = h;
}

/* ════════════════════════════════════════════════════════════════
   KARŞILAŞTIRMA FORMU
   ════════════════════════════════════════════════════════════════ */
function openKarsilastirmaForm(nmsIdA, nmsIdB) {
  const panel = _g('panel-numune'); if (!panel) return;
  const numOpts = _load().filter(x=>!x.isDeleted).map(x=>({v:x.id,l:x.nmsId+' '+_esc(x.urunAdi||'')}));
  delete panel.dataset.injected;
  let h = '<div style="max-width:860px;margin:0 auto;padding:20px 32px;display:flex;flex-direction:column;gap:14px">';
  h += '<div><span onclick="window.renderNumuneler()" style="font-size:10px;color:'+BLUE+';cursor:pointer">← Numune Listesi</span></div>';
  h += '<div style="font-size:15px;font-weight:600;color:'+T1+'">Numune Karşılaştırma</div>';
  h += _grid(3, _sel('k-a','Numune A (Referans)',numOpts,{req:true,sel:nmsIdA})+_sel('k-b','Numune B',numOpts,{req:true,sel:nmsIdB})+_sel('k-c','Numune C (opsiyonel)',numOpts));
  h += _sel('k-amac','Karşılaştırma Amacı',['Kalite kontrolü','Şikayet','Yeni tedarikçi','Seri farkı','Diğer']);

  // Kriter tablosu
  h += '<div style="font-size:11px;font-weight:600;color:'+T3+';margin-top:8px">KRİTER TABLOSU</div>';
  h += '<div style="'+S_WK+';padding:0;overflow:hidden">';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:8px 12px;background:'+BG2+';font-size:10px;font-weight:500;color:'+T3+'"><span>Kriter</span><span>Numune A</span><span>Numune B</span><span>Fark</span></div>';
  KARSILASTIRMA_KRITER.forEach(k => {
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:6px 12px;border-top:0.5px solid '+BD+';font-size:10px;align-items:center">'
      +'<span style="color:'+T1+'">'+_esc(k)+'</span>'
      +'<input class="fi" id="nms-ka-'+k.replace(/\//g,'')+'" style="font-size:10px;padding:4px 6px;border:0.5px solid '+BD+';border-radius:4px" readonly placeholder="Otomatik">'
      +'<input class="fi" id="nms-kb-'+k.replace(/\//g,'')+'" style="font-size:10px;padding:4px 6px;border:0.5px solid '+BD+';border-radius:4px">'
      +'<select class="fi" id="nms-kf-'+k.replace(/\//g,'')+'" style="font-size:10px;padding:4px 6px;border:0.5px solid '+BD+';border-radius:4px">'
      +FARK_SEC.map(f=>'<option>'+f+'</option>').join('')+'</select></div>';
  });
  h += '</div>';
  h += _grid(3, _sel('k-sonuc','Genel Sonuç',KARAR)+_sel('k-sorumlu','Sorumlu Taraf',['Tedarikçi','Nakliye','Depo','Belirsiz'])+_sel('k-aksiyon','Aksiyon',['Kabul','Red','Yeniden numune','Bildirim','Diğer']));
  h += _ta('k-not','Karşılaştırma Notu');
  h += _section('Fotoğraflar (min 2)', _grid(2, _upload('k-foto1','Yan Yana',{req:true})+_upload('k-foto2','Fark Detay',{req:true})));

  h += '<div style="display:flex;gap:8px;margin-top:8px"><button onclick="window._nmsKarsilastirmaKaydet()" style="padding:8px 20px;border:none;border-radius:8px;background:'+BLUE+';color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Kaydet</button>'
    +'<button onclick="window.renderNumuneler()" style="padding:8px 20px;border:0.5px solid '+BD+';border-radius:8px;background:'+BG1+';color:'+T2+';font-size:12px;cursor:pointer;font-family:inherit">İptal</button></div>';
  h += '</div>';
  panel.innerHTML = h;
}

/* ════════════════════════════════════════════════════════════════
   ETİKET FORMU — openEtiketForm(nmsId, etiketTip)
   ════════════════════════════════════════════════════════════════ */
function openEtiketForm(nmsId, etiketTip) {
  const panel = _g('panel-numune'); if (!panel) return;
  const n = _load().find(x => String(x.id) === String(nmsId)) || {};
  const tip = etiketTip || 'ic';
  const tipConf = {musteri:{l:'Müşteri',bg:NAVY,fg:'#E6F1FB'},tedarikci:{l:'Tedarikçi',bg:'#FAEEDA',fg:'#633806'},ic:{l:'İç Etiket',bg:'#E6F1FB',fg:BLUE},yonetici:{l:'Yönetici',bg:'#FCEBEB',fg:RED}};
  const tc = tipConf[tip] || tipConf.ic;

  delete panel.dataset.injected;
  let h = '<div style="max-width:860px;margin:0 auto;padding:20px 32px;display:flex;flex-direction:column;gap:14px">';
  h += '<div><span onclick="window.renderNumuneler()" style="font-size:10px;color:'+BLUE+';cursor:pointer">← Numune Listesi</span></div>';
  h += '<div style="font-size:15px;font-weight:600;color:'+T1+'">Etiket Bas — '+_esc(tc.l)+'</div>';

  // Tip seçimi
  h += '<div style="display:flex;gap:6px">';
  Object.entries(tipConf).forEach(([k,v]) => {
    if (k === 'yonetici' && !_isA()) return;
    h += '<button onclick="window.openEtiketForm(\''+nmsId+'\',\''+k+'\')" style="padding:5px 12px;border:0.5px solid '+(tip===k?v.bg:BD)+';border-radius:6px;background:'+(tip===k?v.bg:BG1)+';color:'+(tip===k?v.fg:T2)+';font-size:10px;cursor:pointer;font-family:inherit">'+_esc(v.l)+'</button>';
  });
  h += '</div>';

  // Önizleme + form
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
  // Sol: form
  h += '<div>';
  const show = (field, label, val) => {
    const visible = { musteri:['nmsId','tarih','urunAdi','ingAdi','mensei','adet','tip','refNo'], tedarikci:['nmsId','tarih','ingAdi','lotNo','adet','amac','teknikAciklama','iadeTarihi'], ic:['nmsId','urunAdi','teslimAlan','amac','iadeTarihi'], yonetici:['nmsId','tarih','urunAdi','ingAdi','mensei','lotNo','adet','tip','tedarikci','musteri','depo','urnKodu'] };
    if (!(visible[tip]||[]).includes(field)) return '';
    return '<div style="margin-bottom:6px"><div style="font-size:9px;color:'+T3+'">'+_esc(label)+'</div><div style="font-size:11px;color:'+T1+'">'+_esc(val||'—')+'</div></div>';
  };
  h += show('nmsId','NMS ID',n.nmsId)+show('tarih','Tarih',_fmt(n.gelisTarihi))+show('urunAdi','Ürün Adı',n.urunAdi)+show('ingAdi','İngilizce Ad',n.standartAdi||n.urunAdi)+show('mensei','Menşei',n.mensei)+show('lotNo','Lot No',n.lotNo)+show('adet','Adet',n.adet)+show('tip','Numune Türü',(TIPLER.find(t=>t.v===n.tip)||{}).l)+show('tedarikci','Tedarikçi',n.tedarikciAdi)+show('musteri','Müşteri',n.musteri)+show('depo','Depo Konumu',n.depoKodu)+show('urnKodu','URN Kodu',n.urnKodu);
  h += '</div>';
  // Sağ: önizleme
  h += '<div style="border:2px solid '+tc.bg+';border-radius:10px;padding:16px;min-height:200px">';
  h += '<div style="font-size:8px;color:'+tc.fg+';text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">'+_esc(tc.l)+' ETİKETİ</div>';
  h += '<div style="font-size:14px;font-weight:700;color:'+T1+';margin-bottom:4px">'+_esc(n.nmsId||'NMS-XXXX')+'</div>';
  h += '<div style="font-size:11px;color:'+T1+'">'+_esc(n.urunAdi||'Ürün Adı')+'</div>';
  if (tip !== 'musteri') h += '<div style="font-size:9px;color:'+T3+';margin-top:2px">Lot: '+_esc(n.lotNo||'—')+'</div>';
  h += '<div style="font-size:9px;color:'+T3+'">'+_fmt(n.gelisTarihi)+'</div>';
  h += '<div style="margin-top:8px;width:60px;height:60px;background:'+BG2+';border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:'+T3+'">QR</div>';
  h += '</div></div>';

  h += '<button onclick="window.toast?.(\'PDF oluşturuluyor...\',\'info\')" style="padding:8px 20px;border:none;border-radius:8px;background:'+tc.bg+';color:'+tc.fg+';font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">PDF Bas & İndir</button>';
  if (tip === 'yonetici') {
    const cu = _cu();
    const d = _load(); const nm = d.find(x=>String(x.id)===String(nmsId));
    if (nm) { nm.loglar = nm.loglar || []; nm.loglar.push({tarih:_now().toISOString(),kim:cu?.name,not:'Yönetici etiketi basıldı'}); _store(d); }
  }
  h += '</div>';
  panel.innerHTML = h;
}

/* ════════════════════════════════════════════════════════════════
   KAYDET FONKSİYONLARI
   ════════════════════════════════════════════════════════════════ */
function saveNumune() {
  try {
    const tip = _g('nms-tip')?.value;
    const editId = _g('nms-edit-id')?.value;
    const data = _load();
    const cu = _cu();
    const vals = {};
    document.querySelectorAll('[id^="nms-"]').forEach(el => {
      if (el.type==='hidden'||el.type==='file'||el.tagName==='DIV') return;
      const key = el.id.replace('nms-','').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
      vals[key] = el.value;
    });
    if (!vals.lot) { window.toast?.('Lot No zorunlu','error'); return; }
    // Saklama bitiş hesapla
    vals.saklamaBitis = _saklamaBitis(vals.tarih, vals.saklama);
    vals.tip = tip;
    vals.urunAdi = _loadU().find(u => String(u.id||u.urunKodu) === vals.urn)?.urunAdi || vals.urn || '';
    vals.urnKodu = vals.urn;
    vals.tedarikciAdi = _loadCari().find(c => String(c.id||c.ad) === vals.tedarikci)?.ad || vals.tedarikci || '';
    vals.tedarikciId = vals.tedarikci;
    vals.analizGerekiyor = vals.analiz === 'evet';
    vals.referansNumune = tip === 'referans';

    let existing = editId ? data.find(x => String(x.id) === editId) : null;
    if (existing) {
      Object.assign(existing, vals, { updatedAt: _now().toISOString() });
    } else {
      existing = { id: _genId(), nmsId: vals.nmsid || _nmsId(), createdAt: _now().toISOString(), createdBy: cu?.id, approvalStatus: 'pending', durum: 'bekliyor', locked: false, loglar: [{tarih:_now().toISOString(),kim:cu?.name,not:'Numune oluşturuldu'}], ...vals };
      data.push(existing);
    }
    // Şahit log ekleme
    if (tip === 'sahit' && vals.logEkle) {
      existing.loglar = existing.loglar || [];
      existing.loglar.push({tarih:_now().toISOString(),kim:cu?.name,not:vals.logEkle});
    }
    _store(data);
    window.toast?.('Numune kaydedildi','success');
    window.logActivity?.('numune','Numune kaydedildi: '+(existing.nmsId||''));
    renderNumuneler();
  } catch (e) { console.error('[numuneler] saveNumune hata:', e); }
}

function saveIslem() {
  try {
    const islemTip = _g('nms-islem-tip')?.value;
    const nmsId = _g('nms-islem-nmsid')?.value;
    const cu = _cu();
    const vals = {};
    document.querySelectorAll('[id^="nms-i-"]').forEach(el => {
      if (el.type==='hidden'||el.type==='file'||el.tagName==='DIV') return;
      const key = el.id.replace('nms-i-','').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
      vals[key] = el.value;
    });
    const islemler = _loadIslem();
    const islem = { id: _genId(), islemTip, nmsId, tutanakNo: vals.tutanak, createdAt: _now().toISOString(), createdBy: cu?.id, ...vals };
    islemler.push(islem);
    _storeIslem(islemler);
    // Numune durumunu güncelle
    const data = _load();
    const nm = data.find(x => String(x.id) === String(nmsId));
    if (nm) {
      const durumMap = {teslim_alma:'kullanımda',dis_teslim:'kullanımda',arsiv_iade:'arsivde'};
      if (durumMap[islemTip]) nm.durum = durumMap[islemTip];
      if (islemTip === 'arsiv_iade' && nm.tip === 'sahit') nm.locked = true;
      nm.loglar = nm.loglar || [];
      nm.loglar.push({tarih:_now().toISOString(),kim:cu?.name,not:islemTip.replace(/_/g,' ')+' işlemi yapıldı'});
      nm.updatedAt = _now().toISOString();
      _store(data);
    }
    window.toast?.('İşlem kaydedildi','success');
    renderNumuneler();
  } catch (e) { console.error('[numuneler] saveIslem hata:', e); }
}

/* ════════════════════════════════════════════════════════════════
   ONAY + DURUM + YARDIMCI
   ════════════════════════════════════════════════════════════════ */
function onaylaNumune(id) {
  const d = _load(); const n = d.find(x => String(x.id)===String(id)); if (!n) return;
  const cu = _cu();
  n.approvalStatus = 'approved'; n.approvedBy = cu?.id; n.approvedAt = _now().toISOString();
  n.durum = 'onaylandi';
  if (n.tip === 'sahit') n.locked = true;
  n.loglar = n.loglar||[]; n.loglar.push({tarih:_now().toISOString(),kim:cu?.name,not:'Onaylandı'});
  _store(d); window.toast?.('Numune onaylandı','success'); _peekId = null; renderNumuneler();
}
function reddedNumune(id) {
  const sebep = prompt('Ret sebebi:'); if (!sebep) return;
  const d = _load(); const n = d.find(x => String(x.id)===String(id)); if (!n) return;
  const cu = _cu();
  n.approvalStatus = 'rejected'; n.rejectionNote = sebep; n.durum = 'taslak';
  n.loglar = n.loglar||[]; n.loglar.push({tarih:_now().toISOString(),kim:cu?.name,not:'Reddedildi: '+sebep});
  _store(d); window.toast?.('Numune reddedildi','info'); _peekId = null; renderNumuneler();
  window.addNotif?.('⚠','Numune reddedildi: '+(n.nmsId||''),'warning','numune');
}
function deleteNumune(id) {
  if (!window._yetkiKontrol?.('sil', 'Numune')) return;
  if (!_isA()) { window.toast?.('Yetki yok','error'); return; }
  const d = _load(); const n = d.find(x => String(x.id)===String(id)); if (!n) return;
  n.isDeleted = true; n.deletedAt = _now().toISOString(); n.deletedBy = _cu()?.id;
  _store(d); window.toast?.('Numune silindi','success'); _peekId = null; renderNumuneler();
}

/* ── Yardımcı Handlers ──────────────────────────────────────── */
window._nmsFilter = f => { _filter = f; renderNumuneler(); };
window._nmsSearch = q => { _search = q; renderNumuneler(); };
window._nmsPeek = id => { _peekId = id; renderNumuneler(); };
window._nmsPeekClose = () => { _peekId = null; renderNumuneler(); };
window._nmsKilitle = id => { const d=_load();const n=d.find(x=>String(x.id)===String(id));if(n){n.locked=true;n.loglar=n.loglar||[];n.loglar.push({tarih:_now().toISOString(),kim:_cu()?.name,not:'Kilitlendi'});_store(d);}_peekId=null;renderNumuneler(); };
window._nmsDurumDegistir = (id,durum) => { const d=_load();const n=d.find(x=>String(x.id)===String(id));if(n){n.durum=durum;n.loglar=n.loglar||[];n.loglar.push({tarih:_now().toISOString(),kim:_cu()?.name,not:'Durum: '+durum});n.updatedAt=_now().toISOString();_store(d);}_peekId=null;renderNumuneler(); };
window._nmsArsivOnay = (id,onay) => { if(onay){window._nmsDurumDegistir(id,'kullanımda');window.toast?.('Arşiv çıkarma onaylandı','success');}else{window.toast?.('Arşiv çıkarma reddedildi','info');renderNumuneler();} };
window._nmsImza = id => { const ts=_g('nms-'+id+'-ts'); if(ts) ts.textContent='İmzalandı: '+_now().toLocaleString('tr-TR'); };
window._nmsFileChange = (id, inp) => { const p=_g('nms-'+id+'-p'); if(p&&inp.files?.length) p.textContent=inp.files.length+' dosya seçildi'; };
window._nmsKarsilastirmaKaydet = () => { window.toast?.('Karşılaştırma kaydedildi','success'); renderNumuneler(); };

/* ════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════ */
window.renderNumuneler = renderNumuneler;
window.renderNumune = renderNumuneler;
window.openNumuneForm = openNumuneForm;
window.openIslemForm = openIslemForm;
window.openKarsilastirmaForm = openKarsilastirmaForm;
window.openEtiketForm = openEtiketForm;
window.saveNumune = saveNumune;
window.saveIslem = saveIslem;
window.onaylaNumune = onaylaNumune;
window.reddedNumune = reddedNumune;
window.deleteNumune = deleteNumune;

if (typeof module !== 'undefined' && module.exports) module.exports = { renderNumuneler, openNumuneForm, openIslemForm, saveNumune };

})();

// ── Numune Toplu silme ──────────────────────────
window._nmsBulkCheck = function() { var n = document.querySelectorAll('.nms-bulk-chk:checked').length; var bar = document.getElementById('nms-bulk-bar'); var cnt = document.getElementById('nms-bulk-cnt'); if (bar) bar.style.display = n ? 'flex' : 'none'; if (cnt) cnt.textContent = n; };
window._nmsBulkClear = function() { document.querySelectorAll('.nms-bulk-chk').forEach(function(cb) { cb.checked = false; }); var bar = document.getElementById('nms-bulk-bar'); if (bar) bar.style.display = 'none'; };
window._nmsBulkDelete = function() {
  var ids = Array.from(document.querySelectorAll('.nms-bulk-chk:checked')).map(function(cb) { return cb.dataset.id; });
  if (!ids.length) return;
  window.confirmModal(ids.length + ' numune kaydı çöp kutusuna taşınacak.', { title: 'Toplu Sil', danger: true, confirmText: 'Evet, Sil', onConfirm: function() {
    var data = typeof window.loadNumune === 'function' ? window.loadNumune() : []; var trash = typeof loadTrash === 'function' ? loadTrash() : []; var now = new Date().toISOString(); var exp = new Date(Date.now() + 30 * 86400000).toISOString();
    data.forEach(function(n) { if (ids.indexOf(String(n.id)) === -1) return; trash.unshift({ id: typeof generateNumericId === 'function' ? generateNumericId() : Date.now(), name: n.nmsId || n.urunAdi || '—', moduleName: 'Numune', originalCollection: 'numune', originalData: Object.assign({}, n, { isDeleted: true, deletedAt: now }), deletedAt: now, deletedByName: window.CU?.()?.name || 'Admin', expiresAt: exp }); n.isDeleted = true; n.deletedAt = now; });
    if (typeof window.storeNumune === 'function') window.storeNumune(data); if (typeof storeTrash === 'function') storeTrash(trash);
    window._nmsBulkClear(); window.renderNumuneler?.(); window.toast?.(ids.length + ' kayıt silindi', 'ok');
  }});
};
