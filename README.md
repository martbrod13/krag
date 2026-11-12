# Krąg

Aplikacja do wspólnej opieki nad bliską osobą. Rodzina, opiekunka lub pielęgniarka i sam senior widzą to samo: leki, zadania i wizyty w jednym miejscu.

## Gdzie jesteśmy

Etap 4 z 7: **funkcje podstawowe**. Gotowe są fundament (szkielet aplikacji, cztery języki, automatyczne sprawdzanie kodu), mapa danych, baza danych w Neon i cały etap 3: logowanie kodem z e-maila, kręgi z zaproszeniami, ekran seniora łączony kodem QR i ustawienia kręgu. Z etapu 4 gotowe są plan dnia z zadaniami, nowa strona startowa, leki i wizyty opiekunki. Teraz kolej na pobieranie swoich danych.

1. ✅ **Fundament** – szkielet aplikacji, wygląd, cztery języki, automatyczne sprawdzanie kodu.
2. ✅ **Mapa danych i baza danych** – co zapisujemy, gdzie i po co ([docs/mapa-danych.md](docs/mapa-danych.md)).
3. ✅ **Logowanie, role i uprawnienia** – logowanie kodem z e-maila, zakładanie kręgu, zaproszenia, ekran seniora przez kod QR, ustawienia kręgu.
4. **Funkcje podstawowe** – plan dnia i zadania, leki, wizyty, pobieranie swoich danych.
5. **Funkcje „wow”** – np. odczytywanie wypisu ze szpitala.
6. **Dokumenty prawne i beta** – polityka prywatności, regulamin, pierwsi użytkownicy.
7. **Płatności** – pakiet premium. Na razie wszystko jest darmowe.

## Pierwsze uruchomienie (Windows)

Potrzebne są trzy programy: VS Code, Git i Node.js.

1. Zainstaluj Node.js ze strony nodejs.org. Wybierz wersję oznaczoną **LTS**.
2. Zainstaluj Git ze strony git-scm.com. Wszystkie opcje instalatora zostaw domyślne.
3. Utwórz folder `C:\projekty`. Nie trzymaj projektu w OneDrive ani na Pulpicie, bo synchronizacja potrafi psuć pliki projektu.
4. W VS Code naciśnij `Ctrl+Shift+P`, wpisz `Git: Clone` i wybierz **Clone from GitHub**. VS Code poprosi o zalogowanie do GitHuba – zgódź się.
5. Wybierz repozytorium aplikacji, a potem folder `C:\projekty`.
6. Gdy VS Code zapyta, czy otworzyć projekt, kliknij **Open**. Jeśli zapyta, czy ufasz autorom plików, kliknij **Yes, I trust the authors**.
7. W prawym dolnym rogu VS Code może pojawić się propozycja instalacji polecanych rozszerzeń. Kliknij **Install**.
8. Otwórz terminal: w menu kliknij **Terminal**, a potem **New Terminal**.
9. Wpisz `npm install` i naciśnij Enter. Poczekaj, aż skończy (zwykle 1–3 minuty).
10. Wpisz `npm run dev` i naciśnij Enter.
11. Otwórz w przeglądarce adres http://localhost:3000.

Aby zatrzymać aplikację, kliknij w terminal i naciśnij `Ctrl+C`.

### Tylko za pierwszym razem: plik package-lock.json

Po `npm install` w projekcie pojawi się nowy plik `package-lock.json`. Zapisuje on dokładne wersje wszystkich bibliotek, dzięki czemu u Ciebie i na GitHubie działa dokładnie to samo. Wyślij go na GitHub:

1. Kliknij ikonę **Source Control** po lewej stronie (trzecia od góry).
2. W polu **Message** wpisz `Dodaj package-lock.json`.
3. Kliknij **Commit**. Jeśli VS Code zapyta o „staged changes”, kliknij **Yes**.
4. Kliknij **Sync Changes**.

## Praca na co dzień

