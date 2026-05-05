/* ════════════════════════════════════════════════════════════════
   src/modules/pusula-pro/pusula-yasam.js — V170.3.3 POPULATE
   Sorumluluk: Yaşam koçu plug-in modülü (kendi state'ini taşır, self-contained)
   ──────────────────────────────────────────────────────────────────
   Talimat: PUSULA-YASAM-POPULATE-001
   Kaynak: pusula_pro.js bölgeleri (KX8 birebir kopya):
       Frog              L925-967    _ppFrogBelirle, _ppFrogBasla
       Deep Work         L968-1034   3 var + _ppDwBasla
       Skor              L1036-1068  _ppSkorKey + Oku/Ekle/Guncelle
       CHL/HAB/GOAL data L1799-1816  3 sabit + 6 Load/Store + 3 expose
       GCH actions       L1817-1850  GoalAc + ChallengeAc + HabitEkle
       Review            L2630-2684  PP_REV_KEY + RevKaydet + RevYukle
                         (_ppHaftaNo L2634-2641 utils'e taşındı, hariç)
       Hayat             L2719-2767  PP_HAYAT_KEY + havuz + Load/Store + 3 fn
       Hayat boot        L2768       defensive guard ile saruldı
       Öncelik (Pomodoro) L4353-4396 Load/Save + Ekle/Toggle/Sil
   ──────────────────────────────────────────────────────────────────
   ⚠ NAMESPACE: window.PusulaYasam (flat plugin modül)
   ⚠ DEFENSIVE: toplu guard (Object.assign atlanır, eski tanım korunur)
   ⚠ KX8 BİREBİR KOPYA — refactor yok, davranış %100 aynı
   ⚠ KX10: 6 localStorage anahtarı DEĞİŞTİRİLMEDİ
   ⚠ Bağımlılık: window._ppEsc, _ppNow, _ppToday, _ppId (core)
                 _ppHaftaNo (utils, Cycle 3.2.1)
                 _ppLoad, _ppStore (store, Cycle 3.2.4'te POPULATE)
                 _ppSetMod (actions, Cycle 3.2.13)
                 _ppModRender, _ppOncelikRender (render-list, Cycle 3.2.7)
                 _ppBildirimGuncelle (iletisim, Cycle 3.2.3) — ?. ile guarded
════════════════════════════════════════════════════════════════ */
'use strict';

