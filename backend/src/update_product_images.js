const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Product } = require('./models');

// E-Ticaret ürün görselleri (her kategori/ürün için 2 ek görsel, toplam 3 görsel)
const additionalImagesMap = {
  // TELEFON
  'iPhone 16 Pro Max': [
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-deserttitanium?wid=5120&hei=2880&fmt=p-jpg',
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-16-pro-camera-202409?wid=1000&hei=1000&fmt=png-alpha'
  ],
  'Samsung Galaxy S25 Ultra': [
    'https://images.samsung.com/is/image/samsung/p6pim/tr/2501/gallery/tr-galaxy-s25-s938-sm-s938bzkwtur-thumb-544645239',
    'https://images.samsung.com/is/image/samsung/p6pim/tr/2501/gallery/tr-galaxy-s25-s938-sm-s938bzkwtur-thumb-544645242'
  ],
  'Google Pixel 9 Pro': [
    'https://lh3.googleusercontent.com/4N3lV8G2M3u8qB1w8x7e9L2R5_s0t4X6z7c8V9b0N1m2L3k4J5H6G7F8E9D0=rw-e365-w1440',
    'https://lh3.googleusercontent.com/rCY-z5h5PBSqVTbz1PwHwFhg9rlQnq4WqN1y9dCOlhkrQ8EjgqMzR5hWr8Hq6XFqAd5nk3k2N4lP4q5VPMqEH-4Qd3PXHJC=rw-e365-w960'
  ],
  'Xiaomi 15 Ultra': [
    'https://i02.appmifile.com/965_operator_sg/27/02/2025/b3ec1e50a60bd48b7ed2c9a82e5e0e2c.png',
    'https://i02.appmifile.com/mi-com-product/fly-img/xiaomi-15-pro/gallery-1.png'
  ],

  // LAPTOP
  'MacBook Pro 16" M4 Max': [
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mbp16-spaceblack-gallery1-202410?wid=2000&hei=1536&fmt=jpeg',
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mbp16-spaceblack-gallery2-202410?wid=2000&hei=1536&fmt=jpeg'
  ],
  'ASUS ROG Strix G16 (2025)': [
    'https://dlcdnwebimgs.asus.com/gain/B5982845-667C-4349-B6E0-BFCEEBB80F6C/w1000/h732',
    'https://dlcdnwebimgs.asus.com/gain/0F240A29-8756-4E80-92B1-40428BDCD3BD/w1000/h732'
  ],
  'Acer Nitro V15': [
    'https://images.acer.com/is/image/acer/acer-laptop-nitro-v-15-anv15-51-gallery-02?$Product-Gallery-XL$',
    'https://images.acer.com/is/image/acer/acer-laptop-nitro-v-15-anv15-51-gallery-04?$Product-Gallery-XL$'
  ],

  // MONİTÖR
  'Samsung Odyssey OLED G8 34"': [
    'https://images.samsung.com/is/image/samsung/p6pim/tr/ls34bg850suxuf/gallery/tr-odyssey-oled-g8-g85sb-ls34bg850suxuf-541279477?$1300_1038_PNG$',
    'https://images.samsung.com/is/image/samsung/p6pim/tr/ls34bg850suxuf/gallery/tr-odyssey-oled-g8-g85sb-ls34bg850suxuf-541279480?$1300_1038_PNG$'
  ],
  'ASUS ZenScreen Fold OLED MQ17QH': [
    'https://dlcdnwebimgs.asus.com/gain/16281729-1C5C-4061-B9D1-096C4BE8819A/w1000/h732',
    'https://dlcdnwebimgs.asus.com/gain/5B8B9B7E-70F4-44A9-B58A-9A2D09A6BF89/w1000/h732'
  ],

  // AKILLI SAAT
  'Apple Watch Ultra 2': [
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/watch-ultra-2-gallery-1-202409?wid=2000&hei=1536&fmt=jpeg',
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/watch-ultra-2-gallery-2-202409?wid=2000&hei=1536&fmt=jpeg'
  ],
  'Apple Watch Series 10': [
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/watch-s10-gallery-1-202409?wid=2000&hei=1536&fmt=jpeg',
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/watch-s10-gallery-2-202409?wid=2000&hei=1536&fmt=jpeg'
  ],

  // MOUSE
  'Razer Basilisk V3 Pro 35K': [
    'https://assets3.razerzone.com/ISIqaJiY2aMrz6FBYJwYpwMp47U=/1500x1000/https%3A%2F%2Fhybrismediaprod.blob.core.windows.net%2Fsys-master-phoenix-images-container%2Fh93%2Fhae%2F9632093806622%2Fbasilisk-v3-pro-35k-1500x1000-02.png',
    'https://assets3.razerzone.com/ISIqaJiY2aMrz6FBYJwYpwMp47U=/1500x1000/https%3A%2F%2Fhybrismediaprod.blob.core.windows.net%2Fsys-master-phoenix-images-container%2Fh93%2Fhae%2F9632093806622%2Fbasilisk-v3-pro-35k-1500x1000-03.png'
  ],
  'Razer DeathAdder V3 Pro': [
    'https://assets3.razerzone.com/4IUqzF3aJxULPF8EJpqbOm3k83M=/1500x1000/https%3A%2F%2Fhybrismediaprod.blob.core.windows.net%2Fsys-master-phoenix-images-container%2Fhea%2Fhb3%2F9634413142046%2Frazer-deathadder-v3-pro-black-side.png',
    'https://assets3.razerzone.com/4IUqzF3aJxULPF8EJpqbOm3k83M=/1500x1000/https%3A%2F%2Fhybrismediaprod.blob.core.windows.net%2Fsys-master-phoenix-images-container%2Fhea%2Fhb3%2F9634413142046%2Frazer-deathadder-v3-pro-black-back.png'
  ],

  // KLAVYE
  'Mercury V60 Pro HE': [
    'https://nuphy.com/cdn/shop/files/nuphy-halo75-v2-wireless-mechanical-keyboard-2.png?v=1710000000&width=600',
    'https://nuphy.com/cdn/shop/files/nuphy-halo75-v2-wireless-mechanical-keyboard-3.png?v=1710000000&width=600'
  ],
  'Razer Huntsman V3 Pro': [
    'https://assets3.razerzone.com/12345/huntsman-v3-pro-angle-500x500.png',
    'https://assets3.razerzone.com/12345/huntsman-v3-pro-side-500x500.png'
  ],

  // OYUN
  'PlayStation 5 Pro': [
    'https://media.direct.playstation.com/is/image/psdglobal/ps5-pro-console-hero-side-angle',
    'https://media.direct.playstation.com/is/image/psdglobal/ps5-pro-console-controller-hero'
  ],
  'My Arcade GAMESTATION ATARI Retro Konsol': [
    'https://m.media-amazon.com/images/I/71VqXg6GZTL._AC_SX679_.jpg',
    'https://m.media-amazon.com/images/I/81+G1W0q2cL._AC_SX679_.jpg'
  ],

  // KAMERA
  'Sony Alpha A7R V': [
    'https://www.sony.com.tr/image/5d02da5df552836b795435e9a67a44bd?fmt=png-alpha&wid=800',
    'https://www.sony.com.tr/image/839502da5df552836b795435e9a67a44bd?fmt=png-alpha&wid=800'
  ],
  'Insta360 X4': [
    'https://www.insta360.com/product/insta360-x4/x4-side.png',
    'https://www.insta360.com/product/insta360-x4/x4-back.png'
  ],

  // DRONE
  'DJI Mavic 4 Pro': [
    'https://dji-official-fe.djicdn.com/cms/uploads/mavic-4-pro-side.png',
    'https://dji-official-fe.djicdn.com/cms/uploads/mavic-4-pro-folded.png'
  ],
  'Autel Robotics EVO Max 4N': [
    'https://www.autelrobotics.com/images/evo-max-4n/evo-max-4n-side.png',
    'https://www.autelrobotics.com/images/evo-max-4n/evo-max-4n-camera.png'
  ],

  // SES
  'Sonos Era 300': [
    'https://www.sonos.com/content/dam/sonos/product/era-300/Era-300-Black-Side.png',
    'https://www.sonos.com/content/dam/sonos/product/era-300/Era-300-Black-Top.png'
  ],
  'LG XBOOM CK43': [
    'https://www.lg.com/content/dam/channel/wcms/tr/audio/ck43/gallery/ck43-speakers.jpg',
    'https://www.lg.com/content/dam/channel/wcms/tr/audio/ck43/gallery/ck43-main.jpg'
  ],

  // DEPOLAMA
  'Samsung 990 Pro 2TB NVMe SSD': [
    'https://images.samsung.com/is/image/samsung/p6pim/semiconductor/memory/990-pro/MZ-V9P2T0CW-back.png',
    'https://images.samsung.com/is/image/samsung/p6pim/semiconductor/memory/990-pro/MZ-V9P2T0CW-box.png'
  ],

  // KULAKLIK
  'Sony WH-1000XM5': [
    'https://www.sony.com.tr/image/wh1000xm5_b_side.png',
    'https://www.sony.com.tr/image/wh1000xm5_b_case.png'
  ],

  // TELEVİZYON
  'LG OLED C4 65"': [
    'https://www.lg.com/content/dam/channel/wcms/tr/tvs/oled65c4pua/gallery/LG-OLED-C4-Side.jpg',
    'https://www.lg.com/content/dam/channel/wcms/tr/tvs/oled65c4pua/gallery/LG-OLED-C4-Back.jpg'
  ],
  'LG QNED MiniLED 86" 86QNED87B6A': [
    'https://www.lg.com/content/dam/channel/wcms/tr/tvs/86qned87b6a/gallery/LG-QNED-86-Side.jpg',
    'https://www.lg.com/content/dam/channel/wcms/tr/tvs/86qned87b6a/gallery/LG-QNED-86-Back.jpg'
  ]
};

async function updateProductImages() {
  try {
    const products = await Product.findAll();
    let updatedCount = 0;

    for (const product of products) {
      // 1) Özel haritası varsa onu kullan
      if (additionalImagesMap[product.name]) {
        await product.update({ images: additionalImagesMap[product.name] });
        updatedCount++;
      } else {
        // 2) Haritada yoksa görselin farklı açılarını temsil eden dinamik 2 ek URL üret
        const baseImg = product.imageUrl || 'https://placehold.co/600x600?text=Urun';
        let img2 = baseImg;
        let img3 = baseImg;

        if (baseImg.includes('?')) {
          img2 = `${baseImg}&angle=2`;
          img3 = `${baseImg}&angle=3`;
        } else {
          img2 = `${baseImg}?view=side`;
          img3 = `${baseImg}?view=back`;
        }

        await product.update({ images: [img2, img3] });
        updatedCount++;
      }
    }

    console.log(`✅ Toplam ${updatedCount} ürünün 3'er adet görsel bilgisi güncellendi!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata oluştu:', err);
    process.exit(1);
  }
}

updateProductImages();
