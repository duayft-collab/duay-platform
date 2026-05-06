/**
 * ═══════════════════════════════════════════════════════════════
 * src/i18n/translations.js
 * Türkçe / İngilizce çeviri sözlüğü
 * Anayasa Kural 1: Tüm arayüz TR + EN i18n destekli
 * ═══════════════════════════════════════════════════════════════
 *
 * Kullanım:
 *   t('login.title')          → "Giriş Yap"  (TR)
 *   t('login.title', 'en')    → "Sign In"     (EN)
 *   I18n.apply()              → DOM'daki data-i18n attr'larını güncelle
 */

'use strict';

let TRANSLATIONS = {
  tr: {
    // ── Genel ──────────────────────────────────────────────────
    'app.name':            'Duay Global LLC',
    'app.tagline':         'Operasyon Platformu',
    'app.description':     'Satın Alma, Tedarik Zinciri & Operasyon Yönetimi',
    'btn.save':            'Kaydet',
    'btn.cancel':          'İptal',
    'btn.delete':          'Sil',
    'btn.edit':            'Düzenle',
    'btn.add':             'Ekle',
    'btn.close':           'Kapat',
    'btn.export':          '📥 Excel',
    'btn.approve':         '✓ Onayla',
    'btn.reject':          '✕ Reddet',
    'btn.logout':          'Çıkış',
    'btn.search':          'Ara',
    'lbl.all':             'Tümü',
    'lbl.loading':         'Yükleniyor…',
    'lbl.noData':          'Kayıt bulunamadı.',
    'lbl.yes':             'Evet',
    'lbl.no':              'Hayır',

    // ── Giriş ekranı ───────────────────────────────────────────
    'login.title':         'Giriş Yap',
    'login.subtitle':      'Hesabınıza erişin',
    'login.email':         'E-POSTA',
    'login.password':      'ŞİFRE',
    'login.btn':           'Giriş Yap',
    'login.loading':       'Giriş yapılıyor…',
    'login.err.empty':     'E-posta ve şifre gereklidir.',
    'login.err.invalid':   'E-posta veya şifre hatalı.',
    'login.err.disabled':  'Hesabınız askıya alınmış.',
    'login.err.network':   'Ağ bağlantısı hatası.',
    'login.err.tooMany':   'Çok fazla deneme. Lütfen bekleyin.',
    'login.theme':         '🌙 Tema',
    'login.reset':         'Veri Sıfırla',
    'login.version':       'Platform sürümü',

    // ── Navigasyon ─────────────────────────────────────────────
    'nav.dashboard':       'Dashboard',
    'nav.pusula':          'Görev Takibi',
    'nav.takvim':          'Takvim',
    'nav.kargo':           'Kargo',
    'nav.pirim':           'Prim',
    'nav.crm':             'Müşteriler',
    'nav.stok':            'Stok',
    'nav.ik':              'İK / Personel',
    'nav.notes':           'Notlar',
    'nav.rehber':          'Rehber',
    'nav.settings':        'Ayarlar',
    'nav.search':          'Ara (Ctrl+K)',
    'nav.notifications':   'Bildirimler',

    // ── Navigasyon — Grup Başlıkları ────────────────────────────
    'nav.group.genel':     'GENEL',
    'nav.group.tasks':     'GÖREV & PROJE',
    'nav.group.lojistik':  'LOJİSTİK & STOK',
    'nav.group.finans':    'FİNANS',
    'nav.group.hr':        'İNSAN KAYNAKLARI',
    'nav.group.yonetim':   'YÖNETİM',

    // ── Navigasyon — Tam Menü Etiketleri ───────────────────────
    'nav.announce':        'Duyurular',
    'nav.hedefler':        'Hedefler',
    'nav.crm':             'CRM / Müşteriler',
    'nav.stok':            'Stok',
    'nav.pirim':           'Prim',
    'nav.odemeler':        'Ödemeler',
    'nav.puantaj':         'Puantaj',
    'nav.izin':            'İzin Yönetimi',
    'nav.kpi':             'KPI / Performans',
    'nav.admin':           'Kullanıcı Yönetimi',

    // ── Dashboard ──────────────────────────────────────────────
    'dashboard.title':     'Dashboard',
    'dashboard.subtitle':  'Genel bakış',
    'dashboard.welcome':   'Merhaba, {name} 👋',

    // ── Kargo ──────────────────────────────────────────────────
    'kargo.title':         'Kargo Yönetimi',
    'kargo.subtitle':      'Gelen & giden kargolar',
    'kargo.add':           '+ Kargo Ekle',
    'kargo.total':         'Toplam',
    'kargo.incoming':      'Gelen',
    'kargo.outgoing':      'Giden',
    'kargo.pending':       'Beklemede',
    'kargo.delivered':     'Teslim',
    'kargo.status.bekle':  '⏳ Beklemede',
    'kargo.status.yolda':  '🚛 Yolda',
    'kargo.status.teslim': '✅ Teslim',
    'kargo.status.iade':   '↩️ İade',
    'kargo.dir.gelen':     '📥 Gelen',
    'kargo.dir.giden':     '📤 Giden',
    'kargo.col.dir':       'Yön',
    'kargo.col.from':      'Gönderici',
    'kargo.col.to':        'Alıcı',
    'kargo.col.firm':      'Firma',
    'kargo.col.date':      'Tarih',
    'kargo.col.status':    'Durum',
    'kargo.col.staff':     'Personel',
    'kargo.col.action':    'İşlem',
    'kargo.empty':         'Kargo kaydı bulunamadı.',
    'kargo.markDelivered': '✓ Teslim',
    'kargo.container':     '🚢 Konteyner Takibi',
    'kargo.checkAll':      '🔄 Kontrol Et',
    'kargo.addContainer':  '+ Konteyner Ekle',

    // ── Prim ───────────────────────────────────────────────────
    'pirim.title':         'Prim Yönetimi',
    'pirim.subtitle':      'Teşvik & performans primleri',
    'pirim.add':           '+ Prim Ekle',
    'pirim.total':         'Toplam',
    'pirim.pending':       'Bekliyor',
    'pirim.approved':      'Onaylı',
    'pirim.totalAmount':   'Onaylı Toplam',
    'pirim.status.pending': '⏳ Onay Bekliyor',
    'pirim.status.approved':'✅ Onaylandı',
    'pirim.status.rejected':'❌ Reddedildi',
    'pirim.status.paid':   '💸 Ödendi',
    'pirim.col.staff':     'Personel',
    'pirim.col.type':      'Tür',
    'pirim.col.title':     'Başlık',
    'pirim.col.amount':    'Tutar',
    'pirim.col.date':      'Tarih',
    'pirim.col.payDate':   'Ödeme Tarihi',
    'pirim.col.status':    'Durum',
    'pirim.markPaid':      '💸 Ödendi',
    'pirim.empty':         'Prim kaydı bulunamadı.',

    // ── Admin Paneli ────────────────────────────────────────────
    'admin.title':         'Kullanıcı Yönetimi',
    'admin.addUser':       '+ Kullanıcı Ekle',
    'admin.col.name':      'Ad Soyad',
    'admin.col.email':     'E-posta',
    'admin.col.role':      'Rol',
    'admin.col.status':    'Durum',
    'admin.col.modules':   'Yetkili Modüller',
    'admin.col.action':    'İşlem',
    'admin.role.admin':    '👑 Yönetici',
    'admin.role.user':     '👤 Kullanıcı',
    'admin.status.active': '✅ Aktif',
    'admin.status.suspended': '⏸ Askıya Alındı',
    'admin.suspend':       'Askıya Al',
    'admin.activate':      'Aktif Et',
    'admin.resetPwd':      '🔑 Şifre Sıfırla',
    'admin.deleteUser':    '🗑 Kullanıcıyı Sil',

    // ── Log Sistemi ─────────────────────────────────────────────
    'log.title':           'Aktivite Logu',
    'log.col.user':        'Kullanıcı',
    'log.col.action':      'İşlem',
    'log.col.ts':          'Tarih & Saat',
    'log.col.module':      'Modül',
    'log.empty':           'Log kaydı yok.',

    // ── Öneri Kutusu ────────────────────────────────────────────
    'suggest.title':       'Geliştirme Önerisi',
    'suggest.placeholder': 'Önerinizi detaylıca yazın…',
    'suggest.btn':         '📨 Gönder',
    'suggest.sent':        'Öneriniz iletildi, teşekkürler!',

    // ── Duyurular ───────────────────────────────────────────────
    'ann.title':           'Duyurular',
    'ann.noNew':           'Yeni duyuru yok 🎉',
    'ann.updateBanner':    '🆕 Güncelleme: {msg}',

    // ── Ayarlar ─────────────────────────────────────────────────
    'settings.title':      'Ayarlar',
    'settings.theme':      'Tema',
    'settings.themeLight': '☀️ Açık',
    'settings.themeDark':  '🌙 Koyu',
    'settings.lang':       'Dil',
    'settings.version':    'Sürüm',
    'settings.firebase':   'Firebase Bağlantısı',
    'settings.fbConnected':'✅ Bağlı',
    'settings.fbOffline':  '⚠️ Bağlantı yok',
    'settings.sync':       '☁️ Veriyi Güncelle',

    // ── Versiyon ────────────────────────────────────────────────
    'footer.version':      'v{ver} / {date}',
    'footer.copy':         'Gizli ve Şirkete Özel',

    // ── Hata mesajları ──────────────────────────────────────────
    'err.permission':      'Bu işlem için yetkiniz yok.',
    'err.notFound':        'Kayıt bulunamadı.',
    'err.network':         'Bağlantı hatası. Lütfen tekrar deneyin.',
    'err.unknown':         'Bilinmeyen hata oluştu.',
    'err.required':        'Bu alan zorunludur.',
    'err.xlsxMissing':     'XLSX kütüphanesi yüklenmedi.',

    // ── Onay mesajları ──────────────────────────────────────────
    'confirm.delete':      '"{label}" silinecek. Onaylıyor musunuz?',
    'confirm.logout':      'Çıkış yapmak istediğinizden emin misiniz?',
    'confirm.suspend':     '"{name}" kullanıcısı askıya alınsın mı?',

    // ── Lojistik / Beklenen Teslimatlar (V185 / B4) ────────────
    'ed.toast.notFound':              'Kayıt bulunamadı',
    'ed.toast.updated':               'Kayıt güncellendi',
    'ed.toast.deleted':               'Kayıt silindi',
    'ed.toast.deleteFailed':          'Silme başarısız',
    'ed.toast.uploadFailed':          'Yükleme başarısız: {err}',
    'ed.toast.fileTooLarge':          'Dosya 20MB limitini aşıyor',
    'ed.toast.fileUploaded':          'Belge yüklendi',
    'ed.toast.noFiles':               'Bu kayda ek dosya yok',
    'ed.toast.urlEmpty':              'URL boş',
    'ed.toast.applyFailed':           'Uygulanamadı',
    'ed.toast.assignSaved':           'Atama kaydedildi',
    'ed.toast.statusUpdated':         'Durum güncellendi: {label}',
    'ed.toast.statusBackwardBlocked': 'Geriye dönüş için admin yetkisi gerekli',
    'ed.toast.productRequired':       'Ürün adı zorunlu',
    'ed.toast.supplierRequired':      'Tedarikçi zorunlu',
    'ed.toast.qtyPositive':           'Miktar > 0 olmalı',
    'ed.toast.permissionDenied':      'Bu işlem için yetkiniz yok',
    /* V191c2 — Arşiv feature */
    'ed.actionMenu.archive':          '📦 Arşivle',
    'ed.actionMenu.unarchive':        '📤 Aktif Listeye Al',
    'ed.toolbar.viewArchive':         '📦 Arşiv ({n})',
    'ed.toolbar.viewActive':          '📥 Aktif Liste',
    'ed.title.archived':              'Arşivlenmiş Teslimatlar',
    'ed.toast.archived':              'Arşive alındı',
    'ed.toast.unarchived':            'Aktif listeye alındı',
    'ed.toast.archiveFailed':         'Arşivleme başarısız',
    'ed.toast.unarchiveFailed':       'Geri alma başarısız',
    'ed.confirm.archive':             'Bu kaydı arşivlemek istediğinizden emin misiniz? Aktif listeden kalkacak, ama silinmeyecek.',
    'ed.confirm.unarchive':           'Bu kaydı aktif listeye geri almak istediğinizden emin misiniz?',
    'ed.toast.adminOnly':             'Yalnızca admin',
    'ed.toast.adminApproveOnly':      'Sadece admin onaylayabilir',
    'ed.toast.adminRejectOnly':       'Sadece admin reddedebilir',
    'ed.toast.deleteRequestSent':     'Silme talebi admin onayına gönderildi',
    'ed.toast.editRequestSent':       'Düzenleme talebi admin onayına gönderildi',
    'ed.toast.requestApproved':       'Talep onaylandı',
    'ed.toast.requestRejected':       'Talep reddedildi',
    'ed.toast.requestNotFound':       'Talep bulunamadı',
    'ed.toast.requestAlreadyReviewed':'Talep zaten incelenmiş',
    'ed.toast.selfApproveBlocked':    'Kendi gönderdiğiniz talebi onaylayamazsınız',
    'ed.toast.dedupBlocked':          'Bu kayıt için zaten bekleyen {action} talebi var',
    'ed.toast.storageMissing':        'Storage helper bulunamadı',
    'ed.toast.confirmModalMissing':   'confirmModal bulunamadı',
    'ed.toast.detaySaved':            'İhracat detayı kaydedildi',
    'ed.toast.missingFields':         'Eksik: {fields}',
    'ed.toast.oldRecordRoute':        'Eski kayıt — rota bilgisi ekleyin',
    'ed.toast.invalidQty':            'Geçersiz miktar',
    'ed.toast.deliveryAdded':         'Teslimat eklendi',
    'ed.toast.addError':              'Ekleme hatası',
    'ed.toast.deliveryCreated':       'Yeni teslimat oluşturuldu',
    'ed.toast.genericError':          'Hata',
    'ed.toast.selectNewResponsible':  'Yeni sorumlu seçin',
    'ed.toast.responsibleChanged':    'Sorumlu değiştirildi',
    'ed.toast.delaySaved':            'Gecikme bilgisi kaydedildi',
    'ed.toast.autoMode':              'AUTO_MODE aktif — manuel giriş için admin yetki gerekli',
    'ed.toast.priorityUpdated':       'Öncelik güncellendi',

    // ── Wizard Chrome (V186 — V185 / B4-r3) ─────────────────────
    'ed.wizard.title.create':         '➕ Yeni Teslimat',
    'ed.wizard.title.edit':           '✏ Teslimatı Düzenle',
    'ed.wizard.step.1':               'Temel Bilgiler',
    'ed.wizard.step.2':               'Rota & Lojistik',
    'ed.wizard.step.3':               'İhracat & Sorumluluk',
    'ed.wizard.step.4':               'Belge & Özet',
    'ed.wizard.btn.cancel':           'İptal',
    'ed.wizard.btn.prev':             '◀ Önceki',
    'ed.wizard.btn.next':             'Sonraki ▶',
    'ed.wizard.btn.save':             '✓ Kaydet',
    'ed.wizard.btn.close':            'Kapat',
    'ed.wizard.stepProgress':         'Step {n} / 4',
    'ed.wizard.banner.asistan':       'Yönetici Asistanı modu — İhracat ID, Sipariş Kodu, Sorumlu ve Renk alanlarını düzenleyemezsiniz (sadece görüntüleme).',
    'ed.wizard.banner.readonly':      'Salt okunur — düzenleme yetkiniz yok.',

    // ── Wizard Form Etiketleri (V186 — V185 / B4-r4) ─────────────
    'ed.label.productName':           'Ürün Adı *',
    'ed.label.supplier':              'Tedarikçi *',
    'ed.label.quantity':              'Miktar *',
    'ed.label.unit':                  'Birim',
    'ed.label.weightKg':              'Ağırlık (kg)',
    'ed.label.volumeM3':              'Hacim (m³)',
    'ed.label.proformaDate':          'Proforma Tarihi',
    'ed.label.proformaId':            'Proforma ID',
    'ed.label.estimatedDeliveryDate': 'Tahmini Teslim *',
    'ed.label.deliveryTermDays':      'Termin (gün)',
    'ed.label.toleranceDays':         'Tolerans (gün)',
    'ed.label.yon':                   'Yön',
    'ed.label.originCity':            'Çıkış Şehir *',
    'ed.label.originDistrict':        'Çıkış Bölge *',
    'ed.label.destinationCity':       'Varış Şehir *',
    'ed.label.destinationDistrict':   'Varış Bölge *',
    'ed.label.yuklemeFirma':          'Yükleme Firma',
    'ed.label.teslimTipi':            'Teslimat Yapan',
    'ed.label.paketTuru':             'Paket Türü',
    'ed.label.paketAdedi':            'Paket Adedi',
    'ed.label.paketEbatlari':         'Paket Ebatları',
    'ed.label.konteynerNo':           'Konteyner No',
    'ed.label.containerSequenceNo':   'Sıra No (yükleme)',
    'ed.label.loadingPriority':       'Yükleme Önceliği',
    'ed.label.armator':               'Armatör',
    'ed.label.trackingUrl':           'Tracking URL',
    'ed.label.varisZamani':           'Varış Zamanı',
    'ed.label.ihracatId':             'İhracat ID',
    'ed.label.siparisKodu':           'Sipariş Kodu',
    'ed.label.renk':                  'Renk',
    'ed.label.responsibleUser':       'Sorumlu *',
    'ed.label.teklifOnaylayan':       'Teklif Onaylayan',
    'ed.label.teklifOnayTarihi':      'Teklif Onay Tarihi',
    'ed.label.avansOdemeTarihi':      'Avans Ödeme Tarihi',
    'ed.label.satinAlmaSorumlusu':    'Satınalma Sorumlusu',
    'ed.label.priority':              'Öncelik',
    'ed.label.status':                'Durum',
    'ed.label.belgeUrl':              'Belge / Sözleşme PDF',
    /* V187c — handlingFlags ENUM ARRAY (string yok, virgül yok, küçük yazım farkı yok) */
    'ed.label.handlingFlags':         'Taşıma Uyarıları',
    'ed.handling.dangerous':          '🔥 Tehlikeli',
    'ed.handling.fragile':            '⚠ Kırılgan',
    'ed.handling.keepUpright':        '⬆ Dik tut',
    'ed.handling.liquidLeakRisk':     '💧 Sızdırma riski',
    'ed.handling.odor':               '👃 Kokulu',
    'ed.handling.perishable':         '🥗 Bozulabilir',
    'ed.handling.refrigerated':       '🧊 Soğutmalı',
    /* V191e — İstif uyarıları */
    'ed.handling.nonStackable':       '🚫📦 İstiflenemez',
    'ed.handling.topLoadOnly':        '⬆️📦 En üste konmalı',
    'ed.handling.doNotStackOnTop':    '⛔⬆️ Üstüne ürün konamaz',
    'ed.sect.cikis':                  'Çıkış Lokasyonu',
    'ed.sect.varis':                  'Varış Lokasyonu',
    'ed.sect.trIci':                  'Türkiye içi',
    'ed.sect.yuklemeTeslim':          'Yükleme & Teslim',
    'ed.sect.paket':                  'Paket Bilgisi',
    'ed.sect.sevkiyat':               'Sevkiyat & Takip',
    'ed.sect.ihracatSiparis':         'İhracat / Sipariş',
    'ed.sect.sorumluluk':             'Sorumluluk',
    'ed.sect.durumOncelik':           'Durum & Öncelik',
    'ed.sect.belge':                  'Belge / Sözleşme',
    'ed.sect.ozet':                   'Özet — Tüm Bilgiler',
    'ed.sect.temel':                  'Temel',
    'ed.sect.rotaLojistik':           'Rota & Lojistik',
    'ed.sect.ihracatSorumluluk':      'İhracat & Sorumluluk',

    // ── Wizard Seçenek Metinleri (V185 / B4-r5) ──────────────────
    'ed.color.kirmizi':       'Kırmızı',
    'ed.color.turuncu':       'Turuncu',
    'ed.color.sari':          'Sarı',
    'ed.color.yesil':         'Yeşil',
    'ed.color.mint':          'Mint',
    'ed.color.cyan':          'Cyan',
    'ed.color.mavi':          'Mavi',
    'ed.color.mor':           'Mor',
    'ed.color.pembe':         'Pembe',
    'ed.color.kahve':         'Kahve',
    'ed.color.siyah':         'Siyah',
    'ed.pkg.empty':           '— Seç —',
    'ed.pkg.palet':           'Palet',
    'ed.pkg.koli':            'Koli',
    'ed.pkg.bigBag':          'Big Bag',
    'ed.pkg.kafes':           'Kafes/Kasa',
    'ed.pkg.cuval':           'Çuval',
    'ed.pkg.dokme':           'Dökme',
    'ed.pkg.diger':           'Diğer',
    'ed.yon.giden':           '📤 Giden',
    'ed.yon.gelen':           '📥 Gelen',
    'ed.teslim.empty':        '— Belirtilmedi —',
    'ed.teslim.satici':       '📦 Satıcı teslim eder',
    'ed.teslim.firma':        '🏭 Firma alır',
    'ed.teslim.short.satici': '📦 Satıcı',
    'ed.teslim.short.firma':  '🏭 Firma',
    /* V188b — Teslimat Yapan 4 enum (eski satici/firma mapping ile korunur) */
    'ed.teslim.musteri':       '👤 Müşteri',
    'ed.teslim.tedarikci':     '🏢 Tedarikçi',
    'ed.teslim.nakliyeci':     '🚚 Nakliyeci',
    'ed.teslim.depo':          '🏭 Depo',
    'ed.teslim.short.musteri':    '👤 Müşteri',
    'ed.teslim.short.tedarikci':  '🏢 Tedarikçi',
    'ed.teslim.short.nakliyeci':  '🚚 Nakliyeci',
    'ed.teslim.short.depo':       '🏭 Depo',
    'ed.priority.low':        'Düşük',
    'ed.priority.normal':     'Normal',
    'ed.priority.critical':   'Kritik',
    'ed.loadingPri.empty':    '— Belirtilmedi —',
    'ed.loadingPri.required': '⭐ Zorunlu',
    'ed.loadingPri.optional': '○ Opsiyonel',
    'ed.armator.empty':       '— Seçin —',
    'ed.responsible.empty':   '— Sorumlu —',
    'ed.status.SIPARIS_ASAMASINDA':   'Sipariş Aşamasında',
    'ed.status.TEDARIK_ASAMASINDA':   'Tedarik',
    'ed.status.URETIMDE':             'Üretimde',
    'ed.status.SATICIDA_HAZIR':       'Satıcıda Hazır',
    'ed.status.YUKLEME_NOKTASINDA':   'Yükleme Noktasında',
    'ed.status.YUKLEME_PLANLANDI':    'Yükleme Planlandı',
    'ed.status.YUKLEME_BEKLIYOR':     'Yükleme Bekliyor',
    'ed.status.SEVK_EDILDI':          'Sevk Edildi',
    'ed.status.YOLDA':                'Yolda',
    'ed.status.GUMRUKTE':             'Gümrükte',
    'ed.status.DEPODA':               'Depoda',
    'ed.status.TESLIM_ALINDI':        'Teslim Alındı',
    'ed.status.KONTEYNIRA_YUKLENDI':  'Konteynıra Yüklendi',
    'ed.status.MUSTERI_TESLIM_ALDI':  'Müşteri Teslim Aldı',
    'ed.status.GECIKTI':              'Gecikti',

    // ── Panel + Modal Başlıkları (V185 / B4-r6) ──────────────────
    'ed.panel.title':                 'Teslimat Takibi',
    'ed.pending.title':               'Onay Bekleyen Talepler',
    'ed.detay.title':                 'İhracat Detayı',
    'ed.detay.title.readonly':        'İhracat Detayı (Salt Okunur)',
    'ed.detay.section.konteyner':     'Konteyner Bilgisi',
    'ed.detay.section.tasiyici':      'Taşıyıcı / Hat',
    'ed.detay.section.liman':         'Liman / Rota',
    /* V191d — Evrak + Müşteri Kargo */
    'ed.detay.section.evrak':                 'Evrak Durumu + Müşteri Kargo',
    'ed.detay.evrakDurumu':                   'Evrak Durumu',
    'ed.detay.evrakDurumu.HAZIRLANIYOR':      'Hazırlanıyor',
    'ed.detay.evrakDurumu.MUSTERIYE_KARGOLANDI': 'Müşteriye Kargolandı',
    'ed.detay.evrakDurumu.TESLIM_EDILDI':     'Teslim Edildi',
    'ed.detay.evrakDurumu.EKSIK_EVRAK':       'Eksik Evrak',
    'ed.detay.kargoFirmasi':                  'Kargo Firması',
    'ed.detay.kargoTakipNo':                  'Kargo Takip No',
    'ed.detay.kargoTakipLink':                'Kargo Takip Linki',
    'ed.toast.kargoZorunlu':                  'Müşteriye Kargolandı seçildiğinde Kargo Firması ve Kargo Takip No zorunludur',
    'ed.alarm.evrak15Gun':                    '🔴 Liman varışına {n} gün kaldı. Evrakların acilen kargolanması gerekir.',
    'ed.wrap.ihracatBilgi':           'İhracat Bilgileri',
    'ed.modal.edit':                  'Kayıt Düzenle',
    'ed.modal.onayLabel':             'Onay & Satınalma',
    'ed.modal.sorumluDegistir':       'Sorumlu Değiştir',
    'ed.modal.ata':                   'İhracat / Sipariş / Renk Ata',

    'ed.actionLabel.delete':          'silme',
    'ed.actionLabel.update':          'güncelleme',

    // ── Lojistik Panel Kartları (V187f) ──────────────────────────
    'loj.card.loadingPriority':           'Yükleme Önceliği',
    'loj.card.loadingPriority.sub':       'Zorunlu / Opsiyonel',
    'loj.card.handlingFlags':             'Taşıma Uyarıları',
    'loj.card.handlingFlags.sub':         'En çok kullanılan',
    'loj.card.geciken':                   'Geciken',
    'loj.card.geciken.sub':               'ETA geçen aktif kayıt',
    'loj.card.oncelikliBekleyen':         'Öncelikli Bekleyen',
    'loj.card.oncelikliBekleyen.sub':     'Zorunlu, henüz yüklenmedi',

    // ── Export Center (V187g) ────────────────────────────────────
    'ed.toolbar.pdf':                     '📄 PDF',
    'ed.toast.pdfGenerating':             'PDF oluşturuluyor…',
    'ed.toast.pdfMissing':                'PDF kütüphanesi yüklenemedi',
    'ed.export.pdf.filename':             'Beklenen-Teslimatlar',

    // ── Export Center — Excel (V187h) ────────────────────────────
    'ed.toolbar.xlsx':                    '📊 Excel',
    'ed.toast.xlsxGenerating':            'Excel oluşturuluyor…',
    'ed.toast.xlsxMissing':               'Excel kütüphanesi yüklenemedi',
    'ed.export.xlsx.filename':            'Beklenen-Teslimatlar',
    'ed.export.xlsx.sheetName':           'Teslimatlar',

    // ── Export Center — JSON (V187i) ─────────────────────────────
    'ed.toolbar.json':                    '📋 JSON',
    'ed.toast.jsonGenerating':            'JSON indiriliyor…',
    'ed.export.json.filename':            'Beklenen-Teslimatlar',

    // ── Toolbar Sayım (V187j) ────────────────────────────────────
    'ed.toolbar.records.filtered':        '{total} kayıt ({filtered} görünür)',

    // ── Sevkiyat Wizard (V188a — V186 Step 2 ayrımı) ─────────────
    'ed.sevkiyat.wizard.title':           '🚛 Sevkiyat Bilgisi',
    'ed.actionMenu.sevkiyat':             '🚛 Sevkiyat Bilgisi',
    'ed.toast.sevkiyatSaved':             'Sevkiyat bilgisi kaydedildi',
    'ed.toast.sevkiyatNotFound':          'Kayıt bulunamadı',
    'ed.sect.yuklemeDetay':               'Yükleme Detayı',
  },

  // ─────────────────────────────────────────────────────────────
  en: {
    // ── General ────────────────────────────────────────────────
    'app.name':            'Duay Global LLC',
    'app.tagline':         'Operations Platform',
    'app.description':     'Procurement, Supply Chain & Operations Management',
    'btn.save':            'Save',
    'btn.cancel':          'Cancel',
    'btn.delete':          'Delete',
    'btn.edit':            'Edit',
    'btn.add':             'Add',
    'btn.close':           'Close',
    'btn.export':          '📥 Excel',
    'btn.approve':         '✓ Approve',
    'btn.reject':          '✕ Reject',
    'btn.logout':          'Sign Out',
    'btn.search':          'Search',
    'lbl.all':             'All',
    'lbl.loading':         'Loading…',
    'lbl.noData':          'No records found.',
    'lbl.yes':             'Yes',
    'lbl.no':              'No',

    // ── Login ──────────────────────────────────────────────────
    'login.title':         'Sign In',
    'login.subtitle':      'Access your account',
    'login.email':         'EMAIL',
    'login.password':      'PASSWORD',
    'login.btn':           'Sign In',
    'login.loading':       'Signing in…',
    'login.err.empty':     'Email and password are required.',
    'login.err.invalid':   'Incorrect email or password.',
    'login.err.disabled':  'Your account has been suspended.',
    'login.err.network':   'Network connection error.',
    'login.err.tooMany':   'Too many attempts. Please wait.',
    'login.theme':         '🌙 Theme',
    'login.reset':         'Reset Data',
    'login.version':       'Platform version',

    // ── Navigation ─────────────────────────────────────────────
    'nav.dashboard':       'Dashboard',
    'nav.pusula':          'Task Tracker',
    'nav.takvim':          'Calendar',
    'nav.kargo':           'Cargo',
    'nav.pirim':           'Bonus',
    'nav.crm':             'Customers',
    'nav.stok':            'Inventory',
    'nav.ik':              'HR / Staff',
    'nav.notes':           'Notes',
    'nav.rehber':          'Directory',
    'nav.settings':        'Settings',
    'nav.search':          'Search (Ctrl+K)',
    'nav.notifications':   'Notifications',

    // ── Navigation — Group Headers ──────────────────────────────
    'nav.group.genel':     'GENERAL',
    'nav.group.tasks':     'TASKS & PROJECTS',
    'nav.group.lojistik':  'LOGISTICS & INVENTORY',
    'nav.group.finans':    'FINANCE',
    'nav.group.hr':        'HUMAN RESOURCES',
    'nav.group.yonetim':   'MANAGEMENT',

    // ── Navigation — Full Menu Labels ──────────────────────────
    'nav.announce':        'Announcements',
    'nav.hedefler':        'Goals',
    'nav.crm':             'CRM / Customers',
    'nav.stok':            'Inventory',
    'nav.pirim':           'Bonus',
    'nav.odemeler':        'Payments',
    'nav.puantaj':         'Attendance',
    'nav.izin':            'Leave Mgmt',
    'nav.kpi':             'KPI / Performance',
    'nav.admin':           'User Management',

    // ── Dashboard ──────────────────────────────────────────────
    'dashboard.title':     'Dashboard',
    'dashboard.subtitle':  'Overview',
    'dashboard.welcome':   'Hello, {name} 👋',

    // ── Cargo ──────────────────────────────────────────────────
    'kargo.title':         'Cargo Management',
    'kargo.subtitle':      'Inbound & outbound shipments',
    'kargo.add':           '+ Add Cargo',
    'kargo.total':         'Total',
    'kargo.incoming':      'Inbound',
    'kargo.outgoing':      'Outbound',
    'kargo.pending':       'Pending',
    'kargo.delivered':     'Delivered',
    'kargo.status.bekle':  '⏳ Pending',
    'kargo.status.yolda':  '🚛 In Transit',
    'kargo.status.teslim': '✅ Delivered',
    'kargo.status.iade':   '↩️ Returned',
    'kargo.dir.gelen':     '📥 Inbound',
    'kargo.dir.giden':     '📤 Outbound',
    'kargo.col.dir':       'Direction',
    'kargo.col.from':      'Sender',
    'kargo.col.to':        'Recipient',
    'kargo.col.firm':      'Carrier',
    'kargo.col.date':      'Date',
    'kargo.col.status':    'Status',
    'kargo.col.staff':     'Staff',
    'kargo.col.action':    'Actions',
    'kargo.empty':         'No cargo records found.',
    'kargo.markDelivered': '✓ Delivered',
    'kargo.container':     '🚢 Container Tracking',
    'kargo.checkAll':      '🔄 Check All',
    'kargo.addContainer':  '+ Add Container',

    // ── Bonus ──────────────────────────────────────────────────
    'pirim.title':         'Bonus Management',
    'pirim.subtitle':      'Incentive & performance bonuses',
    'pirim.add':           '+ Add Bonus',
    'pirim.total':         'Total',
    'pirim.pending':       'Pending',
    'pirim.approved':      'Approved',
    'pirim.totalAmount':   'Approved Total',
    'pirim.status.pending': '⏳ Awaiting Approval',
    'pirim.status.approved':'✅ Approved',
    'pirim.status.rejected':'❌ Rejected',
    'pirim.status.paid':   '💸 Paid',
    'pirim.col.staff':     'Staff',
    'pirim.col.type':      'Type',
    'pirim.col.title':     'Title',
    'pirim.col.amount':    'Amount',
    'pirim.col.date':      'Date',
    'pirim.col.payDate':   'Payment Date',
    'pirim.col.status':    'Status',
    'pirim.markPaid':      '💸 Mark Paid',
    'pirim.empty':         'No bonus records found.',

    // ── Admin Panel ────────────────────────────────────────────
    'admin.title':         'User Management',
    'admin.addUser':       '+ Add User',
    'admin.col.name':      'Full Name',
    'admin.col.email':     'Email',
    'admin.col.role':      'Role',
    'admin.col.status':    'Status',
    'admin.col.modules':   'Module Access',
    'admin.col.action':    'Actions',
    'admin.role.admin':    '👑 Administrator',
    'admin.role.user':     '👤 User',
    'admin.status.active': '✅ Active',
    'admin.status.suspended': '⏸ Suspended',
    'admin.suspend':       'Suspend',
    'admin.activate':      'Activate',
    'admin.resetPwd':      '🔑 Reset Password',
    'admin.deleteUser':    '🗑 Delete User',

    // ── Log System ─────────────────────────────────────────────
    'log.title':           'Activity Log',
    'log.col.user':        'User',
    'log.col.action':      'Action',
    'log.col.ts':          'Date & Time',
    'log.col.module':      'Module',
    'log.empty':           'No log records.',

    // ── Suggestions ────────────────────────────────────────────
    'suggest.title':       'Feature Request',
    'suggest.placeholder': 'Describe your suggestion in detail…',
    'suggest.btn':         '📨 Submit',
    'suggest.sent':        'Your suggestion has been sent, thank you!',

    // ── Announcements ──────────────────────────────────────────
    'ann.title':           'Announcements',
    'ann.noNew':           'No new announcements 🎉',
    'ann.updateBanner':    '🆕 Update: {msg}',

    // ── Settings ───────────────────────────────────────────────
    'settings.title':      'Settings',
    'settings.theme':      'Theme',
    'settings.themeLight': '☀️ Light',
    'settings.themeDark':  '🌙 Dark',
    'settings.lang':       'Language',
    'settings.version':    'Version',
    'settings.firebase':   'Firebase Connection',
    'settings.fbConnected':'✅ Connected',
    'settings.fbOffline':  '⚠️ Offline',
    'settings.sync':       '☁️ Sync Data',

    // ── Version ────────────────────────────────────────────────
    'footer.version':      'v{ver} / {date}',
    'footer.copy':         'Confidential & Proprietary',

    // ── Errors ─────────────────────────────────────────────────
    'err.permission':      'You do not have permission for this action.',
    'err.notFound':        'Record not found.',
    'err.network':         'Connection error. Please try again.',
    'err.unknown':         'An unknown error occurred.',
    'err.required':        'This field is required.',
    'err.xlsxMissing':     'XLSX library not loaded.',

    // ── Confirm dialogs ────────────────────────────────────────
    'confirm.delete':      '"{label}" will be deleted. Are you sure?',
    'confirm.logout':      'Are you sure you want to sign out?',
    'confirm.suspend':     'Suspend user "{name}"?',

    // ── Logistics / Expected Deliveries (V185 / B4) ────────────
    'ed.toast.notFound':              'Record not found',
    'ed.toast.updated':               'Record updated',
    'ed.toast.deleted':               'Record deleted',
    'ed.toast.deleteFailed':          'Delete failed',
    'ed.toast.uploadFailed':          'Upload failed: {err}',
    'ed.toast.fileTooLarge':          'File exceeds 20MB limit',
    'ed.toast.fileUploaded':          'File uploaded',
    'ed.toast.noFiles':               'No attachments for this record',
    'ed.toast.urlEmpty':              'URL is empty',
    'ed.toast.applyFailed':           'Could not apply',
    'ed.toast.assignSaved':           'Assignment saved',
    'ed.toast.statusUpdated':         'Status updated: {label}',
    'ed.toast.statusBackwardBlocked': 'Admin permission required to revert status',
    'ed.toast.productRequired':       'Product name required',
    'ed.toast.supplierRequired':      'Supplier required',
    'ed.toast.qtyPositive':           'Quantity must be > 0',
    'ed.toast.permissionDenied':      'You do not have permission for this action',
    /* V191c2 — Archive feature */
    'ed.actionMenu.archive':          '📦 Archive',
    'ed.actionMenu.unarchive':        '📤 Restore to Active',
    'ed.toolbar.viewArchive':         '📦 Archive ({n})',
    'ed.toolbar.viewActive':          '📥 Active List',
    'ed.title.archived':              'Archived Deliveries',
    'ed.toast.archived':              'Archived',
    'ed.toast.unarchived':            'Restored to active list',
    'ed.toast.archiveFailed':         'Archive failed',
    'ed.toast.unarchiveFailed':       'Restore failed',
    'ed.confirm.archive':             'Are you sure you want to archive this record? It will be removed from the active list but not deleted.',
    'ed.confirm.unarchive':           'Are you sure you want to restore this record to the active list?',
    'ed.toast.adminOnly':             'Admin only',
    'ed.toast.adminApproveOnly':      'Only admin can approve',
    'ed.toast.adminRejectOnly':       'Only admin can reject',
    'ed.toast.deleteRequestSent':     'Delete request sent for admin approval',
    'ed.toast.editRequestSent':       'Edit request sent for admin approval',
    'ed.toast.requestApproved':       'Request approved',
    'ed.toast.requestRejected':       'Request rejected',
    'ed.toast.requestNotFound':       'Request not found',
    'ed.toast.requestAlreadyReviewed':'Request already reviewed',
    'ed.toast.selfApproveBlocked':    'You cannot approve your own request',
    'ed.toast.dedupBlocked':          'A pending {action} request already exists for this record',
    'ed.toast.storageMissing':        'Storage helper missing',
    'ed.toast.confirmModalMissing':   'confirmModal missing',
    'ed.toast.detaySaved':            'Export details saved',
    'ed.toast.missingFields':         'Missing: {fields}',
    'ed.toast.oldRecordRoute':        'Old record — please add route info',
    'ed.toast.invalidQty':            'Invalid quantity',
    'ed.toast.deliveryAdded':         'Delivery added',
    'ed.toast.addError':              'Add error',
    'ed.toast.deliveryCreated':       'New delivery created',
    'ed.toast.genericError':          'Error',
    'ed.toast.selectNewResponsible':  'Select new responsible',
    'ed.toast.responsibleChanged':    'Responsible changed',
    'ed.toast.delaySaved':            'Delay info saved',
    'ed.toast.autoMode':              'AUTO_MODE active — admin permission required for manual entry',
    'ed.toast.priorityUpdated':       'Priority updated',

    // ── Wizard Chrome (V186 — V185 / B4-r3) ─────────────────────
    'ed.wizard.title.create':         '➕ New Delivery',
    'ed.wizard.title.edit':           '✏ Edit Delivery',
    'ed.wizard.step.1':               'Basic Info',
    'ed.wizard.step.2':               'Route & Logistics',
    'ed.wizard.step.3':               'Export & Responsibility',
    'ed.wizard.step.4':               'Document & Summary',
    'ed.wizard.btn.cancel':           'Cancel',
    'ed.wizard.btn.prev':             '◀ Previous',
    'ed.wizard.btn.next':             'Next ▶',
    'ed.wizard.btn.save':             '✓ Save',
    'ed.wizard.btn.close':            'Close',
    'ed.wizard.stepProgress':         'Step {n} / 4',
    'ed.wizard.banner.asistan':       'Manager Assistant mode — you cannot edit Export ID, Order Code, Responsible or Color fields (read-only).',
    'ed.wizard.banner.readonly':      'Read-only — you do not have edit permission.',

    // ── Wizard Form Labels (V186 — V185 / B4-r4) ─────────────────
    'ed.label.productName':           'Product Name *',
    'ed.label.supplier':              'Supplier *',
    'ed.label.quantity':              'Quantity *',
    'ed.label.unit':                  'Unit',
    'ed.label.weightKg':              'Weight (kg)',
    'ed.label.volumeM3':              'Volume (m³)',
    'ed.label.proformaDate':          'Proforma Date',
    'ed.label.proformaId':            'Proforma ID',
    'ed.label.estimatedDeliveryDate': 'Estimated Delivery *',
    'ed.label.deliveryTermDays':      'Term (days)',
    'ed.label.toleranceDays':         'Tolerance (days)',
    'ed.label.yon':                   'Direction',
    'ed.label.originCity':            'Origin City *',
    'ed.label.originDistrict':        'Origin District *',
    'ed.label.destinationCity':       'Destination City *',
    'ed.label.destinationDistrict':   'Destination District *',
    'ed.label.yuklemeFirma':          'Loading Company',
    'ed.label.teslimTipi':            'Delivered By',
    'ed.label.paketTuru':             'Package Type',
    'ed.label.paketAdedi':            'Package Count',
    'ed.label.paketEbatlari':         'Package Dimensions',
    'ed.label.konteynerNo':           'Container No',
    'ed.label.containerSequenceNo':   'Loading Sequence #',
    'ed.label.loadingPriority':       'Loading Priority',
    'ed.label.armator':               'Carrier',
    'ed.label.trackingUrl':           'Tracking URL',
    'ed.label.varisZamani':           'Arrival Time',
    'ed.label.ihracatId':             'Export ID',
    'ed.label.siparisKodu':           'Order Code',
    'ed.label.renk':                  'Color',
    'ed.label.responsibleUser':       'Responsible *',
    'ed.label.teklifOnaylayan':       'Quote Approver',
    'ed.label.teklifOnayTarihi':      'Quote Approval Date',
    'ed.label.avansOdemeTarihi':      'Advance Payment Date',
    'ed.label.satinAlmaSorumlusu':    'Procurement Officer',
    'ed.label.priority':              'Priority',
    'ed.label.status':                'Status',
    'ed.label.belgeUrl':              'Document / Contract PDF',
    /* V187c — handlingFlags ENUM ARRAY (no string, no comma, no case variation) */
    'ed.label.handlingFlags':         'Handling Warnings',
    'ed.handling.dangerous':          '🔥 Dangerous',
    'ed.handling.fragile':            '⚠ Fragile',
    'ed.handling.keepUpright':        '⬆ Keep upright',
    'ed.handling.liquidLeakRisk':     '💧 Leak risk',
    'ed.handling.odor':               '👃 Odor',
    'ed.handling.perishable':         '🥗 Perishable',
    'ed.handling.refrigerated':       '🧊 Refrigerated',
    /* V191e — Stacking advisories */
    'ed.handling.nonStackable':       '🚫📦 Non-stackable',
    'ed.handling.topLoadOnly':        '⬆️📦 Top load only',
    'ed.handling.doNotStackOnTop':    '⛔⬆️ Do not stack on top',
    'ed.sect.cikis':                  'Origin Location',
    'ed.sect.varis':                  'Destination Location',
    'ed.sect.trIci':                  'Within Turkey',
    'ed.sect.yuklemeTeslim':          'Loading & Delivery',
    'ed.sect.paket':                  'Package Info',
    'ed.sect.sevkiyat':               'Shipment & Tracking',
    'ed.sect.ihracatSiparis':         'Export / Order',
    'ed.sect.sorumluluk':             'Responsibility',
    'ed.sect.durumOncelik':           'Status & Priority',
    'ed.sect.belge':                  'Document / Contract',
    'ed.sect.ozet':                   'Summary — All Info',
    'ed.sect.temel':                  'Basic',
    'ed.sect.rotaLojistik':           'Route & Logistics',
    'ed.sect.ihracatSorumluluk':      'Export & Responsibility',

    // ── Wizard Option Texts (V185 / B4-r5) ───────────────────────
    'ed.color.kirmizi':       'Red',
    'ed.color.turuncu':       'Orange',
    'ed.color.sari':          'Yellow',
    'ed.color.yesil':         'Green',
    'ed.color.mint':          'Mint',
    'ed.color.cyan':          'Cyan',
    'ed.color.mavi':          'Blue',
    'ed.color.mor':           'Purple',
    'ed.color.pembe':         'Pink',
    'ed.color.kahve':         'Brown',
    'ed.color.siyah':         'Black',
    'ed.pkg.empty':           '— Select —',
    'ed.pkg.palet':           'Pallet',
    'ed.pkg.koli':            'Box',
    'ed.pkg.bigBag':          'Big Bag',
    'ed.pkg.kafes':           'Cage/Crate',
    'ed.pkg.cuval':           'Sack',
    'ed.pkg.dokme':           'Bulk',
    'ed.pkg.diger':           'Other',
    'ed.yon.giden':           '📤 Outgoing',
    'ed.yon.gelen':           '📥 Incoming',
    'ed.teslim.empty':        '— Not specified —',
    'ed.teslim.satici':       '📦 Seller delivers',
    'ed.teslim.firma':        '🏭 Company picks up',
    'ed.teslim.short.satici': '📦 Seller',
    'ed.teslim.short.firma':  '🏭 Company',
    /* V188b — Delivered By 4 enum (legacy satici/firma kept for mapping) */
    'ed.teslim.musteri':       '👤 Customer',
    'ed.teslim.tedarikci':     '🏢 Supplier',
    'ed.teslim.nakliyeci':     '🚚 Carrier',
    'ed.teslim.depo':          '🏭 Warehouse',
    'ed.teslim.short.musteri':    '👤 Customer',
    'ed.teslim.short.tedarikci':  '🏢 Supplier',
    'ed.teslim.short.nakliyeci':  '🚚 Carrier',
    'ed.teslim.short.depo':       '🏭 Warehouse',
    'ed.priority.low':        'Low',
    'ed.priority.normal':     'Normal',
    'ed.priority.critical':   'Critical',
    'ed.loadingPri.empty':    '— Not specified —',
    'ed.loadingPri.required': '⭐ Required',
    'ed.loadingPri.optional': '○ Optional',
    'ed.armator.empty':       '— Select —',
    'ed.responsible.empty':   '— Responsible —',
    'ed.status.SIPARIS_ASAMASINDA':   'Order Phase',
    'ed.status.TEDARIK_ASAMASINDA':   'Procurement',
    'ed.status.URETIMDE':             'In Production',
    'ed.status.SATICIDA_HAZIR':       'Ready at Supplier',
    'ed.status.YUKLEME_NOKTASINDA':   'At Loading Point',
    'ed.status.YUKLEME_PLANLANDI':    'Loading Planned',
    'ed.status.YUKLEME_BEKLIYOR':     'Awaiting Loading',
    'ed.status.SEVK_EDILDI':          'Shipped',
    'ed.status.YOLDA':                'In Transit',
    'ed.status.GUMRUKTE':             'In Customs',
    'ed.status.DEPODA':               'In Warehouse',
    'ed.status.TESLIM_ALINDI':        'Delivered',
    'ed.status.KONTEYNIRA_YUKLENDI':  'Loaded to Container',
    'ed.status.MUSTERI_TESLIM_ALDI':  'Customer Received',
    'ed.status.GECIKTI':              'Delayed',

    // ── Panel + Modal Headers (V185 / B4-r6) ─────────────────────
    'ed.panel.title':                 'Delivery Tracking',
    'ed.pending.title':               'Pending Approval Requests',
    'ed.detay.title':                 'Export Details',
    'ed.detay.title.readonly':        'Export Details (Read-only)',
    'ed.detay.section.konteyner':     'Container Info',
    'ed.detay.section.tasiyici':      'Carrier / Line',
    'ed.detay.section.liman':         'Port / Route',
    /* V191d — Document Status + Customer Shipping */
    'ed.detay.section.evrak':                 'Document Status + Customer Shipping',
    'ed.detay.evrakDurumu':                   'Document Status',
    'ed.detay.evrakDurumu.HAZIRLANIYOR':      'Preparing',
    'ed.detay.evrakDurumu.MUSTERIYE_KARGOLANDI': 'Shipped to Customer',
    'ed.detay.evrakDurumu.TESLIM_EDILDI':     'Delivered',
    'ed.detay.evrakDurumu.EKSIK_EVRAK':       'Missing Documents',
    'ed.detay.kargoFirmasi':                  'Shipping Company',
    'ed.detay.kargoTakipNo':                  'Tracking Number',
    'ed.detay.kargoTakipLink':                'Tracking Link',
    'ed.toast.kargoZorunlu':                  'When Shipped to Customer is selected, Shipping Company and Tracking Number are required',
    'ed.alarm.evrak15Gun':                    '🔴 {n} days until port arrival. Documents must be shipped urgently.',
    'ed.wrap.ihracatBilgi':           'Export Info',
    'ed.modal.edit':                  'Edit Record',
    'ed.modal.onayLabel':             'Approval & Procurement',
    'ed.modal.sorumluDegistir':       'Change Responsible',
    'ed.modal.ata':                   'Assign Export / Order / Color',

    'ed.actionLabel.delete':          'delete',
    'ed.actionLabel.update':          'edit',

    // ── Logistics Panel Cards (V187f) ────────────────────────────
    'loj.card.loadingPriority':           'Loading Priority',
    'loj.card.loadingPriority.sub':       'Required / Optional',
    'loj.card.handlingFlags':             'Handling Warnings',
    'loj.card.handlingFlags.sub':         'Most used',
    'loj.card.geciken':                   'Overdue',
    'loj.card.geciken.sub':               'Active records past ETA',
    'loj.card.oncelikliBekleyen':         'Priority Pending',
    'loj.card.oncelikliBekleyen.sub':     'Required, not yet loaded',

    // ── Export Center (V187g) ────────────────────────────────────
    'ed.toolbar.pdf':                     '📄 PDF',
    'ed.toast.pdfGenerating':             'Generating PDF…',
    'ed.toast.pdfMissing':                'PDF library not loaded',
    'ed.export.pdf.filename':             'Expected-Deliveries',

    // ── Export Center — Excel (V187h) ────────────────────────────
    'ed.toolbar.xlsx':                    '📊 Excel',
    'ed.toast.xlsxGenerating':            'Generating Excel…',
    'ed.toast.xlsxMissing':               'Excel library not loaded',
    'ed.export.xlsx.filename':            'Expected-Deliveries',
    'ed.export.xlsx.sheetName':           'Deliveries',

    // ── Export Center — JSON (V187i) ─────────────────────────────
    'ed.toolbar.json':                    '📋 JSON',
    'ed.toast.jsonGenerating':            'Downloading JSON…',
    'ed.export.json.filename':            'Expected-Deliveries',

    // ── Toolbar Records Count (V187j) ────────────────────────────
    'ed.toolbar.records.filtered':        '{total} records ({filtered} visible)',

    // ── Shipment Wizard (V188a — V186 Step 2 separation) ─────────
    'ed.sevkiyat.wizard.title':           '🚛 Shipment Info',
    'ed.actionMenu.sevkiyat':             '🚛 Shipment Info',
    'ed.toast.sevkiyatSaved':             'Shipment info saved',
    'ed.toast.sevkiyatNotFound':          'Record not found',
    'ed.sect.yuklemeDetay':               'Loading Details',
  },
};

