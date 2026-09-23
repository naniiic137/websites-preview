# Websites Preview — web design & development by Hamza Ben Ismail

Nine complete, working websites for different industries — restaurants, hotels, shops, real estate, events,
logistics, SaaS and personal brands — plus a landing page to browse them. Every site is built with **pure
HTML, CSS and vanilla JavaScript**: no frameworks, no build step, and **no external requests**, so each one
works offline straight from disk and loads fast on phones.

**Live:** <https://websites-preview.netlify.app>

![Landing page](previews/restaurant-website.webp)

## The projects

| # | Site | Industry | Highlights |
|---|---|---|---|
| 1 | [La Maison Dorée](restaurant-website/) | Fine dining | Reservations that respect opening hours and notice rules, live “open now” indicator, menu tabs, gallery lightbox |
| 2 | [Ember & Oak](digital-menu/) | QR restaurant menu | Search, dietary filters, order by table with running total, EN / FR / AR (right-to-left), printable table QR code generated in the page |
| 3 | [Sarah & James](wedding-invitation/) | Wedding | Countdown, story timeline, schedule, RSVP per guest with meal choices, “add to calendar” (.ics) |
| 4 | [LUXE](ecommerce-store/) | Fashion e-commerce | Filters and sort, quick view with variants, cart and wishlist saved locally, promo codes, 4-step checkout with card validation |
| 5 | [PrimeNest Realty](real-estate-website/) | Real estate | Buy/rent search, favourites, compare up to 3 homes, photo lightbox, mortgage calculator, shareable listing links |
| 6 | [SwiftDrop](delivery-website/) | Delivery & logistics | Instant quote across 29 Tunisian cities, live tracking simulation, coverage checker, business plans |
| 7 | [The Azure Palace](hotel-website/) | Luxury hotel | Booking widget with availability calendar, live price with taxes and offer codes, room galleries, reviews |
| 8 | [StockPulse](inventory-dashboard/) | Inventory SaaS | A working mini-app: products CRUD, stock movements, low-stock alerts, hand-drawn charts, CSV import/export, dark mode |
| 9 | [Alex Rivera](portfolio-resume/) | Personal brand | Project filters and case studies, contact form, and a one-page printable résumé mode |

Open [`index.html`](index.html) to browse them all, filter by industry, and preview any site at desktop or
phone size.

## What every site includes

- **Responsive** — designed for phones, tablets and desktops (tested at 390, 768 and 1440 px, no horizontal scroll)
- **Works offline** — all images, fonts and scripts are local; nothing is loaded from other servers
- **Fast** — optimised WebP images with responsive sizes, lazy loading, no frameworks
- **Accessible** — semantic HTML, keyboard navigation, visible focus, reduced-motion support
- **Real features** — forms validate and confirm (data is stored in the browser, since these are demos without a backend)

## Run it

No installation needed: open `index.html` in a browser. Or serve the folder with any static server, for example:

```bash
npx http-server . -p 8080
```

## Project structure

```
index.html, assets/          # landing page (styles, script, font)
previews/                    # thumbnail of each site for the landing page
<site>/index.html            # each site: its page …
<site>/assets/css|js|img|fonts   # … and its own styles, scripts, images and font
```

## Credits

- Photos from [Unsplash](https://unsplash.com) (Unsplash License), stored locally as optimised WebP.
- Fonts are open-source (SIL Open Font License); each font folder includes its licence file.
- All brands, people and listings in the demos are fictional.

---

Designed and built by **Hamza Ben Ismail** — [portfolio](https://www.hamzabenismail.cloud-ip.cc) ·
[GitHub](https://github.com/naniiic137) · hamza.benismail.6@gmail.com
