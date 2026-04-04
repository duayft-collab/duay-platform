/**
 * src/modules/ihracat_formlar.js — v2.0.0
 * Ihracat Formlar: PL, CI, Forwarder Teklif, Sigorta Teklif
 * v2: Tum formlar dosya verisinden otomatik dolar
 * Tarayicida DOCX uretimi (docx.js CDN)
 */
(function() {
'use strict';

var D;
function _ensureD() {
  D = window.docx || window.Document;
  if (!D || !D.Packer) { window.toast?.('DOCX kutuphanesi yuklenmedi — sayfa yenile', 'err'); return false; }
  return true;
}

var NONE  = { style: 'none',   size: 0, color: 'FFFFFF' };
var THIN  = { style: 'single', size: 1, color: '000000' };
var LIGHT = { style: 'single', size: 1, color: 'DDDDDD' };
var allNone = { top: NONE, bottom: NONE, left: NONE, right: NONE };
var CW = 14838;
var cellMargS = { top: 60, bottom: 60, left: 120, right: 120 };

function bold(t, sz)  { return new D.TextRun({ text: String(t||''), bold: true, size: sz||20, font: 'Arial' }); }
function reg(t, sz)   { return new D.TextRun({ text: String(t||''), size: sz||18, font: 'Arial' }); }
function muted(t, sz) { return new D.TextRun({ text: String(t||''), size: sz||16, color: '999999', font: 'Arial' }); }
function label(t)     { return new D.TextRun({ text: String(t||''), size: 14, color: '999999', allCaps: true, characterSpacing: 30, font: 'Arial' }); }

function p(runs, al, sp) { return new D.Paragraph({ children: Array.isArray(runs)?runs:[runs], alignment: al||'left', spacing: { before:0, after: sp!==undefined?sp:60 } }); }
function blank(sp)       { return new D.Paragraph({ children: [], spacing: { before:0, after: sp||120 } }); }

function hdrCell(t, w)   { return new D.TableCell({ children:[new D.Paragraph({children:[label(t)],spacing:{before:0,after:40}})], width:{size:w,type:'dxa'}, borders:{top:NONE,bottom:THIN,left:NONE,right:NONE}, margins:cellMargS }); }
function dataCell(r,w,b) { b=b!==false; return new D.TableCell({ children:[new D.Paragraph({children:Array.isArray(r)?r:[r],spacing:{before:0,after:40}})], width:{size:w,type:'dxa'}, borders:b?{top:NONE,bottom:LIGHT,left:NONE,right:NONE}:allNone, margins:cellMargS }); }
function dataCellC(r,w,b){ b=b!==false; return new D.TableCell({ children:[new D.Paragraph({children:Array.isArray(r)?r:[r],alignment:'center',spacing:{before:0,after:40}})], width:{size:w,type:'dxa'}, borders:b?{top:NONE,bottom:LIGHT,left:NONE,right:NONE}:allNone, margins:cellMargS }); }
function totalCell(r,w)  { return new D.TableCell({ children:[new D.Paragraph({children:Array.isArray(r)?r:[r],alignment:'center',spacing:{before:0,after:40}})], width:{size:w,type:'dxa'}, borders:{top:THIN,bottom:THIN,left:NONE,right:NONE}, margins:cellMargS }); }
function totalCellR(r,w) { return new D.TableCell({ children:[new D.Paragraph({children:Array.isArray(r)?r:[r],alignment:'right',spacing:{before:0,after:40}})], width:{size:w,type:'dxa'}, borders:{top:THIN,bottom:THIN,left:NONE,right:NONE}, margins:cellMargS }); }
function tbl(rows, cw)   { return new D.Table({ width:{size:CW,type:'dxa'}, columnWidths:cw, rows:rows, borders:allNone }); }
function infoRow(k,v,w1,w2) { return new D.TableRow({ children:[ new D.TableCell({children:[p([muted(k,16)],'left',40)],width:{size:w1,type:'dxa'},borders:{top:NONE,bottom:LIGHT,left:NONE,right:NONE},margins:cellMargS}), new D.TableCell({children:[p([reg(v,17)],'right',40)],width:{size:w2,type:'dxa'},borders:{top:NONE,bottom:LIGHT,left:NONE,right:NONE},margins:cellMargS}) ]}); }

var pageProps = { page: { size:{width:16838,height:11906}, margin:{top:900,right:1000,bottom:900,left:1000} } };

function headerTbl(title, no, sub) {
  return tbl([ new D.TableRow({ children:[
    new D.TableCell({ children:[p([bold('DUAY GLOBAL LLC',28)],'left',40),p([muted(sub,16)],'left',0)], width:{size:9000,type:'dxa'}, borders:{top:NONE,bottom:THIN,left:NONE,right:NONE}, margins:{top:0,bottom:100,left:0,right:0} }),
    new D.TableCell({ children:[p([bold(title,36)],'right',40),p([muted(no,16)],'right',0)], width:{size:5838,type:'dxa'}, borders:{top:NONE,bottom:THIN,left:NONE,right:NONE}, margins:{top:0,bottom:100,left:0,right:0} }),
  ]})], [9000,5838]);
}
function signatureTbl() {
  return tbl([ new D.TableRow({ children:[
    new D.TableCell({ children:[p([label('Authorized Signature — Duay Global LLC')],'left',200),p([muted('_______________________________',17)],'left',40),p([muted('___/___/2026',16)],'left',0)], width:{size:CW,type:'dxa'}, borders:{top:THIN,bottom:NONE,left:NONE,right:NONE}, margins:{top:80,bottom:0,left:0,right:0} }),
  ]})], [CW]);
}
function checkLine(items) {
  var r=[]; items.forEach(function(it,i){ r.push(new D.TextRun({text:'[ ] ',size:17,font:'Arial'})); r.push(new D.TextRun({text:it+(i<items.length-1?'     ':''),size:17,font:'Arial'})); });
  return new D.Paragraph({ children:r, spacing:{before:0,after:80} });
}
function _fmtDate(s) { if(!s)return '___/___/____'; var d=new Date(s); if(isNaN(d))return s; return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear(); }
function _todayFmt() { return _fmtDate(new Date().toISOString()); }
function _fmtMoney(v,c) { var n=parseFloat(v)||0; return (c||'USD')+' '+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

function _sortU(urunler) { return urunler.slice().sort(function(a,b){ return (parseInt(a.konteyner_sira)||99)-(parseInt(b.konteyner_sira)||99); }); }

// ════════════════════════════════════════════════════════════════
// FORM 1: PACKING LIST
// ════════════════════════════════════════════════════════════════
function makePackingList(dosya, urunler, bl) {
  dosya=dosya||{}; urunler=urunler||[]; bl=bl||{};
  var plNo=(dosya.dosyaNo||'______').replace('IHR-','PL-');
  var invNo=(dosya.dosyaNo||'______').replace('IHR-','INV-');
  var tarih=_fmtDate(dosya.bitis_tarihi)||_todayFmt();
  var konsigne=bl.consignee||dosya.musteriAd||'[Consignee]';
  var pol=dosya.yukleme_limani||'Istanbul, Turkey';
  var pod=dosya.varis_limani||'[Varis Limani]';
  var kontNo=bl.konteyner_no||'_________________________';
  var sealNo=bl.seal_no||'_________________________';
  var kontTur=dosya.konteyner_turu||'[ ] 20DC    [ ] 40DC    [ ] 40HC';

  var totKoli=0,totBrut=0,totNet=0;
  urunler.forEach(function(u){ totKoli+=parseInt(u.koli_adet)||0; totBrut+=parseFloat(u.brut_kg)||0; totNet+=parseFloat(u.net_kg)||0; });

  var rows=[];
  _sortU(urunler).forEach(function(u,i){
    var last=i===urunler.length-1;
    var desc=u.standart_urun_adi||u.fatura_urun_adi||u.aciklama||u.urun_kodu||'[Urun]';
    rows.push(new D.TableRow({children:[
      dataCellC([reg(String(i+1),17)],400,!last), dataCell([reg(desc,17)],3800,!last),
      dataCellC([reg(u.paket_turu||'Carton',17)],1600,!last),
      dataCellC([reg(String(parseInt(u.koli_adet)||'—'),17)],1200,!last),
      dataCellC([reg(String(parseFloat(u.miktar)||'—')+' '+(u.birim||'PCS'),17)],1200,!last),
      dataCellC([reg((parseFloat(u.net_kg)||0).toFixed(2),17)],1800,!last),
      dataCellC([reg((parseFloat(u.brut_kg)||0).toFixed(2),17)],1800,!last),
    ]}));
  });
  if(!rows.length) rows.push(new D.TableRow({children:[ dataCellC([muted('—',17)],400,false),dataCell([muted('[Urun girilmedi]',17)],3800,false), dataCellC([muted('—',17)],1600,false),dataCellC([muted('—',17)],1200,false), dataCellC([muted('—',17)],1200,false),dataCellC([muted('—',17)],1800,false),dataCellC([muted('—',17)],1800,false) ]}));
  rows.push(new D.TableRow({children:[ totalCellR([bold('',1)],400),totalCellR([bold('',1)],3800),totalCellR([bold('',1)],1600), totalCell([bold(String(totKoli),17)],1200),totalCell([bold('',17)],1200), totalCell([bold(totNet.toFixed(2)+' kg',17)],1800),totalCell([bold(totBrut.toFixed(2)+' kg',17)],1800) ]}));

  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Packing List',plNo+'\nDate: '+tarih+'  ·  Ref: '+invNo,'Uluslararasi Ticaret  ·  '+pol+'  ·  export@duayglobal.com'),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Shipper / Exporter')],'left',80),p([bold('Duay Global LLC',18)],'left',40),p([reg(pol,17)],'left',40),p([muted('export@duayglobal.com',16)],'left',0)],width:{size:6000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Consignee / Buyer')],'left',80),p([bold(konsigne,18)],'left',40),p([reg(pod,17)],'left',0)],width:{size:8838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[6000,8838]),
    blank(200),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[400,3800,1600,1200,1200,1800,1800],borders:allNone,
      rows:[new D.TableRow({children:[hdrCell('#',400),hdrCell('Description of Goods',3800),hdrCell('Package Type',1600),hdrCell('Qty (Pkgs)',1200),hdrCell('Unit Qty',1200),hdrCell('Net Weight (kg)',1800),hdrCell('Gross Weight (kg)',1800)]})].concat(rows)}),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Container No')],'left',40),p([reg(kontNo,17)],'left',0)],width:{size:4000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Seal No')],'left',40),p([reg(sealNo,17)],'left',0)],width:{size:4000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Container Type')],'left',40),p([reg(kontTur,17)],'left',0)],width:{size:6838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[4000,4000,6838]),
    blank(300), signatureTbl(),
  ]}]});
}

