# Morocco Inventory Hub

Complete inventory management system designed for Moroccan businesses with full support for local business requirements including ICE, IF, RC identifiers, and 20% VAT compliance.

## Features

- **Inventory Management**: Track products across multiple warehouses
- **CRM**: Manage clients and suppliers with Moroccan business identifiers
- **Invoicing**: Generate invoices, estimates, delivery notes, and credit notes
- **Sales & Purchases**: Comprehensive sales and purchase order management
- **Stock Tracking**: Real-time stock level monitoring with low stock alerts
- **Reporting**: Financial reports and tax documentation
- **Role-Based Access Control**: Admin, Manager, Accountant, and Staff roles
- **Multi-Warehouse Support**: Manage inventory across multiple locations

## Getting Started

### Prerequisites

- Node.js 18+ and npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd morocco-inventory-hub-main

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Default Login Credentials

- **Email**: `admin@evotech.ma`
- **Password**: `Admin1234`

## Technologies

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **shadcn-ui** - Modern UI components
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **PostgreSQL** - Database (see DATABASE_SETUP.md)

## Project Structure

```
morocco-inventory-hub-main/
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React Context providers
│   ├── pages/          # Page components
│   ├── lib/            # Utility functions
│   └── services/       # API services
├── database/           # Database schema and setup
├── public/             # Static assets
└── dist/               # Build output
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Database Setup

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for PostgreSQL database setup instructions.

## Documentation

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database installation and configuration
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Integration instructions
- [GIT_AUTH_SETUP.md](./GIT_AUTH_SETUP.md) - Git authentication setup

## License

Private - All rights reserved
