export function ContactPanel({ contact, onClose }) {
  return (
    <div className="contact-overlay">
      <div className="contact-card">
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
