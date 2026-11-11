# Prywatność i ochrona danych

Krąg będzie przechowywać informacje o zdrowiu: leki, wizyty, wypisy ze szpitala. Według RODO to dane szczególnej kategorii (art. 9), dlatego ochronę danych projektujemy od pierwszego dnia, a nie na końcu (art. 25 RODO: uwzględnianie ochrony danych w fazie projektowania i domyślna ochrona danych).

## Twarda zasada

Dopóki nie będzie gotowy cały komplet poniżej, w aplikacji są wyłącznie zmyślone dane testowe:

- polityka prywatności i regulamin sprawdzone przez prawnika,
- wyraźna zgoda użytkownika na przetwarzanie danych o zdrowiu,
- umowy powierzenia przetwarzania danych z każdym dostawcą (serwer, baza danych, AI),
- rejestr czynności przetwarzania,
- ocena skutków dla ochrony danych (DPIA).

## Siedem zasad

1. **Minimum danych** – zbieramy tylko to, czego aplikacja naprawdę potrzebuje.
2. **Dane w Unii Europejskiej** – serwery i dostawcy z UE, np. baza danych we Frankfurcie.
3. **Każdy krąg widzi tylko swoje** – rodzina decyduje, co widzi opiekunka lub pielęgniarka.
4. **Bez śledzenia** – żadnych reklam, pikseli ani analityki marketingowej. Nie śledzimy lokalizacji opiekunek.
5. **AI tylko proponuje** – decyzję zawsze podejmuje człowiek, a treści przygotowane przez AI są wyraźnie oznaczone.
6. **Sekrety poza kodem** – hasła i klucze są tylko w `.env.local` i w ustawieniach serwera, nigdy w repozytorium.
7. **Dziennik dostępu** – od etapu logowania zapisujemy, kto i kiedy otwierał dane podopiecznego.

## Co już działa

- Czcionka jest pobierana podczas budowania aplikacji i serwowana z naszego serwera, więc przeglądarka użytkownika nie łączy się z Google.
- Nagłówki bezpieczeństwa: wymuszone HTTPS, zakaz osadzania aplikacji w cudzych stronach, ograniczone informacje o źródle wejścia.
- Strona nie ma dostępu do lokalizacji. Aparat (zdjęcie wypisu) i mikrofon (notatki głosowe) może używać tylko nasza strona.
- Plik `.env.local` z sekretami jest wykluczony z repozytorium.
- Cookie są tylko trzy: wybrany język (powstaje dopiero po kliknięciu języka), sesja logowania i klucz połączonego ekranu seniora. Żadne nie służy do śledzenia.
- Logujemy się jednorazowym kodem z e-maila, bez haseł. Kod działa raz, przez 10 minut.
- Senior nie ma konta ani hasła. Jego telefon albo tablet łączy koordynator kodem QR, który działa raz przez 30 minut, i może go w każdej chwili odłączyć.
- Linki z zaproszeniami, kody QR i klucze urządzeń zapisujemy w bazie tylko jako skróty (hash). Nawet ktoś, kto zobaczy bazę, nie otworzy dzięki nim żadnego kręgu.
- Dziennik dostępu zapisuje, kto i kiedy oglądał albo zmieniał dane podopiecznego.

## Mapa danych

Spis wszystkich danych, które zbieramy: co, po co, kto to widzi i jak długo przechowujemy, jest w [docs/mapa-danych.md](mapa-danych.md). Na jej podstawie powstaną baza danych i polityka prywatności.
