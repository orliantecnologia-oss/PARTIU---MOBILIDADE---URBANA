/**
 * PARTIU — Theme Engine & Tokens "Azul Tech Premium"
 *
 * Bridges design tokens to styling layers across web and mobile.
 */

import { colors } from "./colors";
import { gradients, shadows, radii, spacing, typography, components } from "./design-tokens";

export { colors, gradients, shadows, radii, spacing, typography, components };

export const theme = {
  colors,
  gradients,
  shadows,
  radii,
  spacing,
  typography,
  components,
} as const;

export type Theme = typeof theme;
export default theme;
