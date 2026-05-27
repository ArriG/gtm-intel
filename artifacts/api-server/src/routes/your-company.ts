import { Router, type IRouter } from "express";
import {
  composeAccountBriefPrompt,
} from "../prompts/compose-system-prompt";
import {
  listSectorPackOptions,
  type SectorPackSelection,
} from "../prompts/pack-loader";
import type { YourCompanyInput } from "../lib/brief-ai";

const router: IRouter = Router();

function toSelectionMeta(selection: SectorPackSelection) {
  return {
    mode: selection.mode,
    packId: selection.pack?.id ?? null,
    packName: selection.pack?.name ?? null,
    autoDetectedId: selection.autoDetectedId,
    autoDetectedName: selection.autoDetectedName,
    matchScore: selection.matchScore,
    matchedKeywords: selection.matchedKeywords,
  };
}

router.get("/your-company/sector-packs", (_req, res): void => {
  const packs = listSectorPackOptions().map(pack => ({
    id: pack.id,
    name: pack.name,
    version: pack.version,
    geographies: pack.geographies,
  }));
  res.json({ packs });
});

router.post("/your-company/preview-prompt", (req, res): void => {
  const { yourCompany } = req.body as { yourCompany?: YourCompanyInput };

  if (!yourCompany || typeof yourCompany !== "object") {
    res.status(400).json({ error: "yourCompany is required" });
    return;
  }

  const composed = composeAccountBriefPrompt(yourCompany);

  res.json({
    systemPrompt: composed.systemPrompt,
    sectorPackSelection: toSelectionMeta(composed.sectorPackSelection),
    researchPack: composed.researchPack,
    availablePacks: listSectorPackOptions().map(pack => ({
      id: pack.id,
      name: pack.name,
      version: pack.version,
    })),
  });
});

export default router;
