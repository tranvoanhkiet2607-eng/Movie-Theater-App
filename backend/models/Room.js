const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Tên phòng chiếu là bắt buộc'],
      trim: true,
    },
    theaterId: {
      type: String,
      required: [true, 'Mã cụm rạp là bắt buộc'],
      index: true,
      trim: true,
    },
    format: {
      type: String,
      default: '2D Phụ đề',
      trim: true,
    },
    totalSeats: {
      type: Number,
      default: 120,
      min: 10,
    },
    rows: {
      type: Number,
      default: 10,
    },
    cols: {
      type: Number,
      default: 12,
    },
    status: {
      type: String,
      enum: ['active', 'maintenance'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

RoomSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret.code;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Room', RoomSchema);
