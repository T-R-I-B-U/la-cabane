import { useState } from 'react'
import './PlayerFruitPanel.css'
import { playOnce } from '../utils/audioStore'
import { AddSavoirModal } from './AddSavoirModal'
import { useFavorites } from '../utils/favoritesStore'

export function PlayerFruitPanel({
  playerName,
  onClose,
  hasSentSavoir = false,
  sentSavoirDrawing = null,
  sentSavoirTitle = null,
}) {
  const [isAddSavoirOpen, setIsAddSavoirOpen] = useState(false)
  const favorites = useFavorites()

  const handleClose = () => {
    playOnce('closeUi')
    onClose?.()
  }

  return (
    <>
      <div
        className="pfp-overlay"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {hasSentSavoir ? (
          /* ── Layout "après envoi" ── */
          <div className="pfp-content pfp-content--sent">
            {/* Colonne gauche : profil + apprenti */}
            <div className="pfp-left-col">
              {/* Carte profil */}
              <div className="pfp-card pfp-left-profile-card">
                <button
                  type="button"
                  className="pfp-close-btn"
                  onClick={handleClose}
                  aria-label="Fermer"
                >
                  <img
                    src="/player-panel/icon-close.webp"
                    alt=""
                    aria-hidden="true"
                    width="30"
                    height="30"
                  />
                </button>
                <div className="pfp-profile-inner">
                  <img
                    className="pfp-card-icon"
                    src="/player-panel/icon-card.webp"
                    alt=""
                    aria-hidden="true"
                  />
                  <p className="pfp-player-name">{playerName || 'Visiteur·se'}</p>
                  <img
                    className="pfp-fruit-img pfp-fruit-img--sent"
                    src="/player-panel/fruit.webp"
                    alt=""
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Carte Apprenti */}
              <div className="pfp-card">
                <div className="pfp-card-header">
                  <img
                    className="pfp-card-icon"
                    src="/player-panel/icon-apprenti.webp"
                    alt=""
                    aria-hidden="true"
                  />
                  <div className="pfp-card-title-group">
                    <p className="pfp-card-title">Apprenti</p>
                    <p className="pfp-card-subtitle">Mes savoirs</p>
                  </div>
                </div>
                <div className="pfp-sent-leaf-slot">
                  <img
                    className="pfp-leaf-img"
                    src={sentSavoirDrawing ?? '/player-panel/leaf.webp'}
                    alt=""
                    aria-hidden="true"
                  />
                  {sentSavoirTitle && <p className="pfp-sent-leaf-title">{sentSavoirTitle}</p>}
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="pfp-right">
              {/* Ligne 1 : Passeur + Favoris */}
              <div className="pfp-row">
                {/* Passeur */}
                <div className="pfp-card">
                  <div className="pfp-card-header">
                    <img
                      className="pfp-card-icon"
                      src="/player-panel/icon-passeur.webp"
                      alt=""
                      aria-hidden="true"
                    />
                    <div className="pfp-card-title-group">
                      <p className="pfp-card-title">Passeur</p>
                      <p className="pfp-card-subtitle">Mes savoirs</p>
                    </div>
                  </div>
                  <button type="button" className="pfp-add-savoir pfp-add-savoir--sent" disabled>
                    <span className="pfp-add-icon">+</span>
                    <span className="pfp-add-label">Ajouter un savoir</span>
                  </button>
                </div>

                {/* Favoris */}
                <div className="pfp-card">
                  <div className="pfp-card-header">
                    <img
                      className="pfp-card-icon"
                      src="/player-panel/icon-favoris.webp"
                      alt=""
                      aria-hidden="true"
                    />
                    <div className="pfp-card-title-group">
                      <p className="pfp-card-title">Favoris</p>
                    </div>
                  </div>
                  {favorites.length > 0 && (
                    <div className="pfp-leaf-slots">
                      {Array.from({ length: 3 }).map((_, i) => {
                        const fav = favorites[i]
                        return (
                          <div
                            key={i}
                            className={`pfp-leaf-slot pfp-leaf-slot--flex${!fav ? ' pfp-leaf-slot--empty' : ''}`}
                          >
                            {fav && (
                              <>
                                <img
                                  className="pfp-leaf-img"
                                  src={fav.drawingData ?? '/player-panel/leaf.webp'}
                                  alt={fav.title}
                                />
                                <p className="pfp-fav-title">{fav.title}</p>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Ligne 2 : Ma Cabane pleine largeur */}
              <div className="pfp-row">
                <div className="pfp-card pfp-card--cabane">
                  <div
                    className="pfp-cabane-bg"
                    style={{ backgroundImage: 'url(/player-panel/cabane-bg.webp)' }}
                    aria-hidden="true"
                  />
                  <div className="pfp-cabane-text">
                    <p className="pfp-cabane-title">Ma cabane</p>
                    <p className="pfp-cabane-subtitle">Altera centre ville</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Layout par défaut ── */
          <div className="pfp-content">
            {/* Left card */}
            <div className="pfp-left-card">
              <div className="pfp-left-inner">
                <div className="pfp-top-section">
                  <img
                    className="pfp-card-icon"
                    src="/player-panel/icon-card.webp"
                    alt=""
                    aria-hidden="true"
                  />
                  <p className="pfp-player-name">{playerName || 'Visiteur·se'}</p>
                  <img
                    className="pfp-fruit-img"
                    src="/player-panel/fruit.webp"
                    alt=""
                    aria-hidden="true"
                  />
                </div>
                <div className="pfp-bottom-section">
                  <p className="pfp-role">Jury des Gobelins</p>
                  <p className="pfp-desc-label">Description</p>
                  <p className="pfp-desc-text">
                    Juré spécialisé en 3D et expériences WebGL immersives, passionné par les récits
                    du futur et nourri par la curiosité de l&apos;histoire des civilisations. À la
                    recherche d&apos;expériences visuelles innovantes capables d&apos;imaginer de
                    nouveaux rapports entre technologie, narration et avenir du monde.
                  </p>
                </div>
              </div>
            </div>

            {/* Right section */}
            <div className="pfp-right">
              {/* Top row */}
              <div className="pfp-row">
                {/* Passeur card */}
                <div className="pfp-card">
                  <div className="pfp-card-header">
                    <img
                      className="pfp-card-icon"
                      src="/player-panel/icon-passeur.webp"
                      alt=""
                      aria-hidden="true"
                    />
                    <div className="pfp-card-title-group">
                      <p className="pfp-card-title">Passeur</p>
                      <p className="pfp-card-subtitle">Mes savoirs</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pfp-add-savoir"
                    onClick={() => {
                      playOnce('clickUi')
                      setIsAddSavoirOpen(true)
                    }}
                  >
                    <span className="pfp-add-icon">+</span>
                    <span className="pfp-add-label">Ajouter un savoir</span>
                  </button>
                </div>

                {/* Apprenti card */}
                <div className="pfp-card">
                  <div className="pfp-card-header">
                    <img
                      className="pfp-card-icon"
                      src="/player-panel/icon-apprenti.webp"
                      alt=""
                      aria-hidden="true"
                    />
                    <div className="pfp-card-title-group">
                      <p className="pfp-card-title">Apprenti</p>
                      <p className="pfp-card-subtitle">Mes savoirs</p>
                    </div>
                  </div>
                  <div className="pfp-leaf-slots">
                    <div className="pfp-leaf-slot">
                      <img
                        className="pfp-leaf-img"
                        src="/player-panel/leaf.webp"
                        alt=""
                        aria-hidden="true"
                      />
                    </div>
                    <div className="pfp-leaf-slot">
                      <img
                        className="pfp-leaf-img"
                        src="/player-panel/leaf.webp"
                        alt=""
                        aria-hidden="true"
                      />
                    </div>
                    <div className="pfp-leaf-slot">
                      <img
                        className="pfp-leaf-img"
                        src="/player-panel/leaf.webp"
                        alt=""
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              <div className="pfp-row">
                {/* Favoris card */}
                <div className="pfp-card">
                  <div className="pfp-card-header">
                    <img
                      className="pfp-card-icon"
                      src="/player-panel/icon-favoris.webp"
                      alt=""
                      aria-hidden="true"
                    />
                    <div className="pfp-card-title-group">
                      <p className="pfp-card-title">Favoris</p>
                    </div>
                  </div>
                  <div className="pfp-leaf-slots">
                    {Array.from({ length: 3 }).map((_, i) => {
                      const fav = favorites[i]
                      return (
                        <div
                          key={i}
                          className={`pfp-leaf-slot pfp-leaf-slot--flex${!fav ? ' pfp-leaf-slot--empty' : ''}`}
                        >
                          {fav && (
                            <>
                              <img
                                className="pfp-leaf-img"
                                src={fav.drawingData ?? '/player-panel/leaf.webp'}
                                alt={fav.title}
                              />
                              <p className="pfp-fav-title">{fav.title}</p>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Ma Cabane card */}
                <div className="pfp-card pfp-card--cabane">
                  <div
                    className="pfp-cabane-bg"
                    style={{ backgroundImage: 'url(/player-panel/cabane-bg.webp)' }}
                    aria-hidden="true"
                  />
                  <div className="pfp-cabane-text">
                    <p className="pfp-cabane-title">Ma cabane</p>
                    <p className="pfp-cabane-subtitle">Altera centre ville</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAddSavoirOpen && <AddSavoirModal onClose={() => setIsAddSavoirOpen(false)} />}
    </>
  )
}
