// Nguyễn Minh Quân - CE180048
// Module Movie Catalog & Movie Management
// UC11: View Movies | UC12: Search Movies | UC13: Filter Movies
// UC14: Manage Movies (CRUD) | UC16: View Movie Trailer

const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const { requireAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════════════════════
// GET /api/movies/genres
// UC13: Lấy danh sách các thể loại phim duy nhất từ database
// ════════════════════════════════════════════════════════════════════════════
router.get('/genres', async (req, res) => {
  try {
    const movies = await Movie.find({}, 'genre');
    const genreSet = new Set();

    movies.forEach((m) => {
      if (m.genre) {
        m.genre
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean)
          .forEach((g) => genreSet.add(g));
      }
    });

    const genres = Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'vi'));

    return res.json({
      success: true,
      genres,
    });
  } catch (err) {
    console.error('[GET /api/movies/genres]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách thể loại phim.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/movies
// UC11: Hiển thị danh sách phim
// UC12: Tìm kiếm phim theo tên, tựa gốc, đạo diễn, diễn viên
// UC13: Lọc phim theo trạng thái, thể loại, độ tuổi, định dạng
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      genre = 'all',
      ageRating = 'all',
      format = 'all',
      sort = 'default',
    } = req.query;

    const mongoQuery = {};

    if (status === 'now_showing') {
      mongoQuery.isNowShowing = true;
    } else if (status === 'coming_soon') {
      mongoQuery.isNowShowing = false;
    }

    if (genre && genre !== 'all') {
      mongoQuery.genre = { $regex: new RegExp(String(genre).trim(), 'i') };
    }

    if (ageRating && ageRating !== 'all') {
      mongoQuery.ageRating = String(ageRating).trim();
    }

    if (format && format !== 'all') {
      mongoQuery.formats = { $in: [String(format).trim()] };
    }

    const trimmedSearch = String(search || '').trim();
    if (trimmedSearch) {
      const searchRegex = new RegExp(trimmedSearch, 'i');
      mongoQuery.$or = [
        { title: searchRegex },
        { originalTitle: searchRegex },
        { director: searchRegex },
        { cast: searchRegex },
      ];
    }

    let movieDocs = await Movie.find(mongoQuery);
    let movies = movieDocs.map((m) => m.toJSON());

    if (sort === 'rating') {
      movies.sort((a, b) => {
        const rateA = parseFloat(a.rating) || 0;
        const rateB = parseFloat(b.rating) || 0;
        return rateB - rateA;
      });
    } else if (sort === 'duration_desc') {
      movies.sort((a, b) => (b.durationMinutes || 0) - (a.durationMinutes || 0));
    } else if (sort === 'title_asc') {
      movies.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    } else if (sort === 'newest') {
      movies.sort((a, b) => {
        const parseDate = (dStr) => {
          if (!dStr) return 0;
          const parts = dStr.split('/');
          if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
          }
          return 0;
        };
        return parseDate(b.releaseDate) - parseDate(a.releaseDate);
      });
    }

    return res.json({
      success: true,
      total: movies.length,
      movies,
    });
  } catch (err) {
    console.error('[GET /api/movies]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách phim từ MongoDB Atlas.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/movies/:id
// UC11: Lấy chi tiết 1 phim theo mã code hoặc ID
// UC16: Lấy kèm link trailerUrl và tóm tắt cốt truyện
// ════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let movieDoc = await Movie.findOne({ code: id });
    if (!movieDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      movieDoc = await Movie.findById(id);
    }

    if (!movieDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin bộ phim này.',
      });
    }

    return res.json({
      success: true,
      movie: movieDoc.toJSON(),
    });
  } catch (err) {
    console.error('[GET /api/movies/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy chi tiết phim.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/movies
// UC14: Thêm mới phim (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      originalTitle = '',
      genre,
      durationMinutes,
      rating = '8.5 ★',
      ageRating = 'T13',
      ageDescription = '',
      poster,
      trailerUrl = '',
      badge = '',
      releaseDate = '',
      director = '',
      cast = [],
      synopsis = '',
      formats = ['2D Phụ đề'],
      isNowShowing = true,
    } = req.body;

    if (!title || !genre || !durationMinutes || !poster) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Tên phim, Thể loại, Thời lượng và Link Poster.',
      });
    }

    const durationNum = Number(durationMinutes);
    if (isNaN(durationNum) || durationNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thời lượng phim phải là số phút hợp lệ lớn hơn 0.',
      });
    }

    const uniqueCode = req.body.code ? String(req.body.code).trim() : `m-${Date.now()}`;

    // Kiểm tra trùng code
    const existingCode = await Movie.findOne({ code: uniqueCode });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: `Mã phim '${uniqueCode}' đã tồn tại trong cơ sở dữ liệu.`,
      });
    }

    const newMovie = await Movie.create({
      code: uniqueCode,
      title: String(title).trim(),
      originalTitle: String(originalTitle).trim(),
      genre: String(genre).trim(),
      durationMinutes: durationNum,
      durationLabel: `${durationNum} phút`,
      rating: String(rating).trim(),
      ageRating,
      ageDescription: String(ageDescription).trim(),
      poster: String(poster).trim(),
      trailerUrl: String(trailerUrl).trim(),
      badge: String(badge).trim(),
      releaseDate: String(releaseDate).trim(),
      director: String(director).trim(),
      cast: Array.isArray(cast) ? cast : String(cast).split(',').map((c) => c.trim()).filter(Boolean),
      synopsis: String(synopsis).trim(),
      formats: Array.isArray(formats) && formats.length > 0 ? formats : ['2D Phụ đề'],
      isNowShowing: Boolean(isNowShowing),
    });

    return res.status(201).json({
      success: true,
      message: `Đã thêm phim '${newMovie.title}' thành công!`,
      movie: newMovie.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/movies]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi thêm phim mới.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/movies/:id
// UC14: Chỉnh sửa thông tin phim (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let movieDoc = await Movie.findOne({ code: id });
    if (!movieDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      movieDoc = await Movie.findById(id);
    }

    if (!movieDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bộ phim cần chỉnh sửa.',
      });
    }

    const {
      title,
      originalTitle,
      genre,
      durationMinutes,
      rating,
      ageRating,
      ageDescription,
      poster,
      trailerUrl,
      badge,
      releaseDate,
      director,
      cast,
      synopsis,
      formats,
      isNowShowing,
    } = req.body;

    if (title !== undefined) movieDoc.title = String(title).trim();
    if (originalTitle !== undefined) movieDoc.originalTitle = String(originalTitle).trim();
    if (genre !== undefined) movieDoc.genre = String(genre).trim();
    if (durationMinutes !== undefined) {
      const dur = Number(durationMinutes);
      if (!isNaN(dur) && dur > 0) {
        movieDoc.durationMinutes = dur;
        movieDoc.durationLabel = `${dur} phút`;
      }
    }
    if (rating !== undefined) movieDoc.rating = String(rating).trim();
    if (ageRating !== undefined) movieDoc.ageRating = ageRating;
    if (ageDescription !== undefined) movieDoc.ageDescription = String(ageDescription).trim();
    if (poster !== undefined) movieDoc.poster = String(poster).trim();
    if (trailerUrl !== undefined) movieDoc.trailerUrl = String(trailerUrl).trim();
    if (badge !== undefined) movieDoc.badge = String(badge).trim();
    if (releaseDate !== undefined) movieDoc.releaseDate = String(releaseDate).trim();
    if (director !== undefined) movieDoc.director = String(director).trim();
    if (cast !== undefined) {
      movieDoc.cast = Array.isArray(cast) ? cast : String(cast).split(',').map((c) => c.trim()).filter(Boolean);
    }
    if (synopsis !== undefined) movieDoc.synopsis = String(synopsis).trim();
    if (formats !== undefined && Array.isArray(formats)) movieDoc.formats = formats;
    if (isNowShowing !== undefined) movieDoc.isNowShowing = Boolean(isNowShowing);

    await movieDoc.save();

    return res.json({
      success: true,
      message: `Đã cập nhật thông tin phim '${movieDoc.title}' thành công!`,
      movie: movieDoc.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/movies/:id]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi cập nhật phim.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/movies/:id
// UC14: Xóa phim (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let movieDoc = await Movie.findOne({ code: id });
    if (!movieDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      movieDoc = await Movie.findById(id);
    }

    if (!movieDoc) {
      return res.status(404).json({
        success: false,
        message: 'Bộ phim không tồn tại hoặc đã bị xóa trước đó.',
      });
    }

    // Kiểm tra xem phim có suất chiếu nào đang hoạt động không
    const hasShowtimes = await Showtime.countDocuments({ movieId: movieDoc.code });
    if (hasShowtimes > 0) {
      return res.status(409).json({
        success: false,
        message: `Không thể xóa phim '${movieDoc.title}' vì hiện có ${hasShowtimes} suất chiếu liên kết trong hệ thống. Vui lòng xóa các suất chiếu trước.`,
      });
    }

    await Movie.deleteOne({ _id: movieDoc._id });

    return res.json({
      success: true,
      message: `Đã xóa bộ phim '${movieDoc.title}' thành công!`,
      deletedCode: movieDoc.code,
    });
  } catch (err) {
    console.error('[DELETE /api/movies/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa phim.',
    });
  }
});

module.exports = router;
