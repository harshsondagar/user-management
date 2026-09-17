import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProfileDto } from './create.profile.dto';

// Nobody flips is_default through a generic PATCH - that has its own
// dedicated endpoint (see ProfilesController#setDefault) so it can't be
// smuggled in alongside an unrelated rename.
export class UpdateProfileDto extends PartialType(
    OmitType(CreateProfileDto, [] as const),
) { }