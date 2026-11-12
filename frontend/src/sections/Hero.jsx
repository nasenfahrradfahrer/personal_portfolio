import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../components/Icon'
import Reveal from '../components/Reveal'
import VideoModal from '../components/VideoModal'
import useContent from '../i18n/useContent'
import { accentStyle } from '../utils/accent'
import './Hero.css'

// Abschnitt 1: Profil / Einstieg
export default function Hero({ id, accent }) {
  const { t } = useTranslation()
  const { profile } = useContent()
  const [videoOpen, setVideoOpen] = useState(false)

  // Video in der Fassung der aktuellen Sprache (siehe profile.video in content.js)
  const { video } = profile
  const videoLabel = video?.duration
    ? t('hero.watchVideoLabelDuration', { duration: video.duration })
    : t('hero.watchVideoLabel')

  const avatarContent = (
    <div className="avatar__inner">
      {profile.photo ? (
        <img src={profile.photo} alt={video ? '' : profile.name} />
      ) : (
        <span>{profile.initials}</span>
      )}
    </div>
  )

  return (
    <section id={id} className="hero" style={accentStyle(accent)} aria-labelledby={`${id}-title`}>
      <div className="container hero__inner">
        <Reveal className="hero__visual" delay={100}>
          {video ? (
            // Avatar als Play-Button: drehender Ring + Play-Badge signalisieren das Video
            <button
              type="button"
              className="avatar avatar--video"
              aria-label={videoLabel}
              aria-haspopup="dialog"
              onClick={() => setVideoOpen(true)}
            >
              {avatarContent}
              <span className="avatar__play" aria-hidden="true">
                <Icon name="play" size={20} />
              </span>
            </button>
          ) : (
            <div className="avatar">{avatarContent}</div>
          )}
        </Reveal>

        <div className="hero__content">
          <Reveal>
            <p className="hero__badge">
              <span className="hero__status" />
              {profile.availability}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 id={`${id}-title`}>
              <span className="hero__greeting">{t('hero.greeting')}</span>
              <span className="gradient-text">{profile.name}</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="hero__role">{profile.role}</p>
            <p className="hero__tagline">{profile.tagline}</p>
          </Reveal>

          <Reveal className="hero__actions" delay={240}>
            <a href="#kontakt" className="btn btn--primary">
              {t('hero.contact')}
              <Icon name="arrowRight" />
            </a>
            {video ? (
              <button
                type="button"
                className="btn btn--ghost"
                aria-haspopup="dialog"
                onClick={() => setVideoOpen(true)}
              >
                <Icon name="play" size={16} />
                {t('hero.watchVideo')}
                {video.duration && <span className="btn__meta">{video.duration}</span>}
              </button>
            ) : (
              <a href="#erfahrung" className="btn btn--ghost">
                {t('hero.career')}
              </a>
            )}
            {profile.cv && (
              <a href={profile.cv} download className="btn btn--ghost">
                <Icon name="download" size={16} />
                {t('hero.downloadCv')}
              </a>
            )}
          </Reveal>
        </div>

        <ul className="hero__facts">
          {profile.facts.map((fact, i) => (
            <Reveal as="li" key={fact.id} className="fact" style={accentStyle(fact.accent)} delay={300 + i * 80}>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
            </Reveal>
          ))}
        </ul>
      </div>

      {video && (
        <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} video={video} title={profile.name} />
      )}
    </section>
  )
}
