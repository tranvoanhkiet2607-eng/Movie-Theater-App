const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    movieId: {
      type: String,
      required: [true, 'Mã phim là bắt buộc'],
      index: true,
    },
    movieTitle: {
      type: String,
      default: '',
      trim: true,
    },
    userId: {
      type: String,
      required: [true, 'Mã người dùng là bắt buộc'],
      index: true,
    },
    userName: {
      type: String,
      required: [true, 'Tên người dùng là bắt buộc'],
      trim: true,
    },
    userAvatar: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      required: [true, 'Số sao đánh giá là bắt buộc'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Nội dung nhận xét là bắt buộc'],
      trim: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['approved', 'hidden', 'flagged'],
      default: 'approved',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

ReviewSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Review', ReviewSchema);

