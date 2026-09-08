# Course Planner

A client-only web app for mapping courses onto an open-ended school calendar. Plans live in your browser, can be copied as a shareable link, and can be exported as JSON.

Live site: [https://calebcng.github.io/Course-Planner/](https://calebcng.github.io/Course-Planner/)

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## GitHub Pages

Pushes to `main` build the Vite app and deploy `dist` via GitHub Actions.

1. In the repo, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the **Deploy static content to Pages** workflow).

The published URL is `https://calebcng.github.io/Course-Planner/`. Share links stay in the URL hash, so they work on Pages without a server.

## How sharing works

- **Copy share link** compresses the current terms, courses, placements, and settings into the URL hash (`#v1.…`). Anyone with the link gets the same plan. The hash is never sent to a server.
- The planner also **autosaves to localStorage**. If a share hash is present on load, it wins over the local copy.
- **Export / Import** writes or reads a JSON file of the same document — useful as a backup if a URL gets unwieldy.

## Using the planner

1. **Terms** — default Fall A/B, Spring A/B, and Summer. Adjust months and week lengths, then add previous/next terms or a full cycle.
2. **Courses** — open the **Courses** view to add, edit, or delete catalog rows, schedule a course onto a term, and **Download template** / **Import courses** (CSV). Toolbar **Export / Import** is the full planner JSON.
3. **Schedule** — Table and Timeline views. Drag a course tile from the unscheduled sidebar onto a highlighted valid term. Use **Plan** for suggestions.
4. **Auto-arrange** — places only **Not planned** courses, respects **Max / term**, and leaves already scheduled courses where they are. Drag or Plan can put more courses in a term than the max.
