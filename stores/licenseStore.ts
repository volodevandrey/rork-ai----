import { create } from "zustand";
import { combine } from "zustand/middleware";

import {
  activateLicense as activateInService,
  getLicenseStatus,
  LicenseInfo,
  removeLicense as removeInService,
} from "@/services/license/licenseService";

const initialLicenseState = {
  isActive: false,
  license: null as LicenseInfo | null,
  daysLeft: 0,
  loaded: false,
};

export const useLicenseStore = create(
  combine(initialLicenseState, (set, get) => ({
    loadLicense: async () => {
      console.log("[licenseStore] loading license status");
      const status = await getLicenseStatus();
      set({
        isActive: status.isActive,
        license: status.license,
        daysLeft: status.daysLeft,
        loaded: true,
      });
      return status.isActive;
    },
    activate: async (key: string) => {
      console.log("[licenseStore] activating key");
      const license = await activateInService(key);
      const now = Date.now();
      const dayMs = 86_400_000;
      const daysLeft = Math.max(0, Math.ceil((license.expiresAt - now) / dayMs));
      set({
        isActive: true,
        license,
        daysLeft,
        loaded: true,
      });
    },
    removeLicense: async () => {
      console.log("[licenseStore] removing license");
      await removeInService();
      set({
        isActive: false,
        license: null,
        daysLeft: 0,
      });
    },
  })),
);
