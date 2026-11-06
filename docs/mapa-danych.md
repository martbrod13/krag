# Mapa danych

Spis wszystkich danych, które Krąg będzie zapisywać: co, po co, kto to widzi, jak długo to trzymamy i na jakiej podstawie. Na tej mapie oprzemy bazę danych, politykę prywatności i ocenę skutków dla ochrony danych (DPIA).

**Status:** wersja robocza. Podstawy prawne i okresy przechowywania musi sprawdzić prawnik, zanim wpuścimy pierwszych prawdziwych użytkowników. Do tego czasu w aplikacji są wyłącznie zmyślone dane testowe.

Każda nowa tabela albo nowe pole w bazie danych musi najpierw trafić do tej mapy.

## Najważniejsze pojęcia

- **Krąg** – opieka nad jedną osobą: jej dane i ludzie, którzy mają do nich dostęp. Dane nigdy nie wychodzą poza krąg.
- **Podopieczny** – senior, którym się opiekujemy. Nie musi mieć konta ani hasła.
- **Koordynator** – członek rodziny, który zakłada krąg, zaprasza innych i decyduje, kto co widzi. W kręgu może być kilku koordynatorów.
- **Członek rodziny** – widzi i robi to, na co pozwoli koordynator.
- **Opiekun zawodowy** – opiekunka, opiekun albo pielęgniarka. Widzi tylko to, na co pozwoli rodzina. Może należeć do kilku kręgów, czyli opiekować się kilkoma osobami.

## Dane, które zapisujemy

### 1. Konto użytkownika

- **Co:** imię, adres e-mail, numer telefonu (nieobowiązkowy), wybrany język, data założenia konta.
- **Po co:** logowanie, zaproszenia do kręgu, powiadomienia.
- **Kto widzi:** sam użytkownik. Imię widzą też osoby z jego kręgów, a telefon tylko wtedy, gdy użytkownik go poda.
- **Jak długo:** do usunięcia konta.
- **Podstawa:** wykonanie umowy, czyli regulaminu (art. 6 ust. 1 lit. b RODO).

### 2. Krąg, role i zaproszenia

- **Co:** nazwa kręgu, osoby w kręgu, ich role i uprawnienia, kto kogo zaprosił, zaproszenia, połączone urządzenia podopiecznego (np. „tablet mamy”) z datą połączenia i ostatniego użycia.
- **Po co:** żeby każdy widział tylko dane swoich kręgów i tylko w zakresie, na który pozwolił koordynator. Połączone urządzenie pozwala podopiecznemu korzystać z prostego ekranu bez konta i hasła.
- **Kto widzi:** osoby z kręgu. Połączone urządzenia widzą koordynatorzy i mogą je w każdej chwili odłączyć.
- **Jak długo:** do usunięcia kręgu. Zaproszenie działa jeden raz i wygasa po 7 dniach, potem je usuwamy. Odłączone urządzenie usuwamy od razu.
- **Podstawa:** wykonanie umowy (art. 6 ust. 1 lit. b RODO).

### 3. Profil podopiecznego

- **Co:** imię, data urodzenia, miasto, adres (nieobowiązkowy, potrzebny opiekunowi do wizyt), kontakty alarmowe, lekarz prowadzący (nieobowiązkowy).
- **Po co:** plan opieki, wizyty opiekuna, koperta życia, przypomnienia o urodzinach, sprawdzanie świadczeń zależnych od wieku.
- **Kto widzi:** osoby z kręgu, także opiekun zawodowy, bo adres i kontakty alarmowe są mu potrzebne do wizyt i w nagłych sytuacjach.
- **Jak długo:** do usunięcia kręgu.
- **Podstawa:** do ustalenia z prawnikiem. Dane wpisuje rodzina, ale dotyczą podopiecznego, więc potrzebna jest jego zgoda albo zgoda jego przedstawiciela prawnego.

### 4. Dane o zdrowiu

To dane szczególnej kategorii (art. 9 RODO), więc chronimy je najmocniej.

- **Co:** leki, dawki i godziny przyjmowania, informacja, czy lek został podany, wizyty lekarskie, choroby i alergie (do koperty życia), notatki o samopoczuciu, pobyty w szpitalu.
- **Po co:** wspólne prowadzenie opieki przez rodzinę i opiekuna zawodowego.
- **Kto widzi:** osoby z kręgu, które mają uprawnienie do danych o zdrowiu. Opiekun zawodowy domyślnie widzi leki, plan dnia oraz choroby i alergie, bo bez nich nie da się bezpiecznie opiekować podopiecznym.
- **Jak długo:** do usunięcia kręgu. Każdy wpis można usunąć wcześniej.
- **Podstawa:** wyraźna zgoda podopiecznego albo jego przedstawiciela prawnego (art. 9 ust. 2 lit. a RODO). Do potwierdzenia z prawnikiem.

### 5. Zadania i plan dnia

- **Co:** zadania (np. „wykupić receptę”), kto wziął zadanie, termin, komentarze.
- **Po co:** podział obowiązków w rodzinie.
- **Kto widzi:** osoby z kręgu.
- **Jak długo:** do usunięcia zadania albo kręgu.
- **Uwaga:** treść zadania może zdradzać stan zdrowia, dlatego chronimy ją tak samo jak dane o zdrowiu.

### 6. Wizyty i raporty opiekuna zawodowego

