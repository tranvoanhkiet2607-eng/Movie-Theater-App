// UC40: Review Movies (Review & Rating)
// UC41: Manage Reviews (Review Administration)
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Movie = require('../models/Movie');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════
// GET /api/reviews/movie/:movieId  (UC40: Xem đánh giá của một bộ phim)
// ════════════════════════════════════════════════════════════
router.get('/movie/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;

    const reviews = await Review.find({
      movieId,
      status: 'approved',
    }).sort({ createdAt: -1 });

    const totalCount = reviews.length;
    let averageRating = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalCount > 0) {
      let sum = 0;
      reviews.forEach((r) => {
        sum += r.rating;
        const star = Math.min(5, Math.max(1, Math.round(r.rating)));
        distribution[star] = (distribution[star] || 0) + 1;
      });
      averageRating = Number((sum / totalCount).toFixed(1));
    }

    return res.json({
      success: true,
      movieId,
      totalCount,
      averageRating,
      distribution,
      reviews: reviews.map((r) => r.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/reviews/movie/:movieId]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách đánh giá.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/reviews  (UC40: Tạo mới đánh giá, xếp hạng phim)
// ════════════════════════════════════════════════════════════
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { movieId, movieTitle, rating, comment } = req.body;
    const userId = (req.user && req.user.id) || req.body.userId || 'user_guest_' + Date.now().toString(36);
    const userName = (req.user && req.user.fullName) || (req.body.userName && req.body.userName.trim()) || 'Khán giả CineMax';
    const userAvatar = (req.user && req.user.avatarUrl) || req.body.userAvatar || '';

    if (!movieId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn số sao đánh giá và nhập nội dung nhận xét.',
      });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Điểm đánh giá phải từ 1 đến 5 sao.' });
    }

    // Lấy tên phim nếu chưa truyền
    let resolvedTitle = movieTitle;
    if (!resolvedTitle) {
      const foundMovie = await Movie.findOne({ code: movieId });
      if (foundMovie) resolvedTitle = foundMovie.title;
    }

    const newReview = await Review.create({
      movieId,
      movieTitle: resolvedTitle || 'Phim rạp',
      userId: userId || 'user_guest_' + Date.now().toString(36),
      userName: (userName && userName.trim()) || 'Khán giả CineMax',
      userAvatar: userAvatar || '',
      rating: numRating,
      comment: comment.trim(),
      status: 'approved',
    });

    return res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá phim!',
      review: newReview.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/reviews]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo đánh giá.' });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/reviews/:id  (UC40: Sửa đánh giá đã gửi)
// ════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const updateData = {};

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (numRating >= 1 && numRating <= 5) updateData.rating = numRating;
    }
    if (comment !== undefined) updateData.comment = comment.trim();

    const updated = await Review.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá để sửa.' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật đánh giá thành công!',
      review: updated.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/reviews/:id]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi sửa đánh giá.' });
  }
});

// ════════════════════════════════════════════════════════════
// DELETE /api/reviews/:id  (UC40 & UC41: Xóa đánh giá)
// ════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá để xóa.' });
    }

    return res.json({
      success: true,
      message: 'Đã xóa đánh giá thành công!',
    });
  } catch (err) {
    console.error('[DELETE /api/reviews/:id]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa đánh giá.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/reviews/admin/all  (UC41: Quản trị viên xem toàn bộ đánh giá)
// ════════════════════════════════════════════════════════════
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { status, search, movieId } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (movieId && movieId !== 'all') {
      query.movieId = movieId;
    }

    if (search && search.trim()) {
      query.$or = [
        { comment: { $regex: new RegExp(search.trim(), 'i') } },
        { userName: { $regex: new RegExp(search.trim(), 'i') } },
        { movieTitle: { $regex: new RegExp(search.trim(), 'i') } },
      ];
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 });
    return res.json({
      success: true,
      total: reviews.length,
      reviews: reviews.map((r) => r.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/reviews/admin/all]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách quản lý đánh giá.' });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/reviews/admin/:id/status  (UC41: Kiểm duyệt đánh giá - Duyệt / Ẩn / Vi phạm)
// ════════════════════════════════════════════════════════════
router.patch('/admin/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'hidden', 'flagged'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái kiểm duyệt không hợp lệ.' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    const labelMap = {
      approved: 'Đã duyệt công khai',
      hidden: 'Đã ẩn',
      flagged: 'Đánh dấu vi phạm',
    };

    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái đánh giá: ${labelMap[status]}`,
      review: review.toJSON(),
    });
  } catch (err) {
    console.error('[PATCH /api/reviews/admin/:id/status]', err);
    return res.status(500).json({ success: false, message: 'Lỗi kiểm duyệt đánh giá.' });
  }
});

module.exports = router;

