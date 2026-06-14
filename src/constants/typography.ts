export const typography = {
  sizes: {
    xs:  11,
    sm:  13,
    md:  15,
    lg:  17,
    xl:  20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  weights: {
    regular:   "400" as const,
    medium:    "500" as const,
    semibold:  "600" as const,
    bold:      "700" as const,
    extrabold: "800" as const,
  },
  lineHeights: {
    tight:  1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight:  -0.5,
    normal: 0,
    wide:   0.5,
    wider:  1,
    widest: 2,
  },
} as const;
