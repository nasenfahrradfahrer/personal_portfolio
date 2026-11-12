import { useTranslation } from 'react-i18next'
import EmailLink, { EmailText } from '../components/EmailLink'
import Icon from '../components/Icon'
import Reveal from '../components/Reveal'
import Section from '../components/Section'
import useContent from '../i18n/useContent'
import { accentStyle } from '../utils/accent'
import './Contact.css'

// Abschnitt 4: Kontakt
export default function Contact(props) {
  const { t } = useTranslation()
  const { profile, contact } = useContent()

  const details = [
    { id: 'email', icon: 'mail', label: t('contact.email'), value: <EmailText />, email: true, accent: 'amber' },
    { id: 'location', icon: 'mapPin', label: t('contact.location'), value: profile.location, accent: 'pink' },
    { id: 'availability', icon: 'clock', label: t('contact.availability'), value: profile.availability, accent: 'violet' },
  ]

  return (
    <Section {...props}>
      <Reveal className="contact-card">
        <div className="contact__text">
          <h3>{contact.heading}</h3>
          <p>{contact.text}</p>

          <div className="contact__actions">
            <EmailLink className="btn btn--primary">
              <Icon name="mail" />
              {t('contact.writeEmail')}
            </EmailLink>
            {profile.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="btn btn--ghost"
                target="_blank"
                rel="noreferrer"
              >
                {social.label}
                <Icon name="arrowUpRight" size={16} />
              </a>
            ))}
          </div>
        </div>

        <ul className="contact__list">
          {details.map((item) => {
            const content = (
              <>
                <span className="contact__icon">
                  <Icon name={item.icon} size={20} />
                </span>
                <span>
                  <span className="contact__label">{item.label}</span>
                  <span className="contact__value">{item.value}</span>
                </span>
              </>
            )

            return (
              <li key={item.id} style={accentStyle(item.accent)}>
                {item.email ? (
                  <EmailLink className="contact__item contact__item--link">{content}</EmailLink>
                ) : (
                  <div className="contact__item">{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      </Reveal>
    </Section>
  )
}
