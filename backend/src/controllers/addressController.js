const { addressRepository } = require('../repositories');

// GET /api/addresses
async function getAddresses(req, res) {
  try {
    const addresses = await addressRepository.findUserAddresses(req.user.id);
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: 'Adresler alınırken hata oluştu.', error: err.message });
  }
}

// POST /api/addresses
async function createAddress(req, res) {
  try {
    const { title, city, district, address, phone, isDefault } = req.body;

    if (!city || !district || !address) {
      return res.status(400).json({ message: 'İl, ilçe ve açık adres zorunludur.' });
    }

    if (isDefault) {
      await addressRepository.resetUserDefaultAddresses(req.user.id);
    }

    // İlk adres ise otomatik varsayılan yap
    const existingCount = await addressRepository.count({ where: { userId: req.user.id } });
    const markDefault = isDefault || existingCount === 0;

    const newAddress = await addressRepository.create({
      userId: req.user.id,
      title: title || 'Ev Adresi',
      city,
      district,
      address,
      phone: phone || null,
      isDefault: markDefault,
    });

    res.status(201).json(newAddress);
  } catch (err) {
    res.status(500).json({ message: 'Adres eklenirken hata oluştu.', error: err.message });
  }
}

// PUT /api/addresses/:id
async function updateAddress(req, res) {
  try {
    const { id } = req.params;
    const { title, city, district, address, phone, isDefault } = req.body;

    const item = await addressRepository.findUserAddressById(id, req.user.id);
    if (!item) {
      return res.status(404).json({ message: 'Adres bulunamadı.' });
    }

    if (isDefault) {
      await addressRepository.resetUserDefaultAddresses(req.user.id);
    }

    if (title !== undefined) item.title = title;
    if (city !== undefined) item.city = city;
    if (district !== undefined) item.district = district;
    if (address !== undefined) item.address = address;
    if (phone !== undefined) item.phone = phone;
    if (isDefault !== undefined) item.isDefault = isDefault;

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Adres güncellenirken hata oluştu.', error: err.message });
  }
}

// DELETE /api/addresses/:id
async function deleteAddress(req, res) {
  try {
    const { id } = req.params;
    const item = await addressRepository.findUserAddressById(id, req.user.id);
    if (!item) {
      return res.status(404).json({ message: 'Adres bulunamadı.' });
    }

    await item.destroy();
    res.json({ message: 'Adres başarıyla silindi.' });
  } catch (err) {
    res.status(500).json({ message: 'Adres silinirken hata oluştu.', error: err.message });
  }
}

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
