import { create } from "zustand";
import { combine } from "zustand/middleware";

import { ImageQuality, VariantCount } from "@/types/app";
import {
  addCredits as addCreditsInService,
  getCredits as getCreditsFromService,
  spendCredits as spendCreditsInService,
} from "@/services/storage/creditsService";

const initialCreditsState = {
  credits: 0,
  loaded: false,
};

export const useCreditsStore = create(
  combine(initialCreditsState, (set, get) => ({
    loadCredits: async () => {
      if (get().loaded) {
        return get().credits;
      }

      console.log("[creditsStore] load credits");
      const credits = await getCreditsFromService();
      set({ credits, loaded: true });
      return credits;
    },
    spendCredits: async (quality: ImageQuality, variantCount: VariantCount) => {
      console.log("[creditsStore] spend credits", { quality, variantCount });
      await spendCreditsInService(quality, variantCount);
      const credits = await getCreditsFromService();
      set({ credits, loaded: true });
    },
    addCredits: async (amount: number) => {
      console.log("[creditsStore] add credits", amount);
      await addCreditsInService(amount);
      const credits = await getCreditsFromService();
      set({ credits, loaded: true });
    },
  })),
);
