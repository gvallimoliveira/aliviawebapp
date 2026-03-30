import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen } from "lucide-react";

interface QTableRow {
  region_pt: string;
  region_en: string;
  abbreviation: string;
  fullName_pt: string;
  fullName_en: string;
  reference: string;
}

const tableData: QTableRow[] = [
  {
    region_pt: "Coluna Lombar / Dorsal / Sacral",
    region_en: "Lumbar / Dorsal / Sacral Spine",
    abbreviation: "ODI",
    fullName_pt: "Índice de Incapacidade de Oswestry",
    fullName_en: "Oswestry Disability Index",
    reference: "Fairbank & Pynsent, 2000",
  },
  {
    region_pt: "Ombro",
    region_en: "Shoulder",
    abbreviation: "SPADI",
    fullName_pt: "Índice de Dor e Incapacidade do Ombro",
    fullName_en: "Shoulder Pain and Disability Index",
    reference: "Roach et al., 1991",
  },
  {
    region_pt: "Joelho",
    region_en: "Knee",
    abbreviation: "KOOS",
    fullName_pt: "Escore de Lesão e Osteoartrite do Joelho",
    fullName_en: "Knee Injury and Osteoarthritis Outcome Score",
    reference: "Roos et al., 1998",
  },
  {
    region_pt: "Quadril",
    region_en: "Hip",
    abbreviation: "HOOS",
    fullName_pt: "Escore de Resultado do Quadril",
    fullName_en: "Hip Disability and Osteoarthritis Outcome Score",
    reference: "Klassbo et al., 2003",
  },
  {
    region_pt: "Pé / Tornozelo",
    region_en: "Foot / Ankle",
    abbreviation: "FAOS",
    fullName_pt: "Escore de Resultado do Pé e Tornozelo",
    fullName_en: "Foot and Ankle Outcome Score",
    reference: "Roos et al., 2001",
  },
  {
    region_pt: "Tendão de Aquiles / Calcanhar",
    region_en: "Achilles Tendon / Heel",
    abbreviation: "VISA-A",
    fullName_pt: "Avaliação do Instituto Vitoriano de Esportes — Aquiles",
    fullName_en: "Victorian Institute of Sport Assessment — Achilles",
    reference: "Robinson et al., 2001",
  },
  {
    region_pt: "Cotovelo / Antebraço / Mão / Braço",
    region_en: "Elbow / Forearm / Hand / Arm",
    abbreviation: "QuickDASH",
    fullName_pt: "Incapacidades do Braço, Ombro e Mão (versão rápida)",
    fullName_en: "Quick Disabilities of the Arm, Shoulder and Hand",
    reference: "Beaton et al., 2005",
  },
  {
    region_pt: "Cervical / Cabeça",
    region_en: "Cervical / Head",
    abbreviation: "NDI",
    fullName_pt: "Índice de Incapacidade do Pescoço",
    fullName_en: "Neck Disability Index",
    reference: "Vernon & Mior, 1991",
  },
  {
    region_pt: "Cabeça (cefaleia)",
    region_en: "Head (headache)",
    abbreviation: "HIT-6",
    fullName_pt: "Teste de Impacto da Cefaleia",
    fullName_en: "Headache Impact Test",
    reference: "Kosinski et al., 2003",
  },
  {
    region_pt: "Coxa / Perna",
    region_en: "Thigh / Leg",
    abbreviation: "LEFS-8",
    fullName_pt: "Escala Funcional de Membro Inferior (versão curta)",
    fullName_en: "Lower Extremity Functional Scale (Short Form)",
    reference: "Mehta et al., 2016",
  },
];

interface Props {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

const ValidatedQuestionnairesTable = ({ title, subtitle, compact = false }: Props) => {
  const { language, t } = useLanguage();
  const isPt = language === "pt";

  const sectionTitle = title || t("questionnaires_table.title");
  const sectionSubtitle = subtitle || t("questionnaires_table.subtitle");

  return (
    <div className={compact ? "" : "py-16 md:py-20"}>
      <div className={compact ? "" : "container max-w-5xl mx-auto px-4"}>
        {!compact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <BookOpen className="h-4 w-4" />
              {t("questionnaires_table.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {sectionTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {sectionSubtitle}
            </p>
          </motion.div>
        )}

        {compact && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {sectionTitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{sectionSubtitle}</p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">
                  {t("questionnaires_table.col_region")}
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  {t("questionnaires_table.col_questionnaire")}
                </TableHead>
                <TableHead className="font-semibold text-foreground hidden sm:table-cell">
                  {t("questionnaires_table.col_reference")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.abbreviation} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {isPt ? row.region_pt : row.region_en}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-bold shrink-0">
                          {row.abbreviation}
                        </Badge>
                        <span className="text-sm text-foreground">
                          {isPt ? row.fullName_pt : row.fullName_en}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground italic sm:hidden">
                        {row.reference}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground italic hidden sm:table-cell">
                    {row.reference}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </div>
  );
};

export default ValidatedQuestionnairesTable;
