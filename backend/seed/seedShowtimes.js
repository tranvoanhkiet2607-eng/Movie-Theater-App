// Nguyễn Minh Quân - CE180048
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Showtime = require('../models/Showtime');

const SHOWTIME_DATES = [
  {
    dateKey: 'd0',
    dayLabel: 'Hôm nay',
    dateDisplay: '15/10',
    fullDateLabel: 'Thứ Năm, 15/10/2026',
    isWeekend: false,
  },
  {
    dateKey: 'd1',
    dayLabel: 'Ngày mai',
    dateDisplay: '16/10',
    fullDateLabel: 'Thứ Sáu, 16/10/2026',
    isWeekend: false,
  },
  {
    dateKey: 'd2',
    dayLabel: 'Thứ 7',
    dateDisplay: '17/10',
    fullDateLabel: 'Thứ Bảy, 17/10/2026',
    isWeekend: true,
  },
  {
    dateKey: 'd3',
    dayLabel: 'Chủ nhật',
    dateDisplay: '18/10',
    fullDateLabel: 'Chủ Nhật, 18/10/2026',
    isWeekend: true,
  },
  {
    dateKey: 'd4',
    dayLabel: 'Thứ 2',
    dateDisplay: '19/10',
    fullDateLabel: 'Thứ Hai, 19/10/2026',
    isWeekend: false,
  },
  {
    dateKey: 'd5',
    dayLabel: 'Thứ 3',
    dateDisplay: '20/10',
    fullDateLabel: 'Thứ Ba, 20/10/2026',
    isWeekend: false,
  },
  {
    dateKey: 'd6',
    dayLabel: 'Thứ 4',
    dateDisplay: '21/10',
    fullDateLabel: 'Thứ Tư, 21/10/2026',
    isWeekend: false,
  },
];

const SHOWTIME_FORMATS = [
  '2D Phụ đề',
  '2D Lồng tiếng',
  '3D Phụ đề',
  'IMAX 3D',
  '4DX',
  'Gold Class VIP',
];

