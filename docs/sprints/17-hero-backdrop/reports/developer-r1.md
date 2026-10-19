# Report: developer · round 1 · status: done

Task: `tasks/developer-r1.md`

## Summary
- Grid and grain now sit in one wrapper masked with `mask-x-from-70% mask-x-to-100% mask-b-from-10% mask-b-to-70%`.
  The radial mask is gone. The wrapper keeps the motion-safe 1s fade-in. The grid is the same 3.5rem hairline. Its
  line colour is `--grid-line: color-mix(in oklab, var(--color-border), var(--color-primary) 15%)`, so it reads a
  little clearer and slightly petrol at the top.
- Grain is a static 160px SVG `feTurbulence` tile (fractalNoise, 0.9, 2 octaves, stitch, saturate 0), set as an
  inline `backgroundImage` data URI built once at module level. It uses `opacity-[0.06] mix-blend-multiply` in light
  and `dark:opacity-[0.05] dark:mix-blend-overlay` in dark. There is no live `<filter>` node in the DOM.
- New export `DeckGlow`: an aria-hidden, static `bg-primary/14` (`dark:/20`) `blur-3xl` pill. It is
  `absolute inset-y-2 right-0 left-12 -z-10` inside the deck wrapper, so it can never reach the text column. It fades
  in (motion-safe, `fill-mode-backwards`) after a 520ms delay, timed just before the deck's covers land.
- `HomeHero`: the deck wrapper is now `relative hidden pt-2 md:block` with `<DeckGlow />` then `<LatestCoverDeck />`.
  The two drifting glows and the comments are updated as asked.
- Built CSS (`.next-e2e/static/css/8cbfccaee4e9aed3.css`) contains `.mask-b-from-10\%`, `.mask-b-to-70\%`,
  `.mask-x-from-70\%` and `.mask-x-to-100\%`. They compose with `mask-composite: intersect`. The gradient runs to
  the bottom, opaque until 10% and transparent by 70%. The file also contains `bg-primary/14` and
  `dark:bg-primary/20`.

## Files
- `components/motion/drift-backdrop.tsx`
- `components/home-hero.tsx`

## Gate
- `npm run gate:fast` → exit 0 (typecheck, lint, 159/159 unit tests).
- `NEXT_DIST_DIR=.next-e2e npx next build` → exit 0 (built only to check the CSS and measure contrast. I stopped the
  server I started on 3200 by PID).

## AC4 contrast (measured with Playwright)
How: a production build on :3200, Chromium. I made the muted text and the link sweep transparent, set all infinite
animations to 9 phases across a full alternate cycle (0, 1/8 … 1) and finished the entrances. I then screenshotted
each `.text-muted-foreground` block in the hero (the dek and the intro) and took the worst pixel against the computed
muted colour. Because of the grain this is a per-pixel worst case.

| Theme | Width | Muted | Worst bg pixel | Min ratio |
|---|---|---|---|---|
| light | 375 | rgb(88,99,101) | rgb(218,229,231) | **4.82** |
| light | 1280 | rgb(88,99,101) | rgb(219,231,231) | **4.90** |
| dark | 375 | rgb(154,168,170) | rgb(29,53,54) | **5.30** |
| dark | 1280 | rgb(154,168,170) | rgb(27,51,53) | **5.44** |

Every worst case is at phase 0.25 on the dek. All pass 4.5:1. Light mode has the least headroom (about 0.3).

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | For the tester: at 768 and 1280, the glow element (`[aria-hidden]` first child of the deck wrapper) has a bounding box that does not intersect the h1, dek or intro boxes. At 320/375 the deck wrapper is `display:none`, so there is no glow. Check light and dark. | pass (by construction) |
| AC2 | For the tester: the computed `mask-image` on the grid/grain wrapper has linear gradients (no `radial-gradient`). Visually at 1280: grid visible at the top, gone by about 70% of the backdrop height, softened at the left and right 30%. | pass (CSS verified in build) |
| AC3 | For the tester: there is no `<filter>`/`feTurbulence` element in the DOM. The grain div's computed `background-image` starts with `url("data:image/svg+xml` and it is inside the masked wrapper. Opacity is 0.06 light and 0.05 dark. | pass |
| AC4 | Table above. The tester can rerun it at 375/1280, light/dark, and across drift phases. A worth-adding e2e check would be optional because pixel sampling is heavy. | pass (measured) |
| AC5 | For the tester: home with `javaScriptEnabled: false` renders the hero, deck and backdrop (all in the HTML). With `reducedMotion: 'reduce'`, no animation runs on the backdrop or the glow (`document.getAnimations()` for these nodes is empty), and both stay at full opacity. Neither file has `"use client"`. `package.json` is unchanged. | pass |

## Open questions
- I did not verify the comment's claim that a looser mask (to 80%) breaks 4.5:1. The task supplied that wording as
  the rationale. Light mode's worst case is 4.82, so the margin is small either way.
