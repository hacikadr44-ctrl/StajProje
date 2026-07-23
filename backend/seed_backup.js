
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Category, Product } = require('./models');

async function seed() {
  try {
    await sequelize.sync({ alter: true });


    const adminEmail = 'admin@example.com';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin Kullanıcı',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
      });
      console.log('✅ Admin kullanıcı oluşturuldu -> email: admin@example.com / şifre: admin123');
    } else {
      console.log('ℹ️ Admin kullanıcı zaten var.');
    }

    // Kategoriler
    const [elektronik] = await Category.findOrCreate({ where: { name: 'Elektronik' } });
    const [giyim] = await Category.findOrCreate({ where: { name: 'Giyim' } });
    const [kitap] = await Category.findOrCreate({ where: { name: 'Kitap' } });

    // Örnek ürünler
    const productCount = await Product.count();
    if (productCount === 0) {
      await Product.bulkCreate([
        {
          name: 'Kablosuz Kulaklık',
          description: 'Yüksek ses kalitesine sahip bluetooth kulaklık.',
          price: 799.9,
          stock: 25,
          imageUrl: 'https://picsum.photos/seed/kulaklik/400/400',
          categoryId: elektronik.id,
        },
        {
          name: 'Akıllı Saat',
          description: 'Nabız ölçer ve adım sayarlı akıllı saat.',
          price: 1499.0,
          stock: 15,
          imageUrl: 'https://picsum.photos/seed/saat/400/400',
          categoryId: elektronik.id,
        },
        {
          name: 'Erkek T-Shirt',
          description: '%100 pamuklu, rahat kesim t-shirt.',
          price: 199.9,
          stock: 50,
          imageUrl: 'https://picsum.photos/seed/tshirt/400/400',
          categoryId: giyim.id,
        },
        {
          name: 'Roman - Yüzyıllık Yalnızlık',
          description: 'Gabriel García Márquez tarafından yazılmış klasik roman.',
          price: 89.9,
          stock: 40,
          imageUrl: 'https://picsum.photos/seed/kitap/400/400',
          categoryId: kitap.id,
        },
      ]);
      console.log('✅ Örnek ürünler eklendi.');
    } else {
      console.log('ℹ️ Ürünler zaten mevcut, tekrar eklenmedi.');
    }

    console.log('🎉 Seed işlemi tamamlandı.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed sırasında hata:', err.message);
    process.exit(1);
  }
}

seed();
