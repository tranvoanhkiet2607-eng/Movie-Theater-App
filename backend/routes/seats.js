// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Theater = require('../models/Theater');

// Helper: Định dạng giá vé VND
function formatPriceVND(num) {
  const val = Number(num) || 0;
  return `${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
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

