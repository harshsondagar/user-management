export const validRegisterDto = {
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'Str0ng!Passw0rd',
};

// Missing required fields
export const missingEmailDto = {
    firstName: 'Test',
    lastName: 'User',
    password: 'Str0ng!Passw0rd',
};

// Invalid email format
export const invalidEmailDto = {
    ...validRegisterDto,
    email: 'not-an-email',
};

// Fails every password rule at once — no lowercase, no uppercase, no number, no special char, too short
export const weakPasswordDto = {
    ...validRegisterDto,
    email: 'weakpass@example.com',
    password: 'abc',
};

// Missing lowercase letter specifically
export const noLowercasePasswordDto = {
    ...validRegisterDto,
    email: 'nolower@example.com',
    password: 'STR0NG!PASSWORD',
};

// Missing special character specifically
export const noSpecialCharPasswordDto = {
    ...validRegisterDto,
    email: 'nospecial@example.com',
    password: 'Str0ngPassword',
};

// Optional fields omitted — should still pass, since firstName/lastName are @IsOptional()
export const minimalValidRegisterDto = {
    email: 'minimal@example.com',
    password: 'Str0ng!Passw0rd',
};

// For testing "email already exists" — same email as validRegisterDto, used in a second registration attempt
export const duplicateEmailDto = {
    ...validRegisterDto,
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
    password: '1234567', // 7 chars — fails @MinLength(8)
};