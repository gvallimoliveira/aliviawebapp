import { GATEWAY_LAYOUT } from "@/lib/landingLayout";
import GatewayModern from "./modern/GatewayModern";
import GatewayClassic from "./legacy/GatewayClassic";

/**
 * Switcher da landing geral (seleção de perfil / 4 cards).
 * Troque `GATEWAY_LAYOUT` em `src/lib/landingLayout.ts` para voltar ao original.
 */
const Gateway = () => (GATEWAY_LAYOUT === "classic" ? <GatewayClassic /> : <GatewayModern />);

export default Gateway;
