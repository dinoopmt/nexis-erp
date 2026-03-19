# Server Folder Structure - Industrial Standard

## 📁 Organized Structure

```
server/
├── config/                         # Configuration files
│   ├── constants.js               # App constants & defaults
│   ├── database.js                # MongoDB connection config
│   ├── environment.js             # Environment variables
│   ├── errorHandler.js            # Error handling & middleware
│   └── logger.js                  # Logging system
├── controllers/                    # Request handlers
│   ├── accountGroupController.js
│   ├── activityLogController.js
│   ├── authController.js
│   ├── chartOfAccountsController.js
│   └── ...                         # 25 controller modules
├── routes/                         # API route definitions
│   ├── accountGroupRoutes.js
│   ├── activityLogRoutes.js
│   ├── Auth.js
│   ├── sales/                     # Sales module sub-routes
│   └── ...                         # Matching controller routes
├── modules/
│   ├── Models/                    # Database schemas (Mongoose)
│   ├── services/                  # Business logic layer
│   └── helpers/                   # Utility functions
├── middleware/                     # Express middleware
├── db/                            # Database connection
├── seeders/                        # Database seeders
│   ├── chartOfAccountsSeeder.js
│   ├── countryConfigSeeder.js
│   ├── hsnMasterSeeder.js
│   ├── sequenceSeeder.js
│   ├── taxMasterSeeder.js
│   ├── userSeed.js
│   └── README.md
├── scripts/                        # Utility scripts
│   ├── dropTaxMasterIndex.js
│   ├── hsnApiTests.js
│   ├── verifyChartOfAccounts.js
│   └── README.md
├── docs/                          # Documentation
│   ├── COUNTRY_CONFIG_SEEDER.md
│   └── SEEDER_README.md
├── .env                           # Environment variables (NOT in git)
├── server.js                      # Express app entry point
└── package.json                   # Dependencies
```

## 🎯 Industrial Best Practices Implemented

### 1. **Separation of Concerns**
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic (to be enhanced)
- **Models**: Define data schemas
- **Routes**: Define API endpoints

### 2. **Configuration Management**
- **environment.js**: Centralized environment variable handling
- **constants.js**: App-wide constants
- **database.js**: Database connection with pooling
- **errorHandler.js**: Error handling & validation
- **logger.js**: Structured logging system

### 3. **Performance Optimization**
- MongoDB connection pooling (min: 5, max: 10)
- Configurable cache TTL for different data types
- Rate limiting constants defined
- File upload size limits
- Pagination configuration

### 4. **Security**
- Environment variables centralized
- Error stack traces only in development
- JWT configuration
- CORS configuration
- Role-based access control constants

### 5. **Scalability**
- Modular folder structure
- Service layer for business logic extraction
- Helper utilities separation
- Seeds organized separately
- Script utilities in dedicated folder

### 6. **Developer Experience**
- Clear folder hierarchy
- Organized documentation in /docs
- Seeders in dedicated folder with README
- Utility scripts collected in /scripts
- Comprehensive logging system

## 📊 Module Organization

| Module | Purpose |
|--------|---------|
| `config/` | Configuration & constants |
| `controllers/` | Request/response handlers |
| `routes/` | API endpoint definitions |
| `Models/` | Database schemas |
| `services/` | Business logic (expand these) |
| `helpers/` | Utility functions |
| `middleware/` | Express middleware |
| `db/` | Database connection |
| `seeders/` | Database initialization |
| `scripts/` | One-off utility scripts |
| `docs/` | Project documentation |

## 🚀 NPM Scripts

**Run seeders:**
```bash
npm run seed:users          # Database seed users
npm run seed:accounts       # Seed chart of accounts
npm run seed:sequences      # Seed sequences
npm run seed:all            # Run all seeders
```

**Utilities:**
```bash
npm run verify:accounts     # Verify chart of accounts
npm run dev                 # Development server with watch
npm run start               # Production server
```

## 🔧 Configuration Files Added

### environment.js
- Loads and validates environment variables
- Provides type safety
- Centralized configuration access

### database.js
- Connection pooling configuration
- Connection event handlers
- Proper error handling

### logger.js
- Structured logging with timestamps
- Log level filtering
- Consistent message formatting

### errorHandler.js
- Global error handling middleware
- 404 handler
- Custom AppError class
- Async error wrapper

### Enhanced constants.js
- Added cache configuration
- Rate limiting constants
- File upload constraints
- API response formats
- Pagination defaults

## 📈 Performance Metrics

- **Database Pool**: 5-10 connections
- **Max Idle Time**: 45 seconds
- **Server Selection Timeout**: 5 seconds
- **Cache TTL**: 30 min - 1 day (configurable)
- **Max File Upload**: 50 MB
- **Rate Limit**: 100 requests/minute

## 🔄 Next Steps (To Enhance Further)

1. **Extract Business Logic**: Move logic from controllers to services
2. **Add Input Validation**: Create validation middleware
3. **Implement Caching**: Use Redis for cache layer
4. **Add Monitoring**: Integrate APM (Application Performance Monitoring)
5. **API Documentation**: Generate OpenAPI/Swagger docs
6. **Testing**: Add unit and integration tests
7. **CI/CD**: Setup automated testing and deployment
