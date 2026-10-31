// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();

const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Showtime = require('../models/Showtime');
const { SHOWTIME_DATES, SHOWTIME_FORMATS } = require('../seed/seedShowtimes');

function getTimePeriod(startTime) {
  const hour = parseInt(String(startTime).split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'late';
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/showtimes
// UC21: Truy vấn lịch chiếu trực tiếp từ MongoDB Atlas theo Phim, Rạp, Ngày chiếu, Định dạng, Khung giờ
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const {
      dateKey = 'd0',
      movieId = 'all',
      theaterId = 'all',
      area = 'all',
      format = 'all',
      period = 'all',
      searchQuery = '',
    } = req.query;

    // 1. Lấy toàn bộ danh sách Phim và Cụm rạp từ MongoDB Atlas
    const [movieDocs, theaterDocs] = await Promise.all([
      Movie.find().sort({ code: 1 }),
      Theater.find().sort({ code: 1 }),
    ]);

    const movies = movieDocs.map((m) => m.toJSON());
    const theaters = theaterDocs.map((t) => t.toJSON());

    // 2. Xây dựng bộ lọc MongoDB cho collection "showtimes"
    const mongoQuery = {};

    if (dateKey && dateKey !== 'all') {
      mongoQuery.dateKey = String(dateKey);
    }

    if (movieId && movieId !== 'all') {
      mongoQuery.movieId = String(movieId);
    }

    if (theaterId && theaterId !== 'all') {
      mongoQuery.theaterId = String(theaterId);
    }

    if (format && format !== 'all') {
      mongoQuery.format = String(format);
    }

    // Lọc theo khu vực (Area) thông qua danh sách mã rạp thuộc khu vực đó
    if (area && area !== 'all') {
      const theaterCodesInArea = theaters
        .filter((t) => t.area === String(area))
        .map((t) => t.id);

      if (mongoQuery.theaterId) {
        if (!theaterCodesInArea.includes(mongoQuery.theaterId)) {
          return res.json({
            success: true,
            total: 0,
            dates: SHOWTIME_DATES,
            formats: SHOWTIME_FORMATS,
            movies,
            theaters,
            showtimes: [],
          });
        }
      } else {
        mongoQuery.theaterId = { $in: theaterCodesInArea };
      }
    }

    // 3. Truy vấn danh sách suất chiếu từ MongoDB Atlas
    const showtimeDocs = await Showtime.find(mongoQuery).sort({ startTime: 1, code: 1 });
    let showtimes = showtimeDocs.map((s) => s.toJSON());

    // 4. Lọc theo khung giờ trong ngày (morning / afternoon / evening / late)
    if (period && period !== 'all') {
      showtimes = showtimes.filter((s) => getTimePeriod(s.startTime) === String(period));
    }

    // 5. Lọc theo từ khóa tìm kiếm (tên phim, thể loại, tên rạp, địa chỉ, khu vực)
    const trimmedQuery = String(searchQuery || '').trim().toLowerCase();
    if (trimmedQuery) {
      const movieMap = new Map(movies.map((m) => [m.id, m]));
      const theaterMap = new Map(theaters.map((t) => [t.id, t]));

      showtimes = showtimes.filter((slot) => {
        const movie = movieMap.get(slot.movieId);
        const theater = theaterMap.get(slot.theaterId);

        const matchMovie =
          movie &&
          (movie.title.toLowerCase().includes(trimmedQuery) ||
            movie.originalTitle.toLowerCase().includes(trimmedQuery) ||
            movie.genre.toLowerCase().includes(trimmedQuery));

        const matchTheater =
          theater &&
          (theater.name.toLowerCase().includes(trimmedQuery) ||
            theater.shortName.toLowerCase().includes(trimmedQuery) ||
            theater.area.toLowerCase().includes(trimmedQuery) ||
            theater.address.toLowerCase().includes(trimmedQuery));

        return Boolean(matchMovie || matchTheater);
      });
    }

    return res.json({
      success: true,
      total: showtimes.length,
      dates: SHOWTIME_DATES,
      formats: SHOWTIME_FORMATS,
      movies,
      theaters,
      showtimes,
    });
  } catch (err) {
    console.error('[GET /api/showtimes]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tải lịch chiếu từ MongoDB Atlas.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/showtimes/:id
// Chi tiết 1 suất chiếu kèm thông tin Phim & Rạp từ MongoDB Atlas
// ════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const slotDoc = await Showtime.findOne({ code: req.params.id });
    if (!slotDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu.',
      });
    }

    const slot = slotDoc.toJSON();
    const [movieDoc, theaterDoc] = await Promise.all([
      Movie.findOne({ code: slot.movieId }),
      Theater.findOne({ code: slot.theaterId }),
    ]);

    return res.json({
      success: true,
      showtime: slot,
      movie: movieDoc ? movieDoc.toJSON() : null,
      theater: theaterDoc ? theaterDoc.toJSON() : null,
    });
  } catch (err) {
    console.error('[GET /api/showtimes/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy chi tiết suất chiếu.',
    });
  }
});

module.exports = router;

