import './AddSavoirModal.css'

export function AddSavoirModal() {
  return (
    <div
      className="asm-overlay"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="asm-card">
        <img className="asm-bg" src="/player-panel/add-savoir-bg.webp" alt="" aria-hidden="true" />

        {/* Enfant 1 – titre (Figma: flex flex-row items-end self-stretch) */}
        <div className="asm-title-wrapper">
          {/* Figma: flex flex-col h-full items-start mr-[-260px] shrink-0 */}
          <div className="asm-title-inner">
            {/* Figma: leading-[0] sur le wrapper, leading-[normal] sur chaque p */}
            <div className="asm-title-lines">
              <p className="asm-title-line">Ajoute&nbsp;</p>
              <p className="asm-title-line">un nouveau</p>
              <p className="asm-title-line">savoir</p>
            </div>
          </div>
        </div>

        {/* Enfant 2 – feuille + QR (Figma: flex flex-[1_0_0] flex-row items-end self-stretch) */}
        <div className="asm-leaf-wrapper">
          {/* Figma: flex flex-[1_0_0] gap-[10px] h-full items-end justify-end mr-[-260px] relative */}
          <div className="asm-leaf-container">
            {/* Figma: h-[459px] w-[855px] relative shrink-0 */}
            <div className="asm-leaf-img-wrap">
              <img
                className="asm-leaf"
                src="/player-panel/add-savoir-leaf.webp"
                alt=""
                aria-hidden="true"
              />
            </div>
            {/* Figma: two overlapping QR layers at left-[443px] top-[90px] size-[199px] */}
            <img
              className="asm-qr"
              src="/player-panel/add-savoir-qr1.svg"
              alt="QR code — scannez pour ajouter un savoir"
            />
            <img
              className="asm-qr"
              src="/player-panel/add-savoir-qr2.svg"
              alt=""
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Enfant 3 – SCAN-MOI (Figma: w-[288px] text-right text-[70px] shrink-0) */}
        <p className="asm-scan">SCAN-moi&nbsp;!</p>
      </div>
    </div>
  )
}