1. Claude przygotowuje zmiany i wysyła je na GitHub jako **Pull Request**.
2. GitHub sam sprawdza kod. Przy Pull Requeście pojawi się zielony znaczek (wszystko OK) albo czerwony (coś do poprawy).
3. Gdy znaczek jest zielony, kliknij **Merge pull request**, a potem **Confirm merge**.
4. W VS Code kliknij **Sync Changes** w zakładce **Source Control**, żeby pobrać nową wersję.
5. Jeśli zmienił się plik `package.json`, wpisz w terminalu `npm install`.
6. Jeśli w folderze `prisma/migrations` jest coś nowego, wpisz `npm run db:migrate`.
7. Wpisz `npm run dev` i sprawdź zmiany w przeglądarce.

Jeśli zapomnisz o `npm install` albo o pliku `.env.local`, `npm run dev` sam to wykryje i napisze po polsku, co zrobić.

## Baza danych (Neon)

Aplikacja zapisuje dane w bazie PostgreSQL w Neon, w projekcie `krag` (serwery we Frankfurcie). Dopóki nie ma dokumentów prawnych, są w niej wyłącznie zmyślone dane testowe.

### Jednorazowo: połączenie z bazą

1. W Neon otwórz projekt `krag` i kliknij **Connect**.
2. Wyłącz przełącznik **Connection pooling** i skopiuj adres, który zaczyna się od `postgresql://`.
3. W VS Code kliknij prawym przyciskiem myszy w puste miejsce w lewym panelu z plikami i wybierz **New File...**. Nazwij plik `.env.local`. Musi leżeć w głównym folderze projektu, obok `package.json`.
4. Wpisz w nim jedną linię i wklej adres między cudzysłowy: `DATABASE_URL="tu-wklej-adres"`. Zapisz plik (`Ctrl+S`). Ten plik nie pojawi się w **Source Control** i tak ma być: hasło do bazy nie trafi na GitHub.
5. W terminalu wpisz `npm install`, a potem `npm run db:migrate`. To polecenie zakłada tabele w bazie.
6. Wpisz `npm run db:seed`. To polecenie wgrywa zmyślone dane testowe: rodzinę Kowalskich i ich mamę Halinę.
7. Wpisz `npm run dev` i otwórz w przeglądarce http://localhost:3000/api/health. Jeśli widzisz `"database":"ok"`, aplikacja łączy się z bazą.

### Podgląd bazy

Wpisz `npm run db:studio`. W przeglądarce otworzy się Prisma Studio z tabelami i danymi testowymi. Aby je zamknąć, kliknij w terminal i naciśnij `Ctrl+C`.

## Logowanie

Logujemy się jednorazowym 6-cyfrowym kodem z e-maila, bez hasła. Konta i sesje są w naszej bazie danych.

Na razie aplikacja nie wysyła prawdziwych e-maili (dostawcę wybierzemy przed betą). Kod pojawia się w terminalu VS Code, w którym działa `npm run dev`.

### Jak przetestować

1. Wpisz `npm run dev` i otwórz http://localhost:3000.
2. Kliknij **Zaloguj się albo załóż konto** i wpisz e-mail osoby z danych testowych, np. `ania.kowalska@example.com` (koordynatorka kręgu „Mama Halina”) albo `ewa.wisniewska@example.com` (opiekunka).
3. Kliknij **Wyślij kod**. W terminalu VS Code pojawi się linia `Kod logowania dla ...: 123456`.
4. Przepisz kod i kliknij **Zaloguj się**. Od razu zobaczysz swoje kręgi, np. „Mama Halina”.
5. Możesz też wpisać dowolny inny adres e-mail. Wtedy aplikacja założy nowe konto i zapyta o imię.

## Kręgi i zaproszenia

Krąg to opieka nad jedną osobą. Kto zakłada krąg, zostaje jego koordynatorem.

### Jak przetestować

