import { describe, expect, it } from "vitest";
import { graceRatio, creditAvailability, mayBlock, creditThreshold } from "@/lib/aiCreditPolicy";
describe("regras de créditos aprovadas", () => {
 it("PRO mensal tem exatamente 10% de margem", () => expect(creditAvailability({tier:"pro_monthly",included:60,used:60,purchased:0},0.3).remaining).toBe(6));
 it("PRO anual tem 10%", () => expect(graceRatio("pro_annual")).toBe(1.1));
 it("clínica conserva 20%", () => expect(creditAvailability({tier:"clinic_small",included:350,used:350,purchased:0,pooled:true},0.3).remaining).toBe(70));
 it("parceiro não ganha margem do PRO", () => expect(graceRatio("partner")).toBe(1));
 it("ninguém bloqueia com lista vazia", () => expect(mayBlock(true,[],"partner")).toBe(false));
 it("chave geral desligada impede bloqueio", () => expect(mayBlock(false,["partner"],"partner")).toBe(false));
 it("ativação é seletiva", () => { expect(mayBlock(true,["partner"],"partner")).toBe(true); expect(mayBlock(true,["partner"],"pro_monthly")).toBe(false); });
 it("VIP não é categoria bloqueável", () => expect(mayBlock(true,["unlimited"],"unlimited")).toBe(false));
 it("80% exato avisa sem arredondar antecipadamente", () => { expect(creditThreshold({unlimited:false,included:25,used:19.99})).toBe(0); expect(creditThreshold({unlimited:false,included:25,used:20})).toBe(80); });
 it("100% avisa mesmo tendo margem", () => expect(creditThreshold({unlimited:false,included:60,used:60})).toBe(100));
 it("VIP não recebe aviso de quota", () => expect(creditThreshold({unlimited:true,included:25,used:100})).toBe(0));
 it("após margem só saldo comprado sustenta chamada", () => { expect(creditAvailability({tier:"pro_monthly",included:60,used:66,purchased:0.3},0.3).sufficient).toBe(true); expect(creditAvailability({tier:"pro_monthly",included:60,used:66,purchased:0.29},0.3).sufficient).toBe(false); });
});
