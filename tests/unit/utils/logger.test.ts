import winston from 'winston';
import { logger } from '../../../src/utils/logger';

describe('Logger Utility', () => {
    let mockTransports: winston.transport;

    beforeEach(() => {
        // Create a mock transport (replaces real transports like File/Console)
        // This ensures logs don't actually go to disk or stdout during tests
        mockTransports = new winston.transports.Console();
        jest.spyOn(mockTransports, 'log').mockImplementation((info, next) => {
            // Call next to simulate Winston's logging pipeline
            next?.();
        });

        // Clear all transports and add the mock transport
        logger.clear();
        logger.add(mockTransports);
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        // Restore all mocks and reset logger state between tests
        jest.restoreAllMocks();
        jest.resetModules();
        logger.clear();
    });

    test('Logs info message', () => {
        // Act: log an info message
        logger.info('This is an info message');

        // Assert: verify the mock transport's log method was called with correct level and message
        expect(mockTransports.log).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                message: 'This is an info message'
            }),
            expect.any(Function) // Winston always passes a callback as second argument
        );
    });

    test('Logs error message', () => {
        // Act: log an error message
        logger.error('This is an error message');

        // Assert: verify the mock transport's log method was called with correct level and message
        expect(mockTransports.log).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'error',
                message: 'This is an error message'
            }),
            expect.any(Function), // Winston always passes a callback as second argument
        );
    });

    test('Logs error with stack trace', () => {
        // Arrange: create an error object
        const err = new Error('Something went wrong');

        // Act: log the error object directly
        logger.error(err);

        // Assert: Winston should format the error message and include the stack trace
        expect(mockTransports.log).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'error',
                message: 'Something went wrong',
                stack: expect.any(String), // Stack trace should be a string
            }),
            expect.any(Function), // Winston always passes a callback as second argument
        );
    });

    test('Include timestamp and default metadata', () => { 
        // Act: log a warning message
        logger.warn('Check metadata');

        // Assert: Winston formats should have added timestamp + service meta
        expect(mockTransports.log).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'warn',
                message: 'Check metadata',
                service: 'order-management', // from defaultMeta
                timestamp: expect.any(String), // timestamp should be a string
            }),
            expect.any(Function),
        );
    });

    test('Adds console transport in non-production', () => {
        // Simulate development environment
        process.env.NODE_ENV = 'development';

        // Re-require logger to re-run the NODE_ENV check
        const devLogger = require('../../../src/utils/logger').logger;

        // Assert: logger should have a Console transport
        const hasConsoleTransport = devLogger.transports.find(
            (t: winston.transport) => t instanceof winston.transports.Console
        );
        expect(hasConsoleTransport).toBeDefined();
    });

    test('Does not add console transport in production', () => { 
        // Simulate production environment
        process.env.NODE_ENV = 'production';
        
        // Re-require logger to re-run the NODE_ENV check
        // jest.resetModules();
        const prodLogger = require('../../../src/utils/logger').logger;

        // Assert: logger should NOT have a Console transport
        const hasConsoleTransport = prodLogger.transports.find(
            (t: winston.transport) => t instanceof winston.transports.Console
        );
        expect(hasConsoleTransport).toBeUndefined();
    });
});