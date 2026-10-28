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
import EcosystemBlock from "@/pages/studio/blocks/EcosystemBlock";
import PhotoTypeBlock from "@/pages/studio/blocks/PhotoTypeBlock";
import PhotoSplitBlock from "@/pages/studio/blocks/PhotoSplitBlock";
import PhotoPortraitBlock from "@/pages/studio/blocks/PhotoPortraitBlock";
import PhotoVeilBlock from "@/pages/studio/blocks/PhotoVeilBlock";
import SearchBlock from "@/pages/studio/blocks/SearchBlock";
import AskBoxBlock from "@/pages/studio/blocks/AskBoxBlock";
import PromoPhoneBlock from "@/pages/studio/blocks/PromoPhoneBlock";
import StackTypeBlock from "@/pages/studio/blocks/StackTypeBlock";
import DeviceBlock from "@/pages/studio/blocks/DeviceBlock";
import DoorBlock from "@/pages/studio/blocks/DoorBlock";
import StageBlock from "@/pages/studio/blocks/StageBlock";
import ConstellationBlock from "@/pages/studio/blocks/ConstellationBlock";
import SignpostBlock from "@/pages/studio/blocks/SignpostBlock";
import BillboardBlock from "@/pages/studio/blocks/BillboardBlock";
import NotifyBlock from "@/pages/studio/blocks/NotifyBlock";
import ToggleBlock from "@/pages/studio/blocks/ToggleBlock";
import TrendBlock from "@/pages/studio/blocks/TrendBlock";
import FocusBlock from "@/pages/studio/blocks/FocusBlock";
import DivergeBlock from "@/pages/studio/blocks/DivergeBlock";
import OutboxBlock from "@/pages/studio/blocks/OutboxBlock";
import TweetBlock from "@/pages/studio/blocks/TweetBlock";
import PhoneSideBlock from "@/pages/studio/blocks/PhoneSideBlock";
import NoticeBlock from "@/pages/studio/blocks/NoticeBlock";
import PunchBlock from "@/pages/studio/blocks/PunchBlock";
import ShrinkBlock from "@/pages/studio/blocks/ShrinkBlock";
import ElegantAskBlock from "@/pages/studio/blocks/ElegantAskBlock";
import PullQuoteBlock from "@/pages/studio/blocks/PullQuoteBlock";
import PercentBlock from "@/pages/studio/blocks/PercentBlock";
import HookBlock from "@/pages/studio/blocks/HookBlock";
import StepsBlock from "@/pages/studio/blocks/StepsBlock";
import DifiBlock from "@/pages/studio/blocks/DifiBlock";
import TutorialBlock from "@/pages/studio/blocks/TutorialBlock";
import HubBlock from "@/pages/studio/blocks/HubBlock";
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
  ecosystem: EcosystemBlock,
  photoType: PhotoTypeBlock,
  photoSplit: PhotoSplitBlock,
  photoPortrait: PhotoPortraitBlock,
  photoVeil: PhotoVeilBlock,
  search: SearchBlock,
  askbox: AskBoxBlock,
  promoPhone: PromoPhoneBlock,
  stackType: StackTypeBlock,
  tweet: TweetBlock,
  phoneSide: PhoneSideBlock,
  notice: NoticeBlock,
  punch: PunchBlock,
  shrink: ShrinkBlock,
  elegantAsk: ElegantAskBlock,
  pullQuote: PullQuoteBlock,
  percent: PercentBlock,
  hook: HookBlock,
  device: DeviceBlock,
  door: DoorBlock,
  stage: StageBlock,
  constellation: ConstellationBlock,
  signpost: SignpostBlock,
  billboard: BillboardBlock,
  notify: NotifyBlock,
  toggle: ToggleBlock,
  trend: TrendBlock,
  focus: FocusBlock,
  diverge: DivergeBlock,
  outbox: OutboxBlock,
  steps: StepsBlock,
  difi: DifiBlock,
  tutorial: TutorialBlock,
  hub: HubBlock,
} satisfies Record<BlockKind, (props: BlockProps) => JSX.Element>;