// ════════════════════════════════════════════════════════════════
// FORM 2: COMMERCIAL INVOICE
// ════════════════════════════════════════════════════════════════
function makeCommercialInvoice(dosya, urunler) {
  dosya=dosya||{}; urunler=urunler||[];
  var ciNo=(dosya.dosyaNo||'______').replace('IHR-','INV-');
  var tarih=_fmtDate(dosya.bitis_tarihi)||_todayFmt();
  var alici=dosya.musteriAd||'[Alici Firma]';
  var pod=dosya.varis_limani||'[POD]';
  var inco=dosya.teslim_sekli||'CIF';

  var toplamUSD=0,toplamEUR=0;
  urunler.forEach(function(u){ var t=(parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0); if((u.doviz||'USD')==='USD')toplamUSD+=t; else toplamEUR+=t; });
  var anaKur=toplamUSD>=toplamEUR?'USD':'EUR';
  var anaTop=anaKur==='USD'?toplamUSD:toplamEUR;

  // Kolonlar: #, Description, Qty, Unit, Unit Price, Total
  var colW = [600, 6000, 1200, 1000, 3000, 3038];
  var rows=[];
  _sortU(urunler).forEach(function(u,i){
    var last=i===urunler.length-1;
    var desc=u.standart_urun_adi||u.fatura_urun_adi||u.aciklama||'[Urun]';
    var cur=u.doviz||'USD';
    var up=(parseFloat(u.birim_fiyat)||0).toFixed(2);
    var amt=((parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0)).toFixed(2);
    rows.push(new D.TableRow({children:[
      dataCellC([reg(String(i+1),17)],colW[0],!last),
      dataCell([reg(desc,17)],colW[1],!last),
      dataCellC([reg(String(parseFloat(u.miktar)||'—'),17)],colW[2],!last),
      dataCellC([reg(u.birim||'PCS',17)],colW[3],!last),
      dataCellC([reg(cur+' '+up,17)],colW[4],!last),
      dataCellC([reg(cur+' '+amt,17)],colW[5],!last),
    ]}));
  });
  if(!rows.length) rows.push(new D.TableRow({children:[ dataCellC([muted('—',17)],colW[0],false),dataCell([muted('[Urun girilmedi]',17)],colW[1],false), dataCellC([muted('—',17)],colW[2],false),dataCellC([muted('—',17)],colW[3],false), dataCellC([muted('—',17)],colW[4],false),dataCellC([muted('—',17)],colW[5],false) ]}));

  var subRow=function(l,v){ return new D.TableRow({children:[ new D.TableCell({children:[p([muted(l,15)],'right',40)],columnSpan:5,borders:allNone,margins:cellMargS}), new D.TableCell({children:[p([muted(v,15)],'center',40)],width:{size:colW[5],type:'dxa'},borders:allNone,margins:cellMargS}) ]}); };

  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Commercial Invoice',ciNo+'\nDate: '+tarih,'Duay Global LLC  ·  export@duayglobal.com'),
    blank(200),
    // Sadece Seller + Buyer (Shipment ve Payment bloklari kaldirildi)
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Seller')],'left',80),p([bold('Duay Global LLC',18)],'left',40),p([reg('Istanbul, Turkey',17)],'left',40),p([muted('export@duayglobal.com',16)],'left',0)],width:{size:7000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Buyer & Consignee')],'left',80),p([bold(alici,18)],'left',40),p([reg(pod,17)],'left',0)],width:{size:7838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[7000,7838]),
    blank(200),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:colW,borders:allNone,
      rows:[new D.TableRow({children:[hdrCell('#',colW[0]),hdrCell('Description of Goods',colW[1]),hdrCell('Qty',colW[2]),hdrCell('Unit',colW[3]),hdrCell('Unit Price ('+anaKur+')',colW[4]),hdrCell('Total ('+anaKur+')',colW[5])]})].concat(rows).concat([
        subRow('Sub Total',_fmtMoney(anaTop,anaKur)),
        subRow('Freight','—'),
        subRow('Insurance','—'),
        new D.TableRow({children:[ totalCellR([bold('Total ('+inco+')',18)],colW[0]+colW[1]+colW[2]+colW[3]+colW[4]), totalCell([bold(_fmtMoney(anaTop,anaKur),18)],colW[5]) ]}),
      ])}),
    blank(200),
    // Beyan notu
    p([muted('We hereby certify that the goods described herein are of Turkish origin and the price stated is the true commercial value.',15)],'left',200),
    blank(200),
    signatureTbl(),
  ]}]});
}

