# Landing page

Static page served at https://anchored.newcleardigital.com by GitHub Pages from the `main` branch. Source of truth: `site/` in newcleardigital/anchor-development

- `index.html`: the whole page, told over the scroll film: `3d/js/film.js` (with `3d/js/kit.js`) is drawn live on a canvas as you scroll, one chapter per beat. `CALL_URL` at the bottom sets where "Book a call" goes (empty = email).
- `fonts/`: self-hosted Inter Tight and IBM Plex Mono from npm @fontsource (SIL Open Font License), so the page loads no fonts from other servers.
- `brand/`: logos and icons from the Anchored design system.
- `CNAME`: the custom domain.
