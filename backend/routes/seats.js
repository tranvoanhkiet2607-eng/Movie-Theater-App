// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const SeatType = require('../models/SeatType');
const Theater = require('../models/Theater');
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');
const Order = require('../models/Order');
const Promotion = require('../models/Promotion');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { DEFAULT_SEAT_TYPES } = require('../seed/seedSeats');

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
// UC26: QUẢN LÝ CÁC LOẠI GHẾ (THƯỜNG, VIP, GHẾ ĐÔI / SWEETBOX)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/seats/types - Lấy danh sách cấu hình các loại ghế và thống kê số lượng
router.get('/types', async (req, res) => {
  try {
    const { theaterId, room } = req.query;

    // Tự động seed 3 loại ghế nếu chưa có
    let seatTypes = await SeatType.find().sort({ sortOrder: 1 });
    if (!seatTypes || seatTypes.length === 0) {
      await SeatType.insertMany(DEFAULT_SEAT_TYPES);
      seatTypes = await SeatType.find().sort({ sortOrder: 1 });
    }

    // Filter thống kê ghế theo rạp và phòng nếu có
    const seatFilter = {};
    if (theaterId && theaterId !== 'all') seatFilter.theaterId = theaterId;
    if (room && room !== 'all') seatFilter.room = room;

    const allSeats = await Seat.find(seatFilter).lean();
    const totalSeats = allSeats.length;

    // Tính thống kê thực tế cho từng loại ghế
    const enhancedTypes = seatTypes.map((st) => {
      const typeSeats = allSeats.filter((s) => s.type === st.code);
      const totalCount = typeSeats.length;
      const availableCount = typeSeats.filter((s) => s.status === 'available').length;
      const maintenanceCount = typeSeats.filter((s) => s.status === 'maintenance').length;
      const reservedCount = typeSeats.filter((s) => s.status === 'reserved').length;
      const percentage = totalSeats > 0 ? Math.round((totalCount / totalSeats) * 100) : 0;
      const estimatedRevenue = totalCount * (st.basePrice || 0);

      const rowsSet = new Set(typeSeats.map((s) => s.row));
      const usedInRows = Array.from(rowsSet).sort();

      return {
        ...st.toJSON(),
        stats: {
          totalCount,
          availableCount,
          maintenanceCount,
          reservedCount,
          percentage,
          estimatedRevenue,
          estimatedRevenueFormatted: formatPriceVND(estimatedRevenue),
          usedInRows,
        },
      };
    });

    const standardCount = allSeats.filter((s) => s.type === 'standard').length;
    const vipCount = allSeats.filter((s) => s.type === 'vip').length;
    const coupleCount = allSeats.filter((s) => s.type === 'couple').length;

    return res.json({
      success: true,
      seatTypes: enhancedTypes,
      summary: {
        totalSeats,
        standardCount,
        vipCount,
        coupleCount,
      },
      filter: {
        theaterId: theaterId || 'all',
        room: room || 'all',
      },
    });
  } catch (err) {
    console.error('[GET /api/seats/types] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách loại ghế: ' + err.message,
    });
  }
});

