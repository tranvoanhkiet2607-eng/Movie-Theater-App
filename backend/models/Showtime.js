// Nguyễn Minh Quân - CE180048
const mongoose = require('mongoose');

const ShowtimeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    movieId: {
      type: String,
      required: true,
      index: true,
    },
    theaterId: {
      type: String,
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    dateStr: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    room: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    priceFormatted: {
      type: String,
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
    },
    availableSeats: {
      type: Number,
      required: true,
    },
    bookedSeats: {
      type: [String],
      default: [],
    },
    heldSeats: [
      {
        seatCode: { type: String, required: true },
        userId: { type: String, default: '' },
        holdToken: { type: String, default: '' },
        expiresAt: { type: Date, required: true },
      },
    ],
    status: {
      type: String,
      enum: ['available', 'filling_fast', 'almost_full', 'sold_out'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

ShowtimeSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret.code;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Showtime', ShowtimeSchema);

