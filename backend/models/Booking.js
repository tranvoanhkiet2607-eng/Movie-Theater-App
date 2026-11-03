// Anh Kiệt - CE180795
// Model Đơn Đặt Vé (UC29, UC30, UC32, UC33, UC34, UC35, UC36)
const mongoose = require('mongoose');

const SeatDetailSchema = new mongoose.Schema(
  {
    seatNumber: { type: String, required: true },
    type: { type: String, enum: ['standard', 'vip', 'couple'], default: 'standard' },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const SelectedFoodSchema = new mongoose.Schema(
  {
    foodId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: 'combo' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    size: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      default: '',
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerEmail: {
      type: String,
      default: '',
      trim: true,
    },

    // Thông tin suất chiếu & phim
    showtimeId: {
      type: String,
      required: true,
      index: true,
    },
    movieId: {
      type: String,
      required: true,
    },
    movieTitle: {
      type: String,
      required: true,
    },
    moviePoster: {
      type: String,
      default: '',
    },
    theaterId: {
      type: String,
      required: true,
    },
    theaterName: {
      type: String,
      required: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    showtimeDate: {
      type: String,
      required: true,
    },
    showtimeTime: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      default: '2D Phụ đề',
    },

    // Thông tin ghế (UC29)
    seats: {
      type: [String],
      required: true,
      validate: [v => Array.isArray(v) && v.length > 0, 'Phải chọn ít nhất một ghế.'],
    },
    seatDetails: [SeatDetailSchema],
    seatPriceTotal: {
      type: Number,
      required: true,
      default: 0,
    },

    // Bắp nước đính kèm (UC32)
    foodItems: [SelectedFoodSchema],
    foodPriceTotal: {
      type: Number,
      default: 0,
    },

    // Khuyến mãi & Giảm giá (UC31)
    promotionCode: {
      type: String,
      default: '',
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },

    // Tổng tiền thanh toán (UC32)
    totalAmount: {
      type: Number,
      required: true,
    },

    // Thanh toán (UC33)
    paymentMethod: {
      type: String,
      enum: ['momo', 'vnpay', 'zalopay', 'card', 'counter'],
      default: 'momo',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'paid', // Giả lập thanh toán thành công
    },

    // Trạng thái đơn đặt vé (UC34, UC36)
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
      index: true,
    },
    cancelledReason: {
      type: String,
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },

    // Vé điện tử & QR (UC35)
    barcode: {
      type: String,
      required: true,
    },
    qrCodeData: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

BookingSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id ? ret._id.toString() : ret.bookingCode;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Booking', BookingSchema);

