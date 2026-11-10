const mongoose = require('mongoose');

const FoodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên món ăn/thức uống là bắt buộc'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['food', 'drink', 'combo'],
      default: 'food',
    },
    price: {
      type: Number,
      required: [true, 'Giá bán là bắt buộc'],
      min: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    unit: {
      type: String,
      default: 'Phần',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

FoodItemSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

FoodItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('FoodItem', FoodItemSchema);

