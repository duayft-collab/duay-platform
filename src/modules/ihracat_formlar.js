/**
 * src/modules/ihracat_formlar.js — v1.0.0
 * Ihracat Formlar: PL, CI, Forwarder Teklif, Sigorta Teklif
 * Tarayicida DOCX uretimi (docx.js CDN)
 */
(function() {
'use strict';

// ── HELPERS ──────────────────────────────────────────────────
var D;
function _ensureD() { D = window.docx; return !!D; }

var NONE = { style: 'none', size: 0, color: 'FFFFFF' };
var THIN = { style: 'single', size: 1, color: '000000' };
var LIGHT = { style: 'single', size: 1, color: 'DDDDDD' };
var allNone = { top: NONE, bottom: NONE, left: NONE, right: NONE };
var CW = 14838;
var cellMargS = { top: 60, bottom: 60, left: 120, right: 120 };

function bold(t, sz) { sz = sz || 20; return new D.TextRun({ text: t, bold: true, size: sz, font: 'Arial' }); }
function reg(t, sz) { sz = sz || 18; return new D.TextRun({ text: t, size: sz, font: 'Arial' }); }
function muted(t, sz) { sz = sz || 16; return new D.TextRun({ text: t, size: sz, color: '999999', font: 'Arial' }); }
function label(t) { return new D.TextRun({ text: t, size: 14, color: '999999', allCaps: true, characterSpacing: 30, font: 'Arial' }); }

function p(runs, align, space) {
  align = align || 'left'; space = space !== undefined ? space : 60;
  return new D.Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: align, spacing: { before: 0, after: space } });
}
function blank(space) { return new D.Paragraph({ children: [], spacing: { before: 0, after: space || 120 } }); }

function hdrCell(text, w) {
  return new D.TableCell({
    children: [new D.Paragraph({ children: [label(text)], spacing: { before: 0, after: 40 } })],
    width: { size: w, type: 'dxa' },
    borders: { top: NONE, bottom: THIN, left: NONE, right: NONE },
    margins: cellMargS,
  });
}

function dataCell(runs, w, bot) {
  bot = bot !== false;
  return new D.TableCell({
    children: [new D.Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { before: 0, after: 40 } })],
    width: { size: w, type: 'dxa' },
    borders: bot ? { top: NONE, bottom: LIGHT, left: NONE, right: NONE } : allNone,
    margins: cellMargS,
  });
}

function dataCellC(runs, w, bot) {
  bot = bot !== false;
  return new D.TableCell({
    children: [new D.Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: 'center', spacing: { before: 0, after: 40 } })],
    width: { size: w, type: 'dxa' },
    borders: bot ? { top: NONE, bottom: LIGHT, left: NONE, right: NONE } : allNone,
    margins: cellMargS,
  });
}

function totalCell(runs, w) {
  return new D.TableCell({
    children: [new D.Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: 'center', spacing: { before: 0, after: 40 } })],
    width: { size: w, type: 'dxa' },
    borders: { top: THIN, bottom: THIN, left: NONE, right: NONE },
    margins: cellMargS,
  });
}

function totalCellR(runs, w) {
  return new D.TableCell({
    children: [new D.Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: 'right', spacing: { before: 0, after: 40 } })],
    width: { size: w, type: 'dxa' },
    borders: { top: THIN, bottom: THIN, left: NONE, right: NONE },
    margins: cellMargS,
  });
}

function tbl(rows, colWidths) {
  return new D.Table({ width: { size: CW, type: 'dxa' }, columnWidths: colWidths, rows: rows, borders: allNone });
}

function infoRow(key, val, w1, w2) {
  return new D.TableRow({ children: [
    new D.TableCell({ children: [p([muted(key, 16)], 'left', 40)], width: { size: w1, type: 'dxa' }, borders: { top: NONE, bottom: LIGHT, left: NONE, right: NONE }, margins: cellMargS }),
    new D.TableCell({ children: [p([reg(val, 17)], 'right', 40)], width: { size: w2, type: 'dxa' }, borders: { top: NONE, bottom: LIGHT, left: NONE, right: NONE }, margins: cellMargS }),
  ]});
}

var pageProps = {
  page: {
    size: { width: 16838, height: 11906 },
    margin: { top: 900, right: 1000, bottom: 900, left: 1000 }
  }
};

