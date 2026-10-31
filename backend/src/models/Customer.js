import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20,
    },
    // Included in JWTs. Incrementing this invalidates every earlier session.
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

export const Customer = mongoose.model('Customer', customerSchema);
