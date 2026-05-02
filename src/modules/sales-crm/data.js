/* ─────────────────────────────────────────────────────
 * Duay Sales CRM — sales-crm/data.js
 * V138.2 POPULATE — QUESTIONS + TECHNIQUES + GURUS
 * Anayasa: K01 / Belge 3 § 6 (namespace standardı)
 * Cycle: V138.2 SALES-CRM-PRO-POPULATE-001
 * ───────────────────────────────────────────────────── */
(function() {
  'use strict';
  window.SalesCRM = window.SalesCRM || {
    core: {}, data: {}, pages: {}, modal: {}, ui: {}, io: {}
  };

  var QUESTIONS = Object.freeze([
    Object.freeze({id:201,expert:'Baran Şimşek',cat:'Fayda',q:'Mevcut tedarikçinizde "keşke şunu da yapsalar" dediğiniz bir eksiklik var mı?'}),
    Object.freeze({id:202,expert:'Baran Şimşek',cat:'Fayda',q:'Sizden almanın makul olduğunu patronunuza izah edebileceğiniz somut bir fark var mı?'}),
    Object.freeze({id:203,expert:'Baran Şimşek',cat:'Fayda',q:'Ürünümüzün size sağlayacağı faydayı rakip ürünlerle karşılaştırdınız mı?'}),
    Object.freeze({id:204,expert:'Baran Şimşek',cat:'Fayda',q:'Geçmişte çalıştığınız firmalar ve sektörlerden size yardımcı olabilecek kimlerle görüşmemi önerirsiniz?'}),
    Object.freeze({id:205,expert:'Baran Şimşek',cat:'Problem',q:'Fabrikanızda iş akışını yavaşlatan en büyük dar boğaz neresi?'}),
    Object.freeze({id:206,expert:'Baran Şimşek',cat:'Potansiyel',q:'Bu sorunu çözsek, yıl sonunda ne değişmiş olur? Bunu nasıl ölçerdiniz?'}),
    Object.freeze({id:101,expert:'Jeffrey Gitomer',cat:'Güven',q:'Sizi mevcut tedarikçinizden koparacak tek bir "değer" ne olurdu?'}),
    Object.freeze({id:107,expert:'Jeffrey Gitomer',cat:'Kapanış',q:'Karar verme sürecinizde fiyat dışı en önemli kriter nedir?'}),
    Object.freeze({id:108,expert:'Jeffrey Gitomer',cat:'Güven',q:'Bu projenin sizin için kişisel önemi nedir? Başarı sizin adınıza ne ifade eder?'}),
    Object.freeze({id:103,expert:'Neil Rackham',cat:'Problem',q:'Bu aksaklık personelin motivasyonunu ve gizli maliyetleri nasıl etkiliyor?'}),
    Object.freeze({id:109,expert:'Neil Rackham',cat:'Problem',q:'Mevcut süreçte en fazla zaman kaybettiren adım hangisi?'}),
    Object.freeze({id:110,expert:'Neil Rackham',cat:'Gözlem',q:'Mevcut ürünlerinizde en sık karşılaştığınız fire hangi aşamada oluyor?'}),
    Object.freeze({id:104,expert:'Zig Ziglar',cat:'Potansiyel',q:'Eğer bugün bu kararı vermezseniz, 6 ay sonra nerede olacaksınız?'}),
    Object.freeze({id:111,expert:'Zig Ziglar',cat:'Potansiyel',q:'Bu sorun çözülürse bir yıl içinde ne değişmiş olur?'}),
    Object.freeze({id:105,expert:'Grant Cardone',cat:'Kapanış',q:'Neden bu projeye hemen şimdi başlamıyoruz?'}),
    Object.freeze({id:112,expert:'Grant Cardone',cat:'Kapanış',q:'Hangi tarihte başlamak istersiniz — bu hafta mı, gelecek hafta mı?'}),
    Object.freeze({id:102,expert:'Jack Daly',cat:'Potansiyel',q:'Önümüzdeki yıl cironuzda %20 artış olursa operasyonunuz buna hazır mı?'}),
    Object.freeze({id:113,expert:'Jack Daly',cat:'Gözlem',q:'Rakiplerinizden sizi ayıran en önemli operasyonel avantajınız nedir?'}),
    Object.freeze({id:106,expert:'Andrew Sobel',cat:'Güven',q:'Geçmişte yaşadığınız en kötü satın alma deneyiminden ne öğrendiniz?'}),
    Object.freeze({id:114,expert:'Andrew Sobel',cat:'Güven',q:'Tedarik zincirinizde sizi en çok endişelendiren risk nedir?'})
  ]);

  var TECHNIQUES = Object.freeze([
    Object.freeze({title:'SPIN Tekniği',desc:'Durum, Problem, İma ve İhtiyaç/Fayda sorularıyla büyük satışı yönetme. Neil Rackham\'ın bilimsel olarak kanıtladığı yöntem.',expert:'Neil Rackham',color:'#0071e3'}),
    Object.freeze({title:'Fayda Satışı (FAB+)',desc:'Özellik → Avantaj → Fayda. Baran Şimşek\'e göre önce Fayda Check-Up yapın; gerçek fayda yoksa FAB çalışmaz.',expert:'Baran Şimşek · Klasik Satış',color:'#34c759'}),
    Object.freeze({title:'BANT Metodu',desc:'Bütçe, Yetki, İhtiyaç ve Zamanlama kriterleriyle aday eleme. Önce B ve A\'yı doğrulamadan süreci ilerletme.',expert:'IBM Standard',color:'#ff9f0a'}),
    Object.freeze({title:'Challenger Sale',desc:'Müşteriye bir şey öğret ve düşünce biçimine meydan oku. Statükoyu sarsmak satışı tetikler.',expert:'Matthew Dixon',color:'#af52de'}),
    Object.freeze({title:'Gitomer — Yapı Satışı',desc:'Sistemi değil, yapıyı kullan. Müşterinin satın alma güdüsüne odaklan; adım takip etme.',expert:'Jeffrey Gitomer',color:'#ff3b30'}),
    Object.freeze({title:'MEDDIC',desc:'Metrik, Ekonomik Alıcı, Karar Kriterleri, Karar Süreci, Sorunun Tespiti, Şampiyon — kurumsal satışın çerçevesi.',expert:'PTC Satış',color:'#32ade6'}),
    Object.freeze({title:'Sandler Sistemi',desc:'Müşteri "hayır" diyemeden siz "hayır" diyebilirsiniz. Bütçe ve yetki yoksa süreci ilerletme.',expert:'David Sandler',color:'#ff2d55'}),
    Object.freeze({title:'Value Selling',desc:'Fiyat değil, kazanım sat. Gitomer ve Baran Şimşek\'in ortaklaştığı: uzun vadeli değeri hesaplat ve göster.',expert:'James Narus · Gitomer',color:'#34c759'})
  ]);

  var GURUS = Object.freeze([
    Object.freeze({name:'Baran Şimşek',focus:'Fayda Satışı & Türkiye Pratiği',bio:'"Fiyatı satmak bir bataklıktır. Faydayı satmak gerçek satıcıların işidir." 20+ yıllık satış deneyimi, 500+ danışman eğitimi.',books:Object.freeze(['Faydayı Satamamamın 5 Nedeni','Gizli Potansiyeli Ortaya Çıkar']),url:'baransimsek.com'}),
    Object.freeze({name:'Jeffrey Gitomer',focus:'Satış Büyük Kitabı & İlişki Satışı',bio:'"İnsanlar tanıdıkları, güvendikleri ve ilişki kurdukları kişilerden satın alır." 3 milyon kopya satmış klasik.',books:Object.freeze(['The Little Red Book of Selling','The Sales Bible','Sales Manifesto']),url:'gitomer.com'}),
    Object.freeze({name:'Neil Rackham',focus:'SPIN Selling',bio:'Karmaşık satışlarda soru sırasının gücünü bilimsel olarak kanıtladı. Büyük satışlar farklı davranış ister.',books:Object.freeze(['SPIN Selling','Major Account Sales Strategy'])}),
    Object.freeze({name:'Jack Daly',focus:'Süreç & Sistem Satışı',bio:'Satış bir disiplin sporudur. Raporlama, takip ve sistem olmadan sürdürülebilir büyüme yoktur.',books:Object.freeze(['Hyper Sales Growth','The Sales Playbook'])}),
    Object.freeze({name:'Zig Ziglar',focus:'İkna & Motivasyon',bio:'"İnsanlara yardım ederseniz onlar da size yardım eder." Tutum, yetenek kadar önemlidir.',books:Object.freeze(['Secrets of Closing the Sale','See You at the Top'])}),
    Object.freeze({name:'Grant Cardone',focus:'10X Kuralı',bio:'Ortalamanın 10 katı eylem ve ısrar başarının tek anahtarıdır. "Hayır" cevabı başlangıçtır.',books:Object.freeze(['The 10X Rule','Sell or Be Sold'])}),
    Object.freeze({name:'Matthew Dixon',focus:'Challenger Sale',bio:'En iyi satıcılar ilişki kuranlar değil, müşteriyi zorlayanlardır. Statükoyu sarsmak satışın temelidir.',books:Object.freeze(['The Challenger Sale','The Challenger Customer'])}),
    Object.freeze({name:'Andrew Sobel',focus:'Power Questions',bio:'Doğru sorular ilişkileri dönüştürür. Danışman olmak için önce dinlemelisin.',books:Object.freeze(['Power Questions','Clients for Life'])}),
    Object.freeze({name:'David Sandler',focus:'Sandler Satış Sistemi',bio:'"Müşteri hayır diyemeden siz hayır diyebilirsiniz." Kontrolü asla kaybetmeyin.',books:Object.freeze(["You Can't Teach a Kid to Ride a Bike",'Sandler Rules'])})
  ]);

  window.SalesCRM.data = {
    QUESTIONS: QUESTIONS,
    TECHNIQUES: TECHNIQUES,
    GURUS: GURUS
  };
})();
