import { randomUUID } from 'crypto';

export const validRegisterDto = {
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'Str0ng!Passw0rd',
};

export const minimalValidRegisterDto = {
    email: 'minimal@example.com',
    password: 'Str0ng!Passw0rd',
};

export const validLoginDto = {
    email: validRegisterDto.email,
    password: validRegisterDto.password,
};

export const wrongPasswordLoginDto = {
    email: validRegisterDto.email,
    password: 'WrongPassword1!',
};

export const nonExistentEmailLoginDto = {
    email: 'doesnotexist@example.com',
    password: 'Str0ng!Passw0rd',
};

export const shortPasswordLoginDto = {
    email: validRegisterDto.email,
    password: '1234567',
};

export interface RegisterDtoShape {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

export const missingEmailDto = {
    firstName: 'Test',
    lastName: 'User',
    password: 'Str0ng!Passw0rd',
};

export const invalidEmailDto = makeRegisterDto({ email: 'not-an-email' });
export const weakPasswordDto = makeRegisterDto({ password: '1' });
export const tooShortPasswordDto = makeRegisterDto({ password: 'Ab1!' }); // fails only length
export const noUppercasePasswordDto = makeRegisterDto({ password: 'str0ng!password' });
export const noLowercasePasswordDto = makeRegisterDto({ password: 'STR0NG!PASSWORD' });
export const noNumberPasswordDto = makeRegisterDto({ password: 'Strong!Password' });
export const noSpecialCharPasswordDto = makeRegisterDto({ password: 'Str0ngPassword' });

export function makeRegisterDto(overrides: Partial<RegisterDtoShape> = {}): RegisterDtoShape {
    const base = {
        email: `test.${randomUUID()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        password: 'Str0ng!Passw0rd',
    };
    return { ...base, ...overrides };
}


export const validResetPasswordDto = {
    password: validRegisterDto.password,
    newPassword: 'NewStr0ng!Passw0rd',
};

export const wrongCurrentPasswordDto = {
    password: 'WrongCurrent1!',
    newPassword: 'NewStr0ng!Passw0rd',
};

export const weakNewPasswordDto = {
    password: validRegisterDto.password,
    new_password: '1',
};