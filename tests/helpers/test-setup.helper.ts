import { Request, Response } from 'express';

export const createMockRequest = (overrides: Partial<Request> = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides
});

export const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const mockResponseMethods = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
};

// Test case builders for consistent test patterns
export const testCase = {
  success: (description: string, testFn: () => Promise<void>) => 
    it(description, testFn),
  
  validationError: (description: string, testFn: () => Promise<void>) => 
    it(description, testFn),
  
  businessError: (description: string, testFn: () => Promise<void>) => 
    it(description, testFn),
  
  technicalError: (description: string, testFn: () => Promise<void>) => 
    it(description, testFn)
};