import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sections as sectionOrder } from '../data/content'
import useActiveSection from '../hooks/useActiveSection'
import useContent from '../i18n/useContent'
import { accentStyle } from '../utils/accent'
import { homeHref, isHome } from '../utils/routes'
import LanguageSwitch from './LanguageSwitch'
import './Header.css'

const sectionIds = sectionOrder.map((section) => section.id)
// Auf Unterseiten gibt es keine Abschnitte, also auch keinen aktiven
const trackedIds = isHome ? sectionIds : []

export default function Header() {
  const { t } = useTranslation()
  const { profile, sections } = useContent()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const progressRef = useRef(null)
  const active = useActiveSection(trackedIds)

  // Hintergrund ab erstem Scrollen + Fortschrittsbalken
  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const { scrollY, innerHeight } = window
      const max = document.documentElement.scrollHeight - innerHeight
      const progress = max > 0 ? Math.min(scrollY / max, 1) : 0
      setScrolled(scrollY > 8)
      progressRef.current?.style.setProperty('--progress', String(progress))
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Mobiles Menü: mit Escape oder beim Wechsel auf Desktop-Breite schließen
  useEffect(() => {
    if (!open) return

    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 768px)')
    const onChange = (event) => {
      if (event.matches) setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onChange)
    return () => {
      window.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onChange)
    }
  }, [open])

  const close = () => setOpen(false)
  const classes = ['header', scrolled && 'header--scrolled', open && 'header--open']
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <header className={classes}>
        <div className="container header__inner">
          <a href={homeHref(sectionIds[0])} className="brand" onClick={close}>
            <span className="brand__mark">{profile.initials}</span>
            <span className="brand__name">{profile.name}</span>
          </a>

          <nav className="nav" aria-label={t('header.nav')}>
            <ul id="site-nav" className="nav__list">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={homeHref(section.id)}
                    className={`nav__link${active === section.id ? ' is-active' : ''}`}
                    style={accentStyle(section.accent)}
                    aria-current={active === section.id ? 'true' : undefined}
                    onClick={close}
                  >
                    <span className="nav__index">{String(i + 1).padStart(2, '0')}</span>
                    {section.nav}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header__actions">
            <LanguageSwitch />
            <button
              type="button"
              className="menu-btn"
              aria-expanded={open}
              aria-controls="site-nav"
              aria-label={open ? t('header.menuClose') : t('header.menuOpen')}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="menu-btn__bar" />
              <span className="menu-btn__bar" />
            </button>
          </div>
        </div>

        <div className="header__progress" ref={progressRef} />
      </header>

      {open && <div className="nav-backdrop" onClick={close} />}
    </>
  )
}
