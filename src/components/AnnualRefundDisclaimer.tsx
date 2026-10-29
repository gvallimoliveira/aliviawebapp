import { useLanguage } from '@/contexts/LanguageContext';

export default function AnnualRefundDisclaimer({ annual, className = '' }: { annual: boolean; className?: string }) {
  const { t } = useLanguage();
  if (!annual) return null;
  return <p className={`text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto ${className}`} data-annual-refund>{t('billing.annual_refund.notice')}</p>;
}