// ════════════════════════════════════════════════════════════════
// FORM 2B: PROFORMA INVOICE
function makeProformaInvoice(dosya, urunler) {
  dosya=dosya||{}; urunler=urunler||[];
  var piNo=(dosya.dosyaNo||'______').replace('IHR-','PI-');
  var tarih=_fmtDate(dosya.bitis_tarihi)||_todayFmt();
  var alici=dosya.musteriAd||'[Alici]';
  var pod=dosya.varis_limani||'[POD]';
  var inco=dosya.teslim_sekli||'FOB';
  var colW=[600,6000,1200,1000,3000,3038];
  var toplamUSD=0,toplamEUR=0;
  urunler.forEach(function(u){var t=(parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0);if((u.doviz||'USD')==='USD')toplamUSD+=t;else toplamEUR+=t;});
  var anaKur=toplamUSD>=toplamEUR?'USD':'EUR';var anaTop=anaKur==='USD'?toplamUSD:toplamEUR;
  var rows=[];
  _sortU(urunler).forEach(function(u,i){var last=i===urunler.length-1;var desc=u.standart_urun_adi||u.aciklama||'[Urun]';var cur=u.doviz||'USD';var up=(parseFloat(u.birim_fiyat)||0).toFixed(2);var amt=((parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0)).toFixed(2);rows.push(new D.TableRow({children:[dataCellC([reg(String(i+1),17)],colW[0],!last),dataCell([reg(desc,17)],colW[1],!last),dataCellC([reg(String(parseFloat(u.miktar)||'—'),17)],colW[2],!last),dataCellC([reg(u.birim||'PCS',17)],colW[3],!last),dataCellC([reg(cur+' '+up,17)],colW[4],!last),dataCellC([reg(cur+' '+amt,17)],colW[5],!last)]}));});
  if(!rows.length)rows.push(new D.TableRow({children:[dataCellC([muted('—',17)],colW[0],false),dataCell([muted('[Urun yok]',17)],colW[1],false),dataCellC([muted('—',17)],colW[2],false),dataCellC([muted('—',17)],colW[3],false),dataCellC([muted('—',17)],colW[4],false),dataCellC([muted('—',17)],colW[5],false)]}));
  var subRow=function(l,v){return new D.TableRow({children:[new D.TableCell({children:[p([muted(l,15)],'right',40)],columnSpan:5,borders:allNone,margins:cellMargS}),new D.TableCell({children:[p([muted(v,15)],'center',40)],width:{size:colW[5],type:'dxa'},borders:allNone,margins:cellMargS})]});};
  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Proforma Invoice',piNo+'\nDate: '+tarih,'Duay Global LLC  ·  export@duayglobal.com'),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Seller')],'left',80),p([bold('Duay Global LLC',18)],'left',40),p([reg('Istanbul, Turkey',17)],'left',0)],width:{size:7000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Buyer')],'left',80),p([bold(alici,18)],'left',40),p([reg(pod,17)],'left',0)],width:{size:7838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[7000,7838]),
    blank(200),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:colW,borders:allNone,rows:[new D.TableRow({children:[hdrCell('#',colW[0]),hdrCell('Description',colW[1]),hdrCell('Qty',colW[2]),hdrCell('Unit',colW[3]),hdrCell('Unit Price',colW[4]),hdrCell('Total',colW[5])]})].concat(rows).concat([subRow('Teklif Toplami',_fmtMoney(anaTop,anaKur)),new D.TableRow({children:[totalCellR([bold('Grand Total ('+inco+')',18)],colW[0]+colW[1]+colW[2]+colW[3]+colW[4]),totalCell([bold(_fmtMoney(anaTop,anaKur),18)],colW[5])]})])}),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Bank Details')],'left',80),p([reg('Bank: ___________________',17)],'left',40),p([reg('IBAN: ___________________',17)],'left',40),p([reg('SWIFT: __________________',17)],'left',0)],width:{size:7000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Terms')],'left',80),p([reg('Payment: '+inco,17)],'left',40),p([reg('Validity: 30 days',17)],'left',40),p([reg('Delivery: '+_fmtDate(dosya.bitis_tarihi),17)],'left',0)],width:{size:7838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[7000,7838]),
    blank(300),signatureTbl(),
  ]}]});
}

