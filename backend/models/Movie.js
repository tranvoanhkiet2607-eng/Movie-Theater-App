// Nguyễn Minh Quân - CE180048
const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Tên phim là bắt buộc'],
      trim: true,
    },
    originalTitle: {
      type: String,
      default: '',
      trim: true,
    },
    genre: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    durationLabel: {
      type: String,
      required: true,
    },
    rating: {
      type: String,
      default: '8.5 ★',
    },
    ageRating: {
      type: String,
      enum: ['P', 'K', 'T13', 'T16', 'T18'],
      default: 'T13',
    },
    ageDescription: {
      type: String,
      default: '',
    },
    poster: {
      type: String,
      required: true,
    },
    badge: {
      type: String,
      default: '',
    },
    releaseDate: {
      type: String,
      default: '',
    },
    director: {
      type: String,
      default: '',
    },
    cast: {
      type: [String],
      default: [],
    },
    synopsis: {
      type: String,
      default: '',
    },
    formats: {
      type: [String],
      default: [],
    },
    isNowShowing: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

MovieSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret.code;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Movie', MovieSchema);

