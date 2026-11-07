export interface AvoidItem {
  emoji: string
  name: string
  /** Por qué se evita. */
  reason: string
  /** Cómo ofrecerlo de forma segura o qué alternativa usar (opcional). */
  alternative?: string
}

/** Alimentos que no se deben ofrecer antes del año. */
export const AVOID_BEFORE_ONE: AvoidItem[] = [
  {
    emoji: '🍯',
    name: 'Miel',
    reason: 'Puede contener esporas de botulismo, peligrosas para el intestino del bebé. Tampoco en recetas.',
  },
  {
    emoji: '🧂',
    name: 'Sal añadida',
    reason: 'Sus riñones aún son inmaduros. Ojo con embutidos, quesos curados y pastillas de caldo.',
    alternative: 'Separa su ración antes de salar la comida familiar y da sabor con hierbas y especias suaves.',
  },
  {
    emoji: '🍬',
    name: 'Azúcar y alimentos azucarados',
    reason: 'Galletas, bollería, zumos, cacao azucarado o yogures de sabores acostumbran al paladar al dulce y favorecen las caries.',
    alternative: 'Endulza las recetas con fruta madura, como plátano o manzana asada.',
  },
  {
    emoji: '🥛',
    name: 'Leche de vaca como bebida',
    reason: 'Desplaza a la leche materna o de fórmula y aporta poco hierro.',
    alternative: 'Sí puede usarse en recetas, y yogur o queso fresco pasteurizado desde los 6 meses.',
  },
  {
    emoji: '🐟',
    name: 'Pescados grandes con mercurio',
    reason: 'Pez espada (emperador), atún rojo, tiburón (cazón, marrajo, tintorera) y lucio. Las autoridades sanitarias españolas recomiendan evitarlos hasta los 10 años.',
    alternative: 'Merluza, lenguado, salmón, sardina o bacalao fresco.',
  },
  {
    emoji: '🍳',
    name: 'Huevo crudo o poco hecho',
    reason: 'Riesgo de salmonela: nada de huevo pasado por agua, mayonesa casera, mousse o masas crudas.',
    alternative: 'Huevo duro o tortilla bien cuajada.',
  },
  {
    emoji: '🧀',
    name: 'Quesos sin pasteurizar',
    reason: 'Los quesos de leche cruda pueden transmitir listeria. Revisa la etiqueta.',
    alternative: 'Quesos frescos pasteurizados y bajos en sal.',
  },
  {
    emoji: '🌊',
    name: 'Algas',
    reason: 'Pueden aportar un exceso de yodo (y algunas, como la hijiki, arsénico).',
  },
]

/** Alimentos con riesgo de atragantamiento. */
export const CHOKING_RISK: AvoidItem[] = [
  {
    emoji: '🥜',
    name: 'Frutos secos enteros o en trozos',
    reason: 'Son duros y pequeños. Evítalos enteros hasta los 5 años.',
    alternative: 'Molidos en masas y porridge, o en crema untada en capa fina.',
  },
  {
    emoji: '🍇',
    name: 'Uvas, tomates cherry y aceitunas enteros',
    reason: 'Su forma redonda puede taponar por completo la vía aérea. Tampoco en rodajas tipo moneda.',
    alternative: 'Siempre en cuartos a lo largo (los arándanos, aplastados).',
  },
  {
    emoji: '🥕',
    name: 'Zanahoria o manzana cruda dura',
    reason: 'Se rompen en trozos duros que no puede deshacer con las encías.',
    alternative: 'Cocidas o asadas, o ralladas finas. En láminas finas cuando tenga molares.',
  },
  {
    emoji: '🌭',
    name: 'Salchichas en rodajas',
    reason: 'La rodaja tiene forma de moneda y textura gomosa. Además son ultraprocesadas: mejor evitarlas antes de los 2 años.',
    alternative: 'Si se ofrecen más adelante, cortadas a lo largo en tiras finas.',
  },
  {
    emoji: '🍿',
    name: 'Palomitas',
    reason: 'Ligeras y de forma irregular: se aspiran fácilmente. Evítalas hasta los 4 años.',
  },
  {
    emoji: '🍊',
    name: 'Gajos de mandarina enteros',
    reason: 'Al notar el jugo puede succionar el gajo entero de golpe.',
    alternative: 'Gajos cortados en trocitos y sin pepitas.',
  },
  {
    emoji: '🍭',
    name: 'Caramelos y golosinas duras',
    reason: 'Son de los alimentos más peligrosos, además de por el azúcar. No los ofrezcas antes de los 5 años.',
  },
  {
    emoji: '🥄',
    name: 'Cremas de frutos secos a cucharadas',
    reason: 'Son muy pegajosas y pueden quedarse adheridas al paladar o la garganta.',
    alternative: 'Untadas en capa fina sobre pan o fruta, o diluidas en yogur.',
  },
]

export interface SafetyTip {
  emoji: string
  title: string
  text: string
}

/** Consejos básicos de seguridad para practicar BLW. */
export const SAFETY_TIPS: SafetyTip[] = [
  {
    emoji: '🪑',
    title: 'Siempre sentado y erguido',
    text: 'En la trona o en tu regazo. Nunca recostado, en el carrito, la hamaca o la silla del coche.',
  },
  {
    emoji: '👀',
    title: 'Nunca solo',
    text: 'Quédate con él durante toda la comida y sin distracciones (pantallas, juguetes).',
  },
  {
    emoji: '✋',
    title: 'Que coma él',
    text: 'Deja que se lleve la comida a la boca por sí mismo. No le metas trozos en la boca ni le obligues.',
  },
  {
    emoji: '👍',
    title: 'Prueba del pulgar',
    text: 'Si no puedes aplastar el alimento fácilmente entre tus dedos pulgar e índice, cocínalo más.',
  },
  {
    emoji: '📏',
    title: 'Tamaño según la etapa',
    text: 'Al principio, bastones del tamaño de tu dedo que sobresalgan de su puño. Con la pinza (≈ 9 meses), trocitos pequeños y blandos.',
  },
  {
    emoji: '😮',
    title: 'Arcada no es atragantamiento',
    text: 'La arcada es ruidosa (tose, saca la lengua, se pone rojo): es un reflejo que le protege. Mantén la calma y no metas los dedos en su boca.',
  },
  {
    emoji: '🚨',
    title: 'Atragantamiento: es silencioso',
    text: 'Si no puede toser, llorar ni respirar o se pone azulado, actúa con la maniobra de desobstrucción para lactantes y llama al 112.',
  },
  {
    emoji: '🎓',
    title: 'Fórmate en primeros auxilios',
    text: 'Muchos centros de salud ofrecen talleres de primeros auxilios pediátricos. Merece la pena hacer uno.',
  },
]
