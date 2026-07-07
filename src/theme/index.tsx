import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

const STORAGE_KEY = "byebills:colorMode";

/**
 * byeBills design tokens — light + dark. Same keys in both palettes, so any
 * component reading `colors` from the theme re-colours automatically.
 */

export const lightColors = {
  brand: "#15A95E",
  brandPressed: "#0F8A4C",
  brandTint: "#E6F6EC",
  brandInk: "#0C6B3B",
  onBrand: "#FFFFFF", // text/icon on a brand-filled surface

  purple: "#7A5AF8",
  purpleTint: "#ECE9FE",
  purpleInk: "#4B2FC4",

  ink: "#14201A",
  ink600: "#5B6B63",
  ink400: "#9AA6A0",

  surface: "#FFFFFF",
  canvas: "#F5F7F6",
  cream: "#FBF7EE",
  border: "#E4E9E6",
  divider: "#EEF2F0",
  white: "#FFFFFF",

  success: "#15A95E",
  warning: "#F5A524",
  error: "#E5484D",
  info: "#3B82F6",

  successTint: "#E6F6EC",
  warningTint: "#FDF1DC",
  errorTint: "#FCE9E9",
  warnInk: "#9A6300",
  errInk: "#B42318",

  track: "#E9EDEA",
  subtle: "#F1F4F2",
  selectedTint: "#F2FBF6",
  controlBorder: "#CDD5D0",
  disabledBg: "#E7EBE9",
};

export type Palette = typeof lightColors;

export const darkColors: Palette = {
  brand: "#2FD27E",
  brandPressed: "#28B86C",
  brandTint: "#16321F",
  brandInk: "#7BE3AC",
  onBrand: "#06210F",

  purple: "#9B82FF",
  purpleTint: "#241E4D",
  purpleInk: "#C9BCFF",

  ink: "#F4F7F5",
  ink600: "#A6B2AC",
  ink400: "#6E7C76",

  surface: "#131C30",
  canvas: "#0A0F1C",
  cream: "#131C30",
  border: "#243049",
  divider: "#1C2740",
  white: "#FFFFFF",

  success: "#2FD27E",
  warning: "#F5B544",
  error: "#FF6B6B",
  info: "#5AA2FF",

  successTint: "#16321F",
  warningTint: "#2E2410",
  errorTint: "#3A1C20",
  warnInk: "#F5C97A",
  errInk: "#FF9B9B",

  track: "#222C44",
  subtle: "#1C2740",
  selectedTint: "#16321F",
  controlBorder: "#3A465C",
  disabledBg: "#1C2740",
};

/** Light palette as a static fallback (also used by pre-render contexts). */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  sheet: 40,
  pill: 999,
} as const;

export const fontSize = {
  display: 40,
  h1: 30,
  h2: 22,
  title: 18,
  body: 16,
  small: 14,
  label: 12,
} as const;

export const fonts = {
  regular: "Nunito_400Regular",
  medium: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extra: "Nunito_800ExtraBold",
} as const;

/** Type scale — font only. Colour is applied by the Text component from the theme. */
export const type = {
  display: { fontFamily: fonts.extra, fontSize: fontSize.display },
  h1: { fontFamily: fonts.extra, fontSize: fontSize.h1 },
  h2: { fontFamily: fonts.bold, fontSize: fontSize.h2 },
  title: { fontFamily: fonts.bold, fontSize: fontSize.title },
  body: { fontFamily: fonts.regular, fontSize: fontSize.body },
  bodyStrong: { fontFamily: fonts.medium, fontSize: fontSize.body },
  small: { fontFamily: fonts.regular, fontSize: fontSize.small },
  label: { fontFamily: fonts.bold, fontSize: fontSize.label, letterSpacing: 0.6 },
} as const;

// ---------- Theme context ----------

export type ColorMode = "light" | "dark";

type ThemeContextValue = {
  mode: ColorMode;
  isDark: boolean;
  colors: Palette;
  toggle: () => void;
  setMode: (mode: ColorMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  isDark: false,
  colors: lightColors,
  toggle: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<ColorMode | null>(null);

  // Load the saved preference once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark") setOverride(v);
    });
  }, []);

  const apply = useCallback((m: ColorMode) => {
    setOverride(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const mode: ColorMode = override ?? (system === "dark" ? "dark" : "light");
  const palette = mode === "dark" ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      colors: palette,
      toggle: () => apply(mode === "dark" ? "light" : "dark"),
      setMode: apply,
    }),
    [mode, palette, apply],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Memoise a themed style factory; it recomputes when the palette changes.
 * The factory should call StyleSheet.create itself, e.g.
 *   const makeStyles = (c: Palette) => StyleSheet.create({ box: { backgroundColor: c.surface } });
 */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const { colors: c } = useTheme();
  return useMemo(() => factory(c), [c, factory]);
}

export const theme = { colors: lightColors, spacing, radii, fontSize, fonts, type };
export type Theme = typeof theme;
export default theme;
