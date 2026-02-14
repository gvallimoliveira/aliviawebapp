import { useState } from "react";
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
}

interface AnamnesisFormProps {
  mode: "basic" | "premium";
  onComplete: (data: AnamnesisData) => void;
  onBack: () => void;
}

const AnamnesisForm = ({ mode, onComplete, onBack }: AnamnesisFormProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
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

  const steps = [
    // Step 0: Chief Complaint
    () => (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("anamnesis.complaint_title")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {complaints.map((c) => (
            <Button
              key={c}
              variant={data.chiefComplaint === c ? "default" : "outline"}
              size="sm"
              className="justify-start text-left h-auto py-2.5 rounded-xl"
              onClick={() => setData({ ...data, chiefComplaint: c })}
            >
              {t(c)}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label>{t("anamnesis.other_complaint")}</Label>
          <Input
            value={data.customComplaint}
            onChange={(e) => setData({ ...data, customComplaint: e.target.value.slice(0, 200) })}
            placeholder={t("anamnesis.other_complaint_placeholder")}
            maxLength={200}
          />
        </div>
      </div>
    ),

    // Step 1: Onset
    () => (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("anamnesis.onset_title")}</h3>
        <div className="grid gap-3">
          {["anamnesis.onset.sudden", "anamnesis.onset.gradual", "anamnesis.onset.trauma"].map((o) => (
            <Card
              key={o}
              className={`cursor-pointer transition-all ${data.onset === o ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}
              onClick={() => setData({ ...data, onset: o })}
            >
              <CardContent className="py-3 px-4">
                <span className="text-sm font-medium">{t(o)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),

    // Step 2: Pain Map
    () => (
      <PainMap
        selectedRegions={data.painRegions}
        onRegionsChange={(regions) => setData({ ...data, painRegions: regions })}
      />
    ),

    // Step 3: Pain Type
    () => (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("anamnesis.pain_type_title")}</h3>
        <p className="text-sm text-muted-foreground">{t("anamnesis.pain_type_subtitle")}</p>
        <div className="grid grid-cols-2 gap-2">
          {painTypes.map((pt) => (
            <Button
              key={pt}
              variant={data.painTypes.includes(pt) ? "default" : "outline"}
              size="sm"
              className="rounded-xl h-auto py-2.5"
              onClick={() => toggleArrayItem("painTypes", pt)}
            >
              {t(pt)}
            </Button>
          ))}
        </div>
      </div>
    ),

    // Step 4: Evolution
    () => (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("anamnesis.evolution_title")}</h3>
        <div className="grid gap-3">
          {["anamnesis.evolution.improving", "anamnesis.evolution.stable", "anamnesis.evolution.worsening"].map((e) => (
            <Card
              key={e}
              className={`cursor-pointer transition-all ${data.evolution === e ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}
              onClick={() => setData({ ...data, evolution: e })}
            >
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
    ),

    // Step 5: Aggravating/Relieving + Activity Level (combined for basic mode)
    () => (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>{t("anamnesis.aggravating")}</Label>
          <Textarea
            value={data.aggravatingFactors}
            onChange={(e) => setData({ ...data, aggravatingFactors: e.target.value.slice(0, 500) })}
            placeholder={t("anamnesis.aggravating_placeholder")}
            rows={2}
            maxLength={500}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("anamnesis.relieving")}</Label>
          <Textarea
            value={data.relievingFactors}
            onChange={(e) => setData({ ...data, relievingFactors: e.target.value.slice(0, 500) })}
            placeholder={t("anamnesis.relieving_placeholder")}
            rows={2}
            maxLength={500}
          />
        </div>
        <div className="space-y-3">
          <Label>{t("anamnesis.activity_level")}</Label>
          <div className="grid grid-cols-2 gap-2">
            {activityLevels.map((a) => (
              <Button
                key={a}
                variant={data.activityLevel === a ? "default" : "outline"}
                size="sm"
                className="rounded-xl h-auto py-2.5"
                onClick={() => setData({ ...data, activityLevel: a })}
              >
                {t(a)}
              </Button>
            ))}
          </div>
        </div>
      </div>
    ),

    // Step 6: Pain Duration
    () => (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("anamnesis.pain_duration_title")}</h3>
        <p className="text-sm text-muted-foreground">{t("anamnesis.pain_duration_subtitle")}</p>
        <div className="grid gap-3">
          {["anamnesis.duration.less_week", "anamnesis.duration.one_month", "anamnesis.duration.three_six_months", "anamnesis.duration.one_year_plus"].map((option) => (
            <Card
              key={option}
              className={`cursor-pointer transition-all ${data.painDuration === option ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}
              onClick={() => setData({ ...data, painDuration: option })}
            >
              <CardContent className="py-3 px-4">
                <span className="text-sm font-medium">{t(option)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),

    // Step 7: Gym Access
    () => (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("anamnesis.gym_access_title")}</h3>
        <p className="text-sm text-muted-foreground">{t("anamnesis.gym_access_subtitle")}</p>
        <div className="grid gap-3">
          {["anamnesis.gym.yes", "anamnesis.gym.no"].map((option) => (
            <Card
              key={option}
              className={`cursor-pointer transition-all ${data.hasGymAccess === option ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}
              onClick={() => setData({ ...data, hasGymAccess: option })}
            >
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
    ),

    // Step 7: Pain Score
    () => (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">{t("anamnesis.pain_score_title")}</h3>
        <div className="text-center">
          <span className={`text-6xl font-bold ${getPainScoreColor(data.painScore)}`}>
            {data.painScore}
          </span>
          <p className="text-sm text-muted-foreground mt-2">{t("anamnesis.pain_score_desc")}</p>
        </div>
        <div className="px-4">
          <Slider
            value={[data.painScore]}
            onValueChange={([v]) => setData({ ...data, painScore: v })}
            min={0}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{t("anamnesis.no_pain")}</span>
            <span>{t("anamnesis.worst_pain")}</span>
          </div>
        </div>
      </div>
    ),
  ];

  const totalSteps = steps.length;
  const canGoNext = () => {
    switch (step) {
      case 0: return data.chiefComplaint !== "" || data.customComplaint.trim() !== "";
      case 1: return data.onset !== "";
      case 2: return data.painRegions.length > 0;
      case 3: return data.painTypes.length > 0;
      case 4: return data.evolution !== "";
      case 5: return data.activityLevel !== "";
      case 6: return data.painDuration !== "";
      case 7: return data.hasGymAccess !== "";
      case 8: return true;
      default: return false;
    }
  };

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
        {steps[step]()}
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
