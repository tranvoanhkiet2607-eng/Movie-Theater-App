// Anh Kiệt - CE180795
// Model Khuyến Mãi (UC31 - Apply Promotion)
const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    discountValue: {
      type: Number,
      required: true,
    },
    maxDiscount: {
      type: Number,
      default: 0, // 0 nghĩa là không giới hạn trần nếu là percentage
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Mặc định 1 năm
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: 1000,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

PromotionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id ? ret._id.toString() : ret.code;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Promotion', PromotionSchema);