1. Zaloguj się jako `ania.kowalska@example.com` i kliknij krąg „Mama Halina”. Zobaczysz podopieczną i osoby w kręgu.
2. Kliknij **Zaproś osobę**, wybierz rolę i kliknij **Utwórz link**. Skopiuj link.
3. Wyloguj się. Najlepiej otwórz link w oknie prywatnym przeglądarki (`Ctrl+Shift+N`), żeby nie mieszać kont.
4. Kliknij **Zaloguj się, aby dołączyć**, wpisz dowolny nowy e-mail i kod z terminala, podaj imię i kliknij **Dołącz do kręgu**.
5. Nowa osoba jest w kręgu z wybraną rolą. Link już nie zadziała drugi raz.
6. Własny krąg założysz przyciskiem **Załóż krąg** na stronie startowej.

## Ekran seniora

Senior nie ma konta ani hasła. Koordynator pokazuje kod QR, telefon albo tablet seniora skanuje go aparatem i od razu ma prosty ekran: datę, godzinę i duże przyciski do dzwonienia do bliskich. Numery na te przyciski koordynator wpisuje w sekcji **Ważne numery**.

Kod QR działa jeden raz przez 30 minut. Połączone urządzenie zostaje połączone, dopóki koordynator go nie odłączy.

### Jak przetestować

1. Zaloguj się jako `ania.kowalska@example.com` i otwórz krąg „Mama Halina”.
2. W sekcji **Ekran seniora** kliknij **Zobacz podgląd**. Tak wygląda ekran mamy.
3. Wróć do kręgu. Przy **Ważne numery** kliknij **Edytuj** i dodaj dowolny numer. Od razu zobaczysz go w podglądzie.
4. Wróć do kręgu, kliknij **Połącz telefon lub tablet**, wpisz nazwę, np. `Telefon mamy`, i kliknij **Pokaż kod QR**.
5. Pod kodem, w części **Senior jest daleko?**, kliknij **Kopiuj link**. Otwórz okno prywatne przeglądarki (`Ctrl+Shift+N`) i wklej link. Okno prywatne udaje telefon mamy.
6. W oknie prywatnym kliknij **Połącz**, a potem **Przejdź do ekranu seniora**.
7. W pierwszym oknie po kilku sekundach pojawi się **Połączono!**. Kliknij **Gotowe**: w sekcji **Ekran seniora** jest nowe urządzenie.
8. Kliknij przy nim **Odłącz**, a potem **Tak, odłącz**. Odśwież okno prywatne: ekran napisze, że urządzenie zostało odłączone.

Prawdziwym telefonem zeskanujesz kod, gdy aplikacja będzie w internecie (przed betą). Teraz działa tylko na Twoim komputerze i telefon jej nie widzi.

## Ustawienia kręgu

Koordynator decyduje, kto jest w kręgu i co widzi, np. czy opiekunka widzi dokumenty. Może też usunąć kogoś z kręgu. Każdy może sam opuścić krąg, ale w kręgu zawsze zostaje co najmniej jeden koordynator. Dziennik dostępu pokazuje, kto i kiedy oglądał albo zmieniał dane.

Koordynator zmienia też dane podopiecznego (adres, lekarz prowadzący, data urodzenia) i może usunąć cały krąg ze wszystkimi danymi. Żeby nikt nie zrobił tego przez pomyłkę, trzeba wpisać nazwę kręgu.

### Jak przetestować

1. Zaloguj się jako `ania.kowalska@example.com`, otwórz krąg „Mama Halina” i kliknij **Ustawienia kręgu**.
2. Kliknij **Ewa Wiśniewska**, czyli opiekunkę. Zaznacz **Dokumenty** i kliknij **Zapisz zmiany**.
3. Kliknij **Tomek Kowalski**, wybierz rolę **Koordynator** i zapisz. Teraz krąg ma dwóch koordynatorów.
4. Wróć do kręgu i zjedź na dół strony. Pod **Opuść krąg** jest teraz przycisk. Wcześniej Ania była jedynym koordynatorem i zamiast przycisku była informacja, że najpierw trzeba wyznaczyć następcę.
5. Wróć do ustawień i kliknij **Otwórz dziennik dostępu**. Zobaczysz, kto i kiedy oglądał dane mamy, kto co zmieniał i kiedy „Tablet mamy” otwierał ekran seniora.
6. Na stronie kręgu, przy **Pod opieką**, kliknij **Edytuj**. Zmień np. adres albo lekarza i kliknij **Zapisz zmiany**.
7. Usuwanie wypróbuj na nowym kręgu. Na stronie startowej kliknij **Załóż krąg** i załóż np. „Test”. W jego ustawieniach, na samym dole, wpisz `Test` i kliknij **Usuń krąg na zawsze**.

