/* ── SA-V2-GUNCELLEME-001: Düzenleme + Kilit + Güncelleme Talebi ── */
window._saV2DuzenleForm = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  var mevcut = document.getElementById('sav2-duzenle-modal'); if (mevcut) mevcut.remove();
  var modal = document.createElement('div');
  modal.id = 'sav2-duzenle-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var _f = function(fid, lbl, val) { return '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">' + lbl + '</div><input id="sav2dz-' + fid + '" value="' + _saEsc(val || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box"></div>'; };
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:600px;max-height:90vh;overflow-y:auto">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">';
  ic += '<div style="font-size:14px;font-weight:500;color:var(--t)">Teklif Düzenle</div>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-duzenle-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>';
  ic += '</div><div style="padding:20px;display:flex;flex-direction:column;gap:12px">';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  ic += _f('urunAdi', 'İNG. ÜRÜN ADI', t.urunAdi);
  ic += _f('duayKodu', 'DUAY KODU', t.duayKodu);
  ic += '</div>';
  ic += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  ic += _f('alisF', 'ALİŞ FİYATI', t.alisF);
  ic += _f('miktar', 'MİKTAR', t.miktar);
  ic += _f('tedarikci', 'TEDARİKÇİ', t.tedarikci);
  ic += '</div>';
  ic += _f('jobId', 'JOB ID', t.jobId);
  ic += '</div>';
  ic += '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:0.5px solid var(--b);background:var(--s2)">';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-duzenle-modal\')?.remove()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2DuzenleKaydet(\'' + id + '\')" style="font-size:12px;padding:7px 18px;border:none;border-radius:5px;background:var(--t);color:var(--sf);cursor:pointer;font-family:inherit;font-weight:500">Kaydet</button>';
  ic += '</div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
};

window._saV2DuzenleKaydet = function(id) {
  var _v = function(fid) { return document.getElementById('sav2dz-' + fid)?.value?.trim() || ''; };
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  t.urunAdi = _v('urunAdi');
  t.duayKodu = _v('duayKodu');
  t.alisF = _v('alisF');
  t.miktar = _v('miktar');
  t.tedarikci = _v('tedarikci');
  t.jobId = _v('jobId');
  if (typeof window._steklifRevNo === 'function') window._steklifRevNo(t.id);
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  document.getElementById('sav2-duzenle-modal')?.remove();
  window.toast?.('Teklif güncellendi', 'ok');
  window.renderSatinAlmaV2?.();
};

window._saV2GuncellemeTalep = function(id) {
  var mevcut = document.getElementById('sav2-guncelleme-modal'); if (mevcut) mevcut.remove();
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  var modal = document.createElement('div');
  modal.id = 'sav2-guncelleme-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  var ic = '<div style="background:var(--sf);border-radius:10px;border:0.5px solid var(--b);width:540px">';
  ic += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:0.5px solid var(--b)">';
  ic += '<div><div style="font-size:14px;font-weight:500;color:var(--t)">Güncelleme Talebi</div>';
  ic += '<div style="font-size:9px;color:var(--t3);margin-top:2px">Onaylı teklif — değişiklik yönetici onayına gidecek</div></div>';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-guncelleme-modal\')?.remove()" style="font-size:22px;border:none;background:none;cursor:pointer;color:var(--t3);line-height:1">×</button>';
  ic += '</div><div style="padding:20px;display:flex;flex-direction:column;gap:12px">';
  ic += '<div style="background:#FAEEDA;border:0.5px solid #FAC775;border-radius:6px;padding:10px 14px;font-size:11px;color:#633806">Bu teklif onaylanmış durumda. Değişiklik talebiniz yöneticiye iletilecek, onaylanana kadar mevcut veriler korunacak.</div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">DEĞİŞİKLİK NEDENİ *</div>';
  ic += '<textarea id="sav2-gun-neden" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" placeholder="Neden güncelleme yapılmak isteniyor?" style="width:100%;height:80px;font-size:12px;padding:8px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);resize:none;font-family:inherit;box-sizing:border-box"></textarea>';
  ic += '</div>';
  ic += '<div><div style="font-size:8px;font-weight:500;color:var(--t3);letter-spacing:.06em;margin-bottom:4px">YENİ ALİŞ FİYATI (opsiyonel)</div>';
  ic += '<input id="sav2-gun-fiyat" placeholder="Yeni fiyat" value="' + _saEsc(t.alisF || '') + '" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="width:100%;font-size:12px;padding:7px 10px;border:0.5px solid var(--b);border-radius:5px;background:var(--s2);color:var(--t);font-family:inherit;box-sizing:border-box">';
  ic += '</div>';
  ic += '<div style="display:flex;gap:8px;justify-content:flex-end">';
  ic += '<button onclick="event.stopPropagation();document.getElementById(\'sav2-guncelleme-modal\')?.remove()" style="font-size:12px;padding:7px 14px;border:0.5px solid var(--b);border-radius:5px;background:transparent;cursor:pointer;font-family:inherit;color:var(--t2)">İptal</button>';
  ic += '<button onclick="event.stopPropagation();window._saV2GuncellemeGonder(\'' + id + '\')" style="font-size:12px;padding:7px 18px;border:none;border-radius:5px;background:#854F0B;color:#fff;cursor:pointer;font-family:inherit;font-weight:500">Yöneticiye Gönder</button>';
  ic += '</div></div></div>';
  modal.innerHTML = ic;
  document.body.appendChild(modal);
};

window._saV2GuncellemeGonder = function(id) {
  var neden = document.getElementById('sav2-gun-neden')?.value?.trim() || '';
  var yeniFiyat = document.getElementById('sav2-gun-fiyat')?.value?.trim() || '';
  if (!neden) { window.toast?.('Neden alanı zorunlu', 'warn'); return; }
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t) return;
  t.guncellemeTalep = {
    neden: neden,
    yeniFiyat: yeniFiyat,
    eskiFiyat: t.alisF,
    tarih: window._saNow?.(),
    talipAd: window._saCu?.()?.displayName || 'Kullanıcı',
    durum: 'bekliyor'
  };
  t.durum = 'guncelleme_bekliyor';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  document.getElementById('sav2-guncelleme-modal')?.remove();
  window.toast?.('Güncelleme talebi yöneticiye gönderildi', 'ok');
  if (typeof window.logActivity === 'function') window.logActivity('TEKLIF_GUNCELLEME_TALEP', { id: id, neden: neden });
  window.renderSatinAlmaV2?.();
};

window._saV2YoneticiGuncellemeOnayla = function(id) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t || !t.guncellemeTalep) return;
  var yf = t.guncellemeTalep.yeniFiyat;
  if (yf) t.alisF = yf;
  t.durum = 'onaylandi';
  t.guncellemeTalep.durum = 'onaylandi';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window.toast?.('Güncelleme onaylandı', 'ok');
  window.renderSatinAlmaV2?.();
};

window._saV2YoneticiGuncellemeReddet = function(id, aciklama) {
  var liste = window._saV2Load?.() || [];
  var t = liste.find(function(x) { return x.id === id; });
  if (!t || !t.guncellemeTalep) return;
  t.durum = 'onaylandi';
  t.guncellemeTalep.durum = 'reddedildi';
  t.guncellemeTalep.aciklama = aciklama || '';
  t.updatedAt = window._saNow?.();
  window._saV2Store?.(liste);
  window.toast?.('Güncelleme talebi reddedildi', 'warn');
  window.renderSatinAlmaV2?.();
};

