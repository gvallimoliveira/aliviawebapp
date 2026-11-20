import {
  Clock, Target, Activity, Stethoscope, UserPlus, Link2, Send, ClipboardCheck,
  LayoutDashboard, Brain, User, Zap, RefreshCw, Dumbbell, Palette, TrendingUp,
  BarChart3, DollarSign, Timer, Users, Gauge,
} from "lucide-react";

/** Pure content module — no JSX, no hooks, so sections stay cheap to mount. */

export const BENEFITS = [
  { icon: Clock, titleKey: "b2b.benefit_1_title", descKey: "b2b.benefit_1_desc" },
  { icon: RefreshCw, titleKey: "b2b.benefit_2_title", descKey: "b2b.benefit_2_desc" },
  { icon: Dumbbell, titleKey: "b2b.benefit_3_title", descKey: "b2b.benefit_3_desc" },
  { icon: Target, titleKey: "b2b.benefit_4_title", descKey: "b2b.benefit_4_desc" },
  { icon: Palette, titleKey: "b2b.benefit_5_title", descKey: "b2b.benefit_5_desc" },
  { icon: Activity, titleKey: "b2b.benefit_6_title", descKey: "b2b.benefit_6_desc" },
  { icon: TrendingUp, titleKey: "b2b.benefit_7_title", descKey: "b2b.benefit_7_desc" },
  { icon: Brain, titleKey: "b2b.benefit_8_title", descKey: "b2b.benefit_8_desc" },
];

export const STEPS = [
  { icon: UserPlus, titleKey: "b2b.step_1_title", descKey: "b2b.step_1_desc" },
  { icon: Link2, titleKey: "b2b.step_2_title", descKey: "b2b.step_2_desc" },
  { icon: Send, titleKey: "b2b.step_3_title", descKey: "b2b.step_3_desc" },
  { icon: ClipboardCheck, titleKey: "b2b.step_4_title", descKey: "b2b.step_4_desc" },
  { icon: Brain, titleKey: "b2b.step_5_title", descKey: "b2b.step_5_desc" },
  { icon: Dumbbell, titleKey: "b2b.step_6_title", descKey: "b2b.step_6_desc" },
  { icon: BarChart3, titleKey: "b2b.step_7_title", descKey: "b2b.step_7_desc" },
];

export const FEATURES = [
  { icon: Link2, key: "b2b.feature_1", descKey: "b2b.feature_1_desc" },
  { icon: LayoutDashboard, key: "b2b.feature_2", descKey: "b2b.feature_2_desc" },
  { icon: User, key: "b2b.feature_3", descKey: "b2b.feature_3_desc" },
  { icon: Brain, key: "b2b.feature_4", descKey: "b2b.feature_4_desc" },
  { icon: Stethoscope, key: "b2b.feature_5", descKey: "b2b.feature_5_desc" },
  { icon: Zap, key: "b2b.feature_6", descKey: "b2b.feature_6_desc" },
  { icon: RefreshCw, key: "b2b.feature_7", descKey: "b2b.feature_7_desc" },
  { icon: Dumbbell, key: "b2b.feature_8", descKey: "b2b.feature_8_desc" },
  { icon: Palette, key: "b2b.feature_9", descKey: "b2b.feature_9_desc" },
  { icon: TrendingUp, key: "b2b.feature_10", descKey: "b2b.feature_10_desc" },
  { icon: Brain, key: "b2b.feature_11", descKey: "b2b.feature_11_desc" },
  { icon: BarChart3, key: "b2b.feature_12", descKey: "b2b.feature_12_desc" },
  { icon: Zap, key: "b2b.feature_13", descKey: "b2b.feature_13_desc" },
  { icon: Gauge, key: "b2b.feature_14", descKey: "b2b.feature_14_desc" },
];

export const ROI_ITEMS = [
  { icon: Timer, title: "b2b.roi_time_saved", desc: "b2b.roi_time_desc" },
  { icon: Users, title: "b2b.roi_patients", desc: "b2b.roi_patients_desc" },
  { icon: DollarSign, title: "b2b.roi_revenue", desc: "b2b.roi_revenue_desc" },
  { icon: TrendingUp, title: "b2b.roi_monthly", desc: "b2b.roi_monthly_desc" },
];

export const FAQ_KEYS = ["b2b.faq1", "b2b.faq2", "b2b.faq3", "b2b.faq4", "b2b.faq5", "b2b.faq6"];

export const PRICING_INCLUDES = [
  "b2b.pricing_inc_1", "b2b.pricing_inc_2", "b2b.pricing_inc_3", "b2b.pricing_inc_4",
  "b2b.pricing_inc_5", "b2b.pricing_inc_6", "b2b.pricing_inc_7", "b2b.pricing_inc_8",
  "b2b.pricing_inc_9", "b2b.pricing_inc_10",
];

export const EVIDENCE_NICHES = [
  "Ombro", "Lombar", "Cervical", "Quadril", "Joelho",
  "Tornozelo", "Cotovelo", "Punho", "Pélvica", "Temporomandibular",
];

/** Keep professional landing content readable immediately, even on fast scroll. */
export const fadeUp = {
  hidden: { opacity: 1, y: 0 },
  visible: () => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  }),
};