const INITIAL_MOVIES = [
  {
    code: 'm1',
    title: 'Dune: Hành Tinh Cát - Phần 2',
    originalTitle: 'Dune: Part Two',
    genre: 'Khoa học viễn tưởng, Hành động, Phiêu lưu',
    durationMinutes: 166,
    durationLabel: '166 phút',
    rating: '8.9 ★',
    ageRating: 'T13',
    ageDescription: 'Phim được phổ biến đến người xem từ đủ 13 tuổi trở lên (13+)',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
    badge: 'HOT',
    releaseDate: '01/10/2026',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem'],
    synopsis:
      'Paul Atreides hợp nhất với Chani và người Fremen trong hành trình báo thù những kẻ đã hủy hoại gia tộc mình, đồng thời ngăn chặn một tương lai đen tối mà chỉ anh mới nhìn thấy.',
    formats: ['2D Phụ đề', 'IMAX 3D', '4DX', 'Gold Class VIP'],
    isNowShowing: true,
  },
  {
    code: 'm2',
    title: 'Godzilla x Kong: Đế Chế Mới',
    originalTitle: 'Godzilla x Kong: The New Empire',
    genre: 'Hành động, Quái vật, Viễn tưởng',
    durationMinutes: 115,
    durationLabel: '115 phút',
    rating: '8.3 ★',
    ageRating: 'K',
    ageDescription: 'Phim phổ biến cho khán giả dưới 13 tuổi với điều kiện xem cùng cha, mẹ hoặc người giám hộ',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
    badge: 'IMAX 3D',
    releaseDate: '05/10/2026',
    director: 'Adam Wingard',
    cast: ['Rebecca Hall', 'Brian Tyree Henry', 'Dan Stevens'],
    synopsis:
      'Hai siêu quái vật cổ đại Godzilla và Kong buộc phải sát cánh chiến đấu chống lại một mối đe dọa khổng lồ ẩn sâu trong Trái Đất Rỗng, thách thức sự tồn vong của cả nhân loại.',
    formats: ['2D Phụ đề', '2D Lồng tiếng', '3D Phụ đề', 'IMAX 3D', '4DX'],
    isNowShowing: true,
  },
  {
    code: 'm3',
    title: 'Kung Fu Panda 4',
    originalTitle: 'Kung Fu Panda 4',
    genre: 'Hoạt hình, Hài hước, Gia đình',
    durationMinutes: 94,
    durationLabel: '94 phút',
    rating: '8.1 ★',
    ageRating: 'P',
    ageDescription: 'Phim được phép phổ biến đến người xem ở mọi độ tuổi',
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500',
    badge: 'MỌI LỨA TUỔI',
    releaseDate: '08/10/2026',
    director: 'Mike Mitchell',
    cast: ['Jack Black', 'Awkwafina', 'Viola Davis', 'Dustin Hoffman'],
    synopsis:
      'Thần Long Đại Hiệp Po chuẩn bị trở thành Thủ lĩnh Tinh thần của Thung lũng Bình Yên nhưng phải tìm người kế vị trước khi đối đầu với Tắc Kè Hoa đầy ma thuật.',
    formats: ['2D Phụ đề', '2D Lồng tiếng', '3D Phụ đề'],
    isNowShowing: true,
  },
  {
    code: 'm4',
    title: 'Deadpool & Wolverine',
    originalTitle: 'Deadpool & Wolverine',
    genre: 'Hành động, Siêu anh hùng, Hài hước',
    durationMinutes: 128,
    durationLabel: '128 phút',
    rating: '9.0 ★',
    ageRating: 'T18',
    ageDescription: 'Phim được phổ biến đến người xem từ đủ 18 tuổi trở lên (18+)',
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
    badge: '18+ BOM TẤN',
    releaseDate: '12/10/2026',
    director: 'Shawn Levy',
    cast: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin'],
    synopsis:
      'Wade Wilson buộc phải tái xuất trong bộ giáp Deadpool và hợp tác cùng một Wolverine bất đắc dĩ từ vũ trụ khác để giải cứu đa vũ trụ khỏi nguy cơ sụp đổ.',
    formats: ['2D Phụ đề', 'IMAX 3D', '4DX', 'Gold Class VIP'],
    isNowShowing: true,
  },
  {
    code: 'm5',
    title: 'Joker: Điên Có Đôi',
    originalTitle: 'Joker: Folie à Deux',
    genre: 'Tâm lý, Tội phạm, Nhạc kịch',
    durationMinutes: 138,
    durationLabel: '138 phút',
    rating: '8.5 ★',
    ageRating: 'T18',
    ageDescription: 'Phim được phổ biến đến người xem từ đủ 18 tuổi trở lên (18+)',
    poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500',
    badge: 'SUẤT ĐẶC BIỆT',
    releaseDate: '14/10/2026',
    director: 'Todd Phillips',
    cast: ['Joaquin Phoenix', 'Lady Gaga', 'Brendan Gleeson'],
    synopsis:
      'Arthur Fleck bị giam giữ tại bệnh viện tâm thần Arkham chờ ngày xét xử cho tội ác dưới danh nghĩa Joker, nơi anh gặp gỡ định mệnh đời mình — Harley Quinn.',
    formats: ['2D Phụ đề', 'IMAX 3D', 'Gold Class VIP'],
    isNowShowing: false,
  },
  {
    code: 'm6',
    title: 'Mai',
    originalTitle: 'Mai (Phim Việt Nam)',
    genre: 'Tâm lý, Tình cảm, Gia đình',
    durationMinutes: 131,
    durationLabel: '131 phút',
    rating: '8.7 ★',
    ageRating: 'T18',
    ageDescription: 'Phim được phổ biến đến người xem từ đủ 18 tuổi trở lên (18+)',
    poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500',
    badge: 'PHIM VIỆT HOT',
    releaseDate: '10/10/2026',
    director: 'Trấn Thành',
    cast: ['Phương Anh Đào', 'Tuấn Trần', 'Hồng Đào'],
    synopsis:
      'Câu chuyện về Mai — một người phụ nữ mang nhiều vết thương lòng quá khứ khi bước vào mối tình đầy sóng gió với Dương, chàng trai trẻ vô tư đam mê âm nhạc.',
    formats: ['2D Phụ đề', 'Gold Class VIP'],
    isNowShowing: false,
  },
];

