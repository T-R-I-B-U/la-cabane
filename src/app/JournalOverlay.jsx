import { useState, useCallback, useEffect } from 'react'
import { JOURNAL_PHOTOS, ARTICLE_PARAGRAPHS } from './journalData.js'
import styles from './JournalOverlay.module.css'

const FRAMES = [
  { id: 'villes-marques', page: 'left', top: '6%', left: '48%', width: '46%', rotate: '-3deg' },
  { id: 'grande-revolution', page: 'left', top: '54%', left: '10%', width: '50%', rotate: '2deg' },
  { id: 'naissance-altera', page: 'right', top: '5%', left: '38%', width: '52%', rotate: '2.5deg' },
  { id: 'premiere-cabane', page: 'right', top: '52%', left: '4%', width: '46%', rotate: '-2deg' },
]

function PhotoFrame({ frame, placed, dragging, onDragOver, onDrop, onRemove }) {
  const photo = placed ? JOURNAL_PHOTOS.find((p) => p.id === placed) : null
  return (
    <div
      className={`${styles.frame} ${photo ? styles.frameFilled : styles.frameEmpty} ${dragging && !photo ? styles.frameHover : ''}`}
      style={{ top: frame.top, left: frame.left, width: frame.width, '--rotate': frame.rotate }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {photo ? (
        <div
          className={styles.framePlaced}
          style={{ '--c': photo.color }}
          onClick={onRemove}
          title="Retirer"
        >
          <div className={styles.framePlacedImg} />
          <span className={styles.photoYear}>{photo.year}</span>
          <span className={styles.photoLabel}>{photo.label}</span>
        </div>
      ) : (
        <div className={styles.frameEmpty_inner}>
          <div className={styles.frameEmptyImg} />
          <span className={styles.frameHint}>···</span>
        </div>
      )}
    </div>
  )
}

function DraggablePhoto({ photo, isDragging, onDragStart, onDragEnd, index }) {
  return (
    <div
      className={`${styles.bankPhoto} ${isDragging ? styles.bankPhotoDragging : ''}`}
      style={{ '--c': photo.color, '--i': index }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={styles.bankPhotoImg} />
      <span className={styles.photoYear}>{photo.year}</span>
      <span className={styles.photoLabel}>{photo.label}</span>
    </div>
  )
}

const pageStyle = (b) => ({
  left: b.left + 'px',
  top: b.top + 'px',
  width: b.width + 'px',
  height: b.height + 'px',
})

export default function JournalOverlay({ leftBounds, rightBounds, onClose }) {
  const [placed, setPlaced] = useState({})
  const [dragging, setDragging] = useState(null)

  const placedPhotoIds = new Set(Object.values(placed).filter(Boolean))
  const available = JOURNAL_PHOTOS.filter((p) => !placedPhotoIds.has(p.id))
  const allPlaced = JOURNAL_PHOTOS.every((p) => placedPhotoIds.has(p.id))
  const allCorrect = allPlaced && FRAMES.every((f) => placed[f.id] === f.id)

  const onDragStart = useCallback((id) => setDragging(id), [])
  const onDragEnd = useCallback(() => setDragging(null), [])

  const onDrop = useCallback(
    (frameId) => {
      if (!dragging) return
      setPlaced((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((k) => {
          if (next[k] === dragging) next[k] = null
        })
        next[frameId] = dragging
        return next
      })
      setDragging(null)
    },
    [dragging]
  )

  const onRemove = useCallback((frameId) => {
    setPlaced((prev) => ({ ...prev, [frameId]: null }))
  }, [])

  useEffect(() => {
    if (!allCorrect) return
    const timer = setTimeout(onClose, 1500)
    return () => clearTimeout(timer)
  }, [allCorrect, onClose])

  const leftFrames = FRAMES.filter((f) => f.page === 'left')
  const rightFrames = FRAMES.filter((f) => f.page === 'right')

  return (
    <>
      <div
        className={styles.dim}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />

      <div className={styles.pageLeft} style={pageStyle(leftBounds)}>
        <p className={styles.tag}>Journal de bord</p>
        <h2 className={styles.title}>
          L&apos;histoire
          <br />
          d&apos;Altera
        </h2>
        <p className={styles.intro}>
          Quatre moments qui ont changé
          <br />
          le cours de l&apos;histoire.
        </p>
        <p className={styles.para} style={{ '--i': 0, top: '34%', left: '5%', width: '44%' }}>
          {ARTICLE_PARAGRAPHS[0].text}
        </p>
        <p className={styles.para} style={{ '--i': 1, top: '68%', left: '50%', width: '44%' }}>
          {ARTICLE_PARAGRAPHS[1].text}
        </p>
        {leftFrames.map((f) => (
          <PhotoFrame
            key={f.id}
            frame={f}
            placed={placed[f.id]}
            dragging={dragging}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(f.id)}
            onRemove={() => onRemove(f.id)}
          />
        ))}
      </div>

      <div className={styles.pageRight} style={pageStyle(rightBounds)}>
        <button className={styles.close} onClick={onClose} aria-label="Fermer">
          ✕
        </button>
        <p className={styles.tag} style={{ top: '5%', left: '5%' }}>
          Altera, 2050
        </p>
        <p className={styles.para} style={{ '--i': 0, top: '16%', left: '5%', width: '38%' }}>
          {ARTICLE_PARAGRAPHS[2].text}
        </p>
        <p className={styles.para} style={{ '--i': 1, top: '56%', left: '44%', width: '50%' }}>
          {ARTICLE_PARAGRAPHS[3].text}
        </p>
        <p className={styles.note}>
          &ldquo;Le temps remplaça la monnaie.
          <br />
          Le savoir devint bien commun.&rdquo;
        </p>
        {rightFrames.map((f) => (
          <PhotoFrame
            key={f.id}
            frame={f}
            placed={placed[f.id]}
            dragging={dragging}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(f.id)}
            onRemove={() => onRemove(f.id)}
          />
        ))}
        {allPlaced && (
          <p className={`${styles.verdict} ${allCorrect ? styles.verdictOk : styles.verdictKo}`}>
            {allCorrect ? '✓ Bravo !' : '✗ Réessaie…'}
          </p>
        )}
      </div>

      <div className={styles.bank}>
        <p className={styles.bankLabel}>
          {available.length > 0 ? 'Glisse les photos' : 'Toutes placées !'}
        </p>
        <div className={styles.bankList}>
          {available.map((photo, i) => (
            <DraggablePhoto
              key={photo.id}
              photo={photo}
              index={i}
              isDragging={dragging === photo.id}
              onDragStart={() => onDragStart(photo.id)}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      </div>
    </>
  )
}
