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
const CACHE_NAME    = 'duay-platform-v140';
const CACHE_VERSION = '140.0.0';

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
  '/src/modules/pusula_pro.js',
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
