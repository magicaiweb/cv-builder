# CoverCraft

Local Next.js app that takes a CV file + job description and generates a tailored cover letter and CV. Outputs DOCX and PDF. Auto-detects English and Arabic.

## Quick start

1. **Install Node.js 18+** if you don't have it: https://nodejs.org

2. **Install dependencies**
   ```bash
   cd covercraft
   npm install
   ```

3. **Add your Anthropic API key**
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and paste your key from https://console.anthropic.com/

4. **(Optional) Arabic PDF support**
   For Arabic CVs to render in PDF, download Noto Naskh Arabic and place these two files in `public/fonts/`:
   - `NotoNaskhArabic-Regular.ttf`
   - `NotoNaskhArabic-Bold.ttf`
   
   Get them free at: https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic
   
   DOCX exports work fine without this. Only PDF needs the font embedded.

5. **Run it**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:3000

## How it works

- You upload a CV (PDF, DOCX, or TXT) and paste a job description
- The server extracts text from your CV, sends it + the JD to Claude
- Claude returns a structured JSON: tailored cover letter, rewritten CV, fit notes
- You can preview, then download each as DOCX or PDF

The API key never leaves your machine — everything runs locally.

## Files

- `pages/index.js` — the UI
- `pages/api/generate.js` — extracts CV text + calls Claude
- `pages/api/docx.js` — generates DOCX downloads
- `pages/api/pdf.js` — generates PDF downloads

## Troubleshooting

- **"Cannot find module 'pdf-parse'"**: run `npm install` again
- **Empty CV text**: try a different file format (DOCX usually extracts cleanest)
- **Arabic PDF shows boxes**: download the Noto Naskh Arabic fonts (step 4)
- **API errors**: check your `.env.local` has a valid key
