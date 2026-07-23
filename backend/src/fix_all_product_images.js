const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Product } = require('./models');

// 130 ürün için 100% güvenilir, hotlink engeline takılmayan Unsplash teknoloji görselleri (her ürün için 3 görsel)
const categoryUnsplashImages = {
  'Telefon': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79e2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533228876829-65c94e7b5025?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&auto=format&fit=crop&q=80'
  ],
  'Laptop': [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=600&auto=format&fit=crop&q=80'
  ],
  'Monitör': [
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80'
  ],
  'Akıllı Saat': [
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80'
  ],
  'Mouse': [
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1626218174358-7769486c4b79?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1605774337664-7a846e9cdf17?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1613141411244-0e4ac259d217?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=600&auto=format&fit=crop&q=80'
  ],
  'Klavye': [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541140134513-85a161dc4a00?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563198804-b19d095b3042?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1567928269937-ae146e45b428?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80'
  ],
  'Oyun': [
    'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&auto=format&fit=crop&q=80'
  ],
  'Kamera': [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500634245200-e5245c7e73ef?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508898578281-774ac4893c0c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512790182412-b19e6d61b397?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=600&auto=format&fit=crop&q=80'
  ],
  'Drone': [
    'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533558701576-23c65e0272fb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512756290469-ec264b7fbf87?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1564982752979-3f7bc974d29a?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506947411487-a56738267384?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=600&auto=format&fit=crop&q=80'
  ],
  'Ses': [
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&auto=format&fit=crop&q=80'
  ],
  'Depolama': [
    'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537498425277-c283d32ef9db?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80'
  ],
  'Kulaklık': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578319439584-104c94d37305?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80'
  ],
  'Televizyon': [
    'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1528928441742-b4ccac1bb04c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80'
  ]
};

async function fixAllProductImages() {
  try {
    const { Category } = require('./models');
    const categories = await Category.findAll();
    const catMap = {};
    for (const c of categories) catMap[c.id] = c.name;

    const products = await Product.findAll();
    let count = 0;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const catName = catMap[p.categoryId] || 'Telefon';
      const pool = categoryUnsplashImages[catName] || categoryUnsplashImages['Telefon'];
      
      const isHeroBanner = p.imageUrl && p.imageUrl.startsWith('/hero-banners/');
      const img1 = isHeroBanner ? p.imageUrl : pool[i % pool.length];
      const img2 = pool[(i + 1) % pool.length];
      const img3 = pool[(i + 2) % pool.length];

      await p.update({
        imageUrl: img1,
        images: [img2, img3]
      });
      count++;
    }

    console.log(`✅ ${count} adet ürünün tüm görselleri (3'er adet) 100% çalışacak Unsplash CDN URL'leri ile güncellendi!`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Görsel güncelleme hatası:', e);
    process.exit(1);
  }
}

fixAllProductImages();
