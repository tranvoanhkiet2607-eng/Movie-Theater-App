// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Theater = require('../models/Theater');
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');

// Helper: Định dạng giá vé VND
function formatPriceVND(num) {
  const val = Number(num) || 0;
  return `${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

// Helper: Dọn dẹp các ghế giữ chỗ tạm thời đã hết hạn (hơn 5 phút)
function cleanExpiredHolds(showtime) {
  if (!showtime.heldSeats || showtime.heldSeats.length === 0) return false;
  const now = new Date();
  const initLen = showtime.heldSeats.length;
  showtime.heldSeats = showtime.heldSeats.filter((h) => h.expiresAt > now);
  return showtime.heldSeats.length !== initLen;
}

// Helper: Kiểm tra quy tắc rạp phim không để trống duy nhất 1 ghế đơn lẻ ở giữa hoặc đầu hàng
function validateNoSingleEmptySeats(roomSeats, bookedSet, selectedSeatCodes) {
  const selectedSet = new Set(selectedSeatCodes);
  const rowMap = {};
  roomSeats.forEach((s) => {
    if (!rowMap[s.row]) rowMap[s.row] = [];
    rowMap[s.row].push(s);
  });

  const violations = [];

  Object.keys(rowMap).forEach((row) => {
    const list = rowMap[row].sort((a, b) => a.colNumber - b.colNumber);
    const hasSelectionInRow = list.some((s) => selectedSet.has(s.seatCode));
    if (!hasSelectionInRow) return;

    for (let i = 0; i < list.length; i++) {
      const current = list[i];
      const isTaken =
        bookedSet.has(current.seatCode) ||
        selectedSet.has(current.seatCode) ||
        current.status === 'maintenance';

      if (!isTaken) {
        const prev = i > 0 ? list[i - 1] : null;
        const next = i < list.length - 1 ? list[i + 1] : null;

        const prevIsTaken =
          !prev ||
          bookedSet.has(prev.seatCode) ||
          selectedSet.has(prev.seatCode) ||
          prev.status === 'maintenance';

        const nextIsTaken =
          !next ||
          bookedSet.has(next.seatCode) ||
          selectedSet.has(next.seatCode) ||
          next.status === 'maintenance';

        if (prevIsTaken && nextIsTaken) {
          violations.push(current.seatCode);
        }
      }
    }
  });

  return violations;
}
async function ensureShowtimeBookedSeats(showtime, roomSeats) {
  if (showtime.bookedSeats && showtime.bookedSeats.length > 0) {
    return showtime.bookedSeats;
  }

  const roomTotal = roomSeats.length;
  if (roomTotal > 0 && showtime.totalSeats !== roomTotal) {
    showtime.totalSeats = roomTotal;
  }

  let avail = showtime.availableSeats !== undefined ? Math.min(showtime.availableSeats, roomTotal) : roomTotal;
  let bookedNeeded = Math.max(0, roomTotal - avail);

  // Nếu suất chiếu chưa có dữ liệu đặt ghế, tạo sẵn một số ghế đã đặt ngẫu nhiên trung tâm (~20-30%) để hiển thị trạng thái đã đặt chân thực
  if (bookedNeeded === 0 && roomTotal > 10) {
    bookedNeeded = Math.floor(roomTotal * 0.25);
  }

  if (bookedNeeded <= 0) {
    showtime.bookedSeats = [];
    return [];
  }

  // Chọn ghế mô phỏng đã đặt chân thực (ưu tiên ghế giữa hàng C, D, E)
  const candidateSeats = roomSeats
    .filter((s) => s.status !== 'maintenance')
    .sort((a, b) => {
      const aMid = Math.abs(a.colNumber - 6);
      const bMid = Math.abs(b.colNumber - 6);
      return aMid - bMid;
    });

  const selected = candidateSeats.slice(0, bookedNeeded).map((s) => s.seatCode);
  showtime.bookedSeats = selected;
  showtime.availableSeats = Math.max(0, roomTotal - selected.length);
  await showtime.save();
  return selected;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/seats
// UC23: Lấy danh sách thông tin ghế theo rạp, phòng chiếu, loại ghế, trạng thái
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const {
      theaterId = 't1',
      room = '',
      type = 'all',
      status = 'all',
      row = 'all',
      search = '',
    } = req.query;

    // Lấy danh sách cụm rạp để dropdown filter
    const theaters = await Theater.find().sort({ code: 1 });

    // Tìm các phòng chiếu đang có ghế của rạp này
    const distinctRooms = await Seat.distinct('room', { theaterId });

    // Nếu người dùng chưa chọn room cụ thể, chọn phòng đầu tiên
    const activeRoom = room || (distinctRooms.length > 0 ? distinctRooms[0] : 'Rạp 01');

    // Xây dựng điều kiện lọc
    const filter = { theaterId, room: activeRoom };

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (row && row !== 'all') {
      filter.row = row.toUpperCase();
    }

    if (search && search.trim()) {
      filter.seatCode = { $regex: search.trim(), $options: 'i' };
    }

    // Truy vấn danh sách ghế
    const seats = await Seat.find(filter).sort({ row: 1, colNumber: 1 });

    // Tính toán thống kê toàn bộ của phòng chiếu đó (không phụ thuộc vào bộ lọc type/status/search)
    const allRoomSeats = await Seat.find({ theaterId, room: activeRoom });
    const summary = {
      total: allRoomSeats.length,
      available: allRoomSeats.filter((s) => s.status === 'available').length,
      maintenance: allRoomSeats.filter((s) => s.status === 'maintenance').length,
      reserved: allRoomSeats.filter((s) => s.status === 'reserved').length,
      standardCount: allRoomSeats.filter((s) => s.type === 'standard').length,
      vipCount: allRoomSeats.filter((s) => s.type === 'vip').length,
      coupleCount: allRoomSeats.filter((s) => s.type === 'couple').length,
    };

    // Lấy danh sách các hàng ghế có trong phòng chiếu này
    const distinctRows = await Seat.distinct('row', { theaterId, room: activeRoom });
    distinctRows.sort();

    return res.json({
      success: true,
      theaters,
      rooms: distinctRooms.length > 0 ? distinctRooms : [activeRoom],
      activeTheaterId: theaterId,
      activeRoom,
      rows: distinctRows,
      summary,
      totalMatching: seats.length,
      seats,
    });
  } catch (err) {
    console.error('[GET /api/seats] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách ghế: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/seats/rooms
// Lấy danh sách các phòng chiếu và số lượng ghế của từng phòng theo rạp
// ════════════════════════════════════════════════════════════════════════════
router.get('/rooms', async (req, res) => {
  try {
    const { theaterId = 't1' } = req.query;
    const roomStats = await Seat.aggregate([
      { $match: { theaterId } },
      {
        $group: {
          _id: '$room',
          totalSeats: { $sum: 1 },
          availableSeats: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
          },
          maintenanceSeats: {
            $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] },
          },
          vipSeats: {
            $sum: { $cond: [{ $eq: ['$type', 'vip'] }, 1, 0] },
          },
          standardSeats: {
            $sum: { $cond: [{ $eq: ['$type', 'standard'] }, 1, 0] },
          },
          coupleSeats: {
            $sum: { $cond: [{ $eq: ['$type', 'couple'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      success: true,
      theaterId,
      rooms: roomStats.map((r) => ({
        room: r._id,
        totalSeats: r.totalSeats,
        availableSeats: r.availableSeats,
        maintenanceSeats: r.maintenanceSeats,
        vipSeats: r.vipSeats,
        standardSeats: r.standardSeats,
        coupleSeats: r.coupleSeats,
      })),
    });
  } catch (err) {
    console.error('[GET /api/seats/rooms] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách phòng chiếu: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/seats/showtime/:showtimeId
// UC24 & UC25: Hiển thị sơ đồ ghế, trạng thái còn trống/đã đặt/đang giữ chỗ (Anti-collision)
// ════════════════════════════════════════════════════════════════════════════
router.get('/showtime/:showtimeId', async (req, res) => {
  try {
    const { showtimeId } = req.params;
    const { holdToken, userId } = req.query;
    let showtime = null;

    if (showtimeId.match(/^[0-9a-fA-F]{24}$/)) {
      showtime = await Showtime.findById(showtimeId);
    }
    if (!showtime) {
      showtime = await Showtime.findOne({ code: showtimeId });
    }

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin suất chiếu yêu cầu.',
      });
    }

    // Tự động dọn dẹp các ghế giữ chỗ đã quá hạn
    const hadExpired = cleanExpiredHolds(showtime);
    if (hadExpired) {
      await showtime.save();
    }

    const [movie, theater, roomSeats, otherShowtimes] = await Promise.all([
      Movie.findOne({ code: showtime.movieId }),
      Theater.findOne({ code: showtime.theaterId }),
      Seat.find({ theaterId: showtime.theaterId, room: showtime.room }).sort({ row: 1, colNumber: 1 }),
      Showtime.find({
        movieId: showtime.movieId,
        theaterId: showtime.theaterId,
        dateKey: showtime.dateKey,
      }).sort({ startTime: 1 }),
    ]);

    const bookedSeatCodes = await ensureShowtimeBookedSeats(showtime, roomSeats);
    const bookedSet = new Set(bookedSeatCodes);

    // Map các ghế đang được giữ chỗ (Seat Hold)
    const holdMap = new Map();
    if (showtime.heldSeats && showtime.heldSeats.length > 0) {
      showtime.heldSeats.forEach((h) => {
        holdMap.set(h.seatCode, h);
      });
    }

    // Tìm xem user hiện tại có đang giữ ghế nào không
    let myHoldInfo = null;
    const myHeldCodes = [];
    let myHoldExpiresAt = null;

    if (holdToken || userId) {
      showtime.heldSeats.forEach((h) => {
        const isMine = (holdToken && h.holdToken === holdToken) || (userId && h.userId === userId);
        if (isMine) {
          myHeldCodes.push(h.seatCode);
          if (!myHoldExpiresAt || h.expiresAt > myHoldExpiresAt) {
            myHoldExpiresAt = h.expiresAt;
          }
        }
      });

      if (myHeldCodes.length > 0 && myHoldExpiresAt) {
        const remMs = myHoldExpiresAt.getTime() - Date.now();
        myHoldInfo = {
          seatCodes: myHeldCodes,
          expiresAt: myHoldExpiresAt.toISOString(),
          remainingSeconds: Math.max(0, Math.floor(remMs / 1000)),
        };
      }
    }

    // Xây dựng danh sách ghế kèm trạng thái realtime cho suất chiếu
    const baseShowtimePrice = showtime.price || 95000;
    const seatMap = roomSeats.map((s) => {
      let runtimeStatus = 'available';
      const hold = holdMap.get(s.seatCode);

      if (s.status === 'maintenance') {
        runtimeStatus = 'maintenance';
      } else if (bookedSet.has(s.seatCode)) {
        runtimeStatus = 'booked';
      } else if (hold) {
        const isMine = (holdToken && hold.holdToken === holdToken) || (userId && hold.userId === userId);
        if (isMine) {
          runtimeStatus = 'selected';
        } else {
          runtimeStatus = 'holding'; // Người khác đang giữ chỗ
        }
      }

      // Giá vé phụ thuộc theo loại ghế cho suất chiếu này
      let seatPrice = baseShowtimePrice;
      if (s.type === 'vip') {
        seatPrice = Math.round((baseShowtimePrice * 1.25) / 5000) * 5000;
      } else if (s.type === 'couple') {
        seatPrice = Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000;
      }

      return {
        id: s._id.toString(),
        code: s.code,
        seatCode: s.seatCode,
        row: s.row,
        colNumber: s.colNumber,
        type: s.type,
        basePrice: s.price,
        price: seatPrice,
        priceFormatted: formatPriceVND(seatPrice),
        status: runtimeStatus,
        notes: s.notes || '',
      };
    });

    const summary = {
      totalSeats: seatMap.length,
      availableCount: seatMap.filter((s) => s.status === 'available').length,
      bookedCount: seatMap.filter((s) => s.status === 'booked').length,
      holdingCount: seatMap.filter((s) => s.status === 'holding').length,
      maintenanceCount: seatMap.filter((s) => s.status === 'maintenance').length,
      standardCount: seatMap.filter((s) => s.type === 'standard').length,
      vipCount: seatMap.filter((s) => s.type === 'vip').length,
      coupleCount: seatMap.filter((s) => s.type === 'couple').length,
    };

    return res.json({
      success: true,
      showtime: {
        id: showtime.code,
        code: showtime.code,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        dateStr: showtime.dateStr,
        dateKey: showtime.dateKey,
        room: showtime.room,
        format: showtime.format,
        price: showtime.price,
        priceFormatted: showtime.priceFormatted,
        status: showtime.status,
      },
      movie: movie
        ? {
            id: movie.code,
            title: movie.title,
            originalTitle: movie.originalTitle,
            poster: movie.poster,
            genre: movie.genre,
            durationLabel: movie.durationLabel,
            rating: movie.rating,
            ageRating: movie.ageRating,
            ageDescription: movie.ageDescription,
          }
        : null,
      theater: theater
        ? {
            id: theater.code,
            name: theater.name,
            shortName: theater.shortName,
            address: theater.address,
            area: theater.area,
          }
        : null,
      summary,
      seatMap,
      myHold: myHoldInfo,
      otherShowtimes: otherShowtimes.map((st) => ({
        id: st.code,
        code: st.code,
        startTime: st.startTime,
        room: st.room,
        format: st.format,
        priceFormatted: st.priceFormatted,
        availableSeats: st.availableSeats,
        totalSeats: st.totalSeats,
        status: st.status,
      })),
    });
  } catch (err) {
    console.error('[GET /api/seats/showtime/:showtimeId] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy sơ đồ ghế cho suất chiếu: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/seats/hold
// UC25: Khóa giữ chỗ tạm thời (5 phút) và kiểm tra tình trạng ghế để tránh đặt trùng
// ════════════════════════════════════════════════════════════════════════════
router.post('/hold', async (req, res) => {
  try {
    const { showtimeId, seatCodes, userId, holdToken } = req.body;

    if (!showtimeId || !Array.isArray(seatCodes) || seatCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một ghế để giữ chỗ.',
      });
    }

    if (seatCodes.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chỉ có thể chọn tối đa 8 ghế trong một lần đặt vé.',
      });
    }

    let showtime = await Showtime.findOne({ code: showtimeId });
    if (!showtime && showtimeId.match(/^[0-9a-fA-F]{24}$/)) {
      showtime = await Showtime.findById(showtimeId);
    }

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu yêu cầu.',
      });
    }

    // Dọn dẹp các ghế giữ chỗ đã hết hạn trước khi kiểm tra
    cleanExpiredHolds(showtime);

    // 1. Kiểm tra ghế đã bán
    const bookedSet = new Set(showtime.bookedSeats || []);
    const conflictBooked = seatCodes.filter((c) => bookedSet.has(c));
    if (conflictBooked.length > 0) {
      return res.status(409).json({
        success: false,
        conflictType: 'booked',
        conflictSeats: conflictBooked,
        message: `Ghế [${conflictBooked.join(', ')}] đã có khách hàng khác hoàn tất mua vé. Vui lòng chọn ghế khác!`,
      });
    }

    // 2. Kiểm tra ghế đang được người khác giữ chỗ
    const conflictHolding = [];
    (showtime.heldSeats || []).forEach((h) => {
      const isMine = (holdToken && h.holdToken === holdToken) || (userId && h.userId === userId);
      if (!isMine && seatCodes.includes(h.seatCode)) {
        conflictHolding.push(h.seatCode);
      }
    });

    if (conflictHolding.length > 0) {
      return res.status(409).json({
        success: false,
        conflictType: 'holding',
        conflictSeats: conflictHolding,
        message: `Ghế [${conflictHolding.join(', ')}] đang được một khách hàng khác giữ chỗ. Vui lòng chọn ghế khác hoặc thử lại sau!`,
      });
    }

    // 3. Kiểm tra ghế bảo trì
    const roomSeats = await Seat.find({
      theaterId: showtime.theaterId,
      room: showtime.room,
    });
    const seatInfoMap = new Map(roomSeats.map((s) => [s.seatCode, s]));

    const maintenanceSeats = seatCodes.filter((c) => {
      const s = seatInfoMap.get(c);
      return s && s.status === 'maintenance';
    });

    if (maintenanceSeats.length > 0) {
      return res.status(400).json({
        success: false,
        conflictType: 'maintenance',
        conflictSeats: maintenanceSeats,
        message: `Ghế [${maintenanceSeats.join(', ')}] đang trong quá trình bảo trì kỹ thuật, không thể chọn.`,
      });
    }

    // 4. Kiểm tra quy tắc không để trống 1 ghế đơn lẻ ở giữa hoặc đầu hàng
    const orphanViolations = validateNoSingleEmptySeats(roomSeats, bookedSet, seatCodes);
    if (orphanViolations.length > 0) {
      return res.status(400).json({
        success: false,
        conflictType: 'orphan_seat',
        violationSeats: orphanViolations,
        message: `Quy tắc rạp phim: Không thể để trống duy nhất 1 ghế lẻ loi [${orphanViolations.join(', ')}] ở giữa hoặc đầu hàng. Vui lòng chọn ghế liền kề nhau!`,
      });
    }

    // 5. Cập nhật giữ chỗ (Hold duration: 5 phút = 300 giây)
    const holdDurationMs = 5 * 60 * 1000;
    const expiresAt = new Date(Date.now() + holdDurationMs);

    // Gỡ các ghế cũ của user này nếu có
    showtime.heldSeats = (showtime.heldSeats || []).filter((h) => {
      const isMine = (holdToken && h.holdToken === holdToken) || (userId && h.userId === userId);
      return !isMine;
    });

    // Thêm các ghế mới giữ
    seatCodes.forEach((code) => {
      showtime.heldSeats.push({
        seatCode: code,
        userId: userId || '',
        holdToken: holdToken || '',
        expiresAt,
      });
    });

    await showtime.save();

    return res.json({
      success: true,
      message: `Đã giữ chỗ thành công ${seatCodes.length} ghế trong 05:00 phút!`,
      heldSeats: seatCodes,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: 300,
    });
  } catch (err) {
    console.error('[POST /api/seats/hold] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi giữ chỗ ghế: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/seats/release
// UC25: Hủy giữ chỗ ghế khi người dùng bỏ chọn hoặc thoát màn hình
// ════════════════════════════════════════════════════════════════════════════
router.post('/release', async (req, res) => {
  try {
    const { showtimeId, seatCodes, userId, holdToken } = req.body;

    let showtime = await Showtime.findOne({ code: showtimeId });
    if (!showtime && showtimeId.match(/^[0-9a-fA-F]{24}$/)) {
      showtime = await Showtime.findById(showtimeId);
    }

    if (!showtime) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu.' });
    }

    if (showtime.heldSeats && showtime.heldSeats.length > 0) {
      const releaseSet = seatCodes ? new Set(seatCodes) : null;
      showtime.heldSeats = showtime.heldSeats.filter((h) => {
        const isMine = (holdToken && h.holdToken === holdToken) || (userId && h.userId === userId);
        if (!isMine) return true;
        if (releaseSet) return !releaseSet.has(h.seatCode);
        return false;
      });
      await showtime.save();
    }

    return res.json({
      success: true,
      message: 'Đã giải phóng ghế giữ chỗ thành công.',
    });
  } catch (err) {
    console.error('[POST /api/seats/release] Lỗi:', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi giải phóng ghế: ' + err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/seats/check-seats
// UC25: Kiểm tra nhanh tình trạng khả dụng realtime của danh sách ghế
// ════════════════════════════════════════════════════════════════════════════
router.post('/check-seats', async (req, res) => {
  try {
    const { showtimeId, seatCodes, userId, holdToken } = req.body;
    let showtime = await Showtime.findOne({ code: showtimeId });
    if (!showtime && showtimeId.match(/^[0-9a-fA-F]{24}$/)) {
      showtime = await Showtime.findById(showtimeId);
    }

    if (!showtime) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu.' });
    }

    cleanExpiredHolds(showtime);

    const bookedSet = new Set(showtime.bookedSeats || []);
    const conflictBooked = (seatCodes || []).filter((c) => bookedSet.has(c));
    const conflictHolding = [];

    (showtime.heldSeats || []).forEach((h) => {
      const isMine = (holdToken && h.holdToken === holdToken) || (userId && h.userId === userId);
      if (!isMine && (seatCodes || []).includes(h.seatCode)) {
        conflictHolding.push(h.seatCode);
      }
    });

    const isAvailable = conflictBooked.length === 0 && conflictHolding.length === 0;

    return res.json({
      success: true,
      isAvailable,
      conflictBooked,
      conflictHolding,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/seats/book
// UC24 & UC25: Đặt vé hoàn tất với cơ chế kiểm tra chống đặt trùng tuyệt đối
// ════════════════════════════════════════════════════════════════════════════
router.post('/book', async (req, res) => {
  try {
    const {
      showtimeId,
      seatCodes,
      userId,
      holdToken,
      paymentMethod = 'Ví MoMo',
      combos = '',
    } = req.body;

    if (!showtimeId || !Array.isArray(seatCodes) || seatCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất 1 ghế cần đặt.',
      });
    }

    let showtime = await Showtime.findOne({ code: showtimeId });
    if (!showtime && showtimeId.match(/^[0-9a-fA-F]{24}$/)) {
      showtime = await Showtime.findById(showtimeId);
    }

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu yêu cầu.',
      });
    }

    // Dọn dẹp các hold đã hết hạn
    cleanExpiredHolds(showtime);

    // 1. Kiểm tra chống trùng ghế đã đặt
    const currentBooked = new Set(showtime.bookedSeats || []);
    const alreadyBooked = seatCodes.filter((code) => currentBooked.has(code));

    if (alreadyBooked.length > 0) {
      return res.status(409).json({
        success: false,
        conflictType: 'booked',
        conflictSeats: alreadyBooked,
        message: `Rất tiếc! Ghế [${alreadyBooked.join(', ')}] vừa có khách hàng khác thanh toán thành công. Vui lòng chọn ghế khác!`,
      });
    }

    // 2. Kiểm tra xem có ghế nào đang bị người khác giữ chỗ không
    const heldByOthers = [];
    (showtime.heldSeats || []).forEach((h) => {
      const isMine = (holdToken && h.holdToken === holdToken) || (userId && h.userId === userId);
      if (!isMine && seatCodes.includes(h.seatCode)) {
        heldByOthers.push(h.seatCode);
      }
    });

    if (heldByOthers.length > 0) {
      return res.status(409).json({
        success: false,
        conflictType: 'holding',
        conflictSeats: heldByOthers,
        message: `Ghế [${heldByOthers.join(', ')}] đang được một khách hàng khác giữ chỗ. Vui lòng chọn ghế khác!`,
      });
    }

    // 3. Lấy thông tin chi tiết các ghế để tính tổng tiền
    const seatsInfo = await Seat.find({
      theaterId: showtime.theaterId,
      room: showtime.room,
      seatCode: { $in: seatCodes },
    });

    const maintenanceSeats = seatsInfo
      .filter((s) => s.status === 'maintenance')
      .map((s) => s.seatCode);

    if (maintenanceSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ghế [${maintenanceSeats.join(', ')}] hiện đang bảo trì, không thể đặt vé.`,
      });
    }

    // Tính tổng tiền theo giá suất chiếu và loại ghế
    let totalAmount = 0;
    const baseShowtimePrice = showtime.price || 95000;
    let mainSeatType = 'Thường';

    seatsInfo.forEach((s) => {
      if (s.type === 'vip') {
        totalAmount += Math.round((baseShowtimePrice * 1.25) / 5000) * 5000;
        mainSeatType = 'VIP';
      } else if (s.type === 'couple') {
        totalAmount += Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000;
        mainSeatType = 'Sweetbox';
      } else {
        totalAmount += baseShowtimePrice;
      }
    });

    // Thêm các ghế đã chọn vào bookedSeats của suất chiếu và giải phóng khỏi heldSeats
    showtime.bookedSeats.push(...seatCodes);
    showtime.heldSeats = (showtime.heldSeats || []).filter((h) => !seatCodes.includes(h.seatCode));
    showtime.availableSeats = Math.max(0, showtime.totalSeats - showtime.bookedSeats.length);

    if (showtime.availableSeats === 0) {
      showtime.status = 'sold_out';
    } else if (showtime.availableSeats <= 15) {
      showtime.status = 'almost_full';
    } else if (showtime.availableSeats <= showtime.totalSeats * 0.5) {
      showtime.status = 'filling_fast';
    }
    await showtime.save();

    // Lấy thông tin Movie và Theater để tạo vé chi tiết
    const [movie, theater] = await Promise.all([
      Movie.findOne({ code: showtime.movieId }),
      Theater.findOne({ code: showtime.theaterId }),
    ]);

    const bookingCode = `CNM-${Math.floor(100000 + Math.random() * 900000)}`;
    const [startH, startM] = (showtime.startTime || '19:00').split(':').map(Number);
    const bookingDate = new Date();
    bookingDate.setHours(startH || 19, startM || 0, 0, 0);

    const newBooking = await Booking.create({
      userId: userId || '6ad83e54513aa79a219bb6bf',
      bookingCode,
      movieTitle: movie ? movie.title : 'Phim Chiếu Rạp CineMax',
      moviePoster: movie ? movie.poster : '',
      cinemaName: theater ? theater.name : 'CineMax Cinema',
      hallName: showtime.room,
      showtime: bookingDate,
      format: showtime.format,
      seats: seatCodes,
      seatType: mainSeatType,
      combos: combos || '',
      totalAmount,
      paymentMethod,
      paymentStatus: 'paid',
      status: 'upcoming',
      qrCodeData: `CINEMAX-TICKET-${bookingCode}-${seatCodes.join('')}`,
    });

    return res.status(201).json({
      success: true,
      message: `Đặt vé thành công cho các ghế: ${seatCodes.join(', ')}!`,
      booking: newBooking.toJSON(),
      showtime: {
        code: showtime.code,
        availableSeats: showtime.availableSeats,
        totalSeats: showtime.totalSeats,
        status: showtime.status,
      },
    });
  } catch (err) {
    console.error('[POST /api/seats/book] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đặt ghế: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/seats/:id
// Lấy thông tin chi tiết một ghế
// ════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let seat = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      seat = await Seat.findById(id);
    }
    if (!seat) {
      seat = await Seat.findOne({ code: id });
    }

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin ghế yêu cầu.',
      });
    }

    return res.json({
      success: true,
      seat,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/seats
// UC23: Thêm mới 1 ghế vào phòng chiếu
// ════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const {
      theaterId,
      room,
      row,
      colNumber,
      seatCode: rawSeatCode,
      type = 'standard',
      price,
      status = 'available',
      notes = '',
    } = req.body;

    if (!theaterId || !room || !row || colNumber === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Cụm rạp, Phòng chiếu, Hàng ghế và Số thứ tự ghế.',
      });
    }

    const cleanRow = String(row).trim().toUpperCase();
    const cleanCol = Number(colNumber);
    const colPad = cleanCol < 10 ? `0${cleanCol}` : `${cleanCol}`;
    const cleanSeatCode = (rawSeatCode ? String(rawSeatCode).trim().toUpperCase() : `${cleanRow}${colPad}`);

    // Kiểm tra trùng mã ghế trong cùng rạp & phòng chiếu
    const existing = await Seat.findOne({
      theaterId,
      room,
      seatCode: cleanSeatCode,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Ghế ${cleanSeatCode} đã tồn tại trong ${room} của rạp này!`,
      });
    }

    // Giá mặc định theo loại nếu không truyền
    let finalPrice = Number(price);
    if (!finalPrice || finalPrice <= 0) {
      if (type === 'vip') finalPrice = 110000;
      else if (type === 'couple') finalPrice = 180000;
      else finalPrice = 90000;
    }

    const code = `seat-${theaterId}-${room.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${cleanSeatCode.toLowerCase()}`;

    const newSeat = await Seat.create({
      code,
      seatCode: cleanSeatCode,
      row: cleanRow,
      colNumber: cleanCol,
      theaterId,
      room,
      type,
      price: finalPrice,
      priceFormatted: formatPriceVND(finalPrice),
      status,
      notes: notes.trim(),
    });

    return res.status(201).json({
      success: true,
      message: `Đã thêm thành công ghế ${cleanSeatCode} vào ${room}!`,
      seat: newSeat,
    });
  } catch (err) {
    console.error('[POST /api/seats] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể thêm ghế: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/seats/generate-room
// UC23: Tự động khởi tạo sơ đồ ma trận ghế cho phòng chiếu
// ════════════════════════════════════════════════════════════════════════════
router.post('/generate-room', async (req, res) => {
  try {
    const {
      theaterId,
      room,
      rows = ['A', 'B', 'C', 'D', 'E', 'F'],
      colsPerRow = 12,
      vipRows = ['C', 'D', 'E'],
      coupleRows = ['F'],
      standardPrice = 90000,
      vipPrice = 110000,
      couplePrice = 180000,
      overwrite = true,
    } = req.body;

    if (!theaterId || !room) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn Cụm rạp và Phòng chiếu cần khởi tạo ghế.',
      });
    }

    if (overwrite) {
      await Seat.deleteMany({ theaterId, room });
    }

    const seatsToInsert = [];
    const vipSet = new Set((vipRows || []).map((r) => r.toUpperCase()));
    const coupleSet = new Set((coupleRows || []).map((r) => r.toUpperCase()));

    for (const r of rows) {
      const cleanRow = r.toUpperCase();
      const isCoupleRow = coupleSet.has(cleanRow);
      const isVipRow = vipSet.has(cleanRow);

      const maxCols = isCoupleRow ? Math.floor(colsPerRow / 2) : colsPerRow;

      for (let c = 1; c <= maxCols; c++) {
        let type = 'standard';
        let price = Number(standardPrice) || 90000;

        if (isCoupleRow) {
          type = 'couple';
          price = Number(couplePrice) || 180000;
        } else if (isVipRow) {
          type = 'vip';
          price = Number(vipPrice) || 110000;
        }

        const colPad = c < 10 ? `0${c}` : `${c}`;
        const seatCode = isCoupleRow ? `SW-${cleanRow}${c}` : `${cleanRow}${colPad}`;
        const code = `seat-${theaterId}-${room.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${seatCode.toLowerCase()}`;

        seatsToInsert.push({
          code,
          seatCode,
          row: cleanRow,
          colNumber: c,
          theaterId,
          room,
          type,
          price,
          priceFormatted: formatPriceVND(price),
          status: 'available',
          notes: isCoupleRow ? 'Ghế đôi Sweetbox cao cấp' : isVipRow ? 'Ghế VIP tầm nhìn trung tâm' : '',
        });
      }
    }

    const inserted = await Seat.insertMany(seatsToInsert);

    return res.status(201).json({
      success: true,
      message: `Đã khởi tạo thành công ${inserted.length} ghế cho ${room}!`,
      totalCreated: inserted.length,
    });
  } catch (err) {
    console.error('[POST /api/seats/generate-room] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi khởi tạo sơ đồ phòng chiếu: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/seats/:id
// UC23: Chỉnh sửa thông tin ghế (Mã, Hàng, Cột, Loại ghế, Giá, Trạng thái, Ghi chú)
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      seatCode,
      row,
      colNumber,
      type,
      price,
      status,
      notes,
    } = req.body;

    let seat = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      seat = await Seat.findById(id);
    }
    if (!seat) {
      seat = await Seat.findOne({ code: id });
    }

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghế cần chỉnh sửa.',
      });
    }

    // Nếu đổi mã ghế, kiểm tra xem có bị trùng với ghế khác trong phòng không
    if (seatCode && seatCode.trim().toUpperCase() !== seat.seatCode) {
      const newCode = seatCode.trim().toUpperCase();
      const duplicate = await Seat.findOne({
        theaterId: seat.theaterId,
        room: seat.room,
        seatCode: newCode,
        _id: { $ne: seat._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Mã ghế ${newCode} đã tồn tại trong ${seat.room}! Vui lòng chọn mã khác.`,
        });
      }
      seat.seatCode = newCode;
    }

    if (row) seat.row = String(row).trim().toUpperCase();
    if (colNumber !== undefined) seat.colNumber = Number(colNumber);
    if (type) seat.type = type;

    if (price !== undefined) {
      const numPrice = Number(price);
      seat.price = numPrice;
      seat.priceFormatted = formatPriceVND(numPrice);
    }

    if (status) seat.status = status;
    if (notes !== undefined) seat.notes = String(notes).trim();

    await seat.save();

    return res.json({
      success: true,
      message: `Đã cập nhật thông tin ghế ${seat.seatCode} thành công!`,
      seat,
    });
  } catch (err) {
    console.error('[PUT /api/seats/:id] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông tin ghế: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/seats/:id
// UC23: Xóa 1 ghế khỏi phòng chiếu
// ════════════════════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let seat = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      seat = await Seat.findByIdAndDelete(id);
    }
    if (!seat) {
      seat = await Seat.findOneAndDelete({ code: id });
    }

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghế cần xóa.',
      });
    }

    return res.json({
      success: true,
      message: `Đã xóa ghế ${seat.seatCode} (${seat.room}) thành công khỏi hệ thống!`,
      deletedId: seat._id,
      seatCode: seat.seatCode,
    });
  } catch (err) {
    console.error('[DELETE /api/seats/:id] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa ghế: ' + err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/seats/batch-delete
// UC23: Xóa nhiều ghế đã chọn
// ════════════════════════════════════════════════════════════════════════════
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách mã ghế cần xóa không hợp lệ.',
      });
    }

    const result = await Seat.deleteMany({
      $or: [{ _id: { $in: ids } }, { code: { $in: ids } }],
    });

    return res.json({
      success: true,
      message: `Đã xóa thành công ${result.deletedCount} ghế được chọn!`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('[POST /api/seats/batch-delete] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa danh sách ghế: ' + err.message,
    });
  }
});

module.exports = router;

