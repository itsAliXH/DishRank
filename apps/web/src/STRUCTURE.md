# Web client structure

Ideal layered layout used by `apps/web`. **App Router URLs are unchanged** — `app/**/page.tsx` files are thin re-exports.

```
src/
├── app/                    # Routes only (thin shells)
│   ├── layout.tsx
│   ├── page.tsx            → features/home
│   ├── search/page.tsx     → features/search
│   ├── admin/page.tsx      → features/admin
│   └── …
├── components/
│   ├── ui/                 # Design-system primitives (button, dialog, …)
│   └── shell/              # Chrome: nav, search bar, city select, PWA
├── features/               # Vertical product slices
│   ├── admin/
│   ├── auth/
│   ├── bookmarks/
│   ├── dishes/
│   ├── home/
│   ├── media/
│   ├── near-me/
│   ├── owner/
│   ├── profile/
│   ├── rate/
│   ├── reviews/
│   ├── saved/
│   └── search/
├── providers/              # React contexts (auth, city, bookmarks, location)
└── lib/                    # api.ts, utils, mock-data, city-coords
```

## Import conventions

| Need | Import from |
|------|-------------|
| Primitives | `@/components/ui/...` |
| Shell / chrome | `@/components/shell` or `@/components/shell/...` |
| Feature UI | `@/features/<name>/...` |
| Contexts | `@/providers` or `@/providers/...` |
| HTTP / helpers | `@/lib/...` |

## Adding a screen

1. Put UI + logic in `features/<name>/...-page.tsx` (`'use client'` if needed).
2. Keep `app/<route>/page.tsx` as: `export { default } from '@/features/<name>/...-page';`
