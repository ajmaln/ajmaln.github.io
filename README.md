# ajmaln.github.io

Personal site of Ajmal Noushad, served by GitHub Pages at https://ajmaln.github.io.

It's plain HTML, CSS and vanilla JavaScript with no build step. Edit the files and push.

```
index.html              page content (all copy lives here)
404.html                not-found page
assets/css/main.css     design tokens (light + dark) and all styles
assets/js/main.js       theme, nav, ⌘K menu, hero dot field, timeline, cards
assets/js/agent.js      the scripted "Ask my agent" terminal and its answers
assets/Ajmal_Noushad_CV.pdf
assets/img/             photo, app icons and the social preview image (og.png)
favicon.svg             tab icon; favicon.ico is its 16/32/48px fallback
service-worker.js       clears the old Create React App service worker for returning visitors
```

## Updating content

- **Experience, projects, skills**: edit `index.html`. Tenure badges, the "7+ years" counts and
  the career timeline are computed from the `data-start` / `data-end` attributes on each role.
- **Agent answers**: edit the `INTENTS` list in `assets/js/agent.js`. Each intent has keywords,
  a fake tool call with its structured result, a short markdown answer and follow-up chips.
- **Resume**: replace `assets/Ajmal_Noushad_CV.pdf`.

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
