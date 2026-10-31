import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    label: { type: String, trim: true, maxlength: 30, default: '' },
    line1: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{6}$/,
    },
  },
  { timestamps: true },
);

addressSchema.index({ customerId: 1, createdAt: -1 });

export const Address = mongoose.model('Address', addressSchema);
