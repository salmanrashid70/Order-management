/**
 * Unit tests for Database utility class
 * --------------------------------------
 * These tests:
 * - Mock mongoose & logger to ensure fast, isolated execution
 * - Verify singleton behavior
 * - Validate connection/disconnection logic
 * - Ensure event handlers & graceful shutdown work as expected
 *
 * NOTE:
 *   Unit tests should never connect to a real MongoDB instance.
 *   Use integration tests for that purpose.
 */
import mongoose, { mongo } from "mongoose";
import { Database } from "../../../src/utils/database";
import { logger } from "../../../src/utils/logger";

// ---------------------------
// Mock the logger module so we don't use the real implementation
// Instead, we replace info, warn, and error with Jest mock functions
// ---------------------------
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------
// Mock mongoose module
// ---------------------------
// Instead of connecting to a real MongoDB, we create a fake version
// It tracks event listeners (via `on`) and allows us to trigger events manually (via `emit`)
jest.mock('mongoose', () => {
    const eventHandlers: Record<string, Function[]> = {}; // store event handlers by event type
    return {
        connect: jest.fn(),      // mock connect() method
        disconnect: jest.fn(),   // mock disconnect() method
        connection: {
            on: jest.fn((event: string, handler: Function) => {
                // Register an event handler for a specific event (like 'error', 'disconnected')
                if (!eventHandlers[event]) {
                    eventHandlers[event] = [];
                }
                eventHandlers[event].push(handler);
            }),
            emit: (event: string, ...args: any[]) => {
                // Manually trigger all handlers for an event
                if (eventHandlers[event]) {
                    eventHandlers[event].forEach(handler => handler(...args));
                }
            }
        }
    }
});

describe('Database Utility (Unit Tests)', () => {
    let db: Database;

    beforeEach(() => {
        // Reset the Database singleton to get a fresh instance for each test
        Database.resetInstance();
        db = Database.getInstance();

        // Reset mocked methods so call counts and return values start fresh each test
        (mongoose.connect as jest.Mock).mockReset();
        (mongoose.disconnect as jest.Mock).mockReset();
        (logger.info as jest.Mock).mockClear();
        (logger.error as jest.Mock).mockClear();
        (logger.warn as jest.Mock).mockClear();
    });

    afterEach(() => {
        // Clears all mocks to ensure no test contaminates another
        jest.clearAllMocks();
    });

    // ---------------------------
    // Singleton tests
    // ---------------------------
    it('should be a singleton', () => {
        // Getting a new instance should return the same object
        const anotherDb = Database.getInstance();
        expect(db).toBe(anotherDb);
    });

    // ---------------------------
    // Connection tests
    // ---------------------------
    it('uses MONGODB_URI when provided', async () => {
        // Save old env var and set a temporary one
        const uri = 'mongodb://localhost:27017/testdb';
        const old = process.env.MONGODB_URI;
        process.env.MONGODB_URI = uri;

        // Simulate a successful mongoose.connect()
        (mongoose.connect as jest.Mock).mockResolvedValueOnce(undefined);
        await db.connect();

        // Ensure connect() was called with the custom URI
        expect(mongoose.connect).toHaveBeenCalledWith(uri, expect.any(Object));

        // Restore old env var
        process.env.MONGODB_URI = old;
    });

    it('should not reconnect if already connected', async () => { 
        // First connect succeeds
        (mongoose.connect as jest.Mock).mockResolvedValueOnce(undefined);

        await db.connect(); // First call connects
        await db.connect(); // Second call should be ignored

        // Ensure connect() was only called once
        expect(mongoose.connect).toHaveBeenCalledTimes(1);

        // Ensure log indicates skipping reconnection
        expect(logger.info).toHaveBeenCalledWith('Database already connected');
    });

    it('should handle connection failure', async () => {
        const error = new Error('Connection failed');
        // Simulate mongoose.connect() throwing an error
        (mongoose.connect as jest.Mock).mockRejectedValueOnce(error);

        // Expect db.connect() to throw and log the error
        await expect(db.connect()).rejects.toThrow(error);
        expect(logger.error).toHaveBeenCalledWith('Failed to connect to MongoDB:', error);

        // Ensure internal state is updated
        expect(db.getIsConnected()).toBe(false);
    });

    // ---------------------------
    // Disconnection tests
    // ---------------------------
    it('should disconnect from the database', async () => {
        // First simulate a successful connection
        (mongoose.connect as jest.Mock).mockResolvedValueOnce(undefined);
        // Then simulate a successful disconnect
        (mongoose.disconnect as jest.Mock).mockResolvedValueOnce(undefined);

        await db.connect();
        await db.disconnect();

        // Ensure disconnect() was actually called
        expect(mongoose.disconnect).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('Disconnected from MongoDB database');

        // Ensure internal state was updated
        expect(db.getIsConnected()).toBe(false);
    });

    it('should ignore disconnect when already disconnected', async () => {
        // Calling disconnect without being connected should do nothing
        await db.disconnect();

        // Verify mongoose.disconnect() was never called
        expect(mongoose.disconnect).not.toHaveBeenCalled();
    });

    // ---------------------------
    // Event handling tests
    // ---------------------------
    it('should handle MongoDB error event', async () => { 
        await db.connect();

        // Simulate mongoose connection emitting an error
        (mongoose as any).connection.emit('error', new Error('Simulated error'));

        // Ensure the logger recorded the error and internal state is false
        expect(logger.error).toHaveBeenCalledWith(
            'MongoDB connection error:',
            expect.any(Error)
        );
        expect(db.getIsConnected()).toBe(false);
    });

    it('should handle MongoDB disconnected event', async () => {
        await db.connect();

        // Simulate mongoose connection being disconnected
        (mongoose as any).connection.emit('disconnected');

        // Ensure warning log and internal state updated
        expect(logger.warn).toHaveBeenCalledWith('MongoDB disconnected');
        expect(db.getIsConnected()).toBe(false);
    });

    // ---------------------------
    // Signal handling test
    // ---------------------------
    it('should handle SIGINT for graceful shutdown', async () => {
        // Simulate successful connection
        (mongoose.connect as jest.Mock).mockResolvedValueOnce(undefined);

        // Mock process.exit so the test doesn't really exit
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });

        // Spy on db.disconnect to verify it's called
        const mockDisconnect = jest.spyOn(db, 'disconnect').mockResolvedValue();

        await db.connect();

        // Grab the SIGINT handler that Database registered
        const sigintHandler = (process.listeners('SIGINT') as any[]).pop();

        try {
            // Trigger SIGINT handler
            await sigintHandler();
        } catch (e) {
            // Expected because process.exit was mocked
        }

        // Ensure disconnect() and process.exit(0) were called
        expect(mockDisconnect).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(0);

        // Restore process.exit so it behaves normally for other tests
        mockExit.mockRestore();
    });
});
