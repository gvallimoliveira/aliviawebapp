import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import PainMap from "./PainMap";

export interface AnamnesisData {
  chiefComplaint: string;
  customComplaint: string;
  onset: string;
  painRegions: string[];
  painTypes: string[];
  evolution: string;
  aggravatingFactors: string;
  relievingFactors: string;
  activityLevel: string;
  painScore: number;
  hasGymAccess: string;
  painDuration: string;
  sex: string;
  ageRange: string;
}

interface AnamnesisFormProps {
  mode: "basic" | "premium";
  onComplete: (data: AnamnesisData) => void;
  onBack: () => void;
}

const AnamnesisForm = ({ mode, onComplete, onBack }: AnamnesisFormProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const vasBarRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<AnamnesisData>({
    chiefComplaint: "",
    customComplaint: "",
    onset: "",
    painRegions: [],
    painTypes: [],
    evolution: "",
    aggravatingFactors: "",
    relievingFactors: "",
    activityLevel: "",
    painScore: 5,
    hasGymAccess: "",
    painDuration: "",
    sex: "",
    ageRange: "",
  });

  const complaints = [
    "anamnesis.complaint.neck_pain",
    "anamnesis.complaint.back_pain",
    "anamnesis.complaint.shoulder_pain",
    "anamnesis.complaint.knee_pain",
    "anamnesis.complaint.hip_pain",
    "anamnesis.complaint.ankle_pain",
    "anamnesis.complaint.wrist_pain",
    "anamnesis.complaint.elbow_pain",
    "anamnesis.complaint.foot_pain",
    "anamnesis.complaint.headache",
  ];

  const painTypes = [
    "anamnesis.pain_type.local",
    "anamnesis.pain_type.radiating",
    "anamnesis.pain_type.burning",
    "anamnesis.pain_type.tingling",
    "anamnesis.pain_type.throbbing",
    "anamnesis.pain_type.stabbing",
  ];

  const activityLevels = [
    "anamnesis.activity.sedentary",
    "anamnesis.activity.light",
    "anamnesis.activity.regular",
    "anamnesis.activity.athlete",
  ];

  const ageRanges = [
    "anamnesis.age.under_25",
    "anamnesis.age.25_34",
    "anamnesis.age.35_44",
    "anamnesis.age.45_55",
    "anamnesis.age.over_55",
  ];

  const toggleArrayItem = (key: keyof AnamnesisData, item: string) => {
    const arr = data[key] as string[];
    if (arr.includes(item)) {
      setData({ ...data, [key]: arr.filter((i) => i !== item) });
    } else {
      setData({ ...data, [key]: [...arr, item] });
    }
  };

  const getPainScoreColor = (score: number) => {
    if (score <= 3) return "text-primary";
    if (score <= 6) return "text-yellow-600";
    return "text-destructive";
  };

  const isShoulderRelated = () => {
    const shoulderComplaints = ["anamnesis.complaint.shoulder_pain"];
    const shoulderRegions = ["right_shoulder", "left_shoulder", "right_shoulder_back", "left_shoulder_back", "shoulder_side"];
    return shoulderComplaints.includes(data.chiefComplaint) || data.painRegions.some(r => shoulderRegions.includes(r));
  };

  // Define step IDs for clarity
  type StepId = "complaint" | "onset" | "painmap" | "sex_age" | "paintype" | "evolution" | "factors" | "duration" | "gym" | "painscore";

  const buildStepSequence = (): StepId[] => {
    const base: StepId[] = ["complaint", "onset", "painmap", "paintype", "evolution", "factors", "duration", "gym", "painscore"];
    if (isShoulderRelated()) {
      // Insert sex_age right after painmap (after user selects shoulder regions)
      const idx = base.indexOf("paintype");
      base.splice(idx, 0, "sex_age");
    }
    return base;
  };

  const stepSequence = buildStepSequence();

  const renderStep = (id: StepId) => {
    switch (id) {
      case "complaint":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.complaint_title")}</h3>
            <div className="grid grid-cols-2 gap-2">
              {complaints.map((c) => (
                <Button key={c} variant={data.chiefComplaint === c ? "default" : "outline"} size="sm" className="justify-start text-left h-auto py-2.5 rounded-xl" onClick={() => setData({ ...data, chiefComplaint: c })}>
                  {t(c)}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>{t("anamnesis.other_complaint")}</Label>
              <Input value={data.customComplaint} onChange={(e) => setData({ ...data, customComplaint: e.target.value.slice(0, 200) })} placeholder={t("anamnesis.other_complaint_placeholder")} maxLength={200} />
            </div>
          </div>
        );
      case "onset":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.onset_title")}</h3>
            <div className="grid gap-3">
              {["anamnesis.onset.sudden", "anamnesis.onset.gradual", "anamnesis.onset.trauma"].map((o) => (
                <Card key={o} className={`cursor-pointer transition-all ${data.onset === o ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, onset: o })}>
                  <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(o)}</span></CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "painmap":
        return <PainMap selectedRegions={data.painRegions} onRegionsChange={(regions) => setData({ ...data, painRegions: regions })} />;
      case "sex_age":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">{t("anamnesis.sex_age_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.sex_age_subtitle")}</p>
            <div className="space-y-3">
              <Label>{t("anamnesis.sex_label")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {["anamnesis.sex.male", "anamnesis.sex.female"].map((s) => (
                  <Button key={s} variant={data.sex === s ? "default" : "outline"} size="sm" className="rounded-xl h-auto py-2.5" onClick={() => setData({ ...data, sex: s })}>
                    {t(s)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label>{t("anamnesis.age_range_label")}</Label>
              <div className="grid gap-2">
                {ageRanges.map((a) => (
                  <Card key={a} className={`cursor-pointer transition-all ${data.ageRange === a ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, ageRange: a })}>
                    <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(a)}</span></CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      case "paintype":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.pain_type_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.pain_type_subtitle")}</p>
            <div className="grid grid-cols-2 gap-2">
              {painTypes.map((pt) => (
                <Button key={pt} variant={data.painTypes.includes(pt) ? "default" : "outline"} size="sm" className="rounded-xl h-auto py-2.5" onClick={() => toggleArrayItem("painTypes", pt)}>
                  {t(pt)}
                </Button>
              ))}
            </div>
          </div>
        );
      case "evolution":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.evolution_title")}</h3>
            <div className="grid gap-3">
              {["anamnesis.evolution.improving", "anamnesis.evolution.stable", "anamnesis.evolution.worsening"].map((e) => (
                <Card key={e} className={`cursor-pointer transition-all ${data.evolution === e ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, evolution: e })}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <span className={`text-lg ${e.includes("improving") ? "text-primary" : e.includes("worsening") ? "text-destructive" : "text-muted-foreground"}`}>
                      {e.includes("improving") ? "📈" : e.includes("worsening") ? "📉" : "➡️"}
                    </span>
                    <span className="text-sm font-medium">{t(e)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "factors":
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>{t("anamnesis.aggravating")}</Label>
              <Textarea value={data.aggravatingFactors} onChange={(e) => setData({ ...data, aggravatingFactors: e.target.value.slice(0, 500) })} placeholder={t("anamnesis.aggravating_placeholder")} rows={2} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>{t("anamnesis.relieving")}</Label>
              <Textarea value={data.relievingFactors} onChange={(e) => setData({ ...data, relievingFactors: e.target.value.slice(0, 500) })} placeholder={t("anamnesis.relieving_placeholder")} rows={2} maxLength={500} />
            </div>
            <div className="space-y-3">
              <Label>{t("anamnesis.activity_level")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {activityLevels.map((a) => (
                  <Button key={a} variant={data.activityLevel === a ? "default" : "outline"} size="sm" className="rounded-xl h-auto py-2.5" onClick={() => setData({ ...data, activityLevel: a })}>
                    {t(a)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case "duration":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.pain_duration_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.pain_duration_subtitle")}</p>
            <div className="grid gap-3">
              {["anamnesis.duration.less_week", "anamnesis.duration.one_month", "anamnesis.duration.three_six_months", "anamnesis.duration.one_year_plus"].map((option) => (
                <Card key={option} className={`cursor-pointer transition-all ${data.painDuration === option ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, painDuration: option })}>
                  <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(option)}</span></CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "gym":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.gym_access_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.gym_access_subtitle")}</p>
            <div className="grid gap-3">
              {["anamnesis.gym.yes", "anamnesis.gym.no"].map((option) => (
                <Card key={option} className={`cursor-pointer transition-all ${data.hasGymAccess === option ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, hasGymAccess: option })}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <span className="text-lg">{option.includes("yes") ? "🏋️" : "🏠"}</span>
                    <div>
                      <span className="text-sm font-medium">{t(option)}</span>
                      <p className="text-xs text-muted-foreground">{t(`${option}_desc`)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "painscore": {
        const faces = ["😊", "🙂", "😐", "😟", "😣", "😖", "😫", "😩", "🤯", "😵", "😱"];
        const gradientColors = [
          "hsl(150, 60%, 45%)",
          "hsl(130, 55%, 45%)",
          "hsl(100, 50%, 48%)",
          "hsl(70, 55%, 48%)",
          "hsl(50, 65%, 50%)",
          "hsl(40, 70%, 50%)",
          "hsl(30, 75%, 48%)",
          "hsl(20, 80%, 48%)",
          "hsl(10, 80%, 48%)",
          "hsl(0, 75%, 48%)",
          "hsl(0, 85%, 40%)",
        ];
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">{t("anamnesis.pain_score_title")}</h3>

            {/* Face + Number */}
            <div className="text-center space-y-1">
              <motion.span
                key={data.painScore}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl inline-block"
              >
                {faces[data.painScore]}
              </motion.span>
              <div
                className="text-5xl font-black tabular-nums transition-colors duration-300"
                style={{ color: gradientColors[data.painScore] }}
              >
                {data.painScore}
              </div>
              <p className="text-sm text-muted-foreground">{t("anamnesis.pain_score_desc")}</p>
            </div>

            {/* VAS gradient bar with drag + click */}
            <div className="px-2 space-y-3">
              <div
                ref={vasBarRef}
                className="relative h-5 rounded-full overflow-visible border border-border/60 shadow-inner cursor-pointer touch-none select-none"
                style={{ background: `linear-gradient(to right, ${gradientColors.join(", ")})`, borderRadius: "9999px" }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  setIsDragging(true);
                  if (vasBarRef.current) {
                    const rect = vasBarRef.current.getBoundingClientRect();
                    const score = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 10);
                    setData((prev) => ({ ...prev, painScore: score }));
                  }
                }}
                onPointerMove={(e) => {
                  if (!isDragging || !vasBarRef.current) return;
                  const rect = vasBarRef.current.getBoundingClientRect();
                  const score = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 10);
                  setData((prev) => ({ ...prev, painScore: score }));
                }}
                onPointerUp={() => setIsDragging(false)}
                onPointerCancel={() => setIsDragging(false)}
              >
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-[3px] shadow-lg z-10 pointer-events-none"
                  style={{ borderColor: gradientColors[data.painScore] }}
                  animate={{ left: `calc(${(data.painScore / 10) * 100}% - 12px)` }}
                  transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 25 }}
                />
              </div>

              {/* Clickable number row */}
              <div className="flex justify-between">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setData({ ...data, painScore: i })}
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <span
                      className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: data.painScore === i ? gradientColors[i] : "transparent",
                        color: data.painScore === i ? "white" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {i}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("anamnesis.no_pain")}</span>
                <span>{t("anamnesis.worst_pain")}</span>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  const isStepValid = (id: StepId): boolean => {
    switch (id) {
      case "complaint": return data.chiefComplaint !== "" || data.customComplaint.trim() !== "";
      case "onset": return data.onset !== "";
      case "painmap": return data.painRegions.length > 0;
      case "sex_age": return data.sex !== "" && data.ageRange !== "";
      case "paintype": return data.painTypes.length > 0;
      case "evolution": return data.evolution !== "";
      case "factors": return data.activityLevel !== "";
      case "duration": return data.painDuration !== "";
      case "gym": return data.hasGymAccess !== "";
      case "painscore": return true;
    }
  };

  const totalSteps = stepSequence.length;
  const canGoNext = () => isStepValid(stepSequence[step]);

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("anamnesis.step")} {step + 1}/{totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderStep(stepSequence[step])}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={step === 0 ? onBack : () => setStep(step - 1)}
          className="gap-2 rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("anamnesis.back")}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canGoNext()}
          className="gap-2 rounded-xl"
        >
          {step === totalSteps - 1 ? t("anamnesis.finish") : t("anamnesis.next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default AnamnesisForm;
