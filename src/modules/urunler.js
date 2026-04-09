/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/urunler.js  —  v8.2.0
 * URN-007-v2 — Ürün formu tam yeniden yazım (sekme + 4 etap)
 *
 * Mevcut liste (app_patch renderUrunler) korunur.
 * Bu modül yeni ürün ekleme/düzenleme formunu yönetir.
 *
 * Anayasa: K01 ≤800, K08 strict, D3 IIFE, D10 generateId
 * ════════════════════════════════════════════════════════════════
 */
(function UrunlerModule() {
'use strict';

/* ── Kısayollar ─────────────────────────────────────────────── */
const _g   = id => document.getElementById(id);
const _esc = s => typeof window.escapeHtml === 'function' ? window.escapeHtml(String(s)) : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _cu  = () => window.CU?.() || window.Auth?.getCU?.();
const _isA = () => { const r = _cu()?.role; return r === 'admin' || r === 'manager'; };
const _genId = () => typeof window.generateId === 'function' ? window.generateId() : Date.now() + Math.random().toString(36).slice(2,8);
const _ls = k => localStorage.getItem(k);
const _lsj = (k, d) => { try { return JSON.parse(_ls(k)) || d; } catch { return d; } };
const _lss = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const _loadU = () => typeof window.loadUrunler === 'function' ? window.loadUrunler() : [];
const _storeU = d => { if (typeof window.storeUrunler === 'function') window.storeUrunler(d); };
const _loadCari = () => typeof window.loadCari === 'function' ? window.loadCari().filter(c => !c.isDeleted) : [];

/* ── Renkler & Stiller ──────────────────────────────────────── */
const BG1='var(--sf)',BG2='var(--s2)',BD='var(--b)',BDM='var(--bm)',T1='var(--t)',T2='var(--t2)',T3='var(--t3)';
const NAVY='#042C53',BLUE='#185FA5',GREEN='#27500A',RED='#A32D2D',AMBER='#EF9F27';
const S_WK = 'background:'+BG1+';border:0.5px solid '+BD+';border-radius:8px;padding:12px 14px';
const S_LBL = 'font-size:10px;margin-bottom:4px';
const SK = 'ak_urun_sekmeler';

/* ── Sekme State ────────────────────────────────────────────── */
let _aktifSekme = null;
let _aktifEtap = 1;
let _sahbAcik = false;

function _getSekmeler() { return _lsj(SK, []); }
function _setSekmeler(s) { _lss(SK, s); }

/* ── Sabitler ───────────────────────────────────────────────── */
const BIRIMLER = [{v:'PCS',l:'Adet-PCS'},{v:'KGS',l:'Kg-KGS'},{v:'MTR',l:'Metre-MTR'},{v:'LTR',l:'Litre-LTR'},{v:'SET',l:'Set-SET'}];
const PARA = ['USD','EUR','CNY','TRY'];
const KDV = [20,10,0];
const MENSEI = ['TR-Türkiye','CN-Çin','DE-Almanya','IT-İtalya','FR-Fransa','ES-İspanya','PL-Polonya','IN-Hindistan','JP-Japonya','KR-Güney Kore','US-ABD','GB-İngiltere','NL-Hollanda','BE-Belçika','TW-Tayvan','TH-Tayland','VN-Vietnam','ID-Endonezya','MY-Malezya','BR-Brezilya','MX-Meksika','ZA-Güney Afrika','EG-Mısır','SA-Suudi Arabistan','AE-BAE','XX-Diğer'];
const DOT = c => '<span style="width:6px;height:6px;border-radius:50%;background:'+c+';display:inline-block;margin-right:4px"></span>';

/* ── Form Yardımcıları ──────────────────────────────────────── */
function _lbl(text, req, hint) {
  return '<div style="'+S_LBL+';color:'+(req?'#DC2626':T3)+'">'+_esc(text)+(req?' *':'')+
    (hint?' <span title="'+_esc(hint)+'" style="cursor:help;opacity:.5;font-size:9px">ℹ</span>':'')+
    '</div>';
}
function _inp(id, label, opts) {
  const o = opts||{};
  const bg = o.readonly ? 'background:#E6F1FB;' : '';
  return '<div'+(o.span?' style="grid-column:span '+o.span+'"':'')+'>'
    + _lbl(label, o.req, o.hint)
    + '<input class="fi" id="uf2-'+id+'" type="'+(o.type||'text')+'" value="'+_esc(o.val||'')+'"'
    + (o.readonly?' readonly':'')+' placeholder="'+_esc(o.ph||'')+'"'
    + (o.req?' data-req="1"':'')
    + ' style="font-size:11px;padding:8px 10px;height:38px;border-radius:8px;border:0.5px solid '+BDM+';'+bg+'" oninput="window._uf2Recalc?.()">'
    + '</div>';
}
function _sel(id, label, options, opts) {
  const o = opts||{};
  let h = '<div>'+_lbl(label, o.req, o.hint)+'<select class="fi" id="uf2-'+id+'"'
    + (o.req?' data-req="1"':'')+' style="font-size:11px;padding:8px 10px;height:38px;border-radius:8px;border:0.5px solid '+BDM+'" onchange="window._uf2Recalc?.()">'
    + '<option value="">— Seçin —</option>';
  options.forEach(v => {
    const val = typeof v==='object'?v.v:v, lbl = typeof v==='object'?v.l:v;
    h += '<option value="'+_esc(val)+'"'+(String(o.sel)===String(val)?' selected':'')+'>'+_esc(lbl)+'</option>';
  });
  return h + '</select></div>';
}
function _ta(id, label, opts) {
  const o = opts||{};
  return '<div'+(o.span?' style="grid-column:span '+o.span+'"':'')+'>'
    + _lbl(label, o.req, o.hint)
    + (o.badge?'<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:'+(o.badgeBg||'#E6F1FB')+';color:'+(o.badgeFg||BLUE)+'">'+_esc(o.badge)+'</span>':'')
    + '<textarea class="fi" id="uf2-'+id+'" rows="'+(o.rows||2)+'"'
    + (o.req?' data-req="1"':'')+' placeholder="'+_esc(o.ph||'')+'"'
    + ' style="font-size:11px;padding:8px 10px;resize:none;min-height:'+(o.minH||'56px')+';border-radius:8px;border:0.5px solid '+BDM+'">'+_esc(o.val||'')+'</textarea></div>';
}
function _upload(id, label, opts) {
  const o = opts||{};
  const border = o.req ? 'border-color:#DC2626' : '';
  return '<div>'+_lbl(label, o.req, o.hint)
    + '<div style="border:1.5px dashed '+BD+';border-radius:10px;padding:12px;text-align:center;cursor:pointer;font-size:9px;color:'+T3+';min-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;'+border+'"'
    + ' onclick="document.getElementById(\'uf2-'+id+'-file\').click()">'
    + '<div id="uf2-'+id+'-preview">Dosya sürükleyin veya tıklayın</div></div>'
    + '<input type="file" id="uf2-'+id+'-file" style="display:none" onchange="window._uf2FileChange?.(\''+id+'\',this)">'
    + '<input type="hidden" id="uf2-'+id+'-val">'
    + '</div>';
}
function _section(title, badge, content) {
  return '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:'+T3+';margin-bottom:10px;display:flex;align-items:center;gap:6px">'
    + _esc(title)+(badge||'')+'</div>'+content+'</div>';
}
function _grid(cols, gap, inner) { return '<div style="display:grid;grid-template-columns:repeat('+cols+',minmax(0,1fr));gap:'+(gap||'12px')+'">'+inner+'</div>'; }
function _badge(t,bg,fg) { return ' <span style="font-size:8px;padding:1px 6px;border-radius:4px;background:'+bg+';color:'+fg+'">'+_esc(t)+'</span>'; }
function _info(color, text) {
  const bg = color==='blue'?'#E6F1FB':color==='amber'?'#FAEEDA':'#FCEBEB';
  const fg = color==='blue'?BLUE:color==='amber'?'#633806':RED;
  return '<div style="padding:6px 10px;border-radius:6px;background:'+bg+';font-size:9px;color:'+fg+';margin-bottom:7px">'+text+'</div>';
}

/* ════════════════════════════════════════════════════════════════
   SEKME BAR
   ════════════════════════════════════════════════════════════════ */
function _renderSekmeBar() {
  const sekmeler = _getSekmeler();
  const dotC = { devam:AMBER, tamam:'#97C459', sorun:'#E24B4A', yeni:'#85B7EB' };
  let h = '<div style="background:'+NAVY+';padding:8px 16px 0;display:flex;gap:2px;align-items:flex-end">';
  sekmeler.forEach(s => {
    const active = s.id === _aktifSekme;
    const dc = dotC[s.durum] || dotC.yeni;
    h += '<div onclick="window._uf2Sekme(\''+s.id+'\')" style="padding:6px 12px;border-radius:6px 6px 0 0;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:5px;'
      + (active ? 'background:'+BG1+';font-weight:500;color:'+T1 : 'background:#0C447C;color:#85B7EB')
      + '">'+DOT(dc)+_esc(s.baslik||'Yeni Ürün')
      + '<span onclick="event.stopPropagation();window._uf2KapatSekme(\''+s.id+'\')" style="font-size:9px;opacity:0.6;cursor:pointer;margin-left:4px">✕</span></div>';
  });
  h += '<div onclick="window._uf2YeniSekme()" style="padding:6px 10px;border-radius:6px 6px 0 0;font-size:13px;cursor:pointer;color:#85B7EB;background:rgba(255,255,255,0.05)">+</div>';
  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   HEADER + PROGRESS
   ════════════════════════════════════════════════════════════════ */
function _renderHeader(u) {
  const kod = u.duayKodu || '—';
  const baslik = u.duayAdi || u.urunAdi || 'Yeni Ürün';
  const ted = u.tedarikci || '—';
  const mensei = u.mensei || '—';
  const pct = _aktifEtap * 25;
  const etapNames = ['','Teklif Alma','Teklif Onay','Yükleme Hazırlık','İhracat Ön Hazırlık'];
  const son = u.updatedAt ? new Date(u.updatedAt).toLocaleDateString('tr-TR') : '—';

  let h = '<div style="background:'+BG2+';padding:10px 16px;display:flex;justify-content:space-between;align-items:center">';
  h += '<div><div style="font-size:14px;font-weight:500;color:'+T1+'"><span style="font-family:monospace;color:'+T3+';font-size:11px">'+_esc(kod)+'</span> '+_esc(baslik)+'</div>';
  h += '<div style="font-size:10px;color:'+T3+'">'+_esc(ted)+' · '+_esc(mensei)+' · Etap '+_aktifEtap+' devam ediyor · Son kayıt: '+son+'</div></div>';
  h += '<div style="display:flex;align-items:center;gap:8px">';
  h += '<button onclick="window._uf2TaslakKaydet()" style="padding:4px 10px;border:0.5px solid '+BD+';border-radius:6px;background:'+BG1+';font-size:10px;cursor:pointer;font-family:inherit;color:'+T2+'">Taslak Kaydet</button>';
  h += '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:#E6F1FB;color:'+BLUE+'">Etap '+_aktifEtap+'</span>';
  h += '</div></div>';
  // Progress bar
  h += '<div style="height:3px;background:'+BG2+'"><div style="height:100%;width:'+pct+'%;background:#378ADD;border-radius:0 2px 2px 0;transition:width .3s"></div></div>';
  // Step nav
  const sahbDone = u.sahbTamamlandi || _sahbAcik === false;
  h += '<div style="display:flex;border-bottom:0.5px solid '+BD+'">';
  for (let i=1;i<=4;i++) {
    const active = i===_aktifEtap;
    const done = i<_aktifEtap;
    const locked = i===2 && !sahbDone && _aktifEtap < 2;
    const dot = done ? DOT('#97C459') : active ? DOT(BLUE) : DOT('#ccc');
    h += '<div onclick="'+(locked?'':'window._uf2Etap('+i+')')+'" style="flex:1;padding:8px;text-align:center;font-size:10px;display:flex;align-items:center;justify-content:center;gap:4px;'
      + (locked ? 'color:#ccc;cursor:not-allowed;opacity:0.5' : 'cursor:pointer;')
      + (active ? 'border-bottom:2px solid '+BLUE+';color:'+BLUE+';font-weight:500;' : done ? 'color:'+GREEN+';' : 'color:'+T3+';')
      + '">'+dot+etapNames[i]+'</div>';
  }
  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   ETAP 1 — TEKLİF ALMA
   ════════════════════════════════════════════════════════════════ */
function _renderEtap1(u) {
  const cariList = _loadCari();
  const cariOpts = cariList.map(c => ({v:c.id||c.ad,l:c.ad||c.firma||''}));
  const siraNo = (_loadU().length + 1).toString().padStart(4,'0');
  const tedId = (u.saticiId || '001').toString().padStart(3,'0');
  const duayKod = u.duayKodu || '11·'+siraNo+'·'+tedId;

  let h = '';
  // B1 — Temel Bilgiler
  const tedSel = _sel('tedarikci','Tedarikçi / Satıcı',cariOpts,{req:true,sel:u.tedarikci||u.saticiId});
  const tedRow = '<div style="display:flex;gap:6px;align-items:flex-end">'
    + '<div style="flex:1">'+tedSel+'</div>'
    + '<button onclick="window._uf2YeniTedarikci()" style="width:28px;height:28px;border-radius:8px;background:#E6F1FB;border:none;color:'+BLUE+';font-size:16px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center" title="Yeni Tedarikçi Ekle">+</button></div>';
  h += _section('Temel Bilgiler', '', _grid(4,'12px',
    _inp('sira','Sıra No',{val:siraNo,readonly:true})
    + _inp('duay-kod','Duay Ürün Kodu',{val:duayKod,readonly:true,hint:'11·XXXX·YYY formatı'})
    + tedRow
    + _inp('satici-kod','Satıcı Ürün Kodu',{val:u.saticiKodu||u.urunKodu})
  ) + _grid(2,'12px',
    _inp('satici-kat','Satıcı Kategorisi',{val:u.saticiSinifi||'',readonly:true,hint:'Cariden otomatik'})
    + _sel('kdv','KDV Oranı',KDV.map(k=>({v:k,l:'%'+k})),{req:true,sel:u.kdvOrani})
  ));

  // B2 — Ürün Adlandırma
  h += _section('Ürün Adlandırma (CI/PL/BL)', '', _grid(2,'12px',
    _inp('std-adi','Standart İngilizce Ürün Adı (CI/PL/BL)',{req:true,val:u.standartAdi,hint:'CI, PI, PL, BL belgelerinde geçen standart isim'})
    + _inp('duay-adi','Satıcının Türkçe Ürün Adı',{req:true,val:u.duayAdi||u.urunAdi})
  ) + _grid(2,'12px',
    _inp('marka','Marka',{val:u.marka||u.brand})
    + _sel('birim','Birim',BIRIMLER,{sel:u.birim})
  ));

  // B3 — Teknik Açıklama
  h += _section('Teknik Açıklama', _badge('Description of Goods — Müşteri teklifine İngilizce geçer','#E6F1FB',BLUE),
    _ta('teknik','Teknik Açıklama',{req:true,val:u.teknikAciklama,minH:'56px',ph:'Ürün teknik açıklaması...'})
    + _ta('satici-detay','Satıcı Teknik Detayları',{val:u.saticiDetay,minH:'72px',
      ph:'max 5 satır · satış teklifine nasıl görünecekse o şekilde girin',
      hint:'Müşteri teklifine İngilizce olarak geçecektir'})
  );

  // B4 — Menşei & Paket
  h += _section('Menşei & Paket Bilgileri', '', _grid(3,'12px',
    _sel('mensei','Menşei',MENSEI.map(m=>{const p=m.split('-');return{v:p[0],l:p[1]};}),{req:true,sel:u.mensei})
    + _inp('paket-boyut','Paket Boyutu',{val:u.paketBoyut,ph:'En × Boy × Yükseklik cm'})
    + _inp('son-tuketim','Son Tüketim / Garanti Tarihi',{type:'date',val:u.sonTuketim})
  ));

  // B5 — Ürün Geliştirme
  h += _section('Ürün Geliştirme Sorusu', '',
    _ta('gelistirme','Üründe yeni bir geliştirme yapıldı mı?',{minH:'56px',val:u.gelistirme,
      hint:'Satıcıya mutlaka sorun: "1 yılda ürününüzde nasıl bir iyileştirme yaptınız?"'})
  );

  // B6 — Belgeler
  h += _section('Belgeler', '', _grid(3,'12px',
    _upload('katalog','Katalog/Broşür',{})
    + _upload('tds','TDS/Data Sheet',{})
    + _upload('teknik-cizim','Teknik Çizim',{req:true})
  ) + _grid(3,'12px',
    _upload('3d','3D/Render',{})
    + _upload('sertifika','Sertifika',{})
    + _upload('foto','Ürün Fotoğrafı',{})
  ));

  // B7 — İç Notlar
  h += _section('İç Notlar', _badge('Gizli · İç Kullanım','#FCEBEB',RED), _grid(2,'12px',
    _ta('rakip-ustun','Rakiplere Üstünlüğü / Hedef Müşteri Profili',{val:u.rakipUstun})
    + _ta('referans','Referans Kullanım / Kritik Notlar',{val:u.referansNot})
  ) + (_isA() ? '<div style="margin-top:8px;padding:10px;border-radius:8px;background:#FAEEDA">'
    + _ta('satici-ozel','Satıcı Özel Notu',{val:u.saticiOzelNotu,hint:'Sadece admin görür'})+'</div>' : ''));

  // B8 — Gizli Hile Uyarısı
  h += '<div style="padding:12px 14px;border-radius:10px;background:#FCEBEB;border:0.5px solid #E24B4A33;margin-top:8px">'
    + '<div style="font-size:10px;font-weight:600;color:'+RED+'">Gizli Hile & Kalite Araştırması — SAHB-0200-380</div>'
    + '<div style="font-size:9px;color:'+RED+';margin:4px 0">Etap 2\'ye geçmek için zorunlu · Ses kaydı + yazıya çevirme · Sözleşme maddeleri</div>'
    + '<div style="display:flex;gap:6px;margin-top:8px">'
    + '<button onclick="window._uf2AcSAHB()" style="padding:5px 12px;border:none;border-radius:6px;background:'+RED+';color:#fff;font-size:10px;cursor:pointer;font-family:inherit">Şimdi Başlat</button>'
    + '<button onclick="window._uf2Etap(2)" style="padding:5px 12px;border:0.5px solid '+BD+';border-radius:6px;background:'+BG1+';font-size:10px;cursor:pointer;font-family:inherit;color:'+T3+'">Sonra</button>'
    + '</div></div>';

  return h;
}

/* ════════════════════════════════════════════════════════════════
   SAHB-0200-380 FORMU
   ════════════════════════════════════════════════════════════════ */
function _renderSAHB(u) {
  const kod = u.duayKodu || '—';
  let h = '<div style="'+S_WK+';margin-bottom:10px">';
  h += '<div style="font-size:13px;font-weight:600;color:'+T1+';margin-bottom:3px">Ürün / Hizmet Hilesi Bulma — SAHB-0200-380</div>';
  h += '<div style="font-size:9px;color:'+T3+'">'+_esc(kod)+' · '+_esc(u.tedarikci||'—')+'</div>';

  // B1 — Kapsam
  h += _section('Kapsam', '', _inp('sahb-kodlar','Duay Ürün Kodları',{ph:'Virgülle ayırarak birden fazla ürün',hint:'Bağlı tüm ürünlerin sözleşme, teslimat ve yükleme listeleri otomatik güncellenir'}));

  // B2 — Görüşme Hazırlığı
  h += _section('Görüşme Hazırlığı', '',
    _info('blue','Ses kaydı iznini sorun — kabul etmezse not alın. En az 2-3 yüksek fiyatlı firma ile görüşün.')
    + _grid(3,'7px',
      _inp('sahb-tarih','Görüşme Tarihi',{type:'date',req:true})
      + _sel('sahb-yontem','Görüşme Yöntemi',['Telefon','Video','Yüz yüze'],{req:true})
      + _inp('sahb-muhatap','Muhatap',{ph:'Firma Adı / Personel Adı / Cep No'})
    ) + _grid(2,'7px',
      _upload('sahb-ses','Ses Kaydı',{req:true,hint:'Asla silinmez'})
      + _upload('sahb-transkript','Görüşme Transkripti',{req:true,hint:'Tüm metin yazıya çevrilir'})
    )
  );

  // B3 — SAHB Aşama Soruları
  h += _section('SAHB Aşama Soruları', '', '<div style="font-size:9px;color:'+T2+';display:flex;flex-direction:column;gap:4px">'
    + '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="uf2-sahb-a1"> Aşama 1: Giriş sorusu + teşvik cümleleri</label>'
    + '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="uf2-sahb-a2"> Aşama 2: Hammadde/garanti/teknoloji/parça</label>'
    + '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="uf2-sahb-bss"> Çapraz Yöntem BSS-10: İkinci teklif → fark açıklama</label>'
    + '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="uf2-sahb-a3"> Aşama 3: Negatif test → kötü hammadde sonuçları</label>'
    + '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="uf2-sahb-a4"> Aşama 4: Geliştirme → 1 yıldaki iyileştirme</label>'
    + '</div>');

  // B4 — Yanıtlar
  h += _section('Yanıtları Maddeleştir', '',
    _info('amber','Her notun yanında kaynak zorunlu: Firma Adı / Personel Adı / Cep No')
    + _ta('sahb-yanit12','Aşama 1-2 Yanıtları',{rows:3,ph:'Farklı firmaların yanıtları alt alta...'})
    + _ta('sahb-yanit-capraz','Çapraz Yöntem Yanıtları',{rows:2})
  );

  // B5 — Sözleşme Maddeleri
  h += _section('Sözleşme Maddeleri', '',
    _info('blue','Etkilenen belgeler: PI, Sözleşme, PL, BL, Yükleme Listesi')
    + '<div id="uf2-sahb-maddeler"></div>'
    + '<button onclick="window._uf2MaddeEkle()" style="padding:3px 8px;border:0.5px solid '+BD+';border-radius:4px;background:'+BG1+';font-size:9px;cursor:pointer;font-family:inherit;color:'+BLUE+';margin-top:4px">+ Madde Ekle</button>'
  );

  // B6 — Dosya & Rapor
  h += _section('Dosya Adı & Rapor', '',
    _inp('sahb-dosya','Dosya Adı',{ph:'YYAAGG-NN Ürün Adı - Sözleşme Eki'})
    + _info('amber','Tamamlandığında 3 sayfa rapor PI Onay Bekleyenlere PDF eklenir')
    + '<button onclick="window._uf2SAHBTamamla()" style="padding:6px 14px;border:none;border-radius:6px;background:'+BLUE+';color:#fff;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;margin-top:6px">Formu Tamamla & Etap 2\'ye Geç</button>'
  );
  h += '</div>';
  return h;
}

/* ════════════════════════════════════════════════════════════════
   ETAP 2 — TEKLİF ONAY
   ════════════════════════════════════════════════════════════════ */
function _renderEtap2(u) {
  let h = '';
  if (u.imo === 'E') h += _info('red','IMO ürün — Forwarder\'a IMO\'lu konteyner teklifi isteyin. Tüm MSDS belgeleri forwarder\'a iletilmeden sağlıklı fiyat alınamaz. Müşteri teklifinde "IMO konteyner" açıkça belirtilmelidir.');
  if (u.dib === 'E') h += _info('amber','DIB (Dahilde İşleme Belgesi) var — Gümrük işlemlerinde DIB kapsamı kontrol edilmelidir.');

  h += _section('Onay Bilgileri', '', _grid(4,'12px',
    _sel('kategori','Kategori',(window._ufKatYukle?window._ufKatYukle():['Mobilya','Tekstil','Elektronik','Kimyasal','Gıda','Metal','Makine','Plastik','İnşaat','Otomotiv','Tarım','Diğer']),{req:true,sel:u.kategori})
    + _inp('marka2','Marka',{val:u.marka,req:true})
    + _inp('uretici','Gerçek Üretici',{val:u.gercekUretici,req:true})
    + _sel('mensei2','Menşei',MENSEI.map(m=>{const p=m.split('-');return{v:p[0],l:p[1]};}),{req:true,sel:u.mensei})
  ) + _grid(4,'12px',
    _sel('imo2','IMO Durumu',[{v:'H',l:'IMO yok'},{v:'E',l:'IMO var — tehlikeli madde'}],{req:true,sel:u.imo||'H'})
    + _sel('dib','DİB',['Hayır','Evet'].map((l,i)=>({v:i?'E':'H',l})),{req:true,sel:u.dib||'H'})
    + _sel('ihracat-kisit','İhracat Kısıtı',['Hayır','Evet'].map((l,i)=>({v:i?'E':'H',l})),{req:true,sel:u.ihracatKisiti||'H'})
    + _sel('ihracat-yasak','İhracat Yasağı',['Hayır','Evet'].map((l,i)=>({v:i?'E':'H',l})),{req:true,sel:u.ihracatYasak||'H'})
  ) + _grid(3,'12px',
    _inp('fatura-adi','Satıcının Faturasındaki Ürün Adı',{val:u.faturaAdi||u.invoiceName})
    + _inp('net-ag','Net Ağırlık (kg)',{type:'number',val:u.netAgirlik,req:true})
    + _inp('brut-ag','Brüt Ağırlık (kg)',{type:'number',val:u.brutAgirlik,req:true})
  ));
  h += _section('Muadil & Notlar', '', _ta('muadil','Muadil Ürün Bilgisi',{val:u.muadilUrun}) + _ta('onay-not','Onay Notu',{val:u.onayNotu}));
  return h;
}

/* ════════════════════════════════════════════════════════════════
   ETAP 3 — YÜKLEME HAZIRLIK
   ════════════════════════════════════════════════════════════════ */
function _renderEtap3(u) {
  return _section('Paket & Yükleme Bilgileri', '', _grid(4,'12px',
    _inp('pkt-en','Paket En (cm)',{type:'number',val:u.paketEn,req:true})
    + _inp('pkt-boy','Paket Boy (cm)',{type:'number',val:u.paketBoy,req:true})
    + _inp('pkt-yuk','Paket Yükseklik (cm)',{type:'number',val:u.paketYukseklik,req:true})
    + _inp('pkt-adet','Paket Adedi',{type:'number',val:u.paketAdet,req:true})
  ) + _grid(3,'12px',
    _sel('pkt-tipi','Paket Tipi',['Koli','Palet','BigBag','Varil','Çuval','Ambalajsız','Diğer'],{sel:u.paketTipi})
    + _sel('yapi','Yapı',['Katı','Sıvı','Akışkan','Gaz','Toz'],{sel:u.yapi})
    + _sel('istifleme','İstifleme Uyarısı',['Kırılır','Üste konulamaz','Dik tutulmalı','Nemden korunmalı','Soğuk zincir'],{sel:u.istiflemeUyarisi})
  ) + _upload('palet-gorsel','Palet Görseli',{req:true}));
}

/* ════════════════════════════════════════════════════════════════
   ETAP 4 — İHRACAT ÖN HAZIRLIK
   ════════════════════════════════════════════════════════════════ */
function _renderEtap4(u) {
  return _section('İhracat & Gümrük Bilgileri', '', _grid(3,'12px',
    _inp('turkce-ad','Türkçe Ürün Adı (Gümrük)',{val:u.turkceAdi,req:true})
    + _inp('gtip','GTİP Kodu',{val:u.gtip||u.hscKodu,req:true,hint:'Harmonize Sistem Kodu'})
    + _sel('dib-asama','DİB Aşaması',['Yok','Başvuru','Onay','Aktif','Kapatılmış'],{req:true,sel:u.dibAsama||'Yok'})
  ) + _grid(2,'12px',
    _inp('vergi-kod','Vergi Kodu',{val:u.vergiKodu})
    + _inp('origin-cert','Menşei Belgesi No',{val:u.origincertificate})
  ) + _ta('ihracat-not','İhracat Notları',{val:u.ihracatNotu}));
}

/* ════════════════════════════════════════════════════════════════
   ANA RENDER
   ════════════════════════════════════════════════════════════════ */
/** @public */
function openUrunForm(editId) {
  try {
    const panel = _g('panel-urunler');
    if (!panel) {
      console.warn('[urunler] panel-urunler bulunamadı, renderUrunler ile yükleniyor');
      window.renderUrunler?.();
      setTimeout(() => openUrunForm(editId), 150);
      return;
    }
    let sekmeler = _getSekmeler();

    if (editId) {
      _aktifSekme = String(editId);
      if (!sekmeler.find(s => s.id === _aktifSekme)) {
        const u = _loadU().find(x => x.id == editId) || {};
        sekmeler.push({ id: _aktifSekme, duayKodu: u.duayKodu || '', baslik: u.duayAdi || u.urunAdi || 'Ürün', etap: 1, durum: 'devam' });
        _setSekmeler(sekmeler);
      }
    } else if (!_aktifSekme || !sekmeler.find(s => s.id === _aktifSekme)) {
      const newId = _genId();
      _aktifSekme = String(newId);
      sekmeler.push({ id: _aktifSekme, duayKodu: '', baslik: 'Yeni Ürün', etap: 1, durum: 'yeni' });
      _setSekmeler(sekmeler);
    }

    _renderForm();
  } catch (e) { console.error('[urunler] openUrunForm hata:', e); }
}

function _renderForm() {
  try {
    const panel = _g('panel-urunler');
    if (!panel) return;
    // Form yazınca liste HTML'i silinir — geri dönüşte yeniden inject edilsin
    delete panel.dataset.injected;
    const sekmeler = _getSekmeler();
    const sekme = sekmeler.find(s => s.id === _aktifSekme);
    if (!sekme) { window.renderUrunler?.(); return; }

    const u = _loadU().find(x => String(x.id) === _aktifSekme) || {};
    _aktifEtap = sekme.etap || 1;

    let h = _renderSekmeBar();
    h += _renderHeader(u);
    const cariList = _loadCari();
    const cariOpts = cariList.map(c => '<option value="'+_esc(c.ad||c.name||'')+'"'+(u.tedarikci===(c.ad||c.name)?' selected':'')+'>'+_esc(c.ad||c.firmaAdi||c.name||'')+'</option>').join('');
    const katList = (window._ufKatYukle?window._ufKatYukle():['Mobilya','Tekstil','Elektronik','Kimyasal','Gıda','Metal','Makine','Plastik','İnşaat','Otomotiv','Tarım','Diğer']);
    const katOpts = katList.map(k => '<option value="'+_esc(k)+'"'+(u.kategori===k?' selected':'')+'>'+_esc(k)+'</option>').join('');
    const gorselSrc = u.gorsel||'';

    const _fi = (id,lbl,val,type,req) => '<div><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:4px">'+lbl+(req?' <span style="color:#A32D2D">*</span>':'')+'</div><input id="uf2-'+id+'" type="'+(type||'text')+'" value="'+_esc(val||'')+'" oninput="event.stopPropagation();window._uf2PrevGuncelle&&window._uf2PrevGuncelle()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:6px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';

    const SOL = '<div style="width:190px;min-width:190px;border-right:0.5px solid var(--b);background:var(--s2);display:flex;flex-direction:column;padding:14px;gap:10px">'
      +(gorselSrc?'<img src="'+gorselSrc+'" style="width:100%;height:110px;object-fit:cover;border-radius:6px;border:0.5px solid var(--b)">'
        :'<div id="uf-prev-img" style="width:100%;height:110px;border:0.5px dashed var(--b);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--t3)">+ Görsel</div>')
      +'<div id="uf-prev-ad" style="font-size:13px;font-weight:500;color:var(--t);min-height:18px;line-height:1.3">'+(u.urunAdi||u.orijinalAdi||'<span style="color:var(--t3)">Ürün adı...</span>')+'</div>'
      +'<div id="uf-prev-ted" style="font-size:10px;color:var(--t3)">'+(u.tedarikci||'Tedarikçi...')+'</div>'
      +'<div id="uf-prev-fiyat" style="font-size:15px;font-weight:500;color:#0F6E56">'+(u.alisF?u.alisF+' '+(u.para||'USD'):'— Fiyat')+'</div>'
      +'<div id="uf-prev-kat" style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--sf);border:0.5px solid var(--b);color:var(--t2);display:inline-block">'+(u.kategori||'Kategori')+'</div>'
      +'<div id="uf-prev-birim" style="font-size:10px;color:var(--t3)">'+(u.birim?'Birim: '+u.birim:'')+'</div>'
      +'<div style="margin-top:auto;display:flex;flex-direction:column;gap:6px">'
      +'<button onclick="event.stopPropagation();window._uf2TaslakKaydet()" style="font-size:12px;padding:8px 0;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500;width:100%">Kaydet</button>'
      +'<button onclick="event.stopPropagation();delete document.getElementById(\'panel-urunler\').dataset.injected;window.renderUrunler?.()" style="font-size:11px;padding:6px 0;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2);width:100%">← Liste</button>'
      +'</div></div>';

    const SAG = '<div style="flex:1;overflow-y:auto;padding:18px 22px">'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:10px">TEMEL BİLGİLER</div>'
      +'<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px">'
      +_fi('urunAdi','ÜRÜN ADI (TÜRKÇE)',u.urunAdi||u.orijinalAdi,'text',true)
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
      +'<div><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:4px">TEDARİKÇİ <span style="color:#A32D2D">*</span></div>'
      +'<div style="display:flex;gap:4px">'
      +'<select id="uf2-tedarikci" onchange="event.stopPropagation();window._uf2PrevGuncelle&&window._uf2PrevGuncelle()" style="flex:1;font-size:12px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Seç...</option>'+cariOpts+'</select>'
      +'<button onclick="event.stopPropagation();window._uf2YeniTedarikci()" title="Potansiyel tedarikçi ekle" style="font-size:12px;padding:0 8px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;color:var(--t3)">+</button>'
      +'</div></div>'
      +'<div><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:4px">KATEGORİ <span style="color:#A32D2D">*</span></div>'
      +'<select id="uf2-kategori" onchange="event.stopPropagation();window._uf2PrevGuncelle&&window._uf2PrevGuncelle()" style="width:100%;font-size:12px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit"><option value="">Seç...</option>'+katOpts+'</select>'
      +'</div>'
      +'</div>'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:10px">FİYAT & BİRİM</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">'
      +_fi('alisF','ALIŞ FİYATI',u.alisF||'','number',false)
      +'<div><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:4px">DÖVİZ</div>'
      +'<select id="uf2-para" onchange="event.stopPropagation()" style="width:100%;font-size:12px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
      +['USD','EUR','TRY','CNY','GBP'].map(c=>'<option'+(u.para===c?' selected':'')+'>'+c+'</option>').join('')+'</select></div>'
      +'<div><div style="font-size:9px;color:var(--t3);font-weight:500;letter-spacing:.05em;margin-bottom:4px">BİRİM</div>'
      +'<select id="uf2-birim" onchange="event.stopPropagation();window._uf2PrevGuncelle&&window._uf2PrevGuncelle()" style="width:100%;font-size:12px;padding:6px 8px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit">'
      +['Adet','Kg','Ton','m²','m³','Set','Paket'].map(b=>'<option'+(u.birim===b?' selected':'')+'>'+b+'</option>').join('')+'</select></div>'
      +'</div>'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:10px">KOD & TANIMLAR</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
      +_fi('duayKodu','DUAY KODU',u.duayKodu||'','text',false)
      +_fi('saticiKodu','SATICI KODU',u.saticiKodu||'','text',false)
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px">'
      +_fi('ingAd','İNGİLİZCE ADI',u.ingAd||u.standartAdi||'','text',false)
      +'</div>'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:10px">AÇIKLAMA</div>'
      +'<textarea id="uf2-teknikAciklama" oninput="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Teknik açıklama, not..." style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);height:80px;resize:none;font-family:inherit;box-sizing:border-box">'+_esc(u.teknikAciklama||u.aciklama||'')+'</textarea>'
      +'<div style="font-size:9px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin:14px 0 10px">GÖRSEL</div>'
      +'<label style="display:block;cursor:pointer">'
      +(gorselSrc?'<img src="'+gorselSrc+'" style="max-height:120px;border-radius:6px;border:0.5px solid var(--b)">'
        :'<div style="border:0.5px dashed var(--b);border-radius:6px;padding:20px;text-align:center;color:var(--t3);font-size:11px">+ Görsel Yükle (JPG / PNG / WEBP)</div>')
      +'<input type="file" accept="image/*" onchange="window._uf2FileChange?.(\'gorsel\',this)" style="display:none"></label>'
      +'<div style="height:30px"></div>'
      +'</div>';

    const splitDiv = document.createElement('div');
    splitDiv.style.cssText = 'display:flex;height:calc(100vh - 210px);border:0.5px solid var(--b);border-radius:8px;overflow:hidden;margin:12px 0';
    splitDiv.innerHTML = SOL + SAG;
    panel.innerHTML = h;
    panel.appendChild(splitDiv);

    window._uf2PrevGuncelle = function() {
      const get = id => document.getElementById('uf2-'+id)?.value||'';
      const sel = document.getElementById('uf2-tedarikci');
      const tedAd = sel ? (sel.options[sel.selectedIndex]?.text||'') : '';
      const el = id => document.getElementById(id);
      const ad = get('urunAdi');
      const f = get('alisF'); const p = get('para'); const b = get('birim');
      if(el('uf-prev-ad')) el('uf-prev-ad').innerHTML = ad||'<span style="color:var(--t3)">Ürün adı...</span>';
      if(el('uf-prev-ted')) el('uf-prev-ted').textContent = tedAd||'Tedarikçi...';
      if(el('uf-prev-fiyat')) el('uf-prev-fiyat').textContent = f?(f+' '+(p||'USD')):'— Fiyat';
      if(el('uf-prev-kat')) el('uf-prev-kat').textContent = get('kategori')||'Kategori';
      if(el('uf-prev-birim')) el('uf-prev-birim').textContent = b?('Birim: '+b):'';
    };
  } catch (e) { console.error('[urunler] _renderForm hata:', e); }
}

/* ════════════════════════════════════════════════════════════════
   EVENT HANDLERS
   ════════════════════════════════════════════════════════════════ */
window._uf2Sekme = function(id) { _aktifSekme = id; _sahbAcik = false; _renderForm(); };
window._uf2YeniSekme = function() { _aktifSekme = null; openUrunForm(); };
window._uf2KapatSekme = function(id) {
  let s = _getSekmeler().filter(x => x.id !== id);
  _setSekmeler(s);
  if (_aktifSekme === id) { _aktifSekme = s.length ? s[s.length-1].id : null; }
  if (!_aktifSekme) { window.renderUrunler?.(); return; }
  _renderForm();
};
window._uf2Etap = function(n) { _aktifEtap = n; _sahbAcik = false;
  const s = _getSekmeler(); const sk = s.find(x=>x.id===_aktifSekme); if(sk){sk.etap=n;_setSekmeler(s);} _renderForm(); };
window._uf2AcSAHB = function() { _sahbAcik = true; _renderForm(); };
window._uf2SAHBTamamla = function() { _sahbAcik = false; _aktifEtap = 2;
  const s = _getSekmeler(); const sk = s.find(x=>x.id===_aktifSekme); if(sk){sk.etap=2;sk.durum='devam';_setSekmeler(s);} _renderForm(); };

window._uf2YeniTedarikci = function() {
  var mevcut = document.getElementById('uf2-pot-ted-modal');
  if (mevcut) { mevcut.remove(); return; }
  var mo = document.createElement('div');
  mo.id = 'uf2-pot-ted-modal';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 0;overflow-y:auto';
  mo.onclick = function(e) { if (e.target === mo) mo.remove(); };
  var _fi = function(id, lbl, ph, req) {
    return '<div><div style="font-size:10px;color:var(--t3);font-weight:500;margin-bottom:4px">' + lbl + (req ? ' <span style="color:#A32D2D">*</span>' : '') + '</div>'
      + '<input id="pt-' + id + '" placeholder="' + ph + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>';
  };
  mo.innerHTML = '<div style="background:var(--sf);border-radius:12px;border:0.5px solid var(--b);width:640px;overflow:hidden">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">'
    + '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Potansiyel Tedarikçi Ekle</div>'
    + '<div style="font-size:10px;color:var(--t3);margin-top:1px">Onay sonrası aktif cariye dönüşür</div></div>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'uf2-pot-ted-modal\')?.remove()" style="font-size:20px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button></div>'
    + '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + _fi('firma', 'FİRMA ADI', 'Firma adı', true)
    + _fi('web', 'WEB SİTESİ', 'https://...', false)
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + _fi('muhatap', 'GÖRÜŞÜLECEK MUHATAP AD SOYAD', 'Ad Soyad', true)
    + _fi('cep', 'CEP NUMARASI', '+90 5xx xxx xx xx', true)
    + '</div>'
    + _fi('mail', 'E-POSTA ADRESİ', 'ornek@firma.com', true)
    + '<div><div style="font-size:10px;color:var(--t3);font-weight:500;margin-bottom:4px">HANGİ SEKTÖRLERDE ÇALIŞMIŞ <span style="color:#A32D2D">*</span></div>'
    + '<textarea id="pt-sektor" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Örn: Mobilya, Metal, Tekstil — önceki çalışma sektörleri..." style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);height:60px;resize:none;font-family:inherit;box-sizing:border-box"></textarea></div>'
    + '<div><div style="font-size:10px;color:var(--t3);font-weight:500;margin-bottom:4px">FİRMA NASIL BULUNDU <span style="color:#A32D2D">*</span></div>'
    + '<textarea id="pt-nasil" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Örn: Alibaba, fuar, referans, soğuk arama..." style="width:100%;font-size:12px;padding:8px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);height:60px;resize:none;font-family:inherit;box-sizing:border-box"></textarea></div>'
    + '<div style="background:#FAEEDA;border-radius:6px;padding:10px 14px">'
    + '<div style="font-size:10px;font-weight:500;color:#854F0B;margin-bottom:6px">Onay için gerekli belgeler (yöneticiye gönderilecek)</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
    + '<label style="font-size:10px;cursor:pointer;color:var(--t2)">Vergi Levhası<input type="file" id="pt-vergi" accept=".pdf,.jpg,.png" style="display:none" onchange="document.getElementById(\'pt-vergi-lbl\').textContent=this.files[0]?.name||\'\'"><div id="pt-vergi-lbl" style="font-size:9px;color:var(--t3);margin-top:2px">Seçilmedi</div></label>'
    + '<label style="font-size:10px;cursor:pointer;color:var(--t2)">Ticaret Sicil<input type="file" id="pt-ticaret" accept=".pdf,.jpg,.png" style="display:none" onchange="document.getElementById(\'pt-ticaret-lbl\').textContent=this.files[0]?.name||\'\'"><div id="pt-ticaret-lbl" style="font-size:9px;color:var(--t3);margin-top:2px">Seçilmedi</div></label>'
    + '<label style="font-size:10px;cursor:pointer;color:var(--t2)">İmza Sirküleri<input type="file" id="pt-imza" accept=".pdf,.jpg,.png" style="display:none" onchange="document.getElementById(\'pt-imza-lbl\').textContent=this.files[0]?.name||\'\'"><div id="pt-imza-lbl" style="font-size:9px;color:var(--t3);margin-top:2px">Seçilmedi</div></label>'
    + '</div></div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">'
    + '<button onclick="event.stopPropagation();document.getElementById(\'uf2-pot-ted-modal\')?.remove()" style="font-size:12px;padding:7px 16px;border:0.5px solid var(--b);border-radius:6px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>'
    + '<button onclick="event.stopPropagation();window._uf2PotTedKaydet()" style="font-size:12px;padding:7px 20px;border:none;border-radius:6px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Onaya Gönder</button>'
    + '</div></div>';
  document.body.appendChild(mo);
  setTimeout(function() { document.getElementById('pt-firma')?.focus(); }, 100);
};

window._uf2PotTedKaydet = function() {
  var g = function(id) { return document.getElementById('pt-' + id)?.value?.trim() || ''; };
  var firma = g('firma'), mail = g('mail'), muhatap = g('muhatap'), cep = g('cep');
  var sektor = document.getElementById('pt-sektor')?.value?.trim() || '';
  var nasil = document.getElementById('pt-nasil')?.value?.trim() || '';
  if (!firma || !mail || !muhatap || !cep || !sektor || !nasil) { window.toast?.('Tüm zorunlu alanları doldurun', 'warn'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { window.toast?.('Geçerli bir e-posta girin', 'warn'); return; }
  var kayit = {
    id: window.generateId?.() || ('PT' + Date.now()),
    cariType: 'potansiyel',
    tip: 'tedarikci',
    ad: firma,
    web: g('web'),
    muhatap: muhatap,
    cep: cep,
    mail: mail,
    sektor: sektor,
    nasil: nasil,
    onayDurum: 'bekliyor',
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    createdBy: window.CU?.()?.displayName || ''
  };
  var cariler = typeof window.loadCari === 'function' ? window.loadCari() : [];
  cariler.push(kayit);
  if (typeof window.storeCari === 'function') window.storeCari(cariler);
  if (typeof window.addNotif === 'function') {
    var admins = (typeof window.loadUsers === 'function' ? window.loadUsers() : []).filter(function(u) { return u.rol === 'admin' || u.role === 'admin'; });
    admins.forEach(function(a) { window.addNotif('🏢', 'Yeni potansiyel tedarikçi onay bekliyor: ' + firma, 'warn', 'cariler', a.uid || a.id); });
  }
  window.toast?.('Potansiyel tedarikçi onaya gönderildi: ' + firma, 'ok');
  document.getElementById('uf2-pot-ted-modal')?.remove();
};

window._uf2Recalc = function() {
  const m = _g('uf2-miktar'), f = _g('uf2-birim-fiyat'), t = _g('uf2-toplam');
  if (m && f && t) { t.value = ((parseFloat(m.value)||0) * (parseFloat(f.value)||0)).toLocaleString('tr-TR'); }
};

window._uf2FileChange = function(id, inp) {
  if (!inp.files?.[0]) return;
  const prev = _g('uf2-'+id+'-preview');
  if (prev) prev.textContent = _esc(inp.files[0].name);
};

let _sahbMaddeSayisi = 5;
window._uf2MaddeEkle = function() {
  _sahbMaddeSayisi++;
  const cont = _g('uf2-sahb-maddeler');
  if (!cont) return;
  const idx = cont.children.length + 1;
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px';
  div.innerHTML = '<input class="fi" placeholder="Madde '+idx+' metni" style="font-size:10px;padding:3px 6px">'
    + '<input class="fi" placeholder="Neden Gerekli + Kaynak" style="font-size:10px;padding:3px 6px">';
  cont.appendChild(div);
};

/* ── Taslak Kaydet ──────────────────────────────────────────── */
window._uf2TaslakKaydet = function() {
  const data = _loadU();
  const vals = {};
  document.querySelectorAll('[id^="uf2-"]').forEach(el => {
    if (el.type === 'hidden' || el.type === 'file' || el.tagName === 'DIV') return;
    const key = el.id.replace('uf2-','').replace(/-([a-z])/g, (_,c) => c.toUpperCase());
    vals[key] = el.type === 'checkbox' ? el.checked : el.value;
  });
  let existing = data.find(x => String(x.id) === _aktifSekme);
  if (existing) { Object.assign(existing, vals, { updatedAt: new Date().toISOString() });
  } else {
    existing = { id: _aktifSekme, createdAt: new Date().toISOString(), createdBy: _cu()?.id, ...vals };
    data.push(existing);
  }
  _storeU(data);
  const s = _getSekmeler(); const sk = s.find(x=>x.id===_aktifSekme);
  if (sk) { sk.baslik = vals.duayAdi || vals.stdAdi || 'Ürün'; sk.durum = 'devam'; sk.duayKodu = vals.duayKod || ''; _setSekmeler(s); }
  if (typeof window.toast === 'function') window.toast('Taslak kaydedildi', 'success');
  _renderForm();
};

/* ════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════ */
const Urunler = { openForm: openUrunForm };

// Her zaman window'a export et — browser'da çalışması için
window.Urunler = Urunler;
window.openUrunForm = openUrunForm;


if (typeof module !== 'undefined' && module.exports) { module.exports = Urunler; }

})();