// GET /api/seats/types/:code - Chi tiết 1 loại ghế
router.get('/types/:code', async (req, res) => {
  try {
    const { code } = req.params;
    let seatType = await SeatType.findOne({ code: code.toLowerCase() });
    if (!seatType) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy loại ghế với mã "${code}".`,
      });
    }

    const { theaterId, room } = req.query;
    const filter = { type: code.toLowerCase() };
    if (theaterId && theaterId !== 'all') filter.theaterId = theaterId;
    if (room && room !== 'all') filter.room = room;

    const matchingSeats = await Seat.find(filter).lean();
    const rowsSet = new Set(matchingSeats.map((s) => s.row));

    return res.json({
      success: true,
      seatType: {
        ...seatType.toJSON(),
        stats: {
          totalCount: matchingSeats.length,
          availableCount: matchingSeats.filter((s) => s.status === 'available').length,
          maintenanceCount: matchingSeats.filter((s) => s.status === 'maintenance').length,
          usedInRows: Array.from(rowsSet).sort(),
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/seats/types/:code] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy thông tin loại ghế: ' + err.message,
    });
  }
});

// PUT /api/seats/types/:code - Cập nhật cấu hình loại ghế (giá, tên, mô tả, màu sắc, tiện ích)
router.put('/types/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const {
      name,
      nameEn,
      description,
      color,
      accentColor,
      basePrice,
      surcharge,
      features,
      defaultRows,
      isActive,
      applyToExistingSeats,
      theaterId,
      room,
    } = req.body;

    let seatType = await SeatType.findOne({ code: code.toLowerCase() });
    if (!seatType) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy loại ghế "${code}" để cập nhật.`,
      });
    }

    if (name !== undefined) seatType.name = name.trim();
    if (nameEn !== undefined) seatType.nameEn = nameEn.trim();
    if (description !== undefined) seatType.description = description.trim();
    if (color !== undefined) seatType.color = color.trim();
    if (accentColor !== undefined) seatType.accentColor = accentColor.trim();
    if (basePrice !== undefined) {
      const p = Number(basePrice);
      if (isNaN(p) || p < 0) {
        return res.status(400).json({ success: false, message: 'Giá vé cơ bản không hợp lệ.' });
      }
      seatType.basePrice = p;
    }
    if (surcharge !== undefined) {
      const s = Number(surcharge);
      if (!isNaN(s)) seatType.surcharge = s;
    }
    if (Array.isArray(features)) seatType.features = features.map((f) => String(f).trim()).filter(Boolean);
    if (Array.isArray(defaultRows)) seatType.defaultRows = defaultRows.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
    if (isActive !== undefined) seatType.isActive = Boolean(isActive);

    await seatType.save();

    let syncedSeatsCount = 0;
    // Nếu người dùng chọn đồng bộ giá mới cho các ghế hiện có
    if (applyToExistingSeats && basePrice !== undefined) {
      const syncFilter = { type: code.toLowerCase() };
      if (theaterId && theaterId !== 'all') syncFilter.theaterId = theaterId;
      if (room && room !== 'all') syncFilter.room = room;

      const updateResult = await Seat.updateMany(syncFilter, {
        $set: {
          price: Number(basePrice),
          priceFormatted: formatPriceVND(Number(basePrice)),
        },
      });
      syncedSeatsCount = updateResult.modifiedCount || 0;
    }

    return res.json({
      success: true,
      message: `Cập nhật cấu hình loại ghế "${seatType.name}" thành công!${syncedSeatsCount > 0 ? ` Đã đồng bộ giá mới cho ${syncedSeatsCount} ghế.` : ''}`,
      seatType,
      syncedSeatsCount,
    });
  } catch (err) {
    console.error('[PUT /api/seats/types/:code] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật loại ghế: ' + err.message,
    });
  }
});

// POST /api/seats/types/batch-assign-row - Chuyển đổi loại ghế hàng loạt theo hàng ghế
router.post('/types/batch-assign-row', async (req, res) => {
  try {
    const { theaterId, room, rows, newType, updatePrice = true } = req.body;

    if (!theaterId || !room || !rows || !rows.length || !newType) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ rạp, phòng chiếu, danh sách hàng ghế và loại ghế mới.',
      });
    }

    const typeConfig = await SeatType.findOne({ code: newType.toLowerCase() });
    if (!typeConfig) {
      return res.status(400).json({
        success: false,
        message: `Loại ghế "${newType}" không tồn tại trong hệ thống.`,
      });
    }

    const parsedRows = rows.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
    const updateData = { type: newType.toLowerCase() };

    if (updatePrice && typeConfig.basePrice) {
      updateData.price = typeConfig.basePrice;
      updateData.priceFormatted = formatPriceVND(typeConfig.basePrice);
    }

    const result = await Seat.updateMany(
      {
        theaterId,
        room,
        row: { $in: parsedRows },
      },
      { $set: updateData }
    );

    return res.json({
      success: true,
      message: `Đã chuyển đổi thành công ${result.modifiedCount} ghế ở hàng ${parsedRows.join(', ')} sang loại ${typeConfig.name}.`,
      updatedCount: result.modifiedCount,
      theaterId,
      room,
      rows: parsedRows,
      newType: typeConfig.code,
    });
  } catch (err) {
    console.error('[POST /api/seats/types/batch-assign-row] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi chuyển đổi loại ghế theo hàng: ' + err.message,
    });
  }
});

