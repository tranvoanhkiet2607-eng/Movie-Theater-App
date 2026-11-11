// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();

const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Showtime = require('../models/Showtime');
const Seat = require('../models/Seat');
const SeatType = require('../models/SeatType');
const { requireAdmin } = require('../middleware/auth');

// Sinh danh sách các ngày chiếu thực tế theo thời gian thực (7 ngày kể từ hôm nay)
function getDynamicShowtimeDates(numDays = 7) {
  const DAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const FULL_DAY_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const dates = [];
  const now = new Date();

  for (let i = 0; i < numDays; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const dayOfWeek = d.getDay();
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const yearNum = d.getFullYear();

    let dayLabel = DAY_LABELS[dayOfWeek];
    if (i === 0) dayLabel = 'Hôm nay';
    else if (i === 1) dayLabel = 'Ngày mai';

    const dateDisplay = `${dateNum}/${monthNum}`;
    const fullDateStr = `${dateNum}/${monthNum}/${yearNum}`;
    const fullDateLabel = `${FULL_DAY_LABELS[dayOfWeek]}, ${fullDateStr}`;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    dates.push({
      dateKey: `d${i}`,
      dayLabel,
      dateDisplay,
      fullDateLabel,
      fullDateStr,
      isWeekend,
    });
  }

  return dates;
}

const SHOWTIME_FORMATS = [
  '2D Phụ đề',
  '2D Lồng tiếng',
  '3D Phụ đề',
  'IMAX 3D',
  '4DX',
  'Gold Class VIP',
];

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
  const dates = getDynamicShowtimeDates();
  const found = dates.find((d) => d.dateKey === dateKey);
  if (found) return found.fullDateStr;
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

// Kiểm tra xem 2 khoảng thời gian [startA, endA] và [startB, endB] có bị chồng lấn không
function isTimeOverlapping(startTimeA, durationA, startTimeB, durationB) {
  const startA = timeToMinutes(startTimeA);
  const endA = startA + Number(durationA || 120);
  const startB = timeToMinutes(startTimeB);
  const endB = startB + Number(durationB || 120);
  return startA < endB && startB < endA;
}