function headerTbl(title, no, sub) {
  return tbl([
    new D.TableRow({ children: [
      new D.TableCell({
        children: [p([bold('DUAY GLOBAL LLC', 28)], 'left', 40), p([muted(sub, 16)], 'left', 0)],
        width: { size: 9000, type: 'dxa' },
        borders: { top: NONE, bottom: THIN, left: NONE, right: NONE },
        margins: { top: 0, bottom: 100, left: 0, right: 0 },
      }),
      new D.TableCell({
        children: [p([bold(title, 36)], 'right', 40), p([muted(no, 16)], 'right', 0)],
        width: { size: 5838, type: 'dxa' },
        borders: { top: NONE, bottom: THIN, left: NONE, right: NONE },
        margins: { top: 0, bottom: 100, left: 0, right: 0 },
      }),
    ]})
  ], [9000, 5838]);
}

function signatureTbl() {
  return tbl([
    new D.TableRow({ children: [
      new D.TableCell({
        children: [p([label('Authorized Signature & Date')], 'left', 200), p([muted('_______________________________', 17)], 'left', 40), p([muted('___/___/2026', 16)], 'left', 0)],
        width: { size: 7000, type: 'dxa' },
        borders: { top: THIN, bottom: NONE, left: NONE, right: NONE },
        margins: { top: 80, bottom: 0, left: 0, right: 0 },
      }),
      new D.TableCell({
        children: [p([label('Company Stamp / Kase')], 'left', 200)],
        width: { size: 7838, type: 'dxa' },
        borders: { top: THIN, bottom: NONE, left: NONE, right: NONE },
        margins: { top: 80, bottom: 0, left: 0, right: 0 },
      }),
    ]})
  ], [7000, 7838]);
}

function checkLine(items) {
  var runs = [];
  items.forEach(function(item, i) {
    runs.push(new D.TextRun({ text: '[ ] ', size: 17, font: 'Arial' }));
    runs.push(new D.TextRun({ text: item + (i < items.length - 1 ? '     ' : ''), size: 17, font: 'Arial' }));
  });
  return new D.Paragraph({ children: runs, spacing: { before: 0, after: 80 } });
}

// ── FORM 1: PACKING LIST ─────────────────────────────────────
function makePackingList() {
  var mkRow = function(num, desc, pkg, qty, unit, net, gross, last) {
    return new D.TableRow({ children: [
      dataCellC([reg(num,17)], 400, !last), dataCell([reg(desc,17)], 3800, !last),
      dataCellC([reg(pkg,17)], 1600, !last), dataCellC([reg(qty,17)], 1200, !last),
      dataCellC([reg(unit,17)], 1200, !last), dataCellC([reg(net,17)], 1800, !last),
      dataCellC([reg(gross,17)], 1800, !last),
    ]});
  };
  return new D.Document({ sections: [{ properties: pageProps, children: [
    headerTbl('Packing List', 'PL-2026-______\nDate: ___/___/2026  ·  Ref: INV-2026-______', 'Uluslararasi Ticaret  ·  Istanbul, Turkey  ·  export@duayglobal.com'),
    blank(200),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [p([label('Shipper / Exporter')], 'left', 80), p([bold('Duay Global LLC',18)], 'left', 40), p([reg('[Adres]',17)], 'left', 40), p([reg('Istanbul, Turkey',17)], 'left', 40), p([muted('export@duayglobal.com',16)], 'left', 0)], width: { size: 6000, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Consignee / Buyer')], 'left', 80), p([bold('[Alici Firma]',18)], 'left', 40), p([reg('[Adres]',17)], 'left', 40), p([reg('[Sehir, Ulke]',17)], 'left', 0)], width: { size: 8838, type: 'dxa' }, borders: allNone, margins: cellMargS }),
    ]})], [6000, 8838]),
    blank(200),
    new D.Table({ width: { size: CW, type: 'dxa' }, columnWidths: [400,3800,1600,1200,1200,1800,1800], borders: allNone, rows: [
      new D.TableRow({ children: [hdrCell('#',400), hdrCell('Description of Goods',3800), hdrCell('Package Type',1600), hdrCell('Qty (Pkgs)',1200), hdrCell('Unit Qty',1200), hdrCell('Net Weight (kg)',1800), hdrCell('Gross Weight (kg)',1800)] }),
      mkRow('1','[Urun Aciklamasi]','Carton','___','___','___','___'),
      mkRow('2','[Urun Aciklamasi]','Pallet','___','___','___','___'),
      mkRow('3','[Urun Aciklamasi]','Carton','___','___','___','___', true),
      new D.TableRow({ children: [totalCellR([bold('',1)], 400), totalCellR([bold('',1)], 3800), totalCellR([bold('',1)], 1600), totalCell([bold('___',17)],1200), totalCell([bold('___',17)],1200), totalCell([bold('___ kg',17)],1800), totalCell([bold('___ kg',17)],1800)] }),
    ]}),
    blank(200),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [p([label('Container No')], 'left', 40), p([reg('_________________________',17)], 'left', 0)], width: { size: 4000, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Seal No')], 'left', 40), p([reg('_________________________',17)], 'left', 0)], width: { size: 4000, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Container Type')], 'left', 40), p([reg('[ ] 20DC    [ ] 40DC    [ ] 40HC',17)], 'left', 0)], width: { size: 6838, type: 'dxa' }, borders: allNone, margins: cellMargS }),
    ]})], [4000, 4000, 6838]),
    blank(300),
    signatureTbl(),
  ]}]});
}

