import { RoomsService } from './room-service';
import { Direction } from '../dto/move-dto';

describe('RoomsService', () => {
    let service: RoomsService;

    beforeEach(() => {
        // The constructor kicks off a real setInterval (the idle sweep).
        // Faking timers here means that interval never actually fires on a
        // real clock during our tests, and setTimeout/setInterval calls made
        // *inside* the service become things we can control (more on this
        // in Stage 3 - not used yet in this file, but it's cheap insurance).
        jest.useFakeTimers();
        service = new RoomsService();
    });

    afterEach(() => {
        // Belt-and-suspenders: explicitly stop the sweep interval too.
        service.onModuleDestroy();
        jest.useRealTimers();
    });

    describe('join', () => {
        it('creates a new user when the room is empty', () => {
            const result = service.join('room1', 'alice', 'user-1', 'socket-1');

            expect(result.reconnected).toBe(false);
            expect(result.user.username).toBe('alice');
            expect(result.user.userId).toBe('user-1');
            expect(result.user.socketId).toBe('socket-1');
            expect(result.user.isIdle).toBe(false);
            expect(typeof result.user.x).toBe('number');
            expect(typeof result.user.y).toBe('number');
        });

        it('adds the user to the room so getRoomUsers can find them', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');

            const users = service.getRoomUsers('room1');
            expect(users).toHaveLength(1);
            expect(users[0].userId).toBe('user-1');
        });

        it('allows multiple different users into the same room', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');
            service.join('room1', 'bob', 'user-2', 'socket-2');

            const users = service.getRoomUsers('room1');
            expect(users).toHaveLength(2);
        });

        it('throws "Room is full" once maxUsers (10) is reached', () => {
            for (let i = 0; i < 10; i++) {
                service.join('room1', `user${i}`, `user-${i}`, `socket-${i}`);
            }

            expect(() =>
                service.join('room1', 'overflow', 'user-overflow', 'socket-overflow'),
            ).toThrow('Room is full');
        });
    });

    describe('leave', () => {
        it('returns null when the socketId is unknown', () => {
            const result = service.leave('nonexistent-socket');
            expect(result).toBeNull();
        });

        it('returns the userId/roomId for a known socket', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');

            const result = service.leave('socket-1');

            expect(result).toEqual({ userId: 'user-1', roomId: 'room1' });
        });

        it('does not remove the user from the room immediately (grace period)', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');
            service.leave('socket-1');

            // Grace period (15s) hasn't elapsed yet - user should still be present.
            const users = service.getRoomUsers('room1');
            expect(users).toHaveLength(1);
        });

        it('removes the user and emits "user-timed-out" once the grace period elapses', () => {
            // spyOn wraps the *real* emit method - it still runs normally, but Jest
            // also records every call (arguments, how many times, etc.) so we can
            // assert on it afterwards.
            const emitSpy = jest.spyOn(service, 'emit');

            service.join('room1', 'alice', 'user-1', 'socket-1');
            service.leave('socket-1');

            // Nothing has actually waited 15 real seconds. This tells the fake
            // clock "pretend 15000ms have passed", which synchronously fires any
            // fake setTimeout/setInterval callbacks scheduled to run in that window.
            jest.advanceTimersByTime(15_000);

            expect(service.getRoomUsers('room1')).toHaveLength(0);
            expect(emitSpy).toHaveBeenCalledWith('user-timed-out', {
                userId: 'user-1',
                roomId: 'room1',
            });
        });

        it('deletes the room entirely once its last user times out', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');
            service.leave('socket-1');

            jest.advanceTimersByTime(15_000);

            expect(service.roomExists('room1')).toBe(false);
        });

        it('does NOT remove the user if they reconnect before the grace period elapses', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');
            service.leave('socket-1');

            // Advance partway through the grace period, then reconnect.
            jest.advanceTimersByTime(5_000);
            service.join('room1', 'alice', 'user-1', 'socket-2');

            // Now let the *original* 15s window fully elapse. If the pending
            // timer wasn't cancelled on reconnect, this would incorrectly wipe
            // the user out from under the new connection.
            jest.advanceTimersByTime(15_000);

            const users = service.getRoomUsers('room1');
            expect(users).toHaveLength(1);
            expect(users[0].socketId).toBe('socket-2');
        });
    });

    describe('reconnect via join', () => {
        it('preserves x/y and returns reconnected: true when rejoining within the grace period', () => {
            const { user: original } = service.join('room1', 'alice', 'user-1', 'socket-1');
            service.leave('socket-1');

            const result = service.join('room1', 'alice', 'user-1', 'socket-2');

            expect(result.reconnected).toBe(true);
            expect(result.user.x).toBe(original.x);
            expect(result.user.y).toBe(original.y);
            expect(result.user.socketId).toBe('socket-2');

            // Still exactly one user - not a duplicate entry.
            expect(service.getRoomUsers('room1')).toHaveLength(1);
        });

        it('creates a fresh user if rejoining after the grace period has expired', () => {
            const { user: original } = service.join('room1', 'alice', 'user-1', 'socket-1');
            service.leave('socket-1');

            jest.advanceTimersByTime(15_000); // grace period fully elapses, user is gone

            const result = service.join('room1', 'alice', 'user-1', 'socket-2');

            expect(result.reconnected).toBe(false);
            expect(service.getRoomUsers('room1')).toHaveLength(1);
            // A fresh spawn - not guaranteed to differ from the original position,
            // so we only assert on what join() actually promises: a clean, non-
            // reconnect join.
            expect(result.user.userId).toBe('user-1');
        });

        it('is not blocked by a full room when reconnecting to their own slot', () => {
            // Fill the room to maxUsers (10), including user-0 who we'll disconnect
            // and then reconnect.
            for (let i = 0; i < 10; i++) {
                service.join('room1', `user${i}`, `user-${i}`, `socket-${i}`);
            }
            service.leave('socket-0');

            // user-0 reconnects while the room is still nominally "full" of
            // 10 slots (their own slot just hasn't been vacated yet).
            const result = service.join('room1', 'user0', 'user-0', 'socket-0-new');

            expect(result.reconnected).toBe(true);
            expect(service.getRoomUsers('room1')).toHaveLength(10);
        });

        it('force-removes stale membership when a user joins a NEW room while still "in" a previous one', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');
            // No leave() called - alice jumps straight into room2 (e.g. the client
            // reconnected and the server picked a different room for them).
            const result = service.join('room2', 'alice', 'user-1', 'socket-2');

            expect(result.reconnected).toBe(false);
            expect(service.getRoomUsers('room1')).toHaveLength(0);
            expect(service.getRoomUsers('room2')).toHaveLength(1);
            // room1 should have been cleaned up entirely since it's now empty.
            expect(service.roomExists('room1')).toBe(false);
        });
    });

    describe('idle sweep & idle-kick', () => {
        // Note: runIdleSweep() is never called directly in these tests - it's
        // already running on its own 15s setInterval from the constructor.
        // We just advance fake time and let the service's own scheduling fire it,
        // same as it would in production. This only works because Jest's
        // "modern" fake timers (the default) also fake Date.now(), which is what
        // runIdleSweep() uses to compute how long a user has been idle.

        it('marks a user idle after 60s of inactivity and starts the kick countdown', () => {
            const emitSpy = jest.spyOn(service, 'emit');
            service.join('room1', 'alice', 'user-1', 'socket-1');

            // 5 sweep ticks (15s each) = 75s of inactivity, safely past the 60s
            // threshold and past a sweep tick that would catch it.
            jest.advanceTimersByTime(75_000);

            const user = service.getUser('room1', 'user-1');
            expect(user?.isIdle).toBe(true);
            expect(emitSpy).toHaveBeenCalledWith('user-idle-changed', {
                roomId: 'room1',
                userId: 'user-1',
                isIdle: true,
            });
        });

        it('does not mark a user idle if they are touched before the 60s threshold', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');

            jest.advanceTimersByTime(45_000); // 3 sweep ticks, still under 60s
            service.touchLastSeen('socket-1');
            jest.advanceTimersByTime(45_000); // 45s since the touch - still under 60s

            const user = service.getUser('room1', 'user-1');
            expect(user?.isIdle).toBe(false);
        });

        it('touchLastSeen flips an idle user back to active and cancels the pending kick', () => {
            const emitSpy = jest.spyOn(service, 'emit');
            service.join('room1', 'alice', 'user-1', 'socket-1');

            jest.advanceTimersByTime(75_000); // user goes idle
            expect(service.getUser('room1', 'user-1')?.isIdle).toBe(true);

            service.touchLastSeen('socket-1');
            expect(service.getUser('room1', 'user-1')?.isIdle).toBe(false);
            expect(emitSpy).toHaveBeenCalledWith('user-idle-changed', {
                roomId: 'room1',
                userId: 'user-1',
                isIdle: false,
            });

            // If the pending kick timer wasn't cancelled by touchLastSeen, it
            // would still fire ~30s after the original idle-flag moment - which
            // falls well within this next window.
            emitSpy.mockClear();
            jest.advanceTimersByTime(30_000);
            expect(emitSpy).not.toHaveBeenCalledWith(
                'user-idle-kicked',
                expect.anything(),
            );
        });

        it('emits "user-idle-kicked" 30s after going idle if still idle on the same socket', () => {
            const emitSpy = jest.spyOn(service, 'emit');
            service.join('room1', 'alice', 'user-1', 'socket-1');

            jest.advanceTimersByTime(75_000); // goes idle, 30s kick countdown starts
            jest.advanceTimersByTime(30_000); // countdown elapses, still idle

            expect(emitSpy).toHaveBeenCalledWith('user-idle-kicked', {
                roomId: 'room1',
                userId: 'user-1',
                socketId: 'socket-1',
            });
        });

        it('does NOT kick if the user disconnects and reconnects on a new socketId before the kick timer fires', () => {
            const emitSpy = jest.spyOn(service, 'emit');
            service.join('room1', 'alice', 'user-1', 'socket-1');

            jest.advanceTimersByTime(75_000); // idle flagged, 30s kick countdown starts

            service.leave('socket-1'); // connection drops
            jest.advanceTimersByTime(5_000);
            service.join('room1', 'alice', 'user-1', 'socket-2'); // reconnects, new socket

            emitSpy.mockClear();
            jest.advanceTimersByTime(30_000); // original 30s kick window fully elapses

            // The kick timer's closure still has "socket-1" baked in from when it
            // was created - by the time it fires, user.socketId is "socket-2",
            // so the equality guard inside startIdleDisconnectTimer blocks the kick.
            expect(emitSpy).not.toHaveBeenCalledWith(
                'user-idle-kicked',
                expect.anything(),
            );
        });
    });

    describe('move', () => {
        it('returns null when the socketId is unknown', () => {
            const result = service.move('nonexistent-socket', Direction.UP);
            expect(result).toBeNull();
        });

        it('moves one unit in the requested direction, changing only that axis', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');

            // Spawn positions can have decimals (e.g. 42.37), and clamp() floors
            // BOTH axes on every call - not just the one being moved. So the very
            // first move() call floors x and y together, even though we only
            // intended to move right. Doing one "settling" move first means every
            // comparison after this point is between two already-floored integers,
            // which is what actually isolates "only one axis changes" cleanly.
            service.move('socket-1', Direction.RIGHT);
            // Copy the values out with a spread - getUser() returns a live
            // reference into the service's internal Map, so without this copy,
            // `settled` would keep changing every time move() runs again below.
            const settled = { ...service.getUser('room1', 'user-1')! };

            const right = service.move('socket-1', Direction.RIGHT)!;
            expect(right.x).toBe(settled.x + 1);
            expect(right.y).toBe(settled.y);

            const down = service.move('socket-1', Direction.DOWN)!;
            expect(down.y).toBe(right.y + 1);
            expect(down.x).toBe(right.x);

            const left = service.move('socket-1', Direction.LEFT)!;
            expect(left.x).toBe(down.x - 1);
            expect(left.y).toBe(down.y);

            const up = service.move('socket-1', Direction.UP)!;
            expect(up.y).toBe(left.y - 1);
            expect(up.x).toBe(left.x);
        });

        it('clamps at the upper map boundary (500) instead of moving past it', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');

            // Spawn x is at most 100, so 700 RIGHT moves guarantees we've hit and
            // stayed at the ceiling well before running out of moves.
            let result;
            for (let i = 0; i < 700; i++) {
                result = service.move('socket-1', Direction.RIGHT);
            }

            expect(result!.x).toBe(500);
        });

        it('clamps at the lower map boundary (0) instead of moving past it', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');

            let result;
            for (let i = 0; i < 700; i++) {
                result = service.move('socket-1', Direction.LEFT);
            }

            expect(result!.x).toBe(0);
        });

        it('returns the moving userId and roomId alongside the new position', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');

            const result = service.move('socket-1', Direction.UP);

            expect(result).toEqual({
                userId: 'user-1',
                roomId: 'room1',
                x: expect.any(Number),
                y: expect.any(Number),
            });
        });
    });

    describe('known gap: socketIndex leak on forceRemove-based room switch', () => {
        // This test documents current behavior rather than "correct" behavior.
        // forceRemove() (used by join()'s stale-room cleanup, and by
        // leaveRoom()) never deletes the caller's OLD socketId from
        // socketIndex - only leave()'s own grace-period path does that. If a
        // user switches rooms on a brand-new socketId (rather than reusing the
        // same one), the old entry is orphaned forever: harmless functionally
        // (move()/touchLastSeen() on it just return null/no-op, since the room
        // and user are gone) but a genuine, unbounded memory leak for a
        // long-running server. Worth a fix (delete the old socketId in
        // forceRemove, or accept a socketId param there) rather than a test
        // workaround - flagging it here so it isn't silently relied upon.
        it('leaves the old socketId resolvable in socketIndex after a room-switch reconnect', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');
            service.join('room2', 'alice', 'user-1', 'socket-2');

            expect(service.roomExists('room1')).toBe(false);
            // If this leak gets fixed, this assertion should flip to `toBeUndefined()`.
            expect(service.getRoomIdBySocket('socket-1')).toEqual({
                userId: 'user-1',
                roomId: 'room1',
            });
        });
    });

    describe('known bug: spawn positions are not integers', () => {
        // These are RED right now against the current source - that's
        // intentional. randomCoord()/spawnPosition() round to 2 decimal places
        // (e.g. 42.37), but move()'s clamp() floors to a whole number on every
        // call. That mismatch means a user's x/y silently changes "shape"
        // (fractional -> integer) the moment they make their first move, even
        // though nothing about the User type signals that. Fix is in
        // room-service.ts, not here - once applied, these should go green.

        it('spawns a brand-new user at whole-number x/y coordinates', () => {
            const { user } = service.join('room1', 'alice', 'user-1', 'socket-1');

            expect(Number.isInteger(user.x)).toBe(true);
            expect(Number.isInteger(user.y)).toBe(true);
        });

        it('spawns a user near an existing player at whole-number x/y coordinates too', () => {
            service.join('room1', 'alice', 'user-1', 'socket-1');
            const { user } = service.join('room1', 'bob', 'user-2', 'socket-2');

            expect(Number.isInteger(user.x)).toBe(true);
            expect(Number.isInteger(user.y)).toBe(true);
        });
    });
});