// ─── UC27: Helper tính toán chi tiết giá vé theo suất chiếu và loại ghế ────────
function calculateShowtimePricing(showtime, seatTypesConfig = [], roomSeats = []) {
  const baseShowtimePrice = Number(showtime.price) || 90000;

  // Xác định ngày trong tuần
  let dayOfWeek = 0;
  let dayName = 'Ngày thường';
  let isWeekend = false;
  let isHappyWednesday = false;

  if (showtime.dateKey) {
    const d = new Date(showtime.dateKey);
    if (!isNaN(d.getTime())) {
      dayOfWeek = d.getDay();
      isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
      isHappyWednesday = dayOfWeek === 3;
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      dayName = dayNames[dayOfWeek];
    }
  }

  // Khung giờ
  const hour = parseInt(String(showtime.startTime).split(':')[0], 10);
  const isEarlyBird = hour < 12;
  const isPrimeTime = hour >= 18 && hour < 22;
  const isLateNight = hour >= 22;

  // Tính giá theo từng loại ghế
  const standardBase = baseShowtimePrice;
  const vipBase = Math.round((baseShowtimePrice * 1.25) / 5000) * 5000;
  const vipSurcharge = vipBase - standardBase;
  const coupleBase = Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000;
  const coupleSurcharge = coupleBase - standardBase;

  // Thống kê ghế phòng
  const totalStandard = roomSeats.filter((s) => s.type === 'standard').length;
  const totalVip = roomSeats.filter((s) => s.type === 'vip').length;
  const totalCouple = roomSeats.filter((s) => s.type === 'couple').length;

  const bookedSet = new Set(showtime.bookedSeats || []);
  const availStandard = roomSeats.filter(
    (s) => s.type === 'standard' && s.status === 'available' && !bookedSet.has(s.seatCode)
  ).length;
  const availVip = roomSeats.filter(
    (s) => s.type === 'vip' && s.status === 'available' && !bookedSet.has(s.seatCode)
  ).length;
  const availCouple = roomSeats.filter(
    (s) => s.type === 'couple' && s.status === 'available' && !bookedSet.has(s.seatCode)
  ).length;

  return {
    basePrice: standardBase,
    basePriceFormatted: formatPriceVND(standardBase),
    factors: {
      dayName,
      isWeekend,
      isHappyWednesday,
      isEarlyBird,
      isPrimeTime,
      isLateNight,
      format: showtime.format || '2D Phụ Đề',
      timeSlot: isEarlyBird
        ? 'Suất sáng (< 12:00)'
        : isPrimeTime
        ? 'Suất giờ vàng (18:00 - 22:00)'
        : isLateNight
        ? 'Suất khuya (> 22:00)'
        : 'Suất ban ngày (12:00 - 17:00)',
      dayBadge: isHappyWednesday ? 'Thứ 4 Vui Vẻ' : isWeekend ? 'Cuối tuần' : 'Ngày thường',
    },
    seatTypes: [
      {
        type: 'standard',
        name: 'Ghế Thường',
        nameEn: 'Standard Seat',
        color: '#64748B',
        capacity: 1,
        price: standardBase,
        priceFormatted: formatPriceVND(standardBase),
        surcharge: 0,
        surchargeFormatted: '+0đ',
        totalSeats: totalStandard,
        availableSeats: availStandard,
        audiencePrices: [
          {
            segment: 'adult',
            label: 'Người lớn tiêu chuẩn',
            price: standardBase,
            priceFormatted: formatPriceVND(standardBase),
            discount: 'Giá gốc',
          },
          {
            segment: 'student',
            label: 'Học sinh / Sinh viên (U22)',
            price: Math.max(50000, standardBase - 20000),
            priceFormatted: formatPriceVND(Math.max(50000, standardBase - 20000)),
            discount: '-20.000đ',
          },
          {
            segment: 'childSenior',
            label: 'Trẻ em / Người cao tuổi',
            price: Math.max(50000, standardBase - 20000),
            priceFormatted: formatPriceVND(Math.max(50000, standardBase - 20000)),
            discount: '-20.000đ',
          },
          {
            segment: 'member',
            label: 'Thành viên CineMax VIP',
            price: Math.max(50000, standardBase - 10000),
            priceFormatted: formatPriceVND(Math.max(50000, standardBase - 10000)),
            discount: '-10.000đ',
          },
        ],
        description: 'Vị trí tiêu chuẩn, tầm nhìn toàn cảnh, đệm ngồi êm ái.',
      },
      {
        type: 'vip',
        name: 'Ghế VIP',
        nameEn: 'VIP Prime Seat',
        color: '#F59E0B',
        capacity: 1,
        price: vipBase,
        priceFormatted: formatPriceVND(vipBase),
        surcharge: vipSurcharge,
        surchargeFormatted: `+${formatPriceVND(vipSurcharge)}`,
        totalSeats: totalVip,
        availableSeats: availVip,
        audiencePrices: [
          {
            segment: 'adult',
            label: 'Người lớn tiêu chuẩn',
            price: vipBase,
            priceFormatted: formatPriceVND(vipBase),
            discount: 'Giá gốc',
          },
          {
            segment: 'student',
            label: 'Học sinh / Sinh viên (U22)',
            price: Math.max(70000, vipBase - 15000),
            priceFormatted: formatPriceVND(Math.max(70000, vipBase - 15000)),
            discount: '-15.000đ',
          },
          {
            segment: 'member',
            label: 'Thành viên CineMax VIP',
            price: Math.max(70000, vipBase - 10000),
            priceFormatted: formatPriceVND(Math.max(70000, vipBase - 10000)),
            discount: '-10.000đ',
          },
        ],
        description: 'Vị trí trung tâm (Sweet spot), góc nhìn và âm thanh vòm Dolby hoàn hảo nhất.',
      },
      {
        type: 'couple',
        name: 'Ghế Đôi Sweetbox',
        nameEn: 'Sweetbox Couple Seat',
        color: '#EC4899',
        capacity: 2,
        price: coupleBase,
        priceFormatted: formatPriceVND(coupleBase),
        surcharge: coupleSurcharge,
        surchargeFormatted: `+${formatPriceVND(coupleSurcharge)} (Gói 2 vé)`,
        totalSeats: totalCouple,
        availableSeats: availCouple,
        audiencePrices: [
          {
            segment: 'couple',
            label: 'Trọn gói dành cho 2 người',
            price: coupleBase,
            priceFormatted: formatPriceVND(coupleBase),
            discount: 'Bao gồm 2 vé',
          },
          {
            segment: 'member',
            label: 'Thành viên CineMax VIP',
            price: Math.max(120000, coupleBase - 15000),
            priceFormatted: formatPriceVND(Math.max(120000, coupleBase - 15000)),
            discount: '-15.000đ',
          },
        ],
        description: 'Ghế sofa đôi rộng rãi cho 2 người ở hàng ghế cuối, vách ngăn riêng tư cao, lãng mạn.',
      },
    ],
  };
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
            dates: getDynamicShowtimeDates(),
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
      dates: getDynamicShowtimeDates(),
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
// UC27: HIỂN THỊ GIÁ VÉ THEO SUẤT CHIẾU VÀ LOẠI GHẾ (PRICING)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/showtimes/pricing-matrix - Bảng ma trận giá vé niêm yết toàn hệ thống
router.get('/pricing-matrix', async (req, res) => {
  try {
    const seatTypes = await SeatType.find().sort({ sortOrder: 1 });

    const matrix = {
      formats: [
        {
          format: '2D Phụ Đề / Lồng Tiếng',
          description: 'Hình ảnh sắc nét kỹ thuật số, âm thanh vòm tiêu chuẩn 7.1',
          days: [
            {
              dayType: 'Thứ 2 - Thứ 5 (Ngày thường)',
              slots: [
                { time: 'Trước 12:00', standard: 75000, vip: 95000, couple: 160000 },
                { time: '12:00 - 17:00', standard: 85000, vip: 105000, couple: 180000 },
                { time: '17:00 - 22:00 (Giờ vàng)', standard: 95000, vip: 115000, couple: 200000 },
                { time: 'Sau 22:00', standard: 80000, vip: 100000, couple: 170000 },
              ],
            },
            {
              dayType: 'Thứ 4 Vui Vẻ (Happy Wednesday)',
              badge: 'Đồng giá ưu đãi',
              slots: [
                { time: 'Mọi khung giờ', standard: 65000, vip: 85000, couple: 150000 },
              ],
            },
            {
              dayType: 'Thứ 6, Thứ 7, CN & Ngày Lễ',
              slots: [
                { time: 'Trước 12:00', standard: 90000, vip: 110000, couple: 190000 },
                { time: '12:00 - 17:00', standard: 100000, vip: 125000, couple: 210000 },
                { time: '17:00 - 22:00 (Giờ vàng)', standard: 110000, vip: 135000, couple: 230000 },
                { time: 'Sau 22:00', standard: 95000, vip: 115000, couple: 200000 },
              ],
            },
          ],
        },
        {
          format: '3D Kỹ Thuật Số',
          description: 'Hiệu ứng nổi sống động 3 chiều, kính lọc quang học cao cấp',
          days: [
            {
              dayType: 'Thứ 2 - Thứ 5',
              slots: [
                { time: 'Mọi khung giờ', standard: 115000, vip: 140000, couple: 240000 },
              ],
            },
            {
              dayType: 'Thứ 6, Thứ 7, CN & Lễ',
              slots: [
                { time: 'Mọi khung giờ', standard: 135000, vip: 165000, couple: 280000 },
              ],
            },
          ],
        },
        {
          format: 'IMAX Laser 2D / 3D',
          description: 'Màn hình siêu đại uốn cong, âm thanh đa tầng sống động bậc nhất',
          days: [
            {
              dayType: 'Mọi ngày trong tuần',
              slots: [
                { time: 'Mọi khung giờ', standard: 160000, vip: 195000, couple: 340000 },
              ],
            },
          ],
        },
      ],
      audienceDiscounts: [
        { label: 'Học sinh / Sinh viên (U22)', rule: 'Giảm 20.000đ cho Ghế Thường các ngày Thứ 2 đến Thứ 5' },
        { label: 'Trẻ em (dưới 1.3m)', rule: 'Giảm 20.000đ áp dụng cho mọi suất chiếu trước 22:00' },
        { label: 'Người cao tuổi (trên 55 tuổi)', rule: 'Đồng giá 60.000đ trước 17:00 từ Thứ 2 đến Thứ 6' },
        { label: 'Thành viên CineMax VIP', rule: 'Tích 10% điểm thưởng và giảm 10.000đ/vé' },
      ],
      seatTypes: seatTypes.map((st) => ({
        code: st.code,
        name: st.name,
        color: st.color,
        capacity: st.capacity,
        description: st.description,
        surcharge: st.surcharge,
        surchargeFormatted: formatPriceVND(st.surcharge),
      })),
    };

    return res.json({ success: true, matrix });
  } catch (err) {
    console.error('[GET /api/showtimes/pricing-matrix]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy bảng ma trận giá vé.' });
  }
});