// FORM 2C: SHIPPING INSTRUCTION / SEVK EMRI
function makeShippingInstruction(dosya, urunler) {
  dosya=dosya||{};urunler=urunler||[];
  var no=(dosya.dosyaNo||'______').replace('IHR-','SEVK-');
  var pol=dosya.yukleme_limani||'Istanbul, Turkey';var pod=dosya.varis_limani||'[POD]';
  var totBrut=0,totM3=0,totKoli=0;
  urunler.forEach(function(u){totBrut+=parseFloat(u.brut_kg)||0;totM3+=parseFloat(u.hacim_m3)||0;totKoli+=parseInt(u.koli_adet)||0;});
  var rows=[];
  _sortU(urunler).forEach(function(u,i){var last=i===urunler.length-1;rows.push(new D.TableRow({children:[dataCellC([reg(String(i+1),17)],400,!last),dataCell([reg(u.standart_urun_adi||u.aciklama||'[Urun]',17)],4000,!last),dataCellC([reg(String(parseInt(u.koli_adet)||'—'),17)],1500,!last),dataCellC([reg((parseFloat(u.brut_kg)||0).toFixed(2),17)],1500,!last),dataCellC([reg((parseFloat(u.hacim_m3)||0).toFixed(3),17)],1500,!last)]}));});
  if(!rows.length)rows.push(new D.TableRow({children:[dataCellC([muted('—',17)],400,false),dataCell([muted('[Urun yok]',17)],4000,false),dataCellC([muted('—',17)],1500,false),dataCellC([muted('—',17)],1500,false),dataCellC([muted('—',17)],1500,false)]}));
  rows.push(new D.TableRow({children:[totalCellR([bold('Toplam',17)],4400),totalCell([bold(String(totKoli),17)],1500),totalCell([bold(totBrut.toFixed(2)+' kg',17)],1500),totalCell([bold(totM3.toFixed(3)+' m3',17)],1500)]}));
  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Shipping Instruction',no+'\n'+_todayFmt(),'Sevk Emri — Duay Global LLC'),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Shipper')],'left',80),p([bold('Duay Global LLC',18)],'left',40),p([reg(pol,17)],'left',0)],width:{size:5000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Forwarder')],'left',80),p([reg(dosya.forwarder_adi||'___________________',17)],'left',0)],width:{size:5000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Route')],'left',80),p([reg('POL: '+pol,17)],'left',40),p([reg('POD: '+pod,17)],'left',40),p([reg('ETD: '+_fmtDate(dosya.bitis_tarihi),17)],'left',0)],width:{size:4838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[5000,5000,4838]),
    blank(200),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[400,4000,1500,1500,1500],borders:allNone,rows:[new D.TableRow({children:[hdrCell('#',400),hdrCell('Description',4000),hdrCell('Cartons',1500),hdrCell('Gross KG',1500),hdrCell('m3',1500)]})].concat(rows)}),
    blank(200),
    new D.Paragraph({children:[label('BL Instructions')],spacing:{before:0,after:60},border:{bottom:THIN}}),blank(80),
    p([reg('Consignee: '+_esc(dosya.musteriAd||'To Order'),17)],'left',40),
    p([reg('Notify: '+_esc(dosya.musteriAd||'___________________'),17)],'left',40),
    p([reg('Container: '+_esc(dosya.konteyner_turu||'40HC'),17)],'left',100),
    blank(200),signatureTbl(),
  ]}]});
}

// FORM 2D: LOADING INSTRUCTION / YUKLEME TALIMATI
function makeLoadingInstruction(dosya, urunler) {
  dosya=dosya||{};urunler=urunler||[];
  var no=(dosya.dosyaNo||'______').replace('IHR-','YUK-');
  var pol=dosya.yukleme_limani||'Istanbul, Turkey';
  var rows=[];
  _sortU(urunler).forEach(function(u,i){var last=i===urunler.length-1;var oncelik=u.once_yukle||'';rows.push(new D.TableRow({children:[dataCellC([reg(String(i+1),17)],400,!last),dataCell([reg(u.standart_urun_adi||u.aciklama||'[Urun]',17)],3500,!last),dataCellC([reg(oncelik,17)],1500,!last),dataCellC([reg(String(parseInt(u.koli_adet)||'—'),17)],1200,!last),dataCellC([reg((parseFloat(u.brut_kg)||0).toFixed(2),17)],1200,!last),dataCellC([reg(u.konteyner_sira?'Sira '+u.konteyner_sira:'—',17)],1200,!last)]}));});
  if(!rows.length)rows.push(new D.TableRow({children:[dataCellC([muted('—',17)],400,false),dataCell([muted('[Urun yok]',17)],3500,false),dataCellC([muted('—',17)],1500,false),dataCellC([muted('—',17)],1200,false),dataCellC([muted('—',17)],1200,false),dataCellC([muted('—',17)],1200,false)]}));
  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Loading Instruction',no+'\n'+_todayFmt(),'Yukleme Talimati — Duay Global LLC'),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Tedarikci')],'left',80),p([reg(dosya.tedarikci_adi||'___________________',17)],'left',0)],width:{size:5000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Forwarder')],'left',80),p([reg(dosya.forwarder_adi||'___________________',17)],'left',0)],width:{size:5000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Yukleme')],'left',80),p([reg('Tarih: '+_fmtDate(dosya.bitis_tarihi),17)],'left',40),p([reg('Terminal: '+_esc(pol),17)],'left',0)],width:{size:4838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[5000,5000,4838]),
    blank(200),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[400,3500,1500,1200,1200,1200],borders:allNone,rows:[new D.TableRow({children:[hdrCell('#',400),hdrCell('Urun',3500),hdrCell('Oncelik',1500),hdrCell('Koli',1200),hdrCell('Brut KG',1200),hdrCell('Sira',1200)]})].concat(rows)}),
    blank(200),
    p([muted('Notlar: _______________________________________________',16)],'left',100),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Duay Global LLC — Onay')],'left',200),p([muted('_______________________________',17)],'left',0)],width:{size:7000,type:'dxa'},borders:{top:THIN,bottom:NONE,left:NONE,right:NONE},margins:{top:80,bottom:0,left:0,right:0}}),
      new D.TableCell({children:[p([label('Forwarder — Onay')],'left',200),p([muted('_______________________________',17)],'left',0)],width:{size:7838,type:'dxa'},borders:{top:THIN,bottom:NONE,left:NONE,right:NONE},margins:{top:80,bottom:0,left:0,right:0}}),
    ]})],[7000,7838]),
  ]}]});
}

