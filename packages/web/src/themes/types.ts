export type ColorSchemeId = string

export interface ThemeMeta {
  id: ColorSchemeId
  name: string
  colors: { light: string; dark: string }
}