- **Co:** termin wizyty, godzina rozpoczęcia i zakończenia wpisana przez opiekuna, raport z wizyty (tekst, później także notatka głosowa).
- **Po co:** rodzina wie, co działo się podczas wizyty.
- **Kto widzi:** opiekun, który prowadził wizytę, i rodzina z kręgu.
- **Jak długo:** do usunięcia kręgu.
- **Czego nie robimy:** nie zapisujemy lokalizacji (GPS) opiekuna ani podopiecznego.

### 7. Dokumenty

- **Co:** zdjęcia i pliki PDF, np. wypisy ze szpitala i recepty.
- **Po co:** wszystkie dokumenty w jednym miejscu, a z wypisu AI proponuje plan leków (etap 5).
- **Kto widzi:** osoby z kręgu z uprawnieniem do dokumentów. Opiekun zawodowy tylko wtedy, gdy rodzina na to pozwoli.
- **Jak długo:** do usunięcia dokumentu albo kręgu.
- **Podstawa:** jak przy danych o zdrowiu.
- **AI:** dokument czyta model AI u dostawcy z serwerami w UE. Dostawca nie może używać naszych danych do trenowania modeli. AI tylko proponuje, a zatwierdza człowiek.

### 8. Dziennik dostępu i bezpieczeństwa

- **Co:** kto i kiedy otworzył albo zmienił dane w kręgu. Przy logowaniu: data, rodzaj urządzenia i adres IP.
- **Po co:** bezpieczeństwo i wykrywanie nadużyć. Koordynator widzi, kto oglądał dane podopiecznego.
- **Kto widzi:** dziennik dostępu widzą koordynatorzy kręgu. Dziennik logowań widzi tylko sam użytkownik i administrator aplikacji.
- **Jak długo:** dziennik dostępu 12 miesięcy, dziennik logowań 90 dni.
- **Podstawa:** prawnie uzasadniony interes, czyli bezpieczeństwo danych (art. 6 ust. 1 lit. f i art. 32 RODO).

### 9. Pliki cookie

- **Co:** wybrany język. Od etapu 3 także cookie logowania (sesja).
- **Po co:** działanie aplikacji. Nie używamy cookie reklamowych ani analitycznych.
- **Jak długo:** język 12 miesięcy, sesja do wylogowania albo wygaśnięcia.

### 10. Płatności (etap 7)

- **Co:** plan (darmowy albo premium), status subskrypcji, historia płatności.
- **Czego nie zapisujemy:** danych karty. Obsługuje je operator płatności (Stripe).
- **Jak długo:** dokumenty księgowe tyle, ile wymagają przepisy podatkowe (zwykle 5 lat).

## Czego nie zbieramy

- Lokalizacji (GPS) opiekunów i podopiecznych.
- Numeru PESEL, numerów dokumentów ani danych do logowania w IKP.
- Kontaktów z telefonu.
- Danych do reklam i analityki marketingowej.

## Gdzie są dane

- **Baza danych:** Neon, serwery we Frankfurcie (UE).
- **Pliki** (dokumenty, nagrania): magazyn plików w UE, wybierzemy go w etapie 4.
- **Aplikacja:** serwer w UE, wybierzemy go przed betą.
- **Kopie zapasowe:** u dostawcy bazy danych, w UE.
- Połączenia są szyfrowane (HTTPS), a dane w bazie są zaszyfrowane na dysku.

## Dostawcy, którym powierzamy dane

Z każdym przed betą podpisujemy umowę powierzenia przetwarzania danych.

- **Neon** – baza danych (Frankfurt). Od etapu 2.
- **Hosting aplikacji** – do wyboru przed betą, region UE.
- **Wysyłka e-maili** (kody logowania, zaproszenia) – do wyboru w etapie 3, najlepiej z serwerami w UE.
- **AI do odczytu dokumentów** – planowo Mistral (Francja) i Claude przez AWS Bedrock (Frankfurt). Etap 5.
- **Stripe** – płatności. Etap 7.

## Prawa użytkowników

- **Usunięcie konta:** w każdej chwili, w ustawieniach. Dane znikają od razu, a z kopii zapasowych najpóźniej po 30 dniach.
- **Usunięcie kręgu:** koordynator może usunąć cały krąg ze wszystkimi danymi.
- **Pobranie danych:** przycisk „Pobierz moje dane” (art. 20 RODO), w etapie 4.
- **Wycofanie zgody:** w każdej chwili. Wtedy usuwamy dane o zdrowiu podopiecznego.

## Do ustalenia z prawnikiem

- Kto formalnie jest administratorem danych: osoba prywatna, jednoosobowa działalność czy spółka.
- Podstawa prawna dla danych podopiecznego, które wpisuje rodzina.
- Czy agencja, która zatrudnia opiekuna zawodowego, jest osobnym administratorem danych.
- Okresy przechowywania z tej mapy.

## Decyzje

1. Podopieczny nie ma konta ani hasła. Rodzina łączy jego prosty ekran z telefonem albo tabletem przez kod QR, bo seniorzy często boją się logowania i haseł.
2. Opiekun zawodowy domyślnie widzi wszystko, czego potrzebuje do opieki: profil podopiecznego z adresem i kontaktami alarmowymi, plan dnia, leki, choroby i alergie, zadania oraz swoje wizyty i raporty. Dokumenty (wypisy, recepty) widzi dopiero wtedy, gdy rodzina na to pozwoli. Ustawień kręgu i dziennika dostępu nie widzi.
3. Zapisujemy pełną datę urodzenia podopiecznego.
4. Zaproszenie do kręgu działa jeden raz i wygasa po 7 dniach.
5. Dziennik dostępu trzymamy 12 miesięcy, a dziennik logowań 90 dni.

Punkty 4 i 5 to propozycje, które można jeszcze zmienić.
