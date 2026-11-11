// Nguyễn Minh Quân - CE180048
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    bookingCode: {
      type: String,
      required: true,
      unique: true,
    },
    showtimeId: {
      type: String,
      default: '',
    },
    orderCode: {
      type: String,
      default: '',
    },
    movieTitle: {
      type: String,
      required: true,
    },
    moviePoster: {
      type: String,
      default: '',
    },
    cinemaName: {
      type: String,
      required: true,
    },
    hallName: {
      type: String,
      required: true,
    },
    showtime: {
      type: Date,
      required: true,
    },
    format: {
      type: String,
      default: '2D Phụ đề',
    },
    seats: {
      type: [String],
      required: true,
    },
    seatType: {
      type: String,
      default: 'Standard',
    },
    combos: {
      type: String,
      default: '',
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: 'Ví MoMo',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'refunded'],
      default: 'paid',
    },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    qrCodeData: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual id mapping
BookingSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

BookingSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Booking', BookingSchema);

