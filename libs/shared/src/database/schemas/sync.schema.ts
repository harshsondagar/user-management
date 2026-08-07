import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from 'mongoose';


@Schema()
export class SyncSkip extends Document {
    @Prop({ required: true, unique: true, index: true })
    declare nid: number

    @Prop({ required: true })
    declare reason: 'no_resource_id' | 'zero_records' | 'permanent_failure';

    @Prop({ required: false })
    titleName?: string

    @Prop()
    declare errorMessage: string;

    @Prop({ default: 0 })
    declare attemptCount: number;
}

export const SyncSkipSchema = SchemaFactory.createForClass(SyncSkip)