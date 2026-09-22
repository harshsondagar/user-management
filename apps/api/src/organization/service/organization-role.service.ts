import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError, In } from 'typeorm';
import { RoleRepository } from '../repositories/role.repository';
import { RolePermissionRepository } from '../repositories/role.permission.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { Role } from '../entities/role-entity';

function isUniqueViolation(err: unknown, constraint: string): boolean {
    return (
        err instanceof QueryFailedError &&
        (err.driverError as any)?.code === '23505' &&
        (err.driverError as any)?.constraint === constraint
    );
}

@Injectable()
export class RolesService {
    constructor(
        private readonly roleRepo: RoleRepository,
        private readonly rolePermissionRepo: RolePermissionRepository,
        private readonly permissionRepo: PermissionRepository,
    ) { }


    async listForOrganization(organizationId: string): Promise<Role[]> {
        return this.roleRepo.findAll({ where: { organizationId } } as any);
    }

    async create(
        organizationId: string,
        roleName: string,
        description: string | undefined,
        permissionKeys: string[],
    ): Promise<Role> {
        const permissions = await this.resolvePermissions(permissionKeys);

        let role: Role;
        try {
            role = await this.roleRepo.create({
                organizationId,
                roleName: roleName.trim(),
                description: description ?? null,
                isSystem: false,
            });
        } catch (err) {
            if (isUniqueViolation(err, 'uq_roles_org_role_name')) {
                throw new ConflictException('A role with this name already exists in this organization');
            }
            throw err;
        }

        for (const permission of permissions) {
            await this.rolePermissionRepo.create({
                roleId: role.roleId,
                permissionId: permission.permissionId,
            });
        }

        return role;
    }

    async update(
        organizationId: string,
        roleId: string,
        patch: { roleName?: string; description?: string; permissionKeys?: string[] },
    ): Promise<Role> {
        const role = await this.roleRepo.findOne({ where: { roleId, organizationId } });
        if (!role) throw new NotFoundException('Role not found');
        if (role.isSystem) {
            // Shouldn't be reachable in practice - org-scoped roles are
            // always clones (isSystem: false) per createOrganization -
            // guarded anyway in case that invariant ever breaks.
            throw new BadRequestException('System role templates cannot be edited directly');
        }

        const updateFields: Partial<Role> = {};
        if (patch.roleName !== undefined) updateFields.roleName = patch.roleName.trim();
        if (patch.description !== undefined) updateFields.description = patch.description;

        if (Object.keys(updateFields).length > 0) {
            try {
                await this.roleRepo.updateBy({ roleId }, updateFields);
            } catch (err) {
                if (isUniqueViolation(err, 'uq_roles_org_role_name')) {
                    throw new ConflictException('A role with this name already exists in this organization');
                }
                throw err;
            }
        }

        if (patch.permissionKeys !== undefined) {
            const permissions = await this.resolvePermissions(patch.permissionKeys);
            await this.rolePermissionRepo.deleteBy({ roleId });
            for (const permission of permissions) {
                await this.rolePermissionRepo.create({ roleId, permissionId: permission.permissionId });
            }
        }

        return this.roleRepo.findOne({ where: { roleId } }) as Promise<Role>;
    }

    async delete(organizationId: string, roleId: string): Promise<void> {
        const role = await this.roleRepo.findOne({ where: { roleId, organizationId } });
        if (!role) throw new NotFoundException('Role not found');
        if (role.isSystem) {
            throw new BadRequestException('System role templates cannot be deleted');
        }

        await this.roleRepo.delete(roleId);
    }

    private async resolvePermissions(permissionKeys: string[]) {
        const unique = [...new Set(permissionKeys)];
        const permissions = await this.permissionRepo.findAll({
            where: { key: In(unique) },
        } as any);

        const found = new Set(permissions.map((p) => p.key));
        const missing = unique.filter((key) => !found.has(key));
        if (missing.length > 0) {
            throw new BadRequestException(`Unknown permission key(s): ${missing.join(', ')}`);
        }
        return permissions;
    }
}