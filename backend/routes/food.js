// UC37: Manage Food & Drinks (Food Management)
const express = require('express');
const router = express.Router();
const FoodItem = require('../models/FoodItem');
const { requireAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════
// GET /api/food  (Xem danh sách đồ ăn, thức uống, combo)
// ════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { category, search, availableOnly } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (availableOnly === 'true') {
      query.isAvailable = true;
    }

    if (search && search.trim()) {
      query.name = { $regex: new RegExp(search.trim(), 'i') };
    }

    const items = await FoodItem.find(query).sort({ category: 1, createdAt: -1 });
    return res.json({
      success: true,
      items: items.map((item) => item.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/food]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách món ăn.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/food/:id  (Xem chi tiết món ăn)
// ════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn này.' });
    }
    return res.json({ success: true, item: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin món ăn.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/food  (Thêm mới đồ ăn, thức uống, combo - UC37)
// ════════════════════════════════════════════════════════════
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, category, price, description, image, isAvailable, unit } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên món và giá tiền.' });
    }

    const newItem = await FoodItem.create({
      name: name.trim(),
      category: category || 'food',
      price: Number(price),
      description: description ? description.trim() : '',
      image: image || 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500',
      isAvailable: isAvailable !== false,
      unit: unit || 'Phần',
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm món ăn/thức uống thành công!',
      item: newItem.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/food]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi thêm mới món ăn.' });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/food/:id  (Sửa thông tin món ăn - UC37)
// ════════════════════════════════════════════════════════════
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, category, price, description, image, isAvailable, unit } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = Number(price);
    if (description !== undefined) updateData.description = description.trim();
    if (image !== undefined) updateData.image = image;
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    if (unit !== undefined) updateData.unit = unit.trim();

    const updatedItem = await FoodItem.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món để cập nhật.' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật món thành công!',
      item: updatedItem.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/food/:id]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật món ăn.' });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/food/:id/toggle  (Bật/tắt trạng thái còn hàng - UC37)
// ════════════════════════════════════════════════════════════
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn.' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    return res.json({
      success: true,
      message: `Đã đổi trạng thái món sang: ${item.isAvailable ? 'Còn hàng' : 'Hết hàng'}`,
      item: item.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái món.' });
  }
});

// ════════════════════════════════════════════════════════════
// DELETE /api/food/:id  (Xóa món ăn - UC37)
// ════════════════════════════════════════════════════════════
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await FoodItem.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món để xóa.' });
    }

    return res.json({
      success: true,
      message: 'Đã xóa món ăn thành công!',
    });
  } catch (err) {
    console.error('[DELETE /api/food/:id]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa món ăn.' });
  }
});

module.exports = router;

