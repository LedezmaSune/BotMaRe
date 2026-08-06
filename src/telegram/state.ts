export interface WizardState {
  step: "WAITING_NUMBERS" | "WAITING_MESSAGE" | "WAITING_DATE" | "WAITING_DIFFUSION_NUMBERS" | "WAITING_DIFFUSION_MESSAGE" | "WAITING_LISTA_ID";
  numbers?: string;
  message?: string;
  date?: string;
  listaContext?: 'contactos' | 'grupos';
  listaAction?: 'add' | 'ban' | 'remove';
}
export const wizardState = new Map<string, WizardState>();

export interface RestoreState {
  fileId: string;
  fileName: string;
}
export const pendingRestores = new Map<string, RestoreState>();
