export const mockMailService = {
    sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeMail: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangeMail: jest.fn().mockResolvedValue(undefined),
};