export type StartScanActionState = {
  formError: string | null;
  showUpgradeCta: boolean;
  submittedUrl: string;
  urlError: string | null;
};

export const initialStartScanActionState: StartScanActionState = {
  formError: null,
  showUpgradeCta: false,
  submittedUrl: "",
  urlError: null,
};
