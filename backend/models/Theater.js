// Nguyễn Minh Quân - CE180048
const mongoose = require('mongoose');

const TheaterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Tên rạp là bắt buộc'],
      trim: true,
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    distance: {
      type: String,
      default: '',
    },
    hotline: {
      type: String,
      default: '1900 6017',
    },
    totalRooms: {
      type: Number,
      default: 0,
    },
    supportedFormats: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

TheaterSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret.code;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Theater', TheaterSchema);

