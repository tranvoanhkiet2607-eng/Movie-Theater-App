// Anh Kiệt - CE180795
// Seed danh mục mã khuyến mãi mẫu (UC31)
const Promotion = require('../models/Promotion');

const INITIAL_PROMOTIONS = [
  {
    code: 'CINEMA50',
    title: 'Giảm 50.000đ cho đơn từ 150.000đ',
    description: 'Ưu đãi dành cho tất cả khách hàng đặt vé xem phim và combo bắp nước.',
    discountType: 'fixed',
    discountValue: 50000,
    minOrderAmount: 150000,
    isActive: true,
  },
  {
    code: 'WELCOME20',
    title: 'Giảm 20% cho thành viên mới',
    description: 'Áp dụng cho mọi hóa đơn đặt vé lần đầu tiên, giảm tối đa 40.000đ.',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 40000,
    minOrderAmount: 80000,
    isActive: true,
  },
  {
    code: 'STUDENT10',
    title: 'Ưu đãi Học sinh - Sinh viên giảm 15.000đ',
    description: 'Dành cho các bạn học sinh, sinh viên khi xem phim các ngày trong tuần.',
    discountType: 'fixed',
    discountValue: 15000,
    minOrderAmount: 70000,
    isActive: true,
  },
  {
    code: 'POPCORNFREE',
    title: 'Giảm 35.000đ combo bắp nước',
    description: 'Tặng ngay 35.000đ khi đặt kèm ít nhất 1 combo bắp nước trong đơn vé.',
    discountType: 'fixed',
    discountValue: 35000,
    minOrderAmount: 120000,
    isActive: true,
  },
  {
    code: 'VIPMEMBER',
    title: 'Đặc quyền VIP giảm 30.000đ',
    description: 'Giảm trực tiếp 30.000đ khi chọn ghế VIP hoặc ghế đôi Sweetbox.',
    discountType: 'fixed',
    discountValue: 30000,
    minOrderAmount: 160000,
    isActive: true,
  },
];

async function seedPromotionsData() {
  try {
    const count = await Promotion.countDocuments();
    if (count === 0) {
      console.log('🌱 Đang khởi tạo danh mục mã khuyến mãi mẫu vào Database...');
      await Promotion.insertMany(INITIAL_PROMOTIONS);
      console.log(`✅ Đã khởi tạo thành công ${INITIAL_PROMOTIONS.length} mã khuyến mãi.`);
    }
  } catch (error) {
    console.error('⚠️ Lỗi khi seed mã khuyến mãi:', error.message);
  }
}

module.exports = {
  seedPromotionsData,
  INITIAL_PROMOTIONS,
};

