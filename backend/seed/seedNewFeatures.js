// Dữ liệu mẫu khởi tạo cho các tính năng mới: UC37, UC38, UC39, UC40, UC41, UC42, UC43, UC44, UC45
const FoodItem = require('../models/FoodItem');
const Promotion = require('../models/Promotion');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Order = require('../models/Order');

async function seedNewFeaturesData() {
  try {
    // 1. Seed Food Items nếu chưa có
    const foodCount = await FoodItem.countDocuments();
    if (foodCount === 0) {
      await FoodItem.create([
        {
          name: 'Bắp Rang Bơ Caramel',
          category: 'food',
          price: 65000,
          description: 'Hạt bắp nổ thơm lừng phủ lớp sốt caramel ngọt ngào, giòn rụm.',
          image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500',
          isAvailable: true,
          unit: 'Hộp lớn',
        },
        {
          name: 'Bắp Rang Phô Mai Cheddar',
          category: 'food',
          price: 70000,
          description: 'Bắp rang bơ lắc bột phô mai Cheddar béo ngậy, đậm đà khó cưỡng.',
          image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=500',
          isAvailable: true,
          unit: 'Hộp lớn',
        },
        {
          name: 'Bắp Rang Vị Truyền Thống',
          category: 'food',
          price: 55000,
          description: 'Bắp nổ nguyên bản thơm mùi bơ sữa nhẹ nhàng, ít ngọt chuẩn gu.',
          image: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=500',
          isAvailable: true,
          unit: 'Hộp tiêu chuẩn',
        },
        {
          name: 'Coca-Cola Zero Sugar (Lớn)',
          category: 'drink',
          price: 38000,
          description: 'Nước ngọt có gas không calo, ướp lạnh sảng khoái suốt buổi chiếu.',
          image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500',
          isAvailable: true,
          unit: 'Ly 32oz',
        },
        {
          name: 'Trà Đào Cam Sả Tươi',
          category: 'drink',
          price: 45000,
          description: 'Trà đen ủ lạnh kết hợp vị đào thơm mát, lát cam tươi mọng nước.',
          image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500',
          isAvailable: true,
          unit: 'Ly 22oz',
        },
        {
          name: 'Nước Suối Khoáng Tinh Khiết',
          category: 'drink',
          price: 20000,
          description: 'Nước khoáng đóng chai tiện lợi, thanh khiết bổ sung khoáng chất.',
          image: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=500',
          isAvailable: true,
          unit: 'Chai 500ml',
        },
        {
          name: 'Combo Couple Hẹn Hò',
          category: 'combo',
          price: 139000,
          description: 'Bao gồm 01 Bắp lớn (tùy chọn vị caramel/phô mai) + 02 Ly nước ngọt 32oz.',
          image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500',
          isAvailable: true,
          unit: 'Combo',
        },
        {
          name: 'Combo Solo Tiết Kiệm',
          category: 'combo',
          price: 89000,
          description: 'Bao gồm 01 Bắp tiêu chuẩn + 01 Ly nước ngọt 22oz mát lạnh.',
          image: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=500',
          isAvailable: true,
          unit: 'Combo',
        },
        {
          name: 'Combo Family Party (4 người)',
          category: 'combo',
          price: 249000,
          description: 'Bao gồm 02 Bắp khổng lồ 2 vị + 04 Nước ngọt + 01 Phần snack xúc xích nướng.',
          image: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=500',
          isAvailable: true,
          unit: 'Combo lớn',
        },
      ]);
      console.log('🍿 Đã seed dữ liệu Menu Đồ ăn & Thức uống (Food Items)');
    }

    // 2. Seed Promotions nếu chưa có
    const promoCount = await Promotion.countDocuments();
    if (promoCount === 0) {
      await Promotion.create([
        {
          code: 'CINEMAX20',
          title: 'Giảm 20% Tổng Đơn Xem Phim',
          description: 'Áp dụng cho mọi đơn đặt vé kèm bắp nước từ 100.000đ trở lên, tối đa 50.000đ.',
          discountType: 'percentage',
          discountValue: 20,
          maxDiscount: 50000,
          minOrderValue: 100000,
          isActive: true,
          usageLimit: 500,
          usedCount: 38,
        },
        {
          code: 'POPCORN50K',
          title: 'Giảm Ngay 50.000đ Combo F&B',
          description: 'Ưu đãi dành riêng cho tín đồ mê bắp nước rạp chiếu phim CineMax.',
          discountType: 'fixed',
          discountValue: 50000,
          maxDiscount: 50000,
          minOrderValue: 150000,
          isActive: true,
          usageLimit: 300,
          usedCount: 15,
        },
        {
          code: 'VIPWEEKEND',
          title: 'Ưu Đãi Cuối Tuần Siêu VIP',
          description: 'Giảm trực tiếp 15% cho tất cả các suất chiếu Thứ 7 và Chủ Nhật.',
          discountType: 'percentage',
          discountValue: 15,
          maxDiscount: 40000,
          minOrderValue: 80000,
          isActive: true,
          usageLimit: 1000,
          usedCount: 72,
        },
        {
          code: 'SUMMER2026',
          title: 'Khuyến Mãi Hè Rực Rỡ (Hết hạn)',
          description: 'Chương trình ưu đãi mùa hè đã kết thúc, hiện đã tạm vô hiệu hóa.',
          discountType: 'percentage',
          discountValue: 25,
          maxDiscount: 60000,
          minOrderValue: 120000,
          isActive: false,
          usageLimit: 200,
          usedCount: 200,
        },
      ]);
      console.log('🎟️ Đã seed dữ liệu Mã Khuyến Mãi (Promotions)');
    }

    // 3. Seed Reviews nếu chưa có
    const reviewCount = await Review.countDocuments();
    if (reviewCount === 0) {
      await Review.create([
        {
          movieId: 'm1',
          movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
          userId: 'user_demo_1',
          userName: 'Trần Minh Quân',
          rating: 5,
          comment: 'Hình ảnh và âm thanh Hans Zimmer làm quá đỉnh! Xem IMAX thật sự choáng ngợp từng khung hình sa mạc Arrakis.',
          status: 'approved',
        },
        {
          movieId: 'm1',
          movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
          userId: 'user_demo_2',
          userName: 'Lê Hoàng Yến',
          rating: 5,
          comment: 'Diễn xuất của Timothée Chalamet và Zendaya xuất thần. Phim dài gần 3 tiếng nhưng xem không rời mắt giây nào!',
          status: 'approved',
        },
        {
          movieId: 'm1',
          movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
          userId: 'user_demo_3',
          userName: 'Nguyễn Văn Đạt',
          rating: 4,
          comment: 'Kỹ xảo 10/10, nhịp phim nửa đầu hơi chậm một chút nhưng nửa sau dồn dập mãn nhãn cực kỳ.',
          status: 'approved',
        },
        {
          movieId: 'm2',
          movieTitle: 'Kung Fu Panda 4',
          userId: 'user_demo_4',
          userName: 'Phạm Thu Trang',
          rating: 5,
          comment: 'Phim cực kỳ hài hước, cả gia đình mình cười nghiêng ngả. Bé nhà mình thích mê chú gấu Po!',
          status: 'approved',
        },
        {
          movieId: 'm3',
          movieTitle: 'Quật Mộ Trùng Ma (Exhuma)',
          userId: 'user_demo_5',
          userName: 'Vũ Đức Nam',
          rating: 5,
          comment: 'Cốt truyện phong thủy âm dương nghẹt thở, diễn xuất Kim Go-eun và Lee Do-hyun quá ấn tượng.',
          status: 'approved',
        },
        {
          movieId: 'm3',
          movieTitle: 'Quật Mộ Trùng Ma (Exhuma)',
          userId: 'user_demo_bad',
          userName: 'Spam Bot 888',
          rating: 1,
          comment: 'Nội dung quảng cáo rác không liên quan phim, hãy truy cập link giả mạo abcxyz...',
          status: 'flagged',
        },
      ]);
      console.log('⭐ Đã seed dữ liệu Đánh giá phim (Reviews)');
    }

    // 4. Seed Notifications nếu chưa có
    const notifCount = await Notification.countDocuments();
    if (notifCount === 0) {
      await Notification.create([
        {
          title: '🎉 Chào mừng bạn đến với CineMax Theater!',
          message: 'Trải nghiệm đặt vé xem phim và combo bắp nước trực tuyến nhanh chóng, hiện đại nhất. Tích điểm VIP ngay hôm nay!',
          type: 'system',
          targetUser: 'all',
          readBy: [],
        },
        {
          title: '🎁 Ưu đãi độc quyền: Nhập CINEMAX20 giảm 20%',
          message: 'Nhập mã CINEMAX20 tại bước thanh toán để được giảm ngay 20% cho toàn bộ vé và combo bắp nước thơm ngon.',
          type: 'promotion',
          targetUser: 'all',
          readBy: [],
        },
        {
          title: '🎬 Bom tấn Dune: Part Two đang mở bán suất chiếu đặc biệt',
          message: 'Trải nghiệm phòng chiếu IMAX 3D và Gold Class với dàn âm thanh vòm sống động nhất tuần này.',
          type: 'movie',
          targetUser: 'all',
          readBy: [],
        },
      ]);
      console.log('🔔 Đã seed dữ liệu Thông báo hệ thống (Notifications)');
    }

    // 5. Seed Sample Orders nếu chưa có để sẵn sàng cho UC44 và UC45
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      await Order.create([
        {
          orderCode: 'ORD-261109-8812',
          user: {
            id: 'customer_01',
            fullName: 'Nguyễn Văn A',
            email: 'customer@cinema.com',
            phone: '0901234567',
          },
          movie: {
            id: 'm1',
            title: 'Dune: Hành Tinh Cát - Phần 2',
            poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
            ageRating: 'T13',
          },
          theater: {
            id: 'th1',
            name: 'CineMax Landmark 81',
            room: 'Rạp 03 (IMAX)',
            showtimeDate: 'Hôm nay',
            showtimeTime: '19:30',
            format: 'IMAX 3D',
          },
          tickets: [
            { seatNumber: 'G07', seatType: 'vip', price: 135000 },
            { seatNumber: 'G08', seatType: 'vip', price: 135000 },
          ],
          foods: [
            {
              name: 'Combo Couple Hẹn Hò',
              category: 'combo',
              price: 139000,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500',
            },
          ],
          subtotalTickets: 270000,
          subtotalFoods: 139000,
          promotionCode: 'CINEMAX20',
          discountAmount: 50000,
          totalPrice: 359000,
          paymentMethod: 'MoMo',
          paymentStatus: 'paid',
          orderStatus: 'preparing',
          notes: 'Bắp phô mai bớt mặn giùm mình nhé',
        },
        {
          orderCode: 'ORD-261109-9023',
          user: {
            id: 'customer_02',
            fullName: 'Trần Thị Bích Ngọc',
            email: 'vip@cinema.com',
            phone: '0987654321',
          },
          movie: {
            id: 'm2',
            title: 'Kung Fu Panda 4',
            poster: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500',
            ageRating: 'P',
          },
          theater: {
            id: 'th2',
            name: 'CineMax Vincom Đồng Khởi',
            room: 'Rạp 01',
            showtimeDate: 'Hôm nay',
            showtimeTime: '16:15',
            format: '2D Lồng tiếng',
          },
          tickets: [
            { seatNumber: 'E04', seatType: 'standard', price: 95000 },
            { seatNumber: 'E05', seatType: 'standard', price: 95000 },
            { seatNumber: 'E06', seatType: 'standard', price: 95000 },
          ],
          foods: [
            {
              name: 'Bắp Rang Bơ Caramel',
              category: 'food',
              price: 65000,
              quantity: 2,
              image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500',
            },
            {
              name: 'Coca-Cola Zero Sugar (Lớn)',
              category: 'drink',
              price: 38000,
              quantity: 3,
              image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500',
            },
          ],
          subtotalTickets: 285000,
          subtotalFoods: 244000,
          promotionCode: 'POPCORN50K',
          discountAmount: 50000,
          totalPrice: 479000,
          paymentMethod: 'VNPay',
          paymentStatus: 'paid',
          orderStatus: 'ready',
          notes: 'Đã sẵn sàng tại quầy số 2',
        },
        {
          orderCode: 'ORD-261108-7112',
          user: {
            id: 'customer_03',
            fullName: 'Lê Hoàng Nam',
            email: 'nam.le@gmail.com',
            phone: '0912345678',
          },
          movie: {
            id: 'm3',
            title: 'Quật Mộ Trùng Ma (Exhuma)',
            poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500',
            ageRating: 'T18',
          },
          theater: {
            id: 'th1',
            name: 'CineMax Landmark 81',
            room: 'Rạp 02',
            showtimeDate: 'Hôm qua',
            showtimeTime: '21:15',
            format: '2D Phụ đề',
          },
          tickets: [
            { seatNumber: 'F09', seatType: 'standard', price: 95000 },
            { seatNumber: 'F10', seatType: 'standard', price: 95000 },
          ],
          foods: [
            {
              name: 'Combo Solo Tiết Kiệm',
              category: 'combo',
              price: 89000,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=500',
            },
          ],
          subtotalTickets: 190000,
          subtotalFoods: 89000,
          promotionCode: '',
          discountAmount: 0,
          totalPrice: 279000,
          paymentMethod: 'Credit Card',
          paymentStatus: 'paid',
          orderStatus: 'completed',
          notes: '',
        },
      ]);
      console.log('📋 Đã seed dữ liệu Đơn hàng mẫu (Orders & Food Orders)');
    }
  } catch (err) {
    console.error('❌ Lỗi khi seed dữ liệu tính năng mới:', err);
  }
}

module.exports = { seedNewFeaturesData };

