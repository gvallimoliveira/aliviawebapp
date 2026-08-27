import HeroBlock from "@/pages/studio/blocks/HeroBlock";
import MarqueeBlock from "@/pages/studio/blocks/MarqueeBlock";
import MetricsBlock from "@/pages/studio/blocks/MetricsBlock";
import CompareBlock from "@/pages/studio/blocks/CompareBlock";
import JourneyBlock from "@/pages/studio/blocks/JourneyBlock";
import FeatureBlock from "@/pages/studio/blocks/FeatureBlock";
import KineticBlock from "@/pages/studio/blocks/KineticBlock";
import QuoteBlock from "@/pages/studio/blocks/QuoteBlock";
import ClosingBlock from "@/pages/studio/blocks/ClosingBlock";
import StatsBlock from "@/pages/studio/blocks/StatsBlock";
import TriptychBlock from "@/pages/studio/blocks/TriptychBlock";
import TypoBlock from "@/pages/studio/blocks/TypoBlock";
import EchoBlock from "@/pages/studio/blocks/EchoBlock";
import MonoBlock from "@/pages/studio/blocks/MonoBlock";
import PinupBlock from "@/pages/studio/blocks/PinupBlock";
import StoryBlock from "@/pages/studio/blocks/StoryBlock";
import ListBlock from "@/pages/studio/blocks/ListBlock";
import BrandBlock from "@/pages/studio/blocks/BrandBlock";
import CarouselBlock from "@/pages/studio/blocks/CarouselBlock";
import PhotoTypeBlock from "@/pages/studio/blocks/PhotoTypeBlock";
import PhotoSplitBlock from "@/pages/studio/blocks/PhotoSplitBlock";
import PhotoPortraitBlock from "@/pages/studio/blocks/PhotoPortraitBlock";
import SearchBlock from "@/pages/studio/blocks/SearchBlock";
import DeviceBlock from "@/pages/studio/blocks/DeviceBlock";
import DoorBlock from "@/pages/studio/blocks/DoorBlock";
import StageBlock from "@/pages/studio/blocks/StageBlock";
import type { BlockProps } from "@/pages/studio/blocks/shared";
import type { BlockKind } from "@/pages/studio/composePage";

/**
 * Registro canônico de blocos do núcleo criativo — usado pelo Studio interno e
 * pelo Studio público. Ao criar um bloco novo, registre aqui e em
 * `composePage.TREATMENT_COUNT`.
 */
export const STUDIO_BLOCKS = {
  hero: HeroBlock,
  marquee: MarqueeBlock,
  metrics: MetricsBlock,
  compare: CompareBlock,
  journey: JourneyBlock,
  feature: FeatureBlock,
  kinetic: KineticBlock,
  quote: QuoteBlock,
  closing: ClosingBlock,
  stats: StatsBlock,
  triptych: TriptychBlock,
  typo: TypoBlock,
  echo: EchoBlock,
  mono: MonoBlock,
  pinup: PinupBlock,
  story: StoryBlock,
  list: ListBlock,
  brand: BrandBlock,
  carousel: CarouselBlock,
  photoType: PhotoTypeBlock,
  photoSplit: PhotoSplitBlock,
  photoPortrait: PhotoPortraitBlock,
  search: SearchBlock,
  device: DeviceBlock,
  door: DoorBlock,
  stage: StageBlock,
} satisfies Record<BlockKind, (props: BlockProps) => JSX.Element>;
