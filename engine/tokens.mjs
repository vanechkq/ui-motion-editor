export const tapIndicator = {
  diameter: 80,
  color: "#9b9b9b",
  alpha: 61 / 255,
  blur: 20,
  inner: 0.59,
  edge: 0.61,
  enter: 0.15,
  press: 0.2,
  release: 0.2,
  scale: [1, 2.5, 1.35, 2],
  spring: { omega: 32, zeta: 0.82 },
};
export function resolveTokens(overrides = {}) {
  const tap = overrides.tapIndicator || {};
  return {
    tapIndicator: {
      ...structuredClone(tapIndicator),
      ...tap,
      spring: { ...tapIndicator.spring, ...tap.spring },
    },
  };
}
export const tapFields = [
  {
    path: "tokens.tapIndicator.diameter",
    label: "Размер",
    type: "number",
    min: 8,
    max: 200,
    step: 1,
    unit: "px",
  },
  { path: "tokens.tapIndicator.color", label: "Цвет", type: "color" },
  {
    path: "tokens.tapIndicator.alpha",
    label: "Непрозрачность",
    type: "range",
    min: 0,
    max: 1,
    step: "any",
  },
  {
    path: "tokens.tapIndicator.enter",
    label: "Появление",
    type: "number",
    min: 0.01,
    max: 2,
    step: 0.01,
    unit: "с",
  },
  {
    path: "tokens.tapIndicator.press",
    label: "Нажатие",
    type: "number",
    min: 0.01,
    max: 2,
    step: 0.01,
    unit: "с",
  },
  {
    path: "tokens.tapIndicator.release",
    label: "Отпускание",
    type: "number",
    min: 0.01,
    max: 2,
    step: 0.01,
    unit: "с",
  },
];
