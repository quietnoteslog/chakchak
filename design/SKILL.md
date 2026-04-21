---
name: chakchak-design
description: Use this skill to generate well-branded interfaces and assets for 착착 (Chakchak) — a Korean mobile web app for offline event expense settlement. Contains essential design guidelines, colors, type, fonts (Pretendard), logo assets, and the mobile UI kit. Suitable for production code, prototypes, and mocks.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key brand signals:
- Primary color `#7b9fe8` (periwinkle blue), canvas `#f5f7fb`
- Font: Pretendard (Korean/English), weights 400/500/600/700/800
- Korean UI, polite 존대 tone, no filler adjectives
- Icons: **Lucide** (stroke 2px, rounded) via `assets/icons.js` — import with `<Icon name="camera" />` in React, `<span data-chak-icon="camera" data-size="20"></span>` in HTML. See `preview/brand-iconography.html` for the full set.
- Clean 1px borders over shadows; no gradients outside login
- Mobile-first 375px; PWA-installable
