import { create } from "zustand";
import {
  AppPhase,
  BrandKit,
  BrandScore,
  CanvasElement,
  GeneratedImage,
  ImageElement,
  TextElement,
} from "@/types";

interface AppStore {
  // ── Phase ──────────────────────────────────────────────────────────────────
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;

  // ── Brand Kit ──────────────────────────────────────────────────────────────
  brandKit: BrandKit | null;
  brandExtracting: boolean;
  brandError: string | null;
  setBrandKit: (kit: BrandKit) => void;
  setBrandExtracting: (v: boolean) => void;
  setBrandError: (err: string | null) => void;
  updateBrandKit: (partial: Partial<BrandKit>) => void;
  clearBrandKit: () => void;

  // ── Generated images (generation panel) ───────────────────────────────────
  generatedImages: GeneratedImage[];
  generating: boolean;
  generationError: string | null;
  setGenerating: (v: boolean) => void;
  setGenerationError: (err: string | null) => void;
  addGeneratedImages: (images: GeneratedImage[]) => void;
  updateImageScore: (id: string, score: BrandScore) => void;
  clearGeneratedImages: () => void;

  // ── Canvas elements ────────────────────────────────────────────────────────
  canvasElements: CanvasElement[];
  selectedElementId: string | null;
  addTextElement: (partial: Omit<TextElement, "id" | "zIndex">) => void;
  addImageElement: (partial: Omit<ImageElement, "id" | "zIndex">) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  updateCanvasImageScore: (id: string, score: BrandScore) => void;
}

let nextId = 1;
const uid = () => `el-${Date.now()}-${nextId++}`;

export const useStore = create<AppStore>((set, get) => ({
  // ── Phase ──────────────────────────────────────────────────────────────────
  phase: "brand-setup",
  setPhase: (phase) => set({ phase }),

  // ── Brand Kit ──────────────────────────────────────────────────────────────
  brandKit: null,
  brandExtracting: false,
  brandError: null,
  setBrandKit: (kit) => set({ brandKit: kit }),
  setBrandExtracting: (v) => set({ brandExtracting: v }),
  setBrandError: (err) => set({ brandError: err }),
  updateBrandKit: (partial) =>
    set((s) => ({ brandKit: s.brandKit ? { ...s.brandKit, ...partial } : null })),
  clearBrandKit: () => set({ brandKit: null }),

  // ── Generated images ───────────────────────────────────────────────────────
  generatedImages: [],
  generating: false,
  generationError: null,
  setGenerating: (v) => set({ generating: v }),
  setGenerationError: (err) => set({ generationError: err }),
  addGeneratedImages: (images) =>
    set((s) => ({ generatedImages: [...images, ...s.generatedImages] })),
  updateImageScore: (id, score) =>
    set((s) => ({
      generatedImages: s.generatedImages.map((img) =>
        img.id === id ? { ...img, score, scorePending: false } : img
      ),
    })),
  clearGeneratedImages: () => set({ generatedImages: [] }),

  // ── Canvas elements ────────────────────────────────────────────────────────
  canvasElements: [],
  selectedElementId: null,

  addTextElement: (partial) => {
    const maxZ = get().canvasElements.reduce((m, el) => Math.max(m, el.zIndex), 0);
    set((s) => ({
      canvasElements: [
        ...s.canvasElements,
        { ...partial, id: uid(), zIndex: maxZ + 1, type: "text" } as TextElement,
      ],
    }));
  },

  addImageElement: (partial) => {
    const maxZ = get().canvasElements.reduce((m, el) => Math.max(m, el.zIndex), 0);
    set((s) => ({
      canvasElements: [
        ...s.canvasElements,
        { ...partial, id: uid(), zIndex: maxZ + 1, type: "image" } as ImageElement,
      ],
    }));
  },

  updateElement: (id, partial) =>
    set((s) => ({
      canvasElements: s.canvasElements.map((el) =>
        el.id === id ? ({ ...el, ...partial } as CanvasElement) : el
      ),
    })),

  removeElement: (id) =>
    set((s) => ({
      canvasElements: s.canvasElements.filter((el) => el.id !== id),
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    })),

  selectElement: (id) => set({ selectedElementId: id }),

  updateCanvasImageScore: (id, score) =>
    set((s) => ({
      canvasElements: s.canvasElements.map((el) =>
        el.id === id && el.type === "image"
          ? ({ ...el, score, scorePending: false } as ImageElement)
          : el
      ),
    })),
}));
