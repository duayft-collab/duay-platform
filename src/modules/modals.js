/**
 * ════════════════════════════════════════════════════════════════
 * src/modules/modals.js  —  v8.1.0
 * Tüm Eksik Modalları Body'ye Inject Eder
 *
 * Modüler yapıya geçişte inline HTML'den ayrılan modallar:
 *   mo-task       — Görev Ekle/Düzenle (pusula.js)
 *   mo-taskchat   — Görev Yazışma (pusula.js)
 *   mo-kargo      — Kargo Ekle/Düzenle (kargo.js)
 *   mo-konteyn    — Konteyner Ekle/Düzenle (kargo.js)
 *   mo-krg-firma  — Kargo Firmaları (finans.js)
 *   mo-pirim      — Prim Ekle/Düzenle (pirim.js)
 *   mo-profile    — Profil Düzenle (app.js)
 *   mo-pin        — Pin Ekle/Düzenle (app.js)
 *   mo-admin-user — Kullanıcı Ekle/Düzenle (admin.js)
 *   mo-perm       — Modül İzinleri (admin.js)
 *   mo-rehber     — Rehber Ekle/Düzenle (helpers.js)
 *   mo-tebligat   — Tebligat Ekle/Düzenle (helpers.js)
 *   mo-temizlik   — Temizlik Rutini (helpers.js) → extra_panels.js'de
 *   mo-nview      — Not Görüntüle (helpers.js) → notes.js'de
 * ════════════════════════════════════════════════════════════════
 */

'use strict';
// loadUsers → window.loadUsers (database.js)
// toast → window.toast (app.js)
const logActivity= (...a) => window.logActivity?.(...a);
// openMo → window.openMo (app.js)
// closeMo → window.closeMo (app.js)


'use strict';