// ── FORM 2: COMMERCIAL INVOICE ───────────────────────────────
function makeCommercialInvoice() {
  var mkRow = function(num, desc, qty, unit, up, amt, last) {
    return new D.TableRow({ children: [
      dataCellC([reg(num,17)], 400, !last), dataCell([reg(desc,17)], 5200, !last),
      dataCellC([reg(qty,17)], 1200, !last), dataCellC([reg(unit,17)], 1000, !last),
      dataCellC([reg(up,17)], 2000, !last), dataCellC([reg(amt,17)], 2000, !last),
    ]});
  };
  var subRow = function(lbl, val) {
    return new D.TableRow({ children: [
      new D.TableCell({ children: [p([muted(lbl,15)], 'right', 40)], columnSpan: 5, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([muted(val,15)], 'center', 40)], width: { size: 2000, type: 'dxa' }, borders: allNone, margins: cellMargS }),
    ]});
  };
  return new D.Document({ sections: [{ properties: pageProps, children: [
    headerTbl('Commercial Invoice', 'INV-2026-______\nDate: ___/___/2026  ·  L/C: _____________', 'Istanbul, Turkey  ·  Tax No: _____________'),
    blank(200),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [p([label('Seller')], 'left', 80), p([bold('Duay Global LLC',18)], 'left', 40), p([reg('Istanbul, Turkey',17)], 'left', 0)], width: { size: 3500, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Buyer')], 'left', 80), p([bold('[Alici Firma]',18)], 'left', 40), p([reg('[Adres]',17)], 'left', 40), p([reg('[Ulke]',17)], 'left', 0)], width: { size: 3500, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Shipment')], 'left', 80), p([reg('POD: [___]',17)], 'left', 40), p([reg('Incoterms: [___]',17)], 'left', 0)], width: { size: 3500, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Payment')], 'left', 80), p([reg('[ ] L/C at Sight',17)], 'left', 40), p([reg('[ ] T/T in Advance',17)], 'left', 40), p([reg('[ ] D/P  [ ] D/A',17)], 'left', 0)], width: { size: 4338, type: 'dxa' }, borders: allNone, margins: cellMargS }),
    ]})], [3500, 3500, 3500, 4338]),
    blank(200),
    new D.Table({ width: { size: CW, type: 'dxa' }, columnWidths: [400,5200,1200,1000,2000,2000], borders: allNone, rows: [
      new D.TableRow({ children: [hdrCell('#',400), hdrCell('Description of Goods',5200), hdrCell('Qty',1200), hdrCell('Unit',1000), hdrCell('Unit Price (USD)',2000), hdrCell('Amount (USD)',2000)] }),
      mkRow('1','[Urun Adi ve Aciklamasi]','___','___','$_______','$_______'),
      mkRow('2','[Urun Adi ve Aciklamasi]','___','___','$_______','$_______'),
      mkRow('3','[Urun Adi ve Aciklamasi]','___','___','$_______','$_______', true),
      subRow('Sub Total','$_______'),
      subRow('Freight','$_______'),
      subRow('Insurance','$_______'),
      new D.TableRow({ children: [totalCellR([bold('Total (CIF)',18)],11800), totalCell([bold('$_______',18)],2000)] }),
    ]}),
    blank(200),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [p([label('Bank Details')], 'left', 80), p([reg('Bank: ___________________',17)], 'left', 40), p([reg('Account: Duay Global LLC',17)], 'left', 40), p([reg('IBAN: ___________________',17)], 'left', 40), p([reg('SWIFT: ___________________',17)], 'left', 0)], width: { size: 6000, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Declaration')], 'left', 80), p([muted('We hereby certify that the goods described herein are of Turkish origin and that the particulars given in this invoice are true and correct.',15)], 'left', 0)], width: { size: 8838, type: 'dxa' }, borders: allNone, margins: cellMargS }),
    ]})], [6000, 8838]),
    blank(300),
    signatureTbl(),
  ]}]});
}

