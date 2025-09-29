export const mockCreateOrderSchema = {
  parse: jest.fn()
};

export const mockUpdateOrderStatusSchema = {
  parse: jest.fn()
};

export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

export const mockOrderService = {
  createOrder: jest.fn(),
  getOrderById: jest.fn(),
  getOrdersByUserId: jest.fn(),
  updateOrderStatus: jest.fn(),
  processPayment: jest.fn(),
  cancelOrder: jest.fn()
};

// Reset all mocks
export const resetAllMocks = () => {
  mockCreateOrderSchema.parse.mockClear();
  mockUpdateOrderStatusSchema.parse.mockClear();
  mockLogger.info.mockClear();
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.debug.mockClear();
  mockOrderService.createOrder.mockClear();
  mockOrderService.getOrderById.mockClear();
  mockOrderService.getOrdersByUserId.mockClear();
  mockOrderService.updateOrderStatus.mockClear();
  mockOrderService.processPayment.mockClear();
  mockOrderService.cancelOrder.mockClear();
};