function injectAllModals() {
  // Zaten inject edilmişse tekrar yapma
  if (document.getElementById('modals-injected')) return;

  const container = document.createElement('div');
  container.id = 'modals-injected';

  container.innerHTML = `

<!-- ════════════════════════════════════════════════════════
     GÖREV MODAL (pusula.js)
     Elementler: tk-title, tk-desc, tk-pri, tk-user, tk-due,
                 tk-start, tk-status, tk-tags, tk-link, tk-file,
                 tk-eid, tk-fp, tk-participants-list, mo-tk-t
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-task" role="dialog" aria-modal="true" aria-labelledby="mo-tk-t">
  <div class="moc pusula-v85-modal" style="max-width:620px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;background:var(--sf);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">

    <!-- Öncelik renk çubuğu -->
    <div id="tk-pri-bar" style="height:4px;background:var(--ac);transition:background .25s;border-radius:20px 20px 0 0"></div>

    <!-- Header -->
    <div style="padding:18px 24px 12px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <div>
        <div class="mt" id="mo-tk-t" style="margin:0;font-size:16px">➕ Görev Ekle</div>
        <div id="tk-dept-workload-mini" style="font-size:11px;color:var(--t3);margin-top:2px"></div>
      </div>
      <button onclick="closeMo('mo-task')" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3);width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .15s" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'">×</button>
    </div>

    <!-- Scrollable body -->
    <div style="flex:1;overflow-y:auto;padding:20px 24px">

      <!-- Başlık -->
      <div style="margin-bottom:14px">
        <input class="fi" id="tk-title" placeholder="Görevi kısaca tanımlayın…" style="font-size:15px;font-weight:500;padding:12px 14px;border-radius:10px" oninput="updateTkPriBar();window._tkUpdateDeptWorkload?.()">
      </div>

      <!-- 3lü grid: Öncelik + Personel + Durum -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <div class="fl" style="margin-bottom:5px">ÖNCELİK</div>
          <select class="fi" id="tk-pri" style="padding:8px 10px" onchange="updateTkPriBar()">
            <option value="1">🔴 Kritik</option>
            <option value="2" selected>🟠 Önemli</option>
            <option value="3">🔵 Normal</option>
            <option value="4">⚪ Düşük</option>
          </select>
        </div>
        <div>
          <div class="fl" style="margin-bottom:5px">PERSONEL</div>
          <select class="fi" id="tk-user" style="padding:8px 10px" onchange="window._tkUpdateDeptWorkload?.()"></select>
        </div>
        <div>
          <div class="fl" style="margin-bottom:5px">DURUM</div>
          <select class="fi" id="tk-status" style="padding:8px 10px">
            <option value="todo">📋 Yapılacak</option>
            <option value="inprogress">🔄 Devam</option>
            <option value="review">👀 İnceleme</option>
            <option value="done">✅ Tamam</option>
          </select>
        </div>
      </div>

      <!-- Departman + İş Yükü Barı -->
      <div style="margin-bottom:14px">
        <div class="fl" style="margin-bottom:5px">DEPARTMAN</div>
        <select class="fi" id="tk-dept" style="padding:8px 10px" onchange="window._tkUpdateDeptWorkload?.()">
          <option value="">— Seçiniz —</option>
          <option value="Finans">💰 Finans</option>
          <option value="Lojistik">🚢 Lojistik</option>
          <option value="İK">👥 İK</option>
          <option value="IT">💻 IT</option>
          <option value="Satış">📈 Satış</option>
          <option value="Operasyon">⚙️ Operasyon</option>
          <option value="Diğer">📌 Diğer</option>
        </select>
        <!-- Departman iş yükü barı -->
        <div id="tk-dept-workload" style="display:none;margin-top:8px;background:var(--s2);border-radius:8px;padding:8px 12px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:5px">
            <span id="tk-dept-wl-label">İş Yükü</span>
            <span id="tk-dept-wl-pct">0%</span>
          </div>
          <div style="height:6px;background:var(--b);border-radius:4px;overflow:hidden">
            <div id="tk-dept-wl-bar" style="height:100%;background:var(--ac);border-radius:4px;transition:width .4s ease;width:0%"></div>
          </div>
        </div>
      </div>

      <!-- Tarih + Saat -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <div class="fl" style="margin-bottom:5px">BAŞLANGIÇ</div>
          <input type="date" class="fi" id="tk-start" style="padding:8px 10px">
        </div>
        <div>
          <div class="fl" style="margin-bottom:5px">BİTİŞ TARİHİ & SAATİ</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
            <input type="date" class="fi" id="tk-due" style="padding:8px 10px">
            <input type="time" class="fi" id="tk-due-time" style="padding:8px 10px;width:100px" placeholder="--:--">
          </div>
        </div>
      </div>

      <!-- Maliyet Etiketi -->
      <div style="margin-bottom:14px">
        <div class="fl" style="margin-bottom:5px">💰 İŞLEM TUTARI <span style="font-weight:400;color:var(--t3)">(opsiyonel)</span></div>
        <div style="position:relative">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--t3)">₺</span>
          <input class="fi" type="number" id="tk-cost" placeholder="0.00" style="padding:8px 10px 8px 28px">
        </div>
      </div>

      <!-- Açıklama -->
      <div style="margin-bottom:14px">
        <div class="fl" style="margin-bottom:5px">AÇIKLAMA</div>
        <textarea class="fi" id="tk-desc" rows="2" style="resize:vertical;font-size:13px;border-radius:10px" placeholder="Detay, bağlam, gereksinimler…"></textarea>
      </div>

      <!-- Alt Görevler -->
      <div style="margin-bottom:14px;border:1px solid var(--b);border-radius:12px;overflow:hidden">
        <div style="padding:10px 14px;background:var(--s2);display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="window._tkToggleSubtasks?.()">
          <span style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">⬜ Alt Görevler</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span id="tk-st-count" style="font-size:11px;color:var(--ac)"></span>
            <span id="tk-st-arrow" style="font-size:12px;color:var(--t3);transition:transform .2s">▼</span>
          </div>
        </div>
        <div id="tk-subtasks-wrap" style="padding:12px 14px;display:block">
          <div id="tk-subtasks-list"></div>
          <button type="button" onclick="window._tkAddSubtask?.()" style="margin-top:8px;background:none;border:1px dashed var(--b);border-radius:8px;width:100%;padding:7px;font-size:12px;color:var(--t3);cursor:pointer;font-family:inherit;transition:all .15s" onmouseover="this.style.borderColor='var(--ac)';this.style.color='var(--ac)'" onmouseout="this.style.borderColor='var(--b)';this.style.color='var(--t3)'">+ Alt Görev Ekle</button>
        </div>
      </div>

      <!-- Gelişmiş Seçenekler -->
      <div style="border:1px solid var(--b);border-radius:12px;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 14px;background:var(--s2);display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="window._tkToggleAdvanced?.()">
          <span style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">⚙️ Gelişmiş Seçenekler</span>
          <span id="tk-adv-arrow" style="font-size:12px;color:var(--t3);transition:transform .2s">▶</span>
        </div>
        <div id="tk-advanced-wrap" style="display:none;padding:14px">
          <!-- Etiketler -->
          <div style="margin-bottom:12px">
            <div class="fl" style="margin-bottom:5px">ETİKETLER <span style="font-weight:400;color:var(--t3)">(virgülle ayır)</span></div>
            <div style="position:relative">
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">🏷️</span>
              <input class="fi" id="tk-tags" placeholder="satınalma, acil, operasyon…" style="padding:7px 10px 7px 28px">
            </div>
          </div>
          <!-- Link + Süre -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              <div class="fl" style="margin-bottom:5px">🔗 REFERANS LİNK</div>
              <input class="fi" id="tk-link" placeholder="https://…" style="padding:7px 10px">
            </div>
            <div>
              <div class="fl" style="margin-bottom:5px">⏱ SÜRE (dk)</div>
              <input class="fi" type="number" id="tk-duration" placeholder="60" style="padding:7px 10px">
            </div>
          </div>
          <!-- Dosya Eki -->
          <div style="margin-bottom:12px">
            <div class="fl" style="margin-bottom:5px">📎 DOSYA EKİ</div>
            <input type="file" class="fi" id="tk-file" accept=".pdf,.jpg,.png,.docx,.xlsx" style="font-size:12px;padding:7px 10px" onchange="if(g('tk-fp'))g('tk-fp').textContent=this.files[0]?'📎 '+this.files[0].name:''">
            <div id="tk-fp" style="font-size:11px;color:var(--ac);margin-top:4px;min-height:14px"></div>
          </div>
          <!-- Katılımcılar -->
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">👥 Katılımcılar & İzleyiciler</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <div class="fl" style="margin-bottom:6px;color:var(--ac)">✅ Katılımcılar</div>
                <div id="tk-participants-list" style="display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto"></div>
              </div>
              <div>
                <div class="fl" style="margin-bottom:6px;color:#8B5CF6">👁 İzleyiciler</div>
                <div id="tk-viewers-list" style="display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /body -->

    <!-- Footer -->
    <div style="padding:14px 24px;border-top:1px solid var(--b);display:flex;justify-content:space-between;align-items:center;background:var(--s2)">
      <button class="btn btns" onclick="closeMo('mo-task')" style="font-size:12px">İptal</button>
      <button class="btn btnp" onclick="saveTask()" style="padding:10px 28px;border-radius:10px;font-size:13px;font-weight:700">💾 Kaydet</button>
    </div>
    <input type="hidden" id="tk-eid">
  </div>
</div>


<!-- ════════════════════════════════════════════════════════
     GÖREV YAZIŞMA (pusula.js)
     Elementler: taskchat-tid, taskchat-title, taskchat-meta,
                 taskchat-msgs, taskchat-input, taskchat-file,
                 taskchat-info
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-taskchat" role="dialog" aria-modal="true">
  <div class="moc" style="max-width:520px;height:80vh;display:flex;flex-direction:column">
    <div class="moh">
      <div style="flex:1;min-width:0">
        <div class="mot" id="taskchat-title">Görev Yazışması</div>
        <div id="taskchat-meta" style="font-size:11px;color:var(--t3);margin-top:2px"></div>
      </div>
      <button class="mcl" onclick="closeMo('mo-taskchat')">✕</button>
    </div>
    <input type="hidden" id="taskchat-tid">
    <div id="taskchat-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px">
      <div id="taskchat-info" style="text-align:center;color:var(--t3);font-size:12px;padding:20px">Mesaj yükleniyor...</div>
    </div>
    <div style="padding:12px 16px;border-top:1px solid var(--b);display:flex;gap:8px;align-items:flex-end">
      <div style="flex:1">
        <textarea class="fi" id="taskchat-input" rows="2" style="resize:none" placeholder="Mesajınızı yazın..."></textarea>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <input type="file" id="taskchat-file" style="display:none" onchange="Pusula.sendChat?.()">
        <button class="btn btns" onclick="document.getElementById('taskchat-file').click()" style="font-size:11px">📎</button>
        <button class="btn btnp" onclick="Pusula.sendChat?.()" style="font-size:13px">➤</button>
      </div>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     KARGO MODAL (kargo.js)
     Elementler: krg-dir, krg-from, krg-to, krg-firm,
                 krg-date, krg-status, krg-eid
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-kargo">
  <div class="moc" style="max-width:520px;padding:0;border-radius:10px;overflow:hidden;max-height:92vh;display:flex;flex-direction:column">
    <div style="padding:16px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span class="mt" id="mo-krg-t" style="margin:0;font-size:15px">Kargo Kaydı</span>
      <button onclick="closeMo('mo-kargo')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1">×</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1">
      <input type="hidden" id="krg-dir">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div class="fl">GÖNDERİCİ</div><input class="fi" id="krg-from" placeholder="Ad / Firma"></div>
        <div><div class="fl">ALICI</div><input class="fi" id="krg-to" placeholder="Ad / Firma"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
        <div><div class="fl">GÖN. TELEFON</div><input class="fi" id="krg-from-tel" placeholder="0212…"></div>
        <div><div class="fl">GÖN. CEP</div><input class="fi" id="krg-from-gsm" placeholder="0532…"></div>
        <div><div class="fl">ALICI TELEFON</div><input class="fi" id="krg-to-tel" placeholder="0212…"></div>
        <div><div class="fl">ALICI CEP</div><input class="fi" id="krg-to-gsm" placeholder="0532…"></div>
      </div>
      <div><div class="fl">ADRES</div><textarea class="fi" id="krg-addr" rows="2" style="resize:none" placeholder="Teslimat adresi…"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div><div class="fl">KARGO FİRMASI</div>
          <select class="fi" id="krg-firm"><option>Yurtiçi</option><option>Aras</option><option>MNG</option><option>PTT</option><option>DHL</option><option>UPS</option><option>Diğer</option></select>
        </div>
        <div><div class="fl">TARİH</div><input type="date" class="fi" id="krg-date"></div>
        <div><div class="fl">DURUM</div>
          <select class="fi" id="krg-status">
            <option value="bekle">Beklemede</option>
            <option value="yolda">Yolda</option>
            <option value="teslim">Teslim</option>
          </select>
        </div>
      </div>
      <div><div class="fl">TAKİP NO</div><input class="fi" id="krg-note" placeholder="Takip numarası…"></div>
      <div><div class="fl">AÇIKLAMA</div><textarea class="fi" id="krg-desc" rows="2" style="resize:none" placeholder="Kargo içeriği, özel talimat…"></textarea></div>
      <input type="hidden" id="krg-eid">
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btns" onclick="printKargoLabel()" id="btn-krg-label" style="font-size:12px">Etiket Yazdır</button>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="closeMo('mo-kargo')" style="font-size:13px">İptal</button>
        <button class="btn btnp" onclick="saveKargo()" style="font-size:13px">Kaydet</button>
      </div>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     KONTEYNER MODAL (kargo.js)
     Elementler: ktn-no, ktn-hat, ktn-etd, ktn-eta,
                 ktn-uid, ktn-url, ktn-eid
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-konteyn">
  <div class="moc" style="max-width:560px;padding:0;border-radius:10px;overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
      <span class="mt" id="mo-ktn-t" style="margin:0;font-size:15px">Konteyner Ekle</span>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="display:flex;background:var(--s2);border-radius:6px;padding:2px;gap:1px" title="Form düzeni">
          <button id="ktn-layout-v" onclick="setKtnLayout('v')" style="background:var(--ac);color:#fff;border:none;cursor:pointer;font-size:10px;padding:3px 8px;border-radius:4px;font-family:inherit">Dikey</button>
          <button id="ktn-layout-h" onclick="setKtnLayout('h')" style="background:none;color:var(--t2);border:none;cursor:pointer;font-size:10px;padding:3px 8px;border-radius:4px;font-family:inherit">Yatay</button>
        </div>
        <button onclick="closeMo('mo-konteyn')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1">×</button>
      </div>
    </div>
    <div style="padding:20px;max-height:85vh;overflow-y:auto;display:flex;flex-direction:column;gap:14px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg">
        <div class="fl">KONTEYNER NUMARASI <span style="color:var(--rd)">*</span></div>
        <input class="fi" id="ktn-no" placeholder="MSCU1234567…" style="font-family:'DM Mono',monospace;font-weight:700;font-size:15px;letter-spacing:.05em" autocomplete="off">
        <div style="font-size:10px;color:var(--t3);margin-top:4px">4 harf + 7 rakam</div>
      </div>
      <div class="fg">
        <div class="fl">MÜHÜR NUMARASI <span style="color:var(--rd)">*</span></div>
        <input class="fi" id="ktn-seal" placeholder="SL-12345678…" style="font-family:'DM Mono',monospace;font-weight:600;font-size:14px;letter-spacing:.03em" autocomplete="off">
        <div style="font-size:10px;color:var(--t3);margin-top:4px">Konteyner mühür no</div>
      </div>
    </div>
    <!-- İhracat / Sipariş ID — öne çıkar -->
    <div style="border:1px solid var(--b);border-radius:8px;padding:12px 14px">
      <div style="font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Bağlantı Bilgisi</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <div class="fl">İHRACAT / İŞLEM ID</div>
          <input class="fi" id="ktn-ihracat-id" placeholder="EXP-2026-001, PO-123…" style="font-family:'DM Mono',monospace">
        </div>
        <div>
          <div class="fl">MÜŞTERİ / FİRMA ADI</div>
          <input class="fi" id="ktn-musteri" placeholder="Alıcı firma adı…">
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">HAT / ARMATÖR</div>
        <select class="fi" id="ktn-hat" onchange="autoFillKonteynUrl()">
          <option value="">Seçin…</option>
          <option value="MSC">MSC — Mediterranean Shipping Co.</option>
          <option value="Maersk">Maersk Line</option>
          <option value="CMA CGM">CMA CGM</option>
          <option value="COSCO">COSCO Shipping</option>
          <option value="Hapag-Lloyd">Hapag-Lloyd</option>
          <option value="ONE">ONE — Ocean Network Express</option>
          <option value="Evergreen">Evergreen Marine</option>
          <option value="Yang Ming">Yang Ming Marine</option>
          <option value="HMM">HMM — Hyundai Merchant Marine</option>
          <option value="ZIM">ZIM Integrated Shipping</option>
          <option value="PIL">PIL — Pacific International Lines</option>
          <option value="OOCL">OOCL — Orient Overseas Container Line</option>
          <option value="Diger">Diğer / Bilinmiyor</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">YÜKLEME LİMANI</div><div style="position:relative"><input class="fi" id="ktn-from-port" placeholder="Shanghai, Hamburg…" autocomplete="off"></div></div>
      <div class="fg"><div class="fl">VARIŞ LİMANI</div><div style="position:relative"><input class="fi" id="ktn-to-port" placeholder="İstanbul, Mersin…" autocomplete="off"></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">YÜKLEME TARİHİ (ETD)</div><input type="date" class="fi" id="ktn-etd"></div>
      <div class="fg"><div class="fl">TAHMINI VARIŞ (ETA)</div><input type="date" class="fi" id="ktn-eta"></div>
    </div>
    <div class="fg"><div class="fl">İÇERİK / AÇIKLAMA</div><input class="fi" id="ktn-desc" placeholder="Ürün içeriği…"></div>
    <div class="fg"><div class="fl">İLGİLİ PERSONEL</div><select class="fi" id="ktn-user"></select></div>
    <div class="fg">
      <div class="fl">TAKİP LİNKİ (opsiyonel)</div>
      <input class="fi" id="ktn-url" placeholder="https://www.msc.com/tr/track-a-shipment…">
    </div>
    <div style="border:1px solid var(--b);border-radius:8px;overflow:hidden">
      <div style="padding:10px 14px;border-bottom:1px solid var(--b);font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Süreç Adımları</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--b)">
        <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;font-size:12px;border-right:1px solid var(--b)">
          <input type="checkbox" id="ktn-evrak-gon" style="accent-color:var(--ac)">
          Evrak Gönderildi
        </label>
        <div style="padding:8px 14px"><input type="date" class="fi" id="ktn-evrak-tarih" style="font-size:12px"></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--b)">
        <input type="checkbox" id="ktn-evrak-ulasti" style="accent-color:var(--ac)">
        Müşteri Evrakları Teslim Aldı
      </label>
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--b)">
        <input type="checkbox" id="ktn-inspection" style="accent-color:var(--ac)">
        Inspection Tamamlandı
      </label>
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;font-size:12px">
        <input type="checkbox" id="ktn-mal-teslim" style="accent-color:var(--ac)">
        Müşteri Malları Teslim Aldı
      </label>
    </div>
      <input type="hidden" id="ktn-eid">
    </div>
    <div style="padding:12px 20px;border-top:1px solid var(--b);background:var(--s2);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="closeMo('mo-konteyn')" style="font-size:13px">İptal</button>
      <button class="btn btnp" onclick="saveKonteyn()" style="font-size:13px">Kaydet</button>
    </div>
  </div>
</div>

<div class="mo" id="mo-stok">
  <div class="moc" style="max-width:540px">
    <div class="mt" id="mo-stk-t">📦 Zimmet / Demirbaş Kaydı</div>
    <input type="hidden" id="stk-dir">
    <input type="hidden" id="stk-eid">

    <!-- Zimmet türü -->
    <div class="fg">
      <div class="fl">KAYIT TÜRÜ <span style="color:var(--rd)">*</span></div>
      <select class="fi" id="stk-tür" onchange="updateStokForm()">
        <option value="stok">📦 Genel Ürün / Stok</option>
        <option value="zimmet">🔑 Zimmet (Kişiye Teslim)</option>
        <option value="demirbaş">🖥️ Demirbaş (Sabit Kıymet)</option>
      </select>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">ÜRÜN / CİHAZ ADI <span style="color:var(--rd)">*</span></div><input class="fi" id="stk-name" placeholder="Laptop, Telefon, Masa vb."></div>
      <div class="fg"><div class="fl">MİKTAR / ADET</div><input type="number" class="fi" id="stk-qty" value="1" min="1"></div>
    </div>

    <!-- IMEI / Seri No — zimmet ve demirbaşta göster -->
    <div id="stk-imei-row" style="display:none">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg">
          <div class="fl">IMEI / SERİ NO</div>
          <input class="fi" id="stk-imei" placeholder="IMEI veya seri numarası">
        </div>
        <div class="fg">
          <div class="fl">ÜRÜN KODU / BARKOD</div>
          <input class="fi" id="stk-kod" placeholder="Barkod, model no vb.">
        </div>
      </div>
    </div>

    <!-- Zimmet alanları -->
    <div id="stk-zimmet-row" style="display:none">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg"><div class="fl">TESLİM ALAN KİŞİ <span style="color:var(--rd)">*</span></div><select class="fi" id="stk-zimmet-user"></select></div>
        <div class="fg"><div class="fl">TESLİM TARİHİ</div><input type="date" class="fi" id="stk-zimmet-date"></div>
      </div>
      <div class="fg">
        <div class="fl">İADE TARİHİ (varsa)</div>
        <input type="date" class="fi" id="stk-iade-date">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">KAYIT TARİHİ</div><input type="date" class="fi" id="stk-date"></div>
      <div class="fg"><div class="fl">SORUMLU PERSONEL</div><select class="fi" id="stk-user"></select></div>
    </div>

    <div class="fg"><div class="fl">NOT / AÇIKLAMA</div><input class="fi" id="stk-note" placeholder="Ek bilgi…"></div>

    <!-- Fotoğraf — zimmet/demirbaşta ZORUNLU -->
    <div class="fr" id="stk-foto-row">
      <div class="fl">
        TESLİM FOTOĞRAFI
        <span id="stk-foto-required" style="color:var(--rd);display:none"> * ZORUNLU</span>
        <span id="stk-foto-opt" style="color:var(--t3);font-size:10px"> (opsiyonel)</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input type="file" id="stk-img" accept="image/*" style="font-size:12px" onchange="previewStokImg(this)">
        <div id="stk-img-preview" style="display:none;margin-top:4px"></div>
        <div style="font-size:11px;color:var(--t3)">📸 Cihazın veya teslim anının fotoğrafı — JPG/PNG</div>
      </div>
    </div>

    <!-- Belge -->
    <div class="fg">
      <div class="fl">BELGE / FATURA / İRSALİYE</div>
      <input type="file" id="stk-doc" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" style="font-size:12px">
      <div style="font-size:11px;color:var(--t3);margin-top:3px">Fatura, irsaliye, teslimat belgesi vb.</div>
    </div>

    <!-- Bilgi notu alanı -->
    <div class="fg">
      <div class="fl">BİLGİ NOTU (Yöneticiye)</div>
      <textarea class="fi" id="stk-bilgi-notu" rows="2" style="resize:vertical" placeholder="Onay için ek açıklama, gerekçe…"></textarea>
    </div>

    <div class="mof">
      <button class="btn" onclick="closeMo('mo-stok')">İptal</button>
      <button class="btn btns" id="btn-stk-tutanak" onclick="printZimmetTutanak()" style="display:none">🖨 Tutanak</button>
      <button class="btn btnp" onclick="saveStok()">Kaydet</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     KARGO FİRMALARI MODAL (finans.js / kargo.js)
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-krg-firma">
  <div class="moc" style="max-width:460px">
    <div style="padding:14px 18px;border-bottom:1px solid var(--b)"><span style="font-size:14px;font-weight:500">Kargo Firmaları</span></div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:14px">Admin onayı ile yeni firma eklenebilir veya silinebilir.</div>
    <div id="krg-firma-list" style="margin-bottom:14px;max-height:200px;overflow-y:auto;border:1px solid var(--b);border-radius:var(--rs)"></div>
    <div id="krg-firma-add-row" style="display:none">
      <div class="fr"><div class="fl">YENİ FİRMA ADI</div><input class="fi" id="krg-firma-new-name" placeholder="Firma adı…"></div>
      <div class="mf" style="padding-top:0;border-top:none">
        <button class="btn" onclick="g('krg-firma-add-row').style.display='none'">İptal</button>
        <button class="btn btnp" onclick="addKargoFirma()">Ekle (Admin Onayı Gönder)</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:space-between">
      <button class="btn btns" onclick="g('krg-firma-add-row').style.display='block'">+ Firma Öner</button>
      <button class="btn" onclick="closeMo('mo-krg-firma')">Kapat</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     PİRİM MODAL (pirim.js)
     Elementler: prm-eid, prm-title, prm-type, prm-oran,
                 prm-base-amount, prm-total, prm-date,
                 prm-user, prm-rate-hint, mo-prm-t
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-hdf">
  <div class="moc" style="max-width:620px;width:95vw">
    <div class="mt" id="mo-hdf-t">🎯 SMART Hedef Ekle</div>
    <!-- S - Spesifik -->
    <div style="background:var(--al);border-radius:var(--rs);padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--at)">
      <strong>SMART Prensipleri:</strong> Spesifik · Ölçülebilir · Ulaşılabilir · Gerçekçi · Zamanlı
    </div>
    <div class="fg"><div class="fl">🎯 HEDEF BAŞLIĞI <span style="color:var(--rd)">*</span></div><input class="fi" id="hdf-title" placeholder="Net ve spesifik bir hedef yazın…"></div>
    <div class="fg"><div class="fl">📊 ÖLÇÜM KRİTERİ / PERFORMANS GÖSTERGESİ</div><textarea class="fi" id="hdf-desc" rows="2" style="resize:vertical" placeholder="Başarı nasıl ölçülecek? (ör: Satışlar %20 artacak, 5 yeni müşteri kazanılacak)"></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">👤 SORUMLU</div><select class="fi" id="hdf-user"></select></div>
      <div class="fg"><div class="fl">📅 BAŞLANGIÇ</div><input type="date" class="fi" id="hdf-from"></div>
      <div class="fg"><div class="fl">⏰ SON TARİH <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="hdf-to"></div>
    </div>
    <div class="fg"><div class="fl">DURUM</div>
      <select class="fi" id="hdf-status"><option value="planned">📋 Planlandı</option><option value="progress">🔄 Devam Ediyor</option><option value="done">✅ Tamamlandı</option></select>
    </div>
    <!-- AKSİYON ADIMLARI -->
    <div class="fl" style="margin-bottom:8px;margin-top:4px">🗂 AKSİYON ADIMLARI <span style="font-size:10px;font-weight:400;color:var(--t2)">(Her adım, etaplara bölünebilir)</span></div>
    <div id="hdf-steps-cont" style="margin-bottom:10px;display:flex;flex-direction:column;gap:8px"></div>
    <button type="button" class="btn btns" onclick="addHdfStep()" style="width:100%;justify-content:center;border-style:dashed">+ Aksiyon Adımı Ekle</button>
    <input type="hidden" id="hdf-eid">
    <div class="mof"><button class="btn" onclick="closeMo('mo-hdf')">İptal</button><button class="btn btnp" onclick="saveHdf()">Kaydet</button></div>
  </div>
</div>

<div class="mo" id="mo-pirim">
  <div class="moc" style="max-width:640px;width:97vw;padding:0;overflow:hidden;border-radius:20px">

    <!-- ── HEADER ── -->
    <div style="background:linear-gradient(135deg,#1E1B4B 0%,#3730A3 60%,#6366F1 100%);padding:20px 24px 16px;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
      <div style="font-size:17px;font-weight:800;letter-spacing:-.3px;display:flex;align-items:center;gap:8px" id="mo-prm-t">
        <span style="background:rgba(255,255,255,.15);border-radius:8px;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;font-size:16px">⭐</span>
        Pirim Hesaplama
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,.55);margin-top:3px">İşlem tipini seç → Fatura gir → Hesapla → Gönder</div>
    </div>

    <!-- ── ADIM 1: İşlem Türü + Temel ── -->
    <div style="padding:18px 22px 0">
      <div style="font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">① PERSONEL & İŞLEM BİLGİSİ</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="fr" style="margin:0">
          <div class="fl" style="margin-bottom:5px">PERSONEL <span style="color:var(--rd)">*</span></div>
          <select class="fi" id="prm-user"></select>
        </div>
        <div class="fr" style="margin:0">
          <div class="fl" style="margin-bottom:5px">İŞLEM TARİHİ</div>
          <input type="date" class="fi" id="prm-date" oninput="calcPirimAuto()">
        </div>
      </div>

      <!-- İşlem türü kartlar -->
      <div style="font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">İŞLEM TÜRÜ <span style="color:var(--rd)">*</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px" id="prm-type-cards">
        <div class="prm-type-card" data-type="YA" onclick="selectPirimType('YA')" style="border:2px solid var(--b);border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .15s;background:var(--sf)">
          <div style="font-size:18px;margin-bottom:4px">🐣</div>
          <div style="font-size:12px;font-weight:700;color:var(--t)">Yeni Avcı</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">İlk alım · %0.30–1.00</div>
        </div>
        <div class="prm-type-card" data-type="SC" onclick="selectPirimType('SC')" style="border:2px solid var(--b);border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .15s;background:var(--sf)">
          <div style="font-size:18px;margin-bottom:4px">🌱</div>
          <div style="font-size:12px;font-weight:700;color:var(--t)">Sadık Çiftçi</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">Tekrar alım · %0.10–0.30</div>
        </div>
        <div class="prm-type-card" data-type="NY" onclick="selectPirimType('NY')" style="border:2px solid var(--b);border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .15s;background:var(--sf)">
          <div style="font-size:18px;margin-bottom:4px">🌟</div>
          <div style="font-size:12px;font-weight:700;color:var(--t)">Yeni+İyi</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">+%15 bonus</div>
        </div>
        <div class="prm-type-card" data-type="CA" onclick="selectPirimType('CA')" style="border:2px solid var(--b);border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .15s;background:var(--sf)">
          <div style="font-size:18px;margin-bottom:4px">➕</div>
          <div style="font-size:12px;font-weight:700;color:var(--t)">Çapraz Satış</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">+%25 bonus</div>
        </div>
        <div class="prm-type-card" data-type="DD" onclick="selectPirimType('DD')" style="border:2px solid var(--b);border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .15s;background:var(--sf)">
          <div style="font-size:18px;margin-bottom:4px">🕵️</div>
          <div style="font-size:12px;font-weight:700;color:var(--t)">Dedektif</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">YK kararı</div>
        </div>
        <div class="prm-type-card" data-type="RD" onclick="selectPirimType('RD')" style="border:2px solid var(--b);border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .15s;background:var(--sf)">
          <div style="font-size:18px;margin-bottom:4px">🔬</div>
          <div style="font-size:12px;font-weight:700;color:var(--t)">Ar-Ge</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">Proje katkısı</div>
        </div>
      </div>
      <input type="hidden" id="prm-type">
      <div class="fr" style="margin-bottom:14px">
        <div class="fl" style="margin-bottom:5px">İŞLEM / ÜRÜN TANIMI <span style="color:var(--rd)">*</span></div>
        <input class="fi" id="prm-title" placeholder="Tedarikçi, ürün adı, işlem açıklaması…">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
        <div class="fr" style="margin:0">
          <div class="fl" style="margin-bottom:5px">İŞLEM KODU</div>
          <input class="fi" id="prm-code" placeholder="YA-001, SC-002…">
        </div>
        <div class="fr" style="margin:0">
          <div class="fl" style="margin-bottom:5px">NOT</div>
          <input class="fi" id="prm-note" placeholder="Tedarikçi adı, ek bilgi…">
        </div>
      </div>
    </div>

    <div style="height:1px;background:var(--b);margin:14px 0"></div>

    <!-- ── ADIM 2: Fatura & Hesaplama ── -->
    <div style="padding:0 22px">
      <div style="font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px">② FATURA & PİRİM HESABI</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="fr" style="margin:0">
          <div class="fl" style="margin-bottom:5px">FATURA (₺) <span style="font-size:9px;color:var(--t3)">KDV hariç</span></div>
          <input type="number" class="fi" id="prm-fatura" placeholder="0" oninput="calcPirimAuto()" style="font-size:16px;font-weight:700">
        </div>
        <div class="fr" style="margin:0">
          <div class="fl" style="margin-bottom:5px">PİRİM ORANI (%) <span id="prm-rate-hint" style="font-size:9px;color:#6366F1;font-weight:700"></span></div>
          <input type="number" class="fi" id="prm-oran" placeholder="0.50" step="0.01" min="0" max="5" oninput="calcPirimAuto()" readonly style="background:var(--s2);color:var(--t2)">
        </div>
        <div class="fr" style="margin:0">
          <div class="fl" style="margin-bottom:5px">BRÜT PRİM (₺)</div>
          <input type="number" class="fi" id="prm-gross" placeholder="0" readonly style="background:var(--s2);font-weight:600;color:var(--ac)">
        </div>
      </div>
    </div>

    <div style="height:1px;background:var(--b);margin:0 0 0 0"></div>

    <!-- ── ADIM 3: Kesintiler ── -->
    <div style="padding:14px 22px 0">
      <div style="font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">③ KESİNTİLER (SOP — Opsiyonel)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div style="background:var(--sf);border:1.5px solid var(--b);border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">GECİKME (gün)</div>
          <input type="number" class="fi" id="prm-gecikme" placeholder="0" min="0" oninput="calcPirimAuto()" style="padding:6px 8px;font-size:13px">
          <div style="font-size:10px;color:var(--t3);margin-top:4px">1g: -%10 · 3g+: -%20</div>
        </div>
        <div style="background:var(--sf);border:1.5px solid var(--b);border-radius:10px;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">YÖNETİCİ MÜDAHALESİ (indirim %)</div>
          <input type="number" class="fi" id="prm-mgmt-indirim" placeholder="0" min="0" max="100" step="0.1" oninput="calcPirimAuto()" style="padding:6px 8px;font-size:13px">
          <div style="font-size:10px;color:var(--t3);margin-top:4px">İndirim × 3 kesilir</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1.5px solid var(--b);font-weight:500;transition:border-color .12s" onmouseenter="this.style.borderColor='#EF4444'" onmouseleave="this.style.borderColor='var(--b)'">
          <input type="checkbox" id="prm-miss-cross" onchange="calcPirimAuto()" style="accent-color:#EF4444;width:14px;height:14px">
          Tamamlayıcı ürün ihmali <span style="color:#EF4444;font-weight:700">-%30</span>
        </label>
        <label style="display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1.5px solid var(--b);font-weight:500;transition:border-color .12s" onmouseenter="this.style.borderColor='#EF4444'" onmouseleave="this.style.borderColor='var(--b)'">
          <input type="checkbox" id="prm-miss-rev" onchange="calcPirimAuto()" style="accent-color:#EF4444;width:14px;height:14px">
          Dikkatsiz revizyon <span style="color:#EF4444;font-weight:700">-%7</span>
        </label>
        <label style="display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;background:var(--sf);border:1.5px solid var(--b);font-weight:500;transition:border-color .12s" onmouseenter="this.style.borderColor='#EF4444'" onmouseleave="this.style.borderColor='var(--b)'">
          <input type="checkbox" id="prm-eksik-arastirma" onchange="calcPirimAuto()" style="accent-color:#EF4444;width:14px;height:14px">
          Eksik araştırma <span style="color:#EF4444;font-weight:700">-%40</span>
        </label>
      </div>

      <!-- Hesaplama özeti -->
      <div id="prm-penalty-preview" style="margin-bottom:12px"></div>

      <!-- NET PRİM -->
      <div style="background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(99,102,241,.03));border:2px solid rgba(99,102,241,.25);border-radius:14px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:4px">
        <div>
          <div style="font-size:10px;font-weight:800;color:#6366F1;text-transform:uppercase;letter-spacing:.08em">NET PRİM — SOP SONRASI</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px" id="prm-expiry-info"></div>
        </div>
        <input type="number" class="fi" id="prm-amount" placeholder="0"
          style="font-weight:800;font-size:24px;color:#6366F1;width:160px;text-align:right;border:none;background:transparent;padding:0;font-family:'DM Mono',monospace">
      </div>
    </div>
    <input type="hidden" id="prm-eid">

    <!-- ── FOOTER ── -->
    <div style="padding:12px 22px 16px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:space-between;background:var(--s2)">
      <button class="btn" onclick="closeMo('mo-pirim')">İptal</button>
      <div style="display:flex;gap:8px">
        <button class="btn btns" onclick="calcPirimAuto();toast('Hesaplandı ✓','ok')" style="font-weight:600">⚡ Hesapla</button>
        <button class="btn btnp" onclick="savePirim()" style="padding:9px 22px">📤 Yöneticiye Gönder</button>
      </div>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     PROFİL DÜZENLE MODAL (app.js)
     Elementler: prof-name, prof-oldpw, prof-newpw, prof-newpw2
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-profile">
    <div class="moc" style="max-width:420px">
      <div class="moh"><span class="mot">👤 Profilim</span><button class="mcl" onclick="closeMo('mo-profile')">✕</button></div>
      <div class="fg"><div class="fl">AD SOYAD</div><input class="fi" id="prof-name" placeholder="…"></div>
      <div class="fg"><div class="fl">MEVCUT ŞİFRE</div><input type="password" class="fi" id="prof-oldpw" placeholder="Değiştirmek için doldurun"></div>
      <div class="fg"><div class="fl">YENİ ŞİFRE</div><input type="password" class="fi" id="prof-newpw" placeholder="Min 6 karakter"></div>
      <div class="fg"><div class="fl">YENİ ŞİFRE (TEKRAR)</div><input type="password" class="fi" id="prof-newpw2" placeholder="…"></div>
      <div class="mof"><button class="btn" onclick="closeMo('mo-profile')">İptal</button><button class="btn btnp" onclick="saveProfile()">Kaydet</button></div>
    </div>
  </div>

<!-- ════════════════════════════════════════════════════════
     PİN EKLE MODAL (app.js)
     Elementler: pin-url, pin-name, pin-icon, pin-eid
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-pin">
  <div class="moc" style="max-width:480px">
    <div class="mt" id="mo-pin-t">Link Ekle</div>
    <div class="fg"><div class="fl">URL</div><input class="fi" id="pin-url" placeholder="https://..." oninput="autoFillPin(this.value)"></div>
    <div class="fg"><div class="fl">İSİM</div><input class="fi" id="pin-name" placeholder="Google, Slack…"></div>
    <div class="fg"><div class="fl">EMOJİ</div><input class="fi" id="pin-icon" placeholder="🌐" style="font-size:18px"></div>
    <div class="fg"><div class="fl">KISA AÇIKLAMA (Tooltip)</div><input class="fi" id="pin-desc" placeholder="Linkin ne için olduğunu yazın…"></div>
    <div id="pin-admin-sec" style="display:none">
      <div class="fg"><div class="fl">GÖRÜNÜRLÜK</div>
        <select class="fi" id="pin-vis" onchange="onPinVisChange(this.value)">
          <option value="private">🔒 Sadece ben</option>
          <option value="all">🌐 Tüm kullanıcılar</option>
          <option value="roles">👥 Belirli roller</option>
          <option value="users">🎯 Belirli kullanıcılar</option>
        </select>
      </div>
      <div id="pin-roles-row" style="display:none;margin-bottom:14px">
        <div class="fl" style="margin-bottom:6px">ROLLER</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label class="cki"><input type="checkbox" name="p-role" value="staff"> Personel</label>
          <label class="cki"><input type="checkbox" name="p-role" value="lead"> Takım Lideri</label>
          <label class="cki"><input type="checkbox" name="p-role" value="manager"> Yönetici</label>
          <label class="cki"><input type="checkbox" name="p-role" value="admin"> Admin</label>
        </div>
      </div>
      <div id="pin-users-row" style="display:none;margin-bottom:14px">
        <div class="fl" style="margin-bottom:6px">KULLANICILAR</div>
        <div id="pin-users-list" style="display:flex;flex-direction:column;gap:6px;max-height:140px;overflow-y:auto;border:1px solid var(--b);border-radius:var(--rs);padding:8px"></div>
      </div>
    </div>
    <input type="hidden" id="pin-eid">
    <div class="mof"><button class="btn" onclick="closeMo('mo-pin')">İptal</button><button class="btn btnp" onclick="savePin()">Kaydet</button></div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     KULLANICI EKLE/DÜZENLE MODAL (admin.js)
     Elementler: adm-eid, adm-name, adm-email, adm-role,
                 adm-dept, adm-color, adm-pwd, mo-adm-t
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-admin-user">
  <div class="moc" style="max-width:680px;width:95vw;padding:0;overflow:hidden;border-radius:20px">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#007AFF,#5856D6);padding:20px 24px;color:#fff">
      <div style="font-size:18px;font-weight:700;letter-spacing:-.3px" id="mo-u-title">Kullanıcı</div>
      <div style="font-size:12px;opacity:.75;margin-top:2px">Kullanıcı bilgileri ve modül erişim yetkilerini yönetin</div>
    </div>

    <!-- Temel Bilgiler -->
    <div style="padding:20px 24px 0">
      <div style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">TEMEL BİLGİLER</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="fg"><div class="fl">AD SOYAD</div><input class="fi" id="f-name" placeholder="Ad Soyad"></div>
        <div class="fg"><div class="fl">E-POSTA / KULLANICI ADI</div><input class="fi" id="f-email" placeholder="kullanici@sirket.com"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:6px">
        <div class="fg">
          <div class="fl">ŞİFRE</div>
          <input class="fi" type="password" id="f-pw" placeholder="Opsiyonel — boş bırakılabilir">
          <div style="font-size:10px;color:var(--t3);margin-top:3px">🔐 Firebase'de kayıtlıysa boş bırakın. Değilse geçici şifre girin.</div>
        </div>
        <div class="fg">
          <div class="fl">ROL</div>
          <select class="fi" id="f-role" onchange="autoSetRolePerms()">
            <option value="staff">👤 Personel</option>
            <option value="lead">⭐ Takım Lideri</option>
            <option value="manager">👔 Yönetici</option>
            <option value="admin">🔑 Admin</option>
          </select>
        </div>
        <div class="fg"><div class="fl">DURUM</div>
          <select class="fi" id="f-st">
            <option value="active">✅ Aktif</option>
            <option value="inactive">⭕ Pasif</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Modül Yetkileri - Gruplu -->
    <div style="padding:16px 24px 0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:.08em">🔐 MODÜL ERİŞİM YETKİLERİ</div>
        <div style="display:flex;gap:6px">
          <button type="button" onclick="setAllPerms(true)" style="background:rgba(52,199,89,.12);border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:11px;color:#34C759;font-weight:600;font-family:inherit">✓ Tümünü Aç</button>
          <button type="button" onclick="setAllPerms(false)" style="background:rgba(255,59,48,.1);border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:11px;color:#FF3B30;font-weight:600;font-family:inherit">✕ Tümünü Kapat</button>
          <button type="button" onclick="autoSetRolePerms()" style="background:rgba(0,122,255,.1);border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:11px;color:#007AFF;font-weight:600;font-family:inherit">↻ Role Göre Ayarla</button>
        </div>
      </div>
      <!-- Grup: Temel -->
      <div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:6px;display:flex;align-items:center;gap:6px"><span style="background:rgba(0,122,255,.1);color:#007AFF;border-radius:4px;padding:1px 6px">Temel</span></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
          <label class="pm-label"><input type="checkbox" id="pm-dashboard"> 🏠 Dashboard</label>
          <label class="pm-label"><input type="checkbox" id="pm-pusula"> 🧭 Görevler</label>
          <label class="pm-label"><input type="checkbox" id="pm-takvim"> 📅 Takvim</label>
          <label class="pm-label"><input type="checkbox" id="pm-notes"> 📝 Notlar</label>
          <label class="pm-label"><input type="checkbox" id="pm-announce"> 📣 Duyurular</label>
          <label class="pm-label"><input type="checkbox" id="pm-links"> 🔗 Linkler</label>
          <label class="pm-label"><input type="checkbox" id="pm-docs"> 📄 Dökümanlar</label>
          <label class="pm-label"><input type="checkbox" id="pm-suggestions"> 💡 Öneriler</label>
        </div>
      </div>
      <!-- Grup: İK & Personel -->
      <div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:6px"><span style="background:rgba(52,199,89,.1);color:#34C759;border-radius:4px;padding:1px 6px">İK & Personel</span></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
          <label class="pm-label"><input type="checkbox" id="pm-puantaj"> 📋 Puantaj</label>
          <label class="pm-label"><input type="checkbox" id="pm-izin"> 🏖️ İzin</label>
          <label class="pm-label"><input type="checkbox" id="pm-ik"> 👥 İK Yönetimi</label>
          <label class="pm-label"><input type="checkbox" id="pm-evrak"> 📋 Personel Evrak</label>
          <label class="pm-label"><input type="checkbox" id="pm-gorusme"> 🗣️ Görüşme</label>
          <label class="pm-label"><input type="checkbox" id="pm-formlar"> 📋 Formlar</label>
          <label class="pm-label"><input type="checkbox" id="pm-pirim"> ⭐ Pirim</label>
          <label class="pm-label"><input type="checkbox" id="pm-tebligat"> 📬 Tebligat</label>
        </div>
      </div>
      <!-- Grup: Operasyon -->
      <div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:6px"><span style="background:rgba(255,149,0,.12);color:#FF9500;border-radius:4px;padding:1px 6px">Operasyon</span></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
          <label class="pm-label"><input type="checkbox" id="pm-kargo"> 📦 Kargo</label>
          <label class="pm-label"><input type="checkbox" id="pm-stok"> 📦 Ürün/Zimmet</label>
          <label class="pm-label"><input type="checkbox" id="pm-numune"> 🧪 Numune</label>
          <label class="pm-label"><input type="checkbox" id="pm-temizlik"> 🧹 Temizlik</label>
          <label class="pm-label"><input type="checkbox" id="pm-etkinlik"> 🎪 Fuar/Etkinlik</label>
          <label class="pm-label"><input type="checkbox" id="pm-crm"> 🤝 CRM</label>
          <label class="pm-label"><input type="checkbox" id="pm-gorusme"> 🗣️ Görüşme</label>
        </div>
      </div>
      <!-- Grup: Finans & Yönetim -->
      <div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:6px"><span style="background:rgba(255,59,48,.1);color:#FF3B30;border-radius:4px;padding:1px 6px">Finans & Yönetim</span></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
          <label class="pm-label"><input type="checkbox" id="pm-finans"> 💰 Finans</label>
          <label class="pm-label"><input type="checkbox" id="pm-odemeler"> 💳 Ödemeler</label>
          <label class="pm-label"><input type="checkbox" id="pm-hedefler"> 🎯 Hedefler</label>
          <label class="pm-label"><input type="checkbox" id="pm-rehber"> 📒 Rehber</label>
          <label class="pm-label"><input type="checkbox" id="pm-arsiv"> 🗄️ Arşiv</label>
          <label class="pm-label"><input type="checkbox" id="pm-resmi"> 🏛️ Resmi Evrak</label>
          <label class="pm-label"><input type="checkbox" id="pm-ceo"> 👁️ CEO Paneli</label>
          <label class="pm-label"><input type="checkbox" id="pm-settings"> ⚙️ Ayarlar</label>
        </div>
      </div>
    </div>

    <!-- Döküman Kategori Erişimi -->
    <div style="padding:0 24px 14px">
      <div style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">📁 DÖKÜMAN KATEGORİ ERİŞİMİ</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <label class="pm-label"><input type="checkbox" id="pa-ik"> 📋 İK</label>
        <label class="pm-label"><input type="checkbox" id="pa-fn"> 💰 Finans</label>
        <label class="pm-label"><input type="checkbox" id="pa-op"> 🏢 Operasyon</label>
        <label class="pm-label"><input type="checkbox" id="pa-tk"> ⚙️ Teknik</label>
        <label class="pm-label"><input type="checkbox" id="pa-ms"> 💳 Maaş</label>
        <label class="pm-label"><input type="checkbox" id="pa-ss"> 🖥 Sistem</label>
      </div>
    </div>

    <input type="hidden" id="f-edit-id">
    <div style="padding:14px 24px 20px;border-top:1px solid var(--b);display:flex;gap:8px;justify-content:flex-end;background:var(--s2)">
      <button class="btn" onclick="closeMo('mo-admin-user')">İptal</button>
      <button class="btn btnp" onclick="saveUser()">💾 Kaydet</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     MODÜL İZİNLERİ MODAL (admin.js)
     Elementler: perm-uid, perm-uname, perm-modules-cont
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-perm" role="dialog" aria-modal="true">
  <div class="moc" style="max-width:520px">
    <div class="moh">
      <span class="mot">🔑 Modül İzinleri — <span id="perm-uname">Kullanıcı</span></span>
      <button class="mcl" onclick="closeMo('mo-perm')">✕</button>
    </div>
    <div class="mob">
      <input type="hidden" id="perm-uid">
      <div style="background:var(--s2);border-radius:var(--rs);padding:10px 12px;margin-bottom:12px;font-size:12px;color:var(--t2)">
        💡 İşaretli modüller kullanıcı tarafından erişilebilir. Admin rolündeki kullanıcılar tüm modüllere otomatik erişir.
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btns" style="font-size:11px" onclick="Admin._toggleAllPerms?.(true)">✅ Tümünü Seç</button>
        <button class="btn btns" style="font-size:11px" onclick="Admin._toggleAllPerms?.(false)">⬜ Tümünü Kaldır</button>
      </div>
      <div id="perm-modules-cont" class="ckg"></div>
    </div>
    <div class="mof">
      <button class="btn" onclick="closeMo('mo-perm')">İptal</button>
      <button class="btn btnp" onclick="Admin.savePermissions?.()">Kaydet</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     REHBER EKLE MODAL (helpers.js)
     Elementler: rh-eid, rh-name, rh-cat, rh-phone,
                 rh-contact, rh-email, rh-note, mo-rh-t
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-rh" role="dialog" aria-modal="true">
  <div class="moc" style="max-width:460px">
    <div class="moh">
      <span class="mot" id="mo-rh-t">+ Rehber Kaydı</span>
      <button class="mcl" onclick="closeMo('mo-rh')">✕</button>
    </div>
    <div class="mob">
      <input type="hidden" id="rh-eid">
      <div class="fg">
        <label class="fl">Ad / Kurum *</label>
        <input class="fi" id="rh-name" placeholder="Kişi veya kurum adı..." maxlength="80">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg">
          <label class="fl">Kategori</label>
          <select class="fi" id="rh-cat">
            <option value="acil">🚨 Acil</option>
            <option value="medikal">🏥 Medikal</option>
            <option value="teknik">🔧 Teknik</option>
            <option value="yonetim">👔 Yönetim</option>
            <option value="tedarik">📦 Tedarikçi</option>
            <option value="diger">📌 Diğer</option>
          </select>
        </div>
        <div class="fg">
          <label class="fl">Rol / Ünvan</label>
          <input class="fi" id="rh-contact" placeholder="Acil Müdür..." maxlength="60">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg">
          <label class="fl">Telefon</label>
          <input class="fi" type="tel" id="rh-phone" placeholder="0 xxx xxx xx xx" maxlength="25">
        </div>
        <div class="fg">
          <label class="fl">E-posta</label>
          <input class="fi" type="email" id="rh-email" placeholder="ornek@..." maxlength="80">
        </div>
      </div>
      <div class="fg">
        <label class="fl">Not</label>
        <input class="fi" id="rh-note" placeholder="İsteğe bağlı not..." maxlength="200">
      </div>
    </div>
    <div class="mof">
      <button class="btn" onclick="closeMo('mo-rh')">İptal</button>
      <button class="btn btnp" onclick="saveRehber?.()">Kaydet</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     TEBLİGAT EKLE MODAL (helpers.js)
     Elementler: teb-eid, teb-title, teb-cat, teb-date,
                 teb-deadline, teb-bolum, teb-kaynak,
                 teb-sorumlu, teb-desc, mo-teb-t
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-tebligat">
  <div class="moc" style="max-width:600px;width:97vw">
    <div class="mt" id="mo-teb-t">📬 Tebligat Kaydı</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">KONU / BAŞLIK <span style="color:var(--rd)">*</span></div><input class="fi" id="teb-title" placeholder="Dava No, Konu…"></div>
      <div class="fg"><div class="fl">KATEGORİ</div>
        <select class="fi" id="teb-cat">
          <option value="mahkeme">⚖️ Mahkeme/Yargı</option>
          <option value="vergi">🏛️ Vergi/Maliye</option>
          <option value="sgk">🏥 SGK</option>
          <option value="icra">💼 İcra</option>
          <option value="belediye">🏛️ Belediye</option>
          <option value="diger">📌 Diğer</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">GELİŞ TARİHİ <span style="color:var(--rd)">*</span></div><input type="date" class="fi" id="teb-date"></div>
      <div class="fg"><div class="fl">HEDEF TAMAMLANMA</div><input type="date" class="fi" id="teb-deadline"></div>
      <div class="fg"><div class="fl">BÖLÜM</div>
        <select class="fi" id="teb-bolum">
          <option value="muhasebe">📊 Muhasebe</option>
          <option value="hukuk">⚖️ Hukuk</option>
          <option value="ik">👥 İK</option>
          <option value="yonetim">🏛️ Yönetim</option>
          <option value="it">💻 IT</option>
          <option value="diger">📌 Diğer</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">GELİŞ KAYNAĞI (Gönderen Kurum)</div><input class="fi" id="teb-kaynak" placeholder="İstanbul 3. Vergi Mahkemesi…"></div>
      <div class="fg"><div class="fl">SORUMLU KİŞİ</div><select class="fi" id="teb-sorumlu"></select></div>
    </div>
    <div class="fg"><div class="fl">AÇIKLAMA</div><textarea class="fi" id="teb-desc" rows="2" style="resize:vertical" placeholder="Tebligatın detayı, hukuki süreç, cevaplanması gereken hususlar…"></textarea></div>
    <div class="fg">
      <div class="fl">BELGE KOPYASI (PDF/JPG) <span style="color:var(--rd)">*</span></div>
      <input type="file" id="teb-file" accept=".pdf,.jpg,.jpeg,.png" style="font-size:12px">
      <div style="font-size:11px;color:var(--t3);margin-top:3px">Tebligat belgesi sisteme yüklenmelidir.</div>
    </div>
    <input type="hidden" id="teb-eid">
    <div class="mof">
      <button class="btn" onclick="closeMo('mo-tebligat')">İptal</button>
      <button class="btn btnp" onclick="saveTebligat()">Kaydet</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     TEBLİGAT AŞAMA MODAL (helpers.js)
     Elementler: teb-asama-teb-id, teb-asama-note, teb-asama-date
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-teb-asama">
  <div class="moc" style="max-width:480px">
    <div class="moh"><span class="mot">📋 Aşama Ekle / Güncelle</span><button class="mcl" onclick="closeMo('mo-teb-asama')">✕</button></div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:12px" id="teb-asama-title-info">Tebligat için yeni aşama kaydı</div>
    <div class="fg"><div class="fl">AŞAMA AÇIKLAMASI <span style="color:var(--rd)">*</span></div><textarea class="fi" id="teb-asama-desc" rows="3" style="resize:vertical" placeholder="Yapılan işlem, alınan karar, sonraki adım…"></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">AŞAMA TARİHİ</div><input type="date" class="fi" id="teb-asama-date"></div>
      <div class="fg"><div class="fl">DURUM GÜNCELLEMESİ</div>
        <select class="fi" id="teb-asama-status">
          <option value="">Değişiklik yok</option>
          <option value="open">📂 Açık olarak devam et</option>
          <option value="closed">✅ Dosyayı Kapat</option>
        </select>
      </div>
    </div>
    <div class="fg">
      <div class="fl">EK BELGE (opsiyonel)</div>
      <input type="file" id="teb-asama-file" accept=".pdf,.jpg,.jpeg,.png" style="font-size:12px">
    </div>
    <input type="hidden" id="teb-asama-teb-id">
    <div style="background:var(--rdb);border-radius:var(--rs);padding:8px 12px;font-size:11px;color:var(--rdt);margin-bottom:12px">
      ⚠️ Aşama eklemek için <strong>yönetici onayı</strong> gereklidir. Talebiniz onaya gönderilecektir.
    </div>
    <div class="mof">
      <button class="btn" onclick="closeMo('mo-teb-asama')">İptal</button>
      <button class="btn btnp" onclick="saveTebAsama()">Onaya Gönder</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     TAKVİM ETKİNLİK MODAL (helpers.js)
     Elementler: cal-eid, cal-title-inp, cal-date-inp,
                 cal-time-inp, cal-type-inp, cal-desc-inp, mo-cal-t
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-cal">
  <div class="moc">
    <div class="moh"><span class="mot">Etkinlik</span><button class="mcl" onclick="closeMo('mo-cal')">✕</button></div>
    <div class="fg"><div class="fl">BAŞLIK</div><input class="fi" id="ev-title" placeholder="…"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><div class="fl">TARİH</div><input type="date" class="fi" id="ev-date"></div>
      <div class="fg"><div class="fl">SAAT</div><input type="time" class="fi" id="ev-time" value="09:00"></div>
    </div>
    <div class="fg"><div class="fl">TÜR</div>
      <select class="fi" id="ev-type"><option value="meeting">🤝 Toplantı</option><option value="deadline">⏰ Son Tarih</option><option value="holiday">🎉 Etkinlik</option><option value="task">📋 Görev</option></select>
    </div>
    <div class="fg"><div class="fl">AÇIKLAMA</div><input class="fi" id="ev-desc" placeholder="…"></div>
    <div class="mof"><button class="btn" onclick="closeMo('mo-cal')">İptal</button><button class="btn btnp" onclick="saveEvent()">Kaydet</button></div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     NOT GÖRÜNTÜLE MODAL (helpers.js)
     Elementler: mo-nview (modal kendisi)
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-nview">
  <div class="moc" style="max-width:620px;width:95vw;max-height:90vh;display:flex;flex-direction:column">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px" id="mnv-head">
      <div style="flex:1"><div style="font-size:17px;font-weight:600" id="mnv-title"></div><div style="font-size:11px;color:var(--t2);margin-top:4px" id="mnv-meta"></div></div>
      <div style="display:flex;gap:5px">
        <button class="btn btns" onclick="editNoteView()">✏️</button>
        <button class="btn btns btnd" onclick="delNoteView()">🗑</button>
        <button class="btn btns" onclick="closeMo('mo-nview')">✕</button>
      </div>
    </div>
    <div id="mnv-body" style="flex:1;overflow-y:auto;font-size:14px;line-height:1.8;white-space:pre-wrap;padding:16px;border-radius:var(--rs);border:1px solid var(--b)"></div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     TEMİZLİK RUTIN ŞABLON MODAL (helpers.js)
     Elementler: tmz-sablon-list
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-tmz-sablon" role="dialog" aria-modal="true">
  <div class="moc" style="max-width:480px">
    <div class="moh">
      <span class="mot">📋 Hazır Şablonlar</span>
      <button class="mcl" onclick="closeMo('mo-tmz-sablon')">✕</button>
    </div>
    <div class="mob">
      <div style="font-size:13px;color:var(--t2);margin-bottom:12px">Seçilen şablonlar listeye otomatik eklenecek.</div>
      <div id="tmz-sablon-list"></div>
    </div>
    <div class="mof">
      <button class="btn" onclick="closeMo('mo-tmz-sablon')">İptal</button>
      <button class="btn btnp" onclick="addSeciliRutinler?.()">Seçilenleri Ekle</button>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     PİN YÖNET MODAL (app.js - openPinModal)
     ════════════════════════════════════════════════════════ -->
<div class="mo" id="mo-pin-manage" role="dialog" aria-modal="true">
  <div class="moc" style="max-width:420px">
    <div class="moh">
      <span class="mot">📌 Pinbar Yönet</span>
      <button class="mcl" onclick="closeMo('mo-pin-manage')">✕</button>
    </div>
    <div class="mob" id="pin-manage-list"></div>
    <div class="mof">
      <button class="btn btnp" onclick="closeMo('mo-pin-manage')">Kapat</button>
    </div>
  </div>
</div>
`;

  document.body.appendChild(container);

  // Konteyner modal'ındaki personel select'i doldur
  _fillKtnUsers();
  // Tebligat sorumlu select'i doldur
  _fillTebSorumlu();
}

