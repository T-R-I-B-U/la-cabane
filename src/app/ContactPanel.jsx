export function ContactPanel({ contact, onClose }) {
  return (
    <div
      className="contact-overlay"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="contact-card"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="contact-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
        <p className="contact-role">{contact.role}</p>
        <h2 className="contact-name">{contact.name}</h2>
        {contact.email && (
          <p className="contact-email">
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </p>
        )}
      </div>
    </div>
  )
}
