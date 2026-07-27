export const validRegisterDto = {
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'Str0ng!Passw0rd',
};

export const missingEmailDto = {
    firstName: 'Test',
    lastName: 'User',
    password: 'Str0ng!Passw0rd',
};

export const invalidEmailDto = {
    ...validRegisterDto,
    email: 'not-an-email',
};

export const weakPasswordDto = {
    ...validRegisterDto,
    email: 'weakpass@example.com',
    password: 'abc',
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