/**
 * ════════════════════════════════════════════════════════════════
 * sw.js — Service Worker v1.0
 * Duay Global Trade Operasyon Platformu
 *
 * Strateji: Cache-First for statics, Network-First for API
 * ════════════════════════════════════════════════════════════════
 */

/* [CACHE-BUMP-2026-04-24-V22] Oturum sonu bump — 26 commit aktivasyon */
/* [CACHE-BUMP-2026-04-24-V23] SW fetch handler aktivasyon — SW-EXTERNAL-API-PASSTHROUGH-001 */
/* [CACHE-BUMP-2026-04-25-V24] PDF Harmonize + ORD kripto + Format D D1+D2 aktivasyon */
/* [CACHE-BUMP-2026-04-25-V25] Banka bilgisi para birimi otomatik (PI-BANKA-001) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V26] PI tek banka render (CLAUDE-KURAL-PI-001 madde 2) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V27] PI tarih DD MMM YYYY (CLAUDE-KURAL-PI-001 madde 1) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V28] PI ortak bilgi standardı (CLAUDE-KURAL-PI-001 madde 5) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V29] duayCode → duayKodu rename + migration (ALIS-001) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V30] PI %100 EN (CLAUDE-KURAL-PI-001 madde 3+4) aktivasyon */
/* [CACHE-BUMP-2026-04-25-V32] PI ön kontrol (madde 7) + ALIS-002 createdBy standardize aktivasyon */
/* [CACHE-BUMP-2026-04-25-V33] FİX-PI-A-001 Format A duplicate Terms + Banking ünvan EN aktivasyon */
/* [CACHE-BUMP-2026-04-25-V34] PI-001 sprint kapanış (8 madde TAMAM) */
/* [CACHE-BUMP-2026-04-25-V35] ALIS-003+004+005 + PUSULA-002+012 + SATIS-001+002+006+008+009 toplu */
/* [CACHE-BUMP-2026-04-26-V36] FIRMA-INFO paketi (001-007) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V37] PI-FIX paketi (001-005) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V38] PI-FIX-007 (header WA+Web) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V39] URUN-IMG-001 + ROLE-FIX-001 aktivasyon */
/* [CACHE-BUMP-2026-04-27-V40] LOJ-1A (expected_deliveries Sil butonu) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V41] LOJ-1B-A (expected_deliveries Düzenle modal) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V42] LOJ-1B-B (expected_deliveries Onay & Satınalma 4 alan) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V43] LOJ-1B-C1 (inline status combobox + DEPODA + statusHistory) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V44] MODAL-FIX-001 (autoFillKonteynUrl + 13 carrier) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V45] LOJ-1B-C2 (Sevkiyat & Takip 5 alan + auto-fill tracking URL) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V46] LOJ-1B-C3 (Tracking URL tek tıkla aç butonu) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V47] LOJ-1B-C4 (Belge PDF Storage upload) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V48] LOJ-1B-D (Gelen/Giden + filtre + arama bar) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V49] LOJ-1B-E (Aksiyon menüsünde Eke göz at) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V50] LOJ-FIX-001 (akıllı GECIKTI override) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V51] LOJ-FIX-002 (Sevkiyat Merkezi auto re-render) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V52] LOJ-1B-G (Sorumlu + ikon kolonları + tedarikçi fix) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V53] LOJ-1B-H (24h+ non-admin pending action) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V54] LOJ-1B-I (Admin onay UI: pending modal) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V55] SETTINGS-001 (Admin rol bilgi paneli + 4 çelişki) aktivasyon */
/* [CACHE-BUMP-2026-04-27-V56] LOJ-1B-F (pending approve/reject statusHistory audit) aktivasyon */
/* [CACHE-BUMP-2026-04-28-V75] PP-MODAL-CONDITIONAL-003 (Kredi + Diger placeholder, 8 TİP TAMAMLANDI) aktivasyon */
/* [CACHE-BUMP-2026-04-28-V76] SW-PRECACHE-AUTOSYNC-001 (PRECACHE_URLS otomatik senkron) aktivasyon */
/* [CACHE-BUMP-2026-04-28-V77] DEAD-CORE-CLEANUP-001 (7 dead file silindi + storage_audit taşındı) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V78] SYNC-EXPECTED-DELIVERIES-001 (Sevkiyat realtime sync aktive) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V79] SYNC-GAP-CLOSE-001 (6 SYNC_MAP eklenti + tatilAyarlar Firestore yazımı) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V80] SYNC-MODULE-MAPPING-FIX-001 (10 lazy mapping eksiği kapatıldı) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V81] SYNC-CACHE-INVALIDATE-FIX-001 (_memCache direkt invalidate) aktivasyon */
/* [CACHE-BUMP-2026-04-29-V82] WRITE-LOCAL-FOUNDATION-001 — _writeLocal fn aktivasyon */
/* [CACHE-BUMP-2026-04-29-V83] WRITE-REMOTE-FOUNDATION-001 — _writeRemote fn aktivasyon */
/* [CACHE-BUMP-2026-04-29-V84] CASH-FLOW-MODULE-001 — Nakit Akışı Manuel MVP modülü */
/* [CACHE-BUMP-2026-04-29-V85] LISTENER-WRITE-UNIFY-001 — listener _writeLocal entegrasyonu + _writingLock unify */
/* [CACHE-BUMP-2026-04-29-V86] NOMERGE-USERFILTER-FIX-001 — yetki-filtreli koleksiyonlar merge mode'a alındı */
/* [CACHE-BUMP-2026-04-29-V87] WRITE-REMOTE-MERGE-BY-ID-001 — _writeRemote merge by-id mantığı */
/* [CACHE-BUMP-2026-04-29-V88] STORE-CARI-MIGRATE-PILOT-001 — storeCari _writeRemote'a migrate (pilot) */
/* [CACHE-BUMP-2026-04-29-V89] STORE-MIGRATE-BATCH-A-001 — storeUrunler + storeSatinalma migrate */
/* [CACHE-BUMP-2026-04-29-V90] STORE-MIGRATE-BATCH-B-001 — storeAlisTeklifleri + storeSatisTeklifleri migrate */
/* [CACHE-BUMP-2026-04-29-V91] STORE-MIGRATE-APPEND-ONLY-001 — saveAct + storeNotifs + storeTaskChats migrate */
/* [CACHE-BUMP-2026-04-29-V92] CLEAN-NOTIFS-MIGRATE-001 — _cleanNotifications admin fn _writeRemote'a migrate */
/* [CACHE-BUMP-2026-04-29-V93] CARI-DISPLAY-FIX-001 — schema unify (unvan || ad || name) display helper */
/* [CACHE-BUMP-2026-04-29-V94] CARI-RESTORE-RESPECT-001 — _mergeDataSets restore-respect rule (cross-tab restore safe) */
/* [CACHE-BUMP-2026-04-29-V95] CASH-FLOW-MENU-FIX-001 — üst nav Muhasebe altmenüsüne Nakit Akışı Manuel item eklendi */
/* [CACHE-BUMP-2026-04-29-V96] DEMO-REMOVE-001 — Demo button + 3 demo fn (_insertDemoUrunler + _insertCariDemoData + _temizleDemoVeri) silindi */
/* [CACHE-BUMP-2026-04-29-V97] SATIS-EMOJI-NAV-001 — Satış teklifi ürün satırından Ürün Kataloğuna emoji navigation aktivasyon */
/* [CACHE-BUMP-2026-04-29-V98] SATIS-PI-DESIGN-CLEANUP-001 — 4 PI tasarımı silindi (C/I/L/O), 4 korundu (A/B/D1/D2) (T1: ae70269) */
/* [CACHE-BUMP-2026-04-29-V99] SATIS-FORM-GORSEL-FIX-001 — Satış teklifi form ürün satırı görsel render fix (u.gorsel || u.image fallback) (T1: ca7a193) */
/* [CACHE-BUMP-2026-04-29-V100] SATIS-PI-CONTENT-UNIFY-001 — D1/D2'ye CIF Insurance/Freight + image fallback (Strateji C) (T1: 3625e0c) */
/* [CACHE-BUMP-2026-04-29-V101] SATIS-PI-URUNLOOKUP-001 — _piUrunSatirlari'na master ürün lookup eklendi (D1 PDF görsel fix) (T1: 1db045a) */
/* [CACHE-BUMP-2026-04-30-V102] SATIS-PI-FALLBACK-001 — sartlar default + CIF/CIP/CFR otomatik Insurance/Freight (T1: 19ad962) */
/* [CACHE-BUMP-2026-04-30-V103] SATIS-FORM-PI-FIX-001 — incoterm load fix (CIF→EXW bug) + sartlar slice(0,5) kaldırıldı (T1: 6883d12) */
/* [CACHE-BUMP-2026-04-30-V104] SATIS-PI-PREVIEW-FIELDS-FIX-001 — _saV2TamOnIzle + _saV2SatisPDF teklif objesine eksik 5 field eklendi (Subtotal/Freight/Insurance/TOTAL 0 bug) (T1: 999a965) */
/* [CACHE-BUMP-2026-04-30-V105] SATIS-PI-FREIGHT-EXW-FIX-001 — EXW/FOB/FAS/FCA terms'lerde freight render kapatıldı (state'ten bağımsız defansif filtre) (T1: 1455eac) */
/* [CACHE-BUMP-2026-04-30-V106] SATIS-PI-PAYMENT-DEFAULT-FIX-001 — Modal'da girilmeyen ödeme PDF'te görünme bug'ı (dropdown empty placeholder + A/B hardcoded default kaldırıldı) (T1: 696ab07) */
/* [CACHE-BUMP-2026-04-30-V107] ALIS-FORM-URUN-GORSEL-FIX-001 — Alış teklifi düzenle açılışında ürün görseli kaybolma bug'ı (save fn'e gorsel field + düzenle fn'e 3-katmanlı master lookup fallback) (T1: f71dec0) */
/* [CACHE-BUMP-2026-04-30-V108] ALIS-FORM-PI-VALID-REV-CHANGELOG-001 — PI ID/Tarih zorunlu + revizyon altyapısı (parentId/revNo/changeLog) — Active PI Architecture temeli (T1: b92ea88) */
/* [CACHE-BUMP-2026-04-30-V109] ALIS-FORM-REV-LOCK-001 — Eski revizyon edit kilidi + archive flag (Active PI Architecture lock katmanı) (T1: 0078b37) */
/* [CACHE-BUMP-2026-04-30-V110] ALIS-FORM-REV-VIEWER-001 — Eski revizyon salt okunur viewer + 3-button kilit modal (Active PI Architecture viewer katmanı) (T1: e56d798) */
/* [CACHE-BUMP-2026-04-30-V111] SATIS-MODAL-PDF-FIX-001 — Modal ödeme alanı görünür + A/B PDF boş döküman fix (esc fn lokal scope, V106 yan etkisi düzelt) (T2-prev: b6cd92b) */
/* [CACHE-BUMP-2026-04-30-V112] SATIS-MODAL-UX-FIX-001 — Satış modalı 4 UX fix (kar virgül + ürün sıra no + scroll + üst artır tuşu) (T2-prev: 0bd3ddd) */
/* [CACHE-BUMP-2026-04-30-V113] SATIS-MODAL-WIDTH-DESIGN-001 — Modal %20 genişletme + 5 mikro tasarım iyileştirme (sticky header, hover states, transitions) (T2-prev: 86bc1b5) */
/* [CACHE-BUMP-2026-04-30-V114] SATIS-MODAL-COL-STICKY-FIX-001 — Sticky thead opak + ürün col %32 + 3 mikro tasarım (T2-prev: 500da05) */
/* [CACHE-BUMP-2026-04-30-V115] LOJISTIK-CLEANUP-001 — KEYS.navlunKarsi dead code temizlik (T2-prev: bc0ac64) NOT: cache bump atlandı, V115→V116 birleşik */
/* [CACHE-BUMP-2026-04-30-V116] LOJISTIK-SCHEMA-EXTEND-001 — eksik/hasar discrepancy log + konteynır kapasite helper (T2-prev: a233e5e) */
/* [CACHE-BUMP-2026-04-30-V117] SHIPMENT-DOC-SCHEMA-001 — Shipment Doc şema + util (Object.freeze sabitleri, BELGE_META, JSDoc) (T2-prev: 71e1768) */
/* [CACHE-BUMP-2026-05-01-V118] SHIPMENT-DOC-CREATE-001 — _shipmentDocCreate + _shipmentDocGet + _createEmptyDoc (idempotent + try/catch + toast) (T2-prev: c51b19a) */
/* [CACHE-BUMP-2026-05-01-V119] SHIPMENT-DOC-AUDIT-001 — _logHistory + _shipmentDocLog + _maskName (K05 audit + K14 PII, çift kayıt + dedup tuzağı önlendi + FIFO 100 + archivedCount) (T2-prev: 05aaf5b) */
/* [CACHE-BUMP-2026-05-01-V120] SHIPMENT-DOC-STATE-001 — STATE_TRANSITIONS matrix + _canTransition + _isFieldKritik + _suggestNextState + 5 public API (UI CTA/tooltip/dropdown altyapısı) (T2-prev: 2d80a79) */
/* [CACHE-BUMP-2026-05-01-V121] SHIPMENT-DOC-PROBE-001 — Manager-only DevTools probe (console.group + console.table, modal YOK, ED menüsünde "📦 Shipment Doc" buton) (T2-prev: 5721e5e) */
/* [CACHE-BUMP-2026-05-01-V122] SHIPMENT-DOC-UPDATE-001 — _shipmentDocUpdate ilk mutator (flat patch + diff + REVIEW state + pendingApprovals + audit STATE_CHANGE/UPDATE), K01 803/800 bilinçli aşım (V123 split ile çözülecek) (T2-prev: a4c7734) */
/* [CACHE-BUMP-2026-05-01-V123] SHIPMENT-DOC-PROBE-EXTRACT-001 — Probe fn ayrı dosyaya çıkarıldı (expected_deliveries_docs_probe.js, ~106 satır), docs.js 803→713 (K01 ≤800 ✓ borç KAPANDI), pure refactor 0 davranış değişikliği (T2-prev: 1edd997) */
/* [CACHE-BUMP-2026-05-01-V124] SHIPMENT-DOC-UPDATE-RETURN-FIX-001 — Saha testinde yakalanan hotfix: _shipmentDocUpdate noop early return'a unknownPaths field eklendi (Mikro tasarım 3 tutarlılığı), 720/800 (T2-prev: 3c22767) */
/* [CACHE-BUMP-2026-05-01-V125] SHIPMENT-DOC-UI-MINIMAL-001 — İLK GÖRÜNÜR ÖZELLİK: ED ⋯ → "📦 Belgeler" → modal aç (read-only: state badge + 9 belge slot + Yük/Paket/Yerleşim + History toggle), yeni dosya expected_deliveries_docs_ui.js (213 satır), probe → "🧪 Probe (DevTools)" rename (T2-prev: 523f09f) */
/* [CACHE-BUMP-2026-05-01-V126] SHIPMENT-DOC-UI-API-FIX-001 — Saha testinde yakalanan hotfix: ui.js'te _shipmentDocBelgeMeta + _shipmentDocKritikAlanlar getter fn olarak yanlış kullanılmıştı, _shipmentDocUtil namespace direkt frozen referansları geçildi (Object.keys(null) throw fix) (T2-prev: 6048d33) */
/* [CACHE-BUMP-2026-05-01-V127] SHIPMENT-DOC-LIST-PROGRESS-001 — ED kart sağ üst köşesinde belge progress badge: 📦 5/9 (state-aware: ONAYLI=✓, REVIEW=⚠, KAPALI=🔒), tıklayınca _shipmentDocUiOpen modal açar, ed.shipmentDoc yoksa görünmez (sessiz), V117 stateColor 4 katman reuse (T2-prev: 4d5e16c) */
/* [CACHE-BUMP-2026-05-01-V128] SHIPMENT-DOC-LIST-PROGRESS-FIX-001 — Saha testinde yakalanan hotfix: V125 _edRenderCard'a badge ekledi ama Lojistik Komuta Merkezi renderEdList kullanıyor (lojistik.js:170). renderEdList'in __ikonlar string'ine de _shipmentDocCardBadgeHtml append edildi (helper aynen reuse, kolon değişmedi) (T2-prev: b0daf61) */
/* [CACHE-BUMP-2026-05-01-V129] SHIPMENT-DOC-UI-EDIT-001 — Modal'da inline alan editing: 11 alan tıklanır → type-aware input (number/string/select/boolean), Enter/blur=save, Esc=cancel. Save: _shipmentDocUpdate (V122 mutator) çağrılır. Kritik alan + HAZIR/ONAYLI state → prompt() ile sebep istenir (REVIEW transition). KAPALI state = field disable + tooltip. Save sonrası modal partial re-render. (T2-prev: 6e994b5) */
/* [CACHE-BUMP-2026-05-01-V130] SHIPMENT-DOC-UPLOAD-001 — Belge slot dosya yükleme: 6 single-file slot tıklanır → file picker (accept .pdf,.jpg,.png), MIME + 10MB validation, base64 + _uploadBase64ToStorage (Firebase storage), slotMeta {url, filename, size, mime, uploadedAt, uploadedBy}, _shipmentDocUpdate (V122) ile sd.belgeler[slot] güncellenir, modal re-render. Multi slot V128'e ertelendi (TIR ortak belge). KAPALI guard 2 katman. (T2-prev: 2aa06e5) */
/* [CACHE-BUMP-2026-05-01-V131] SHIPMENT-DOC-MULTI-FILE-001 — Multi-file slot upload aktif: V127'de reject edilen 3 multi slot (soforFotos, yuklemeFotos, ekBelgeler) için file picker multiple attr, sıralı upload (for...of + await), per-file try/catch (1 fail diğerleri etkilenmez), successList + failList ile özet toast ("3 dosya yüklendi" veya "2 OK 1 fail: x.pdf"), array APPEND save (replace değil, mevcut korunur). Single slot V127 davranışı korundu (replace confirm + tek slotMeta). TIR ortak belge V129'a ertelendi (mimari karar). (T2-prev: 9775554) */
/* [CACHE-BUMP-2026-05-01-V132] SHIPMENT-DOC-TIR-SHARE-001 — TIR ortak belge: aynı yerlesim.konteynerNo'ya sahip ED'lerde belge paylaşımı. SHARED_SLOTS = [soforFotos, yuklemeFotos, ekBelgeler, nakliyeFatura]. Upload akışı: 1) Slot tıkla → file picker (V127/V128 davranış), 2) Files seçildi + SHARED slot + grup ED varsa → apply-modal göster (checkbox liste, default tümü checked), 3) Kullanıcı "Yükle" → seçili ED'lerin tümüne aynı slotMeta yazılır (uploadGroupId enjekte). Mimari M4 (Apply-on-upload) — storage tek dosya, N ED save, V117-V128 şema değişmedi. Helper'lar: _findGroupedEds (max 20), _genUploadGroupId, _showApplyModal, _saveToSingleEd, _saveToMultipleEds (per-ED try/catch). Toast multi-ED: "5 dosya × 4 ED'ye yüklendi". Konteyner boş ED → V128 davranış (single ED). KAPALI guard per-ED. (T2-prev: 1b2383d) */
/* [CACHE-BUMP-2026-05-01-V133] SHIPMENT-DOC-UI-EXTRACT-001 — V123 PROBE-EXTRACT pattern reuse: V129 TIR-share helper'ları (SHARED_SLOTS + 5 fn ~183 satır) ui.js'ten ayrı dosyaya çıkarıldı (expected_deliveries_docs_ui_apply.js). window._sdApply Object.freeze namespace ile expose edildi. ui.js 777→577 (K01 borç kapandı). PURE REFACTOR — sıfır davranış değişikliği. Defensive guards: window._sdApply varlık check + typeof fn check, fallback graceful. Yükleme sırası: docs.js → probe.js → apply.js → ui.js. (T2-prev: 85bd47b) */
/* [CACHE-BUMP-2026-05-01-V134] SHIPMENT-DOC-TIR-SHARE-BADGE-001 — Paylaşımlı belge badge: V129 uploadGroupId üzerinden runtime aggregate. apply.js'e _countSharedEds(slot, value) helper eklendi (Set ile uploadGroupId'leri topla, her ED'de aynı groupId varsa say, max döndür). ui.js slot grid render içine "🔗 N" mini badge (sağ üst köşe, top:4px right:6px, mavi pill #1976D2/#E3F2FD, pointer-events:none). Threshold count >= 2 (paylaşım var demek). Defensive: window._sdApply guard + try/catch. Pure display (V131 MVP, click davranışı yok). namespace 7 alan oldu (countSharedEds eklendi). (T2-prev: 7cb3b20) */
/* [CACHE-BUMP-2026-05-01-V135] SHIPMENT-DOC-DELETE-001 — Belge silme + 30sn undo (K06): apply.js'e _deleteFromSingleEd(edId, slot, multiIndex) + _undoDelete(edId, slot, snapshot) eklendi (V132 MVP: tüm slot null/array.filter, V132.1 hazırlığı multiIndex int için filter logic). Snapshot JSON deep copy ile undo restore. ui.js slot grid sol alt köşede 🗑 buton (filled + !isKapali, bottom:4px;left:6px, kırmızı #C62828, event.stopPropagation, _esc XSS guard). _shipmentDocUiDeleteSlot public API: confirmModal (K06 zorunlu) + _sdApply.deleteFromSingleEd + custom undo toast (position:fixed bottom:20px right:20px, z-index:10003, setInterval 1sn countdown + setTimeout 30sn auto-close, "↶ Geri al" buton sarı #FFB300). Geri al → _sdApply.undoDelete + V122 restore + modal re-render. window.__sdDeletePending global state (tek seferde tek toast, eski cleanup). namespace 9 alan oldu (deleteFromSingleEd + undoDelete eklendi). Audit log otomatik (V119 _logHistory _shipmentDocUpdate içinde). KAPALI ED'de buton görünmez (V127 isKapali pattern). (T2-prev: 0489285) */
/* [CACHE-BUMP-2026-05-01-V136] SHIPMENT-DOC-DELETE-CASCADE-001 — Paylaşımlı belge cascade silme: V129 _showApplyModal pattern reuse + V132 _shipmentDocUiDeleteSlot cascade-aware. apply.js'e 3 yeni helper: _findEdsWithSameGroupId(currentEdId, slot, uploadGroupId) max 20 ED tarama, _deleteFromMultipleEds(edIds, slot, multiIndex) per-ED loop snapshots[] dön, _showDeleteCascadeModal(...) checkbox liste modal (current ED disabled+checked zorunlu, diğerler default checked opt-out, "Vazgeç" gri / "🗑 Sil" kırmızı #C62828, backdrop z-index:10002). ui.js _shipmentDocUiDeleteSlot fn cascade detect + branch (uploadGroupId tespit + _findEdsWithSameGroupId 1+ ED dönerse modal, değilse V132 davranış). ui.js'e _shipmentDocUiShowUndoToast ortak helper (single + cascade reuse, multi-ED snapshots loop restoreSuccess sayım, "N ED'de geri alındı" / "X/N ED restore" kondisyonel toast). namespace 9 → 12 alan. K06 soft-delete + 30sn undo (V132 davranış preserved). (T2-prev: c321a82) */
/* [CACHE-BUMP-2026-05-01-V137] SHIPMENT-LIST-COLUMNS-001 — ED list konteyner sütunu (V133): expected_deliveries.js _edRenderCard içine V125 docBadge sonrası progress bar altına "🚛 KNTR-001" mavi mini chip insert (string concat pattern, conditional ed.konteynerNo varsa). Stil: #185FA5 text + #E6F1FB bg pill, ui-monospace font, tooltip "Konteyner / TIR". renderEdList (table) tarafında Ürün/Tedarikçi cell'inin 3. satırına aynı chip (mono font, bg yok, inline). _uiEsc card için + esc renderEdList için (XSS-KURAL-001). V125.1 dersi: card + table iki path da aynı cycle'da güncellendi. Conditional render: konteynerNo boşsa chip görünmez. K01: ed.js 2035 → 2040 (kümülatif +%0.2). KG/m³ + varisZamani + avansOdemeTarihi + ETA risk + ödeme durumu V133.1+'a ertelendi. (T2-prev: babdc67) */
/* [CACHE-BUMP-2026-05-01-V138] SHIPMENT-LIST-COLUMNS-002 — ED listesi mockup-sadık zenginleştirme: schema migration weightKg + volumeM3 + window._edCalculateContainers helper (20ft 33m³/28t, 40ft 67m³/26.5t, 4 seviye uyarı ✅/⚠️/🔴) + renderEdList table 11→13 sütun (Konteyner ayrı sütun sarı tint #FFF8E1, KG/m³ + uyarı ayrı sütun yeşil tint #E8F5E9, TIR grup tint #E3F2FD aynı konteynerNo'lu satırlar, V133 chip Ürün/Tedarikçi cell'inden kaldırıldı) + _edRenderCard KG/m³ chip yeşil pill (#0F6E56/#E1F5EE) + uyarı satırı renkli. _edEditSubmit her iki path'te (admin onay + direct save) weightKg/volumeM3 parseFloat||null kayıt. Wizard'a 2 yeni number input (decimal). Mockup'a sadakat: konteyner ayrı sütun pozisyon 4, KG/m³ pozisyon 7. Conditional render: weight+volume boşsa "—". K01: ed.js 2040 → 2082 (+42 satır, %260 ihlal). V134+ EXTRACT planlı. (T2-prev: cacae6e) */
/* [CACHE-BUMP-2026-05-01-V139] SHIPMENT-DOC-SLOT-VIEW-001 — Dolu slot tıklama view modal (kayıp belge bug fix): V127'de tüm slot tıklamaları file picker açıyordu (replace = veri kaybı riski, "kantar fişi yükledim kayboldu" hissi). Yeni davranış: KAPALI → onclick yok, filled → _shipmentDocUiSlotView modal aç, boş → _shipmentDocUiUploadFile (V127 davranış korundu). _shipmentDocUiSlotView fn (~98 satır): single slot 1 dosya 👁/+Değiştir/🗑Sil + multi slot N dosya listele 👁 başına + "+ Yeni Yükle" (V128 append) / "🗑 Tümünü Sil" (V132.1 cascade). Modal z-index 10004 (V124/V132.1 üstünde), _esc XSS guard (slotName/fname/fby/furl), backdrop click cleanup, defensive guards (typeof _shipmentDocGet check + meta fallback). Boş redirect: slotValue boşsa direkt upload (UX). K01 ihlal: ui.js 709 → 807 (+98 satır, +%0.9, 7 satır limit aşımı, V133.3 öncesi EXTRACT zorunlu). (T2-prev: e51cf5a) */
/* [CACHE-BUMP-2026-05-01-V140] SHIPMENT-DOC-UI-VIEW-EXTRACT-001 — V133.2.refactor: ui.js K01 borç kapatma. _shipmentDocUiSlotView (97 satır) yeni dosyaya taşındı: src/modules/expected_deliveries_docs_ui_view.js (123 satır, IIFE shell + 'use strict' + lokal _esc + fn body birebir). ui.js: 807 → 711 (K01 OK, marj 89 satır). index.html'e ui.js'den HEMEN sonra script tag eklendi. Pure refactor, davranış 0 değişiklik (V123 PROBE-EXTRACT, V130 UI-EXTRACT pattern reuse). Bağımlılık zinciri: docs.js → probe.js → apply.js → ui.js → ui_view.js. Yeni public API: aynı window._shipmentDocUiSlotView. (T2-prev: 714b659) */
/* [CACHE-BUMP-2026-05-01-V141] SHIPMENT-DOC-FIELDS-001 — V134: ED schema'ya 3 yeni alan (paketTuru/paketAdedi/paketEbatlari) Edit Modal'a "Paket Bilgisi" header altında eklendi. Save path'ler (admin payload + direct save) iki tarafta da kayıt. docs.js BELGE_META 9→10 slot: alisFatura yeni single slot (💰 icon, jpg/jpeg/pdf/png mime). saticiFatura + nakliyeFatura mime gevşetildi (artık jpg/jpeg/png da kabul, mobil fotoğraf desteği). _shipmentDocCreate boş schema init'inde alisFatura: null. K01 ed.js 2092/800 (zaten ihlal +0.5%), docs.js 723/800 (OK marj 77). DOKUNULMADI: V117-V133.2.refactor flow'lar, ed.shipmentDoc.paket.tip schema (V117). MANTIKSAL ÇAKIŞMA NOTU: ED root paketTuru ↔ ShipmentDoc paket.tip iki yer var; V134.1'de birleştirilecek. (T2-prev: b8f4a62) */
/* [CACHE-BUMP-2026-05-02-V142] SHIPMENT-DOC-UNIVERSAL-MIME-001 — V135: docs.js BELGE_META 6 slot mime gevşetildi (irsaliye/kantar/teslimImza ['pdf','jpg','png']→['pdf','jpg','jpeg','png']; soforFotos/yuklemeFotos ['jpg','png']→['pdf','jpg','jpeg','png'] foto+pdf taranan; ekBelgeler ['pdf','jpg','png','xlsx','docx']→['pdf','jpg','jpeg','png','xlsx','docx']). Mobil iPhone .jpeg uzantısı + ekran görüntüsü PNG her slotta kabul. DOKUNULMADI: imoForm ['pdf'] only (yasal zorunluluk), saticiFatura/nakliyeFatura/alisFatura V134'te zaten gevşetilmiş. K01 docs.js 723 (değişmez, sadece array genişledi). KX9 yeni anayasa kuralı kayıt: 700+ dosyaya feature ekleme YASAK — yeni dosya yarat. (T2-prev: df75e48) */
/* [CACHE-BUMP-2026-05-02-V143] SHIPMENT-DOC-SLOT-LABEL-FIX-001 — V136: ui_view.js L46 meta.name → meta.label bug fix. V133.2'den beri 3 cycle dolu slot view modal başlığı raw key gösteriyordu (yanlış: "saticiFatura", doğru: "Satıcı faturası"). BELGE_META gerçek field adı 'label' (V117'den beri), 'name' field YOK. V133.2 EDIT 2'de yeni dosya yarattığım için anchor view atladım — KX8 ihlali. DERS: Yeni dosya yaratırken bile referans veriyi (BELGE_META) anchor view ile doğrula. Net 0 satır (1 kelime swap). Etki: 9 slot label'ı doğru görünür. K01 ui_view.js 123/800 (değişmez). DOKUNULMADI: V117-V135 davranışları, BELGE_META schema. (T2-prev: 6552f26) */
/* [CACHE-BUMP-2026-05-02-V144] SHIPMENT-DOC-MODAL-IMPROVE-001 — V137: Modal main container max-width 760px → min(95vw, 1100px) (+%45 geniş ekran). Console buton admin-only ternary ile sarıldı (window._edIsAdmin && window._edIsAdmin() ? button : ''). End-user UX temizlendi (Console manager/dev için DevTools probe aracı, son kullanıcıya gereksizdi). 0 davranış kırılması: admin hala Console'a erişebilir, non-admin sadece 📜 Geçmiş + Kapat görür. K01 ui.js 711/800 (değişmez, inline ternary). KX9 N/A — UI iyileştirmesi, yeni feature değil. (T2-prev: c71228c) */
/* [CACHE-BUMP-2026-05-03-V152] SATIS-LIST-REV-TREE-001 — V152: Satis teklif listesinde ayni teklifId'ye sahip kayitlari parent-child hiyerarsi ile grupla (R01 = parent ustte, R02+ = child indented). app_patch.js:2152 renderSatisTeklifleri override edildi (yeni dosya satin_alma_v2_revize_render.js, 299 satir). Persistence/Firestore/data shape sifir degisiklik — sadece gorsel grouping. KX9 uyumu: app_patch.js (7475 satir) DOKUNULMAZ. KX8: item HTML deseni app_patch.js:2247-2335'ten birebir kopya + indent/toggle eklendi. (T2-prev: aaa657e) */
/* CACHE-BUMP-2026-05-03-V153 SATIS-PDF-ENHANCE-001 V153: 3 PDF formatinda banka blogu (Account Holder, Bank Name, Branch, IBAN, SWIFT/BIC), page-break-inside avoid, filename PI teklifId slug YYMMDD-HHMM optional Rev. window-open hijack pattern, 3 print fn override (yeni dosya satin_alma_v2_pdf_enhance.js, 310 satir). KX9: app_patch.js DOKUNULMAZ. T2-prev: 2c07048 */
/* CACHE-BUMP-2026-05-03-V154 SATIS-PDF-PREVIEW-PARITY-001 V154: Modal canli onizleme tasarimi PDF cikti tasarimi olarak kullanilir (tek sistem). PDF Format Sec modal A B C BYPASS, _printSatisTeklif override edilir, direkt _saV2OpenPdfV2 cagrilir. Onizleme HTML birebir kopya, A4 optimize (8px font 11px scale up, var degiskenler hardcoded HEX, img 24x24 42x42), V153 banka 5 alan blok ve page-break CSS yeniden kullanilir. Filename PI- prefix YOK: teklifId slug YYMMDD-HHMM optional Rev. Yeni dosya satin_alma_v2_pdf_v2.js, 323 satir. KX9: app_patch.js DOKUNULMAZ. T2-prev: f4d3898 */
/* CACHE-BUMP-2026-05-03-V155 SATIS-MODAL-BULK-FS-NEWTAB-001 V155: 3 ozellik. (1) Liste sayfasinda toplu silme: her satira checkbox + ust toolbar X Sil butonu, confirmModal onay, soft delete (isDeleted true). (2) Modal fullscreen: sag ust ⛶ ikon, toggle ile width 100vw, max-height 100vh, border-radius 0. (3) Modal yeni sekme: sag ust ↗ ikon, modal HTML kopyasi + sayfa CSS yeni window-open icine yazilir, sari uyari banner. KX9: app_patch.js ve satin_alma_v2_satis.js DOKUNULMAZ — DOM observer + render override pattern. Yeni dosya satin_alma_v2_bulk_fs_newtab.js, 354 satir. T2-prev: 861db2a */
/* CACHE-BUMP-2026-05-03-V156 SATIS-SARTLAR-UI-PDF-001 V156: 2 ana is. (1) Modal sartlar UI yenileme: _saV2SartListeGuncelle override, bordered card (numara monospace + metin + Duzenle ikon + Sil), inline edit modu (sari bg, Enter kaydet Esc iptal), hover effect, X 10 sayac baslik yaninda, bos durum mesaji. Mevcut 65 35 grid (sol sartlar, sag HAZIR MANUEL) korunur. (2) PDF sartlar section: V154 _saV2RenderPdfHtml override, banka blogundan ONCE Terms Conditions section inject, numarali liste ol, page-break-inside avoid. Yeni dosya satin_alma_v2_sartlar_ui_pdf.js, 226 satir. KX9: app_patch.js ve satin_alma_v2_satis.js DOKUNULMAZ. T2-prev: c8d3776 */
/* CACHE-BUMP-2026-05-03-V157 DUAY-META-CENTER-001 V157: Ortak veriler icin tek merkezi kaynak. window.DUAY_META (sirket meta unvan tel web), null-safe alias fn'ler: DUAY_BANKA cur, DUAY_KUR_GET cur, DUAY_TERMS, DUAY_PI_ADRES, DUAY_META_STATUS. Veri KOPYALAMAZ — mevcut master kaynaklara delegate (loadBankalar, _saKur, _saV2Sartlar, PI_ADRES). DUAY_KUR mevcut data, DUAY_KUR_GET yeni accessor — kafa karistirmaz. EDIT 4: pdf_v2.js header satiri minimal patch (DUAY_META fallback). Yeni dosya src core duay_meta.js, 187 satir. KX9: app_patch.js + master kaynak dosyalari DOKUNULMAZ. T2-prev: 5f03f82 */
/* CACHE-BUMP-2026-05-03-V158 DASHBOARD-IMPROVE-001 V158: Mevcut dashboard SIFIRDAN YAZILMADAN gelistirildi. 4 is: placeholder kaldir, Detay Gorunum buton kaldir routing bozuk, bos alert spam tutar 0 cari dash gizle, greeting time-aware emoji sabah ogle aksam. 5 mikro tasarim fix: kart hover, hover lift, tabular-nums, greeting emoji, subtle shadow. KX9 dashboard.js DOKUNULMAZ — window.renderDashboard wrap pattern + DOM mutate + MutationObserver fallback. V155 observer cakismasi yok modal hedefli. Yeni dosya dashboard_improve.js 258 satir. T2-prev: 21b7dc4 */
/* CACHE-BUMP-2026-05-03-V159 DASHBOARD-TODAY-ACTION-001 V159: Today's Action paneli — sistem-uretilen 5 madde (overdue offers 5+ gun, pending approvals 7+ gun, overdue payments vadesi gecmis, arriving shipments bugun, due payments 7 gun) + PusulaPro manuel gorevler max 5. Veri master fn'lerden delegate (loadSatisTeklifleri, loadAlisTeklifleri, loadTahsilat, loadKonteyner chain, loadOdemePlani, loadGorevler), KOPYA YOK. Liste UI: ikon + metin + sayi badge + tiklanabilir App.nav routing. Bos durum yesil onay mesaji. Idempotent v159-actions-wrap, periyodik 60sn refresh setInterval. KX9: dashboard.js + app_patch.js DOKUNULMAZ — window.renderDashboard wrap pattern. Yeni dosya dashboard_v2_actions.js 297 satir. T2-prev: f56e063 */
/* CACHE-BUMP-2026-05-03-V160 SATIN-ALMA-URUN-ARAMA-X-001 V160: Alis teklif modal'da urun arama 3 alan yerine 10 alan + multi-token AND. Aranan: urunAdi turkceAdi duayKodu saticiKodu tedarikci marka mensei birim gtip urunTeslimat. Turkce karakter normalize lowercase + accent strip. Multi-token AND her token herhangi bir alanda. Orijinal HTML korunur KX8 — DOM filter pattern, full HTML 5sn cache, master cross-reference loadUrunler 5sn cache. Esleşme yok mesaji. Debounce 150ms. KX9 form.js DOKUNULMAZ — _saV2UrunListHTML + _saV2UrunAra wrap. Yeni dosya satin_alma_v2_arama_x.js. T2-prev: 5a04754 */
/* CACHE-BUMP-2026-05-04-V163 V162-gelismis-arama (form.js _saV2UrunAdAra 7 -> 14 alan: turkceAdi, saticiKodu, marka, mensei, birim, gtip, urunTeslimat) ve V163 SATIN-ALMA-MODAL-TOPSIL-001 (sav2-form-modal urun satir toplu sil — checkbox + tumunu sec + Secilenleri Sil + confirmModal danger). V162 cache atlandigi icin bu bump V162+V163'u birlikte canliya getirir. V161/V161.1 reverted, atlandi. Yeni dosya satin_alma_v2_modal_topsil_x.js 233 satir. KX9 form.js V162 ozel istisna ile dokunuldu, V163'te dokunulmadi. T2-prev: b32a81c */
/* CACHE-BUMP-2026-05-04-V164 V164 SATIN-ALMA-MODAL-FS-NUM-001: sav2-form-modal Tam ekran (⛶ + body scroll kilit) + Yeni sekme (↗ about:blank) + Urun satir sira no badge ([1] [☑] format, V163 checkbox'tan once aynı 44px slot icinde flex). Strateji V163 deseni — _saV2YeniTeklif + _saV2UrunSatirEkle wrap, observer YOK, 5x100ms retry kendini kapatan. V163 toplu sil sonrasi renumber hook (350+800ms idempotent). KX9 form.js DOKUNULMADI. KX8 mevcut HTML kopyalanmadi. Yeni dosya satin_alma_v2_modal_fs_x.js 242 satir. T2-prev: 0434176 */
/* CACHE-BUMP-2026-05-04-V164b V164.b URUN-DB-MODAL-FS-NUM-001: mo-urun-db Tam ekran (⛶ + body scroll kilit) + Yeni sekme (↗ about:blank) + .udb-card sira no badge (siyah pill, kart sol ust absolute). Strateji V164 deseni — openUrunModal + _udbSatirEkle wrap. _udbSatirEkle closure-bound oldugu icin lazy-every-open pattern: her openUrunModal cagrisinda 50ms sonra wrap kontrol ve yeniden uygula (identity check + string marker). Observer YOK. KX9 urun_db.js DOKUNULMADI. KX8 mevcut HTML kopyalanmadi. Yeni dosya urun_db_modal_fs_x.js 230 satir. T2-prev: eed0d72 */
/* CACHE-BUMP-2026-05-04-V166 V166 SATIN-ALMA-LISTE-GRUP-001: Alis Teklifleri Listesi gruplama — ana teklif kartlari altinda alt urun satirlari default kapali, ana karta tikla expand/collapse. _saV2RenderMain + renderSatinAlmaV2 wrap, 5x150ms retry kendini durduran. Row bazli idempotent (dataset.v166Setup), ANA tespiti +N badge, HEADER tespiti includes('ÜRÜN /'), click handler defaultPrevented + ic button/input/select/textarea skip. localStorage YOK — her render default kapali. Yeni dosya satin_alma_v2_liste_grup_x.js 199 satir. T2-prev: a90ccb7 */
/* CACHE-BUMP-2026-05-04-V167 V167 PUSULA-PRO-SYNC-001: PusulaPro Abonelik/Odeme/Hayat Firestore sync. Tek document duay_tenant_default/pusula icinde field-level merge (abonelik, odemeler, hayat, _v167SyncedAt_<field>). data field (gorevler) DOKUNULMAZ. _ppAbonelikStore/Odeme/Hayat 3 store fn wrap + 3 load fn wrap. _isSame sira+key bagimsiz (id sort + stableStringify). _tsMs new Date().getTime() ms karsilastirma. _initialSyncUp guvenli kosul (snap.exists && Array.isArray). Per-field debounce 300ms spam koruma. _fsPath('pusula') hardcoded fallback. UI re-render hook + custom event v167:datasync. Yeni dosya pusula_pro_sync_x.js 277 satir. T2-prev: b366629 */
/* CACHE-BUMP-2026-05-04-V168 V168 PUSULA-PRO-LOAD-FIX-001: PusulaPro gorev veri kurtarma — _ppLoad localStorage'dan 0 donduyse Firestore'dan duay_<tenant>/pusula doc.data field'ini cekip localStorage'a yaz. READ-ONLY (FS write yok). LZString sikistirma (>500 byte). _v168RestoredOnce tek seferlik flag. _isValidFsTaskArray genisletilmis kontrol (Array + her item object). 3 katmanli render fallback (_ppRender → renderPusulaPro → custom event v168:gorevkurtarma). KX9: pusula_pro.js DOKUNULMAZ. V167 ile catismaz: V167 abonelik/odeme/hayat field'lari yazma, V168 sadece data field okuma. Yeni dosya pusula_pro_load_fix_x.js 164 satir. T2-prev: ab7d19e */
/* CACHE-BUMP-2026-05-04-V169 V169 PUSULA-PRO-MIGRATE-001: PusulaPro eski format gorevleri yeni format'a migrate eder. Eski field (title/desc/due/pri/done/isDeleted) → yeni field (baslik/aciklama/bitTarih/oncelik/durum/silindi). Idempotent (baslik dolu ise atla). pri rakami → oncelik string mapping (1=kritik, 2=yuksek, 3=normal, 4=dusuk). done bool → durum string. Eski field'lar SILINMEZ (rollback safety). 5x1500ms retry — V168 restore tamamlanana kadar bekler. _ppLoad sonrasi _migrateAll → _ppStore (LS+FS sync). UI re-render: _ppRender / renderPusulaPro / custom event v169:migrated. KX9: pusula_pro.js DOKUNULMAZ. V167+V168 ile catismaz. Yeni dosya pusula_pro_migrate_x.js 203 satir. T2-prev: 65a1d61 */
/* CACHE-BUMP-2026-05-04-V170 V170 PUSULA-PRO-MODULER-BOLME-SCAFFOLD-001: pusula_pro.js (4675 satir) moduler bolme Cycle 2 SCAFFOLD. src/modules/pusula-pro/ klasoru + 14 bos iskelet dosya (toplam 239 satir): core, store, sync, migrate, render-list, render-board (takvim), render-detail, modal-task, modal-payment, modal-template, actions, events (mention/emoji), utils, init. Her dosyada window.PusulaPro.<modul> namespace guard, IIFE wrapper, POPULATE BEKLIYOR placeholder. Icerik Cycle 3 POPULATE'de eklenecek. Hicbir dosya 800 K01 limitini asmiyor (tahmin: render-list 600, render-board 620, modal-task 570, modal-payment 600, utils 580). KX9: pusula_pro.js + pusula_pro_sync_x.js + pusula_pro_load_fix_x.js + pusula_pro_migrate_x.js DOKUNULMADI. index.html aktivasyon Cycle 4'te yapilacak (su an eski tek dosya hala aktif). Inline onclick + native prompt() temizligi V175+ ayri patch cycle. Talimat V170 dry-run-rapor onayi alindi. T2-prev: scaffold */
/* CACHE-BUMP-2026-05-04-V170.0.1 V170.0.1 PUSULA-CORE-POPULATE: pusula-core.js POPULATE (12 -> 269 satir). pusula_pro.js L1-289 (Bolge I L165-221 modal-task'a) birebir kopya, KX8 disiplinli. Outer IIFE wrap + var->window promotion (defensive guard 'if(!window._ppEsc)') + canonical namespace expose (window.PusulaPro.core). 78 _ppEsc + 81 _ppNow + 32 _ppCu + 19 _ppIsAdmin kullanim noktasi icin scope break onlendi. 8/8 sandbox testi PASS (XSS escape, namespace, sabitler, defensive guard). KX9: pusula_pro.js hash AYNEN korundu. Diger 13 scaffold dosyasi DOKUNULMADI. T2-prev: cycle-3-1 */
/* CACHE-BUMP-2026-05-04-V170.1 V170.1 PUSULA-ARCHITECTURE-CORRECTION-001: Mini-Cycle 2.1 mimari duzeltme. utils kapsami daraltildi (sadece _ppHaftaNo, A2 sıkı disiplin) — state-mutate setter'lar (_ppSetMod, _ppAra, _ppSirala*, _ppCalismaFiltre, _ppSidebarSec) actions'a tasinacak. 2 yeni plugin modul: pusula-yasam.js (Frog/DW/Skor/Goal/Challenge/Habit/Hayat/Rev/Oncelik) + pusula-iletisim.js (Mesaj/Not/GorevMesaj/STT/Tab). Namespace mimarisi: PusulaPro.* (core ekosistem) + PusulaUtils/Yasam/Iletisim (flat plugin modul). Toplam scaffold dosya 14 -> 16. utils scaffold revize (PusulaPro.utils -> PusulaUtils flat). Cycle 1 store plani revize: yasam/iletisim self-contained (kendi Load/Store), store yalnizca gorev/takvim/odeme/abonelik. Altın kural: 'state degistiriyorsa utils degildir'. KX9: pusula_pro.js + _x wrapper + pusula-core.js DOKUNULMADI. POPULATE Cycle 3.2'de yapilacak. T2-prev: scaffold-2-1 */
/* CACHE-BUMP-2026-05-04-V170.2 V170.2 PUSULA-PRO-MODULER-AKTIVASYON-001: Cycle 4 — 16 modul tamami POPULATE bitti, index.html'e Asama A paralel ekleme yapildi (eski pusula_pro.js + 16 yeni dosya beraber yuklenir). Defensive guard 'if (!window._ppXxxLoaded)' eski tanimlari korur, overwrite engellenir. 16 dosya toplam 5110 satir (orijinal 4675'ten +435 satir defensive guard + namespace expose + diagnostic). Yukleme sirasi: core -> utils -> store -> yasam -> iletisim -> sync -> migrate -> render-list/board/detail -> modal-task/payment/template -> actions -> events -> init. PRECACHE_URLS array'e 16 yeni URL eklendi. KX9: pusula_pro.js + _x wrapper'lar + tum 16 pusula-pro/*.js DOKUNULMADI (sadece index.html + sw.js degisti). 16x11=176 runtime test PASS. Saha test sonrasi V175+ ayri cycle'da pusula_pro.js cikarilacak. T2-prev: cycle-4 */
/* CACHE-BUMP-2026-05-06-V193e7p2 V193 EDIT 7.1.6 — SW AUTO-UPDATE: Safari/Chrome cache invalidation problemi çözüldü. sw.js'de SKIP_WAITING message handler eklendi. index.html'de periodik update (60s setInterval), visibilitychange tetik, installed-state postMessage, waiting-SW pre-load handler eklendi. Mekanizma: yeni SW install → waiting → SKIP_WAITING postMessage → activate → controllerchange → otomatik reload. Kullanıcı hiçbir şey yapmaz, en geç 60s içinde yeni sürüm aktive olur. ÖNCE: kullanıcılar manuel cache temizlemek zorunda kalıyordu. SONRA: bu push'tan sonraki tüm güncellemeler arka planda akar. T2-prev: V193 EDIT 7.1.6 SW auto-update */
const CACHE_NAME    = 'duay-platform-v208';
const CACHE_VERSION = '208.0.0';

