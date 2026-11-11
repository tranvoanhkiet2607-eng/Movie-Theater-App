// Dữ liệu mẫu khởi tạo cho các tính năng mới
const FoodItem = require('../models/FoodItem');
const Promotion = require('../models/Promotion');

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
  } catch (err) {
    console.error('❌ Lỗi khi seed dữ liệu:', err);
  }
}

module.exports = { seedNewFeaturesData };
