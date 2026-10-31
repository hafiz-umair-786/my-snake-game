# Neon Coil Snake

A responsive Snake game for desktop and mobile browsers.

## Project Description

**Neon Coil Snake** is a modern, responsive web-based interpretation of the classic arcade Snake game, designed with a sleek neon aesthetic. It is built using native frontend web technologies (**HTML5, CSS3, and JavaScript**) along with a lightweight **Python backend** for local execution and run history tracking. 

The project is structured to work seamlessly across different environments, running as a full-stack local application or deploying globally as a purely client-side static web application.

## Key Features

* **Cross-Platform Controls:** Supports traditional keyboard directional inputs for desktop and intuitive touch/swipe controls optimized for mobile screen boundaries.
* **Dynamic Gameplay Mechanics:** Features adjustable game speed, edge wrapping (passing through walls), and grid obstacles to scale difficulty.
* **Advanced Scoring Engine:** Includes standard items for positive growth alongside a negative poison scoring system that penalizes the player and deducts points.
* **Dual-Mode Run History:** Tracks detailed match history via the Python backend when running locally, and automatically falls back to browser-managed `localStorage` when deployed to the cloud.

## Core Technical Architecture

* `index.html` - Renders the HTML5 gaming canvas and structural page layout.
* `style.css` - Implements the dark-mode neon glow themes and fluid grid sizing.
* `script.js` - Manages the main game loop, directional vectors, collision detection, and UI states.
* `music.mp3` - Handles integrated atmospheric background audio during active play sessions.
* `app.py` - A lightweight local server handling route allocation and historical metric saving.

## Run locally

```powershell
python app.py
```

Open http://localhost:8000.

The game supports keyboard and touch controls, adjustable speed, edge wrapping, obstacles, negative poison scoring, and detailed local run history.

## Deploy to Vercel

The frontend files can be deployed as a static site. Import this folder as a Vercel project and use the default settings.

On Vercel, run history is stored in the browser with `localStorage`. The Python `app.py` server is for local hosting and is not used by the static Vercel deployment.