// ── i18n Engine ──────────────────────────────────────────────────
const I18n = (() => {
  let _lang = 'tr';

  /**
   * Bir çeviri anahtarını mevcut dilde çözer.
   * Değişken desteği: t('confirm.delete', undefined, { label: 'Kargo' })
   * @param {string} key
   * @param {string} [lang]  Belirtilmezse aktif dil kullanılır
   * @param {Object} [vars]  {name: 'Ahmet'} gibi değişkenler
   * @returns {string}
   */
  function t(key, lang, vars) {
    const l   = lang || _lang;
    const map = TRANSLATIONS[l] || TRANSLATIONS.tr;
    let str   = map[key] || TRANSLATIONS.tr[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return str;
  }

  /**
   * Aktif dili değiştirir ve DOM'u günceller.
   * @param {string} lang 'tr' | 'en'
   */
  function setLang(lang) {
    if (!TRANSLATIONS[lang]) return;
    _lang = lang;
    try { localStorage.setItem('ak_lang', lang); } catch (e) { /* ignore */ }
    apply();
  }

  /**
   * Kaydedilen dili yükler.
   */
  function loadLang() {
    try {
      const saved = localStorage.getItem('ak_lang');
      if (saved && TRANSLATIONS[saved]) _lang = saved;
    } catch (e) { /* ignore */ }
    return _lang;
  }

  /**
   * DOM'daki data-i18n attribute'larını günceller.
   * Kullanım: <span data-i18n="nav.dashboard"></span>
   *           <input data-i18n-placeholder="btn.search">
   *           <button data-i18n-title="nav.notifications">
   */
  function apply() {
    // Metin içeriği
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // Placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    // Title (tooltip)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    // HTML içerik (güvenilir statik içerik için)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    // Dil butonlarını güncelle
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.langBtn === _lang);
    });
  }

  /**
   * Versiyon + tarih etiketini formatlar.
   * Anayasa Kural 1: "v[No] / YYYY-MM-DD SS:DD" formatı
   * @param {string} ver  '7.6'
   * @returns {string}    'v7.6 / 2026-03-19 14:32'
   */
  function formatVersion(ver) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return `v${ver} / ${date} ${time}`;
  }

  return { t, setLang, loadLang, apply, formatVersion, getLang: () => _lang };
})();

// ── Global erişim ─────────────────────────────────────────────────
window.I18n = I18n;
window.t    = I18n.t;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18n, TRANSLATIONS };
}
