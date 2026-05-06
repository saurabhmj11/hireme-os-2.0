# Hire Me OS 2.0 — Chrome Extension

## One-Click Apply + AI Tools on Any Job Site

Auto-fills job applications and provides AI-powered tools directly on LinkedIn, Indeed, Glassdoor, Wellfound, and Naukri job pages.

---

## Install

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select this `chrome-extension/` folder
4. The Hire Me OS icon appears in your toolbar

## Setup

1. Click the extension icon in your toolbar
2. Enter your Hire Me OS app URL (e.g., `https://hireme-os-2-0.onrender.com`)
3. Click **Connect to App**
4. Make sure your CV is saved in the app's **Settings** tab

## Features

| Feature | Description |
|---------|-------------|
| **Auto-Fill** | Detects job application forms and fills name, email, phone, LinkedIn from your CV |
| **Tailor CV** | Extracts the job description from the page and opens the AI resume tailor in the app |
| **ATS Score** | Checks ATS compatibility of your resume against the job posting |
| **Cover Letter** | Generates a personalized cover letter for the current job |
| **Right-Click Menu** | Auto-fill and ATS check available from the context menu on any job page |

## Supported Sites

| Site | Auto-Fill | Tailor CV | ATS Score | Cover Letter |
|------|-----------|-----------|-----------|--------------|
| LinkedIn Jobs | Yes | Yes | Yes | Yes |
| Indeed | Yes | Yes | Yes | Yes |
| Glassdoor | Yes | Yes | Yes | Yes |
| Wellfound (AngelList) | Yes | Yes | Yes | Yes |
| Naukri | Yes | Yes | Yes | Yes |

## How It Works

1. The **content script** (`content.js`) detects when you're on a supported job site
2. It injects floating action buttons and right-click context menu items
3. When you click an action, it communicates with the **background script** (`background.js`)
4. The background script calls your Hire Me OS API endpoints to perform the AI operations
5. Results are displayed either in a popup overlay or by navigating to the app

## Permissions

- `activeTab` — Access the current tab to detect job sites and read page content
- `contextMenus` — Add right-click menu items on job pages
- `storage` — Store your app URL and connection status
- `scripting` — Inject the auto-fill script into job application forms

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not connecting | Ensure your app URL is correct and the app is running |
| Auto-fill not working | Make sure your CV is saved in Settings with your name and contact info |
| Job description not detected | The page may use a non-standard layout — try manually copying the JD |
