# Dansk Ordsalat (4 × 4)

Et gratis dansk ordspil, som kan spilles på telefon, tablet eller computer. Dette projekt bruger egne filer og grafik og har ingen forbindelse til udgiveren af Word Salad.

## Spil på GitHub Pages

Spil: https://wonderwaage.github.io/ord-salat/

Redigering: https://wonderwaage.github.io/ord-salat/editor.html

Koden ligger i mappen `ord-salat/` på https://github.com/WonderWaage/WonderWaage.github.io/tree/master/ord-salat. Den øvrige hjemmeside er ikke ændret.

## Regler

- Brættet er **altid 4 kolonner × 4 rækker**.
- Et tema knytter ordene sammen. Et felt kan bruges højst én gang i samme ord, men ét bogstav kan indgå i **flere forskellige ord**.
- Træk fingeren eller musen gennem bogstaver, som støder sammen, herunder diagonalt. Du kan også vælge bogstaver enkeltvis og trykke **Tjek ord**.
- Et korrekt ord markeres som fundet. Bogstaver, som ikke længere er nødvendige for de resterende ord, kan falde væk, mens andre forbliver på brættet og falder ned.
- Der vises ordlængder, hints, tidsforbrug, og tidligere fund gemmes lokalt på enheden.
- Opgaven er løst, når alle temaord er fundet.

## Lav nye opgaver

1. Åbn editoren på `editor.html`.
2. Skriv tema, valgfri ledetråd og de danske ord, ét ord på hver linje. Æ, Ø og Å kan bruges.
3. **Ordene skal tilsammen have mindst 16 bogstaver**, men der må gerne være mere end 16, fordi forskellige ord kan dele bogstavfelter. For eksempel: `KAFFE`, `BRØD`, `SMØR`, `OST`, `ÆG` (18 bogstaver i fem ord).
4. Tryk **Generer puslespil**. Generatoren forsøger at placere alle ordene på et 4×4-bræt, og kan afvise vanskelige kombinationer, som ikke passer.
5. Tryk **Prøv det**, og gennemspil opgaven.
6. Tryk **Hent puzzles.js**, når dine opgaver er klar.
7. Åbn GitHub-lageret `WonderWaage/WonderWaage.github.io`, gå til **mappen `ord-salat`**, erstat `puzzles.js` med den downloadede fil, og commit ændringen. GitHub Pages opdateres fra dit eksisterende website.

**Gem en sikkerhedskopi (.json)** i editoren. Nye opgaver gemmes først lokalt i netop den browser, hvor du laver dem, indtil du offentliggør den opdaterede `puzzles.js`.

Det kræver ikke server eller database at spille. Hjemmesiden er offentlig, og svarene kan findes i JavaScript-filen, så systemet er ikke beregnet til hemmelige svar. Fremskridt deles ikke mellem enheder.

## Projektfiler

- `index.html`, `game.js`: selve spillet.
- `engine.js`: bræt, regler, løsningskontrol og generator.
- `puzzles.js`: den udgivne samling.
- `editor.html`, `editor.js`: editor, eksport og sikkerhedskopi.
- `preview.html`: afprøv en ny opgave lokalt inden udgivelse.
- `style.css`: design.

Der bruges ingen tredjepartsbiblioteker og ingen original kode eller grafiske filer fra Word Salad. De dokumenterede kernemekanikker er efterlignet. Ikke alle originale hjælpe-/hintvariationer er offentligt dokumenteret.