// FORM 3: FORWARDER TEKLIF
// ════════════════════════════════════════════════════════════════
function makeFreightRequest(dosya, urunler) {
  dosya=dosya||{}; urunler=urunler||[];
  var frqNo=(dosya.dosyaNo||'______').replace('IHR-','FRQ-');
  var tarih=_fmtDate(dosya.bitis_tarihi)||_todayFmt();
  var pol=dosya.yukleme_limani||'Istanbul, Turkey';
  var pod=dosya.varis_limani||'[POD]';
  var inco=dosya.teslim_sekli||'FOB';
  var totBrut=0,totM3=0,totKoli=0,totFat=0;
  urunler.forEach(function(u){ totBrut+=parseFloat(u.brut_kg)||0; totM3+=parseFloat(u.hacim_m3)||0; totKoli+=parseInt(u.koli_adet)||0; totFat+=(parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0); });

  var rows=[];
  _sortU(urunler).forEach(function(u,i){
    var last=i===urunler.length-1;
    rows.push(new D.TableRow({children:[
      dataCell([reg(u.standart_urun_adi||u.aciklama||'[Urun]',17)],3200,!last),
      dataCellC([reg(u.paket_turu||'Carton',17)],2200,!last),
      dataCellC([reg(String(parseInt(u.koli_adet)||'—'),17)],1200,!last),
      dataCellC([reg((parseFloat(u.brut_kg)||0).toFixed(2),17)],1700,!last),
      dataCellC([reg((parseFloat(u.net_kg)||0).toFixed(2),17)],1700,!last),
      dataCellC([reg((parseFloat(u.hacim_m3)||0).toFixed(3),17)],1700,!last),
      dataCellC([reg(String(parseFloat(u.miktar)||'—')+' '+(u.birim||'PCS'),17)],1600,!last),
    ]}));
  });
  if(!rows.length) rows.push(new D.TableRow({children:[dataCell([muted('[Urun girilmedi]',17)],3200,false),dataCellC([muted('—',17)],2200,false),dataCellC([muted('—',17)],1200,false),dataCellC([muted('—',17)],1700,false),dataCellC([muted('—',17)],1700,false),dataCellC([muted('—',17)],1700,false),dataCellC([muted('—',17)],1600,false)]}));
  rows.push(new D.TableRow({children:[totalCellR([bold('Toplam',17)],5400),totalCell([bold(String(totKoli),17)],1200),totalCell([bold(totBrut.toFixed(2)+' kg',17)],1700),totalCell([bold('—',17)],1700),totalCell([bold(totM3.toFixed(3)+' m3',17)],1700),totalCell([bold('—',17)],1600)]}));

  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Freight Rate Request',frqNo+'  ·  '+tarih,'Freight Rate Request Form'),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[new D.Table({width:{size:6000,type:'dxa'},columnWidths:[2400,3600],borders:allNone,rows:[infoRow('Talep Eden','Duay Global LLC',2400,3600),infoRow('Email','export@duayglobal.com',2400,3600)]})],width:{size:6000,type:'dxa'},borders:allNone,margins:{top:0,bottom:0,left:0,right:200}}),
      new D.TableCell({children:[new D.Table({width:{size:6000,type:'dxa'},columnWidths:[2400,3600],borders:allNone,rows:[infoRow('Forwarder','___________________',2400,3600),infoRow('Son Teklif','___/___/2026',2400,3600)]})],width:{size:8838,type:'dxa'},borders:allNone,margins:{top:0,bottom:0,left:200,right:0}}),
    ]})],[6000,8838]),
    blank(160),
    new D.Paragraph({children:[label('Tasima Turu & Guzergah')],spacing:{before:0,after:60},border:{bottom:THIN}}), blank(80),
    checkLine(['Deniz FCL','Deniz LCL','Hava AWB','Kara FTL','Parsiyel']),
    p([reg('POL: '+pol+'     POD: '+pod+'     ETD: '+_fmtDate(dosya.bitis_tarihi),17)],'left',160),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[3200,2200,1200,1700,1700,1700,1600],borders:allNone,
      rows:[new D.TableRow({children:[hdrCell('Urun',3200),hdrCell('Paket',2200),hdrCell('Koli',1200),hdrCell('Brut KG',1700),hdrCell('Net KG',1700),hdrCell('m3',1700),hdrCell('Miktar',1600)]})].concat(rows)}),
    blank(160),
    new D.Paragraph({children:[label('Teklif Kapsami')],spacing:{before:0,after:60},border:{bottom:THIN}}), blank(80),
    checkLine(['Navlun','Origin THC','Dest. THC','BL/AWB','Gumruk','Ic Nakliye (O)','Ic Nakliye (D)','Sigorta']),
    blank(100),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('Incoterms')],'left',60),p([reg(inco+' '+pol,17)],'left',0)],width:{size:7000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Mal Degeri')],'left',60),p([reg(_fmtMoney(totFat,'USD'),17)],'left',0)],width:{size:7838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[7000,7838]),
    blank(280), signatureTbl(),
  ]}]});
}

