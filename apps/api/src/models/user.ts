import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    googleSub: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

export type UserDocument = mongoose.InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User = mongoose.model('User', userSchema);

export type PublicUser = {
  email: string;
  name: string;
};

export function toPublicUser(user: {
  email: string;
  name: string;
}): PublicUser {
  return {
    email: user.email,
    name: user.name,
  };
}
