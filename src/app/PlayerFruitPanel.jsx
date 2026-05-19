import { useState } from 'react'
import './PlayerFruitPanel.css'
import { AddSavoirModal } from './AddSavoirModal'

export function PlayerFruitPanel({ playerName, onClose }) {
  const [isAddSavoirOpen, setIsAddSavoirOpen] = useState(false)
  return (
    <>
      <div className="pfp-overlay" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
        <div
          className="pfp-content"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left card */}
          <div className="pfp-left-card">
            <div className="pfp-left-inner">
              <div className="pfp-top-section">
                <img
                  className="pfp-fruit-img"
                  src="/player-panel/fruit.webp"
                  alt="Fruit du joueur"
                  aria-hidden="true"
                />
                <p className="pfp-player-name">{playerName || 'Visiteur·se'}</p>
              </div>
              <div className="pfp-bottom-section">
                <p className="pfp-role">Jury des Gobelins</p>
                <p className="pfp-desc-label">Description</p>
                <p className="pfp-desc-text">
                  Juré spécialisé en 3D et expériences WebGL immersives, passionné par les récits du
                  futur et nourri par la curiosité de l&apos;histoire des civilisations. À la
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
                    src="/player-panel/icon-passeur.svg"
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
                  onClick={() => setIsAddSavoirOpen(true)}
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
                    src="/player-panel/icon-apprenti.svg"
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
                    src="/player-panel/icon-favoris.svg"
                    alt=""
                    aria-hidden="true"
                  />
                  <div className="pfp-card-title-group">
                    <p className="pfp-card-title">Favoris</p>
                  </div>
                </div>
                <div className="pfp-leaf-slots">
                  <div className="pfp-leaf-slot pfp-leaf-slot--flex">
                    <img
                      className="pfp-leaf-img"
                      src="/player-panel/leaf.webp"
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                  <div className="pfp-leaf-slot pfp-leaf-slot--flex">
                    <img
                      className="pfp-leaf-img"
                      src="/player-panel/leaf.webp"
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                  <div className="pfp-leaf-slot pfp-leaf-slot--flex">
                    <img
                      className="pfp-leaf-img"
                      src="/player-panel/leaf.webp"
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
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
      </div>

      {isAddSavoirOpen && <AddSavoirModal onClose={() => setIsAddSavoirOpen(false)} />}
    </>
  )
}
