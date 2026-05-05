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
    'ed.actionLabel.delete':          'silme',
    'ed.actionLabel.update':          'güncelleme',
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
    'ed.actionLabel.delete':          'delete',
    'ed.actionLabel.update':          'edit',
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