// ── FORM 3: FORWARDER TEKLIF ─────────────────────────────────
function makeFreightRequest() {
  var mkRow = function(u,p2,k,b,n,h2,boy,last) {
    return new D.TableRow({ children: [
      dataCell([reg(u,17)], 3200, !last), dataCellC([reg(p2,17)], 2200, !last),
      dataCellC([reg(k,17)], 1200, !last), dataCellC([reg(b,17)], 1700, !last),
      dataCellC([reg(n,17)], 1700, !last), dataCellC([reg(h2,17)], 1700, !last),
      dataCellC([reg(boy,17)], 1600, !last),
    ]});
  };
  return new D.Document({ sections: [{ properties: pageProps, children: [
    headerTbl('Freight Rate Request', 'FRQ-2026-______  ·  ___/___/2026', 'Freight Rate Request Form'),
    blank(200),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [
        new D.Table({ width: { size: 6000, type: 'dxa' }, columnWidths: [2400,3600], rows: [
          infoRow('Talep Eden','Duay Global LLC',2400,3600),
          infoRow('Ilgili Kisi','[Ad Soyad]',2400,3600),
          infoRow('Email','export@duayglobal.com',2400,3600),
        ], borders: allNone }),
      ], width: { size: 6000, type: 'dxa' }, borders: allNone, margins: { top:0, bottom:0, left:0, right:200 } }),
      new D.TableCell({ children: [
        new D.Table({ width: { size: 6000, type: 'dxa' }, columnWidths: [2400,3600], rows: [
          infoRow('Forwarder Firma','___________________',2400,3600),
          infoRow('Ilgili Kisi','___________________',2400,3600),
          infoRow('Teklif Son Tarihi','___/___/2026',2400,3600),
        ], borders: allNone }),
      ], width: { size: 8838, type: 'dxa' }, borders: allNone, margins: { top:0, bottom:0, left:200, right:0 } }),
    ]})], [6000, 8838]),
    blank(160),
    new D.Paragraph({ children: [label('Tasima Turu  &  Guzergah')], spacing: { before: 0, after: 60 }, border: { bottom: THIN } }),
    blank(80),
    checkLine(['Deniz FCL','Deniz LCL','Hava AWB','Kara FTL','Parsiyel']),
    p([reg('POL: ________________________     POD: ________________________     Tahmini ETD: ___/___/2026',17)], 'left', 160),
    new D.Table({ width: { size: CW, type: 'dxa' }, columnWidths: [3200,2200,1200,1700,1700,1700,1600], borders: allNone, rows: [
      new D.TableRow({ children: [hdrCell('Urun Adi',3200), hdrCell('Package Type',2200), hdrCell('Koli Adedi',1200), hdrCell('Brut KG',1700), hdrCell('Net KG',1700), hdrCell('Hacim m3',1700), hdrCell('Boyut (cm)',1600)] }),
      mkRow('[Urun 1]','Carton / Pallet','___','___','___','___','___x___x___'),
      mkRow('[Urun 2]','Carton / Pallet','___','___','___','___','___x___x___', true),
      new D.TableRow({ children: [totalCellR([bold('Toplam',17)],5400), totalCell([bold('___',17)],1200), totalCell([bold('___',17)],1700), totalCell([bold('___',17)],1700), totalCell([bold('___',17)],1700), totalCell([bold('—',17)],1600)] }),
    ]}),
    blank(160),
    new D.Paragraph({ children: [label('Teklif Kapsami')], spacing: { before: 0, after: 60 }, border: { bottom: THIN } }),
    blank(80),
    checkLine(['Navlun','Origin THC','Dest. THC','BL / AWB','Gumruk Musavirligi','Ic Nakliye (Origin)','Ic Nakliye (Dest.)','Sigorta']),
    blank(100),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [p([label('Incoterms')], 'left', 60), checkLine(['FOB Istanbul','EXW','CIF','Diger: _______________'])], width: { size: 7000, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Mal Degeri (CIF bazi)')], 'left', 60), p([reg('USD $________________________  (sigorta hesabi icin)',17)], 'left', 0)], width: { size: 7838, type: 'dxa' }, borders: allNone, margins: cellMargS }),
    ]})], [7000, 7838]),
    blank(280),
    signatureTbl(),
  ]}]});
}

