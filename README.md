# HA Seasons AI V1.3 — čistý projekt

Inštalácia: z tohto repozitára stiahni ZIP (Code → Download ZIP), rozbaľ ho a **obsah priečinka `dist/`** skopíruj do `/config/www/ha-seasons-ai-v1-3/` v Home Assistante. Zaregistruj JavaScript modul `/local/ha-seasons-ai-v1-3/ha-seasons-ai.js?v=1.3.0` a pridaj kartu `type: custom:ha-seasons-ai-card`.

Pôvodná implementácia HA Seasons Universal bola nahradená novou. História starých commitov a prípadné staré vetvy v GitHube zostávajú, pretože operácia mení iba obsah aktuálnej vetvy `main`.

# HA Seasons AI FINAL V1.3 — Advent a nové fotopozadie

**Toto je čistý náhradný projekt:** repozitár má po inštalácii obsahovať iba aktuálne súbory v dist/ a dokumentáciu, nie staré HA Seasons Universal.

**Fotografický advent:** Od prvej adventnej nedele sa rozsvieti prvá sviečka, počas ďalších nedieľ druhá, tretia a štvrtá. Pri štandardnej krajine sa od súmraku zobrazí fotografická scéna s vencom, cez deň zostáva bežná svetlá krajina. Pri vlastných fotografiách sa použije univerzálny dekor, bez prepisovania používateľskej fotky. Vianočné svetlá na pozadí od 16. decembra.

# HA Seasons AI – V1.3.0 (sviatky + počasie + ochrana kamier)

**Dynamická krajina pre Home Assistant Green (Lovelace custom card).** Tento balík zachováva vizuálne schválený základ: chata, jazero, kostolík, hodiny, dátum, štyri karty **Vonku / Kúrenie / Meniny dnes / Osvetlenie**. Spodok zostáva čistý – žiadny ďalší informačný riadok.

## Čo funguje

- Štyri predpripravené AI sezóny, automaticky podľa mesiaca; vlastné sezónne obrázky alebo jedna vlastná fotografia cez URL (`/local/...`).
- Sneh ako vizuálne prelínanie zimného variantu (0–100 %); **pamäť snehu je helper v HA**.
- Dynamické oblaky: jasno, polooblačno, oblačno, zamračené, sneženie. Plynulé zmeny intenzity, pohyb je voliteľný.
- Dážď/sneženie ako vrstvy; intenzita dažďa z voliteľného senzora mm/h. Hmla pri stavoch fog/mist.
- Deň/súmrak/noc podľa `sun.sun`: výška slnka, azimut. Slnko a mesiac reagujú na oblačnosť.
- Fáza Mesiaca z `sensor.moon_phase`, inak iba všeobecná ilustračná ikona. **Umiestnenie Mesiaca na fotografii nie je skutočná astronomická poloha.**
- Štyri živé karty: vonkajšia teplota, kúrenie, meniny, zapnuté svetlá.
- **Zachované z V1.1:** šetrič sa automaticky spustí po **30 sekundách nečinnosti**; dotykom sa zavrie.
- **Sviatky:** Vianoce od 16. decembra do 6. januára (s osobitnými dňami); adventný veniec od prvej adventnej nedele, sviečky 1–4, Nový rok, Traja králi, Veľká noc podľa pohyblivého dátumu, 1. máj, Deň matiek, sviatok všetkých svätých a ďalšie vybrané slovenské pamätné dni. Dekorácie sú jemné a **voliteľné**; bez Santu.
- **Vianočné svetielka a kostolík:** po súmraku malé svetlá pri hornom okraji, na našich pribalených panorámach po súmraku aj jemné teplé zvýraznenie existujúceho kostolíka. Cez deň sú tieto svetlá vypnuté. Na vlastnej fotografii nepredpokladáme polohu kostola, takže tento lokálny efekt vypneme; ostatné sviatočné prvky ostávajú.
- **Ochrana kamier:** na stránke/sekcii `#kamery`, počas otvoreného dialógového okna kamery alebo pri prehrávanom videu sa automaticky nespustí. Po zatvorení kamery začne úplne nový 30-sekundový odpočet.
- Responzívne pre mobil/tablet. Úsporný režim vypína pohybové animácie.

## 1. Najprv otestujte

