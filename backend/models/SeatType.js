// Nguyễn Minh Quân - CE180048
const mongoose = require('mongoose');

const SeatTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: ['standard', 'vip', 'couple'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameEn: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#64748B',
    },
    accentColor: {
      type: String,
      default: '#94A3B8',
    },
    basePrice: {
      type: Number,
      required: true,
      default: 90000,
    },
    surcharge: {
      type: Number,
      default: 0,
    },
    capacity: {
      type: Number,
      default: 1, // 1 cho Thường/VIP, 2 cho Ghế đôi Sweetbox
    },
    features: {
      type: [String],
      default: [],
    },
    defaultRows: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

SeatTypeSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    return ret;
  },
});

module.exports = mongoose.model('SeatType', SeatTypeSchema);