// ════════════════════════════════════════════════════════════════
// FORM 4: SIGORTA TEKLIF
// ════════════════════════════════════════════════════════════════
function makeInsuranceRequest(dosya, urunler) {
  dosya=dosya||{}; urunler=urunler||[];
  var irqNo=(dosya.dosyaNo||'______').replace('IHR-','IRQ-');
  var invNo=(dosya.dosyaNo||'______').replace('IHR-','INV-');
  var tarih=_fmtDate(dosya.bitis_tarihi)||_todayFmt();
  var pol=dosya.yukleme_limani||'Istanbul, Turkey';
  var pod=dosya.varis_limani||'[POD]';
  var totBrut=0,totM3=0,totFat=0;
  urunler.forEach(function(u){ totBrut+=parseFloat(u.brut_kg)||0; totM3+=parseFloat(u.hacim_m3)||0; totFat+=(parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0); });
  var sigDeger=totFat*1.1;

  var rows=[];
  _sortU(urunler).forEach(function(u,i){
    var last=i===urunler.length-1;
    rows.push(new D.TableRow({children:[
      dataCell([reg(u.standart_urun_adi||u.aciklama||'[Urun]',17)],3200,!last),
      dataCellC([reg(u.paket_turu||'—',17)],2200,!last),
      dataCellC([reg(String(parseInt(u.koli_adet)||'—'),17)],1200,!last),
      dataCellC([reg((parseFloat(u.brut_kg)||0).toFixed(2),17)],1700,!last),
      dataCellC([reg((parseFloat(u.hacim_m3)||0).toFixed(3),17)],1700,!last),
      dataCellC([reg(_fmtMoney((parseFloat(u.miktar)||0)*(parseFloat(u.birim_fiyat)||0),u.doviz||'USD'),17)],2600,!last),
    ]}));
  });
  if(!rows.length) rows.push(new D.TableRow({children:[dataCell([muted('[Urun girilmedi]',17)],3200,false),dataCellC([muted('—',17)],2200,false),dataCellC([muted('—',17)],1200,false),dataCellC([muted('—',17)],1700,false),dataCellC([muted('—',17)],1700,false),dataCellC([muted('—',17)],2600,false)]}));
  rows.push(new D.TableRow({children:[totalCellR([bold('Toplam Fatura Degeri',17)],10000),totalCell([bold(_fmtMoney(totFat,'USD'),17)],2600)]}));

  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Insurance Quote Request',irqNo+'  ·  '+tarih,'Marine / Cargo Insurance Quote Request'),
    blank(200),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[new D.Table({width:{size:6000,type:'dxa'},columnWidths:[2600,3400],borders:allNone,rows:[infoRow('Sigorta Ettiren','Duay Global LLC',2600,3400),infoRow('Invoice No',invNo,2600,3400)]})],width:{size:6000,type:'dxa'},borders:allNone,margins:{top:0,bottom:0,left:0,right:200}}),
      new D.TableCell({children:[new D.Table({width:{size:6000,type:'dxa'},columnWidths:[2600,3400],borders:allNone,rows:[infoRow('Guzergah',pol+' -> '+pod,2600,3400),infoRow('ETD',_fmtDate(dosya.bitis_tarihi),2600,3400)]})],width:{size:8838,type:'dxa'},borders:allNone,margins:{top:0,bottom:0,left:200,right:0}}),
    ]})],[6000,8838]),
    blank(160),
    new D.Paragraph({children:[label('Mal Bilgileri / Cargo Information')],spacing:{before:0,after:60},border:{bottom:THIN}}), blank(80),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[3200,2200,1200,1700,1700,2600],borders:allNone,
      rows:[new D.TableRow({children:[hdrCell('Mal Cinsi',3200),hdrCell('Ambalaj',2200),hdrCell('Adet',1200),hdrCell('Brut KG',1700),hdrCell('m3',1700),hdrCell('Fatura Degeri',2600)]})].concat(rows)}),
    blank(160),
    new D.Paragraph({children:[label('Sigorta Degeri')],spacing:{before:0,after:60},border:{bottom:THIN}}), blank(80),
    tbl([new D.TableRow({children:[
      new D.TableCell({children:[p([label('CIF Degeri')],'left',40),p([reg(_fmtMoney(totFat,'USD'),17)],'left',0)],width:{size:4000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('Sigorta Degeri (CIF+%10)')],'left',40),p([bold(_fmtMoney(sigDeger,'USD'),17)],'left',0)],width:{size:4000,type:'dxa'},borders:allNone,margins:cellMargS}),
      new D.TableCell({children:[p([label('B/L No / AWB No')],'left',40),p([reg('___________________',17)],'left',0)],width:{size:6838,type:'dxa'},borders:allNone,margins:cellMargS}),
    ]})],[4000,4000,6838]),
    blank(160),
    new D.Paragraph({children:[label('Teminat Turu / Coverage')],spacing:{before:0,after:60},border:{bottom:THIN}}), blank(80),
    checkLine(['All Risks (ICC A)','ICC B','ICC C','Hirsizlik','Savas Riski','Grev/SRCC','Depo Depo (W/W)']),
    blank(120),
    p([muted('Beyan: Yukaridaki bilgiler dogru ve eksiksizdir.',15)],'left',200),
    signatureTbl(),
  ]}]});
}

// FORM 5: YUKLEME KONTROL LISTESI
function makeYuklemeKontrolListesi(dosya, urunler) {
  dosya=dosya||{};urunler=urunler||[];
  var no=(dosya.dosyaNo||'______').replace('IHR-','YKL-');
  var kontrol=['Urun listesi PL ile uyusur mu?','Ambalaj kontrolu yapildi mi?','Etiketler dogru mu?','Konteyner temizligi kontrol edildi mi?','Yukleme sirasi PL\'ye uygun mu?','Tartim yapildi mi? (Brut KG)','Muhur takildi mi?','Fotograf cekildi mi?'];
  var rows=[]; _sortU(urunler).forEach(function(u,i){rows.push(new D.TableRow({children:[dataCellC([reg(String(i+1),17)],400),dataCell([reg(u.standart_urun_adi||u.aciklama||'[Urun]',17)],5000),dataCellC([reg(String(parseFloat(u.miktar)||'—'),17)],1200),dataCellC([reg(String(parseInt(u.koli_adet)||'—'),17)],1200),dataCellC([reg((parseFloat(u.brut_kg)||0).toFixed(2),17)],1500)]}));});
  var chkRows=kontrol.map(function(k){return new D.TableRow({children:[dataCell([reg('[ ]',17)],600),dataCell([reg(k,17)],14238)]});});
  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Yukleme Kontrol Listesi',no+'\n'+_todayFmt(),'Duay Global LLC'),blank(200),
    tbl([new D.TableRow({children:[new D.TableCell({children:[p([label('Dosya')],'left',40),p([reg((dosya.dosyaNo||'')+' · '+(dosya.musteriAd||''),17)],'left',0)],width:{size:7000,type:'dxa'},borders:allNone,margins:cellMargS}),new D.TableCell({children:[p([label('Konteyner')],'left',40),p([reg(dosya.konteyner_turu||'40HC',17)],'left',0)],width:{size:7838,type:'dxa'},borders:allNone,margins:cellMargS})]})],[7000,7838]),blank(200),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[400,5000,1200,1200,1500],borders:allNone,rows:[new D.TableRow({children:[hdrCell('#',400),hdrCell('Urun',5000),hdrCell('Miktar',1200),hdrCell('Koli',1200),hdrCell('Brut KG',1500)]})].concat(rows)}),blank(200),
    new D.Paragraph({children:[label('Kontrol Maddeleri')],spacing:{before:0,after:60},border:{bottom:THIN}}),blank(80),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[600,14238],borders:allNone,rows:chkRows}),blank(200),
    p([reg('Sorumlu: _________________________     Tarih: ___/___/2026     Imza: _________________________',17)],'left',0),
  ]}]});
}