1. Rozbaľ ZIP na PC alebo mobile. (Predchádzajúcu funkčnú V1.0 si nechaj ako zálohu.)
2. Otvor `TEST_STANDALONE.html` priamo v **Chrome** ako lokálny súbor (nie v textovom náhľade ChatGPT, ktorý môže zobraziť iba kód). Súbor obsahuje **všetky obrázky a JavaScript**, pracuje offline.
3. Ak zariadenie neumožní spustiť lokálny HTML, spusti v rozbalenom adresári na PC `python -m http.server 8765`, potom v prehliadači otvor `http://localhost:8765/TEST.html`. Ak si na inom zariadení v tej istej sieti, použi IP PC namiesto localhost.
4. Na spodnom testovacom paneli nastav: ročné obdobie, stav počasia, teplotu, výšku slnka, sneh a fázu mesiaca. Klikni **Simulovať 30 minút snehu** alebo **Ukážka deň → noc**.
5. **Test automatického spúšťania:** po otvorení testu nedotýkaj sa obrazovky **30 sekúnd** → šetrič nabehne. Dotykom ho zavri. Klikni na **📹 Otvoriť kameru** a nechaj náhľad otvorený viac ako 30 sekúnd → šetrič sa NESMIE spustiť. Zavri kameru → začne nový odpočet 30 sekúnd. Tlačidlo **📺 Otvoriť sekciu Kamery** testuje blokovanie `#kamery`.
6. Panel je **simulácia**, nie aktuálne hodnoty zo zariadení.

## 2. Inštalácia do Home Assistant Green (bez prepisovania starej verzie)

1. Vytvor zálohu konfigurácie Home Assistanta.
2. Skopíruj z priečinka balíka tieto položky do **`/config/www/ha-seasons-ai-v1-3/`**:
   - `ha-seasons-ai.js`
   - `weather-engine.mjs`
   - `camera-guard.mjs` (NEVYNECHAŤ!)
   - **`holiday-engine.mjs` (NOVÉ V1.3; nevynechať!)**
   - `background-default.jpg`
   - celý priečinok `assets/`
   - celý priečinok `seasons/`
3. V Home Assistant v **Nastavenia → Nástenky (Dashboards) → Zdroje** pridaj nový zdroj (typ **JavaScript modul**) so URL:
   `/local/ha-seasons-ai-v1-3/ha-seasons-ai.js?v=1.3.0`
4. Vytvor testovaciu nástenku a pridaj ručnú kartu:

```yaml
type: custom:ha-seasons-ai-card
idle_seconds: 30
block_when_camera_open: true
camera_views:
  - kamery
  - kamera
  - cameras
  - camera
holidays_enabled: true
show_holiday_label: true
holiday_animations: true
holiday_church_lights: true
preview_holiday: auto
# Pre neštandardné popupy môžeš pridať:
# camera_block_selectors: ".moje-kamery-popup"
background_mode: seasonal
preview_season: auto
dynamic_weather: true
show_clouds: true
show_precipitation: true
show_sun: true
show_moon: true
show_fog: true
cloud_motion: true
low_motion: false
sky_height: 53
dynamic_snow: true
weather_entity: weather.home
moon_entity: sensor.moon_phase
rain_rate_entity: sensor.ws2900_v2_02_01_rain_rate
snow_cover_entity: input_number.ha_seasons_snow_cover
entities:
  temperature: sensor.ws2900_v2_02_01_outdoor_temperature
  heating: switch.thermostat_switch
  nameday: sensor.meniny_dnes
```

5. Over existenciu entít v **Nástroje pre vývojárov → Stavy**; uprav `weather.home` podľa skutočnej entity (`weather.forecast_cierne_11`, ak ju máš). `sensor.moon_phase`, senzor intenzity dažďa a meniny sú voliteľné. Pri chýbajúcom zdroji bude efekt obmedzený a karta zobrazí `—`, nie vymyslenú hodnotu.
6. Reštartuj len podľa potreby pri zmene YAML balíka. Pri zmene JavaScript modulu obnov nástenku (v Chrome Ctrl+F5).
7. **Dôležité:** pre novú verziu používaj **iba jeden aktívny JS resource / jednu kartu**. Ak máš už V1.0 registrovanú v rovnakej nástenke, deaktivuj/odstráň starý resource a ponechaj novú V1.3. Existujúci helper snehu nemeníš, ďalší nevytváraj.

### Ako rozpozná otvorené kamery

