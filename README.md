# 🚀 FinOps Tracker - Cloud Financial Operations Management Platform

![FinOps Tracker](https://img.shields.io/badge/FinOps-Tracker-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.3-06B6D4?style=for-the-badge&logo=tailwind-css)
![SQLite](https://img.shields.io/badge/SQLite-3.0-07405E?style=for-the-badge&logo=sqlite)

A comprehensive, modern web application for managing cloud financial operations, designed to help organizations track, optimize, and govern their cloud spending across multiple vendors and business units.

## ✨ Key Features

### 🏢 **Multi-Entity Management**
- **Company Management**: Organize and manage multiple business units or companies
- **Pod-Based Budgeting**: Create and track budget allocation pods for different departments
- **Vendor Management**: Comprehensive vendor profiles with document storage and spending analysis
- **Hierarchical Structure**: Companies → Pods → Invoices → Payments with full relationship mapping

### 📊 **Financial Tracking & Analytics**
- **Real-time Budget Monitoring**: Track budget utilization with visual progress indicators
- **Spending Analytics**: Comprehensive dashboards with charts and financial insights
- **Invoice Management**: Full invoice lifecycle with status tracking and document attachments
- **Payment Processing**: Manage payment workflows and transaction records

### 🔐 **Enterprise-Grade Security**
- **JWT Authentication**: Secure token-based authentication system
- **Role-Based Access**: User role management with appropriate permission controls
- **Profile Management**: Comprehensive user profiles with customizable settings
- **Session Management**: Secure session handling with automatic timeout

### 🎨 **Modern User Experience**
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Dashboards**: Real-time data visualization with Recharts
- **Intuitive Navigation**: Collapsible sidebar with breadcrumb navigation
- **Dark Mode Ready**: Consistent theming with professional UI components

### 📋 **Advanced Features**
- **Document Management**: Upload and manage vendor documents (PDFs, contracts, etc.)
- **Note System**: Internal notes and communications for companies and records
- **Alert System**: Configurable alerts for budget thresholds and important events
- **Search & Filtering**: Advanced search capabilities across all entities

## 🛠️ Tech Stack

### Frontend Technologies
- **React 18.2.0** - Modern React with Hooks and Context API
- **React Router DOM 6.14.2** - Client-side routing and navigation
- **Tailwind CSS 3.3.3** - Utility-first CSS framework
- **Headless UI** - Unstyled, accessible UI components
- **Heroicons** - Beautiful, hand-crafted SVG icons
- **Recharts 2.7.2** - Composable charting library
- **Axios 1.4.0** - HTTP client for API communication
- **Date-fns 2.30.0** - Modern JavaScript date utility library

### Backend Technologies
- **Node.js 18.x** - JavaScript runtime built on Chrome's V8 engine
- **Express.js** - Fast, unopinionated, minimalist web framework
- **SQLite 3.0** - Self-contained, high-reliability, embedded SQL database engine
- **JWT (JSON Web Tokens)** - Compact and self-contained way for securely transmitting information
- **Multer** - Middleware for handling multipart/form-data, used for file uploads
- **bcrypt** - Password hashing and comparison

### Development Tools
- **React Scripts 5.0.1** - Zero-config React development environment
- **ESLint** - Pluggable JavaScript linter for finding and fixing problems
- **Autoprefixer** - PostCSS plugin to parse CSS and add vendor prefixes
- **PostCSS 8.4.24** - Tool for transforming styles with JS plugins

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm 8.x or higher
- Git for version control

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/finops-tracker.git
   cd finops-tracker/finops-platform
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create a .env file in the root directory
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to access the application.

### Demo Mode (Recommended for Quick Testing)

The application comes with built-in mock API mode for demonstration purposes:

**Demo Credentials:**
- **Email:** `demo@finops.com`
- **Password:** `demo123`

The mock API provides realistic sample data including companies, pods, vendors, and invoices for immediate exploration without backend setup.

## 📁 Project Structure

```
finops-platform/
├── public/                     # Static assets and index.html
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Layout/           # Main layout components
│   │   └── UI/               # UI elements (Logo, Loading, etc.)
│   ├── contexts/             # React Context providers
│   │   └── AuthContext.js    # Authentication context
│   ├── pages/                # Page components
│   │   ├── Auth/             # Login and Register pages
│   │   ├── Companies/        # Company management
│   │   ├── Pods/             # Pod/budget management
│   │   ├── Vendors/          # Vendor management
│   │   ├── Invoices/         # Invoice management
│   │   ├── Dashboard/        # Main dashboard
│   │   └── Profile/          # User profile management
│   ├── services/             # API services and utilities
│   │   ├── api.js            # Main API client
│   │   ├── mockApi.js        # Mock API for demo mode
│   │   └── mockData.js       # Sample data for demo mode
│   ├── App.js                # Main App component with routing
│   └── index.js              # Application entry point
├── package.json              # Frontend dependencies and scripts
└── README.md                 # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Optional: Application Title
REACT_APP_TITLE=FinOps Tracker
```

### Mock API Mode

To enable mock mode (perfect for demos and testing):

```javascript
// In src/services/api.js
const USE_MOCK_API = true; // Set to true for demo mode
```

## 🎯 Core Functionalities

### 1. **Dashboard Overview**
- Total budget and spending overview
- Active pods and vendor statistics
- Recent invoices and payments
- Budget utilization visualizations

### 2. **Company Management**
- Create and manage multiple companies
- Track company-specific financial data
- Assign pods and vendors to companies
- Internal note-taking system

### 3. **Pod Budgeting**
- Create budget pods for different departments
- Real-time budget tracking with progress bars
- Vendor allocation management
- Spending analysis and alerts

### 4. **Vendor Management**
- Comprehensive vendor profiles
- Document upload and management
- Invoice tracking and history
- Performance metrics and analytics

### 5. **Invoice Processing**
- Upload and manage invoice documents
- Track payment status and due dates
- Associate invoices with vendors and pods
- Automated status calculations

### 6. **User Profile Management**
- Edit personal information and preferences
- Password change functionality
- Role-based access control
- Activity tracking and statistics

## 🔒 Authentication & Security

### User Authentication
- JWT-based secure authentication
- Session management with automatic refresh
- Password hashing with bcrypt
- Protected routes and API endpoints

### User Roles
- **Admin**: Full access to all features and data
- **Finance Associate**: Standard financial operations access
- **Viewer**: Read-only access to financial data

## 📊 API Architecture

### RESTful API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

**Companies:**
- `GET /api/companies` - List all companies
- `GET /api/companies/:id` - Get company details
- `POST /api/companies` - Create new company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

**Pods:**
- `GET /api/pods` - List all pods
- `GET /api/pods/:id` - Get pod details
- `POST /api/pods` - Create new pod
- `PUT /api/pods/:id` - Update pod
- `DELETE /api/pods/:id` - Delete pod

**Vendors:**
- `GET /api/vendors` - List all vendors
- `GET /api/vendors/:id` - Get vendor details
- `POST /api/vendors` - Create new vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

**Invoices:**
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Response Format
All API responses follow a consistent format:

```json
{
  "data": {
    "key": "value"
  },
  "message": "Success message"
}
```

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Professional blue and gray color scheme
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent spacing using Tailwind's spacing scale
- **Components**: Reusable, accessible UI components

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Adaptive layouts for tablets
- **Desktop Experience**: Full-featured desktop interface
- **Accessibility**: WCAG 2.1 compliant components

### Interactive Elements
- **Hover States**: Visual feedback on interactive elements
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages and toasts

## 🧪 Development & Testing

### Local Development
```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Code Quality
- ESLint configuration for code consistency
- Prettier integration for code formatting
- Component-based architecture for maintainability
- Comprehensive error handling and validation

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## 📈 Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Lazy loading of route components
- **Image Optimization**: Proper image compression and formats
- **Bundle Analysis**: Optimized bundle sizes with React Scripts
- **Caching Strategy**: Appropriate caching headers for static assets

### API Optimizations
- **Request Caching**: Intelligent caching for frequently accessed data
- **Pagination**: Efficient data pagination for large datasets
- **Database Indexing**: Optimized database queries
- **Compression**: Gzip compression for API responses

## 🚀 Deployment

### Production Build
```bash
# Create optimized production build
npm run build
```

### Deployment Options

**1. Static Hosting (Vercel, Netlify, GitHub Pages):**
- Pre-built static files
- No server-side requirements
- Mock API mode available

**2. Full-Stack Deployment (Heroku, AWS, DigitalOcean):**
- Node.js backend with SQLite
- Environment variables configuration
- Production database setup

### Environment Configuration
```bash
# Production variables
NODE_ENV=production
REACT_APP_API_URL=https://your-api-domain.com/api
JWT_SECRET=your-jwt-secret-key
```

## 🤝 Contributing Guidelines

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Use meaningful commit messages
- Write clean, readable code
- Add appropriate error handling
- Document new features

### Bug Reports
- Use GitHub Issues for bug reports
- Include steps to reproduce
- Provide environment details
- Add screenshots if applicable

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Contact

### Getting Help
- **Documentation**: Review this README and inline code comments
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Community**: Join our discussions for questions and ideas

### Project Links
- **Repository**: [https://github.com/yourusername/finops-tracker](https://github.com/yourusername/finops-tracker)
- **Live Demo**: [https://yourusername.github.io/finops-tracker](https://yourusername.github.io/finops-tracker)
- **Issues**: [https://github.com/yourusername/finops-tracker/issues](https://github.com/yourusername/finops-tracker/issues)

---

## 🙏 Acknowledgments

- **React Team** - For the amazing React framework
- **Tailwind CSS** - For the utility-first CSS framework
- **Heroicons** - For the beautiful icon set
- **Open Source Community** - For the incredible tools and libraries that made this project possible

---

<div align="center">
  <p>🌟 <strong>Star this repository if it helped you!</strong> 🌟</p>
  <p>Built with ❤️ by <a href="https://github.com/yourusername">Your Name</a></p>
</div>