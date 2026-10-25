// Tremor chartColors [v0.1.0]

export type ColorUtility = "bg" | "stroke" | "fill" | "text"

// Quicktalog chart series, in categorical slot order (see the series tokens
// in app/globals.css). Assign them in this order; never pick by hue.
export const chartColors = {
  amber: {
    bg: "bg-series-amber",
    stroke: "stroke-series-amber",
    fill: "fill-series-amber",
    text: "text-series-amber",
  },
  violet: {
    bg: "bg-series-violet",
    stroke: "stroke-series-violet",
    fill: "fill-series-violet",
    text: "text-series-violet",
  },
  magenta: {
    bg: "bg-series-magenta",
    stroke: "stroke-series-magenta",
    fill: "fill-series-magenta",
    text: "text-series-magenta",
  },
  green: {
    bg: "bg-series-green",
    stroke: "stroke-series-green",
    fill: "fill-series-green",
    text: "text-series-green",
  },
  blue: {
    bg: "bg-series-blue",
    stroke: "stroke-series-blue",
    fill: "fill-series-blue",
    text: "text-series-blue",
  },
  aqua: {
    bg: "bg-series-aqua",
    stroke: "stroke-series-aqua",
    fill: "fill-series-aqua",
    text: "text-series-aqua",
  },
  // Not a series hue: the folded "Other" bucket.
  gray: {
    bg: "bg-ink-3",
    stroke: "stroke-ink-3",
    fill: "fill-ink-3",
    text: "text-ink-3",
  },
} as const satisfies {
  [color: string]: {
    [key in ColorUtility]: string
  }
}

export type AvailableChartColorsKeys = keyof typeof chartColors

export const AvailableChartColors: AvailableChartColorsKeys[] = Object.keys(
  chartColors,
) as Array<AvailableChartColorsKeys>

export const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>()
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length])
  })
  return categoryColors
}

export const getColorClassName = (
  color: AvailableChartColorsKeys,
  type: ColorUtility,
): string => {
  const fallbackColor = {
    bg: "bg-ink-3",
    stroke: "stroke-ink-3",
    fill: "fill-ink-3",
    text: "text-ink-3",
  }
  return chartColors[color]?.[type] ?? fallbackColor[type]
}
