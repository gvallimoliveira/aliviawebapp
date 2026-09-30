import { describe, expect, it } from "vitest";
import {
  isOfficialPhoto,
  officialAliviaPhotoCount,
  officialPhotoDefinitions,
  OFFICIAL_PHOTO_PREFIX,
} from "@/pages/studio/officialPhotos";
import { photoTopics } from "@/pages/studio/photoMeaning";
import { DEFAULT_FRAMING, type StudioPhoto } from "@/pages/studio/photos";

const asPhoto = (id: string): StudioPhoto => ({
  id,
  storagePath: "official",
  label: "Imagem oficial",
  description: "Metadados oficiais",
  usage: "produto",
  credit: "Oficial Aliv.iA",
  sortOrder: 0,
  src: "data:image/jpeg;base64,AA==",
  ...DEFAULT_FRAMING,
});

describe("catálogo oficial Aliv.iA", () => {
  it("mantém dezoito imagens sintéticas fora dos IDs do banco", () => {
    const definitions = officialPhotoDefinitions();
    expect(officialAliviaPhotoCount).toBe(18);
    expect(definitions).toHaveLength(18);
    expect(new Set(definitions.map((item) => item.id)).size).toBe(18);
    expect(definitions.every((item) => item.id.startsWith(OFFICIAL_PHOTO_PREFIX))).toBe(true);
    expect(definitions.every((item) => item.assetUrl.startsWith("/__l5e/assets-v1/"))).toBe(true);
  });

  it("reconhece somente o prefixo oficial", () => {
    expect(isOfficialPhoto(asPhoto(`${OFFICIAL_PHOTO_PREFIX}clinical-agent`))).toBe(true);
    expect(isOfficialPhoto(asPhoto("72f039e8-5ee5-4824-8e25-197397210310"))).toBe(false);
  });

  it("limita cada tela ao tema clínico compatível", () => {
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}external-upload`))).toEqual(["external-upload"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}manual-pain-map`))).toEqual(["pain-map"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}manual-dynamometry`))).toEqual(["dynamometry"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}clinical-agent`))).toEqual(["clinical-agent", "evidence-library"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}evidence-library`))).toEqual(["clinical-agent", "evidence-library"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}agenda`))).toEqual(["agenda"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}record-pain-map`))).toEqual(["pain-map", "report", "clinical-impression"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}record-questionnaires`))).toEqual(["questionnaires", "report", "clinical-impression"]);
    expect(photoTopics(asPhoto(`${OFFICIAL_PHOTO_PREFIX}record-health-conditions`))).toEqual(["health-general", "report", "safety"]);
  });
});