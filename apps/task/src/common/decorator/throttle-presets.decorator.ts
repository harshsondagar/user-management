
import { Throttle } from '@nestjs/throttler';

export const StrictThrottle = () => Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } });
export const AuthThrottle = () => Throttle({ default: { limit: 5, ttl: 60000 } });
export const NormalThrottle = () => Throttle({ default: { limit: 60, ttl: 60000 } });