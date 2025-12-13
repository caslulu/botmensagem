# Price Module

This folder contains the automatic price module implementation.

## Structure

- `services/priceService.js` – core image generation logic using `@napi-rs/canvas`.
- `repositories/quotesRepository.js` – lightweight JSON-backed repository for quote metadata.
- `utils/number.js` – helpers to parse and format currency values.
- `assets/` – fonts and image templates reused from the legacy project.

Generated files are stored under `data/price/output` inside the Electron user data directory, and a copy is automatically written to the operating system downloads folder for the active user. Quote metadata is saved in `data/price/quotes.json`; you can edit this file manually to add or update quote references (ID, name, document and optional Trello card ID).
