// Nguyễn Minh Quân - CE180048
const Seat = require('../models/Seat');
const SeatType = require('../models/SeatType');

const DEFAULT_SEAT_TYPES = [
  {
    code: 'standard',
    name: 'Ghế Thường',
    nameEn: 'Standard Seat',
    description: 'Ghế đơn tiêu chuẩn với góc nhìn toàn cảnh, đệm ngồi êm ái, phù hợp cho mọi khán giả.',
    color: '#64748B',
    accentColor: '#475569',
    basePrice: 90000,
    surcharge: 0,
    capacity: 1,
    features: [
      'Tầm nhìn toàn cảnh phòng chiếu',
      'Đệm ngồi êm ái đàn hồi cao',
      'Khay đựng bắp & nước tiện dụng',
      'Kê tay gập mở linh hoạt',
    ],
    defaultRows: ['A', 'B'],
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'vip',
    name: 'Ghế VIP',
    nameEn: 'VIP Prime Seat',
    description: 'Nằm ở khu vực trung tâm (Sweet Spot), mang lại trải nghiệm hình ảnh sắc nét và âm thanh vòm sống động nhất.',
    color: '#F59E0B',
    accentColor: '#D97706',
    basePrice: 110000,
    surcharge: 20000,
    capacity: 1,
    features: [
      'Vị trí trung tâm phòng chiếu (Sweet Spot)',
      'Khoảng cách giữa các hàng ghế siêu rộng',
      'Chất liệu da công nghiệp cao cấp',
      'Trải nghiệm âm thanh vòm tối ưu',
    ],
    defaultRows: ['C', 'D', 'E'],
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'couple',
    name: 'Ghế Đôi Sweetbox',
    nameEn: 'Sweetbox Couple Seat',
    description: 'Ghế sofa đôi rộng rãi dành riêng cho 2 người ở hàng ghế cuối, vách ngăn cao tạo không gian riêng tư, ấm cúng.',
    color: '#EC4899',
    accentColor: '#DB2777',
    basePrice: 180000,
    surcharge: 90000,
    capacity: 2,
    features: [
      'Dành riêng cho 2 người (1 vé trọn gói)',
      'Vách ngăn riêng tư cao và kín đáo',
      'Không gác tay ngăn giữa, thoải mái tựa đầu',
      'Bố trí tại hàng ghế cuối cùng ấm cúng',
    ],
    defaultRows: ['F', 'G'],
    isActive: true,
    sortOrder: 3,
  },
];

