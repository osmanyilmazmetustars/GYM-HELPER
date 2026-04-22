# Minimalist Workout Tracker

A lightweight workout logging web app built with plain HTML and JavaScript.

## Features

- Log sets with exercise name, weight, reps, and timestamp
- Persist workout history in browser `localStorage`
- Manage history with delete-per-entry and clear-all actions
- Switch between **Session** and **Progress** views
- Group progress logs by date (`Today`, `Yesterday`, or calendar date)
- Visualize max-weight trends per exercise using Chart.js

## Project Structure

- `index.html` - App layout and Tailwind/Chart.js CDN includes
- `script.js` - App logic, rendering, and localStorage persistence
- `README.md` - Project documentation

This project uses a clean root structure and is ready for static hosting.

## Run Locally

Open `index.html` directly in your browser.

## Deploy

Deploy the root files (`index.html` and `script.js`) to any static host, for example:

- GitHub Pages
- Netlify
- Vercel (static site mode)
- Cloudflare Pages

## Notes

- LocalStorage data is stored per browser/device.
- External libraries are loaded via CDN:
  - Tailwind CSS (`cdn.tailwindcss.com`)
  - Chart.js (`cdn.jsdelivr.net`)
