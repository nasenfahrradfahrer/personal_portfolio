import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import './VideoModal.css'

// Overlay für das Vorstellungsvideo. Nutzt <dialog>: Fokus bleibt im Overlay,
// Escape schließt, danach springt der Fokus zurück zum auslösenden Element.
// Das <video> wird erst beim Öffnen eingefügt (lädt also nichts vorher) und beim
// Schließen entfernt, wodurch die Wiedergabe stoppt. video ist die Fassung der aktuellen Sprache;
// key={video.src} lädt bei einem Sprachwechsel die passende Datei neu.
export default function VideoModal({ open, onClose, video, title }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const meta = [t('video.meta'), video.duration].filter(Boolean).join(' · ')

  return (
    <dialog
      ref={dialogRef}
      className="video-modal"
      style={{ '--video-ratio': video.aspectRatio }}
      aria-labelledby="video-modal-title"
      onClose={onClose}
      // Klick auf die abgedunkelte Fläche (nicht auf den Inhalt) schließt
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="video-modal__inner">
        <div className="video-modal__head">
          <div>
            <p className="video-modal__meta">{meta}</p>
            <h2 id="video-modal-title" className="video-modal__title">
              {title}
            </h2>
          </div>
          <button type="button" className="video-modal__close" onClick={onClose} aria-label={t('video.close')}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="video-modal__frame">
          {open &&
            (video.src ? (
              <video key={video.src} src={video.src} poster={video.poster ?? undefined} controls autoPlay playsInline />
            ) : (
              <div className="video-modal__placeholder">
                <span className="video-modal__placeholder-icon">
                  <Icon name="play" size={26} />
                </span>
                <p>{t('video.placeholder')}</p>
                <p className="video-modal__placeholder-note">{t('video.placeholderNote', { ratio: video.aspectRatio })}</p>
              </div>
            ))}
        </div>
      </div>
    </dialog>
  )
}
