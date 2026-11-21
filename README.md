# HA Seasons Universal – celoplošný šetrič pre Home Assistant

Samostatný šetrič, ktorý sa spustí nad vlastným dashboardom po nastavenej nečinnosti. Podporuje lokálnu meteostanicu aj online počasie, ročné obdobia, sviatky, dážď/sneh, hodiny a grafický editor. Responzívny vzhľad je vhodný na tablety na šírku aj na výšku.

## Stav publikovania

**Dôležité:** V tomto repozitári zatiaľ nie je kompletná inštalácia. Grafické súbory a JavaScript treba nahrať spolu s celým priečinkom `dist/`. Do tej doby ho **neinštaluj cez Marketplace/HACS**.

Kompletný balík **V1.1.0** je pripravený. V konverzácii ChatGPT je dostupný ZIP **HA_Seasons_V1_1_NAHRAJ_NA_GITHUB.zip**. Obsahuje spúšťací súbor `SPUSTI_NAHRATIE_GITHUB.bat`, ktorý po rozbalení na Windows a potvrdení prihlásenia do GitHubu skopíruje všetky súbory do tohto repozitára.

Po nahratí je inštalácia pre Home Assistant 2026.11+ cez **Nastavenia → Marketplace → Add from link** s URL:
`https://github.com/vavro0321-max/ha-seasons-universal`.

### Použitie po inštalácii

Pridaj na svoj dashboard kartu **HA Seasons Universal** cez grafický editor alebo cez YAML:

```yaml
type: custom:ha-seasons-universal-card
idle_seconds: 30
source: auto
```

Bez lokálnej meteostanice môžeš zvoliť `source: online`. Pôvodný dashboard sa nemení.

*Projekt je nezávislý dashboardový plugin, nie oficiálna integrácia Home Assistanta.*
