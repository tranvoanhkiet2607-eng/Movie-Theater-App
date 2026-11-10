// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();

const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Showtime = require('../models/Showtime');
const { SHOWTIME_DATES, SHOWTIME_FORMATS } = require('../seed/seedShowtimes');
const { requireAdmin } = require('../middleware/auth');

function getTimePeriod(startTime) {
  const hour = parseInt(String(startTime).split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'late';
}

function timeToMinutes(timeStr) {
  const parts = String(timeStr).trim().split(':');
  if (parts.length !== 2) return NaN;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (
    !Number.isInteger(hh) ||
    !Number.isInteger(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    return NaN;
  }
  return hh * 60 + mm;
}

function computeEndTime(startTime, durationMinutes) {
  const startMins = timeToMinutes(startTime);
  const totalMinutes = startMins + Number(durationMinutes || 120);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function formatPriceVND(price) {
  const num = Math.round(Number(price) || 0);
  return `${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

function computeSeatStatus(availableSeats, totalSeats) {
  if (availableSeats <= 0) return 'sold_out';
  if (availableSeats <= 15) return 'almost_full';
  if (availableSeats <= Math.floor(totalSeats * 0.35)) return 'filling_fast';
  return 'available';
}

function resolveDateStr(dateKey) {
  const found = SHOWTIME_DATES.find((d) => d.dateKey === dateKey);
  return found ? `${found.dateDisplay}/2026` : '15/10/2026';
}

// Kiểm tra xem 2 khoảng thời gian [startA, endA] và [startB, endB] có bị chồng lấn không
function isTimeOverlapping(startTimeA, durationA, startTimeB, durationB) {
  const startA = timeToMinutes(startTimeA);
  const endA = startA + Number(durationA || 120);
  const startB = timeToMinutes(startTimeB);
  const endB = startB + Number(durationB || 120);
  return startA < endB && startB < endA;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/showtimes
// UC21 & UC22: Truy vấn lịch chiếu trực tiếp từ MongoDB Atlas
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

    // 5. Lọc theo từ khóa tìm kiếm (tên phim, thể loại, tên rạp, địa chỉ, khu vực, phòng chiếu)
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

        const matchSlot =
          slot.room.toLowerCase().includes(trimmedQuery) ||
          slot.startTime.toLowerCase().includes(trimmedQuery) ||
          slot.format.toLowerCase().includes(trimmedQuery);

        return Boolean(matchMovie || matchTheater || matchSlot);
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

// ════════════════════════════════════════════════════════════════════════════
// POST /api/showtimes
// UC22: Thêm mới suất chiếu trực tiếp lên MongoDB Atlas
// ════════════════════════════════════════════════════════════════════════════
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      movieId,
      theaterId,
      dateKey,
      startTime,
      room,
      format,
      price,
      totalSeats = 140,
      availableSeats,
    } = req.body;

    if (!movieId || !theaterId || !dateKey || !startTime || !room || !format || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin: Phim, Cụm rạp, Ngày chiếu, Giờ bắt đầu, Phòng chiếu, Định dạng và Giá vé.',
      });
    }

    const normalizedStart = String(startTime).trim();
    if (Number.isNaN(timeToMinutes(normalizedStart))) {
      return res.status(400).json({
        success: false,
        message: 'Giờ bắt đầu không hợp lệ. Vui lòng nhập theo định dạng HH:mm (ví dụ: 19:30).',
      });
    }

    // định dạng chuẩn 2 chữ số HH:mm
    const [rawH, rawM] = normalizedStart.split(':').map(Number);
    const formattedStartTime = `${String(rawH).padStart(2, '0')}:${String(rawM).padStart(2, '0')}`;

    const [movieDoc, theaterDoc] = await Promise.all([
      Movie.findOne({ code: String(movieId) }),
      Theater.findOne({ code: String(theaterId) }),
    ]);

    if (!movieDoc) {
      return res.status(404).json({ success: false, message: 'Phim được chọn không tồn tại trong cơ sở dữ liệu.' });
    }
    if (!theaterDoc) {
      return res.status(404).json({ success: false, message: 'Cụm rạp được chọn không tồn tại trong cơ sở dữ liệu.' });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 10000) {
      return res.status(400).json({
        success: false,
        message: 'Giá vé phải là số hợp lệ (tối thiểu 10.000đ).',
      });
    }

    const numericTotalSeats = Math.max(10, Number(totalSeats) || 140);
    const numericAvailSeats =
      availableSeats !== undefined && availableSeats !== ''
        ? Math.max(0, Math.min(numericTotalSeats, Number(availableSeats)))
        : numericTotalSeats;

    // Kiểm tra trùng lịch phòng chiếu trong cùng Rạp + Ngày + Phòng
    const existingSlotsInRoom = await Showtime.find({
      theaterId: String(theaterId),
      dateKey: String(dateKey),
      room: String(room).trim(),
    });

    const allMovies = await Movie.find();
    const durationMap = new Map(allMovies.map((m) => [m.code, m.durationMinutes]));

    for (const existing of existingSlotsInRoom) {
      const existingDuration = durationMap.get(existing.movieId) || 120;
      if (
        isTimeOverlapping(
          formattedStartTime,
          movieDoc.durationMinutes,
          existing.startTime,
          existingDuration
        )
      ) {
        return res.status(409).json({
          success: false,
          message: `Trùng lịch phòng chiếu! ${String(room).trim()} tại ${theaterDoc.shortName} đã có suất chiếu lúc ${existing.startTime} ~ ${existing.endTime}.`,
        });
      }
    }

    const endTime = computeEndTime(formattedStartTime, movieDoc.durationMinutes);
    const priceFormatted = formatPriceVND(numericPrice);
    const status = computeSeatStatus(numericAvailSeats, numericTotalSeats);
    const uniqueCode = `st-${Date.now()}`;

    const createdDoc = await Showtime.create({
      code: uniqueCode,
      movieId: String(movieId),
      theaterId: String(theaterId),
      dateKey: String(dateKey),
      dateStr: resolveDateStr(String(dateKey)),
      startTime: formattedStartTime,
      endTime,
      room: String(room).trim(),
      format: String(format),
      price: numericPrice,
      priceFormatted,
      totalSeats: numericTotalSeats,
      availableSeats: numericAvailSeats,
      status,
    });

    return res.status(201).json({
      success: true,
      message: `Đã thêm suất chiếu ${formattedStartTime} (${movieDoc.title} - ${theaterDoc.shortName}) thành công!`,
      showtime: createdDoc.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/showtimes]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi thêm suất chiếu mới.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/showtimes/:id
// UC22: Cập nhật / Sửa thông tin suất chiếu trực tiếp trên MongoDB Atlas
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const slotCode = req.params.id;
    const existingSlot = await Showtime.findOne({ code: slotCode });

    if (!existingSlot) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu cần chỉnh sửa trên MongoDB Atlas.',
      });
    }

    const nextMovieId = req.body.movieId ? String(req.body.movieId) : existingSlot.movieId;
    const nextTheaterId = req.body.theaterId ? String(req.body.theaterId) : existingSlot.theaterId;
    const nextDateKey = req.body.dateKey ? String(req.body.dateKey) : existingSlot.dateKey;
    const nextRoom = req.body.room ? String(req.body.room).trim() : existingSlot.room;
    const nextFormat = req.body.format ? String(req.body.format) : existingSlot.format;

    const rawStartTime = req.body.startTime ? String(req.body.startTime).trim() : existingSlot.startTime;
    if (Number.isNaN(timeToMinutes(rawStartTime))) {
      return res.status(400).json({
        success: false,
        message: 'Giờ bắt đầu không hợp lệ. Vui lòng nhập đúng định dạng HH:mm (ví dụ: 19:30).',
      });
    }
    const [rawH, rawM] = rawStartTime.split(':').map(Number);
    const nextStartTime = `${String(rawH).padStart(2, '0')}:${String(rawM).padStart(2, '0')}`;

    const [movieDoc, theaterDoc] = await Promise.all([
      Movie.findOne({ code: nextMovieId }),
      Theater.findOne({ code: nextTheaterId }),
    ]);

    if (!movieDoc) {
      return res.status(404).json({ success: false, message: 'Phim được chọn không tồn tại.' });
    }
    if (!theaterDoc) {
      return res.status(404).json({ success: false, message: 'Cụm rạp được chọn không tồn tại.' });
    }

    const nextPrice = req.body.price !== undefined ? Number(req.body.price) : existingSlot.price;
    if (Number.isNaN(nextPrice) || nextPrice < 10000) {
      return res.status(400).json({
        success: false,
        message: 'Giá vé phải là số hợp lệ (tối thiểu 10.000đ).',
      });
    }

    const nextTotalSeats =
      req.body.totalSeats !== undefined
        ? Math.max(10, Number(req.body.totalSeats) || existingSlot.totalSeats)
        : existingSlot.totalSeats;

    const nextAvailableSeats =
      req.body.availableSeats !== undefined
        ? Math.max(0, Math.min(nextTotalSeats, Number(req.body.availableSeats)))
        : Math.min(nextTotalSeats, existingSlot.availableSeats);

    // Kiểm tra trùng lịch phòng chiếu với các suất chiếu khác trong cùng Rạp + Ngày + Phòng
    const otherSlotsInRoom = await Showtime.find({
      code: { $ne: slotCode },
      theaterId: nextTheaterId,
      dateKey: nextDateKey,
      room: nextRoom,
    });

    const allMovies = await Movie.find();
    const durationMap = new Map(allMovies.map((m) => [m.code, m.durationMinutes]));

    for (const other of otherSlotsInRoom) {
      const otherDuration = durationMap.get(other.movieId) || 120;
      if (
        isTimeOverlapping(
          nextStartTime,
          movieDoc.durationMinutes,
          other.startTime,
          otherDuration
        )
      ) {
        return res.status(409).json({
          success: false,
          message: `Trùng lịch phòng chiếu! ${nextRoom} tại ${theaterDoc.shortName} đã có suất chiếu lúc ${other.startTime} ~ ${other.endTime}.`,
        });
      }
    }

    existingSlot.movieId = nextMovieId;
    existingSlot.theaterId = nextTheaterId;
    existingSlot.dateKey = nextDateKey;
    existingSlot.dateStr = resolveDateStr(nextDateKey);
    existingSlot.startTime = nextStartTime;
    existingSlot.endTime = computeEndTime(nextStartTime, movieDoc.durationMinutes);
    existingSlot.room = nextRoom;
    existingSlot.format = nextFormat;
    existingSlot.price = nextPrice;
    existingSlot.priceFormatted = formatPriceVND(nextPrice);
    existingSlot.totalSeats = nextTotalSeats;
    existingSlot.availableSeats = nextAvailableSeats;
    existingSlot.status = computeSeatStatus(nextAvailableSeats, nextTotalSeats);

    await existingSlot.save();

    return res.json({
      success: true,
      message: `Đã cập nhật suất chiếu ${nextStartTime} (${movieDoc.title} - ${theaterDoc.shortName}) thành công!`,
      showtime: existingSlot.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/showtimes/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật suất chiếu.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/showtimes/:id
// UC22: Xóa suất chiếu trực tiếp khỏi MongoDB Atlas
// ════════════════════════════════════════════════════════════════════════════
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const slotCode = req.params.id;
    const deleted = await Showtime.findOneAndDelete({ code: slotCode });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Suất chiếu không tồn tại hoặc đã bị xóa trước đó.',
      });
    }

    return res.json({
      success: true,
      message: `Đã xóa suất chiếu ${deleted.startTime} (${deleted.room}) thành công!`,
      deletedId: slotCode,
    });
  } catch (err) {
    console.error('[DELETE /api/showtimes/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa suất chiếu.',
    });
  }
});

module.exports = router;
