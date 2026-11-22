# HA Seasons Universal V1.11.0 – celoplošný šetrič Home Assistanta

**HA Seasons Universal** is an adaptive, full-screen Home Assistant dashboard screensaver with seasonal scenery, live weather, rain and snow effects, and a visual card editor. It works with or without a local weather station and adapts automatically to landscape or portrait tablet layouts.

<!-- ha-marketplace:exclude-start -->
[![Open HA Seasons Universal in your Home Assistant Marketplace](https://my.home-assistant.io/badges/marketplace_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=vavro0321-max&repository=ha-seasons-universal&category=plugin)

**Quick install:** Open the Marketplace badge above, add this public repository as a custom **Dashboard** repository and install it. Until this project is accepted into the public Marketplace catalog, search results will not include it automatically.
<!-- ha-marketplace:exclude-end -->

Samostatný šetrič obrazovky pre ľubovoľný Lovelace dashboard. **Nemení jeho vzhľad, rozloženie, karty ani ovládanie.** Po 30 sekundách nečinnosti sa zobrazí celoplošná sezónna krajina. Jeden dotyk obnoví pôvodný dashboard (prvý dotyk nič v domácnosti nezapne).

![Ukážka](docs/preview.jpg)

## Nové vo V1.11.0 – finálna zima, deň/noc a presnejšie počasie

**Advent:** 29.11.2026 až 24.12.2026. Fotorealistický obraz v krajine s kostolom, stromčekom a presne **4 sviečkami** sa používa vo dne aj v noci. Od 1. adventnej nedele horí večer 1 sviečka, od druhej 2, od tretej 3, od štvrtej 4. Plamene sú ukotvené priamo na knôtoch, nie nad sviečkami. Stromček je v obraze od prvej adventnej nedele; svetielka sa rozsvietia večer až od Mikuláša 6.12.

**Vianoce a zima:** medzi 25.12. a 6.1. zostáva sviatočný režim so stromčekom, po 6.1. sa automaticky vráti bežná zimná krajina. V bežnej zime bez sneženia nie je automaticky nakreslený hustý sneh a denná/nočná expozícia sa riadi polohou Slnka.

**Počasie:** predvolené `source: auto` preberá teplotu, dážď, slnečné žiarenie a vietor z lokálnej WS2900 (ak sú dostupné). Online entita `weather.forecast_cierne_11` alebo `weather.home` poskytuje aktuálny regionálny stav. Ak regionálne počasie tvrdí „zamračené“, ale WS2900 **čerstvo meria dostatočné slnečné žiarenie a neprší**, obraz a text prepnú na `Polooblačno · WS2900`. Slabé žiarenie sa nepoužíva na automatické dokazovanie zamračeného počasia (stanica môže byť zatienená). V noci sa oblačnosť posudzuje podľa online stavu. Staré merania sa ignorujú. Pri `source: online` lokálne slnečné žiarenie oblačnosť neprepisuje.

Príklad voliteľného presného mapovania entít:

```yaml
type: custom:ha-seasons-universal-card
source: auto
scene: auto
advent_photo: true
station_max_age_minutes: 25
entities:
  weather: weather.forecast_cierne_11
  temperature: sensor.ws2900_v2_02_01_outdoor_temperature
  solar: sensor.ws2900_v2_02_01_solar_radiation
  rain: sensor.ws2900_v2_02_01_rain_rate
  wind: sensor.ws2900_v2_02_01_wind_speed
```

Na diagnostiku otvor **Vývojárske nástroje → Stavy** a pozri, či existujú `sensor.ws2900_v2_02_01_solar_radiation`, `sensor.ws2900_v2_02_01_rain_rate`, `sun.sun` a vybraná `weather.*` entita. Samotný GitHub test nedokáže skontrolovať živé domáce merania. Po aktualizácii obnov prehliadač alebo tablet kvôli cache.

## Nové vo V1.10.8 – fotografia pre adventné večery

Počas adventu **od prvej adventnej nedele do Štedrého dňa** používa šetrič po zotmení novú fotografickú krajinu s **vianočným stromčekom pri kostole a vencom pri ceste priamo zakomponovanými do obrázka**. Nejde už o samostatné prilepené obrázky s ostrými okrajmi. Z obrazového podkladu boli odstránené pevné hodiny a informačné karty; čas, dátum, počasie a ďalšie údaje naďalej zobrazuje Home Assistant naživo. Fotografický podklad je odvodený od schválenej ukážky, takže môže mať drobné odlišnosti od pôvodného screenshotu.

**Automatické pravidlá zostali:** 29. novembra 2026 sa zobrazí veniec s prvou zapálenou sviečkou a nesvietiaci stromček. Každú ďalšiu adventnú nedeľu pribúda jeden plamienok. Od **6. decembra** sa stromček večer rozsvieti. Malé svetlá a plamene sa pridávajú ako presne ukotvené svetelné body k fotografii, nie ako druhý prekrývajúci obrázok. **Po 24. decembri** sa zostava vráti k bežnej vianočnej krajine s pôvodnými riadenými dekoráciami, do 6. januára. Počas dňa sa používa svetlá živá sezónna krajina, aby napriek nočnej predlohe nebol cez obed nočný obraz.

Grafický editor má voliteľnú položku **Advent: fotografický motív večer** (predvolene zapnuté), prípadne YAML `advent_photo: true`. Ak je nastavená vlastná fotografia alebo niektorá dekorácia vypnutá, použije sa pôvodné univerzálne zobrazenie. Fotografia aj svetlá používajú rovnaké responzívne súradnice na mobile a tablete.

Test: `dist/ADVENT-TEST.html`; kontrolný súbor: `test-photographic-advent.cjs`.

## Nové vo V1.10.7 – prirodzené začlenenie adventnej výzdoby do fotografie

Stromček aj veniec zostávajú na **schválených miestach pri kostole a ceste**. Nemajú sa zobrazovať ako dvojica obrázkov s ostrou hranou, ale ako súčasť pôvodnej krajiny. Pribudla kompozičná vrstva s rozostrenými kontaktnými tieňmi pod výzdobou, jemným teplým svetlom na tráve a sotva viditeľným odrazom rozsvieteného stromčeka na fasáde kostola. Objektom sa mení expozícia podľa dňa a noci; žlté osvetlenie zhasína spolu so svetlami. Pri vypnutých dekoráciách, pred Mikulášom (stromček) a mimo adventu (veniec) neostávajú v krajine žiadne cudzie svetelné škvrny.

Umiestnenie aj svetelné efekty sú ukotvené **na spoločné súradnice fotografie**, preto sa automaticky škálujú spolu s panorámou pri otočení mobilu alebo tabletu. Na ľubovoľnom vlastnom obrázku sa zachová univerzálne rozloženie dekorácií bez dodatočného svetelného odrazu na neznámych budovách.

Toto je vykresľovanie s vrstvením, **nie nové vygenerovanie celého fotografického pozadia**: presný vzhľad musí potvrdiť vizuálny test na skutočnom zariadení.

## Nové vo V1.10.6 – dekorácie podľa schváleného vizuálneho návrhu

Po vizuálnom odsúhlasení záberu z 22. novembra 2026 sú ornamenty natrvalo umiestnené podľa pôvodnej fotografie s kostolom vľavo: **stromček stojí tesne napravo od kostola na trávniku a veniec leží o niečo viac vpravo, nižšie na tráve pri zakrivenej cestičke**. Oba sú proporčne prispôsobené krajine a osvetlenie pôsobí prirodzenejšie v noci.

Schválené kotviace body na panoráme 1536 × 864: stromček pri (610, 720), veniec pri (690, 798). Sú to súradnice fotografie, nie displeja. Karta automaticky premieta kotviace body pri orezaní pozadia a otočení mobilu alebo tabletu. Na ľubovoľných vlastných fotografiách sú miesta kostola a cesty neznáme, takže karta naďalej používa všeobecné rozloženie.

Kód má automatické testy dátumov, 11 veľkostí displeja a kontrolu relatívnych súradníc. **Vizuálnu zhodu s návrhom treba overiť na reálnom zariadení**, pretože samotné testy nepokrývajú fotorealistickosť ani všetky okraje obrázkov.

## Nové vo V1.10.5 – skutočne responzívna krajina na mobiloch a tabletoch

Pri starších verziách sa na úzkej obrazovke fotografie orezali inak než stromček a veniec. To mohlo narušiť ich umiestnenie pri kostole a chodníku.

Teraz **fotografia, grafické vrstvy a obe dekorácie používajú rovnaký výpočet mierky, polohy aj orezu**. Na displejoch 16:9, 16:10, 4:3 a širokých mobiloch sa krajina prispôsobí dostupnému priestoru. Pri zvislej orientácii sa vytvorí špeciálny spodný výrez kostola a cesty, aby dekorácie nezmizli z obrazovky; horná časť poskytne miesto pre hodiny a informačné karty. Pri otočení zariadenia sa všetko automaticky prepočíta.

**Bez manuálneho nastavenia rozmerov:** používaj `layout: auto` a `scene: auto`. Na vlastnom obrázku, ktorého kostol a cestičku nepoznáme, zostáva univerzálne umiestnenie dekorácií; presné vizuálne ukotvenie na inej fotografii vyžaduje osobitné polohy. Formát 16:9 nie je možné rovnako celý zobraziť na každom displeji bez orezu alebo prázdnych okrajov, preto sa zorné pole pri rôznych pomeroch strán mierne líši.

## Nové vo V1.10.4 – prirodzenejší vzhľad vianočnej výzdoby

Podľa skutočnej snímky testovacej obrazovky sme upravili dve chyby: **veniec prekrýval drevený plot a stromček pôsobil akoby bol vo vzduchu**. Stromček má spodok ukotvený hlbšie na trávnatom svahu vedľa kostola; menší veniec stojí na trávnatej strane kľukatej cestičky, už nie pred plotom.

Realistické obrázkové výrezy sa teraz **stmavujú spolu s nočnou krajinou**, preto ich zelená farba a ozdoby nevyzerajú nalepené na tmavom pozadí. Žiarovky a plamienky zostávajú viditeľné a do okolia pridávajú len jemný teplý svetelný nádych. Všetky výpočty rozsvecovania počas adventu sa zachovali; reálne svetlá v dome sa neovládajú.

Dátumy aj polohy skontroluje `test-advent.cjs` a `test-holiday-placement.cjs`. Fotorealistický obrázok je stále iba návrh – skutočný efekt over cez `dist/ADVENT-TEST.html` pred nasadením na tablet.

## Nové vo V1.10.3 – dekorácie už nevisia nad krajinou

Stromček a veniec sa kotvia k terénu na zimnej fotografii. Na testovacom náhľade bolo vidno, že predchádzajúci stromček visel vo vzduchu a zasahoval do vstupu kostola. Stromček je teraz menší a posunutý nižšie a doprava, ku tráve medzi kostolom a existujúcim stromom. Veniec je menší, pri zakrivenej cestičke a má kontakt s terénom. Polohy sa prenášajú podľa orezu panorámy a pri režime na výšku zostávajú dekorácie viditeľné. Rozsvietenie počas adventu pokračuje bez zmeny.

## Nové vo V1.10.2 – realistické adventné dekorácie

Predošlé kreslené SVG stromček a veniec boli nahradené **fotografickými výrezmi s priehľadným pozadím**. Používajú sa samostatné obrázky pre rozsvietený a zhasnutý stromček, nezapálený veniec a plamienky. Vstavanú krajinu nepremaľovávajú. Na pôvodnej fotografii s kostolom je stromček **napravo od kostola medzi kostolom a najbližším stromom**, veniec **pri kľukatej ceste blízko stromčeka**.

Zachované: od prvej adventnej nedele do 24. decembra pribúda sviečka každú nedeľu; jej plameň je viditeľný až po zotmení. Stromček je cez deň bez rozsvietených svetiel a od 6. decembra sa jeho osvetlenie rozsvieti každý večer. Dekorácie sa po 6. januári skryjú. Testovacia stránka `dist/ADVENT-TEST.html` umožňuje prezrieť všetky dátumy bez zmeny nastavení domácnosti.

## Nové vo V1.10.1 – realistickejšie umiestnenie pri kostole

Dekorácie už neležia v dvoch protiľahlých rohoch obrazovky. Na vstavanom pozadí s kostolíkom je **menší stromček umiestnený vľavo pri kostole, medzi kostolom a existujúcim stromom**. **Adventný veniec je zmenšený a položený do trávy pri kľukatej cestičke**, bližšie ku stromčeku. Mierka a poloha sa upravujú podľa toho, ako je sezónna fotografia na obrazovke orezaná. Kostol, dedina a hory sa nijako nepremaľovávajú.

Pri používateľských vlastných fotografiách je poloha kostola neznáma, preto zostáva univerzálne rozloženie v rohoch. Dátumy sviečok a rozsvietenia stromčeka sa nemenia.

## Nové vo V1.10.0 – adventný veniec a stromček 🎄

- Vianočné obdobie začína **automaticky prvou adventnou nedeľou** (v roku 2026 je to **29. november**) a končí **6. januára**.
- **Adventný veniec** je v krajine od prvej adventnej nedele do 24. decembra. Každú nedeľu pribudne **jedna horiaca sviečka** (1, 2, 3, 4).
- Cez deň ostanú sviečky nezapálené. **Plamienky uvidíš večer a v noci** podľa západu slnka cez `sun.sun`, s plynulým prechodom súmraku.
- **Vianočný stromček** sa objaví už v prvú adventnú nedeľu bez svetiel. Na **Mikuláša (6. decembra)** sa prvýkrát večer rozsvieti a svieti každý ďalší večer až do **6. januára**.
- Zobrazenie venca i stromčeka môžeš samostatne vypnúť v grafickom editore. Obe dekorácie fungujú aj s vlastnou fotografiou; nemenia polohu kostola, budov ani chodcov a neovládajú skutočné svetlá v domácnosti.
- Na Silvestra a Nový rok zostáva pôvodný motív Nového roka. Po 6. januári sa program vráti k zimnej krajine.

```yaml
type: custom:ha-seasons-universal-card
scene: auto
show_advent_wreath: true
show_christmas_tree: true
```

Po aktualizácii obnov stránku tabletu, aby sa načítal nový JavaScript.

## Nové vo V1.9.2 – rozdiel medzi oblakmi a skutočnou hmlou

**Zamračené neznamená hmla.** Nová verzia používa hmlovú vrstvu výhradne vtedy, keď vybraná Home Assistant entita `weather.*` hlási stav `fog` alebo `mist`. Ani vysoká vlhkosť, nízky rosný bod či 100 % vlhkosť z meteostanice už nezapínajú vizuálnu hmlu.

- `sunny`, `clear-night` → čistá krajina bez oblačných alebo hmlových vrstiev
- `partlycloudy` → len niekoľko mrakov v hornej časti oblohy, nie nad domami
- `cloudy` → oblačná obloha a jemne tlmené farby, ale **bez oparu na budovách, cestách a horách**
- `fog`, `mist` → viditeľná hmla, pokiaľ `fog_effect` nie je vypnuté
- `rainy`, `pouring`, `snowy` → pôvodný dážď/sneh a oblačné nebo, bez dodatočnej hmly

Hustota oblačnosti sa teraz odráža v samostatných oblačných vrstvách, obmedzených na horných 28 % obrazovky. Saturácia pri zamračenom počasí zostáva bližšia pôvodnej fotografii, aby nevyzerala mliečne.

**Diagnostika:** Ak je aj po aktualizácii a pri `fog_effect: false` obraz zahmlený, môže ísť o hmlu napevno zachytenú v samotnej použitej fotografii, o znečistenie skla alebo o starý JavaScript uložený v cache prehliadača. Samotný nový filter nedokáže odstrániť hmlu, ktorá už je súčasťou pixelov obrázka. Pre úplne čistý záber môžeš nahrať vlastnú fotografiu pomocou poľa `custom_image` alebo piatich sezónnych obrázkov.

## V1.9.1 – vlastná fotografia, štyri sezóny a čistejšie nebo

Používateľ si môže bez zásahu do JavaScriptu vybrať **vlastný obrázok** ako celoročné pozadie alebo nastaviť vlastné obrázky pre **jar, leto, jeseň a zimu**, prípadne zimu bez snehu. Obrázky sú zadávané cez grafický editor karty ako odkazy na miestne fotografie, napríklad `/local/moja-krajina.jpg`, alebo na HTTPS obrázky. Na Home Assistante patrí súbor `moja-krajina.jpg` do `/config/www/`.

**Dôležité obmedzenie:** Pri jednej vlastnej fotografii vie karta automaticky upravovať farby podľa ročného obdobia, svetlo Slnka a Mesiaca, dážď, sneh a hmlu. Nedokáže však vierohodne odstrániť listy zo stromu alebo vytvoriť fotorealistickú snehovú pokrývku z ľubovoľnej letnej fotografie. Pre skutočne presný vzhľad sú potrebné vlastné fotografie jednotlivých období.

Efekty fixné pre našu dedinu – osvetlené okná budov, pozície pôvodného tieňa stromu a ďalšie lokálne prvky – sa pri ľubovoľnom cudzom obrázku skryjú, aby nesvietili na nesprávnych miestach. Slnko a Mesiac ostávajú voliteľné. Používateľ môže intenzitu sezónneho zafarbenia nastaviť v grafickom editore. Ak je vlastná fotografia nedostupná, doplnok sa vráti k pôvodnému pozadiu.

V1.9.1 ešte zobrazovala slabý odhadovaný opar podľa vlhkosti. **V1.9.2 toto správanie úplne odstránila**: hmla sa zapne výlučne pri hlásenom stave `fog` alebo `mist`. Opar natrvalo zakomponovaný do fotografie sa tým nemení.

Príklad základného nastavenia:

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
custom_image: /local/moja-krajina.jpg
custom_season_strength: 0.8
fog_effect: true
```

Príklad so štyrmi reálnymi ročnými obdobiami:

```yaml
type: custom:ha-seasons-universal-card
custom_images:
  spring: /local/jar.jpg
  summer: /local/leto.jpg
  autumn: /local/jesen.jpg
  winter: /local/zima.jpg
  winter_dry: /local/zima-bez-snehu.jpg
```

Všetky vlastné fotografie sú voliteľné. Ak nie sú nastavené, zostáva pôvodná krajina s kostolíkom. Ak chceš hmlovú vrstvu úplne odstrániť, použi `fog_effect: false`. Dátum, denná/noc, počasie a ročné obdobia pokračujú bez zmeny.

## Nové vo V1.8 – voliteľný vývoz odpadu a lepšia viditeľnosť v noci

Šetrič **automaticky zobrazí upozornenie na najbližší vývoz komunálneho a separovaného odpadu, iba ak má Home Assistant príslušný platný senzor**. Bez týchto senzorov sa celý riadok automaticky skryje, takže doplnok funguje rovnako aj u iných používateľov.

- Podporované formáty dátumových senzorov: `YYYY-MM-DD`, `DD.MM.YYYY`, aj dátum v atribúte `next_date` / `next_collection` a číselný počet dní.
- Jeden alebo oba senzory môžu chýbať. Neplatné hodnoty `unknown` a `unavailable`, neplatné a staré dátumy sa nikdy nezobrazujú.
- **DNES** a **ZAJTRA** sa zvýraznia teplejším rámikom, ďalšie vývozy zobrazia dátum a koľko dní zostáva.
- Senzory sa zisťujú automaticky, najmä `sensor.najblizsi_komunalny_odpad` a `sensor.najblizsi_triedeny_zber`. V grafickom editore možno vybrať aj ľubovoľné vlastné senzory dátumu.
- Nové nastavenie `show_waste: true` zapína vývoz iba tam, kde existujú údaje; `show_waste: false` ho skryje všade.
- V noci sa viac rozoznajú hory, kostolík, domy a cesta: zjemnili sa tmavé vrstvy a nadvihli tmavé odtiene fotografie pomocou nočného kontrastu.
- Výpočty polohy Slnka, denného jasu a plynulého stmievania sa nemenia. Použité sú stále rovnaké fotografie všetkých ročných období.

Príklad pre Home Assistant s vlastnými senzormi:

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
show_waste: true
night_brightness: 1.1
entities:
  waste_municipal: sensor.najblizsi_komunalny_odpad
  waste_recycling: sensor.najblizsi_triedeny_zber
```

**Dôležité:** Nie je nutné pripájať tieto senzory, pokiaľ sú automaticky nájdené. Ak odpady v Home Assistante nemáš, nič nenastavuj – riadok sa nevytvorí. Funkcia iba zobrazuje termíny; neposiela oznámenia a nevytvára kalendár.

## Nové vo V1.7.1 – čistá krajina bez pohybujúcich sa postáv

Na základe spätnej väzby bola funkcia Living World odstránená: ľudia a autá sa
pohybovali cez budovy a nesprávne sa nezakrývali za prekážkami. Táto verzia
**nevykresľuje ľudí, autá ani vtáky** a v grafickom editore už ich nastavenia
nie sú. Nemusíš upravovať existujúci dashboard: aj keď v starom YAML zostali
kľúče `living_world` alebo `living_density`, verzia V1.7.1 ich ignoruje.

Zachované zostáva celé pôvodné prostredie: päť sezónnych panorám (jar, leto,
jeseň, zima so snehom a bez snehu), živé údaje Home Assistanta, slnko, Mesiac,
súmrak, osvetlenie domov, oblačnosť, hmla, padajúci dážď/sneh, čas, kúrenie
a pozastavenie šetriča pri otvorenej záložke Kamery.

Pri aktualizácii v Marketplace použi **Obnoviť informácie → Preinštalovať**
a obnov stránku na tablete, aby sa nenačítal starý JavaScript.

## Nové vo V1.6.1 – viditeľnejšia, ale stále nočná krajina

- V noci sú kostolík, dedina, cesta a hory lepšie viditeľné. Modrastá nočná atmosféra zostáva zachovaná.
- Jasná noc pri splne je svetlejšia než polooblačná alebo zamračená noc.
- Silné tmavé filtre boli zmiernené a prechod súmrak → noc → svitanie je plynulý.
- **Denný jas sa nemení**, naďalej závisí od výšky Slnka a (ak je dostupná) meteostanice WS2900.
- V grafickom editore karty pribudol posuvník **Jas nočnej krajiny**. Predvolená hodnota je **110 %**, prípustný rozsah je **80–135 %**. Hodnota je násobiteľ nočného osvetlenia, nie fyzického jasu displeja.

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
night_brightness: 1.1  # predvolené; pre jasnejšiu noc skúste 1.2 alebo 1.25
```

Na existujúcom dashboarde sa nová predvolená hodnota zapne automaticky bez úpravy YAML. Po aktualizácii modulu obnov stránku na tablete.

## Nové vo V1.6 – štyri schválené fotografie + dynamické počasie

Používame štvoricu používateľom schválených pohľadov na rovnakú dedinu s kostolíkom vľavo. Každý záber je uložený samostatne vo veľkosti **1536 × 864**: `universal-landscape-spring.webp`, `universal-landscape-summer.webp`, `universal-landscape-autumn.webp`, `universal-landscape-winter.webp`. Piaty, odvodený `universal-landscape-winter-dry.webp`, slúži pre **zimu bez snehu** pri teplom suchom počasí. Pôvodné súbory zostávajú ako záloha.

- **Jar:** strom kvitne počas celej jari. **Leto:** zelený strom. **Jeseň:** holé vetvy. **Zima:** bez lístia, zasnežená alebo suchá podľa podmienok.
- **Slnko:** vypočítané podľa `sun.sun` a jeho výšky; teplé svitanie a západ, plynulé zosvetľovanie/stmievanie. Poloha grafického slnka v panoráme je ilustračná.
- **Počasie:** jasná, polooblačná a zamračená obloha, statické oblaky na oblohe a hmla výlučne podľa `weather.fog`/`weather.mist`, dážď podľa intenzity a hlásené sneženie.
- **Mesiac a noc:** mesačný svit podľa fázy a oblačnosti, hviezdy pri jasnej noci a postupne rozsvietené okná kostola/dediny.
- **Sneh a námraza:** orientačný vzhľad podľa vonkajšej teploty a hláseného sneženia, bez tvrdenia, že ide o meranú vrstvu.
- **Kamery:** šetrič sa pri otvorenom `#kamery` nespustí; po návrate sa 30 sekúnd odpočítava odznova.

Nastavenie `unified_scene: true` sa ponecháva. **Nezapínať znovu starý šetrič** z karty `ha-seasons-background`. Po Marketplace aktualizácii obnov cache stránky na tablete.

Ukážka YAML:

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
scene: auto
phase: auto
unified_scene: true
image_fit: cover
fog_effect: true
snow_cover: true
moonlight_effect: true
night_lights: true
pause_on_camera: true
```

**Poznámka:** sezónne fotografie sú podobne komponované, ale nie pixelovo totožné; pri zmene ročného obdobia sa môže mierne posunúť poloha detailov. Počas jedného dňa sa však fotografia nemení podľa svetla, mení sa len nasvietenie a počasie.

## Nové vo V1.3 – živá nočná krajina a sneh

- Jasná, polooblačná a zamračená noc majú odlišné osvetlenie a oblohu.
- Fáza Mesiaca a oblačnosť ovplyvňujú mesačné svetlo: pri splne a jasnej noci je krajina svetlejšia. Bez senzora Mesiaca sa fáza odhaduje.
- Okná domov a kostolíka sa po zotmení jemne rozsvietia, bez prepínania alebo zdvojenia fotografie.
- Plynulá simulovaná námraza/snehová pokrývka sa mení podľa vonkajšej teploty. **Nie je to meranie skutočnej snehovej pokrývky**; na to treba samostatný senzor alebo spoľahlivé údaje o stave snehu.
- Padajúci sneh sa zobrazí len pri hlásenom snežení; mráz sám nespúšťa sneženie.
- V grafickom editore sú tri nové prepínače: svetlá v dedine, mesačné osvetlenie a snehová pokrývka.

Nové prepínače majú v existujúcich kartách predvolenú hodnotu **zapnuté**, takže **YAML nemusíš meniť**. Aktualizuj doplnok cez Marketplace/HACS a obnov cache stránky na tablete.

## Nové vo V1.2 – plynulý deň, noc a svitanie

- Od rána do večera sa osvetlenie mení **plynulo podľa výšky slnka** zo senzora `sun.sun`.
- Približne pred západom sa krajina stlmí a dostane jemné teplé farby.
- Po západe postupne tmavne, **najtmavšia je hlboká noc**, pred východom postupne svitá.
- Hviezdy a Mesiac sa prirodzene zjavujú a miznú podľa polohy slnka a oblačnosti.
- WS2900 stále koriguje denný jas, ale v noci ho slnečné žiarenie nerozjasňuje.
- **V každom okamihu je len jedna krajina**, takže stromy a domy pri prechode medzi dňom a nocou nepreskakujú.
- Ak v Home Assistante chýba výška slnka, používa sa len orientačný časový odhad.

Bežná konfigurácia sa **nemení**, stačí aktualizovať doplnok v Marketplace/HACS a obnoviť stránku (prípadne vymazať cache prehliadača).

## Predchádzajúce vydanie V1.5

Pôvodné dve fotografie `universal-landscape.webp` a `universal-landscape-leafless.webp` zostávajú v repozitári ako historické a záložné podklady. V1.6 používa päť nových samostatných sezónnych fotografií vyššie; pri zmene ročného obdobia sa prepne fotografia, nie poloha žiadnych Home Assistant ovládacích prvkov.

## Nové vo V1.5 – jedna spoločná krajina podľa dodanej fotografie

Pôvodnú fotografiu s kostolíkom **naľavo**, dedinou, cestou a horami používame ako spoločné pozadie. Zdrojová fotografia `dist/assets/universal-landscape.webp` je pre jar, leto a skorú jeseň; pixelovo podobná odvodená verzia `dist/assets/universal-landscape-leafless.webp` odstráni lístie od 10. novembra a v zime. Poloha kostolíka, hôr a domov zostáva zachovaná.

Doplnok ďalej používa plynulý deň/noc, mesačný svit, oblačnosť, teplotne odhadovanú námrazu a sneh, nočné svetlá a pozastavenie šetriča na `#kamery`. Teraz pribudla:
- statická hmla výhradne pri `weather.* = fog` alebo `mist` (od V1.9.2 sa odhad podľa vlhkosti nepoužíva)
- suchšia hnedá neskoro-jesenná tráva a zimná vegetácia
- letné/jarné/jesenné farby z tej istej fotografie

**Oba obrázky sú už nahrané** priamo na GitHub a po preinštalovaní cez Marketplace sa použije nové spoločné pozadie. Ak sa po aktualizácii stále ukazuje staré pozadie, obnov stránku tabletu a jej vyrovnávaciu pamäť.

Nastavenia v YAML (všetko je už štandardne zapnuté):

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
scene: auto
unified_scene: true
fog_effect: true
season_colors: true
night_lights: true
moonlight_effect: true
snow_cover: true
pause_on_camera: true
entities:
  weather: weather.forecast_cierne_11
  temperature: sensor.ws2900_v2_02_01_outdoor_temperature
  humidity: sensor.ws2900_v2_02_01_humidity
  dewpoint: sensor.ws2900_v2_02_01_dewpoint
```

Poznámka: od V1.9.2 sa hmla zobrazuje len pri hlásení `fog`/`mist`, zatiaľ čo snehová vrstva môže zostať vizuálnym odhadom, nie meraním výšky snehu.

## Nové vo V1.4 – ročné obdobia majú odlišnú krajinu

Pri kontrole pôvodných podkladov sme našli chybu: fotografické obrázky pre **jar, leto a jeseň** mali takmer rovnaké zelené lístie, takže aj v novembri vyzerala dedina letne. Dátumový výber jesene fungoval, ale grafika nebola dostatočne jesenná.

Oprava používa selektívnu úpravu farebnosti rastlín priamo v prehliadači, aby zostali zachované pôvodné hory, kostolík, cesta aj obloha. Pozadie sa pri prechode deň–noc stále nemení na inú fotografiu.

- **Jar:** svieža svetlejšia zeleň a jemné kvety na strome.
- **Leto:** sýta zelená tráva a listy.
- **Jeseň:** počas septembra sa postupne objavuje zlaté lístie, v októbri a novembri prevládajú žlté, oranžové a hnedé odtiene aj na tráve.
- **Zima:** holý strom aj bez snehu; pri teplom suchom počasí je zem bez snehového efektu. Pri mraze sa môže zobraziť ilustračná námraza a pri hlásenom snežení padajúci sneh. Skutočnú snehovú pokrývku program nemeria.

Nová voľba v grafickom editore **„Výrazné farby ročných období (jar, leto, jeseň)”** je zapnutá predvolene. Pri potrebe vypnutia použi `season_colors: false`. Pri prepínaní počiatočnej fotografie sa môže úprava farieb načítať s krátkym oneskorením (najmä na slabšom tablete), no pôvodný obrázok zostáva viditeľný.

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
scene: auto
season_colors: true
```

Dňa **21. novembra 2026** musí `scene: auto` zvoliť **autumn**, bez ohľadu na to, či je deň alebo noc. Je to vizuálna sezónna úprava; skutočnú farbu lístia v okolí domu nemeriame.

## Nové vo V1.3.1 – Kamery bez šetriča

Pri otvorenom pop-upe `#kamery` alebo pohľade `/lovelace/kamery` sa celoplošný šetrič **automaticky pozastaví**. Po návrate na Domov alebo iný pohľad začne nových 30 sekúnd nečinnosti. Kamera sa tým nevypína ani neprerušuje.

Nastavenie je **predvolene zapnuté** a je prístupné aj v grafickom editore karty. V YAML môžeš použiť:

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
pause_on_camera: true
```

Ak by si ho niekedy chcel vypnúť, nastav `pause_on_camera: false`. Táto funkcia rozpoznáva hash `#kamery`, `#kamera`, `#camera`, `#cameras` a rovnako pomenované Lovelace pohľady.

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

**Ručná inštalácia:** Skopíruj obsah `dist/` do `/config/www/ha-seasons-universal/`, pridaj Dashboard zdroj typu JavaScript Module `/local/ha-seasons-universal/ha-seasons-universal.js?v=1.6.0`, obnov stránku a pridaj manuálnu kartu.

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
