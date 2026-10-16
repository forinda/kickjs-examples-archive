import './app.css'
import { createInertiaApp, router } from '@inertiajs/react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { pushFlash } from './toasts'

// Before createInertiaApp, so the first page's flash (fired right after it loads) is caught too.
router.on('flash', (event) => pushFlash(event.detail.flash))

const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })

createInertiaApp({
  resolve: (name) => pages[`./pages/${name}.tsx`] as never,
  setup({ el, App, props }) {
    // Server-rendered pages are hydrated; the rest render from scratch.
    if (el.hasAttribute('data-server-rendered')) hydrateRoot(el, <App {...props} />)
    else createRoot(el).render(<App {...props} />)
  },
})