Krąg testowy „Mama Halina” możesz w każdej chwili odtworzyć poleceniem `npm run db:seed`.

## Plan dnia i zadania

Wspólna lista: co trzeba zrobić, kiedy i kto się tym zajmuje. Na stronie kręgu, na samej górze, jest **Dziś**. Każdy, kto widzi zadania, może dodać zadanie, kliknąć **Biorę to** i oznaczyć zadanie jako zrobione. Zadanie z zaznaczonym **Pokaż na ekranie seniora** pojawia się tego dnia na ekranie seniora, np. wizyta u lekarza.

### Jak przetestować

1. Wpisz `npm run db:seed`. Plan testowy układa się wokół dnia, w którym go wczytasz.
2. Zaloguj się jako `ania.kowalska@example.com` i otwórz krąg „Mama Halina”. Na górze jest **Dziś** z dwoma zadaniami.
3. Kliknij kółko przy zadaniu: zadanie jest zrobione. Kliknij jeszcze raz, żeby to cofnąć.
4. Kliknij **Cały plan**. Zobaczysz zaległe zadania, dzisiejsze, kolejne dni, zadania bez dnia i ostatnio zrobione. Przy zadaniu „Kupić żarówki do łazienki” kliknij **Biorę to**.
5. Kliknij **Dodaj zadanie**, wpisz np. `Przyjazd wnuczki`, wybierz dzisiejszy dzień i godzinę, zaznacz **Pokaż na ekranie seniora** i kliknij **Dodaj zadanie**.
6. Wróć do kręgu i kliknij **Zobacz podgląd** w sekcji **Ekran seniora**. Pod godziną jest teraz **Dziś** ze spacerem i przyjazdem wnuczki.
7. Kliknij nazwę zadania, żeby je zmienić albo usunąć. Usunąć może osoba, która je dodała, albo koordynator.

## Strona startowa

Kto nie jest zalogowany, widzi na stronie startowej, czym jest Krąg: jak zacząć w trzech krokach, co jest w środku i jak dbamy o dane o zdrowiu. Po zalogowaniu strona startowa to od razu lista Twoich kręgów. Przy każdym kręgu widać, ile zadań jest na dziś i czy są zaległe. Kręgi, w których jesteś opiekunką, są osobno, w części **Twoi podopieczni**. Telefon albo tablet seniora po połączeniu trafia od razu na ekran seniora.

Na komputerze strony są szersze, a na telefonie układają się w jedną kolumnę. Stare adresy `/rodzina` i `/opiekun` prowadzą teraz na stronę startową.

### Jak przetestować

1. Otwórz okno prywatne przeglądarki (`Ctrl+Shift+N`) i wejdź na stronę aplikacji. Zobaczysz stronę dla nowych osób. Zwęż okno: na wąskim ekranie wszystko układa się jedno pod drugim, jak na telefonie.
2. Zaloguj się jako `ania.kowalska@example.com`. Od razu zobaczysz krąg „Mama Halina” i ile zadań jest w nim na dziś.
3. Kliknij krąg, a potem **← Moje kręgi** na górze strony, żeby wrócić.
4. Wyloguj się i zaloguj jako `ewa.wisniewska@example.com`. Krąg „Mama Halina” jest w części **Twoi podopieczni**.

## Leki

