// Nguyễn Minh Quân - CE180048
const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    seatCode: {
      type: String,
      required: [true, 'Mã ghế là bắt buộc (ví dụ: A01, B05)'],
      trim: true,
      uppercase: true,
    },
    row: {
      type: String,
      required: [true, 'Hàng ghế là bắt buộc (ví dụ: A, B, C)'],
      trim: true,
      uppercase: true,
    },
    colNumber: {
      type: Number,
      required: [true, 'Số thứ tự ghế là bắt buộc (ví dụ: 1, 2, 3)'],
    },
    theaterId: {
      type: String,
      required: [true, 'Mã cụm rạp là bắt buộc'],
      index: true,
      trim: true,
    },
    room: {
      type: String,
      required: [true, 'Tên phòng chiếu là bắt buộc'],
      index: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['standard', 'vip', 'couple'],
      default: 'standard',
    },
    price: {
      type: Number,
      default: 90000,
    },
    priceFormatted: {
      type: String,
      default: '90.000đ',
    },
    status: {
      type: String,
      enum: ['available', 'maintenance', 'reserved'],
      default: 'available',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ràng buộc duy nhất mã ghế trong cùng một phòng của một cụm rạp
SeatSchema.index({ theaterId: 1, room: 1, seatCode: 1 }, { unique: true });

SeatSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    return ret;
  },
});

module.exports = mongoose.model('Seat', SeatSchema);

