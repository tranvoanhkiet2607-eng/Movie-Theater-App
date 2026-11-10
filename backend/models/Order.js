const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user: {
      id: { type: String, default: '' },
      fullName: { type: String, default: 'Khách hàng' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    movie: {
      id: { type: String, default: '' },
      title: { type: String, default: '' },
      poster: { type: String, default: '' },
      ageRating: { type: String, default: 'T13' },
    },
    theater: {
      id: { type: String, default: '' },
      name: { type: String, default: '' },
      room: { type: String, default: '' },
      showtimeDate: { type: String, default: '' },
      showtimeTime: { type: String, default: '' },
      format: { type: String, default: '2D Phụ đề' },
    },
    tickets: [
      {
        seatNumber: { type: String, required: true },
        seatType: { type: String, default: 'standard' },
        price: { type: Number, required: true },
      },
    ],
    foods: [
      {
        foodId: { type: String, default: '' },
        name: { type: String, required: true },
        category: { type: String, default: 'food' },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String, default: '' },
      },
    ],
    subtotalTickets: {
      type: Number,
      default: 0,
    },
    subtotalFoods: {
      type: Number,
      default: 0,
    },
    promotionCode: {
      type: String,
      default: '',
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: 'MoMo',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'paid',
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'preparing',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

OrderSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Order', OrderSchema);

