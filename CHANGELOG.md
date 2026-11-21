# Zmeny

## 1.10.4 (2026-11-22)
- Realistické dekorácie prispôsobené tmavej nočnej krajine: nižší jas ihličia a vence, zachované teplé plamene a žiarovky.
- Stromček je ukotvený hlbšie v tráve pri kostole; veniec sa presunul od plota na trávnatý okraj kľukatej cesty.
- Pridané jemné kontaktné tiene a svetelný nádych na zemi, bez zásahu do základnej fotografie.
- Testy aktualizované pre nové referenčné súradnice a dynamické nasvietenie.
- Adventné dátumy, zapálenie sviečok a rozsvietenie stromčeka na Mikuláša zostávajú bez zmeny.


## 1.10.3 (2026-11-22)
- Oprava vizuálneho testu: stromček vo verzii 1.10.2 visel pred vstupom do kostola a veniec bol príliš vysoko a veľký.
- Teraz sa oba realistické obrázkové objekty umiestňujú podľa **miesta dotyku so zemou**, nie podľa horného rohu obrázka. Menší stromček stojí v tráve napravo od kostola; veniec leží bližšie ku chodníku.
- Dekorácie zostávajú na správnom mieste aj pri rôznom pomere strán, posune pozadia a zobrazení na výšku.
- Jemné kontaktné tiene pomáhajú vizuálne ukotviť objekty. Pomocný text na návrat po 9 sekundách zmizne, samotný dotyk na návrat stále funguje.
- Nový test `test-holiday-placement.cjs` overuje polohu dekorácií v širokom aj úzkom režime. Adventný kalendár a existujúce nastavenia sa nemenia.


## 1.10.2 (2026-11-22)
- Nahradené kreslené SVG ikony fotorealistickým stromčekom a adventným vencom v transparentných WebP obrázkoch.
- Opravené ukotvenie dekorácií: stromček hneď napravo od kostola, veniec vedľa cesty a stromčeka.
- Samostatný rozsvietený a zhasnutý stromček, realistické sviečky s postupným zapaľovaním po nedeliach.
- Test súborov a umiestnenia, pôvodná logika adventného kalendára zachovaná.

## 1.10.1 (2026-11-21)
- Zmenšený adventný veniec a vianočný stromček, aby mierka zodpovedala dedine na pôvodnej fotografii.
- Na vstavaných sezónnych fotografiách je stromček medzi existujúcim stromom a kostolom, bližšie ku kostolu; veniec stojí v tráve neďaleko stromčeka a chodníka.
- Pozície sú viazané na súradnice fotografie (1536 × 864) a rešpektujú orez obrázka, jeho posun, orientáciu a režim `contain`/`cover`.
- Pri vlastnej fotografii zostáva univerzálne rozloženie v rohoch, pretože umiestnenie kostola a cesty nie je známe.
- Adventný kalendár a zapaľovanie sviečok sa nemenia.

## 1.10.0 (2026-11-21)
- Vianočný motív sa automaticky začína prvou adventnou nedeľou, ktorá sa každý rok vypočíta podľa kalendára.
- Adventný veniec viditeľný od prvej adventnej nedele do 24. decembra; pri každej ďalšej adventnej nedeli pribudne jeden plamienok, maximálne štyri.
- Plamienky sviečok sa zobrazujú iba pri zotmení a v noci podľa slnečnej výšky (sun.sun); vo dne sú sviečky nezapálené.
- Vianočný stromček je od začiatku adventu nesvietiaci, od 6. decembra večer sa automaticky rozsvecuje až do 6. januára.
- Oba prvky možno samostatne vypnúť v grafickom editore alebo cez YAML; zachované vlastné fotografie a ostatné efekty.
- Test `test-advent.cjs` pokrýva roky 2026–2028, kalendár, prechod dňa a noci.

## 1.9.2 (2026-11-21)
- Hmla sa zobrazuje **výhradne** pri stave `weather.* = fog` alebo `mist`.
- Zamračené / polooblačné / jasno / dážď / sneh už nikdy automaticky nepridávajú hmlu z vlhkosti či rosného bodu.
- Oblaky sú obmedzené na hornú časť oblohy; intenzity jasného, polooblačného a zamračeného počasia sa odlišujú bez zahmlenia dediny.
- Upravené testy `test-clear-scenery.cjs` a `test-unified-landscape.cjs`; zachované nočné osvetlenie, sezóny, vývoz odpadu a vlastné fotografie.