Lista leków podopiecznego z godzinami i dawkami, np. „Metformina 500 mg, o 8:00 i 20:00, po 1 tabletce”. Lek może być brany codziennie, w wybrane dni tygodnia albo doraźnie, czyli w razie potrzeby. Przy antybiotyku wpisuje się ostatni dzień brania.

Na ekranie seniora są „Leki na dziś”, ułożone według godzin. Przy każdej godzinie jest duży przycisk **Wzięte**: jedno dotknięcie potwierdza wszystkie leki z tej godziny. Przycisk pojawia się najwcześniej 2 godziny przed czasem. Rodzina i opiekunka widzą w kręgu, co już wzięte, mogą same oznaczyć dawkę jako wziętą i cofnąć pomyłkę. Dawka, której nikt nie potwierdził przez godzinę od jej czasu, jest oznaczona jako niepotwierdzona, także na stronie startowej.

Leki widzą tylko osoby z uprawnieniem do danych o zdrowiu. Potwierdzenia dawek trzymamy 12 miesięcy.

### Jak przetestować

1. Wpisz `npm run db:seed`. W danych testowych jest kilka leków i potwierdzone dawki z ostatnich dni.
2. Zaloguj się jako `ania.kowalska@example.com` i otwórz krąg „Mama Halina”. W sekcji **Leki** są dzisiejsze dawki. Kliknij kółko przy dawce: dawka jest wzięta. Kliknij jeszcze raz, żeby to cofnąć.
3. Kliknij **Wszystkie leki**. Zobaczysz dawki na dziś, potwierdzone dawki z ostatnich dni (jednego dnia brakuje wieczornej dawki) i listę leków. Antybiotyk jest w części **Zakończone**.
4. Kliknij **Dodaj lek**. Wpisz np. `Witamina C`, godzinę za kilka minut i `1 tabletka`. Zostaw zaznaczone **Przypominaj na ekranie seniora** i kliknij **Dodaj lek**.
5. Wróć do kręgu i w sekcji **Ekran seniora** kliknij **Zobacz podgląd**. W **Leki na dziś** przy tej godzinie jest duży przycisk **Wzięte**. W podglądzie przycisk tylko pokazuje, co widzi senior.
6. Jeśli masz połączone okno prywatne z ekranem seniora (patrz **Ekran seniora** wyżej), kliknij w nim **Wzięte**. W kręgu przy tej dawce pojawi się „Wzięte o … (ekran seniora)”.

## Wizyty opiekunki

Rodzina planuje wizyty: dzień, godziny, kto przyjdzie i co trzeba zrobić. Wizytę można powtarzać co tydzień przez 2, 4 albo 8 tygodni, np. od poniedziałku do piątku w godzinach 9:00–12:00. Opiekunka może też zaplanować wizytę sobie.

Na miejscu opiekunka klika **Zaczynam wizytę**. Zapisuje się tylko godzina, bez lokalizacji. Na koniec wypełnia raport: zaznacza, co zostało zrobione (np. posiłek, leki, spacer, zakupy), dopisuje kilka zdań i klika **Kończę wizytę i zapisuję raport**. Rodzina od razu widzi, kto jest teraz u podopiecznego i co działo się na wizycie. Wizyta z przeszłości, której nikt nie rozpoczął, jest oznaczona „Nie odnotowano wizyty”.

Opiekun zawodowy widzi tylko swoje wizyty i raporty, rodzina widzi wszystkie. Na ekranie seniora jest np. „Przyjdzie Ewa Wiśniewska”, a w czasie wizyty „Ewa Wiśniewska jest u Ciebie”. Na stronie startowej karta kręgu pokazuje dzisiejszą wizytę.

### Jak przetestować

