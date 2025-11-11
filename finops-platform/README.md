# FinOps Platform - Pod-Centric Financial Management

A comprehensive financial management platform designed for multi-project environments with pod-centric architecture.

## Features

### Core Functionality
- **Pod-Based Management**: Organize financial operations by project/business units (Pods)
- **Company-Level Oversight**: Unified view across all pods for Program Managers
- **Real-Time Budget Tracking**: Monitor spends against allocated budgets
- **Automated Alerts**: Get notified about upcoming payments and budget thresholds
- **Vendor Management**: Centralized vendor database with cost allocation
- **Invoice Tracking**: Complete lifecycle management with document storage
- **Payment Management**: Track payment statuses with proof documentation
- **Anomaly Detection**: Compare vendor spending over time to identify irregularities

### Dashboard & Analytics
- Company Dashboard with aggregated metrics
- Pod-specific dashboards with detailed insights
- Budget utilization charts and trends
- Category-wise spending analysis
- Vendor comparison and spending patterns
- Alert management and prioritization

## Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** for data storage (easily upgradeable to PostgreSQL)
- **JWT** for authentication
- **Multer** for file uploads
- **Bcrypt** for password hashing

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **Recharts** for data visualization
- **Heroicons** for UI icons

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finops-platform
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set Up Environment Variables**
   ```bash
   # Backend environment
   cd backend
   cp .env.example .env
   # Edit .env with your configuration

   # Frontend environment
   cd ../frontend
   echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
   ```

5. **Initialize Database**
   ```bash
   cd backend
   npm run init-db
   ```

6. **Start Development Servers**

   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

7. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Login
- **Email**: admin@finops.com
- **Password**: admin123

## Project Structure

```
finops-platform/
├── backend/                 # Node.js API server
│   ├── config/             # Database configuration
│   ├── routes/             # API route handlers
│   ├── scripts/            # Database initialization
│   ├── uploads/            # File upload storage
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── utils/          # Utility functions
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Companies
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company
- `GET /api/companies/:id/dashboard` - Company dashboard data

### Pods
- `GET /api/pods` - List all pods
- `POST /api/pods` - Create pod
- `GET /api/pods/:id` - Get pod details
- `PUT /api/pods/:id` - Update pod
- `GET /api/pods/:id/dashboard` - Pod dashboard data

### Vendors
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create vendor
- `GET /api/vendors/:id` - Get vendor details
- `PUT /api/vendors/:id` - Update vendor
- `GET /api/vendors/:id/comparison` - Vendor spending comparison

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice (with file upload)
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment (with file upload)
- `GET /api/payments/:id` - Get payment details
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Alerts
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create manual alert
- `PUT /api/alerts/:id/status` - Update alert status
- `POST /api/alerts/generate-system-alerts` - Generate automated alerts

## Database Schema

The application uses SQLite with the following main entities:
- **Companies**: Top-level organization
- **Pods**: Project/business units with budgets
- **Vendors**: External suppliers (exclusive or shared)
- **Invoices**: Billing records with status tracking
- **Payments**: Payment confirmations with documentation
- **Alerts**: Automated and manual notifications
- **Budget Categories**: Category-wise budget allocation

## Development

### Adding New Features

1. **Backend**: Add new routes in `/backend/routes/` and update the database schema if needed
2. **Frontend**: Create new components in `/frontend/src/components/` and pages in `/frontend/src/pages/`
3. **API Integration**: Add service functions in `/frontend/src/services/api.js`

### Database Changes

1. Update `/backend/config/database.js` with schema changes
2. Run the migration scripts as needed
3. Update API routes to handle new fields

### Styling

- Use Tailwind CSS classes for styling
- Follow the existing component patterns
- Maintain responsive design principles

## Production Deployment

### Backend
```bash
# Build for production
cd backend
npm install --production

# Set production environment variables
export NODE_ENV=production

# Start server
npm start
```

### Frontend
```bash
# Build React app
cd frontend
npm run build

# Serve static files using nginx or similar
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.