(function() {
  if (!window.PusulaYasam) window.PusulaYasam = {};
  if (window._ppYasamLoaded) return;
  window._ppYasamLoaded = true;


/* ── Frog Sistemi ───────────────────────────────────────────── */
window._ppFrogBelirle = function() {
  if (window._ppAktifFrog && window._ppAktifFrog._ppSource === 'pro') return window._ppAktifFrog;
  var tasks = _ppLoad().filter(function(t){ return !t.isDeleted && t.durum !== 'tamamlandi' && (t._ppSource==='pro' || (t.createdAt && t.createdAt > '2026-04-07')); });
  if (!tasks.length) return null;
  var kritik = tasks.filter(function(t){ return t.oncelik==='kritik'; });
  var yuksek = tasks.filter(function(t){ return t.oncelik==='yuksek'; });
  var frog = kritik[0] || yuksek[0] || tasks[0];
  window._ppAktifFrog = frog;
  var el = document.getElementById('pp-frog-txt');
  if (el && frog) el.textContent = frog.baslik || frog.title || '';
  return frog;
};

window._ppFrogBasla = function() {
  // PUSULA-SURE-SWITCH-001: Eğer timer zaten çalışıyorsa önceki göreve süreyi kaydet
  if (window._ppAktifGorevId && window._ppTimerBaslangic) {
    var _gecenDk = Math.round((Date.now() - window._ppTimerBaslangic) / 60000);
    if (_gecenDk > 0) {
      var _ts = _ppLoad();
      var _gt = _ts.find(function(x){ return String(x.id)===String(window._ppAktifGorevId); });
      if (_gt) {
        _gt.toplamSureDk = (_gt.toplamSureDk || 0) + _gecenDk;
        _gt.updatedAt = _ppNow();
        _ppStore(_ts);
      }
    }
    window._ppAktifGorevId = null;
    window._ppTimerBaslangic = null;
  }
  var frog = window._ppAktifFrog || window._ppFrogBelirle();
  if (!frog) { window.toast?.('Önce görev ekle', 'warn'); return; }
  window._ppSetMod('odak');
  var el = document.getElementById('pp-odak-frog');
  if (el) el.textContent = frog.baslik || frog.title || '';
  setTimeout(function(){ window._ppDwBasla?.(); }, 300);
  // PUSULA-SURE-TAKIP-001: aktif görev bind — timer bitiminde bu ID'ye süre yazılır
  window._ppAktifGorevId = window._ppAktifFrog?.id || null;
  window._ppDebug('Timer başladı, görev:', window._ppAktifGorevId);
};

/* ── Deep Work Sayacı ──────────────────────────────────────── */
var _ppDwInterval = null;
var _ppDwSaniye   = 0;
var _ppDwHedef    = 90 * 60;

window._ppDwBasla = function() {
  if (_ppDwInterval) {
    clearInterval(_ppDwInterval);
    _ppDwInterval = null;
    // PUSULA-SURE-TAKIP-001: pause anında harcanan süreyi aktif göreve kaydet
    if (window._ppAktifGorevId && window._ppTimerBaslangic) {
      var _gecenDk = Math.round((Date.now() - window._ppTimerBaslangic) / 60000);
      if (_gecenDk > 0) {
        var _tasks = _ppLoad();
        var _t = _tasks.find(function(x){ return String(x.id) === String(window._ppAktifGorevId); });
        if (_t) {
          _t.toplamSureDk = (_t.toplamSureDk || 0) + _gecenDk;
          _t.updatedAt = _ppNow();
          _ppStore(_tasks);
          window.toast?.(_gecenDk + ' dk kaydedildi: ' + (_t.baslik||''), 'ok');
        }
      }
      window._ppAktifGorevId = null;
      window._ppTimerBaslangic = null;
    }
    window.toast?.('Durakladı','info');
    return;
  }
  window.toast?.('Deep Work başladı — 90 dk','ok');
  // PUSULA-SURE-TAKIP-001: timer başlangıç zamanını kaydet (pause'da süre hesabı için)
  window._ppTimerBaslangic = Date.now();
  _ppDwInterval = window._ppSetInterval(function() {
    _ppDwSaniye++;
    var pct = Math.min((_ppDwSaniye/_ppDwHedef)*100, 100);
    var s = _ppDwSaniye;
    var hh = Math.floor(s/3600);
    var mm = Math.floor((s%3600)/60);
    var ss = s%60;
    var str = (hh?String(hh).padStart(2,'0')+':':'') + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
    var t1 = document.getElementById('pp-dw-timer');
    var t2 = document.getElementById('pp-odak-timer');
    var b1 = document.getElementById('pp-dw-bar');
    if (t1) t1.textContent = str;
    if (t2) t2.textContent = str;
    if (b1) b1.style.width = pct.toFixed(1) + '%';
    if (_ppDwSaniye >= _ppDwHedef) {
      clearInterval(_ppDwInterval); _ppDwInterval = null;
      // PUSULA-SURE-AUTO-001: auto-finish path'te de harcanan süreyi aktif göreve yaz
      if (window._ppAktifGorevId && window._ppTimerBaslangic) {
        var _gecenDk = Math.round((Date.now() - window._ppTimerBaslangic) / 60000);
        if (_gecenDk > 0) {
          var _tasks = _ppLoad();
          var _t = _tasks.find(function(x){ return String(x.id) === String(window._ppAktifGorevId); });
          if (_t) {
            _t.toplamSureDk = (_t.toplamSureDk || 0) + _gecenDk;
            _t.updatedAt = _ppNow();
            _ppStore(_tasks);
            window.toast?.(_gecenDk + ' dk kaydedildi: ' + (_t.baslik||''), 'ok');
          }
        }
        window._ppAktifGorevId = null;
        window._ppTimerBaslangic = null;
      }
      window.toast?.('Deep Work tamamlandı! 90 dk odak +200 puan','ok');
      window._ppSkorEkle(200);
    }
  }, 1000);
};
/* ── Skor Sistemi ───────────────────────────────────────────── */
var _ppSkorKey = 'ak_pp_skor_v1';

window._ppSkorOku = function() {
  try { return JSON.parse(localStorage.getItem(_ppSkorKey)||'{"bugun":0,"hafta":0,"toplam":0,"tarih":""}'); } catch(e) { return {bugun:0,hafta:0,toplam:0,tarih:''}; }
};

window._ppSkorEkle = function(puan) {
  var s = window._ppSkorOku();
  var bugun = _ppToday();
  if (s.tarih !== bugun) { s.bugun = 0; s.tarih = bugun; }
  s.bugun  += puan;
  s.hafta  += puan;
  s.toplam += puan;
  localStorage.setItem(_ppSkorKey, JSON.stringify(s));
  var el = document.getElementById('pp-skor-n');
  var pl = document.getElementById('pp-score-pill');
  if (el) el.textContent = s.bugun;
  /* XSS-SAFE: Number coercion */
  if (pl) pl.innerHTML = 'Bugün <span style="color:#1D9E75">'+(Number(s.bugun)||0)+' pt</span> · Hafta <span style="color:#1D9E75">'+(Number(s.hafta)||0)+'</span>';
  return s;
};

window._ppSkorGuncelle = function() {
  var s = window._ppSkorOku();
  var el = document.getElementById('pp-skor-n');
  var pl = document.getElementById('pp-score-pill');
  if (el) el.textContent = s.bugun;
  /* XSS-SAFE: Number coercion */
  if (pl) pl.innerHTML = 'Bugün <span style="color:#1D9E75">'+(Number(s.bugun)||0)+' pt</span> · Hafta <span style="color:#1D9E75">'+(Number(s.hafta)||0)+'</span>';
};

/* ── PP-003: Çalışma Modu Yardımcıları ──────────────────────── */
/* ── Challenge + Alışkanlık + 12 Hedef Verisi ──────────────── */
var PP_CHALLENGE_KEY = 'ak_pp_challenge_v1';
var PP_HABIT_KEY     = 'ak_pp_habit_v1';
var PP_GOAL_KEY      = 'ak_pp_goal_v1';

function _ppChallengeLoad() { try { var r = localStorage.getItem(PP_CHALLENGE_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppChallengeStore(d) { try { localStorage.setItem(PP_CHALLENGE_KEY, JSON.stringify(d)); } catch(e) { console.warn('[PP]', e); } }

function _ppHabitLoad() { try { var r = localStorage.getItem(PP_HABIT_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppHabitStore(d) { try { localStorage.setItem(PP_HABIT_KEY, JSON.stringify(d)); } catch(e) { console.warn('[PP]', e); } }

function _ppGoalLoad() { try { var r = localStorage.getItem(PP_GOAL_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppGoalStore(d) { try { localStorage.setItem(PP_GOAL_KEY, JSON.stringify(d)); } catch(e) { console.warn('[PP]', e); } }

window._ppChallengeLoad = _ppChallengeLoad;
window._ppHabitLoad = _ppHabitLoad;
window._ppGoalLoad = _ppGoalLoad;

window._ppGoalAc = function() {
  var goals = _ppGoalLoad();
  var baslik = prompt('Hedef başlığı (örn: Q2\'de 500K USD ciro):');
  if (!baslik || !baslik.trim()) return;
  var bitTarih = prompt('Bitiş tarihi (YYYY-MM-DD):') || '';
  var yeni = { id: _ppId(), baslik: baslik.trim(), bitTarih: bitTarih, pct: 0, createdAt: _ppNow() };
  goals.unshift(yeni); _ppGoalStore(goals);
  window.toast?.('Hedef eklendi', 'ok');
  window._ppModRender();
};

window._ppChallengeAc = function() {
  var baslik = prompt('Challenge başlığı:');
  if (!baslik || !baslik.trim()) return;
  var periyot = prompt('Periyot (aylik/uc_aylik/alti_aylik/yillik):') || 'aylik';
  var hedef = parseInt(prompt('Hedef sayı (örn: 5 müşteri için 5):') || '1');
  var puan = {aylik:500,uc_aylik:2000,alti_aylik:5000,yillik:20000}[periyot] || 500;
  var yeni = { id: _ppId(), baslik: baslik.trim(), periyot: periyot, hedef: hedef, tamamlanan: 0, puan: puan, createdAt: _ppNow() };
  var challenges = _ppChallengeLoad(); challenges.unshift(yeni); _ppChallengeStore(challenges);
  window.toast?.('Challenge eklendi — ' + puan + ' pt ödül', 'ok');
  window._ppModRender();
};

window._ppHabitEkle = function() {
  var baslik = prompt('Alışkanlık adı (örn: Sabah rutini):');
  if (!baslik || !baslik.trim()) return;
  var yeni = { id: _ppId(), baslik: baslik.trim(), streak: 0, sonTarih: '', createdAt: _ppNow() };
  var habits = _ppHabitLoad(); habits.push(yeni); _ppHabitStore(habits);
  window.toast?.('Alışkanlık eklendi', 'ok');
  window._ppModRender();
};

/* ── Notlar Sistemi ─────────────────────────────────────────── */
var PP_NOT_KEY = 'ak_pp_notlar_v1';

/* ── PP-DEG-001: Haftalık Değerlendirme ─────────────────────── */
var PP_REV_KEY = 'ak_pp_review_v1';
window._ppRevKaydet = function() {
  /* XSS-SAFE: statik */
  var yapti = document.getElementById('pp-rev-yapti')?.innerHTML || '';
  /* XSS-SAFE: statik */
  var ogrendi = document.getElementById('pp-rev-ogrendi')?.innerHTML || '';
  /* XSS-SAFE: statik */
  var hedef = document.getElementById('pp-rev-hedef')?.innerHTML || '';
  if (!yapti.trim() && !ogrendi.trim() && !hedef.trim()) { window.toast?.('Bir şeyler yaz önce', 'warn'); return; }
  var hafta = window._ppHaftaNo();
  var liste = [];
  try { liste = JSON.parse(localStorage.getItem(PP_REV_KEY) || '[]'); } catch(e) { console.warn('[PP]', e); }
  var idx = liste.findIndex(function(r) { return r.hafta === hafta; });
  var kayit = { id: _ppId(), tarih: _ppToday(), hafta: hafta, yapti: yapti, ogrendi: ogrendi, hedef: hedef, updatedAt: _ppNow() };
  if (idx !== -1) {
    kayit.id = liste[idx].id;
    kayit.createdAt = liste[idx].createdAt || _ppNow();
    liste[idx] = kayit;
  } else {
    kayit.createdAt = _ppNow();
    liste.unshift(kayit);
    if (liste.length > 52) liste = liste.slice(0, 52);
  }
  try { localStorage.setItem(PP_REV_KEY, JSON.stringify(liste)); } catch(e) { console.warn('[PP]', e); }
  window.toast?.('Değerlendirme kaydedildi ✓', 'ok');
};

window._ppRevYukle = function() {
  try {
    var liste = JSON.parse(localStorage.getItem(PP_REV_KEY) || '[]');
    var bugunHafta = window._ppHaftaNo();
    var bugun = liste.find(function(r) { return r.hafta === bugunHafta; });
    if (bugun) {
      /* XSS-SAFE: Number coercion */
      var y = document.getElementById('pp-rev-yapti'); if (y) y.innerHTML = bugun.yapti || '';
      /* XSS-SAFE: Number coercion */
      var o = document.getElementById('pp-rev-ogrendi'); if (o) o.innerHTML = bugun.ogrendi || '';
      /* XSS-SAFE: Number coercion */
      var h = document.getElementById('pp-rev-hedef'); if (h) h.innerHTML = bugun.hedef || '';
    }
  } catch(e) { console.warn('[PP]', e); }
};

/* ── PP-ALT-GOREV-001: Alt Görev Detay Toggle ──────────────── */
/* ── Hayat Kartları ─────────────────────────────────────────── */
var PP_HAYAT_KEY = 'ak_pp_hayat_v1';
function _ppHayatLoad() { try { var r = localStorage.getItem(PP_HAYAT_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function _ppHayatStore(d) { try { localStorage.setItem(PP_HAYAT_KEY, JSON.stringify(d)); } catch(e) { console.warn('[PP]', e); } }

var _ppHayatHavuz = [
  { tip:'aile', icerik:'3 kızınla bu hafta sonu masa oyunu oynayabilirsin. Catan veya Codenames 8 yaş üstü için ideal.' },
  { tip:'aile', icerik:'İstanbul Oyuncak Müzesi — Göztepe. Kızların için harika bir hafta sonu aktivitesi.' },
  { tip:'aile', icerik:'Eşinle baş başa bir akşam planladın mı? Bu hafta bir gece ayrı zaman önemli.' },
  { tip:'aile', icerik:'Kızlarına bu hafta ne öğrettiklerini sor. Dinlemek yeterliyken değer katmak daha güzel.' },
  { tip:'aile', icerik:'Piknik planla — Belgrad Ormanı veya Polonezköy bu mevsimde güzel olur.' },
  { tip:'kitap', icerik:'Cal Newport — Digital Minimalism. Deep Work felsefesinin kişisel hayata uygulaması. 230 sayfa.' },
  { tip:'kitap', icerik:'Gary Keller — The One Thing. Günde bir kritik görev felsefesi — Frog metodunun kitabı.' },
  { tip:'kitap', icerik:'Greg McKeown — Essentialism. Daha az ama daha iyi. İş yükü yönetiminde klasik.' },
  { tip:'kitap', icerik:'Daniel Kahneman — Thinking Fast and Slow. Karar verme mekanizmaları üzerine derin bir okuma.' },
  { tip:'gelisim', icerik:'Tracy şunu söyler: En başarılı insanlar işte en iyi olanlardır çünkü evde en dinlenmiş olanlardır.' },
  { tip:'gelisim', icerik:'Bu hafta 5 kritik görev tamamladın. İyi iş — ama dinlenme de üretkenliğin parçası.' },
  { tip:'gelisim', icerik:'Newport: Derin odak için sabah ilk 2 saati koru. Telefon kapalı, bildirim yok.' },
  { tip:'gelisim', icerik:'80/20 kuralı: Hangi 2 müşteri gelirinizin %80\'ini oluşturuyor? Onlara daha fazla zaman ver.' },
  { tip:'gelisim', icerik:'Haftalık review yapmak, haftanın en verimli 30 dakikasıdır. Planlayan kazanır.' }
];

window._ppHayatKartiGoster = function() {
  var havuz = _ppHayatHavuz;
  var gosterilen = _ppHayatLoad().map(function(h) { return h.icerik; });
  var kalan = havuz.filter(function(h) { return gosterilen.indexOf(h.icerik) === -1; });
  if (!kalan.length) { _ppHayatStore([]); kalan = havuz; }
  var secilen = kalan[Math.floor(Math.random() * kalan.length)];
  var kayit = { id: _ppId(), tip: secilen.tip, icerik: secilen.icerik, tarih: _ppNow(), okundu: false };
  var liste = _ppHayatLoad(); liste.unshift(kayit);
  if (liste.length > 30) liste = liste.slice(0, 30);
  _ppHayatStore(liste);
  window._ppBildirimGuncelle?.();
  return kayit;
};

window._ppHayatKartlariOku = function() {
  return _ppHayatLoad();
};

window._ppHayatBaslat = function() {
  var liste = _ppHayatLoad();
  var bugun = _ppToday();
  var bugunVar = liste.some(function(h) { return h.tarih && h.tarih.slice(0, 10) === bugun; });
  if (!bugunVar) { window._ppHayatKartiGoster(); }
};

window._ppHayatLoad = _ppHayatLoad;
window._ppSetTimeout(function() { window._ppHayatBaslat?.(); }, 1200, 'hayat-boot');

  /* Hayat boot — defensive guard ile (çift yükleme korumalı) */
  if (!window._ppHayatBootDone) {
    window._ppHayatBootDone = true;
    window._ppSetTimeout(function() { window._ppHayatBaslat?.(); }, 1200, 'hayat-boot');
  }

/* ── PP-ONCELIK-ZAMAN-001: Zaman dilimi bazlı öncelik sistemi ──────────
   5 dilim (gün/hafta/ay/çeyrek/yıl) × 3 öncelik, localStorage persist */
window._ppOncelikLoad = function() {
  try { return JSON.parse(localStorage.getItem('ak_pp_oncelikler_v1') || '{}'); }
  catch (e) { return {}; }
};

window._ppOncelikSave = function(data) {
  try { localStorage.setItem('ak_pp_oncelikler_v1', JSON.stringify(data)); }
  catch (e) {}
};

window._ppOncelikEkle = function(zaman, text) {
  var d = window._ppOncelikLoad();
  if (!d[zaman]) d[zaman] = [];
  if (d[zaman].length >= 3) {
    window.toast?.('Bu dilimde max 3 öncelik var', 'warn');
    return;
  }
  d[zaman].push({
    id: _ppId(),
    text: text,
    tamam: false,
    createdAt: new Date().toISOString()
  });
  window._ppOncelikSave(d);
  window._ppOncelikRender?.();
};

window._ppOncelikToggle = function(zaman, id) {
  var d = window._ppOncelikLoad();
  var item = (d[zaman] || []).find(function(x) { return x.id === id; });
  if (item) item.tamam = !item.tamam;
  window._ppOncelikSave(d);
  window._ppOncelikRender?.();
};

window._ppOncelikSil = function(zaman, id) {
  var d = window._ppOncelikLoad();
  if (d[zaman]) d[zaman] = d[zaman].filter(function(x) { return x.id !== id; });
  window._ppOncelikSave(d);
  window._ppOncelikRender?.();
};

  /* ── V170.3.3 LEGACY GLOBAL EXPOSE (toplu defensive guard) ── */
  /* SEBEP: pusula_pro.js zaten yüklüyse overwrite engellenir.       */
  /*        Cycle 4'te eski dosya çıkarılınca bu blok çalışır.        */
  if (!window._ppFrogBelirle) {
    Object.assign(window, {
      _ppFrogBelirle: window._ppFrogBelirle,
      _ppFrogBasla: window._ppFrogBasla,
      _ppDwBasla: window._ppDwBasla,
      _ppSkorOku: window._ppSkorOku,
      _ppSkorEkle: window._ppSkorEkle,
      _ppSkorGuncelle: window._ppSkorGuncelle,
      _ppGoalAc: window._ppGoalAc,
      _ppChallengeAc: window._ppChallengeAc,
      _ppHabitEkle: window._ppHabitEkle,
      _ppHayatKartiGoster: window._ppHayatKartiGoster,
      _ppHayatKartlariOku: window._ppHayatKartlariOku,
      _ppHayatBaslat: window._ppHayatBaslat,
      _ppRevKaydet: window._ppRevKaydet,
      _ppRevYukle: window._ppRevYukle,
      _ppOncelikLoad: window._ppOncelikLoad,
      _ppOncelikSave: window._ppOncelikSave,
      _ppOncelikEkle: window._ppOncelikEkle,
      _ppOncelikToggle: window._ppOncelikToggle,
      _ppOncelikSil: window._ppOncelikSil
    });
  }

  /* ── V170.3.3 CANONICAL PusulaYasam EXPOSE (Anayasa §6) ── */
  Object.assign(window.PusulaYasam, {
    _ppFrogBelirle: window._ppFrogBelirle,
    _ppFrogBasla: window._ppFrogBasla,
    _ppDwBasla: window._ppDwBasla,
    _ppSkorOku: window._ppSkorOku,
    _ppSkorEkle: window._ppSkorEkle,
    _ppSkorGuncelle: window._ppSkorGuncelle,
    _ppGoalAc: window._ppGoalAc,
    _ppChallengeAc: window._ppChallengeAc,
    _ppHabitEkle: window._ppHabitEkle,
    _ppHayatKartiGoster: window._ppHayatKartiGoster,
    _ppHayatKartlariOku: window._ppHayatKartlariOku,
    _ppHayatBaslat: window._ppHayatBaslat,
    _ppRevKaydet: window._ppRevKaydet,
    _ppRevYukle: window._ppRevYukle,
    _ppOncelikLoad: window._ppOncelikLoad,
    _ppOncelikSave: window._ppOncelikSave,
    _ppOncelikEkle: window._ppOncelikEkle,
    _ppOncelikToggle: window._ppOncelikToggle,
    _ppOncelikSil: window._ppOncelikSil,
    _ppChallengeLoad: window._ppChallengeLoad,
    _ppHabitLoad: window._ppHabitLoad,
    _ppGoalLoad: window._ppGoalLoad,
    _ppHayatLoad: window._ppHayatLoad
  });
})();
