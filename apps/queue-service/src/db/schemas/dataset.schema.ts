import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Dataset extends Document {

    @Prop({ required: true, index: true })
    declare nid: number

    @Prop({ required: true })
    declare resourceId: string

    @Prop({ required: true })
    declare title: string;

    @Prop()
    ministry?: string;

    @Prop()
    sector?: string;

    @Prop()
    jurisdiction?: string;

    @Prop()
    govtType?: string;

    @Prop()
    url?: string;

    @Prop([String])
    keywords?: string[];

    @Prop({ type: [Object] })
    declare records: Record<string, any>[];

    @Prop()
    declare recordCount: number;

    @Prop()
    declare fetchedAt: Date;

}

export const DatasetSchema = SchemaFactory.createForClass(Dataset)

DatasetSchema.index(
    { resourceId: 1 },
    { unique: true, partialFilterExpression: { resourceId: { $type: 'string' } } },
);
DatasetSchema.index({ title: 'text', keywords: 'text', sector: 'text', ministry: 'text' });