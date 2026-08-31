export const CSI = `${String.fromCharCode(27)}[`;
export const ENTER_ALT_SCREEN = `${CSI}?1049h${CSI}?25l`;
export const EXIT_ALT_SCREEN = `${CSI}?1049l${CSI}?25h`;
export const CLEAR_SCREEN = `${CSI}?25l${CSI}H${CSI}2J`;
export const CTRL_C = String.fromCharCode(3);

/** Apply dim styling with a targeted reset so surrounding terminal styles survive. */
export function dim(text: string): string {
  return `${CSI}2m${text}${CSI}22m`;
}
