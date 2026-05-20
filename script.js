const ocean    = document.querySelector('.ocean')
const boya     = document.getElementById('boya')
const luz      = document.getElementById('luz')
const ballena  = document.getElementById('ballena')
const barco    = document.getElementById('barco')
const superficie = document.getElementById('superficie')
const perfil     = document.getElementById('perfil')
const perfilPath = document.getElementById('perfil-path')
const perfilSal  = document.getElementById('perfil-sal')
const perfilLen  = perfilPath.getTotalLength()
const perfilSalLen = perfilSal.getTotalLength()
perfilPath.style.strokeDasharray = perfilLen
perfilPath.style.strokeDashoffset = perfilLen
perfilSal.style.strokeDasharray = perfilSalLen
perfilSal.style.strokeDashoffset = perfilSalLen
const depthNum = document.getElementById('depth-num')
const etapas   = [0,1,2,3,4,5,6].map(i => document.getElementById('e' + i))
const satelite = document.getElementById('satelite')
const cielo    = document.getElementById('cielo')
const transmision = document.getElementById('transmision')

// ── helpers ──────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t }

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ]
}

function sampleKeyframes(kf, t) {
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1]
    if (t >= a.t && t <= b.t) {
      const local = (t - a.t) / (b.t - a.t)
      return typeof a.v === 'number'
        ? lerp(a.v, b.v, local)
        : lerpColor(a.v, b.v, local)
    }
  }
  return kf[kf.length - 1].v
}

// ── keyframes ────────────────────────────────────────
// Y como fracción del viewport (0=top, 1=bottom)

// profundidad de la boya en metros, según el scroll
const depthKf = [
  { t: 0.00, v: 0 },
  { t: 0.28, v: 0 },
  { t: 0.40, v: 1000 },
  { t: 0.50, v: 1100 },
  { t: 0.64, v: 2000 },
  { t: 0.84, v: 0 },
  { t: 1.00, v: 0 },
]

// posición vertical de la línea de agua en el viewport (0 = arriba, 0.5 = mitad)
// arranca al medio (sky + water), se va al tope cuando se sumerge, vuelve al medio al transmitir
const waterLineKf = [
  { t: 0.00, v: 0.50 },
  { t: 0.22, v: 0.50 },
  { t: 0.38, v: 0.00 },  // cámara se sumerge: agua ocupa todo el alto
  { t: 0.84, v: 0.00 },  // ascenso completo: aún full agua para ver perfil entero
  { t: 0.92, v: 0.50 },  // transmitiendo: superficie vuelve al medio
  { t: 1.00, v: 0.50 },
]

// profundidad (m) → y de viewport, dado el waterLine actual
function depthToY(depth, waterLineY) {
  // boya en superficie: su cuerpo cilíndrico queda justo en la línea de agua (la antenita afuera)
  const surfaceY = waterLineY - 0.025
  const bottomY = 0.86  // 2000m queda cerca del fondo del viewport
  return surfaceY + (depth / 2000) * (bottomY - surfaceY)
}

// deriva horizontal: durante la fase de drift se mueve de costado
const boyaX = [
  { t: 0.00, v: 70 },  // a un costado del barquito, no encima
  { t: 0.32, v: 30 },
  { t: 0.40, v: 0 },
  { t: 0.50, v: 90 },
  { t: 0.60, v: 30 },
  { t: 0.84, v: 0 },
  { t: 1.00, v: 0 },
]

// Color de fondo — de superficie iluminada a profundidad oscura
const bgColor = [
  { t: 0.00, v: [170, 215, 232] },
  { t: 0.28, v: [120, 195, 220] }, // sigue clara durante paso 01
  { t: 0.36, v: [40,  140, 180] },
  { t: 0.44, v: [10,  70,  110] },
  { t: 0.54, v: [4,   36,  68]  },
  { t: 0.60, v: [3,   14,  36]  }, // 1000m
  { t: 0.66, v: [2,   8,   22]  }, // 2000m
  { t: 0.80, v: [30,  120, 165] },
  { t: 0.90, v: [170, 215, 232] },
  { t: 1.00, v: [170, 215, 232] },
]

// Etapa de texto visible por progreso
const etapaKf = [
  { t: 0.00, e: 0 },
  { t: 0.28, e: 1 },
  { t: 0.42, e: 2 },
  { t: 0.52, e: 3 },
  { t: 0.66, e: 4 },
  { t: 0.85, e: 5 },
  { t: 0.94, e: 6 },
]

function currentEtapa(t) {
  for (let i = etapaKf.length - 1; i >= 0; i--) {
    if (t >= etapaKf[i].t) return etapaKf[i].e
  }
  return 0
}

// Convierte Y (fracción vh) a metros
function yToDepth(y) {
  if (y <= 0.71) return Math.max(0, Math.round((y - 0.47) / (0.71 - 0.47) * 1000))
  return Math.round(1000 + (y - 0.71) / (0.92 - 0.71) * 1000)
}

