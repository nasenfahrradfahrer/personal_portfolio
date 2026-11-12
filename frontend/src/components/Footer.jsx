import { useTranslation } from 'react-i18next'
import { profile, sections } from '../data/content'
import { PAGES, isHome } from '../utils/routes'
import Icon from './Icon'
import './Footer.css'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <nav className="footer__legal" aria-label={t('footer.legal')}>
          <a href={PAGES.imprint}>{t('footer.imprint')}</a>
          <a href={PAGES.privacy}>{t('footer.privacy')}</a>
        </nav>
        <a href={isHome ? `#${sections[0].id}` : '#main'} className="footer__top">
          {t('footer.toTop')}
          <Icon name="arrowUp" size={16} />
        </a>
      </div>
    </footer>
  )
}