function _fillKtnUsers() {
  const sel = document.getElementById('ktn-uid');
  if (!sel) return;
  const users = (typeof loadUsers === 'function') ? loadUsers() : [];
  sel.innerHTML = '<option value="">Sorumlu seçin...</option>' +
    users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

function _fillTebSorumlu() {
  const sel = document.getElementById('teb-sorumlu');
  if (!sel) return;
  const users = (typeof loadUsers === 'function') ? loadUsers() : [];
  sel.innerHTML = '<option value="">Atanmadı</option>' +
    users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

// Pin kaydet fonksiyonu (app.js savePin yok, buradan yönetilir)
function savePinLink() {
  const url  = (document.getElementById('pin-url')?.value  || '').trim();
  const name = (document.getElementById('pin-name')?.value || '').trim();
  const icon = (document.getElementById('pin-icon')?.value || '🔗').trim();
  const desc = (document.getElementById('pin-desc')?.value || '').trim();
  const vis  = document.getElementById('pin-vis')?.value   || 'private';
  const eid  = parseInt(document.getElementById('pin-eid')?.value || '0');
  const cu   = window.Auth?.getCU?.();

  if (!url) { window.toast?.("URL zorunludur", 'err'); return; }

  const links = (typeof loadLinks === 'function') ? loadLinks() : [];
  const entry = { name: name || url.replace(/https?:\/\//, '').slice(0, 30), url, icon, desc, vis, owner: cu?.id || 0, visRoles: [], visUsers: [] };

  if (eid) {
    const l = links.find(x => x.id === eid);
    if (l) Object.assign(l, entry);
  } else {
    links.push({ id: generateNumericId(), ...entry });
  }

  if (typeof saveLinks === 'function') saveLinks(links);
  window.closeMo?.('mo-pin');
  if (typeof window.renderPinbar === 'function') window.renderPinbar();
  window.toast?.(eid ? 'Link güncellendi ✓' : 'Link eklendi ✓', 'ok');
}

// App.savePin olarak da erişilebilir
if (typeof window !== 'undefined') {
  window.savePinLink = savePinLink;
  window.savePin     = savePinLink;  // onclick="savePin()" için alias
  // App nesnesi yüklendikten sonra ata
  document.addEventListener('DOMContentLoaded', () => {
    if (window.App && !window.App.savePin) window.App.savePin = savePinLink;
  });
}

// Konteyner save fonksiyonu (kargo.js'de yoksa buradan)
// App.savePin için yardımcı (app.js'de varsa override edilir)

if (document.readyState === 'loading') {
  // Lazy: DOMContentLoaded'da inject etme — openMo() çağrısında yapılır
  // document.addEventListener('DOMContentLoaded', injectAllModals);
  // Ancak 300ms sonra arka planda yine de inject et (ilk açılış hızı için)
  setTimeout(injectAllModals, 300);
} else {
  injectAllModals();
}

// ── Lazy Modal Inject & openMo/closeMo Wrapper ───────────────────
(function _wrapOpenMo() {
  const _origOpen  = window.openMo;
  const _origClose = window.closeMo;

  window.openMo = function(id) {
    if (!document.getElementById('modals-injected')) {
      injectAllModals();
    }
    if (_origOpen) return _origOpen(id);
    document.querySelectorAll('.mo.open').forEach(m => m.classList.remove('open'));
    const mo = document.getElementById(id);
    if (mo) { mo.classList.add('open'); document.body.style.overflow = 'hidden'; }
  };

  window.closeMo = function(id) {
    if (_origClose) return _origClose(id);
    const mo = document.getElementById(id);
    if (mo) { mo.classList.remove('open'); document.body.style.overflow = ''; }
  };
})();
