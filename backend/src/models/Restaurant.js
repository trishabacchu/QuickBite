import mongoose from 'mongoose';

const clockPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const restaurantSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 80,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 800 },
    imageUrl: { type: String, required: true, trim: true },
    cuisine: { type: String, required: true, trim: true, maxlength: 80 },
    // Static seeded display metadata. There is no review or rating workflow.
    rating: { type: Number, required: true, min: 0, max: 5 },
    deliveryTimeMinutes: { type: Number, required: true, min: 1, max: 180, integer: true },
    deliveryFeePaise: { type: Number, required: true, min: 0, integer: true },
    isActive: { type: Boolean, default: true },
    openingTime: { type: String, required: true, match: clockPattern },
    closingTime: { type: String, required: true, match: clockPattern },
    timezone: { type: String, required: true, default: 'Asia/Kolkata' },
  },
  { timestamps: true },
);

restaurantSchema.index({ isActive: 1, cuisine: 1 });
restaurantSchema.index({ name: 1 });

export const Restaurant = mongoose.model('Restaurant', restaurantSchema);
