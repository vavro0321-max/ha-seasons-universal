# HA Seasons Universal V1.2 – celoplošný šetrič Home Assistanta

**HA Seasons Universal** is an adaptive, full-screen Home Assistant dashboard screensaver with seasonal scenery, live weather, rain and snow effects, and a visual card editor. It works with or without a local weather station and adapts automatically to landscape or portrait tablet layouts.

<!-- ha-marketplace:exclude-start -->
[![Open HA Seasons Universal in your Home Assistant Marketplace](https://my.home-assistant.io/badges/marketplace_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=vavro0321-max&repository=ha-seasons-universal&category=plugin)

**Quick install:** Open the Marketplace badge above, add this public repository as a custom **Dashboard** repository and install it. Until this project is accepted into the public Marketplace catalog, search results will not include it automatically.
<!-- ha-marketplace:exclude-end -->

Samostatný šetrič obrazovky pre ľubovoľný Lovelace dashboard. **Nemení jeho vzhľad, rozloženie, karty ani ovládanie.** Po 30 sekundách nečinnosti sa zobrazí celoplošná sezónna krajina. Jeden dotyk obnoví pôvodný dashboard (prvý dotyk nič v domácnosti nezapne).

![Ukážka](docs/preview.jpg)

## Nové vo V1.2 – plynulý deň, noc a svitanie

- Od rána do večera sa osvetlenie mení **plynulo podľa výšky slnka** zo senzora `sun.sun`.
- Približne pred západom sa krajina stlmí a dostane jemné teplé farby.
- Po západe postupne tmavne, **najtmavšia je hlboká noc**, pred východom postupne svitá.
- Hviezdy a Mesiac sa prirodzene zjavujú a miznú podľa polohy slnka a oblačnosti.
- WS2900 stále koriguje denný jas, ale v noci ho slnečné žiarenie nerozjasňuje.
- **V každom okamihu je len jedna krajina**, takže stromy a domy pri prechode medzi dňom a nocou nepreskakujú.
- Ak v Home Assistante chýba výška slnka, používa sa len orientačný časový odhad.

Bežná konfigurácia sa **nemení**, stačí aktualizovať doplnok v Marketplace/HACS a obnoviť stránku (prípadne vymazať cache prehliadača).

## Funkcie
- Dátum, čas, vonkajšia teplota, kúrenie, meniny a počty zapnutých svetiel
- Jar, leto, jeseň, zima; Veľká noc, máj, Dušičky, Mikuláš, Vianoce, Nový rok
- Deň, svitanie, západ slnka, noc; Mesiac podľa senzora, inak označený približný výpočet
- Jasno, polooblačno, zamračené; dážď a sneh s pokojnou animáciou
- Dva zdroje počasia: lokálna meteostanica alebo entita `weather.*` z internetovej služby
- **Jedna fotografia v jednej chvíli** (žiadne prekrývanie dvoch krajín)
- Pri automatickej detekcii sa použijú dostupné entity; chýbajúce informácie sa zobrazia ako `—`

## Grafický editor v Home Assistante (nové vo V1.1)

Po inštalácii otvor **Upraviť dashboard → Pridať kartu → HA Seasons Universal**, potom prejdi do **grafického editora karty**. Nastavíš bez YAML:

- spustenie po 5–3600 sekundách;
- rozloženie **Automaticky / Kompaktné / Široké**;
- sklenený alebo minimalistický štýl, veľkosť hodín, priehľadnosť a posun/orez obrázka;
- zdroj počasia **automaticky / meteostanica / online**;
- automatické či manuálne ročné obdobie a čas dňa;
- zapnutie/vypnutie jednotlivých informačných polí a animácií;
- konkrétne entity počasia, senzorov, kúrenia a svetiel.

Grafika sa automaticky preusporiada podľa orientácie tabletu **na šírku aj na výšku**, s menšími prvkami na nízkych a úzkych displejoch. Používa jediný obrázok krajiny; na tablete môžu byť krajné časti pri pomere strán `cover` orezané, ale nie zdvojené.

### Pridanie do akéhokoľvek dashboardu

Do dashboardu vlož **jednu manuálnu kartu** (môže byť na konci ľubovoľného zobrazenia):

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
```

Šetrič neprepisuje existujúci `background:`. Karta má len 1 px výšky a ovláda celoplošné zobrazenie. Je aktívna len na pohľade dashboardu, ktorý kartu obsahuje.

### Pre druhý HA bez meteostanice

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: online
entities:
  weather: weather.forecast_home
```

Vymeniť `weather.forecast_home` za skutočnú entitu zo svojho Home Assistanta. Pri `source: auto` si vyhľadá dostupnú entitu `weather.*` a, ak existujú, aj lokálne senzory. `source: online` miestne senzory ignoruje.

### Voliteľná presná konfigurácia

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: station
entities:
  weather: weather.forecast_cierne_11
  temperature: sensor.ws2900_v2_02_01_outdoor_temperature
  rain: sensor.ws2900_v2_02_01_rain_rate
  solar: sensor.ws2900_v2_02_01_solar_radiation
  wind: sensor.ws2900_v2_02_01_wind_speed
  gust: sensor.ws2900_v2_02_01_wind_gust
  heating: switch.thermostat_switch
  nameday: sensor.meniny_dnes
  moon: sensor.moon_faza
  lights:
    - light.led_spodok_kuchyna
    - switch.stromcek
```

## Inštalácia

**Home Assistant Marketplace (2026.11+) / HACS:** Repo musí byť zverejnené vo vlastnom **verejnom GitHub repozitári**, napríklad `ha-seasons-universal`. V HA otvor **Nastavenia → Marketplace → Add from link**, zadaj jeho URL, nainštaluj Dashboard a vlož kartu cez grafické rozhranie. Po inštalácii Marketplace automaticky načíta modul z `/local/community/ha-seasons-universal/ha-seasons-universal.js`. Na starších verziách HA použite HACS → Custom repositories → Dashboard. **ZIP nie je zverejnený repozitár**.

**Ručná inštalácia:** Skopíruj obsah `dist/` do `/config/www/ha-seasons-universal/`, pridaj Dashboard zdroj typu JavaScript Module `/local/ha-seasons-universal/ha-seasons-universal.js?v=1.2.0`, obnov stránku a pridaj manuálnu kartu.

Test bez senzorov: `/local/ha-seasons-universal/TEST.html` (pri ručnej inštalácii). Test používa simulované hodnoty a nemení žiadnu entitu.

## Poznámky

- Zrážkový senzor WS2900 vie zaznamenať dážď, nie padajúci sneh. Sneženie bez samostatného senzora je iba odhad podľa entity počasia.
- Bez stanice intenzita dažďa nie je miestne meranie; ide o orientačný efekt podľa `weather.*`.
- Šetrič nedokáže rozsvietiť vypnutú fyzickú obrazovku tabletu.
- Fotografie niektorých špeciálnych sviatočných scén sú zatiaľ staršie kreslené SVG. Na ich spracovanie sa používa **jediný** obraz, nie skladanie dvoch panorám.
- V prípade akýchkoľvek problémov stačí odstrániť túto jednu kartu a JS resource; pôvodný dashboard zostáva bez zmeny.

## Technické poznámky

- Jedna karta na jeden Lovelace pohľad je odporúčaný spôsob použitia. Šetrič nevytvára globálnu automatizáciu na všetkých dashboardoch.
- Grafický editor volá štandardné `getConfigElement()` a `config-changed`; konfigurácia sa ukladá do dashboardu.
- Jediné externé údaje číta z existujúcich entít Home Assistanta; modul sám nevyžaduje ani neodosiela údaje na vlastný server.
- Na zariadeniach s redukovanými animáciami systém vypne pohyb lístia.
- Ak sa šetrič nespúšťa, skontroluj režim úprav dashboardu, aktívny pohľad, stav načítania JS a to, či obrazovka neprešla do fyzického režimu spánku.
