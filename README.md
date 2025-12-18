# Oracle Fusion Cloud SQL Query Tool

A web application for running SQL queries against Oracle Fusion Cloud using the BI Publisher SOAP API. Works like SQL Developer but in your browser.

## What It Does

- Run SQL queries against Oracle Fusion Cloud databases
- View results in a scrollable table with proper formatting
- Export data to CSV, Excel, JSON, or XML
- Save multiple database connections
- Track query history

## How to Use

1. Add a new connection with your Fusion Cloud URL, username, and password
2. Turn on the connection using the power button
3. Write your SQL query in the editor
4. Press Ctrl+Enter or click Run to execute
5. View results in the bottom panel

## Features

- Monaco code editor with SQL syntax highlighting
- Multiple tabs for different queries
- Keyboard shortcuts (Ctrl+Enter to run)
- Connection management with save/edit/delete
- Query cancellation for long-running queries
- Row limit controls (5 to 10,000 rows)
- Professional table display with scrolling

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Code Editor: Monaco Editor
- API: Oracle BI Publisher SOAP

## Setup

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Oracle Fusion URL Format

Use your base Fusion Cloud URL without any path suffixes:
```
https://yourcompany.fa.ocs.oraclecloud.com
```

Do not include `/fscmUI` or `/hcmUI` in the URL.

## License

MIT