## 1.9.1 (2026-11-21)
- Čistejšie nebo bez umelého hmlistého efektu pri polooblačnom a zamračenom počasí.
- Silnejšia hmla sa vykreslí predovšetkým pri `weather.* = fog`; odhad z vlhkosti je jemnejší.
- Zachovaná konfigurovateľná fotografia z V1.9 a pôvodné funkcie Home Assistanta.

## 1.9.0 (2026-11-21)
- Voliteľná vlastná fotografia alebo samostatné fotografie pre jar, leto, jeseň, zasneženú a suchú zimu.
- Sezónne farebné filtre a počasie na vlastnej fotografii, bez pevne zakreslených svetiel z pôvodnej dediny.
- Grafický editor obrázkov, nastavenie intenzity sezónnych farieb a bezpečná náhradná fotografia.
- Test `test-custom-backgrounds.cjs` pre vlastné fotografie.


## 1.8.0 (2026-11-21)
- Voliteľný vývoz komunálneho a separovaného odpadu s automatickým rozpoznaním dátumových senzorov.
- Termíny Dnes/Zajtra sú zvýraznené; neexistujúce alebo neplatné senzory nezobrazujú žiadnu sekciu.
- Podpora vlastných entít `waste_municipal` a `waste_recycling` a prepínača `show_waste` v grafickom editore.
- Nočná fotografia je viditeľnejšia vďaka šetrnejšiemu kontrastu a slabším tmavým vrstvám.
- Zachované plynulé svitanie/západ, počasie, ročné obdobia, Mesiac, šetrič Kamery a bez pohyblivých chodcov a áut.
- Nový test `test-waste-display.cjs` pre senzory, dátumy, absentujúce hodnoty a nočný kontrast.


## 1.7.1 (2026-11-21)
- Odstránená simulácia Living World: animovaní chodci, autá a vtáky už neprechádzajú cez budovy.
- Obnovený čistý kód V1.6.1 so zachovaním počasia, sezón, nočného jasu, hmly, snehu, Slnka, Mesiaca a pozastavenia šetriča pri Kamerách.
- Z grafického editora odstránené voľby `living_world`, `living_density`, `living_people`, `living_cars` a `living_birds`.
- Odstránený test Living World z GitHub Actions; staré parametre v YAML sú ignorované.


## 1.7.0 (2026-11-21)
- Živá dedina s animovanými chodcami, autami a vtákmi.
- Denný režim a počasie prispôsobujú hustotu pohybu; v noci sú vtáky vypnuté.
- Perspektívne trasy mapované na schválené fotografie 1536 × 864.
- Úsporné vykresľovanie: živá vrstva približne 12 FPS a zastavenie po ukončení šetriča.
- Nové nastavenia `living_world`, `living_density`, `living_people`, `living_cars`, `living_birds` v editore.
- Nový test `test-living-world.cjs` v GitHub Actions.


## 1.6.1 (2026-11-21)
- Výraznejšie detaily nočnej krajiny, ale stále modrý nočný vzhľad
- Jemnejšie nočné filtre a súmrakové osvetlenie zachovávajúce plynulé stmievanie
- Nový posuvník `night_brightness` (80–135 %, predvolené 110 %) v grafickom editore
- Denné osvetlenie a integrácia WS2900 zostali nedotknuté
- Test `test-night-brightness.cjs` vrátane dňa, Mesiaca, oblačnosti a nastaviteľného nočného jasu