// Offline'da kesinlikle çalışması gereken dosyalar
// [SW-PRECACHE-AUTOSYNC-001 START]
const PRECACHE_URLS = [
  // OTOMATIK ÜRETİM — manuel düzenleme yapma. Sync için: bash scripts/sync-sw.sh
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/styles.css',
  '/config/firebase.js',
  '/src/i18n/translations.js',
  '/src/core/idb.js',
  '/src/core/smart_storage.js',
  '/src/core/database.js',
  '/src/modules/storage_monitor.js',
  '/src/modules/form_draft_engine.js',
  '/src/core/aux_sync.js',
  '/src/core/cache.js',
  '/src/core/utils.js',
  '/src/core/duay_meta.js',
  '/src/core/auth.js',
  '/src/core/storage_helpers.js',
  '/src/core/gdrive.js',
  '/src/modules/cari_utils.js',
  '/src/modules/panel_stubs.js',
  '/src/modules/admin.js',
  '/src/modules/user_settings.js',
  '/src/modules/kargo.js',
  '/src/modules/navlun.js',
  '/src/modules/loj_features.js',
  '/src/modules/pirim.js',
  /* V170 PUSULA-PRO MODÜLER 16 DOSYA (Cycle 4 aktivasyon) */
  '/src/modules/pusula-pro/pusula-core.js',
  '/src/modules/pusula-pro/pusula-utils.js',
  '/src/modules/pusula-pro/pusula-store.js',
  '/src/modules/pusula-pro/pusula-yasam.js',
  '/src/modules/pusula-pro/pusula-iletisim.js',
  '/src/modules/pusula-pro/pusula-sync.js',
  '/src/modules/pusula-pro/pusula-migrate.js',
  '/src/modules/pusula-pro/pusula-render-list.js',
  '/src/modules/pusula-pro/pusula-render-board.js',
  '/src/modules/pusula-pro/pusula-render-detail.js',
  '/src/modules/pusula-pro/pusula-modal-task.js',
  '/src/modules/pusula-pro/pusula-modal-payment.js',
  '/src/modules/pusula-pro/pusula-modal-template.js',
  '/src/modules/pusula-pro/pusula-actions.js',
  '/src/modules/pusula-pro/pusula-events.js',
  '/src/modules/pusula-pro/pusula-init.js',
  '/src/modules/ik.js',
  '/src/modules/crm.js',
  '/src/modules/stok.js',
  '/src/modules/urun_db.js',
  '/src/modules/satis_teklif.js',
  '/src/modules/satin_alma_v2.js',
  '/src/modules/satin_alma_v2_render.js',
  '/src/modules/satin_alma_v2_liste.js',
  '/src/modules/satin_alma_v2_satis.js',
  '/src/modules/satin_alma_v2_form.js',
  '/src/modules/satin_alma_v2_csv.js',
  '/src/modules/satin_alma_v2_duzenleme.js',
  '/src/modules/satin_alma_v2_pi.js',
  '/src/modules/satin_alma_v2_revize_render.js',
  '/src/modules/satin_alma_v2_pdf_enhance.js',
  '/src/modules/satin_alma_v2_pdf_v2.js',
  '/src/modules/satin_alma_v2_bulk_fs_newtab.js',
  '/src/modules/satin_alma_v2_sartlar_ui_pdf.js',
  '/src/modules/dashboard_improve.js',
  '/src/modules/dashboard_v2_actions.js',
  '/src/modules/satin_alma_v2_arama_x.js',
  '/src/modules/satin_alma_v2_modal_topsil_x.js',
  '/src/modules/satin_alma_v2_modal_fs_x.js',
  '/src/modules/urun_db_modal_fs_x.js',
  '/src/modules/satin_alma_v2_liste_grup_x.js',
  '/src/modules/fason.js',
  '/src/modules/fason_checklist.js',
  '/src/modules/platform_standartlari.js',
  '/src/modules/hesap_ozeti.js',
  '/src/modules/muavin.js',
  '/src/modules/muavin_parse.js',
  '/src/modules/hesap_mutabakati.js',
  '/src/modules/muavin_export.js',
  '/src/modules/gcb.js',
  '/src/modules/alarm.js',
  '/src/modules/excel_import.js',
  '/src/modules/finans.js',
  '/src/modules/helpers.js',
  '/src/modules/announce.js',
  '/src/modules/hedefler.js',
  '/src/modules/odemeler.js',
  '/src/modules/nakit_akis.js',
  '/src/modules/cash_flow.js',
  '/src/modules/kpi.js',
  '/src/modules/ik_panel.js',
  '/src/modules/puantaj.js',
  '/src/modules/izin.js',
  '/src/modules/crm_panel.js',
  '/src/modules/extra_panels.js',
  '/src/modules/docs.js',
  '/src/modules/formlar.js',
  '/src/modules/gorusme.js',
  '/src/modules/ceo.js',
  '/src/modules/hesap.js',
  '/src/modules/hesap_makinesi.js',
  '/src/core/confirm_modal.js',
  '/src/modules/modals.js',
  '/src/modules/dashboard.js',
  '/src/modules/dashboardDetay.js',
  '/src/modules/urunler.js',
  '/src/modules/ihracat_listesi.js',
  '/src/modules/numuneler.js',
  '/src/modules/ihracat_ops.js',
  '/src/modules/ihracat_belgeler.js',
  '/src/modules/ihracat_formlar.js',
  '/src/modules/talimatlar.js',
  '/src/modules/expected_deliveries.js',
  '/src/core/draft_manager.js',
  '/src/core/app.js',
  '/src/modules/app_patch.js',
  '/src/modules/lojistik.js',
  '/src/modules/ik_hub.js',
  '/src/modules/iddia.js',
  '/src/modules/sozler.js',
  '/src/modules/crm_hub.js',
];
// [SW-PRECACHE-AUTOSYNC-001 END]

