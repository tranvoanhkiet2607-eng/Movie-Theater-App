// Nguyễn Minh Quân - CE180048
// UC15: Manage Genres - Genre Management Router
const express = require('express');
const router = express.Router();
const Genre = require('../models/Genre');
const Movie = require('../models/Movie');
const { requireAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════════════════════
// GET /api/genres
// UC15: Lấy danh sách thể loại kèm số lượng phim tương ứng (Công khai)
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const [genresDocs, movies] = await Promise.all([
      Genre.find().sort({ name: 1 }),
      Movie.find({}, 'genre'),
    ]);

    const genres = genresDocs.map((g) => {
      const item = g.toJSON();
      // Đếm số lượng phim thuộc thể loại này
      const count = movies.filter((m) =>
        m.genre && m.genre.toLowerCase().includes(item.name.toLowerCase())
      ).length;
      return {
        ...item,
        movieCount: count,
      };
    });

    return res.json({
      success: true,
      total: genres.length,
      genres,
    });
  } catch (err) {
    console.error('[GET /api/genres]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách thể loại.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/genres
// UC15: Thêm mới thể loại phim (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description = '' } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên thể loại không được để trống.',
      });
    }

    const trimmedName = String(name).trim();

    // Kiểm tra trùng tên thể loại
    const existing = await Genre.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Thể loại '${trimmedName}' đã tồn tại trong hệ thống.`,
      });
    }

    const uniqueCode = req.body.code
      ? String(req.body.code).trim()
      : `g-${Date.now()}`;

    const newGenre = await Genre.create({
      code: uniqueCode,
      name: trimmedName,
      description: String(description).trim(),
    });

    return res.status(201).json({
      success: true,
      message: `Đã thêm thể loại '${newGenre.name}' thành công!`,
      genre: { ...newGenre.toJSON(), movieCount: 0 },
    });
  } catch (err) {
    console.error('[POST /api/genres]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi thêm thể loại.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/genres/:id
// UC15: Chỉnh sửa thể loại phim (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    let genreDoc = await Genre.findOne({ code: id });
    if (!genreDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      genreDoc = await Genre.findById(id);
    }

    if (!genreDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thể loại cần chỉnh sửa.',
      });
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Tên thể loại không được rỗng.' });
      }

      // Kiểm tra trùng tên với thể loại khác
      const existing = await Genre.findOne({
        _id: { $ne: genreDoc._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Tên thể loại '${trimmedName}' đã bị trùng lặp.`,
        });
      }

      genreDoc.name = trimmedName;
    }

    if (description !== undefined) {
      genreDoc.description = String(description).trim();
    }

    await genreDoc.save();

    return res.json({
      success: true,
      message: `Đã cập nhật thể loại '${genreDoc.name}' thành công!`,
      genre: genreDoc.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/genres/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật thể loại.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/genres/:id
// UC15: Xóa thể loại phim (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let genreDoc = await Genre.findOne({ code: id });
    if (!genreDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      genreDoc = await Genre.findById(id);
    }

    if (!genreDoc) {
      return res.status(404).json({
        success: false,
        message: 'Thể loại không tồn tại hoặc đã bị xóa.',
      });
    }

    // Kiểm tra xem có phim nào đang dùng thể loại này không
    const movieCount = await Movie.countDocuments({
      genre: { $regex: new RegExp(genreDoc.name, 'i') },
    });

    if (movieCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Không thể xóa thể loại '${genreDoc.name}' vì đang có ${movieCount} bộ phim thuộc thể loại này.`,
      });
    }

    await Genre.deleteOne({ _id: genreDoc._id });

    return res.json({
      success: true,
      message: `Đã xóa thể loại '${genreDoc.name}' thành công!`,
      deletedCode: genreDoc.code,
    });
  } catch (err) {
    console.error('[DELETE /api/genres/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa thể loại.',
    });
  }
});

module.exports = router;