// POST /api/seats/types/reset-defaults - Khôi phục cấu hình mặc định cho 3 loại ghế
router.post('/types/reset-defaults', async (req, res) => {
  try {
    await SeatType.deleteMany({});
    const inserted = await SeatType.insertMany(DEFAULT_SEAT_TYPES);
    return res.json({
      success: true,
      message: 'Đã khôi phục 3 loại ghế chuẩn (Thường, VIP, Đôi Sweetbox) thành công!',
      seatTypes: inserted,
    });
  } catch (err) {
    console.error('[POST /api/seats/types/reset-defaults] Lỗi:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi khôi phục loại ghế mặc định: ' + err.message,
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
      pricing: {
        standardPrice: baseShowtimePrice,
        standardPriceFormatted: formatPriceVND(baseShowtimePrice),
        vipPrice: Math.round((baseShowtimePrice * 1.25) / 5000) * 5000,
        vipPriceFormatted: formatPriceVND(Math.round((baseShowtimePrice * 1.25) / 5000) * 5000),
        couplePrice: Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000,
        couplePriceFormatted: formatPriceVND(Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000),
        format: showtime.format,
      },
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
// GET /api/seats/showtime/:showtimeId/pricing
// UC27: Lấy chi tiết bảng giá vé áp dụng cho suất chiếu và loại ghế
// ════════════════════════════════════════════════════════════════════════════
router.get('/showtime/:showtimeId/pricing', async (req, res) => {
  try {
    const { showtimeId } = req.params;
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
        message: 'Không tìm thấy thông tin suất chiếu.',
      });
    }

    const [movie, theater, roomSeats] = await Promise.all([
      Movie.findOne({ code: showtime.movieId }),
      Theater.findOne({ code: showtime.theaterId }),
      Seat.find({ theaterId: showtime.theaterId, room: showtime.room }),
    ]);

    const baseShowtimePrice = Number(showtime.price) || 90000;
    const standardBase = baseShowtimePrice;
    const vipBase = Math.round((baseShowtimePrice * 1.25) / 5000) * 5000;
    const coupleBase = Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000;

    const bookedSet = new Set(showtime.bookedSeats || []);
    const availStd = roomSeats.filter(
      (s) => s.type === 'standard' && s.status === 'available' && !bookedSet.has(s.seatCode)
    ).length;
    const availVip = roomSeats.filter(
      (s) => s.type === 'vip' && s.status === 'available' && !bookedSet.has(s.seatCode)
    ).length;
    const availCpl = roomSeats.filter(
      (s) => s.type === 'couple' && s.status === 'available' && !bookedSet.has(s.seatCode)
    ).length;

    return res.json({
      success: true,
      showtime: {
        code: showtime.code,
        room: showtime.room,
        format: showtime.format,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        dateStr: showtime.dateStr,
        dateKey: showtime.dateKey,
        basePrice: standardBase,
        basePriceFormatted: formatPriceVND(standardBase),
      },
      movie: movie
        ? {
            title: movie.title,
            poster: movie.poster,
            duration: movie.duration,
            ageRating: movie.ageRating,
          }
        : null,
      theater: theater
        ? {
            name: theater.name,
            shortName: theater.shortName,
            address: theater.address,
          }
        : null,
      seatTypes: [
        {
          type: 'standard',
          name: 'Ghế Thường',
          color: '#64748B',
          capacity: 1,
          price: standardBase,
          priceFormatted: formatPriceVND(standardBase),
          surcharge: 0,
          surchargeFormatted: '+0đ',
          availableSeats: availStd,
          totalSeats: roomSeats.filter((s) => s.type === 'standard').length,
          description: 'Ghế tiêu chuẩn với góc nhìn toàn cảnh phòng chiếu.',
        },
        {
          type: 'vip',
          name: 'Ghế VIP',
          color: '#F59E0B',
          capacity: 1,
          price: vipBase,
          priceFormatted: formatPriceVND(vipBase),
          surcharge: vipBase - standardBase,
          surchargeFormatted: `+${formatPriceVND(vipBase - standardBase)}`,
          availableSeats: availVip,
          totalSeats: roomSeats.filter((s) => s.type === 'vip').length,
          description: 'Vị trí trung tâm (Sweet spot), góc nhìn và âm thanh vòm Dolby tối ưu.',
        },
        {
          type: 'couple',
          name: 'Ghế Đôi Sweetbox',
          color: '#EC4899',
          capacity: 2,
          price: coupleBase,
          priceFormatted: formatPriceVND(coupleBase),
          surcharge: coupleBase - standardBase,
          surchargeFormatted: `+${formatPriceVND(coupleBase - standardBase)} (2 vé)`,
          availableSeats: availCpl,
          totalSeats: roomSeats.filter((s) => s.type === 'couple').length,
          description: 'Ghế sofa đôi rộng rãi cho 2 người ở hàng ghế cuối, riêng tư, lãng mạn.',
        },
      ],
      discounts: [
        { segment: 'student', label: 'Học sinh / Sinh viên (U22)', discount: '-20.000đ' },
        { segment: 'child', label: 'Trẻ em (dưới 1.3m)', discount: '-20.000đ' },
        { segment: 'member', label: 'Thành viên CineMax VIP', discount: '-10.000đ' },
      ],
    });
  } catch (err) {
    console.error('[GET /api/seats/showtime/:showtimeId/pricing]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy bảng giá vé: ' + err.message,
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
      foods = [],
      promotionCode = '',
      discountAmount = 0,
      totalAmount: customTotal,
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
    let subtotalTickets = 0;
    const baseShowtimePrice = showtime.price || 95000;
    let mainSeatType = 'Thường';

    seatsInfo.forEach((s) => {
      if (s.type === 'vip') {
        subtotalTickets += Math.round((baseShowtimePrice * 1.25) / 5000) * 5000;
        mainSeatType = 'VIP';
      } else if (s.type === 'couple') {
        subtotalTickets += Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000;
        mainSeatType = 'Sweetbox';
      } else {
        subtotalTickets += baseShowtimePrice;
      }
    });

    // Tính tiền đồ ăn
    const subtotalFoods = (foods || []).reduce(
      (sum, f) => sum + (Number(f.price) * Number(f.quantity) || 0),
      0
    );

    // Tính tổng tiền thanh toán cuối cùng
    const rawTotal = subtotalTickets + subtotalFoods;
    const numDiscount = Number(discountAmount) || 0;
    const finalTotal = customTotal !== undefined ? Number(customTotal) : Math.max(0, rawTotal - numDiscount);

    // Chuỗi mô tả combo đồ ăn
    let comboSummary = combos;
    if (!comboSummary && foods && foods.length > 0) {
      comboSummary = foods.map((f) => `${f.name} x${f.quantity}`).join(', ');
    }

    // Xử lý tăng lượt dùng khuyến mãi nếu có
    if (promotionCode && promotionCode.trim()) {
      try {
        await Promotion.findOneAndUpdate(
          { code: promotionCode.trim().toUpperCase(), isActive: true },
          { $inc: { usedCount: 1 } }
        );
      } catch (pErr) {
        console.log('[Seat Booking Promo Update Error]', pErr.message);
      }
    }

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

    // Tìm user để lấy thông tin chi tiết & cộng điểm thưởng
    let foundUser = null;
    if (userId && userId !== 'guest') {
      try {
        foundUser = await User.findById(userId);
      } catch (_) {}
    }

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
      combos: comboSummary || '',
      totalAmount: finalTotal,
      paymentMethod,
      paymentStatus: 'paid',
      status: 'upcoming',
      qrCodeData: `CINEMAX-TICKET-${bookingCode}-${seatCodes.join('')}`,
    });

    // Tạo bản ghi Order cho hệ thống quản lý F&B (UC44) và Báo cáo (UC45)
    try {
      const ticketsPayload = seatsInfo.map((s) => ({
        seatNumber: s.seatCode,
        seatType: s.type,
        price: s.type === 'vip' ? Math.round((baseShowtimePrice * 1.25) / 5000) * 5000
          : s.type === 'couple' ? Math.round((baseShowtimePrice * 2 * 0.95) / 5000) * 5000
          : baseShowtimePrice,
      }));

      await Order.create({
        orderCode: bookingCode,
        user: {
          id: userId || 'guest',
          fullName: foundUser?.fullName || 'Khách hàng CineMax',
          email: foundUser?.email || '',
          phone: foundUser?.phone || '',
        },
        movie: {
          id: movie?.code || showtime.movieId,
          title: movie?.title || 'Phim rạp CineMax',
          poster: movie?.poster || '',
          ageRating: movie?.ageRating || 'T13',
        },
        theater: {
          id: theater?.code || showtime.theaterId,
          name: theater?.name || 'CineMax Cinema',
          room: showtime.room || 'Rạp 01',
          showtimeDate: bookingDate.toLocaleDateString('vi-VN'),
          showtimeTime: showtime.startTime || '19:00',
          format: showtime.format || '2D Phụ đề',
        },
        tickets: ticketsPayload,
        foods: (foods || []).map((f) => ({
          foodId: f.foodId || f.id || '',
          name: f.name,
          category: f.category || 'food',
          price: Number(f.price),
          quantity: Number(f.quantity),
          image: f.image || '',
        })),
        subtotalTickets,
        subtotalFoods,
        promotionCode: promotionCode ? promotionCode.trim().toUpperCase() : '',
        discountAmount: numDiscount,
        totalPrice: finalTotal,
        paymentMethod: paymentMethod || 'Ví MoMo',
        paymentStatus: 'paid',
        orderStatus: foods && foods.length > 0 ? 'preparing' : 'completed',
        notes: '',
      });
    } catch (ordErr) {
      console.log('[Create Order from Seat Booking Note]', ordErr.message);
    }

    // Tích điểm hội viên
    if (foundUser) {
      try {
        const earnedPoints = Math.round((finalTotal * 0.08) / 1000);
        foundUser.loyaltyPoints = (foundUser.loyaltyPoints || 0) + earnedPoints;
        if (!foundUser.pointHistory) foundUser.pointHistory = [];
        foundUser.pointHistory.push({
          date: new Date(),
          description: `Tích điểm từ vé ${bookingCode} (${movie ? movie.title : 'Phim rạp'})`,
          pointsChange: earnedPoints,
          balanceAfter: foundUser.loyaltyPoints,
        });
        await foundUser.save();
      } catch (ptsErr) {
        console.log('[Update Loyalty Points Note]', ptsErr.message);
      }
    }

    // Tự động tạo thông báo gửi cho người dùng (UC43)
    try {
      const foodSummary = foods && foods.length > 0
        ? ` + ${foods.length} món bắp nước (${foods.map((f) => `${f.name} x${f.quantity}`).join(', ')})`
        : '';

      await Notification.create({
        title: `🎬 Đặt vé thành công: #${bookingCode}`,
        message: `Chúc mừng bạn đã đặt thành công ${seatCodes.length} vé xem phim "${movie ? movie.title : 'Phim'}" tại ${theater ? theater.name : 'CineMax'} (${seatCodes.join(', ')})${foodSummary}. Vui lòng xuất trình mã QR tại rạp khi vào xem.`,
        type: 'order',
        targetUser: userId || 'all',
      });
    } catch (notifErr) {
      console.log('[Create Seat Booking Notification Error]', notifErr.message);
    }

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

