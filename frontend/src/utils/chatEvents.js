// Öffnet den Chat unten rechts von anderer Stelle aus (z. B. aus einer Projekt-Detailansicht)
export const OPEN_CHAT_EVENT = 'chat:open'

export const openChat = () => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))