// GET /api/showtimes/:id/pricing - Hiển thị giá vé theo suất chiếu và loại ghế (UC27)
router.get('/:id/pricing', async (req, res) => {
  try {
    const { id } = req.params;
    let slotDoc = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      slotDoc = await Showtime.findById(id);
    }
    if (!slotDoc) {
      slotDoc = await Showtime.findOne({ code: id });
    }

    if (!slotDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu yêu cầu.',
      });
    }

    const [movieDoc, theaterDoc, roomSeats, seatTypesConfig] = await Promise.all([
      Movie.findOne({ code: slotDoc.movieId }),
      Theater.findOne({ code: slotDoc.theaterId }),
      Seat.find({ theaterId: slotDoc.theaterId, room: slotDoc.room }),
      SeatType.find().sort({ sortOrder: 1 }),
    ]);

    const pricing = calculateShowtimePricing(slotDoc, seatTypesConfig, roomSeats);

    return res.json({
      success: true,
      showtime: {
        id: slotDoc.code,
        code: slotDoc.code,
        room: slotDoc.room,
        format: slotDoc.format,
        startTime: slotDoc.startTime,
        endTime: slotDoc.endTime,
        dateStr: slotDoc.dateStr,
        dateKey: slotDoc.dateKey,
        totalSeats: slotDoc.totalSeats,
        availableSeats: slotDoc.availableSeats,
        status: slotDoc.status,
      },
      movie: movieDoc
        ? {
            id: movieDoc.code,
            code: movieDoc.code,
            title: movieDoc.title,
            duration: movieDoc.duration,
            posterUrl: movieDoc.posterUrl,
            ageRating: movieDoc.ageRating,
          }
        : null,
      theater: theaterDoc
        ? {
            id: theaterDoc.code,
            code: theaterDoc.code,
            name: theaterDoc.name,
            shortName: theaterDoc.shortName,
            address: theaterDoc.address,
          }
        : null,
      pricing,
    });
  } catch (err) {
    console.error('[GET /api/showtimes/:id/pricing]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy bảng giá vé của suất chiếu: ' + err.message,
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
