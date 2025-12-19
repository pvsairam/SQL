# Oracle Fusion SQL Developer

A Visual Studio Code extension that lets you run SQL queries directly against Oracle Fusion Cloud.

## What It Does

This extension connects to your Oracle Fusion Cloud instance and allows you to:

- Run SQL queries and see results in a clean table format
- Save and manage multiple Oracle Fusion connections
- Test connections before saving them
- Export query results for further use

## How It Works

The extension uses Oracle BI Publisher's SOAP web service to execute SQL queries. It connects to your Fusion Cloud instance using your credentials and sends queries through the secure SOAP endpoint.

## Installation

1. Download the `.vsix` file from the releases
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click the three dots menu and select "Install from VSIX"
5. Choose the downloaded file

## Getting Started

1. Open the Oracle Fusion panel from the activity bar (left sidebar)
2. Click the "+" button to add a new connection
3. Enter your Fusion Cloud URL (e.g., https://your-company.fa.us2.oraclecloud.com)
4. Enter your username and password
5. Click "Test Connection" to verify it works
6. Save the connection

## Running Queries

1. Open the SQL Worksheet from the command palette (Ctrl+Shift+P > "Open SQL Worksheet")
2. Select your connection from the dropdown
3. Write your SQL query
4. Click "Run" or press F5

## Requirements

- VS Code version 1.103.0 or higher
- Valid Oracle Fusion Cloud credentials
- Network access to your Fusion Cloud instance

## Project Structure

```
oracle-fusion-sql-extension/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── providers/
│   │   └── ConnectionTreeProvider.ts
│   ├── services/
│   │   ├── ConnectionManager.ts
│   │   └── FusionClient.ts    # Handles SOAP requests
│   └── webview/
│       ├── SqlWorksheetPanel.ts
│       ├── ConnectionDialog.ts
│       └── webview files
├── package.json
└── webpack.config.js
```

## License

MIT License - see LICENSE file for details.