// ── Install: tüm statik dosyaları cache'e al ──────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Install v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Hata olursa tek tek deneyerek yükle (bazı dosyalar yoksa atlansın)
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(e => console.warn('[SW] Cache edilemedi:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: eski cache'leri temizle ────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activate v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eski cache siliniyor:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* V193 EDIT 7.1.6 — SW-AUTOUPDATE-001 — Waiting SW'i zorla aktive et.
 * index.html periodik olarak reg.update() çağırır → yeni SW install olur ama
 * waiting state'te kalır (eski SW hâlâ controller). Sayfa SKIP_WAITING mesajı
 * gönderince waiting SW activate olur → controllerchange tetiklenir →
 * index.html otomatik reload yapar. Kullanıcı hiçbir şey yapmaz.
 *
 * Safari özellikle bu mekanizmaya muhtaç: native update interval'i 1 saat,
 * SKIP_WAITING olmadan kullanıcı tarayıcıyı kapatıp açana kadar eski SW kalır. */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING mesajı alındı — waiting SW aktive ediliyor');
    self.skipWaiting();
  }
});

// ── Fetch: Cache-First (statik), Network-First (API) ─────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // [SW-FIX-001 START] Firebase API'leri SW'den İZOLE — browser doğrudan halletsin
  // (Firestore onSnapshot stream stabilitesi + token refresh + auth flow + storage)
  // Eski [SW-FIREBASESTORAGE-BYPASS-001] bu blokla genişletildi (firebasestorage dahil)
  const FIREBASE_HOSTS = [
    'firestore.googleapis' + '.com',
    'firebaseio' + '.com',
    'securetoken.googleapis' + '.com',
    'identitytoolkit.googleapis' + '.com',
    'firebaseinstallations.googleapis' + '.com',
    'firebasestorage.googleapis' + '.com',
    'fcmregistrations.googleapis' + '.com',
    'fcm.googleapis' + '.com',
    'apis.google' + '.com'
  ];
  const __isFirebaseRequest = FIREBASE_HOSTS.some(function(h) {
    return url.hostname === h || url.hostname.endsWith('.' + h);
  });
  if (__isFirebaseRequest) {
    return; // SW DOKUNMA — browser native handle eder
  }
  // [SW-FIX-001 END]

  // Firebase, CDN ve dış API'lar → Network-First
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('exchangerate-api') ||
    url.hostname.includes('open.er-api') ||
    /* [SW-EXTERNAL-API-PASSTHROUGH-001] Kur/altın/proxy API'leri eksikti — respondWith null hatası fix */
    url.hostname.includes('frankfurter') ||
    url.hostname.includes('goldapi') ||
    url.hostname.includes('allorigins') ||
    url.hostname.includes('tcmb.gov.tr')
  ) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Statik dosyalar → Network-First, offline'da cache fallback
  if (
    request.method === 'GET' && (
      url.pathname.endsWith('.js')  ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.html')||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.json')
    )
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(request).then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => cache.match(request))
      )
    );
    return;
  }

  // Diğer istekler → normal network, offline'da index.html fallback
  event.respondWith(
    fetch(request).catch(() => {
      if (request.mode === 'navigate') return caches.match('/index.html');
      return caches.match(request);
    })
  );
});

// ── Push bildirimleri (opsiyonel) ────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Duay Platform', {
      body: data.body || '',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag:  data.tag || 'default',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const url = event.notification.data?.url || '/';
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
