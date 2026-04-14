# ✋ Gesture Canvas

A real-time hand gesture drawing app powered by [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html). Draw, select, scale, and rotate objects on a canvas using just your hands — no mouse or keyboard needed.

**[Live Demo →](https://yourusername.github.io/gesture-canvas/)** *(replace with your GitHub Pages URL after deploying)*

![Gesture Canvas Screenshot](assets/screenshot.png)

---

## Features

- **Hand tracking** via webcam using MediaPipe Hands (CDN, no install needed)
- **Neon glow drawing** — strokes render with soft glowing light trails
- **Object selection** — select any drawn stroke with an open palm
- **Zoom in/out** — thumbs up / thumbs down to scale selected objects
- **Rotation** — use two hands to rotate selected objects in real-time
- **Color picker** — 10 preset colors + custom color input in the sidebar
- **Brush size** — adjustable slider from 1px to 24px
- **Skeleton overlay** — toggle hand landmark visualization
- **Undo / Clear / Save** — full stroke history with PNG export
- **Single HTML file** — zero build tools, zero dependencies beyond CDN

---

## Gestures

| Gesture | Action |
|---|---|
| ☝️ **Index finger** (others curled) | Draw on canvas |
| ✋ **Open palm** (all fingers spread) | Select the nearest stroke |
| 👍 **Thumbs up** | Zoom in the selected stroke |
| 👎 **Thumbs down** | Zoom out the selected stroke |
| 🙌 **Two hands** | Rotate the selected stroke |
| ✊ **Fist** (everything closed) | Deselect |

---

## Quick Start

### Option 1: Just open it

1. Download or clone this repo
2. Open `index.html` in Chrome or Edge
3. Click **"Enable Camera"**
4. Start drawing with your index finger

```bash
git clone https://github.com/yourusername/gesture-canvas.git
cd gesture-canvas
open index.html       # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

### Option 2: Deploy to GitHub Pages

1. Fork this repository
2. Go to **Settings → Pages**
3. Set source to **main** branch, root `/`
4. Your app is live at `https://yourusername.github.io/gesture-canvas/`

### Option 3: Any static server

```bash
# Python
python -m http.server 8000

# Node
npx serve .

# Then open http://localhost:8000
```

---

## How It Works

### Architecture

```
index.html (single file)
├── CSS          → Dark theme UI, sidebar, canvas layout
├── HTML         → Splash screen, sidebar controls, canvas layers
└── JavaScript
    ├── MediaPipe Hands     → Hand landmark detection (21 points per hand)
    ├── Gesture Detection   → detectGesture(landmarks) → gesture string
    ├── Coordinate Mapping  → Un-mirrors webcam coordinates for natural drawing
    ├── Smoothing           → 5-frame rolling average to reduce jitter
    ├── Drawing Engine      → Quadratic bezier strokes with glow rendering
    ├── Selection System    → Nearest-stroke selection by palm center position
    ├── Transform System    → Per-stroke rotation and scale with center pivot
    └── Stroke History      → Array-based undo support
```

### Gesture Detection Logic

Each gesture is detected by checking the state of all five fingers:

- **Finger extended**: fingertip y-position is above its PIP joint (with a small threshold)
- **Finger curled**: fingertip y-position is below its PIP joint
- **Thumb up/down**: thumb tip position relative to thumb IP joint and wrist

Gestures are intentionally designed to be **physically very different** from each other to avoid misfires.

### Coordinate System

The webcam video is CSS-mirrored (`scaleX(-1)`) so the user sees a natural mirror view. All MediaPipe landmark coordinates are flipped (`1 - lm.x`) before mapping to canvas space so drawing matches the visual position on screen.

### Stroke Storage

Each stroke is stored as:

```javascript
{
  col: '#4a7aff',   // color
  sz: 3,            // brush size
  pts: [{x, y}],    // array of points
  rot: 0,           // rotation in degrees
  sc: 1,            // scale factor
  cx: 400, cy: 300  // transform center (bounding box center)
}
```

---

## Browser Support

| Browser | Status |
|---|---|
| Chrome 80+ | ✅ Fully supported |
| Edge 80+ | ✅ Fully supported |
| Firefox 75+ | ⚠️ Works, may have lower FPS |
| Safari 14+ | ⚠️ Webcam permission may require HTTPS |
| Mobile Chrome | ⚠️ Works but performance varies |

> **Note**: HTTPS is required for webcam access on most browsers when not running on localhost.

---

## Dependencies

All loaded from CDN — nothing to install:

| Library | Version | CDN |
|---|---|---|
| `@mediapipe/hands` | 0.4.1675469240 | jsDelivr |
| `@mediapipe/camera_utils` | 0.3.1675466862 | jsDelivr |
| DM Sans font | — | Google Fonts |
| Instrument Sans font | — | Google Fonts |

---

## Project Structure

```
gesture-canvas/
├── index.html          # The entire app (single file)
├── README.md           # This file
├── LICENSE             # MIT License
└── assets/
    └── screenshot.png  # Screenshot for README (add your own)
```

---

## Customization

### Add more colors

Find the `COLORS` array at the top of the `<script>` section:

```javascript
const COLORS=['#4a7aff','#22d3ee','#2dd4a0','#a855f7','#ff5caa',
  '#ff4a6a','#ff8c42','#ffd449','#f0f0f5','#555566'];
```

Add or replace hex values. The sidebar grid auto-generates from this array.

### Change brush size range

Find the slider input and modify `min`/`max`:

```html
<input type="range" id="bSlider" min="1" max="24" value="3">
```

### Adjust gesture sensitivity

In `detectGesture()`, the thresholds control how strictly a gesture is detected:

```javascript
// Finger extended threshold (lower = more sensitive)
return lm[tips[finger]].y < lm[pips[finger]].y - 0.01;

// Thumb up threshold (higher = stricter)
const thumbUp = allCurled && thumbTipY < thumbIPY - 0.04;
```

### Change smoothing

Adjust `SMOOTH_N` (default 5). Higher = smoother but more input lag:

```javascript
const SMOOTH_N = 5;  // number of frames to average
```

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome-gesture`)
3. Commit your changes (`git commit -m 'Add awesome gesture'`)
4. Push to the branch (`git push origin feature/awesome-gesture`)
5. Open a Pull Request

---

## License

[MIT](LICENSE) — use it however you like.
