// Modal widths in px, keyed by the size names callers already pass.
export const MODAL_WIDTH = { xs: 400, sm: 520, md: 720, lg: 960 } as const;

export type ModalSize = keyof typeof MODAL_WIDTH;
