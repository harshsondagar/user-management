import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { EntityManager, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ProfileRepository } from './reposetory/profile.repo';
import { Profile } from './entity/profile-entity';
import { CreateProfileDto } from './dto/create.profile.dto';
import { UpdateProfileDto } from './dto/update.profile.dto';
import { randomUUID } from 'node:crypto';

const MAX_PROFILES_PER_USER = 5;
const PIN_MAX_FAILED_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 5;
const PIN_HASH_ROUNDS = 10;

function isUniqueViolation(err: unknown, constraint: string): boolean {
    return (
        err instanceof QueryFailedError &&
        (err.driverError as any)?.code === '23505' &&
        (err.driverError as any)?.constraint === constraint
    );
}

function isProfileCapViolation(err: unknown): boolean {
    return (
        err instanceof QueryFailedError &&
        ((err.driverError as any)?.code === 'P0001' ||
            String((err.driverError as any)?.message ?? '').includes(
                'PROFILE_LIMIT_REACHED',
            ))
    );
}

@Injectable()
export class ProfilesService {
    constructor(private readonly profileRepository: ProfileRepository) { }

    /**
     * The single ownership choke point. Deliberately uses `findOne` (typed
     * `T | null` on your BaseRepository), not `findByCondition` (typed
     * `T`, but almost certainly nullable at runtime) - that mistype is
     * exactly the kind of gap where "not mine" silently becomes
     * "undefined behavior" instead of a clean 404.
     */
    private async findOwnedOrThrow(
        userId: string,
        profileId: string,
    ): Promise<Profile> {
        const profile = await this.profileRepository.findOne({
            where: { id: profileId, userId },
        });
        if (!profile) {
            throw new NotFoundException('Profile not found');
        }
        return profile;
    }

    async findAllForUser(userId: string): Promise<Profile[]> {
        return this.profileRepository.findAll({
            where: { userId },
            order: { createdAt: 'ASC' },
        } as any);
    }

    async findOneForUser(userId: string, profileId: string): Promise<Profile> {
        return this.findOwnedOrThrow(userId, profileId);
    }

    private async countForUser(userId: string): Promise<number> {
        return this.profileRepository.count({ where: { userId } });
    }

    async create(userId: string, dto: CreateProfileDto): Promise<Profile> {
        // Fast, friendly pre-check only - NOT the source of truth. The DB
        // trigger (migration 1700000000000) is, because count-then-insert
        // has a race window under concurrent requests. This just avoids a
        // wasted round trip on the common, non-racing path.
        const existingCount = await this.countForUser(userId);
        if (existingCount >= MAX_PROFILES_PER_USER) {
            throw new ConflictException(
                `Maximum of ${MAX_PROFILES_PER_USER} profiles reached for this account`,
            );
        }

        try {
            return await this.profileRepository.create({
                userId,
                profileName: dto.profileName.trim(),
                avatarUrl: dto.avatarUrl ?? null,
                isKidsProfile: dto.isKidsProfile ?? false,
                maturityLevel: dto.maturityLevel ?? 5,
                language: dto.language ?? 'en',
                subtitleLanguage: dto.subtitleLanguage ?? null,
                uiTheme: dto.uiTheme ?? 'dark',
            });
        } catch (err) {
            if (isUniqueViolation(err, 'uq_profiles_user_id_lower_name')) {
                throw new ConflictException(
                    'A profile with this name already exists on this account',
                );
            }
            if (isProfileCapViolation(err)) {
                throw new ConflictException(
                    `Maximum of ${MAX_PROFILES_PER_USER} profiles reached for this account`,
                );
            }
            throw err;
        }
    }

    async update(
        userId: string,
        profileId: string,
        dto: UpdateProfileDto,
    ): Promise<Profile> {
        // Ownership check first - updateBy(where) alone would happily match
        // zero rows for someone else's profile without ever telling you it
        // wasn't yours to touch.
        const profile = await this.findOwnedOrThrow(userId, profileId);

        const patch: Partial<Profile> = {};

        if (dto.profileName !== undefined) patch.profileName = dto.profileName.trim();
        if (dto.avatarUrl !== undefined) patch.avatarUrl = dto.avatarUrl;
        if (dto.isKidsProfile !== undefined) patch.isKidsProfile = dto.isKidsProfile;
        if (dto.maturityLevel !== undefined) patch.maturityLevel = dto.maturityLevel;
        if (dto.language !== undefined) patch.language = dto.language;
        if (dto.subtitleLanguage !== undefined)
            patch.subtitleLanguage = dto.subtitleLanguage;
        if (dto.uiTheme !== undefined) patch.uiTheme = dto.uiTheme;

        try {
            await this.profileRepository.updateBy({ id: profile.id }, patch);
        } catch (err) {
            if (isUniqueViolation(err, 'uq_profiles_user_id_lower_name')) {
                throw new ConflictException(
                    'A profile with this name already exists on this account',
                );
            }
            throw err;
        }

        return this.findOwnedOrThrow(userId, profileId);
    }

