import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, index: true, unique: true })
  address: string; // public address (unique)

  @Prop({ required: true })
  username: string;

  @Prop()
  bio?: string;

  @Prop({ type: Types.ObjectId })
  avatar?: Types.ObjectId; // GridFS file id
}

export const UserSchema = SchemaFactory.createForClass(User);
