# Insurance Helper (Botmensagem)

## Project Overview
**Insurance Helper** is an Electron-based desktop application designed to automate insurance-related workflows. It primarily focuses on generating RTA (Real-Time Adherence) PDFs, automating quote retrievals from insurance providers like Progressive and Liberty, and managing price forms. The application features a modern React frontend and a robust Node.js backend leveraging Playwright for browser automation.

## Architecture
The project follows the standard Electron architecture with a separation between the Main and Renderer processes:

*   **Main Process (`src/main/`)**: Handles the application lifecycle, native integrations, SQLite database, and heavy automation tasks using Playwright.
*   **Renderer Process (`src/renderer/`)**: A React application styled with Tailwind CSS, providing the user interface.
*   **Preload (`src/preload/`)**: Acts as a secure bridge, exposing specific APIs (via `contextBridge`) from the Main process to the Renderer.

## Tech Stack
*   **Runtime**: Electron v39
*   **Frontend**: React v19, Tailwind CSS v3
*   **Automation**: Playwright v1.56 (Chromium)
*   **Database**: SQLite (via `sql.js`)
*   **PDF Generation**: `pdf-lib`
*   **Language**: TypeScript

## Key Directories

### `src/main/`
Contains the backend logic.
*   `main.ts`: Application entry point.
*   `automation/`: Logic for browser automation (Playwright), including `automation-controller.ts`, `browser-manager.ts`, and provider-specific scripts.
*   `infra/db/`: Database configuration and repositories (`sqlite.ts` defines the schema).
*   `ipc/`: IPC handlers for communication between Main and Renderer processes.
*   `rta/` & `price/`: Business logic for RTA generation and pricing modules.

### `src/renderer/`
Contains the frontend UI code.
*   `src/App.tsx`: Main application component.
*   `src/pages/`: Page components for different modules (Quotes, RTA, Settings, etc.).
*   `src/components/`: Reusable UI components.

### `data/`
Used for storing local artifacts during development (e.g., profiles, sessions). In production, `userData` directory is used.

## Database Schema
The SQLite database (`messages.db`) includes the following key tables:
*   `profiles`: User profiles with configuration.
*   `quotes`: Stores insurance quote data and Trello card links.
*   `roadmap_items`: Manages the internal project roadmap.
*   `messages` & `profile_sessions`: Support for the messaging/automation infrastructure.

## Building and Running

### Development
To start the application in development mode (simultaneous Main and Renderer hot-reload):
```bash
npm run dev
```
*Optional: Use `PWDEBUG=1 npm run dev` to open the Playwright inspector.*

### Build
To build the application for production (Windows x64 by default):
```bash
npm run build
```
Other build commands:
*   `npm run build:dir`: Unpacked build for testing.
*   `npm run build:mac`: Build for macOS.
*   `npm run build:linux`: Build for Linux.

## Automation Workflow
The automation logic is centralized in `AutomationController`.
1.  **Launch**: `BrowserManager` launches a browser instance.
2.  **Execution**: Scripts navigate provider websites (Progressive, Liberty), fill forms, and scrape data.
3.  **Control**: The process supports pausing (`pause: true`) for manual intervention during the flow.

## Conventions
*   **IPC**: All IPC channels should be defined in `src/preload` and handled in `src/main/ipc`.
*   **Styling**: Use Tailwind CSS classes for styling components.
*   **Types**: Maintain strong typing with TypeScript interfaces shared between processes where possible.
