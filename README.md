# SQLPad - Online Database Client

A web-based SQL client similar to DBeaver, built with Express.js and React. Connect to MySQL, PostgreSQL, and AWS RDS databases to run queries, view results, and export data.

## Features

- 🗄️ **Multiple Database Support**: MySQL, PostgreSQL, AWS RDS
- 📝 **Query Editor**: Syntax highlighting and formatting
- 📊 **Results Viewer**: Tabular data display with sorting
- 📤 **Data Export**: CSV and Excel export functionality
- 🔗 **Multiple Connections**: Manage multiple database connections
- 📑 **Query Tabs**: Work with multiple queries simultaneously
- 🔒 **Secure Configuration**: Environment variable support

## Quick Start

### 1. Database Configuration

Set up your database credentials using environment variables or the configuration UI:

**Environment Variables (Recommended for Replit):**
```bash
DB_HOST=your-database-host.amazonaws.com
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
