// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();
const Theater = require('../models/Theater');
const Room = require('../models/Room');
const Showtime = require('../models/Showtime');
const { requireAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════════════════════
// GET /api/theaters
// Lấy danh sách toàn bộ cụm rạp (Công khai)
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {

    const { area = 'all', search = '' } = req.query;
    const conditions = [];

    if (area && area !== 'all') {
      const trimmedArea = String(area).trim();
      // Nếu lọc Hồ Chí Minh / HCM: bao quát cả địa chỉ TP. HCM, TP.HCM, Sài Gòn, các quận huyện
      if (/Hồ Chí Minh|HCM/i.test(trimmedArea)) {
        conditions.push({
          $or: [
            { area: /Hồ Chí Minh|HCM|Quận|Bình Thạnh|Tân Bình|Thủ Đức/i },
            { address: /Hồ Chí Minh|TP\.? ?HCM|Sài Gòn|Thủ Đức/i },
          ],
        });
      } else if (/Bình Dương/i.test(trimmedArea)) {
        conditions.push({
          $or: [
            { area: /Bình Dương|Dĩ An|Thuận An|Thủ Dầu Một|Bến Cát|Tân Uyên/i },
            { address: /Bình Dương|Dĩ An|Thuận An|Thủ Dầu Một|Bến Cát|Tân Uyên/i },
          ],
        });
      } else if (/Hà Nội/i.test(trimmedArea)) {
        conditions.push({
          $or: [
            { area: /Hà Nội|Ba Đình|Cầu Giấy|Hoàn Kiếm|Hai Bà Trưng|Đống Đa|Thanh Xuân|Long Biên/i },
            { address: /Hà Nội|Ba Đình|Cầu Giấy|Hoàn Kiếm|Hai Bà Trưng|Đống Đa|Thanh Xuân|Long Biên/i },
          ],
        });
      } else if (/Đà Nẵng/i.test(trimmedArea)) {
        conditions.push({
          $or: [
            { area: /Đà Nẵng|Hải Châu|Thanh Khê|Sơn Trà|Ngũ Hành Sơn/i },
            { address: /Đà Nẵng|Hải Châu|Thanh Khê|Sơn Trà|Ngũ Hành Sơn/i },
          ],
        });
      } else if (/Cần Thơ/i.test(trimmedArea)) {
        conditions.push({
          $or: [
            { area: /Cần Thơ|Ninh Kiều|Cái Răng|Bình Thủy/i },
            { address: /Cần Thơ|Ninh Kiều|Cái Răng|Bình Thủy/i },
          ],
        });
      } else if (/Hải Phòng/i.test(trimmedArea)) {
        conditions.push({
          $or: [
            { area: /Hải Phòng|Hồng Bàng|Ngô Quyền|Lê Chân/i },
            { address: /Hải Phòng|Hồng Bàng|Ngô Quyền|Lê Chân/i },
          ],
        });
      } else {
        const areaRegex = new RegExp(trimmedArea, 'i');
        conditions.push({
          $or: [{ area: areaRegex }, { address: areaRegex }],
        });
      }
    }

    if (search && String(search).trim()) {
      const q = new RegExp(String(search).trim(), 'i');
      conditions.push({
        $or: [{ name: q }, { shortName: q }, { address: q }, { area: q }],
      });
    }

    const mongoQuery = conditions.length > 0 ? { $and: conditions } : {};

    const theaterDocs = await Theater.find(mongoQuery).sort({ code: 1 });
    const theaters = theaterDocs.map((t) => t.toJSON());

    return res.json({
      success: true,
      total: theaters.length,
      theaters,
    });
  } catch (err) {
    console.error('[GET /api/theaters]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách cụm rạp.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/theaters/:id
// Xem chi tiết cụm rạp kèm danh sách phòng chiếu & tiện ích (Công khai)
// ════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let theaterDoc = await Theater.findOne({ code: id });
    if (!theaterDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      theaterDoc = await Theater.findById(id);
    }

    if (!theaterDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin cụm rạp này.',
      });
    }

    // Lấy danh sách phòng chiếu
    const roomDocs = await Room.find({ theaterId: theaterDoc.code }).sort({ name: 1 });

    const theater = theaterDoc.toJSON();
    theater.rooms = roomDocs.map((r) => r.toJSON());
    theater.totalRooms = roomDocs.length;

    return res.json({
      success: true,
      theater,
    });
  } catch (err) {
    console.error('[GET /api/theaters/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy chi tiết cụm rạp.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/theaters
// Thêm cụm rạp chiếu mới (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      shortName,
      area = 'Hồ Chí Minh',
      address,
      distance = '',
      hotline = '1900 6017',
      totalRooms = 6,
      supportedFormats = ['2D Phụ đề', '3D Phụ đề', 'IMAX 3D'],
      amenities = ['Bãi giữ xe ô tô & xe máy', 'Quầy bắp nước cao cấp', 'Wifi tốc độ cao miễn phí'],
    } = req.body;

    if (!name || !shortName || !address) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ: Tên rạp, Tên rút gọn và Địa chỉ rạp.',
      });
    }

    const uniqueCode = req.body.code ? String(req.body.code).trim() : `t-${Date.now()}`;

    const existingCode = await Theater.findOne({ code: uniqueCode });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: `Mã rạp '${uniqueCode}' đã tồn tại.`,
      });
    }

    const newTheater = await Theater.create({
      code: uniqueCode,
      name: String(name).trim(),
      shortName: String(shortName).trim(),
      area: String(area).trim(),
      address: String(address).trim(),
      distance: String(distance).trim(),
      hotline: String(hotline).trim(),
      totalRooms: Number(totalRooms) || 6,
      supportedFormats: Array.isArray(supportedFormats) ? supportedFormats : ['2D Phụ đề'],
      amenities: Array.isArray(amenities) ? amenities : ['Bãi giữ xe', 'Quầy bắp nước'],
    });

    return res.status(201).json({
      success: true,
      message: `Đã thêm rạp '${newTheater.name}' thành công!`,
      theater: newTheater.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/theaters]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi thêm rạp mới.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/theaters/:id
// Cập nhật thông tin rạp chiếu (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let theaterDoc = await Theater.findOne({ code: id });
    if (!theaterDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      theaterDoc = await Theater.findById(id);
    }

    if (!theaterDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy rạp chiếu cần cập nhật.',
      });
    }

    const { name, shortName, area, address, distance, hotline, supportedFormats, amenities } = req.body;

    if (name !== undefined) theaterDoc.name = String(name).trim();
    if (shortName !== undefined) theaterDoc.shortName = String(shortName).trim();
    if (area !== undefined) theaterDoc.area = String(area).trim();
    if (address !== undefined) theaterDoc.address = String(address).trim();
    if (distance !== undefined) theaterDoc.distance = String(distance).trim();
    if (hotline !== undefined) theaterDoc.hotline = String(hotline).trim();
    if (supportedFormats !== undefined && Array.isArray(supportedFormats)) {
      theaterDoc.supportedFormats = supportedFormats;
    }
    if (amenities !== undefined && Array.isArray(amenities)) {
      theaterDoc.amenities = amenities;
    }

    await theaterDoc.save();

    return res.json({
      success: true,
      message: `Đã cập nhật thông tin rạp '${theaterDoc.name}' thành công!`,
      theater: theaterDoc.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/theaters/:id]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi sửa rạp.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/theaters/:id
// Xóa rạp chiếu (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let theaterDoc = await Theater.findOne({ code: id });
    if (!theaterDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      theaterDoc = await Theater.findById(id);
    }

    if (!theaterDoc) {
      return res.status(404).json({
        success: false,
        message: 'Rạp chiếu không tồn tại hoặc đã bị xóa.',
      });
    }

    // Kiểm tra suất chiếu liên kết
    const hasSlots = await Showtime.countDocuments({ theaterId: theaterDoc.code });
    if (hasSlots > 0) {
      return res.status(409).json({
        success: false,
        message: `Không thể xóa rạp '${theaterDoc.name}' vì đang có ${hasSlots} suất chiếu liên kết trong hệ thống.`,
      });
    }

    // Xóa các phòng chiếu thuộc rạp
    await Room.deleteMany({ theaterId: theaterDoc.code });
    await Theater.deleteOne({ _id: theaterDoc._id });

    return res.json({
      success: true,
      message: `Đã xóa rạp '${theaterDoc.name}' thành công!`,
      deletedCode: theaterDoc.code,
    });
  } catch (err) {
    console.error('[DELETE /api/theaters/:id]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa rạp.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/theaters/:id/rooms
// Lấy danh sách các phòng chiếu của rạp (Công khai)
// ════════════════════════════════════════════════════════════════════════════
router.get('/:id/rooms', async (req, res) => {
  try {
    const { id } = req.params;

    const rooms = await Room.find({ theaterId: id }).sort({ name: 1 });
    return res.json({
      success: true,
      total: rooms.length,
      rooms: rooms.map((r) => r.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/theaters/:id/rooms]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách phòng chiếu.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/theaters/:id/rooms
// Thêm phòng chiếu mới cho rạp (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.post('/:id/rooms', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, format = '2D Phụ đề', totalSeats = 120, rows = 10, cols = 12, status = 'active' } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên phòng chiếu là bắt buộc (ví dụ: Rạp 07, Rạp VIP).',
      });
    }

    const theaterDoc = await Theater.findOne({ code: id });
    if (!theaterDoc) {
      return res.status(404).json({ success: false, message: 'Cụm rạp không tồn tại.' });
    }

    const uniqueCode = req.body.code ? String(req.body.code).trim() : `room-${id}-${Date.now()}`;

    const newRoom = await Room.create({
      code: uniqueCode,
      name: String(name).trim(),
      theaterId: id,
      format: String(format).trim(),
      totalSeats: Math.max(10, Number(totalSeats) || 120),
      rows: Number(rows) || 10,
      cols: Number(cols) || 12,
      status: status === 'maintenance' ? 'maintenance' : 'active',
    });

    // Cập nhật lại totalRooms trong Theater
    const roomCount = await Room.countDocuments({ theaterId: id });
    theaterDoc.totalRooms = roomCount;
    await theaterDoc.save();

    return res.status(201).json({
      success: true,
      message: `Đã thêm phòng chiếu '${newRoom.name}' cho rạp '${theaterDoc.shortName}' thành công!`,
      room: newRoom.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/theaters/:id/rooms]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi máy chủ khi thêm phòng chiếu.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/theaters/:id/rooms/:roomId
// Chỉnh sửa thông tin phòng chiếu (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id/rooms/:roomId', requireAdmin, async (req, res) => {
  try {
    const { id, roomId } = req.params;
    const { name, format, totalSeats, rows, cols, status } = req.body;

    let roomDoc = await Room.findOne({ code: roomId, theaterId: id });
    if (!roomDoc && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      roomDoc = await Room.findById(roomId);
    }

    if (!roomDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng chiếu cần cập nhật.',
      });
    }

    if (name !== undefined) roomDoc.name = String(name).trim();
    if (format !== undefined) roomDoc.format = String(format).trim();
    if (totalSeats !== undefined) roomDoc.totalSeats = Math.max(10, Number(totalSeats) || roomDoc.totalSeats);
    if (rows !== undefined) roomDoc.rows = Number(rows) || roomDoc.rows;
    if (cols !== undefined) roomDoc.cols = Number(cols) || roomDoc.cols;
    if (status !== undefined) roomDoc.status = status === 'maintenance' ? 'maintenance' : 'active';

    await roomDoc.save();

    return res.json({
      success: true,
      message: `Đã cập nhật phòng chiếu '${roomDoc.name}' thành công!`,
      room: roomDoc.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/theaters/:id/rooms/:roomId]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật phòng chiếu.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/theaters/:id/rooms/:roomId
// Xóa phòng chiếu (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.delete('/:id/rooms/:roomId', requireAdmin, async (req, res) => {
  try {
    const { id, roomId } = req.params;

    let roomDoc = await Room.findOne({ code: roomId, theaterId: id });
    if (!roomDoc && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      roomDoc = await Room.findById(roomId);
    }

    if (!roomDoc) {
      return res.status(404).json({
        success: false,
        message: 'Phòng chiếu không tồn tại hoặc đã bị xóa.',
      });
    }

    await Room.deleteOne({ _id: roomDoc._id });

    // Cập nhật lại totalRooms của rạp
    const remainingRooms = await Room.countDocuments({ theaterId: id });
    await Theater.updateOne({ code: id }, { totalRooms: remainingRooms });

    return res.json({
      success: true,
      message: `Đã xóa phòng chiếu '${roomDoc.name}' thành công!`,
      deletedCode: roomDoc.code,
    });
  } catch (err) {
    console.error('[DELETE /api/theaters/:id/rooms/:roomId]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa phòng chiếu.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/theaters/:id/facilities
// Cập nhật tiện ích và thông tin hoạt động rạp (Yêu cầu quyền Quản trị viên)
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id/facilities', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amenities, hotline, distance } = req.body;

    let theaterDoc = await Theater.findOne({ code: id });
    if (!theaterDoc && id.match(/^[0-9a-fA-F]{24}$/)) {
      theaterDoc = await Theater.findById(id);
    }

    if (!theaterDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy rạp chiếu để cập nhật tiện ích.',
      });
    }

    if (amenities !== undefined && Array.isArray(amenities)) {
      theaterDoc.amenities = amenities;
    }
    if (hotline !== undefined) theaterDoc.hotline = String(hotline).trim();
    if (distance !== undefined) theaterDoc.distance = String(distance).trim();

    await theaterDoc.save();

    return res.json({
      success: true,
      message: `Đã cập nhật tiện ích hoạt động cho rạp '${theaterDoc.name}' thành công!`,
      theater: theaterDoc.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/theaters/:id/facilities]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật tiện ích rạp.',
    });
  }
});

module.exports = router;