// ── FORM 4: SIGORTA TEKLIF ───────────────────────────────────
function makeInsuranceRequest() {
  var mkRow = function(m,a,adet,kg,m3,deger,last) {
    return new D.TableRow({ children: [
      dataCell([reg(m,17)], 3200, !last), dataCellC([reg(a,17)], 2200, !last),
      dataCellC([reg(adet,17)], 1200, !last), dataCellC([reg(kg,17)], 1700, !last),
      dataCellC([reg(m3,17)], 1700, !last), dataCellC([reg(deger,17)], 2600, !last),
    ]});
  };
  return new D.Document({ sections: [{ properties: pageProps, children: [
    headerTbl('Insurance Quote Request', 'IRQ-2026-______  ·  ___/___/2026', 'Marine / Cargo Insurance Quote Request'),
    blank(200),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [
        new D.Table({ width: { size: 6000, type: 'dxa' }, columnWidths: [2600,3400], rows: [
          infoRow('Sigorta Ettiren','Duay Global LLC',2600,3400),
          infoRow('Ilgili Kisi','___________________',2600,3400),
          infoRow('Invoice No','INV-2026-_______',2600,3400),
        ], borders: allNone }),
      ], width: { size: 6000, type: 'dxa' }, borders: allNone, margins: { top:0, bottom:0, left:0, right:200 } }),
      new D.TableCell({ children: [
        new D.Table({ width: { size: 6000, type: 'dxa' }, columnWidths: [2600,3400], rows: [
          infoRow('Yukleme / Varis','___________ -> ___________',2600,3400),
          infoRow('ETD / ETA','___/___/2026 -> ___/___/2026',2600,3400),
          infoRow('Tasima Turu','[ ] Deniz   [ ] Hava   [ ] Kara',2600,3400),
        ], borders: allNone }),
      ], width: { size: 8838, type: 'dxa' }, borders: allNone, margins: { top:0, bottom:0, left:200, right:0 } }),
    ]})], [6000, 8838]),
    blank(160),
    new D.Paragraph({ children: [label('Mal Bilgileri / Cargo Information')], spacing: { before: 0, after: 60 }, border: { bottom: THIN } }),
    blank(80),
    new D.Table({ width: { size: CW, type: 'dxa' }, columnWidths: [3200,2200,1200,1700,1700,2600], borders: allNone, rows: [
      new D.TableRow({ children: [hdrCell('Mal Cinsi',3200), hdrCell('Ambalaj',2200), hdrCell('Adet',1200), hdrCell('Brut KG',1700), hdrCell('Hacim m3',1700), hdrCell('Fatura Degeri (USD)',2600)] }),
      mkRow('[Urun 1]','___________','___','___','___','$___________'),
      mkRow('[Urun 2]','___________','___','___','___','$___________', true),
      new D.TableRow({ children: [totalCellR([bold('Toplam Fatura Degeri',17)],10000), totalCell([bold('$___________',17)],2600)] }),
    ]}),
    blank(160),
    new D.Paragraph({ children: [label('Sigorta Degeri')], spacing: { before: 0, after: 60 }, border: { bottom: THIN } }),
    blank(80),
    tbl([new D.TableRow({ children: [
      new D.TableCell({ children: [p([label('CIF Degeri')], 'left', 40), p([reg('USD $___________',17)], 'left', 0)], width: { size: 3500, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Sigorta Degeri (CIF + %10)')], 'left', 40), p([reg('USD $___________',17)], 'left', 0)], width: { size: 3500, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('Para Birimi')], 'left', 40), p([reg('[ ] USD   [ ] EUR   [ ] TRY',17)], 'left', 0)], width: { size: 3500, type: 'dxa' }, borders: allNone, margins: cellMargS }),
      new D.TableCell({ children: [p([label('B/L No  /  AWB No')], 'left', 40), p([reg('___________________',17)], 'left', 0)], width: { size: 4338, type: 'dxa' }, borders: allNone, margins: cellMargS }),
    ]})], [3500, 3500, 3500, 4338]),
    blank(160),
    new D.Paragraph({ children: [label('Teminat Turu / Coverage')], spacing: { before: 0, after: 60 }, border: { bottom: THIN } }),
    blank(80),
    checkLine(['All Risks (ICC A)','ICC B','ICC C','Hirsizlik (Theft)','Savas Riski (War Risk)','Grev / SRCC','Depo Depo (W/W)']),
    blank(120),
    p([muted('Beyan / Declaration: Yukaridaki bilgiler dogru ve eksiksizdir. We hereby declare that all information provided above is true and complete.',15)], 'left', 200),
    signatureTbl(),
  ]}]});
}

