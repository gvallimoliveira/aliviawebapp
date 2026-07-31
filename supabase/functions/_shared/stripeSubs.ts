// Resolução global (para QUALQUER usuário) do vínculo entre a conta Aliv.iA e o
// Stripe. Um assinante nunca cria conta no Stripe conscientemente: o Checkout
// gera um Customer com o e-mail dele e gravamos o subscription id no nosso banco.
// Portanto precisamos procurar por vários caminhos, na ordem de confiabilidade:
//   1. subscription_stripe_id salvo em professionals / clinics (vínculo direto)
//   2. metadata.user_id gravado nas assinaturas criadas pelos nossos checkouts
//   3. Customers com o e-mail de login e/ou o e-mail cadastrado no perfil
import Stripe from "https://esm.sh/stripe@18.5.0";

export const PRICE_CATALOG: Record<
  string,
  { label: string; kind: "pro" | "premium" | "clinic" | "addon"; interval: "month" | "year"; annual_price?: string }
> = {
  // PRO
  price_1TJ4252HgVhVBE8URcx5fMZB: { label: "Profissional PRO — Mensal", kind: "pro", interval: "month", annual_price: "price_1TJ42L2HgVhVBE8U2fhXuqYT" },
  price_1TJ42L2HgVhVBE8U2fhXuqYT: { label: "Profissional PRO — Anual", kind: "pro", interval: "year" },
  // Premium B2C
  price_1TBkbt2HgVhVBE8UWGL7zPGZ: { label: "Premium Mensal", kind: "premium", interval: "month" },
  // Clínica
  price_1TKjS22HgVhVBE8UKPH1p0SR: { label: "Clínica até 3 — Mensal", kind: "clinic", interval: "month", annual_price: "price_1TKjSV2HgVhVBE8UAltRZTlh" },
  price_1TKjSV2HgVhVBE8UAltRZTlh: { label: "Clínica até 3 — Anual", kind: "clinic", interval: "year" },
  price_1TKjaS2HgVhVBE8UrpLrMFVU: { label: "Clínica 4-8 — Mensal", kind: "clinic", interval: "month", annual_price: "price_1TKjas2HgVhVBE8UtqMAGInP" },
  price_1TKjas2HgVhVBE8UtqMAGInP: { label: "Clínica 4-8 — Anual", kind: "clinic", interval: "year" },
  price_1TKjbC2HgVhVBE8U3ANhCbHs: { label: "Clínica 9+ — Mensal", kind: "clinic", interval: "month", annual_price: "price_1TKjbT2HgVhVBE8UzG25AfhI" },
  price_1TKjbT2HgVhVBE8UzG25AfhI: { label: "Clínica 9+ — Anual", kind: "clinic", interval: "year" },
};

export type SubDescription = {
  id: string;
  status: string;
  label: string;
  kind: string;
  interval: string | null;
  can_switch_to_annual: boolean;
  amount: number | null;
  currency: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  created: string | null;
  customer_id: string | null;
};

export const describeSub = (sub: Stripe.Subscription): SubDescription => {
  const item = sub.items.data[0];
  const priceId = (item?.price?.id as string) || "";
  const meta = PRICE_CATALOG[priceId];
  return {
    id: sub.id,
    status: sub.status,
    label: meta?.label || item?.price?.nickname || "Assinatura Aliv.iA",
    kind: meta?.kind || "other",
    interval: meta?.interval || (item?.price?.recurring?.interval as string) || null,
    can_switch_to_annual: !!meta?.annual_price,
    amount: item?.price?.unit_amount ?? null,
    currency: sub.currency,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: (sub as any).current_period_end
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null,
    created: sub.created ? new Date(sub.created * 1000).toISOString() : null,
    customer_id: typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id ?? null,
  };
};

export const LIVE_STATUSES = ["active", "trialing", "past_due", "unpaid"];

export type StripeContext = {
  customerIds: string[];
  subscriptions: Stripe.Subscription[];
  liveSubscriptions: Stripe.Subscription[];
  /** Melhor customer para abrir o Billing Portal (o que tem assinatura). */
  primaryCustomerId: string | null;
};

export async function resolveStripeContext(
  stripe: Stripe,
  admin: any,
  user: { id: string; email?: string | null },
): Promise<StripeContext> {
  const subsById = new Map<string, Stripe.Subscription>();
  const customerIds = new Set<string>();
  const emails = new Set<string>();
  if (user.email) emails.add(user.email.trim().toLowerCase());

  const addSub = (s: Stripe.Subscription) => {
    subsById.set(s.id, s);
    const c = typeof s.customer === "string" ? s.customer : (s.customer as any)?.id;
    if (c) customerIds.add(c);
  };

  // ---- 1. IDs já salvos no nosso banco (profissional autônomo e clínica)
  const [{ data: pro }, { data: clinics }] = await Promise.all([
    admin.from("professionals").select("email, subscription_stripe_id").eq("user_id", user.id).maybeSingle(),
    admin.from("clinics").select("subscription_stripe_id").eq("owner_user_id", user.id),
  ]);
  if (pro?.email) emails.add(String(pro.email).trim().toLowerCase());

  const knownSubIds = [
    pro?.subscription_stripe_id,
    ...((clinics || []) as Array<{ subscription_stripe_id: string | null }>).map((c) => c.subscription_stripe_id),
  ].filter((v): v is string => !!v && v.startsWith("sub_"));

  for (const id of new Set(knownSubIds)) {
    try {
      addSub(await stripe.subscriptions.retrieve(id));
    } catch (_) {
      /* assinatura removida no Stripe — ignora */
    }
  }

  // ---- 2. Assinaturas criadas pelos nossos checkouts (metadata.user_id)
  try {
    const found = await stripe.subscriptions.search({
      query: `metadata['user_id']:'${user.id}'`,
      limit: 20,
    });
    found.data.forEach(addSub);
  } catch (_) {
    /* search indisponível — seguimos pelos outros caminhos */
  }

  // ---- 3. Customers pelos e-mails conhecidos
  for (const email of emails) {
    try {
      const customers = await stripe.customers.list({ email, limit: 10 });
      for (const c of customers.data) {
        customerIds.add(c.id);
        const list = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 20 });
        list.data.forEach(addSub);
      }
    } catch (_) {
      /* ignora e-mail inválido */
    }
  }

  const subscriptions = [...subsById.values()];
  const liveSubscriptions = subscriptions.filter((s) => LIVE_STATUSES.includes(s.status));

  // Portal deve abrir no customer que realmente tem histórico de cobrança.
  const primaryCustomerId =
    (liveSubscriptions[0] &&
      (typeof liveSubscriptions[0].customer === "string"
        ? liveSubscriptions[0].customer
        : (liveSubscriptions[0].customer as any)?.id)) ||
    (subscriptions[0] &&
      (typeof subscriptions[0].customer === "string"
        ? subscriptions[0].customer
        : (subscriptions[0].customer as any)?.id)) ||
    [...customerIds][0] ||
    null;

  return { customerIds: [...customerIds], subscriptions, liveSubscriptions, primaryCustomerId };
}