## 1.6.0 (2026-11-21)
- Päť fotografických záberov z používateľom schváleného štvoročného obrázka: jar, leto, jeseň, zasnežená zima, teplá zima bez snehu
- Obnovilo sa kvitnutie po celú jar, iba zelená koruna v lete a holé vetvy na jeseň a v zime
- Zachované napojenie na Home Assistant: výška slnka, jas WS2900, mesačná fáza, počasie, statické oblaky, hmla, dážď/sneh
- Prekalibrované pozície svetiel dediny a kostolíka a hmly pre nové fotografie
- Predpripravené sezónne snímky už nepodliehajú ďalšiemu canvas prefarbovaniu
- Zimná fotografia bez snehu pri teplom počasí, snežná pri snežení alebo výraznejšej simulovanej pokrývke
- Aktualizované testy sezón a kontrola úplnosti všetkých piatich fotografií


## 1.5.0 (2026-11-21)
- Audit hotfix: odstránená neodôvodnená snehová vrstva počas teplej suchej zimy; holý strom zostáva
- Nový runtime test núdzového obrázka pri chýbajúcich WebP súboroch a kontrola povinných assetov
- Jeden spoločný fotografický záber pre všetky ročné obdobia, s vlastnou záložnou scénou ak obrázky chýbajú
- Pôvodná fotografia a odvodená verzia s holými vetvami na neskorú jeseň / zimu
- Jesenná tráva a stromy sa farbia do hneda, zimná krajina zostáva bez lístia
- Statická hmla podľa predpovede a voliteľne podľa vonkajšej vlhkosti, rosného bodu a vetra
- Nočné svetlá kostola a dediny, mesačné svetlo, sneh a zvyšok doterajšej logiky zachované
- Grafické prepínače `unified_scene` a `fog_effect`, nastaviteľné entity vlhkosti a rosného bodu
- Test `test-unified-landscape.cjs` pre obdobia, hmlu a sneh


## 1.4.0 (2026-11-21)
- Opravené takmer identické zelené podklady pre jar, leto a jeseň
- Selektívna zmena farby rastlín: jesenné zlaté a hnedé listy, sýte letné zelené a svieže jarné s jemnými kvetmi
- Zachovaná jediná fotografia bez skokov medzi denným a nočným zobrazením
- Overený novembrový výber scény a nový test `test-seasonal-colors.cjs`
- Prepínač `season_colors` v grafickom editore, štandardne zapnutý


## 1.3.1 (2026-11-21)
- Šetrič sa nespúšťa pri otvorenom pop-upe Kamery (`#kamery`) ani v pomenovanom pohľade kamier
- Po návrate z kamier sa 30-sekundové odpočítavanie nečinnosti spustí odznova
- Voliteľné nastavenie `pause_on_camera: true` a prepínač v grafickom editore
- Test `test-camera-tab.cjs` v GitHub Actions


## 1.3.0 (2026-11-21)
- Realistickejšia jasná, polooblačná a zamračená noc s primeranou viditeľnosťou krajiny
- Mesačné osvetlenie podľa fázy Mesiaca a oblačnosti, s plynulým ranným a večerným prechodom
- Rozsvietené okná kostolíka a dediny prispôsobené polohám na sezónnych fotografiách
- Jemná vizuálna námraza a snehová pokrývka podľa teploty (iba grafický odhad)
- Sneženie iba pri hlásenom snežení
- Nové grafické prepínače a test test-night-weather.cjs


## 1.2.0 (2026-11-21)
- Súvislé osvetlenie krajiny podľa výšky Slnka v sun.sun počas dňa, súmraku aj celej noci
- Hlboká noc je tmavšia než večer a pred svitaním sa automaticky zosvetľuje
- Ranné a večerné teplé farby, plynulé zobrazenie hviezd a Mesiaca
- Jeden obrázok krajiny počas celého 24-hodinového cyklu
- Slnečné žiarenie z meteostanice ovplyvňuje jas iba cez deň
- Nový test test-sun-cycle.cjs spúšťaný v GitHub Actions


## 1.1.0 (2026-11-21)
- Natívny grafický editor karty Home Assistant (`config-changed`)
- Automatické responzívne zobrazenie pre tablety na šírku / výšku a malé displeje
- Voľba vzhľadu, veľkosti hodín, priehľadnosti, zobrazovaných údajov a animácií
- Vizuálna konfigurácia zdroja počasia, scén a HA entít
- Zachovaný jeden obraz krajiny, bez prekrývania panorám

## 1.0.0
- Prvá univerzálna verzia celoplošného šetriča