- Sekcia `#kamery` a cesty ako `/lovelace/kamery` sú blokované. Názvy sa dajú zmeniť cez `camera_views` v editore karty, napr. `bezpecnost`.
- Bežné modálne okná (vrátane Home Assistant *More Info* a browser_mod popupov) pozastavia automatický šetrič, aby neprekrýval otvorené ovládanie.
- Vložené viditeľné video, ktoré sa práve prehráva (napr. živá kamera), tiež šetrič zablokuje.
- Šetrič sa nespustí, keď je karta v režime úprav alebo prehliadač nie je aktívny. Po návrate sa odpočet začne odznova.
- **Obmedzenie:** karta je aktívna iba na nástenke/zobrazení, kde je vložená. Nie je to celosystémový Android šetrič; pri otvorení samostatnej sekcie s kamerami karta môže byť odpojená, čo takisto zabráni otvoreniu šetriča. Pri exotických kamerových popupoch alebo prehrávačoch s neprístupným vnútrom použite voliteľný `camera_block_selectors` alebo pridajte názov danej sekcie do `camera_views`.
- Vybrané prehliadače a vlastné kamerové karty môžu mať špecifické správanie. **Over na skutočnom tablete aj so všetkými kamerami**, skôr než odstrániš zálohu.

**POZOR:** Karta zobrazuje celoplošný šetrič po nečinnosti na stránke, kde je vložená. Stlačenie/dotyk ho zavrie. Neslúži ako systémový Android šetrič mimo prehliadača.

## 3. Pamäť snehu – vyber si JEDEN spôsob

**A. Nemáš helper snehu:** vlož `ha_seasons_snow_package.yaml` do `/config/packages/ha_seasons_snow.yaml`. V `configuration.yaml` musí byť zapnuté (ak už sekcia `homeassistant:` existuje, iba zlúč jej obsah, nevytváraj druhú):

```yaml
homeassistant:
  packages: !include_dir_named packages
```

**B. Helper `input_number.ha_seasons_snow_cover` už existuje:** nepridávaj package vytvárajúci tento helper znova. Použi namiesto neho súbor `snow_automation_ONLY_if_helper_exists.yaml` ako automatizáciu, prípadne z pôvodného balíka ponechaj **iba jednu** aktuálnu automatizáciu.

**Nikdy nedrž aktívne automatizácie snehu z V0.4/V0.5/V0.6 a V1.0/V1.1/V1.3 súčasne.** Pred migráciou vypni staré. Výpočet sa spúšťa každých 30 minút, pri chýbajúcich podkladoch stav zostane bez zmeny. Ide o vizuálny odhad, **nie meteorologické meranie vrstvy snehu**.

## 4. Vlastné obrázky a AI

V editore karty môže každý zadať URL jednej fotografie, alebo URL vlastných sezónnych fotografií, napr. `/local/moje-pozadia/spring.webp`. Pri vlastnej fotografii je dobré zvoliť výšku oblohy (`sky_height`, 16–70 %) tak, aby oblaky neprekrývali stavby. Pôvodné fotografie sú záloha; svoje fotografie nahrávaj s oprávnením na ich použitie.

Na **PC alebo serveri** môžeš z vlastnej fotografie vytvoriť sezónne varianty pomocou skriptu `ai_generate_seasons.py`. Sú potrebné `pip install -r requirements-ai.txt`, vlastný `OPENAI_API_KEY` v systémovej premennej a explicitné potvrdenie plateného AI API volania. Najprv spusti:

```bash
python ai_generate_seasons.py --input moja_fotka.jpg --output moje_sezony --dry-run
```

Po overení nákladov a promptov je platené spustenie možné cez `--yes`. Výsledné 4 obrázky treba skontrolovať a následne skopírovať do `www`. **API kľúč sa nikdy nevkladá do Home Assistanta ani do dashboardu.** Samotná karta nevolá AI ani neposiela fotografie na internet. Tlačidlo „Generovať AI“ priamo v dashboarde v tejto verzii nie je.

## 5. Vizuálne limity a výkon

- Pôvodná fotografia obsahuje reálne slnko a oblaky; vrstvový efekt ich **nevie z fotografie vymazať**. Pri dvojitom slnku vypni `show_sun: false` alebo používaj AI podklady s neutrálnou oblohou.
- Mesiac sa zobrazuje podľa fázy, ale jeho poloha je orientačná.
- Oblaky sú univerzálna transparentná horná vrstva. Na niektorých záberoch môže byť vhodná menšia výška `sky_height`.
- Pre slabšie zariadenia nastav `low_motion: true` a `cloud_motion: false`.
- Sezónne obrázky sú približne rovnako komponované, ale AI môže meniť drobné detaily, čo je pri prelínaní viditeľné.
- `weather.home` je spravidla stav z predpovede/poskytovateľa; nie vždy potvrdzuje skutočný stav oblohy v danom okamihu.

## 6. Overenie balíka