// ── loop ─────────────────────────────────────────────

function update() {
  const max = document.body.scrollHeight - window.innerHeight
  const p = Math.min(window.scrollY / max, 1)

  // posición boya basada en profundidad real + línea de agua dinámica
  const depthM = sampleKeyframes(depthKf, p)
  const waterLineY = sampleKeyframes(waterLineKf, p)
  const y = depthToY(depthM, waterLineY)
  const x = sampleKeyframes(boyaX, p)
  boya.style.top = (y * 100) + 'vh'
  boya.style.transform = `translateX(calc(-50% + ${x}px))`

  // actualizo línea de agua, cielo y perfil según waterLineY
  const wlPct = waterLineY * 100
  cielo.style.height = wlPct + '%'
  superficie.style.top = wlPct + '%'
  perfil.style.top = wlPct + '%'
  perfil.style.height = (100 - wlPct) + '%'
  barco.style.top = (wlPct - 12) + '%'

  // color fondo
  const [r, g, b] = sampleKeyframes(bgColor, p)
  ocean.style.background = `rgb(${r},${g},${b})`

  // luz superficie — visible cerca de la superficie (al principio y al final)
  const luzInicio = Math.max(0, 1 - p / 0.38)
  const luzFinal  = Math.max(0, (p - 0.80) / 0.08)
  const luzOpacity = Math.min(1, Math.max(luzInicio, luzFinal))
  luz.style.opacity = luzOpacity
  superficie.style.opacity = luzOpacity

  // modo superficie (texto oscuro + cielo visible)
  const enSuperficie = p < 0.22 || p > 0.88
  ocean.classList.toggle('superficie-modo', enSuperficie)
  cielo.classList.toggle('visible', enSuperficie)

  // barco: queda en la superficie durante paso 01, después se aleja navegando
  const barcoOp = p < 0.28 ? 1 : Math.max(0, 1 - (p - 0.28) / 0.14)
  const barcoDrift = Math.max(0, (p - 0.20)) / 0.22 * 380
  barco.style.opacity = barcoOp
  barco.style.transform = `translateX(calc(-50% + ${Math.min(barcoDrift, 380)}px))`

  // profundidad ya está en metros
  const depth = Math.max(0, Math.round(depthM))
  depthNum.textContent = depth

  // ballena solo en la zona de deriva (con su propio movimiento, no sigue a la boya)
  ballena.classList.toggle('visible', p > 0.40 && p < 0.60)

  // otros bichos según profundidad (depth)
  // posicionar bichos dinámicamente según su profundidad objetivo
  const bichos = {
    peces:    30,
    tortuga:  20,
    delfines: 25,
    medusa:   500,
    krill:    900,
    calamar:  1400,
    abisal:   1900,
    estrella: 1980,
    ballena:  900,
  }
  for (const [id, prof] of Object.entries(bichos)) {
    const el = document.getElementById(id)
    if (el) el.style.top = (depthToY(prof, waterLineY) * 100) + 'vh'
  }

  document.getElementById('peces').classList.toggle('visible',
    depth < 80 && (p > 0.18 && p < 0.30 || p > 0.85))
  document.getElementById('tortuga').classList.toggle('visible',
    depth < 60 && p > 0.05 && p < 0.28)
  document.getElementById('delfines').classList.toggle('visible',
    depth < 100 && p > 0.86)
  document.getElementById('medusa').classList.toggle('visible',
    depth > 300 && depth < 800)
  document.getElementById('krill').classList.toggle('visible',
    depth > 600 && depth < 1200)
  document.getElementById('calamar').classList.toggle('visible',
    depth > 1100 && depth < 1700 && p > 0.60)
  document.getElementById('estrella').classList.toggle('visible',
    depth > 1850)
  document.getElementById('abisal').classList.toggle('visible',
    depth > 1700)

  // satélite y transmisión aparecen en el paso final
  satelite.classList.toggle('visible', p > 0.85)
  transmision.classList.toggle('visible', p > 0.87)

  // glow al subir midiendo
  const subiendo = p > 0.64 && p < 0.84
  boya.classList.toggle('midiendo', subiendo)

  // perfil que se dibuja mientras sube y queda dibujado durante la transmisión
  perfil.classList.toggle('activo', p > 0.62 && p < 0.97)
  const subProg = Math.max(0, Math.min(1, (p - 0.64) / (0.84 - 0.64)))
  perfilPath.style.strokeDashoffset = perfilLen * (1 - subProg)
  perfilSal.style.strokeDashoffset  = perfilSalLen * (1 - subProg)

  // textos
  const e = currentEtapa(p)
  etapas.forEach((el, i) => el.classList.toggle('visible', i === e))
}

window.addEventListener('scroll', update, { passive: true })
update()
