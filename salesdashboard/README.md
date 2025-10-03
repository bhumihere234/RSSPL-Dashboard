# RSSPL Sales Dashboard

A comprehensive inventory management and sales dashboard built with Next.js, React, and Firebase.

## Features

### 📦 Stock Management
- **Stock In**: Add inventory with item, type, quantity, supplier, invoice, price, and GST tracking
- **Stock Out**: Enhanced 9-column table for processing stock-out operations
  - Item, Type, Quantity, Customer, Invoice, Price, GST, Date, Current Stock
  - Responsive design with horizontal scrolling
  - Auto-closing dropdowns for better UX
  - Bulk processing capabilities

### 📊 Reporting & Analytics
- **KPI Dashboard**: Real-time inventory metrics
- **Historical Data**: Track all inventory movements
- **Export Functionality**: Download reports in Excel format
- **Date-based Filtering**: Filter reports by date range and source

### 🔧 Technical Features
- **Real-time Updates**: Firebase integration for live data
- **Responsive Design**: Mobile-friendly interface
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern, utility-first styling

## Recent Updates

### Stock-Out Table Enhancements
- ✅ Removed action column for cleaner interface
- ✅ Expanded stock-out box to 2 columns for better visibility
- ✅ Removed height restriction to show entire table at once
- ✅ Fixed dropdown auto-close behavior
- ✅ Updated data structure to use customer field instead of supplier
- ✅ Added date field with automatic default values
- ✅ Improved responsive design with proper min-width constraints

## Tech Stack

- **Frontend**: Next.js 15.2.4, React 19, TypeScript
- **Styling**: Tailwind CSS 4.1.13
- **UI Components**: Radix UI primitives
- **Database**: Firebase Firestore
- **Charts**: Recharts
- **Excel Export**: XLSX library
- **Icons**: Lucide React

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
