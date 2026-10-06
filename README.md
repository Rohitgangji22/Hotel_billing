# Hotel Bill Generator

A static site (no build step). Files:

- index.html: page markup
- styles.css: styles, including the A4 print layout
- script.js: bill calculation and live preview
- vercel.json: Vercel settings

## Deploy on Vercel

Option 1, from GitHub: push this folder to a repository, then in Vercel choose Add New > Project, import the repository, leave Framework Preset as "Other", leave Build Command and Output Directory empty, and click Deploy.

Option 2, from the terminal:

    npm i -g vercel
    cd hotel-bill-site
    vercel --prod

Open the deployed link in Chrome or Edge, fill the form and use Print bill.
