These two files need to be downloaded once (requires network access) and placed
right here, replacing nothing — just add them alongside this README:

  vendor/jspdf/jspdf.umd.min.js
  vendor/marked/marked.min.js

Run this from a machine with internet access, inside the `public/vendor` folder:

  curl -o jspdf/jspdf.umd.min.js https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
  curl -o marked/marked.min.js https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js

Why: the app previously loaded these from cdnjs.cloudflare.com directly in
app.html, which violates the site's Content-Security-Policy
("script-src 'self'") and gets silently blocked by the browser. Self-hosting
them under /vendor (same pattern already used for pdf.min.js) keeps the CSP
strict while letting the scripts actually load.

app.html and server.js have already been updated to point at and allow these
local paths — you only need to add the two files themselves.
