/* ════════════════════════════════════════════════════════════════
 * V187d — CARRIER TRACKING CONFIG (merkezi)
 * ════════════════════════════════════════════════════════════════
 * Armatör → tracking URL pattern haritası.
 *
 * KURALLAR:
 *   - Stored centrally (NOT per delivery)
 *   - Admin updates monthly
 *   - UI auto-generates tracking link using containerNo
 *
 * URL içinde {CONTAINER} placeholder'ı varsa, container no otomatik gömülür.
 * Yoksa base URL açılır → kullanıcı elle girer.
 *
 * Kullanım:
 *   var url = window.__buildTrackingUrl('MSC', 'MSCU1234567');
 *   → https://www.msc.com/track-a-shipment?agencyPath=msc&searchNumber=MSCU1234567
 *
 * ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Armatör → tracking URL pattern haritası.
   * Bilinen direkt-link pattern'leri ({CONTAINER} placeholder'lı), kalanlar base URL. */
  window.__carrierTrackingMap = {
    'MSC':         { url: 'https://www.msc.com/track-a-shipment?agencyPath=msc&searchNumber={CONTAINER}',                          direct: true  },
    'Maersk':      { url: 'https://www.maersk.com/tracking/{CONTAINER}',                                                            direct: true  },
    'CMA CGM':     { url: 'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference={CONTAINER}',             direct: true  },
    'COSCO':       { url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number={CONTAINER}',     direct: true  },
    'Hapag-Lloyd': { url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container={CONTAINER}', direct: true },
    'ZIM':         { url: 'https://www.zim.com/tools/track-a-shipment?consnumber={CONTAINER}',                                      direct: true  },
    'ONE':         { url: 'https://ecomm.one-line.com/ecom/CUP_HOM_3301.do',                                                        direct: false },
    'Evergreen':   { url: 'https://www.shipmentlink.com/servlet/TUF1_CargoTracking.do',                                             direct: false },
    'Yang Ming':   { url: 'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx',                         direct: false },
    'HMM':         { url: 'https://www.hmm21.com/cms/business/ebiz/trackTrace/trackTrace/index.jsp',                                direct: false },
    'PIL':         { url: 'https://www.pilship.com/shared/ajax/?fn=get_track_trace',                                                direct: false },
    'OOCL':        { url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx',                  direct: false },
    'Diger':       { url: '',                                                                                                       direct: false },
  };

  /* Tek noktadan URL üretici. Her iki wizard (eski + V186) bu fonksiyonu çağırır. */
  window.__buildTrackingUrl = function (armator, containerNo) {
    if (!armator) return '';
    var entry = (window.__carrierTrackingMap || {})[armator];
    if (!entry || !entry.url) return '';
    var url = entry.url;
    if (containerNo && url.indexOf('{CONTAINER}') !== -1) {
      return url.replace('{CONTAINER}', encodeURIComponent(String(containerNo).trim()));
    }
    /* Placeholder yok ya da container yok → sadece base URL'e gider, kullanıcı elle yazar */
    return url.replace('{CONTAINER}', '');
  };

  console.log('[CARRIER-TRACKING-MAP]', Object.keys(window.__carrierTrackingMap).length, 'armatör yüklendi');
})();