const INITIAL_THEATERS = [
  {
    code: 't1',
    name: 'CineMax Vincom Center Đồng Khởi',
    shortName: 'Vincom Đồng Khởi',
    area: 'Quận 1',
    address: 'Tầng 3, 72 Lê Thánh Tôn, P. Bến Nghé, Quận 1, TP. HCM',
    distance: '1.2 km',
    hotline: '1900 6017 (Nhánh 1)',
    totalRooms: 8,
    supportedFormats: ['2D Phụ đề', '2D Lồng tiếng', '3D Phụ đề', 'IMAX 3D', 'Gold Class VIP'],
    amenities: ['IMAX Laser 4K', 'Dolby Atmos', 'Phòng chờ VIP', 'Bãi đỗ xe hầm B3'],
  },
  {
    code: 't2',
    name: 'CineMax Landmark 81 SkyView',
    shortName: 'Landmark 81',
    area: 'Bình Thạnh',
    address: 'Tầng B1, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. HCM',
    distance: '3.8 km',
    hotline: '1900 6017 (Nhánh 2)',
    totalRooms: 9,
    supportedFormats: ['2D Phụ đề', '2D Lồng tiếng', 'IMAX 3D', '4DX', 'Gold Class VIP'],
    amenities: ['IMAX Màn hình cong', 'Ghế chuyển động 4DX', 'Sweetbox Couple'],
  },
  {
    code: 't3',
    name: 'CineMax Crescent Mall Quận 7',
    shortName: 'Crescent Mall Q7',
    area: 'Quận 7',
    address: 'Tầng 5, 101 Tôn Dật Tiên, P. Tân Phú, Quận 7, TP. HCM',
    distance: '6.5 km',
    hotline: '1900 6017 (Nhánh 3)',
    totalRooms: 7,
    supportedFormats: ['2D Phụ đề', '2D Lồng tiếng', '3D Phụ đề', 'Gold Class VIP'],
    amenities: ['Dolby Atmos', 'Ghế da ngả lưng', 'Khu Kidzone'],
  },
  {
    code: 't4',
    name: 'CineMax GigaMall Thủ Đức',
    shortName: 'GigaMall Thủ Đức',
    area: 'Thủ Đức',
    address: 'Tầng 6, 240-242 Phạm Văn Đồng, P. Hiệp Bình Chánh, TP. Thủ Đức',
    distance: '8.1 km',
    hotline: '1900 6017 (Nhánh 4)',
    totalRooms: 6,
    supportedFormats: ['2D Phụ đề', '2D Lồng tiếng', '3D Phụ đề', '4DX'],
    amenities: ['Phòng chiếu 4DX', 'Bắp nước tự phục vụ', 'Giữ xe miễn phí'],
  },
  {
    code: 't5',
    name: 'CineMax Cộng Hòa Tân Bình',
    shortName: 'Cộng Hòa Tân Bình',
    area: 'Tân Bình',
    address: 'Tầng 4, Pico Plaza, 20 Cộng Hòa, Phường 12, Quận Tân Bình, TP. HCM',
    distance: '5.4 km',
    hotline: '1900 6017 (Nhánh 5)',
    totalRooms: 6,
    supportedFormats: ['2D Phụ đề', '2D Lồng tiếng', '3D Phụ đề'],
    amenities: ['Giá vé sinh viên', 'Ghế đôi Sweetbox'],
  },
];

