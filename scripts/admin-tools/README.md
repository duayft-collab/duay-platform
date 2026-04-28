# Admin Tools

Bu klasördeki scriptler index.html'den yüklenmez. Manuel olarak DevTools console'dan veya geçici script injection ile çalıştırılmak üzere tasarlanmıştır.

## storage_audit.js

LocalStorage + IndexedDB doluluk raporu. Çalıştırmak için:

1. Tarayıcı DevTools console'unu aç.
2. Önce `idb.js` yüklü olmalı (Duay Platform sayfasında zaten yüklüdür).
3. `scripts/admin-tools/storage_audit.js` içeriğini console'a yapıştır → çalıştır.
4. Sonra `await window.storageAudit()` veya kısaca `await window.sa()`.

Bağımlılık: `window.idbKeys`, `window.idbGet` (`src/core/idb.js`'den gelir).

Önceki kaynak: 2026-04-28 öncesi `src/core/idb.js` ile birlikte yüklü idi; DEAD-CORE-CLEANUP-001 ile admin-tool olarak izole edildi.