// FORM 6: KONTEYNER DIZILIM LISTESI
function makeKonteynerDizilimListesi(dosya, urunler) {
  dosya=dosya||{};urunler=urunler||[];
  var no=(dosya.dosyaNo||'______').replace('IHR-','KDL-');
  var totKoli=0,totBrut=0; urunler.forEach(function(u){totKoli+=parseInt(u.koli_adet)||0;totBrut+=parseFloat(u.brut_kg)||0;});
  var rows=[]; _sortU(urunler).forEach(function(u,i){rows.push(new D.TableRow({children:[dataCellC([reg(u.konteyner_sira?String(u.konteyner_sira):String(i+1),17)],500),dataCell([reg(u.standart_urun_adi||u.aciklama||'[Urun]',17)],4000),dataCellC([reg(String(parseInt(u.koli_adet)||'—'),17)],1200),dataCellC([reg((parseFloat(u.brut_kg)||0).toFixed(2),17)],1500),dataCellC([reg('—',17)],1200),dataCellC([reg('—',17)],1200),dataCellC([reg('—',17)],1200)]}));});
  rows.push(new D.TableRow({children:[totalCellR([bold('Toplam',17)],4500),totalCell([bold(String(totKoli),17)],1200),totalCell([bold(totBrut.toFixed(2)+' kg',17)],1500),totalCell([bold('—',17)],1200),totalCell([bold('—',17)],1200),totalCell([bold('—',17)],1200)]}));
  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Konteyner Dizilim Listesi',no+'\n'+_todayFmt(),'Duay Global LLC'),blank(200),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[500,4000,1200,1500,1200,1200,1200],borders:allNone,rows:[new D.TableRow({children:[hdrCell('Sira',500),hdrCell('Urun',4000),hdrCell('Koli',1200),hdrCell('KG',1500),hdrCell('Boy cm',1200),hdrCell('En cm',1200),hdrCell('Yuk cm',1200)]})].concat(rows)}),blank(200),
    p([muted('Bkz. ek dizilim semasi',15)],'left',0),blank(200),signatureTbl(),
  ]}]});
}

// FORM 7: TESLIMAT KONTROL LISTESI
function makeTeslimatKontrolListesi(dosya) {
  dosya=dosya||{};
  var no=(dosya.dosyaNo||'______').replace('IHR-','TKL-');
  var kontrol=['BL orijinal alindi mi?','GCB kapatildi mi?','Sigorta policesi aktif mi?','Mense belgesi teslim edildi mi?','EUR.1 teslim edildi mi?','Kambiyo beyannamesi verildi mi? (90 gun)','Tahsilat gerceklesti mi?','KDV iade basvurusu yapildi mi?'];
  var chkRows=kontrol.map(function(k){return new D.TableRow({children:[dataCell([reg('[ ]',17)],600),dataCell([reg(k,17)],14238)]});});
  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Teslimat Kontrol Listesi',no+'\n'+_todayFmt(),'Duay Global LLC'),blank(200),
    tbl([new D.TableRow({children:[new D.TableCell({children:[p([label('Dosya')],'left',40),p([reg((dosya.dosyaNo||'')+' · '+(dosya.musteriAd||''),17)],'left',0)],width:{size:5000,type:'dxa'},borders:allNone,margins:cellMargS}),new D.TableCell({children:[p([label('Varis')],'left',40),p([reg(dosya.varis_limani||'[POD]',17)],'left',0)],width:{size:5000,type:'dxa'},borders:allNone,margins:cellMargS}),new D.TableCell({children:[p([label('ETA')],'left',40),p([reg(_fmtDate(dosya.bitis_tarihi),17)],'left',0)],width:{size:4838,type:'dxa'},borders:allNone,margins:cellMargS})]})],[5000,5000,4838]),blank(200),
    new D.Paragraph({children:[label('Kontrol Maddeleri')],spacing:{before:0,after:60},border:{bottom:THIN}}),blank(80),
    new D.Table({width:{size:CW,type:'dxa'},columnWidths:[600,14238],borders:allNone,rows:chkRows}),blank(200),
    p([reg('Sorumlu: _________________________     Tarih: ___/___/2026',17)],'left',0),blank(200),signatureTbl(),
  ]}]});
}

// FORM 8: MUHURLU KONTEYNER SEVK IZNI
function makeSevkIzni(dosya) {
  dosya=dosya||{};
  var no=(dosya.dosyaNo||'______').replace('IHR-','SVK-');
  return new D.Document({sections:[{properties:pageProps,children:[
    headerTbl('Muhurlu Konteyner Sevk Izni',no+'\n'+_todayFmt(),'Duay Global LLC'),blank(300),
    tbl([new D.TableRow({children:[new D.TableCell({children:[
      new D.Table({width:{size:CW,type:'dxa'},columnWidths:[4000,10838],borders:allNone,rows:[
        infoRow('Ihracat Dosya No',dosya.dosyaNo||'______',4000,10838),
        infoRow('GCB No','______',4000,10838),
        infoRow('Konteyner No','______',4000,10838),
        infoRow('Muhur No','______',4000,10838),
        infoRow('Yukleme Tarihi',_fmtDate(dosya.bitis_tarihi),4000,10838),
        infoRow('Varis Yeri',dosya.varis_limani||'______',4000,10838),
        infoRow('Alici',dosya.musteriAd||'______',4000,10838),
      ]}),
    ],width:{size:CW,type:'dxa'},borders:allNone,margins:cellMargS})]})],[CW]),
    blank(300),
    p([reg('Yukarida bilgileri yazili konteyner muhurlenmis ve sevke hazir oldugu onaylanir.',17)],'left',200),
    blank(300),signatureTbl(),
  ]}]});
}