function computeEndTime(startTime, durationMinutes) {
  const [hh, mm] = startTime.split(':').map(Number);
  const totalMinutes = hh * 60 + mm + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function formatPriceVND(price) {
  return `${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

function buildInitialShowtimes() {
  const results = [];
  let counter = 1;

  const scheduleTemplates = [
    // m1: Dune 2
    { movieId: 'm1', theaterId: 't1', startTime: '09:30', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 95000, totalSeats: 140, availSeed: 98 },
    { movieId: 'm1', theaterId: 't1', startTime: '13:15', room: 'Rạp 03 (IMAX)', format: 'IMAX 3D', basePrice: 175000, totalSeats: 220, availSeed: 64 },
    { movieId: 'm1', theaterId: 't1', startTime: '16:45', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 105000, totalSeats: 140, availSeed: 45 },
    { movieId: 'm1', theaterId: 't1', startTime: '19:30', room: 'Rạp 03 (IMAX)', format: 'IMAX 3D', basePrice: 190000, totalSeats: 220, availSeed: 14 },
    { movieId: 'm1', theaterId: 't1', startTime: '22:15', room: 'Rạp Gold Class', format: 'Gold Class VIP', basePrice: 260000, totalSeats: 48, availSeed: 18 },

    { movieId: 'm1', theaterId: 't2', startTime: '10:00', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 95000, totalSeats: 150, availSeed: 112 },
    { movieId: 'm1', theaterId: 't2', startTime: '14:20', room: 'Rạp 4DX', format: '4DX', basePrice: 185000, totalSeats: 96, availSeed: 32 },
    { movieId: 'm1', theaterId: 't2', startTime: '18:30', room: 'Rạp 01 (IMAX)', format: 'IMAX 3D', basePrice: 195000, totalSeats: 240, availSeed: 9 },
    { movieId: 'm1', theaterId: 't2', startTime: '21:45', room: 'Rạp 04', format: '2D Phụ đề', basePrice: 110000, totalSeats: 150, availSeed: 68 },

    { movieId: 'm1', theaterId: 't3', startTime: '11:15', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 90000, totalSeats: 130, availSeed: 88 },
    { movieId: 'm1', theaterId: 't3', startTime: '17:30', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 105000, totalSeats: 130, availSeed: 39 },
    { movieId: 'm1', theaterId: 't3', startTime: '20:45', room: 'Rạp Gold Class', format: 'Gold Class VIP', basePrice: 250000, totalSeats: 40, availSeed: 6 },

    { movieId: 'm1', theaterId: 't4', startTime: '12:30', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 85000, totalSeats: 120, availSeed: 75 },
    { movieId: 'm1', theaterId: 't4', startTime: '19:00', room: 'Rạp 4DX', format: '4DX', basePrice: 170000, totalSeats: 88, availSeed: 22 },

    // m2: Godzilla x Kong
    { movieId: 'm2', theaterId: 't1', startTime: '10:15', room: 'Rạp 04', format: '2D Lồng tiếng', basePrice: 90000, totalSeats: 120, availSeed: 84 },
    { movieId: 'm2', theaterId: 't1', startTime: '14:45', room: 'Rạp 05', format: '3D Phụ đề', basePrice: 135000, totalSeats: 130, availSeed: 52 },
    { movieId: 'm2', theaterId: 't1', startTime: '18:00', room: 'Rạp 03 (IMAX)', format: 'IMAX 3D', basePrice: 185000, totalSeats: 220, availSeed: 0 },
    { movieId: 'm2', theaterId: 't1', startTime: '21:15', room: 'Rạp 04', format: '2D Phụ đề', basePrice: 105000, totalSeats: 120, availSeed: 47 },

    { movieId: 'm2', theaterId: 't2', startTime: '09:15', room: 'Rạp 03', format: '2D Phụ đề', basePrice: 90000, totalSeats: 140, availSeed: 105 },
    { movieId: 'm2', theaterId: 't2', startTime: '16:10', room: 'Rạp 4DX', format: '4DX', basePrice: 180000, totalSeats: 96, availSeed: 19 },
    { movieId: 'm2', theaterId: 't2', startTime: '20:15', room: 'Rạp 01 (IMAX)', format: 'IMAX 3D', basePrice: 195000, totalSeats: 240, availSeed: 28 },

    { movieId: 'm2', theaterId: 't3', startTime: '13:30', room: 'Rạp 03', format: '2D Lồng tiếng', basePrice: 90000, totalSeats: 120, availSeed: 73 },
    { movieId: 'm2', theaterId: 't3', startTime: '19:15', room: 'Rạp 04', format: '3D Phụ đề', basePrice: 130000, totalSeats: 120, availSeed: 15 },

    { movieId: 'm2', theaterId: 't4', startTime: '15:00', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 85000, totalSeats: 120, availSeed: 66 },
    { movieId: 'm2', theaterId: 't4', startTime: '21:00', room: 'Rạp 4DX', format: '4DX', basePrice: 170000, totalSeats: 88, availSeed: 34 },

    { movieId: 'm2', theaterId: 't5', startTime: '11:00', room: 'Rạp 01', format: '2D Lồng tiếng', basePrice: 80000, totalSeats: 110, availSeed: 90 },
    { movieId: 'm2', theaterId: 't5', startTime: '18:20', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 90000, totalSeats: 110, availSeed: 29 },

    // m3: Kung Fu Panda 4
    { movieId: 'm3', theaterId: 't1', startTime: '08:45', room: 'Rạp 06', format: '2D Lồng tiếng', basePrice: 85000, totalSeats: 110, availSeed: 72 },
    { movieId: 'm3', theaterId: 't1', startTime: '11:30', room: 'Rạp 06', format: '2D Lồng tiếng', basePrice: 90000, totalSeats: 110, availSeed: 38 },
    { movieId: 'm3', theaterId: 't1', startTime: '15:30', room: 'Rạp 02', format: '3D Phụ đề', basePrice: 125000, totalSeats: 140, availSeed: 61 },
    { movieId: 'm3', theaterId: 't1', startTime: '17:50', room: 'Rạp 06', format: '2D Phụ đề', basePrice: 95000, totalSeats: 110, availSeed: 12 },

    { movieId: 'm3', theaterId: 't2', startTime: '10:30', room: 'Rạp 05', format: '2D Lồng tiếng', basePrice: 90000, totalSeats: 130, availSeed: 54 },
    { movieId: 'm3', theaterId: 't2', startTime: '15:00', room: 'Rạp 05', format: '2D Lồng tiếng', basePrice: 95000, totalSeats: 130, availSeed: 25 },
    { movieId: 'm3', theaterId: 't2', startTime: '19:00', room: 'Rạp 06', format: '2D Phụ đề', basePrice: 105000, totalSeats: 130, availSeed: 42 },

    { movieId: 'm3', theaterId: 't3', startTime: '09:45', room: 'Rạp 02', format: '2D Lồng tiếng', basePrice: 85000, totalSeats: 130, availSeed: 95 },
    { movieId: 'm3', theaterId: 't3', startTime: '14:15', room: 'Rạp 02', format: '2D Lồng tiếng', basePrice: 90000, totalSeats: 130, availSeed: 48 },
    { movieId: 'm3', theaterId: 't3', startTime: '18:15', room: 'Rạp 05', format: '3D Phụ đề', basePrice: 125000, totalSeats: 110, availSeed: 17 },

    { movieId: 'm3', theaterId: 't4', startTime: '10:00', room: 'Rạp 03', format: '2D Lồng tiếng', basePrice: 80000, totalSeats: 110, availSeed: 82 },
    { movieId: 'm3', theaterId: 't4', startTime: '16:30', room: 'Rạp 03', format: '2D Lồng tiếng', basePrice: 85000, totalSeats: 110, availSeed: 33 },

    { movieId: 'm3', theaterId: 't5', startTime: '09:30', room: 'Rạp 03', format: '2D Lồng tiếng', basePrice: 75000, totalSeats: 100, availSeed: 69 },
    { movieId: 'm3', theaterId: 't5', startTime: '14:00', room: 'Rạp 03', format: '2D Lồng tiếng', basePrice: 80000, totalSeats: 100, availSeed: 44 },
    { movieId: 'm3', theaterId: 't5', startTime: '19:45', room: 'Rạp 03', format: '2D Phụ đề', basePrice: 85000, totalSeats: 100, availSeed: 21 },

    // m4: Deadpool & Wolverine
    { movieId: 'm4', theaterId: 't1', startTime: '12:00', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 100000, totalSeats: 140, availSeed: 56 },
    { movieId: 'm4', theaterId: 't1', startTime: '16:00', room: 'Rạp 03 (IMAX)', format: 'IMAX 3D', basePrice: 185000, totalSeats: 220, availSeed: 24 },
    { movieId: 'm4', theaterId: 't1', startTime: '20:15', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 115000, totalSeats: 140, availSeed: 8 },
    { movieId: 'm4', theaterId: 't1', startTime: '22:45', room: 'Rạp 03 (IMAX)', format: 'IMAX 3D', basePrice: 175000, totalSeats: 220, availSeed: 63 },

    { movieId: 'm4', theaterId: 't2', startTime: '11:45', room: 'Rạp 4DX', format: '4DX', basePrice: 185000, totalSeats: 96, availSeed: 41 },
    { movieId: 'm4', theaterId: 't2', startTime: '17:30', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 110000, totalSeats: 150, availSeed: 19 },
    { movieId: 'm4', theaterId: 't2', startTime: '21:00', room: 'Rạp Gold Class', format: 'Gold Class VIP', basePrice: 270000, totalSeats: 48, availSeed: 5 },
    { movieId: 'm4', theaterId: 't2', startTime: '23:00', room: 'Rạp 4DX', format: '4DX', basePrice: 175000, totalSeats: 96, availSeed: 51 },

    { movieId: 'm4', theaterId: 't3', startTime: '15:45', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 100000, totalSeats: 130, availSeed: 62 },
    { movieId: 'm4', theaterId: 't3', startTime: '20:00', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 110000, totalSeats: 130, availSeed: 11 },
    { movieId: 'm4', theaterId: 't3', startTime: '22:30', room: 'Rạp 03', format: '2D Phụ đề', basePrice: 95000, totalSeats: 120, availSeed: 74 },

    { movieId: 'm4', theaterId: 't4', startTime: '17:45', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 95000, totalSeats: 120, availSeed: 37 },
    { movieId: 'm4', theaterId: 't4', startTime: '20:30', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 100000, totalSeats: 120, availSeed: 14 },

    { movieId: 'm4', theaterId: 't5', startTime: '16:15', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 90000, totalSeats: 110, availSeed: 58 },
    { movieId: 'm4', theaterId: 't5', startTime: '21:15', room: 'Rạp 01', format: '2D Phụ đề', basePrice: 95000, totalSeats: 110, availSeed: 23 },

    // m5: Joker: Điên Có Đôi
    { movieId: 'm5', theaterId: 't1', startTime: '13:45', room: 'Rạp Gold Class', format: 'Gold Class VIP', basePrice: 250000, totalSeats: 48, availSeed: 22 },
    { movieId: 'm5', theaterId: 't1', startTime: '19:00', room: 'Rạp 05', format: '2D Phụ đề', basePrice: 110000, totalSeats: 130, availSeed: 31 },
    { movieId: 'm5', theaterId: 't1', startTime: '22:00', room: 'Rạp 05', format: '2D Phụ đề', basePrice: 105000, totalSeats: 130, availSeed: 64 },

    { movieId: 'm5', theaterId: 't2', startTime: '15:30', room: 'Rạp 01 (IMAX)', format: 'IMAX 3D', basePrice: 190000, totalSeats: 240, availSeed: 78 },
    { movieId: 'm5', theaterId: 't2', startTime: '19:45', room: 'Rạp Gold Class', format: 'Gold Class VIP', basePrice: 260000, totalSeats: 48, availSeed: 0 },
    { movieId: 'm5', theaterId: 't2', startTime: '22:30', room: 'Rạp 03', format: '2D Phụ đề', basePrice: 105000, totalSeats: 140, availSeed: 59 },

    { movieId: 'm5', theaterId: 't3', startTime: '18:45', room: 'Rạp Gold Class', format: 'Gold Class VIP', basePrice: 245000, totalSeats: 40, availSeed: 12 },
    { movieId: 'm5', theaterId: 't3', startTime: '21:30', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 105000, totalSeats: 130, availSeed: 49 },

    // m6: Mai
    { movieId: 'm6', theaterId: 't1', startTime: '11:00', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 90000, totalSeats: 140, availSeed: 81 },
    { movieId: 'm6', theaterId: 't1', startTime: '17:15', room: 'Rạp Gold Class', format: 'Gold Class VIP', basePrice: 250000, totalSeats: 48, availSeed: 14 },
    { movieId: 'm6', theaterId: 't1', startTime: '20:30', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 105000, totalSeats: 140, availSeed: 27 },

    { movieId: 'm6', theaterId: 't2', startTime: '13:00', room: 'Rạp 04', format: '2D Phụ đề', basePrice: 95000, totalSeats: 150, availSeed: 92 },
    { movieId: 'm6', theaterId: 't2', startTime: '18:00', room: 'Rạp 04', format: '2D Phụ đề', basePrice: 105000, totalSeats: 150, availSeed: 36 },

    { movieId: 'm6', theaterId: 't3', startTime: '16:30', room: 'Rạp 04', format: '2D Phụ đề', basePrice: 95000, totalSeats: 120, availSeed: 53 },
    { movieId: 'm6', theaterId: 't4', startTime: '19:30', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 90000, totalSeats: 120, availSeed: 19 },
    { movieId: 'm6', theaterId: 't5', startTime: '17:30', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 85000, totalSeats: 110, availSeed: 41 },
    { movieId: 'm6', theaterId: 't5', startTime: '20:30', room: 'Rạp 02', format: '2D Phụ đề', basePrice: 90000, totalSeats: 110, availSeed: 16 },
  ];

  const movieDurationMap = new Map(INITIAL_MOVIES.map((m) => [m.code, m.durationMinutes]));

  SHOWTIME_DATES.forEach((dateObj, dayIdx) => {
    scheduleTemplates.forEach((tpl, tplIdx) => {
      if (dayIdx % 2 === 1 && tplIdx % 9 === 0) return;

      const duration = movieDurationMap.get(tpl.movieId) || 120;
      const weekendSurcharge = dateObj.isWeekend ? 15000 : 0;
      const finalPrice = tpl.basePrice + weekendSurcharge;

      const seatVariation = ((dayIdx * 13 + tplIdx * 7) % 25) - 8;
      const availableSeats =
        tpl.availSeed === 0 && dayIdx === 0
          ? 0
          : Math.max(0, Math.min(tpl.totalSeats, tpl.availSeed + seatVariation));

      let status = 'available';
      if (availableSeats === 0) {
        status = 'sold_out';
      } else if (availableSeats <= 15) {
        status = 'almost_full';
      } else if (availableSeats <= Math.floor(tpl.totalSeats * 0.35)) {
        status = 'filling_fast';
      }

      results.push({
        code: `st-${counter++}`,
        movieId: tpl.movieId,
        theaterId: tpl.theaterId,
        dateKey: dateObj.dateKey,
        dateStr: `${dateObj.dateDisplay}/2026`,
        startTime: tpl.startTime,
        endTime: computeEndTime(tpl.startTime, duration),
        room: tpl.room,
        format: tpl.format,
        price: finalPrice,
        priceFormatted: formatPriceVND(finalPrice),
        totalSeats: tpl.totalSeats,
        availableSeats,
        status,
      });
    });
  });

  return results;
}

async function seedShowtimesData() {
  const movieCount = await Movie.countDocuments();
  if (movieCount === 0) {
    await Movie.insertMany(INITIAL_MOVIES);
  }

  const theaterCount = await Theater.countDocuments();
  if (theaterCount === 0) {
    await Theater.insertMany(INITIAL_THEATERS);
  }

  const showtimeCount = await Showtime.countDocuments();
  if (showtimeCount === 0) {
    const initialShowtimes = buildInitialShowtimes();
    await Showtime.insertMany(initialShowtimes);
  }
}

module.exports = {
  SHOWTIME_DATES,
  SHOWTIME_FORMATS,
  seedShowtimesData,
};