- **16** pôvodných testov počasia a snehu prešlo.
- **8** testov rozpoznávania kamier/ciest prešlo.
- Interaktívny samostatný HTML bol overený v Chromium pri rozlíšení **1280×720 a 390×844**: autoštart po uplynutí 30 s (simulovaný čas), blokovanie otvoreného dialógu, nový 30 s odpočet po jeho zatvorení, blokovanie sekcie `#kamery` a blokovanie prehrávaného videa.
- JavaScript prešiel syntax kontrolou; pôvodné obrázky a snehová automatizácia ostali nezmenené.
- **Na tvojom reálnom Home Assistant Green to ešte nie je fyzicky nasadené ani overené.**


## 7. Sviatky – presné správanie vo V1.3

Efekty sa aktivujú podľa lokálneho dátumu `hass.config.time_zone` (typicky `Europe/Bratislava`) a nemenia rozloženie štyroch kariet. **Nie je potrebný internet ani AI API** pri bežnom používaní.

- **16.–23. december:** adventná/vianočná atmosféra, jemné svetielka a počet zapálených adventných sviec podľa uplynulých adventných nedieľ. Nejde o reálne plamene.
- **24.–26. december:** vianočná atmosféra, bez Santu, jemné osvetlenie kostolíka v predvolenej krajine.
- **27.–30. december a 2.–5. január:** vianočné obdobie, **31. december a 1. január:** novoročné svetielka, **6. január:** Traja králi.
- **Veľká noc:** od Kvetnej nedele po Veľkonočný pondelok; termín sa vypočíta každý rok podľa gregoriánskeho kalendára.
- **Ďalšie dátumy:** Valentín, 8. marec, 1. a 8. máj, druhá májová nedeľa (Deň matiek), 1. jún (Deň detí), 5. júl, 29. august, 1. a 15. september, 1. a 17. november, 6. december (Mikuláš). Menšie udalosti používajú iba jemný kvetinový, hviezdny alebo textový motív; nie vždy ide o deň pracovného pokoja.

### Voliteľné nastavenia

```yaml
holidays_enabled: true         # false: úplne vypne sviatky
show_holiday_label: true       # false: bez názvu v hornom rohu
holiday_animations: true       # false: svetielka neblikajú
holiday_church_lights: true    # iba predvolené fotografie
preview_holiday: auto          # test: advent, christmas, newyear, easter, spring, remembrance, national, none
# preview_date: '2026-12-24'  # IBA na test; po skúške vymazať!
```

### Test

V `TEST_STANDALONE.html` vyber **Sviatok** alebo nastav **Dátum (test)** na `2026-12-15`, `2026-12-16`, `2026-12-20`, `2026-12-24`, `2026-04-05` či `2027-01-01`; otvor šetrič a sleduj dekoračné vrstvy. Dolný panel v samostatnom teste môžeš skryť tlačidlom **Skryť panel**. Hodiny ukazujú aktuálny čas, ale dátum rešpektuje nastavený testovací dátum.

**Poznámka:** Plynulé stmavovanie podľa `sun.sun` sa zachováva; samostatné nočné fotografie nie sú generované automaticky. Oblaky a slnko už nakreslené v základnej fotografii nemožno odstrániť jednoduchým efektom. Sviatočný motív je grafická vrstva, nie nová AI fotografia pre každú udalosť.

## 8. Overenie V1.3

- Unit testy `node test-holidays.mjs`, `node test-engine.mjs` a `node test-camera-guard.mjs` prešli.
- Grafická skúška v Chromium pre mobil (390×844) a desktop (1280×720) overila Vianoce, adventné sviece, Veľkú noc, vypnutý sviatok a blokovanie otvorenej kamery; bez JavaScript chýb.
- **Tvoje reálne Home Assistant Green a Lenovo Tab M11 zatiaľ nie sú overené**. Starú funkčnú verziu ponechaj do ukončenia testov.


## Dôležité pri náhrade starého projektu

- V HA nie je možné prepísať už aktívny dashboard len úpravou GitHubu. Je potrebné aktualizovať zdroj JavaScript na `/local/ha-seasons-ai-v1-3/ha-seasons-ai.js?v=1.3.0` a skopírovať priečinok `dist` z projektu do `/config/www/ha-seasons-ai-v1-3/`.
- Odstráň starý `ha-seasons-universal.js` z Nástenky → Zdroje až keď overíš novú kartu. Všetky novšie HA Seasons AI verzie používajú `type: custom:ha-seasons-ai-card`.
- Nikdy neaktivuj dve automatiky snehu súčasne.
- Git história starých commitov v existujúcom repozitári zostane, pracovný strom vetvy `main` je nový čistý projekt.