// ── DOWNLOAD ─────────────────────────────────────────────────
function downloadDocx(doc, filename) {
  if (!D || !D.Packer) { window.toast?.('DOCX Packer bulunamadi','err'); return; }
  D.Packer.toBlob(doc).then(function(buf) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(buf);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
    window.toast?.(filename + ' indirildi', 'ok');
  }).catch(function(e) { console.error('[ihracat_formlar]', e); window.toast?.('DOCX hata: ' + e.message, 'err'); });
}

// ════════════════════════════════════════════════════════════════
// ANA DOCX İNDİR — dosyaId ile dolu, dosyaId olmadan boş şablon
// ════════════════════════════════════════════════════════════════
window._ihrDocxIndir = function(dosyaId, tip) {
  if(!_ensureD()){window.toast?.('DOCX kutuphanesi yuklenmedi','err');return;}
  var d = window._ihrLoadDosya ? window._ihrLoadDosya(dosyaId) : (window.loadIhracatDosyalar?window.loadIhracatDosyalar():[]).find(function(x){return String(x.id)===String(dosyaId);});
  if(!d){window.toast?.('Dosya bulunamadi','err');return;}
  var u = window._ihrLoadUrunler ? window._ihrLoadUrunler(dosyaId) : (window.loadIhracatUrunler?window.loadIhracatUrunler():[]).filter(function(x){return String(x.dosya_id)===String(dosyaId)&&!x.isDeleted;});
  var bl = tip==='pl' ? (window._ihrLoadBL?window._ihrLoadBL(dosyaId):null) : null;
  window.toast?.('Hazirlaniyor...','ok');
  var map={
    pl: {make:function(){return makePackingList(d,u,bl);},  name:'DUAY_PL_'+(d.dosyaNo||dosyaId)+'.docx'},
    ci: {make:function(){return makeCommercialInvoice(d,u);},name:'DUAY_CI_'+(d.dosyaNo||dosyaId)+'.docx'},
    frq:{make:function(){return makeFreightRequest(d,u);},   name:'DUAY_FRQ_'+(d.dosyaNo||dosyaId)+'.docx'},
    irq:{make:function(){return makeInsuranceRequest(d,u);},  name:'DUAY_IRQ_'+(d.dosyaNo||dosyaId)+'.docx'},
    pi: {make:function(){return makeProformaInvoice(d,u);},  name:'DUAY_PI_'+(d.dosyaNo||dosyaId)+'.docx'},
    sevk:{make:function(){return makeShippingInstruction(d,u);},name:'DUAY_SEVK_'+(d.dosyaNo||dosyaId)+'.docx'},
    yuk:{make:function(){return makeLoadingInstruction(d,u);}, name:'DUAY_YUK_'+(d.dosyaNo||dosyaId)+'.docx'},
    ykl:{make:function(){return makeYuklemeKontrolListesi(d,u);},name:'DUAY_YKL_'+(d.dosyaNo||dosyaId)+'.docx'},
    kdl:{make:function(){return makeKonteynerDizilimListesi(d,u);},name:'DUAY_KDL_'+(d.dosyaNo||dosyaId)+'.docx'},
    tkl:{make:function(){return makeTeslimatKontrolListesi(d);},name:'DUAY_TKL_'+(d.dosyaNo||dosyaId)+'.docx'},
    svk:{make:function(){return makeSevkIzni(d);},name:'DUAY_SVK_'+(d.dosyaNo||dosyaId)+'.docx'},
  };
  var entry=map[tip]; if(!entry){window.toast?.('Bilinmeyen tip','err');return;}
  try{downloadDocx(entry.make(),entry.name);window.logActivity?.('ihracat',tip.toUpperCase()+' belgesi: '+d.dosyaNo);}
  catch(e){console.error('[ihracat_formlar]',e);window.toast?.('Hata: '+e.message,'err');}
};

// ── Boş şablon indirici (geriye uyumluluk) ───────────────────
window._ihrFormIndir = function(tip) {
  if(!_ensureD()){window.toast?.('DOCX yuklenmedi','err');return;}
  var map={pl:{make:makePackingList,name:'DUAY_Packing_List.docx'},ci:{make:makeCommercialInvoice,name:'DUAY_Commercial_Invoice.docx'},frq:{make:makeFreightRequest,name:'DUAY_Forwarder_Teklif.docx'},irq:{make:makeInsuranceRequest,name:'DUAY_Sigorta_Teklif.docx'}};
  var e=map[tip]; if(!e)return;
  try{downloadDocx(e.make(),e.name);}catch(err){window.toast?.('Hata: '+err.message,'err');}
};

// ── Panel render ─────────────────────────────────────────────
window.renderIhracatFormlar = function() {
  var panel=document.getElementById('panel-ihracat-formlar'); if(!panel)return;
  panel.innerHTML='<div style="padding:16px 24px">'
    +'<div style="margin-bottom:8px"><div style="font-size:16px;font-weight:700;color:var(--t)">Ihracat Formlari</div>'
    +'<div style="font-size:11px;color:var(--t3)">v2.0 — Dosya verisinden otomatik dolar</div></div>'
    +'<div style="margin-bottom:12px;padding:10px 14px;background:#FAEEDA;border:0.5px solid #EF9F27;border-radius:8px;font-size:11px;color:#633806">'
    +'Dolu belge icin: Ihracat → Dosya Ac → Evrak bolumundeki <strong>DOCX</strong> butonunu kullanin. Bu sayfa bos sablon indirir.</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +_fk('Packing List','Ambalaj ve agirlik bilgileri','pl')
    +_fk('Commercial Invoice','Satis faturasi','ci')
    +_fk('Forwarder Teklif Talep','Nakliye fiyat talebi','frq')
    +_fk('Sigorta Teklif Talep','Nakliyat sigortasi talebi','irq')
    +'</div></div>';
};
function _fk(b,a,t){return '<div style="border:0.5px solid var(--b);border-radius:10px;overflow:hidden"><div style="padding:14px 16px;border-bottom:0.5px solid var(--b)"><div style="font-size:13px;font-weight:500">'+b+'</div><div style="font-size:11px;color:var(--t3);margin-top:3px">'+a+'</div></div><div style="padding:12px 16px"><button class="btn btns" onclick="event.stopPropagation();window._ihrFormIndir(\''+t+'\')" style="width:100%;font-size:11px">Bos Sablon Indir</button></div></div>';}

})();
