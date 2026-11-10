// Module Movie Catalog: UC11 (View Movies), UC12 (Search Movies), UC13 (Filter Movies)
const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

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
        // Tách các thể loại ngăn cách bởi dấu phẩy
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
// UC13: Lọc phim theo trạng thái (đang chiếu/sắp chiếu), thể loại, độ tuổi, định dạng
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all', // 'all' | 'now_showing' | 'coming_soon'
      genre = 'all',
      ageRating = 'all',
      format = 'all',
      sort = 'default', // 'default' | 'rating' | 'newest' | 'title_asc' | 'duration_desc'
    } = req.query;

    const mongoQuery = {};

    // 1. UC13: Lọc theo trạng thái phim
    if (status === 'now_showing') {
      mongoQuery.isNowShowing = true;
    } else if (status === 'coming_soon') {
      mongoQuery.isNowShowing = false;
    }

    // 2. UC13: Lọc theo thể loại phim (tìm kiếm tương đối trong chuỗi genre)
    if (genre && genre !== 'all') {
      mongoQuery.genre = { $regex: new RegExp(String(genre).trim(), 'i') };
    }

    // 3. UC13: Lọc theo độ tuổi (P, K, T13, T16, T18)
    if (ageRating && ageRating !== 'all') {
      mongoQuery.ageRating = String(ageRating).trim();
    }

    // 4. UC13: Lọc theo định dạng chiếu (formats array chứa format cần tìm)
    if (format && format !== 'all') {
      mongoQuery.formats = { $in: [String(format).trim()] };
    }

    // 5. UC12: Tìm kiếm đa trường (Tên phim, Tựa gốc, Đạo diễn, Diễn viên)
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

    // 6. Truy vấn danh sách phim từ MongoDB Atlas
    let movieDocs = await Movie.find(mongoQuery);
    let movies = movieDocs.map((m) => m.toJSON());

    // 7. Sắp xếp kết quả (Sort)
    if (sort === 'rating') {
      // Sắp xếp theo rating giảm dần (lấy số thực từ chuỗi "8.9 ★")
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
      // Sắp xếp theo ngày khởi chiếu (định dạng DD/MM/YYYY)
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
// UC11: Lấy chi tiết 1 phim theo mã phim (code) hoặc ID
// ════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm theo code (ví dụ 'm1', 'm2'...)
    let movieDoc = await Movie.findOne({ code: id });

    // Nếu không tìm thấy và id có định dạng ObjectId hợp lệ thì thử tìm theo _id
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

module.exports = router;
