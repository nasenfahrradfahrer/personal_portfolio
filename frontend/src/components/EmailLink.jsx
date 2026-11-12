import { useState } from 'react'
import { profile } from '../data/content'

// E-Mail-Adresse mit einfachem Schutz vor Adress-Sammlern:
// - im JavaScript steht sie nur in Teilen (profile.email in content.js),
// - im Text der Seite steckt vor dem @ ein unsichtbares Leerzeichen, sodass dort keine gültige
//   Adresse steht (unsichtbare Teile landen nicht in der Zwischenablage und nicht beim Screenreader),
// - den mailto-Link bekommt das Element erst, wenn jemand mit Maus, Finger oder Tastatur darauf geht.
// Für Menschen sieht die Adresse normal aus und lässt sich kopieren.
const mailto = () => `mailto:${profile.email.user}@${profile.email.domain}`

export function EmailText() {
  return (
    <>
      {profile.email.user}
      <span hidden> </span>@{profile.email.domain}
    </>
  )
}

export default function EmailLink({ children, ...props }) {
  const [armed, setArmed] = useState(false)
  const arm = () => setArmed(true)

  return (
    <a
      {...props}
      href={armed ? mailto() : '#'}
      onPointerEnter={arm}
      onFocus={arm}
      onClick={(event) => {
        if (armed) return
        event.preventDefault()
        window.location.href = mailto()
      }}
    >
      {children ?? <EmailText />}
    </a>
  )
}
