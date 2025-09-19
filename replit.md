# Overview

SQLPad is a web-based SQL client application built with React and Express.js, designed to provide a DBeaver-like experience for managing database connections and executing SQL queries. The application supports multiple database types (MySQL, PostgreSQL, AWS RDS) and offers features like query execution, result visualization, data export, and connection management through a modern web interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with JSON communication
- **Error Handling**: Centralized error handling middleware
- **Logging**: Custom request/response logging middleware

## Data Storage Solutions
- **Primary Database**: PostgreSQL configured via Drizzle ORM
- **Schema Management**: Database migrations handled through Drizzle Kit
- **In-Memory Storage**: MemStorage class for temporary data during development
- **Connection Storage**: Database credentials and configuration stored securely

## Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Security**: Environment variable-based configuration for sensitive data
- **Connection Security**: SSL support for database connections

## Key Features Implementation
- **Multi-Database Support**: Service layer abstracts different database drivers (mysql2, pg)
- **Query Editor**: Text-based SQL editor with syntax highlighting capabilities
- **Results Display**: Tabular data presentation with sorting and pagination
- **Export Functionality**: CSV and Excel export capabilities
- **Connection Management**: CRUD operations for database connections
- **Query Tabs**: Multi-tab interface for concurrent query execution

# External Dependencies

## Database Drivers
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **mysql2**: MySQL database driver with Promise support
- **pg**: PostgreSQL client for Node.js

## UI Framework Dependencies
- **@radix-ui/***: Complete set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating component variants
- **cmdk**: Command palette component

## Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution environment
- **esbuild**: Fast JavaScript bundler for production builds
- **drizzle-kit**: Database migration and introspection tools

## Session and State Management
- **@tanstack/react-query**: Server state management and caching
- **connect-pg-simple**: PostgreSQL session store for Express
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

## Utility Libraries
- **date-fns**: Date manipulation utilities
- **nanoid**: Unique ID generation
- **clsx/twMerge**: Conditional CSS class utilities