    async remove(userId: string, profileId: string): Promise<void> {
        const profile = await this.findOwnedOrThrow(userId, profileId);

        const remaining = await this.countForUser(userId);
        if (remaining <= 1) {
            // Product decision, not a technical constraint: an account with
            // zero profiles has nowhere to land after login. Drop this if
            // you'd rather auto-create a default profile instead.
            throw new BadRequestException(
                'Cannot delete the last profile on an account',
            );
        }

        // Real soft-delete via ProfileRepository.softDelete(), which passes
        // through to TypeORM's native Repository#softDelete().
        await this.profileRepository.softDelete(profile.id);
    }

    // ---------- PIN ----------

    async setPin(userId: string, profileId: string, pin: string): Promise<void> {
        const profile = await this.findOwnedOrThrow(userId, profileId);
        const pinHash = await bcrypt.hash(pin, PIN_HASH_ROUNDS);

        await this.profileRepository.updateBy(
            { id: profile.id },
            {
                pinHash,
                pinEnabled: true,
                pinFailedAttempts: 0,
                pinLockedUntil: null,
            } as any,
        );
    }

    async removePin(userId: string, profileId: string): Promise<void> {
        const profile = await this.findOwnedOrThrow(userId, profileId);
        await this.profileRepository.updateBy(
            { id: profile.id },
            {
                pinHash: null,
                pinEnabled: false,
                pinFailedAttempts: 0,
                pinLockedUntil: null,
            } as any,
        );
    }

    async verifyPin(
        userId: string,
        profileId: string,
        pin: string,
    ): Promise<boolean> {

        const profile = await this.profileRepository
            .createQueryBuilder('profile')
            .addSelect('profile.pinHash')
            .where('profile.id = :profileId', { profileId })
            .andWhere('profile.userId = :userId', { userId })
            .getOne();

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }
        if (!profile.pinEnabled || !profile.pinHash) {
            throw new BadRequestException('This profile does not have a PIN set');
        }

        if (profile.pinLockedUntil && profile.pinLockedUntil > new Date()) {
            throw new ForbiddenException(
                `Too many failed attempts. Try again after ${profile.pinLockedUntil.toISOString()}`,
            );
        }

        const matches = await bcrypt.compare(pin, profile.pinHash);

        if (matches) {
            await this.profileRepository.updateBy(
                { id: profile.id },
                { pinFailedAttempts: 0, pinLockedUntil: null } as any,
            );
            return true;
        }

        const failedAttempts = profile.pinFailedAttempts + 1;
        const shouldLock = failedAttempts >= PIN_MAX_FAILED_ATTEMPTS;

        await this.profileRepository.updateBy(
            { id: profile.id },
            {
                pinFailedAttempts: failedAttempts,
                pinLockedUntil: shouldLock
                    ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60_000)
                    : null,
            } as any,
        );

        if (shouldLock) {
            throw new ForbiddenException(
                `Too many failed attempts. Profile locked for ${PIN_LOCKOUT_MINUTES} minutes`,
            );
        }
        throw new ForbiddenException('Incorrect PIN');
    }

    async createPrimaryProfile(
        userId: string,
        profileName: string,
        manager?: EntityManager,
    ): Promise<Profile> {

        const values = {
            userId,
            profileName: profileName.trim(),
            avatarUrl: null,
            isKidsProfile: false,
            maturityLevel: 5,
            language: 'en',
            subtitleLanguage: null,
            uiTheme: 'dark',
            pinHash: null,
            pinEnabled: false,
            pinFailedAttempts: 0,
            pinLockedUntil: null,
            isPrimary: true,
            isDefault: true,
        };

        if (manager) {
            const rawRepo = manager.getRepository(Profile);
            const profile = rawRepo.create({ id: randomUUID(), ...values });
            return rawRepo.save(profile);
        }

        const profile = await this.profileRepository.create(values);
        return this.profileRepository.save(profile);
    }

}

