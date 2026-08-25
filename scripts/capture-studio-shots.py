#!/usr/bin/env python3
"""
Auto-captura de screenshots para o Aliv.iA Studio.

Objetivo: alimentar `src/pages/studio/topics.ts` com a tela EXATA de cada assunto
(regra taxativa: imagem = assunto, sem fallback). Usa apenas as rotas de demo
públicas (dados fictícios), então nunca expõe paciente real.

Uso:
  python3 scripts/capture-studio-shots.py            # captura tudo
  python3 scripts/capture-studio-shots.py agenda hep # captura só esses tópicos

Saída: src/assets/studio/<topico>.jpg
"""

import asyncio
import os
import sys

from playwright.async_api import async_playwright

BASE = os.environ.get("STUDIO_CAPTURE_BASE", "http://localhost:8080")
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src/assets/studio")

PRO = f"{BASE}/profissionais/demo"
CLINIC = f"{BASE}/clinica/demo"
PATIENT = f"{BASE}/para-pacientes/demo"


# topico -> (url, tab a clicar ou None, texto-âncora do card ou None)
TARGETS = {
    "clinical-agent": (PRO, "Agente", None),
    "messaging": (PRO, "Mensagens", None),
    "agenda": (CLINIC, "Agenda", None),
    "nps": (CLINIC, "Clínica", "NPS"),
    "white-label": (CLINIC, "Clínica", "Identidade visual"),
    "permissions": (CLINIC, "Clínica", "Equipe"),
    "hep": (PATIENT, None, "Meu programa"),
    "pain-diary-patient": (PATIENT, None, "Registrar hoje"),
    "marketplace": (f"{BASE}/professionals", None, None),
    "academic-tracks": (f"{BASE}/trilhas", None, None),
}


async def shoot(page, topic, anchor):
    path = os.path.join(OUT_DIR, f"{topic}.jpg")
    if anchor:
        loc = page.locator(
            f"xpath=(//*[contains(normalize-space(.), '{anchor}')][not(self::script)][not(self::style)])[last()]"
        ).first
        try:
            card = loc.locator("xpath=ancestor-or-self::*[contains(@class,'rounded')][1]")
            target = card if await card.count() else loc
            await target.scroll_into_view_if_needed()
            await page.wait_for_timeout(700)
            await target.screenshot(path=path, quality=88, type="jpeg")
            print(f"  ok  {topic} -> {path}")
            return True
        except Exception as exc:  # noqa: BLE001
            print(f"  !!  {topic}: âncora '{anchor}' falhou ({exc})")
            return False
    await page.screenshot(path=path, quality=88, type="jpeg")
    print(f"  ok  {topic} -> {path}")
    return True


async def main():
    wanted = sys.argv[1:] or list(TARGETS)
    os.makedirs(OUT_DIR, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800}, device_scale_factor=2)
        page = await context.new_page()
        for topic in wanted:
            if topic not in TARGETS:
                print(f"  --  {topic}: tópico não mapeado")
                continue
            url, tab, anchor = TARGETS[topic]
            print(f"[{topic}] {url} {tab or ''}")
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(4000)
            if tab:
                try:
                    await page.get_by_role("tab", name=tab, exact=True).first.click()
                    await page.wait_for_timeout(3000)
                except Exception as exc:  # noqa: BLE001
                    print(f"  !!  aba '{tab}' não encontrada ({exc})")
                    continue
            await shoot(page, topic, anchor)
        await browser.close()


asyncio.run(main())