1. Wpisz `npm run db:migrate`, a potem `npm run db:seed`. W danych testowych są wizyty Ewy z ostatnich dni (z raportami), dzisiejsza i kolejne.
2. Zaloguj się jako `ania.kowalska@example.com`. Na karcie kręgu jest „Wizyta dziś: Ewa Wiśniewska”. Otwórz krąg, a potem **Wszystkie wizyty**: jedna z ostatnich wizyt jest „Nie odnotowana”.
3. Kliknij **Zaplanuj wizytę**, wybierz np. **Co tydzień przez 2 tygodnie** i zaznacz kilka dni. Po zapisaniu wizyty pojawią się w **Najbliższe dni**.
4. Wyloguj się i zaloguj jako `ewa.wisniewska@example.com`. Otwórz dzisiejszą wizytę i kliknij **Zaczynam wizytę**. Potem zaznacz, co było zrobione, napisz kilka słów i kliknij **Kończę wizytę i zapisuję raport**.
5. Zaloguj się znowu jako Ania. W kręgu, w sekcji **Wizyty**, jest raport Ewy.

## Polecenia

- `npm run dev` – uruchamia aplikację na Twoim komputerze (http://localhost:3000).
- `npm run check` – sprawdza formatowanie, błędy, tłumaczenia, schemat bazy i typy (to samo, co sprawdza GitHub).
- `npm run format` – automatycznie porządkuje formatowanie wszystkich plików.
- `npm run build` – buduje wersję produkcyjną, czyli sprawdza, czy całość się składa.
- `npm run test:smoke` – po `npm run build` uruchamia aplikację i sprawdza, czy wszystkie strony się otwierają i czy baza odpowiada.
- `npm run test:db` – testy na bazie danych: kręgi, zaproszenia, ekran seniora, ustawienia kręgu, plan dnia, leki i wizyty (uruchamia je GitHub na bazie testowej).
- `npm run db:migrate` – zakłada albo aktualizuje tabele w bazie danych i odświeża klienta bazy danych w kodzie aplikacji.
- `npm run db:seed` – wgrywa zmyślone dane testowe. Można je wgrywać wiele razy, za każdym razem od nowa.
- `npm run db:studio` – otwiera podgląd bazy danych w przeglądarce.

## Co gdzie jest

- `src/app` – ekrany aplikacji. Nazwa folderu to adres strony, np. `logowanie` to `/logowanie`.
- `src/components` – elementy używane w wielu miejscach: przyciski, karty, logo.
- `src/i18n` – obsługa języków.
- `src/lib` – wspólny kod, np. połączenie z bazą danych.
- `prisma` – schemat bazy danych, migracje (kolejne zmiany w tabelach) i zmyślone dane testowe.
- `tests` – testy logiki na bazie danych.
- `messages` – wszystkie teksty widoczne w aplikacji, osobny plik dla każdego języka: `pl.json` (polski), `uk.json` (ukraiński), `ru.json` (rosyjski) i `en.json` (angielski).
- `public` – ikony aplikacji.
- `docs` – zasady projektu, m.in. prywatność danych.
- `.github` – automatyczne sprawdzanie kodu i aktualizacje bibliotek.

## Zasady

- Hasła, klucze i adresy baz danych trzymamy tylko w pliku `.env.local`. Ten plik nigdy nie trafia na GitHub. Wzór jest w `.env.example`.
- Do czasu ukończenia dokumentów prawnych używamy wyłącznie zmyślonych danych testowych. Żadnych prawdziwych danych o zdrowiu.
- Każdy tekst w aplikacji dodajemy do wszystkich plików w folderze `messages`, czyli we wszystkich czterech językach. GitHub sprawdza, czy niczego nie brakuje.
- Kod piszemy po angielsku, a adresy stron po polsku. Teksty dla użytkowników piszemy najpierw po polsku, potem tłumaczymy na pozostałe języki.
- Szczegóły ochrony danych: [docs/prywatnosc.md](docs/prywatnosc.md).

## Bezpieczeństwo na GitHubie (jednorazowo)

W repozytorium na GitHubie wejdź w **Settings**, potem w sekcję o bezpieczeństwie (**Advanced Security** albo **Code security**). Włącz **Dependabot alerts** i **Dependabot security updates**. GitHub będzie wtedy ostrzegał o dziurach w bibliotekach i sam proponował poprawki.

## Licencja

Wszelkie prawa zastrzeżone.