// ── DOWNLOAD HELPER ──────────────────────────────────────────
function downloadDocx(doc, filename) {
  D.Packer.toBlob(doc).then(function(buf) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(buf);
    a.download = filename;
    a.click();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
    window.toast?.(filename + ' indirildi', 'ok');
  }).catch(function(e) {
    console.error('[ihracat_formlar] DOCX hata:', e);
    window.toast?.('DOCX olusturulamadi: ' + e.message, 'err');
  });
}

// ── RENDER ───────────────────────────────────────────────────
window.renderIhracatFormlar = function() {
  var panel = document.getElementById('panel-ihracat-formlar');
  if (!panel) return;
  panel.innerHTML = '<div style="padding:16px 24px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div><div style="font-size:16px;font-weight:700;color:var(--t)">Ihracat Formlari</div><div style="font-size:11px;color:var(--t3)">Ultra Minimal · A4 Yatay · Duay Global LLC sablonlari</div></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + _formKart('Packing List', 'Ambalaj ve agirlik bilgileri · Alici ve gumruk icin', 'Shipper · Consignee · Urun tablosu · Package Type · Net/Gross KG · Konteyner bilgisi', 'pl')
    + _formKart('Commercial Invoice', 'Satis faturasi · Gumruk beyani icin temel belge', 'Seller · Buyer · POD · Incoterms · Payment · Urun tablosu · Banka bilgisi · Beyan', 'ci')
    + _formKart('Forwarder Teklif Talep', 'Nakliye firmasina fiyat talebi', 'Iletisim · Tasima turu · Guzergah · Yuk tablosu · Kapsam · Incoterms', 'frq')
    + _formKart('Sigorta Teklif Talep', 'Nakliyat sigortasi fiyat talebi', 'Sevkiyat · Mal bilgisi · CIF degeri · Teminat turu · ICC A/B/C · Beyan', 'irq')
    + '</div>'
    + '<div style="margin-top:12px;padding:10px 14px;background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:8px;font-size:11px;color:#0C447C">Formlar A4 yatay, Ultra Minimal Ghost tasarimi. Indirdikten sonra Word\'de acip bilgileri doldurun.</div>'
    + '</div>';
};

function _formKart(baslik, aciklama, icerik, tip) {
  return '<div style="border:0.5px solid var(--b);border-radius:10px;overflow:hidden">'
    + '<div style="padding:14px 16px;border-bottom:0.5px solid var(--b)"><div style="font-size:13px;font-weight:500">' + baslik + '</div><div style="font-size:11px;color:var(--t3);margin-top:3px">' + aciklama + '</div></div>'
    + '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:6px">'
    + '<div style="font-size:11px;color:var(--t2)">' + icerik + '</div>'
    + '<button class="btn btnp" onclick="event.stopPropagation();window._ihrFormIndir(\'' + tip + '\')" style="margin-top:6px;width:100%">Indir — ' + baslik + '.docx</button>'
    + '</div></div>';
}

window._ihrFormIndir = function(tip) {
  if (!_ensureD()) { window.toast?.('DOCX kutuphanesi yuklenmedi — sayfa yenile', 'err'); return; }
  window.toast?.('Hazirlaniyor...', 'ok');
  var map = {
    pl:  { make: makePackingList,       name: 'DUAY_Packing_List.docx' },
    ci:  { make: makeCommercialInvoice, name: 'DUAY_Commercial_Invoice.docx' },
    frq: { make: makeFreightRequest,    name: 'DUAY_Forwarder_Teklif_Talep.docx' },
    irq: { make: makeInsuranceRequest,  name: 'DUAY_Sigorta_Teklif_Talep.docx' },
  };
  var entry = map[tip];
  if (!entry) return;
  try {
    downloadDocx(entry.make(), entry.name);
  } catch(e) {
    console.error('[ihracat_formlar]', e);
    window.toast?.('Hata: ' + e.message, 'err');
  }
};

})();
