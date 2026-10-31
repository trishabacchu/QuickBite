import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 800 },
    // Integer paise avoids floating-point money errors. ₹249.00 is 24900.
    pricePaise: { type: Number, required: true, min: 1, integer: true },
    imageUrl: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, maxlength: 60, index: true },
    isAvailable: { type: Boolean, default: true },
    preparationTimeMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
      integer: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'food_items' },
);

foodItemSchema.index({ restaurantId: 1, isActive: 1, isAvailable: 1 });
foodItemSchema.index({ category: 1, isActive: 1 });
foodItemSchema.index({ restaurantId: 1, name: 1 }, { unique: true });
foodItemSchema.index({ name: 1 });

export const FoodItem = mongoose.model('FoodItem', foodItemSchema);
