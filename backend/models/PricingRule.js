// Nguyễn Minh Quân - CE180048
const mongoose = require('mongoose');

const PricingRuleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['format', 'seat_type', 'day_of_week', 'time_slot', 'audience', 'other'],
      required: true,
      index: true,
      default: 'format',
    },
    adjustmentType: {
      type: String,
      enum: ['fixed_surcharge', 'fixed_discount', 'percentage_surcharge', 'percentage_discount', 'fixed_price'],
      required: true,
      default: 'fixed_surcharge',
    },
    adjustmentValue: {
      type: Number,
      required: true,
      default: 0,
    },
    adjustmentFormatted: {
      type: String,
      default: '',
    },
    condition: {
      type: String,
      default: '',
      trim: true,
    },
    applicableFormats: {
      type: [String],
      default: [],
    },
    applicableDays: {
      type: [Number],
      default: [], // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7
    },
    applicableTimeFrom: {
      type: String,
      default: '',
      trim: true,
    },
    applicableTimeTo: {
      type: String,
      default: '',
      trim: true,
    },
    applicableSeatTypes: {
      type: [String],
      default: [], // 'standard', 'vip', 'couple'
    },
    targetAudience: {
      type: String,
      enum: ['all', 'adult', 'student', 'child', 'senior', 'member'],
      default: 'all',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: Number,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PricingRuleSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('PricingRule', PricingRuleSchema);
