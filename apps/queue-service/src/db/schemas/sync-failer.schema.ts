import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SyncFailure extends Document {
    @Prop({ required: true, index: true })
    declare nid: number;

    @Prop()
    declare title?: string;

    @Prop({ required: true })
    declare errorMessage: string;

    @Prop({ default: 0 })
    declare attemptCount: number;
}

export const SyncFailureSchema = SchemaFactory.createForClass(SyncFailure);