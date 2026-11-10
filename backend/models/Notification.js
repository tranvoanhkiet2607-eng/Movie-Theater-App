const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề thông báo là bắt buộc'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Nội dung thông báo là bắt buộc'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['system', 'promotion', 'order', 'movie'],
      default: 'system',
    },
    targetUser: {
      type: String,
      default: 'all', // 'all' hoặc userId cụ thể
      index: true,
    },
    readBy: {
      type: [String],
      default: [],
    },
    link: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Notification', NotificationSchema);

