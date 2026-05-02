/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/mount.js
 * V138.3 AKTİVASYON — Panel HTML iskelesi (innerHTML inject)
 * Anayasa: K01 / Belge 3 § 6 (namespace standardı)
 * Cycle: V138.3.1-SALES-CRM-MOUNT-001
 * ───────────────────────────────────────────────────── */
(function() {
  'use strict';
  window.SalesCRM = window.SalesCRM || {
    core: {}, data: {}, pages: {}, modal: {}, ui: {}, io: {}
  };

  function _sidebarHTML() {
    var sections = [
      { title: 'GENEL', items: [
        { p: 'dashboard', e: '📊', t: 'Dashboard', b: null },
        { p: 'musteriler', e: '👥', t: 'Müşteriler', b: 'scrm-nb-c', cls: 'nb-blue' },
        { p: 'pipeline',   e: '🎯', t: 'Pipeline',   b: 'scrm-nb-p', cls: 'nb-amber' },
        { p: 'meetings',   e: '📅', t: 'Toplantılar', b: 'scrm-nb-m', cls: 'nb-green' }
      ]},
      { title: 'OPERASYON', items: [
        { p: 'musteri-kart',   e: '📋', t: 'Müşteri Kartı' },
        { p: 'gorusme',        e: '💬', t: 'Görüşme Kartı' },
        { p: 'spin',           e: '🎯', t: 'SPIN Analiz' },
        { p: 'musteri-analiz', e: '📈', t: 'Potansiyel Analiz' },
        { p: 'tasks',          e: '✅', t: 'Görevler', b: 'scrm-nb-t', cls: 'nb-red' },
        { p: 'eval',           e: '⭐', t: 'Değerlendirme' }
      ]},
      { title: 'KAYNAK', items: [
        { p: 'kaynak',   e: '📚', t: 'Kaynak Bankası' },
        { p: 'gurular',  e: '🎓', t: 'Gurular' },
        { p: 'playbook', e: '📖', t: 'Playbook' },
        { p: 'baran',    e: '🌟', t: 'Baran Rehberi' }
      ]}
    ];
    var html = '';
    sections.forEach(function(sec) {
      html += '<div class="nsec">' + sec.title + '</div>';
      sec.items.forEach(function(it) {
        var badge = it.b ? '<span class="ni-badge ' + (it.cls || '') + '" id="' + it.b + '">0</span>' : '';
        html += '<div class="scrm-ni" data-action="pages.go" data-arg="' + it.p + '" data-p="' + it.p + '">' +
          '<span>' + it.e + '</span><span style="flex:1">' + it.t + '</span>' + badge +
          '</div>';
      });
    });
    return html;
  }

  function _topbarHTML() {
    return '<div class="scrm-topbar">' +
      '<div class="scrm-ptitle" id="scrm-ptitle">Dashboard</div>' +
      '<div class="scrm-topbar-sp"></div>' +
      '<button class="btn bs bsm" data-action="modal.openContact">+ Müşteri</button>' +
      '<button class="btn bp bsm" data-action="modal.openDeal">+ Fırsat</button>' +
      '<button class="btn bs bsm" data-action="io.exportJSON">📥 Export</button>' +
      '</div>';
  }

  function _pageDashboard() {
    return '<div class="scrm-page active" id="scrm-page-dashboard">' +
      '<div class="g g4" id="scrm-dash-stats"></div>' +
      '<div class="card" style="margin-top:14px"><div class="ch"><h3>Pipeline Dağılımı</h3></div>' +
      '<div class="cb" style="display:grid;grid-template-columns:1fr 1fr;gap:18px">' +
      '<div class="mc" id="scrm-pipe-chart" style="height:60px"></div>' +
      '<div id="scrm-stage-sum"></div>' +
      '</div></div>' +
      '</div>';
  }

  function _pageMusteriler() {
    return '<div class="scrm-page" id="scrm-page-musteriler">' +
      '<div class="fbar">' +
      '<button class="fc active" data-action="ui.fContact" data-arg="all">Tümü</button>' +
      '<button class="fc" data-action="ui.fContact" data-arg="Müşteri">Müşteri</button>' +
      '<button class="fc" data-action="ui.fContact" data-arg="Potansiyel">Potansiyel</button>' +
      '<button class="fc" data-action="ui.fContact" data-arg="Partner">Partner</button>' +
      '<input class="fi" id="scrm-c-q" placeholder="Ara..." style="margin-left:auto;max-width:200px">' +
      '</div>' +
      '<div class="card"><div class="tw"><table>' +
      '<thead><tr><th>Müşteri</th><th>Sektör</th><th>Sınıf</th><th>Durum</th><th>Son Aktivite</th><th>Toplam</th></tr></thead>' +
      '<tbody id="scrm-c-tbody"></tbody></table></div></div>' +
      '</div>';
  }

  function _pagePipeline() {
    return '<div class="scrm-page" id="scrm-page-pipeline">' +
      '<div class="fbar">' +
      '<button class="fc active" data-action="ui.fPipe" data-arg="all">Tümü</button>' +
      '<button class="fc" data-action="ui.fPipe" data-arg="Prospecting">Prospecting</button>' +
      '<button class="fc" data-action="ui.fPipe" data-arg="Nitelikli">Nitelikli</button>' +
      '<button class="fc" data-action="ui.fPipe" data-arg="Teklif">Teklif</button>' +
      '<button class="fc" data-action="ui.fPipe" data-arg="Müzakere">Müzakere</button>' +
      '<button class="fc" data-action="ui.fPipe" data-arg="Kapanış">Kapanış</button>' +
      '</div>' +
      '<div class="pipe" id="scrm-pipe-board"></div>' +
      '</div>';
  }

  function _pageMeetings() {
    return '<div class="scrm-page" id="scrm-page-meetings">' +
      '<div class="fbar">' +
      '<button class="fc active" data-action="ui.fMeet" data-arg="all">Tümü</button>' +
      '<button class="fc" data-action="ui.fMeet" data-arg="up">Yaklaşan</button>' +
      '<button class="fc" data-action="ui.fMeet" data-arg="past">Geçmiş</button>' +
      '<button class="btn bp bsm" data-action="modal.openMeeting" style="margin-left:auto">+ Toplantı</button>' +
      '</div>' +
      '<div class="g g3" id="scrm-m-grid"></div>' +
      '</div>';
  }

  function _pageMK() {
    var fields = [
      { id: 'mk-firma', l: 'Firma Adı', t: 'text' },
      { id: 'mk-tarih', l: 'Tarih', t: 'date' },
      { id: 'mk-yetkili', l: 'Yetkili', t: 'text' },
      { id: 'mk-katilimci', l: 'Katılımcı', t: 'text' },
      { id: 'mk-not-firma', l: 'Firma Notu', t: 'ta' },
      { id: 'mk-sahip', l: 'Sahip/Yönetici', t: 'text' },
      { id: 'mk-faaliyet', l: 'Faaliyet Alanı', t: 'text' },
      { id: 'mk-diger', l: 'Diğer Bilgiler', t: 'ta' },
      { id: 'mk-not-sahip', l: 'Sahip Hakkında', t: 'ta' }
    ];
    var html = '<div class="scrm-page" id="scrm-page-musteri-kart">' +
      '<div class="card"><div class="ch"><h3>Müşteri Kartı</h3></div>' +
      '<div class="cb">' +
      '<div class="fg"><label class="fl">Müşteri Seç</label>' +
      '<select class="fs" id="scrm-mk-sel" data-action="ui.loadMK"></select></div>';
    fields.forEach(function(f) {
      html += '<div class="fg"><label class="fl">' + f.l + '</label>';
      if (f.t === 'ta') html += '<textarea class="ft" id="scrm-' + f.id + '"></textarea>';
      else html += '<input class="fi" type="' + f.t + '" id="scrm-' + f.id + '">';
      html += '</div>';
    });
    html += '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button class="btn bp" data-action="pages.saveMK">Kaydet</button>' +
      '<button class="btn bs" data-action="pages.clearMK">Temizle</button>' +
      '</div>' +
      '</div></div></div>';
    return html;
  }

  function _pageGorusme() {
    return '<div class="scrm-page" id="scrm-page-gorusme">' +
      '<div class="card"><div class="ch"><h3>Görüşme Kartı</h3></div>' +
      '<div class="cb">' +
      '<div class="fg"><label class="fl">Müşteri Seç</label>' +
      '<select class="fs" id="scrm-gk-cid" data-action="ui.loadGorusme"></select></div>' +
      '<div id="scrm-gk-sorular" style="margin-top:14px"></div>' +
      '<div style="margin-top:14px"><div class="ch" style="padding:0;border:none"><h3>Aksiyon Planı</h3>' +
      '<button class="btn bp bsm" data-action="modal.openAction" style="margin-left:auto">+ Aksiyon</button></div>' +
      '<div id="scrm-gk-actions"></div></div>' +
      '</div></div></div>';
  }

  function _pageSpin() {
    return '<div class="scrm-page" id="scrm-page-spin">' +
      '<div class="card"><div class="ch"><h3>SPIN Analiz</h3></div>' +
      '<div class="cb">' +
      '<div class="fg"><label class="fl">Müşteri</label><select class="fs" id="scrm-spin-sel" data-action="ui.loadSpin"></select></div>' +
      '<div class="g g2" style="margin-top:10px">' +
      '<div class="fg"><label class="fl" style="color:var(--blue)">S — Situation</label><textarea class="ft" id="scrm-sp-s" data-action="ui.spinInput"></textarea></div>' +
      '<div class="fg"><label class="fl" style="color:var(--amber)">P — Problem</label><textarea class="ft" id="scrm-sp-p" data-action="ui.spinInput"></textarea></div>' +
      '<div class="fg"><label class="fl" style="color:var(--red)">I — Implication</label><textarea class="ft" id="scrm-sp-i" data-action="ui.spinInput"></textarea></div>' +
      '<div class="fg"><label class="fl" style="color:var(--green)">N — Need-Payoff</label><textarea class="ft" id="scrm-sp-n" data-action="ui.spinInput"></textarea></div>' +
      '</div>' +
      '<div id="scrm-spin-scores" style="margin-top:14px"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button class="btn bp" data-action="pages.saveSpin">Kaydet</button>' +
      '<button class="btn bs" data-action="pages.clearSpin">Temizle</button>' +
      '</div>' +
      '<div class="info-panel" id="scrm-spin-tips" style="margin-top:14px"></div>' +
      '</div></div></div>';
  }

  function _pagePA() {
    var fields = [
      { id: 'pa-bitmis', l: 'Bitmiş İşler' },
      { id: 'pa-devam', l: 'Devam Eden İşler' },
      { id: 'pa-baslayacak', l: 'Başlayacak İşler' },
      { id: 'pa-dusuren', l: 'Düşüren Faktörler' },
      { id: 'pa-gelistirme', l: 'Geliştirme Alanları' },
      { id: 'pa-artirici', l: 'Artırıcı Faktörler' },
      { id: 'pa-destek', l: 'Destek İhtiyacı' },
      { id: 'pa-urun', l: 'Ürün Talepleri' },
      { id: 'pa-hizmet', l: 'Hizmet Talepleri' },
      { id: 'pa-korku', l: 'Korkular/Endişeler' }
    ];
    var html = '<div class="scrm-page" id="scrm-page-musteri-analiz">' +
      '<div class="card"><div class="ch"><h3>Potansiyel Analiz</h3></div>' +
      '<div class="cb">' +
      '<div class="fg"><label class="fl">Müşteri</label><select class="fs" id="scrm-pa-sel" data-action="ui.loadPA"></select></div>' +
      '<div class="anl-box" style="margin-top:10px">' +
      '<div class="fr"><div><label class="fl">Sınıf</label><select class="fs" id="scrm-anl-sinif"><option>A+</option><option>A</option><option selected>B</option><option>C</option></select></div>' +
      '<div><label class="fl">Sektör</label><select class="fs" id="scrm-anl-sektor"><option>Teknoloji</option><option>Üretim</option><option>Hizmet</option><option>Ticaret</option><option>Diğer</option></select></div></div>' +
      '<button class="btn bp bsm" data-action="pages.runAnalysis" style="margin-top:10px">📊 Analiz Yap</button>' +
      '<div id="scrm-anl-out" style="display:none;margin-top:12px">' +
      '<div class="anl-box"><div class="anl-lbl" style="color:var(--blue)">Potansiyel</div><div class="anl-bd" id="scrm-anl-pot"></div></div>' +
      '<div class="anl-box"><div class="anl-lbl" style="color:var(--red)">Risk</div><div class="anl-bd" id="scrm-anl-risk"></div></div>' +
      '<div class="anl-box"><div class="anl-lbl" style="color:var(--purple)">Guru Önerileri</div><div class="anl-bd" id="scrm-anl-guru"></div></div>' +
      '</div></div>';
    fields.forEach(function(f) {
      html += '<div class="fg"><label class="fl">' + f.l + '</label><textarea class="ft" id="scrm-' + f.id + '"></textarea></div>';
    });
    html += '<button class="btn bp" data-action="pages.savePA" style="margin-top:10px">Kaydet</button>' +
      '</div></div></div>';
    return html;
  }

  function _pageTasks() {
    return '<div class="scrm-page" id="scrm-page-tasks">' +
      '<div class="fbar">' +
      '<button class="fc" data-action="ui.fTask" data-arg="all">Tümü</button>' +
      '<button class="fc active" data-action="ui.fTask" data-arg="open">Açık</button>' +
      '<button class="fc" data-action="ui.fTask" data-arg="done">Bitmiş</button>' +
      '<button class="fc" data-action="ui.fTask" data-arg="high">Yüksek Öncelik</button>' +
      '<button class="btn bp bsm" data-action="modal.openTask" style="margin-left:auto">+ Görev</button>' +
      '</div>' +
      '<div class="card"><div class="tw"><table>' +
      '<thead><tr><th></th><th>Görev</th><th>Müşteri</th><th>Öncelik</th><th>Son Tarih</th><th>Durum</th></tr></thead>' +
      '<tbody id="scrm-t-tbody"></tbody></table></div></div>' +
      '</div>';
  }

  function _pageEval() {
    return '<div class="scrm-page" id="scrm-page-eval">' +
      '<div class="card"><div class="ch"><h3>Satış Değerlendirme</h3>' +
      '<button class="btn bp bsm" data-action="pages.addEval" style="margin-left:auto">+ Ekle</button></div>' +
      '<div class="cb"><div id="scrm-eval-list"></div></div></div>' +
      '</div>';
  }

  function _pageKaynak() {
    return '<div class="scrm-page" id="scrm-page-kaynak">' +
      '<div class="card"><div class="ch"><h3>Soru Bankası</h3></div>' +
      '<div class="cb">' +
      '<div class="fg"><label class="fl">Görüşmeye Ekleyeceğiniz Müşteri</label>' +
      '<select class="fs" id="scrm-kaynak-cid"></select></div>' +
      '<div class="fbar" style="margin-top:10px">' +
      '<button class="fc active" data-action="ui.fQCat" data-arg="all">Tümü</button>' +
      '<button class="fc" data-action="ui.fQCat" data-arg="Açılış">Açılış</button>' +
      '<button class="fc" data-action="ui.fQCat" data-arg="SPIN-S">SPIN-S</button>' +
      '<button class="fc" data-action="ui.fQCat" data-arg="SPIN-P">SPIN-P</button>' +
      '<button class="fc" data-action="ui.fQCat" data-arg="SPIN-I">SPIN-I</button>' +
      '<button class="fc" data-action="ui.fQCat" data-arg="SPIN-N">SPIN-N</button>' +
      '</div>' +
      '<div class="g g2" id="scrm-q-bank-grid" style="margin-top:14px"></div>' +
      '</div></div>' +
      '<div class="card"><div class="ch"><h3>Satış Teknikleri</h3></div>' +
      '<div class="cb"><div id="scrm-kb-list"></div></div></div>' +
      '</div>';
  }

  function _pageGurular() {
    return '<div class="scrm-page" id="scrm-page-gurular">' +
      '<div class="g g3" id="scrm-guru-grid"></div>' +
      '</div>';
  }

  function _pagePlaybook() {
    return '<div class="scrm-page" id="scrm-page-playbook">' +
      '<div class="card"><div class="ch"><h3>🚪 Açılış</h3></div><div class="cb" id="scrm-pb-open"></div></div>' +
      '<div class="card"><div class="ch"><h3>💎 Değer Sunma</h3></div><div class="cb" id="scrm-pb-value"></div></div>' +
      '<div class="card"><div class="ch"><h3>⚔ İtirazlar</h3></div><div class="cb" id="scrm-pb-obj"></div></div>' +
      '<div class="card"><div class="ch"><h3>🤝 Güven Kurma</h3></div><div class="cb" id="scrm-pb-trust"></div></div>' +
      '<div class="card"><div class="ch"><h3>🔒 Kapanış</h3></div><div class="cb" id="scrm-pb-close"></div></div>' +
      '</div>';
  }

  function _pageBaran() {
    return '<div class="scrm-page" id="scrm-page-baran">' +
      '<div class="info-panel"><p>Baran Şimşek & Jeffrey Gitomer prensipleri — saha satışında kanıtlanmış 12 altın kural.</p></div>' +
      '<div class="insight-card"><div class="insight-num">1</div><div class="insight-body"><strong>Acıyla başlama, zevkle başla.</strong><div class="insight-action">Önce ortak değerleri keşfet, sonra problemi ortaya çıkar.</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">2</div><div class="insight-body"><strong>Pitch değil, fikir getir.</strong><div class="insight-action">Son 10 müşterimiz neden aldı sorusuyla başla.</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">3</div><div class="insight-body"><strong>Patronuna izah edilebilir kanıt sun.</strong><div class="insight-action">Alıcıya, kararı için ekibine göstereceği somut fark ver.</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">4</div><div class="insight-body"><strong>Sessizliği kullan.</strong><div class="insight-action">Soru sorduktan sonra bekle. İlk konuşan kaybeder.</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">5</div><div class="insight-body"><strong>Fayda Check-Up yap.</strong><div class="insight-action">Mevcut tedarikçinin vermediği tek şeyi belirle.</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">6</div><div class="insight-body"><strong>Implication ile maliyeti hissettir.</strong><div class="insight-action">Bu çözülmezse yıl sonunda ne kadar kaybedersiniz?</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">7</div><div class="insight-body"><strong>Need-Payoff ile değeri tanıtla.</strong><div class="insight-action">Bu çözülseydi ne değişirdi? — müşteri kendi söylesin.</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">8</div><div class="insight-body"><strong>Statükoyu sars.</strong><div class="insight-action">Müşterinin bilmediği bir riski ortaya koy (Challenger).</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">9</div><div class="insight-body"><strong>Şampiyonu erken belirle.</strong><div class="insight-action">Karar mekanizmasında seni savunacak kişiyi tanı.</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">10</div><div class="insight-body"><strong>10X aciliyet yarat.</strong><div class="insight-action">Ertelemenin gerçek maliyetini birlikte hesapla (Cardone).</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">11</div><div class="insight-body"><strong>Varsayımsal kapanış kullan.</strong><div class="insight-action">Çarşamba 14:00 sözleşme için uygun mu?</div></div></div>' +
      '<div class="insight-card"><div class="insight-num">12</div><div class="insight-body"><strong>İlişki kurunca sat.</strong><div class="insight-action">Önce güven, sonra fikir, sonra teklif. Tersine ASLA.</div></div></div>' +
      '</div>';
  }

  function _modalContact() {
    return '<div class="ov" id="scrm-ov-c"><div class="modal">' +
      '<div class="mhd"><h2 id="scrm-mc-t">Yeni Müşteri</h2><button class="mcl" data-action="ui.closeOv" data-arg="scrm-ov-c">✕</button></div>' +
      '<div class="mbdy">' +
      '<div class="tabs"><div class="tab active" data-action="ui.switchTab" data-arg="scrm-ov-c|0">Bilgiler</div><div class="tab" data-action="ui.switchTab" data-arg="scrm-ov-c|1">Aktivite</div><div class="tab" data-action="ui.switchTab" data-arg="scrm-ov-c|2">Notlar</div></div>' +
      '<div class="tp active">' +
      '<div class="fr"><div class="fg"><label class="fl">Ad Soyad *</label><input class="fi" id="scrm-c-name"></div><div class="fg"><label class="fl">Firma *</label><input class="fi" id="scrm-c-co"></div></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Ünvan</label><input class="fi" id="scrm-c-ti"></div><div class="fg"><label class="fl">Sektör</label><select class="fs" id="scrm-c-sec"><option>Teknoloji</option><option>Üretim</option><option>Hizmet</option><option>Ticaret</option><option>Diğer</option></select></div></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Email</label><input class="fi" type="email" id="scrm-c-em"></div><div class="fg"><label class="fl">Telefon</label><input class="fi" id="scrm-c-ph"></div></div>' +
      '<div class="fr3"><div class="fg"><label class="fl">Durum</label><select class="fs" id="scrm-c-st"><option>Potansiyel</option><option>Müşteri</option><option>Partner</option><option>Eski Müşteri</option></select></div><div class="fg"><label class="fl">Sınıf</label><select class="fs" id="scrm-c-pot"><option>A+</option><option>A</option><option selected>B</option><option>C</option></select></div><div class="fg"><label class="fl">Şehir</label><input class="fi" id="scrm-c-ci"></div></div>' +
      '<div class="fg"><label class="fl">Kaynak</label><select class="fs" id="scrm-c-src"><option>Referans</option><option>Web</option><option>Sosyal Medya</option><option>Etkinlik</option><option>Soğuk</option><option>Diğer</option></select></div>' +
      '<div class="fg"><label class="fl">Notlar</label><textarea class="ft" id="scrm-c-nt"></textarea></div>' +
      '</div>' +
      '<div class="tp">' +
      '<div class="fr"><div class="fg"><label class="fl">Tür</label><select class="fs" id="scrm-act-tp"><option>📞</option><option>📧</option><option>🤝</option><option>💬</option><option>📝</option></select></div><div class="fg"><label class="fl">Tarih</label><input class="fi" type="datetime-local" id="scrm-act-dt"></div></div>' +
      '<div class="fg"><label class="fl">Açıklama</label><textarea class="ft" id="scrm-act-dc"></textarea></div>' +
      '<button class="btn bp bsm" data-action="modal.addActivity">+ Ekle</button>' +
      '<div class="tl" id="scrm-act-list" style="margin-top:12px"></div>' +
      '</div>' +
      '<div class="tp">' +
      '<div class="ned"><div class="netb"></div><div class="neb" id="scrm-note-ed" contenteditable="true" data-ph="Not yazın..."></div></div>' +
      '<div id="scrm-saved-notes" style="margin-top:12px"></div>' +
      '</div>' +
      '</div>' +
      '<div class="mft">' +
      '<button class="btn br" data-action="ui.delContactConfirm">Sil</button>' +
      '<div style="flex:1"></div>' +
      '<button class="btn bs" data-action="ui.closeOv" data-arg="scrm-ov-c">İptal</button>' +
      '<button class="btn bp" data-action="modal.saveContact">Kaydet</button>' +
      '</div>' +
      '</div></div>';
  }

  function _modalDeal() {
    return '<div class="ov" id="scrm-ov-d"><div class="modal">' +
      '<div class="mhd"><h2 id="scrm-md-t">Yeni Fırsat</h2><button class="mcl" data-action="ui.closeOv" data-arg="scrm-ov-d">✕</button></div>' +
      '<div class="mbdy">' +
      '<div class="fg"><label class="fl">Fırsat Adı *</label><input class="fi" id="scrm-d-n"></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Müşteri</label><select class="fs" id="scrm-d-c"></select></div><div class="fg"><label class="fl">Aşama</label><select class="fs" id="scrm-d-s"><option>Prospecting</option><option>Nitelikli</option><option>Teklif</option><option>Müzakere</option><option>Kapanış</option></select></div></div>' +
      '<div class="fr3"><div class="fg"><label class="fl">Değer (₺)</label><input class="fi" type="number" id="scrm-d-v"></div><div class="fg"><label class="fl">Olasılık (%)</label><input class="fi" type="number" id="scrm-d-pr" min="0" max="100"></div><div class="fg"><label class="fl">Öncelik</label><select class="fs" id="scrm-d-pri"><option>Düşük</option><option selected>Orta</option><option>Yüksek</option></select></div></div>' +
      '<div class="fg"><label class="fl">Kapanış Tarihi</label><input class="fi" type="date" id="scrm-d-dt"></div>' +
      '<div class="fg"><label class="fl">Açıklama</label><textarea class="ft" id="scrm-d-desc"></textarea></div>' +
      '<div class="fg"><label class="fl">Görüşme Notu</label><textarea class="ft" id="scrm-d-nt"></textarea></div>' +
      '<div class="fg"><label class="fl">Sonraki Adım</label><input class="fi" id="scrm-d-nx"></div>' +
      '</div>' +
      '<div class="mft"><button class="btn bs" data-action="ui.closeOv" data-arg="scrm-ov-d">İptal</button><button class="btn bp" data-action="modal.saveDeal">Kaydet</button></div>' +
      '</div></div>';
  }

  function _modalMeeting() {
    return '<div class="ov" id="scrm-ov-m"><div class="modal">' +
      '<div class="mhd"><h2 id="scrm-mm-t">Toplantı Ekle</h2><button class="mcl" data-action="ui.closeOv" data-arg="scrm-ov-m">✕</button></div>' +
      '<div class="mbdy">' +
      '<div class="fg"><label class="fl">Başlık *</label><input class="fi" id="scrm-m-ti"></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Müşteri</label><select class="fs" id="scrm-m-c"></select></div><div class="fg"><label class="fl">Tür</label><select class="fs" id="scrm-m-ty"><option>Yüz Yüze</option><option>Online</option><option>Telefon</option></select></div></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Tarih *</label><input class="fi" type="datetime-local" id="scrm-m-dt"></div><div class="fg"><label class="fl">Süre (dk)</label><input class="fi" type="number" id="scrm-m-dur" value="60"></div></div>' +
      '<div class="fg"><label class="fl">Konum</label><input class="fi" id="scrm-m-loc"></div>' +
      '<div class="fg"><label class="fl">Gündem</label><textarea class="ft" id="scrm-m-ag"></textarea></div>' +
      '<div class="fg"><label class="fl">Hazırlık</label><textarea class="ft" id="scrm-m-prep"></textarea></div>' +
      '<div class="fg"><label class="fl">Sonuç</label><textarea class="ft" id="scrm-m-res"></textarea></div>' +
      '</div>' +
      '<div class="mft"><button class="btn bs" data-action="ui.closeOv" data-arg="scrm-ov-m">İptal</button><button class="btn bp" data-action="modal.saveMeeting">Kaydet</button></div>' +
      '</div></div>';
  }

  function _modalTask() {
    return '<div class="ov" id="scrm-ov-t"><div class="modal">' +
      '<div class="mhd"><h2 id="scrm-mt-t">Görev Ekle</h2><button class="mcl" data-action="ui.closeOv" data-arg="scrm-ov-t">✕</button></div>' +
      '<div class="mbdy">' +
      '<div class="fg"><label class="fl">Başlık *</label><input class="fi" id="scrm-t-ti"></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Müşteri</label><select class="fs" id="scrm-t-c"></select></div><div class="fg"><label class="fl">Tür</label><select class="fs" id="scrm-t-ty"><option>📞 Telefon</option><option>📧 Email</option><option>🤝 Toplantı</option><option>📝 Diğer</option></select></div></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Öncelik</label><select class="fs" id="scrm-t-pr"><option>Düşük</option><option selected>Orta</option><option>Yüksek</option></select></div><div class="fg"><label class="fl">Son Tarih</label><input class="fi" type="date" id="scrm-t-dt"></div></div>' +
      '<div class="fg"><label class="fl">Not</label><textarea class="ft" id="scrm-t-nt"></textarea></div>' +
      '</div>' +
      '<div class="mft"><button class="btn bs" data-action="ui.closeOv" data-arg="scrm-ov-t">İptal</button><button class="btn bp" data-action="modal.saveTask">Kaydet</button></div>' +
      '</div></div>';
  }

  function _modalAction() {
    return '<div class="ov" id="scrm-ov-a"><div class="modal">' +
      '<div class="mhd"><h2>Aksiyon Ekle</h2><button class="mcl" data-action="ui.closeOv" data-arg="scrm-ov-a">✕</button></div>' +
      '<div class="mbdy">' +
      '<div class="fg"><label class="fl">Görev *</label><input class="fi" id="scrm-a-g"></div>' +
      '<div class="fr"><div class="fg"><label class="fl">Müşteri</label><select class="fs" id="scrm-a-c"></select></div><div class="fg"><label class="fl">Öncelik</label><select class="fs" id="scrm-a-pr"><option>Düşük</option><option selected>Orta</option><option>Yüksek</option></select></div></div>' +
      '<div class="fg"><label class="fl">Tarih</label><input class="fi" type="date" id="scrm-a-dt"></div>' +
      '</div>' +
      '<div class="mft"><button class="btn bs" data-action="ui.closeOv" data-arg="scrm-ov-a">İptal</button><button class="btn bp" data-action="modal.saveAction">Kaydet</button></div>' +
      '</div></div>';
  }

  function mountPanel() {
    var root = document.getElementById('panel-sales-crm');
    if (!root) return;
    if (root.dataset.mounted === '1') return;
    root.innerHTML =
      '<div class="scrm-layout">' +
        '<div class="scrm-sb">' + _sidebarHTML() + '</div>' +
        '<div class="scrm-main">' +
          _topbarHTML() +
          _pageDashboard() +
          _pageMusteriler() +
          _pagePipeline() +
          _pageMeetings() +
          _pageMK() +
          _pageGorusme() +
          _pageSpin() +
          _pagePA() +
          _pageTasks() +
          _pageEval() +
          _pageKaynak() +
          _pageGurular() +
          _pagePlaybook() +
          _pageBaran() +
        '</div>' +
      '</div>' +
      _modalContact() +
      _modalDeal() +
      _modalMeeting() +
      _modalTask() +
      _modalAction() +
      '<div id="scrm-tc"></div>';
    root.dataset.mounted = '1';
    _attachEvents(root);
  }

  function _attachEvents(root) {
    root.addEventListener('click', function(e) {
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var act = t.getAttribute('data-action');
      var arg = t.getAttribute('data-arg');
      var parts = act.split('.');
      var ns = parts[0], fn = parts[1];
      var sc = window.SalesCRM;
      if (sc && sc[ns] && typeof sc[ns][fn] === 'function') {
        sc[ns][fn](arg);
      }
    });
    var cq = root.querySelector('#scrm-c-q');
    if (cq) cq.addEventListener('input', function(e) {
      var core = window.SalesCRM.core;
      if (!core) return;
      core.FS.contactQ = e.target.value;
      var pages = window.SalesCRM.pages;
      if (pages && pages.rdContacts) pages.rdContacts();
    });
  }

  window.SalesCRM.ui = window.SalesCRM.ui || {};
  Object.assign(window.SalesCRM.ui, {
    mountPanel: mountPanel,
    closeOv: function(id) {
      var ov = document.getElementById(id);
      if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
    },
    switchTab: function(arg) {
      var p = arg.split('|'); var ovId = p[0]; var idx = parseInt(p[1], 10);
      var ov = document.getElementById(ovId); if (!ov) return;
      ov.querySelectorAll('.tab').forEach(function(t, i) { t.classList.toggle('active', i === idx); });
      ov.querySelectorAll('.tp').forEach(function(t, i) { t.classList.toggle('active', i === idx); });
    },
    fContact: function(v) {
      var core = window.SalesCRM.core, pages = window.SalesCRM.pages;
      if (!core || !pages) return;
      core.FS.contact = v;
      document.querySelectorAll('#scrm-page-musteriler .fc').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-arg') === v);
      });
      pages.rdContacts();
    },
    fPipe: function(v) {
      var core = window.SalesCRM.core, pages = window.SalesCRM.pages;
      if (!core || !pages) return;
      core.FS.pipe = v;
      document.querySelectorAll('#scrm-page-pipeline .fc').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-arg') === v);
      });
      pages.rdPipe();
    },
    fMeet: function(v) {
      var core = window.SalesCRM.core, pages = window.SalesCRM.pages;
      if (!core || !pages) return;
      core.FS.meet = v;
      document.querySelectorAll('#scrm-page-meetings .fc').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-arg') === v);
      });
      pages.rdMeetings();
    },
    fTask: function(v) {
      var core = window.SalesCRM.core, pages = window.SalesCRM.pages;
      if (!core || !pages) return;
      core.FS.task = v;
      document.querySelectorAll('#scrm-page-tasks .fc').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-arg') === v);
      });
      pages.rdTasks();
    },
    fQCat: function(v) {
      var pages = window.SalesCRM.pages;
      if (pages && pages.fQCat) pages.fQCat(v);
      document.querySelectorAll('#scrm-page-kaynak .fc').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-arg') === v);
      });
    },
    loadMK: function() {
      var sel = document.getElementById('scrm-mk-sel');
      var pages = window.SalesCRM.pages;
      if (sel && pages && pages.loadMK) pages.loadMK(sel.value);
    },
    loadGorusme: function() {
      var sel = document.getElementById('scrm-gk-cid');
      var pages = window.SalesCRM.pages;
      if (sel && pages && pages.loadGorusme) pages.loadGorusme(sel.value);
    },
    loadSpin: function() {
      var sel = document.getElementById('scrm-spin-sel');
      var pages = window.SalesCRM.pages;
      if (sel && pages && pages.loadSpin) pages.loadSpin(sel.value);
    },
    loadPA: function() {
      var sel = document.getElementById('scrm-pa-sel');
      var pages = window.SalesCRM.pages;
      if (sel && pages && pages.loadPA) pages.loadPA(sel.value);
    },
    spinInput: function() {
      var pages = window.SalesCRM.pages;
      if (pages && pages.updSpinScore) pages.updSpinScore();
    },
    delContactConfirm: function() {
      var core = window.SalesCRM.core;
      var modal = window.SalesCRM.modal;
      if (!core || !core.EID.c || !modal || !modal.delContact) return;
      modal.delContact(core.EID.c);
    }
  });
})();
