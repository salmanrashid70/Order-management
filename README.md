# Order Management Service

## Overview

A Node.js Order service feature for managing orders with TypeScript, Express, and MongoDB.

## Project Structure

```
order-feature/
├── src/
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── events/           # Event handlers
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── middleware/       # Express middleware
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
└── package.json
```

## API Documentation

### Endpoints

| Method | Path              | Description      | Status |
| ------ | ----------------- | ---------------- | ------ |
| GET    | `/api/orders`     | List all orders  | ✅     |
| GET    | `/api/orders/:id` | Get order by ID  | ✅     |
| POST   | `/api/orders`     | Create new order | ✅     |
| PUT    | `/api/orders/:id` | Update order     | ✅     |
| DELETE | `/api/orders/:id` | Delete order     | ✅     |

### Request/Response Examples

#### Create Order

```json
POST /api/orders
{
  "customerId": "123",
  "items": [
    {
      "productId": "456",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Boston",
    "state": "MA",
    "zip": "02108"
  }
}
```

## Test Results

### Unit Tests

| Component   | Total | Passed | Failed | Coverage |
| ----------- | ----- | ------ | ------ | -------- |
| Logger      | 6     | 5      | 1      | 100%     |
| Database    | -     | -      | -      | 0%       |
| Controllers | -     | -      | -      | 0%       |
| Services    | -     | -      | -      | 0%       |

### Integration Tests

| Suite               | Status | Coverage |
| ------------------- | ------ | -------- |
| API Endpoints       | -      | 0%       |
| Database Operations | -      | 0%       |

### E2E Tests

| Flow           | Status | Coverage |
| -------------- | ------ | -------- |
| Order Creation | -      | 0%       |
| Order Updates  | -      | 0%       |

## Setup & Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test
```

## Environment Variables

| Variable    | Description       | Default                          |
| ----------- | ----------------- | -------------------------------- |
| PORT        | Server port       | 3000                             |
| MONGODB_URI | connection string | mongodb://localhost:27017/orders |
| NODE_ENV    | Environment       | development                      |

## Scripts

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `npm run dev`           | Start development server |
| `npm run build`         | Build for production     |
| `npm start`             | Start production server  |
| `npm test`              | Run all tests            |
| `npm run test:unit`     | Run unit tests           |
| `npm run test:coverage` | Generate coverage report |

## Coverage Requirements

| Metric     | Target | Current | Status |
| ---------- | ------ | ------- | ------ |
| Statements | 80%    | 1.1%    | ❌     |
| Branches   | 80%    | 1.63%   | ❌     |
| Functions  | 80%    | 0%      | ❌     |
| Lines      | 80%    | 1.12%   | ❌     |

## TODO

- [ ] Implement remaining unit tests
- [ ] Set up integration test suite
- [ ] Configure E2E testing
- [ ] Add API documentation
- [ ] Improve error handling
- [ ] Add authentication/authorization
- [ ] Set up CI/CD pipeline