function formatPriceVND(price) {
  return `${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

function generateRoomLayout(theaterId, room, config) {
  const {
    rows,
    colsPerRow,
    vipRows = [],
    coupleRows = [],
    standardPrice = 90000,
    vipPrice = 110000,
    couplePrice = 180000,
    maintenanceSeats = [],
    reservedSeats = [],
  } = config;

  const seats = [];
  const vipSet = new Set(vipRows.map((r) => r.toUpperCase()));
  const coupleSet = new Set(coupleRows.map((r) => r.toUpperCase()));
  const maintSet = new Set(maintenanceSeats.map((s) => s.toUpperCase()));
  const resSet = new Set(reservedSeats.map((s) => s.toUpperCase()));

  for (const r of rows) {
    const rowChar = r.toUpperCase();
    const isCouple = coupleSet.has(rowChar);
    const isVip = vipSet.has(rowChar);

    const cols = isCouple ? Math.floor(colsPerRow / 2) : colsPerRow;

    for (let c = 1; c <= cols; c++) {
      let type = 'standard';
      let price = standardPrice;

      if (isCouple) {
        type = 'couple';
        price = couplePrice;
      } else if (isVip) {
        type = 'vip';
        price = vipPrice;
      }

      const colPad = c < 10 ? `0${c}` : `${c}`;
      const seatCode = isCouple ? `SW-${rowChar}${c}` : `${rowChar}${colPad}`;
      const code = `seat-${theaterId}-${room.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${seatCode.toLowerCase()}`;

      let status = 'available';
      if (maintSet.has(seatCode)) status = 'maintenance';
      else if (resSet.has(seatCode)) status = 'reserved';

      let notes = '';
      if (status === 'maintenance') notes = 'Đang bảo trì khung đệm và tay vịn';
      else if (isCouple) notes = 'Ghế đôi Sweetbox rộng rãi, vách ngăn riêng tư';
      else if (isVip) notes = 'Ghế VIP trung tâm, góc nhìn tối ưu';

      seats.push({
        code,
        seatCode,
        row: rowChar,
        colNumber: c,
        theaterId,
        room,
        type,
        price,
        priceFormatted: formatPriceVND(price),
        status,
        notes,
      });
    }
  }

  return seats;
}

function buildAllInitialSeats() {
  const allSeats = [];

  // Rạp t1 - CineMax Vincom Center Đồng Khởi
  allSeats.push(
    ...generateRoomLayout('t1', 'Rạp 01', {
      rows: ['A', 'B', 'C', 'D', 'E', 'F'],
      colsPerRow: 12,
      vipRows: ['C', 'D', 'E'],
      coupleRows: ['F'],
      standardPrice: 95000,
      vipPrice: 120000,
      couplePrice: 200000,
      maintenanceSeats: ['B04', 'D08'],
      reservedSeats: ['C06', 'C07'],
    })
  );

  allSeats.push(
    ...generateRoomLayout('t1', 'Rạp 02', {
      rows: ['A', 'B', 'C', 'D', 'E'],
      colsPerRow: 10,
      vipRows: ['C', 'D'],
      coupleRows: ['E'],
      standardPrice: 95000,
      vipPrice: 115000,
      couplePrice: 190000,
      maintenanceSeats: ['C02'],
    })
  );

  allSeats.push(
    ...generateRoomLayout('t1', 'Rạp 03 (IMAX)', {
      rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      colsPerRow: 14,
      vipRows: ['C', 'D', 'E', 'F'],
      coupleRows: ['G'],
      standardPrice: 140000,
      vipPrice: 185000,
      couplePrice: 280000,
      maintenanceSeats: ['D01', 'F14'],
      reservedSeats: ['E07', 'E08'],
    })
  );

  allSeats.push(
    ...generateRoomLayout('t1', 'Rạp Gold Class', {
      rows: ['A', 'B', 'C', 'D'],
      colsPerRow: 8,
      vipRows: ['A', 'B', 'C'],
      coupleRows: ['D'],
      standardPrice: 220000,
      vipPrice: 260000,
      couplePrice: 350000,
      maintenanceSeats: [],
    })
  );

  // Rạp t2 - CineMax Landmark 81 SkyView
  allSeats.push(
    ...generateRoomLayout('t2', 'Rạp 01 (IMAX)', {
      rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      colsPerRow: 14,
      vipRows: ['D', 'E', 'F', 'G'],
      coupleRows: ['H'],
      standardPrice: 150000,
      vipPrice: 195000,
      couplePrice: 300000,
      maintenanceSeats: ['C12'],
    })
  );

  allSeats.push(
    ...generateRoomLayout('t2', 'Rạp 02', {
      rows: ['A', 'B', 'C', 'D', 'E', 'F'],
      colsPerRow: 12,
      vipRows: ['C', 'D', 'E'],
      coupleRows: ['F'],
      standardPrice: 95000,
      vipPrice: 120000,
      couplePrice: 200000,
      maintenanceSeats: ['A03'],
    })
  );

  allSeats.push(
    ...generateRoomLayout('t2', 'Rạp 4DX', {
      rows: ['A', 'B', 'C', 'D', 'E'],
      colsPerRow: 8,
      vipRows: ['B', 'C', 'D'],
      coupleRows: ['E'],
      standardPrice: 160000,
      vipPrice: 185000,
      couplePrice: 260000,
      maintenanceSeats: ['C04'],
    })
  );

  // Rạp t3 - CineMax Crescent Mall Quận 7
  allSeats.push(
    ...generateRoomLayout('t3', 'Rạp 01', {
      rows: ['A', 'B', 'C', 'D', 'E', 'F'],
      colsPerRow: 12,
      vipRows: ['C', 'D', 'E'],
      coupleRows: ['F'],
      standardPrice: 90000,
      vipPrice: 110000,
      couplePrice: 190000,
      maintenanceSeats: ['D05'],
    })
  );

  allSeats.push(
    ...generateRoomLayout('t3', 'Rạp 02', {
      rows: ['A', 'B', 'C', 'D', 'E'],
      colsPerRow: 10,
      vipRows: ['C', 'D'],
      coupleRows: ['E'],
      standardPrice: 90000,
      vipPrice: 110000,
      couplePrice: 180000,
      maintenanceSeats: [],
    })
  );

  // Rạp t4 - CineMax GigaMall Thủ Đức
  allSeats.push(
    ...generateRoomLayout('t4', 'Rạp 01', {
      rows: ['A', 'B', 'C', 'D', 'E', 'F'],
      colsPerRow: 12,
      vipRows: ['C', 'D', 'E'],
      coupleRows: ['F'],
      standardPrice: 85000,
      vipPrice: 105000,
      couplePrice: 175000,
      maintenanceSeats: ['B02'],
    })
  );

  // Rạp t5 - CineMax Cộng Hòa Tân Bình
  allSeats.push(
    ...generateRoomLayout('t5', 'Rạp 01', {
      rows: ['A', 'B', 'C', 'D', 'E'],
      colsPerRow: 10,
      vipRows: ['C', 'D'],
      coupleRows: ['E'],
      standardPrice: 80000,
      vipPrice: 100000,
      couplePrice: 170000,
      maintenanceSeats: [],
    })
  );

  return allSeats;
}

async function seedSeatTypesData() {
  const count = await SeatType.countDocuments();
  if (count === 0) {
    await SeatType.insertMany(DEFAULT_SEAT_TYPES);
  }
}

async function seedSeatsData() {
  await seedSeatTypesData();
  const seatCount = await Seat.countDocuments();
  if (seatCount === 0) {
    const initialSeats = buildAllInitialSeats();
    await Seat.insertMany(initialSeats);
  }
}

module.exports = {
  seedSeatsData,
  seedSeatTypesData,
  buildAllInitialSeats,
  DEFAULT_SEAT_TYPES,
};


