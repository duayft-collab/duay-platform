/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-iletisim.js — V170.3.4 POPULATE
   Sorumluluk: İletişim plug-in modülü (mesaj, not, görev mesaj, STT, tab)
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-ILETISIM-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       Mesaj sistemi   L1662-1803  PP_MSG_KEY + Load/Store + 6 fn
                       (Gonder/MesajlariOku/BildirimGuncelle/PanelAc/MsgTab/MsgGonderForm)
       Not             L1849-1911  PP_NOT_KEY + Load/Store + Ekle/Render/PanelHTML
       Görev mesaj     L4438-4504  Load/Save/Gonder
                       (Firestore platform/taskChats merge çağrısı _ppGorevMesajSave içinde)
       STT             L4634-4656  _ppSttBaslat (SpeechRecognition tr-TR)
       Tab             L4657-4675  _ppMesajTabSec
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaIletisim (flat plugin modül)
   ⚠ DEFENSIVE: toplu guard (Object.assign atlanır, eski tanım korunur)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ KX10: PP_MSG_KEY (ak_pp_mesaj_v1) + PP_NOT_KEY (ak_pp_notlar_v1) DEĞİŞTİRİLMEDİ
   ⚠ Görev mesaj: Firestore merge (_ppGorevMesajSave) içinde
                  typeof firebase !== 'undefined' guard'ı orijinalde mevcut
   ⚠ Bağımlılık: window._ppEsc, _ppNow, _ppId, _ppCu, _ppIsAdmin (core, Cycle 3.1)
                 _ppLoad (store, Cycle 3.2.4'te POPULATE — Cycle 4 öncesi pusula_pro.js'te aktif)
                 firebase.firestore (global SDK)
                 SpeechRecognition / webkitSpeechRecognition (browser native)
                 _ppGorevMesajPanelRender (render-detail, Cycle 3.2.9'da POPULATE)
                 _ppHayatKartiGoster (yasam) — _ppBildirimGuncelle çağrılıyor optional chain
   ⚠ ATLANANLAR (bu cycle iletisim'e DEĞİL):
       _ppGorevMesajPanelAc L4505-4609 → render-detail.js (Cycle 3.2.9)
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaIletisim) window.PusulaIletisim = {};
  if (window._ppIletisimLoaded) return;
  window._ppIletisimLoaded = true;

/* ── Mesajlaşma Sistemi ─────────────────────────────────────── */
var PP_MSG_KEY = 'ak_pp_mesaj_v1';

function _ppMsgLoad() {
  try { var r=localStorage.getItem(PP_MSG_KEY); return r?JSON.parse(r):[]; } catch(e) { return []; }
}
function _ppMsgStore(d) {
  /* PP-MSG-LIMITS-001: 500 FIFO store-level (LS sızıntısı durur) */
  if (Array.isArray(d) && d.length > 500) d = d.slice(-500);
  try { localStorage.setItem(PP_MSG_KEY,JSON.stringify(d)); } catch(e) { console.warn('[PP]', e); }
}

window._ppMesajGonder = function(icerik, tip, hedef) {
  /* PP-BTNGUARD-001: double-click koruması */
  if (window._ppIslem) return; window._ppIslem = true; setTimeout(function(){ window._ppIslem = false; }, 1500);
  if (!icerik || !icerik.trim()) return;
  var cu = _ppCu();
  var msg = {
    id: _ppId(),
    icerik: icerik.trim(),
    tip: tip || 'kisisel',
    /* PUSULA-MESAJ-UID-FIX-001: uid yoksa id/email fallback */
    hedef: hedef || cu?.uid || String(cu?.id||'') || cu?.email || '',
    gonderen: cu?.displayName || cu?.email || 'Ben',
    gonderenId: cu?.uid || String(cu?.id||'') || cu?.email || '',
    tarih: _ppNow(),
    okundu: false
  };
  var msgs = _ppMsgLoad();
  msgs.unshift(msg);
  if (msgs.length > 500) msgs = msgs.slice(0,500);
  _ppMsgStore(msgs);
  /* KUYRUK-PP-MESAJ-001: Firestore'a yaz — tüm kullanıcılar görsün */
  try { if (typeof window.savePpMesajlar === 'function') window.savePpMesajlar(msgs); }
  catch(_me) { console.warn('[PP-MESAJ-FIRE]', _me); }
  window._ppBildirimGuncelle();
  return msg;
};

window._ppMesajlariOku = function(tip) {
  var cu = _ppCu();
  /* PUSULA-MESAJ-UID-FIX-001: uid yoksa id/email fallback */
  var _cuId = cu?.uid || String(cu?.id||'') || cu?.email || '';
  var msgs = _ppMsgLoad();
  return msgs.filter(function(m) {
    if (tip === 'sirket') return m.tip === 'sirket';
    if (tip === 'kisisel') return m.tip === 'kisisel' && (m.hedef===_cuId || m.gonderenId===_cuId || (!m.hedef && !m.gonderenId));
    if (tip === 'hayat') return m.tip === 'hayat';
    return true;
  });
};

window._ppBildirimGuncelle = function() {
  var okunmayanlar = _ppMsgLoad().filter(function(m){ return !m.okundu; });
  var n = okunmayanlar.length;
  var btn = document.getElementById('pp-msg-btn');
  var dot = document.getElementById('pp-msg-dot');
  if (dot) dot.style.display = n > 0 ? 'block' : 'none';
  if (btn) btn.title = n > 0 ? n + ' okunmamış mesaj' : 'Mesajlar';
};

window._ppMesajPanelAc = function() {
  var mod = window._ppAktifMod;
  if (mod === 'odak') {
    window.toast?.('Odak modunda mesajlar kuyruğa alındı — blok bitince okunur','info');
    return;
  }
  /* KUYRUK-PP-MESAJ-001: panel açılınca Firestore'dan güncel mesajları çek */
  try {
    if (typeof window.loadPpMesajlar === 'function') {
      var _fireMsgs = window.loadPpMesajlar();
      if (Array.isArray(_fireMsgs) && _fireMsgs.length) _ppMsgStore(_fireMsgs.slice(0, 500));
    }
  } catch(_re) { console.warn('[PP]', _re); }
  var msgs = window._ppMesajlariOku('kisisel');
  var mevcut = document.getElementById('pp-msg-panel');
  if (mevcut) { mevcut.remove(); return; }
  var panel = document.createElement('div');
  panel.id = 'pp-msg-panel';
  panel.style.cssText = 'position:fixed;top:80px;right:20px;width:320px;max-height:500px;background:var(--sf);border:0.5px solid var(--b);border-radius:var(--pp-r-md);box-shadow:0 4px 20px rgba(0,0,0,.12);z-index:9000;display:flex;flex-direction:column;overflow:hidden';
  var _msgRow = function(m) {
    return '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b)">'
      + '<div style="font-size:var(--pp-meta);font-weight:500;color:var(--t);margin-bottom:3px">'+_ppEsc(m.gonderen)+'</div>'
      + '<div style="font-size:var(--pp-body);color:var(--t2);line-height:1.45">'+_ppEsc(m.icerik)+'</div>'
      + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-top:4px">'+m.tarih+'</div>'
      + '</div>';
  };
  /* XSS-SAFE: statik */
  panel.innerHTML = '<div style="display:flex;border-bottom:0.5px solid var(--b)">'
    /* PUSULA-TEMIZLIK-001: hayat sekmesi kaldırıldı */
    + ['kisisel','sirket'].map(function(t,i){ var lbl={kisisel:'Kişisel',sirket:'Şirket'}[t]; return '<div onclick="event.stopPropagation();window._ppMsgTab(\''+t+'\')" id="pp-msg-tab-'+t+'" style="flex:1;padding:8px;text-align:center;font-size:var(--pp-meta);cursor:pointer;'+(i===0?'border-bottom:2px solid var(--t);font-weight:500':'color:var(--t3)')+'">'+lbl+'</div>'; }).join('')
    + '</div>'
    + '<div id="pp-msg-list" style="flex:1;overflow-y:auto;max-height:350px">'
    + (msgs.length ? msgs.map(_msgRow).join('') : '<div style="padding:30px;text-align:center;color:var(--t3);font-size:var(--pp-body)">Mesaj yok</div>')
    + '</div>'
    + '<div style="padding:8px;border-top:0.5px solid var(--b);display:flex;gap:5px">'
    + '<input id="pp-msg-input" maxlength="500" placeholder="Mesaj yaz..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key===\'Enter\')window._ppMsgGonderForm()" style="flex:1;font-size:var(--pp-body);padding:5px 9px;border:0.5px solid var(--b);border-radius:5px;background:transparent;font-family:inherit;color:var(--t)">'
    + '<button onclick="event.stopPropagation();window._ppMsgGonderForm()" style="font-size:var(--pp-meta);padding:5px 10px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Gönder</button>'
    + '</div>';
  document.body.appendChild(panel);
  var allMsgs = _ppMsgLoad();
  allMsgs.forEach(function(m){ m.okundu=true; });
  _ppMsgStore(allMsgs);
  window._ppBildirimGuncelle();
  document.addEventListener('click', function rm(e){ if(!panel.contains(e.target)){panel.remove();document.removeEventListener('click',rm);} },{once:false});
};

window._ppMsgTab = function(tip) {
  /* PUSULA-TEMIZLIK-001: hayat dalı kaldırıldı */
  var msgs = window._ppMesajlariOku(tip);
  var list = document.getElementById('pp-msg-list');
  if (!list) return;
  document.querySelectorAll('[id^="pp-msg-tab-"]').forEach(function(el){ el.style.borderBottom='none'; el.style.fontWeight=''; el.style.color='var(--t3)'; });
  var aktif = document.getElementById('pp-msg-tab-'+tip);
  if (aktif) { aktif.style.borderBottom='2px solid var(--t)'; aktif.style.fontWeight='500'; aktif.style.color='var(--t)'; }
  var tipRenk = { aile:'var(--pp-err)', kitap:'var(--pp-info)', gelisim:'#1D9E75' };
  /* XSS-SAFE: statik */
  list.innerHTML = msgs.length ? msgs.map(function(m) {
    var etiket = m.tip ? '<span style="font-size:var(--pp-meta);padding:1px 6px;border-radius:3px;background:var(--s2);color:' + (tipRenk[m.tip] || 'var(--t3)') + ';margin-left:6px">' + _ppEsc(m.tip) + '</span>' : '';
    return '<div style="padding:10px 14px;border-bottom:0.5px solid var(--b)">'
      + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:3px">' + ((m.tarih || '').slice(0, 16)) + etiket + '</div>'
      + '<div style="font-size:var(--pp-body);color:var(--t2);line-height:1.5">' + _ppEsc(m.icerik || m.gonderen || '') + '</div>'
      + '</div>';
  }).join('') : '<div style="padding:30px;text-align:center;color:var(--t3);font-size:var(--pp-body)">Henüz kart yok</div>';
};

window._ppMsgGonderForm = function() {
  var inp = document.getElementById('pp-msg-input');
  if (!inp || !inp.value.trim()) return;
  window._ppMesajGonder(inp.value.trim(), 'kisisel', '');
  inp.value = '';
  window._ppMsgTab('kisisel');
  window.toast?.('Mesaj gönderildi','ok');
};

window.PP_MSG_KEY = PP_MSG_KEY;

/* ── Challenge + Alışkanlık + 12 Hedef Verisi ──────────────── */
var PP_CHALLENGE_KEY = 'ak_pp_challenge_v1';
var PP_HABIT_KEY     = 'ak_pp_habit_v1';
var PP_GOAL_KEY      = 'ak_pp_goal_v1';

/* ── Notlar Sistemi ─────────────────────────────────────────── */
var PP_NOT_KEY = 'ak_pp_notlar_v1';
function _ppNotLoad() { try { var r = localStorage.getItem(PP_NOT_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppNotStore(d) { try { localStorage.setItem(PP_NOT_KEY, JSON.stringify(d)); } catch(e) { console.warn('[PP]', e); } }

window._ppNotEkle = function() {
  var ta = document.getElementById('pp-not-input');
  var cat = document.getElementById('pp-not-cat');
  if (!ta || !ta.value.trim()) return;
  var yeni = { id: _ppId(), icerik: ta.value.trim(), kategori: cat?.value || 'Kişisel', tarih: _ppNow(), createdAt: _ppNow() };
  var notlar = _ppNotLoad(); notlar.unshift(yeni); _ppNotStore(notlar);
  ta.value = '';
  window._ppNotRender();
  window.toast?.('Not kaydedildi', 'ok');
};

window._ppNotRender = function() {
  var list = document.getElementById('pp-not-list'); if (!list) return;
  var notlar = _ppNotLoad();
  var katRenk = { 'Satış':'background:#E6F1FB;color:var(--pp-info)', 'Satınalma':'background:#E1F5EE;color:#0F6E56', 'Kişisel':'background:#EEEDFE;color:#3C3489', 'Aile':'background:#FCEBEB;color:var(--pp-err)', 'Fikir':'background:#FAEEDA;color:var(--pp-warn)' };
  /* XSS-SAFE: statik */
  list.innerHTML = notlar.length ? notlar.map(function(n) {
    return '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-sm);padding:9px;margin-bottom:7px;background:var(--s2);cursor:pointer" onmouseover="this.style.background=\'var(--sf)\'" onmouseout="this.style.background=\'var(--s2)\'">'
      + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:4px">' + (n.tarih || '').slice(0, 16) + '</div>'
      + '<div style="font-size:var(--pp-body);color:var(--t);line-height:1.5">' + _ppEsc(n.icerik) + '</div>'
      + '<span style="display:inline-block;font-size:var(--pp-meta);padding:1px 6px;border-radius:3px;margin-top:5px;' + (katRenk[n.kategori] || 'background:var(--s2);color:var(--t3)') + '">' + _ppEsc(n.kategori) + '</span>'
      + '</div>';
  }).join('') : '<div style="font-size:var(--pp-body);color:var(--t3);text-align:center;padding:20px">Henüz not yok</div>';
};

window._ppNotPanelHTML = function() {
  var notlar = _ppNotLoad();
  var katRenk = { 'Satış':'background:#E6F1FB;color:var(--pp-info)', 'Satınalma':'background:#E1F5EE;color:#0F6E56', 'Kişisel':'background:#EEEDFE;color:#3C3489', 'Aile':'background:#FCEBEB;color:var(--pp-err)', 'Fikir':'background:#FAEEDA;color:var(--pp-warn)' };
  var h = '<div style="width:220px;border-left:0.5px solid var(--b);display:flex;flex-direction:column;flex-shrink:0;height:100%">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:0.5px solid var(--b);flex-shrink:0">';
  h += '<div style="font-size:var(--pp-body);font-weight:500;color:var(--t)">Notlarım</div>';
  h += '</div>';
  h += '<div id="pp-not-list" style="flex:1;overflow-y:auto;padding:8px">';
  h += notlar.length ? notlar.map(function(n) {
    return '<div style="border:0.5px solid var(--b);border-radius:var(--pp-r-sm);padding:9px;margin-bottom:7px;background:var(--s2)">'
      + '<div style="font-size:var(--pp-meta);color:var(--t3);margin-bottom:4px">' + (n.tarih || '').slice(0, 16) + '</div>'
      + '<div style="font-size:var(--pp-body);color:var(--t);line-height:1.5">' + _ppEsc(n.icerik) + '</div>'
      + '<span style="display:inline-block;font-size:var(--pp-meta);padding:1px 6px;border-radius:3px;margin-top:5px;' + (katRenk[n.kategori] || 'background:var(--s2);color:var(--t3)') + '">' + _ppEsc(n.kategori) + '</span>'
      + '</div>';
  }).join('') : '<div style="font-size:var(--pp-body);color:var(--t3);text-align:center;padding:20px">Henüz not yok</div>';
  h += '</div>';
  h += '<div style="border-top:0.5px solid var(--b);padding:8px;flex-shrink:0">';
  h += '<textarea id="pp-not-input" maxlength="2000" placeholder="Not yaz..." onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:var(--pp-body);padding:7px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:none;height:60px;font-family:inherit;box-sizing:border-box"></textarea>';
  h += '<div style="display:flex;gap:4px;margin-top:5px">';
  h += '<select id="pp-not-cat" onclick="event.stopPropagation()" style="flex:1;font-size:var(--pp-meta);padding:4px;border:0.5px solid var(--b);border-radius:4px;background:transparent;color:var(--t2);font-family:inherit">';
  h += '<option>Kişisel</option><option>Satış</option><option>Satınalma</option><option>Aile</option><option>Fikir</option>';
  h += '</select>';
  h += '<button onclick="event.stopPropagation();window._ppNotEkle()" style="font-size:var(--pp-meta);padding:4px 10px;border:none;border-radius:4px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit">Kaydet</button>';
  h += '</div></div></div>';
  return h;
};

window._ppNotLoad = _ppNotLoad;
window._ppNotStore = _ppNotStore;

/* ── Dosya Eki Sistemi ──────────────────────────────────────── */
window._ppDosyaEkleri = [];

/* ── PP-GOREV-MESAJ-001: per-task mesajlaşma sistemi ───────── */
/* Namespace: _ppGorevMesaj* (global _ppMesaj* ile çakışmaz) */

window._ppGorevMesajLoad = function(taskId) {
  try { return JSON.parse(localStorage.getItem('ak_pp_gorev_mesaj_'+taskId)||'[]'); } catch(e) { return []; }
};

window._ppGorevMesajSave = function(taskId, mesajlar) {
  /* PUSULA-MESAJ-FIX-001: localStorage + Firestore eş zamanlı yaz */
  /* LS-SYNC-001: per-task 100 FIFO + 30 gün TTL (ak_pp_gorev_mesaj_* sınırsız büyüme engeli) */
  try {
    if (Array.isArray(mesajlar)) {
      var _thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      mesajlar = mesajlar.filter(function(m) {
        try {
          var _t = new Date(String((m && m.ts) || '').replace(' ', 'T')).getTime();
          return isNaN(_t) || _t >= _thirtyDaysAgo;
        } catch(_e) { return true; }
      });
      if (mesajlar.length > 100) mesajlar = mesajlar.slice(-100);
    }
  } catch(_ae) { console.warn('[LS-SYNC-001]', _ae && _ae.message); }
  try { localStorage.setItem('ak_pp_gorev_mesaj_'+taskId, JSON.stringify(mesajlar)); } catch(e) { console.warn('[PP]', e); }
  try {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      var _fsChat = {};
      _fsChat['chat_' + taskId] = mesajlar;
      firebase.firestore().collection('platform').doc('taskChats').set(_fsChat, { merge: true });
    }
  } catch(_fe) { console.warn('[PP-MESAJ] Firestore yazma hata:', _fe.message); }
  /* PP-MESAJ-FIRESTORE-001: paralel Firestore write — platform/taskChats.chat_<taskId> merge */
  try {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      var _payload = {}; _payload['chat_' + taskId] = mesajlar;
      firebase.firestore().collection('platform').doc('taskChats').set(_payload, { merge: true }).catch(function(){});
    }
  } catch(e) { console.warn('[PP]', e); }
};

window._ppGorevMesajGonder = function(taskId, text, dosyaAd) {
  /* PUSULA-MESAJ-FIX-001: sadece göreve erişimi olanlar mesaj gönderebilir */
  var _tasks = window._ppLoad ? window._ppLoad() : [];
  var _t = _tasks.find(function(x){ return String(x.id)===String(taskId); });
  if (!_t) { window.toast?.('Görev bulunamadı','warn'); return; }
  var _cu = (typeof _ppCu === 'function') ? _ppCu() : null;
  var _uid = _cu?.uid || _cu?.email || '';
  if (!_ppIsAdmin() && _uid) {
    var _izinli = (_t.olusturanId||_t.createdBy||'')=== _uid
      || (Array.isArray(_t.sorumlu)?_t.sorumlu:[_t.sorumlu||'']).some(function(s){return(s&&(s.uid||s))===_uid;})
      || (Array.isArray(_t.gozlemci)?_t.gozlemci:[_t.gozlemci||'']).some(function(g){return(g&&(g.uid||g))===_uid;})
      || (Array.isArray(_t.paylasilanlar)?_t.paylasilanlar:[]).indexOf(_uid)!==-1;
    if (!_izinli) { window.toast?.('Bu göreve mesaj gönderme yetkiniz yok','warn'); return; }
  }
  var mesajlar = window._ppGorevMesajLoad(taskId);
  var cu = _cu;
  mesajlar.push({
    id: _ppId(),
    text: text || '',
    dosya: dosyaAd || null,
    gonderen: (cu && (cu.displayName || cu.email)) || (window._kullanici && (window._kullanici.displayName || window._kullanici.email)) || 'Ben',
    tarih: new Date().toISOString(),
    tur: dosyaAd ? 'dosya' : 'metin'
  });
  window._ppGorevMesajSave(taskId, mesajlar);
  window._ppGorevMesajPanelRender && window._ppGorevMesajPanelRender(taskId);
};

/* PP-GOREV-MESAJ-STT-001: Sesli mesaj — SpeechRecognition tr-TR → text → _ppGorevMesajGonder */
window._ppSttBaslat = function(taskId) {
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { window.toast?.('Tarayıcınız sesli mesajı desteklemiyor','warn'); return; }
  var btn = document.getElementById('pp-stt-btn');
  if (btn) { btn.textContent = '⏹'; btn.style.color = '#DC2626'; }
  var rec = new Rec();
  rec.lang = 'tr-TR';
  rec.interimResults = false;
  rec.onresult = function(e) {
    var text = e.results[0][0].transcript;
    window._ppGorevMesajGonder(taskId, '🎤 ' + text);
    if (btn) { btn.textContent = '🎤'; btn.style.color = ''; }
  };
  rec.onerror = function() {
    window.toast?.('Ses algılanamadı','warn');
    if (btn) { btn.textContent = '🎤'; btn.style.color = ''; }
  };
  rec.onend = function() { if (btn) { btn.textContent = '🎤'; btn.style.color = ''; } };
  try { rec.start(); } catch(e) { window.toast?.('Mikrofon başlatılamadı','err'); if(btn){btn.textContent='🎤';btn.style.color='';} }
};

/* PP-GOREV-MESAJ-EKLER-001: Mesajlar / Ekler tab geçişi */
window._ppMesajTabSec = function(tab) {
  ['msg','ek'].forEach(function(t){
    var el = document.getElementById('pp-mesaj-tab-'+t);
    if (el) {
      el.style.borderBottom = (t === tab) ? '2px solid var(--pp-info)' : 'none';
      el.style.color = (t === tab) ? 'var(--pp-info)' : 'var(--t3)';
      el.style.fontWeight = (t === tab) ? '500' : '';
    }
  });
  var liste = document.getElementById('pp-gorev-mesaj-liste');
  var eklerDiv = document.getElementById('pp-gorev-ek-liste');
  if (tab === 'msg') {
    if (liste) liste.style.display = 'flex';
    if (eklerDiv) eklerDiv.style.display = 'none';
  } else {
    if (liste) liste.style.display = 'none';
    if (eklerDiv) eklerDiv.style.display = 'block';
  }
};

  /* ── V170.3.4 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  /* SEBEP: pusula_pro.js zaten yüklüyse overwrite engellenir.       */
  /*        Cycle 4'te eski dosya çıkarılınca bu blok çalışır.        */
  if (!window._ppMesajGonder) {
    Object.assign(window, {
      _ppMesajGonder: window._ppMesajGonder,
      _ppMesajlariOku: window._ppMesajlariOku,
      _ppBildirimGuncelle: window._ppBildirimGuncelle,
      _ppMesajPanelAc: window._ppMesajPanelAc,
      _ppMsgTab: window._ppMsgTab,
      _ppMsgGonderForm: window._ppMsgGonderForm,
      _ppNotEkle: window._ppNotEkle,
      _ppNotRender: window._ppNotRender,
      _ppNotPanelHTML: window._ppNotPanelHTML,
      _ppGorevMesajLoad: window._ppGorevMesajLoad,
      _ppGorevMesajSave: window._ppGorevMesajSave,
      _ppGorevMesajGonder: window._ppGorevMesajGonder,
      _ppSttBaslat: window._ppSttBaslat,
      _ppMesajTabSec: window._ppMesajTabSec
    });
  }

  /* ── V170.3.4 CANONICAL PusulaIletisim EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaIletisim, {
    _ppMesajGonder: window._ppMesajGonder,
    _ppMesajlariOku: window._ppMesajlariOku,
    _ppBildirimGuncelle: window._ppBildirimGuncelle,
    _ppMesajPanelAc: window._ppMesajPanelAc,
    _ppMsgTab: window._ppMsgTab,
    _ppMsgGonderForm: window._ppMsgGonderForm,
    _ppNotEkle: window._ppNotEkle,
    _ppNotRender: window._ppNotRender,
    _ppNotPanelHTML: window._ppNotPanelHTML,
    _ppGorevMesajLoad: window._ppGorevMesajLoad,
    _ppGorevMesajSave: window._ppGorevMesajSave,
    _ppGorevMesajGonder: window._ppGorevMesajGonder,
    _ppSttBaslat: window._ppSttBaslat,
    _ppMesajTabSec: window._ppMesajTabSec
  });
})();
