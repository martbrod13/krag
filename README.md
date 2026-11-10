# Krąg

Aplikacja do wspólnej opieki nad bliską osobą. Rodzina, opiekunka lub pielęgniarka i sam senior widzą to samo: leki, zadania i wizyty w jednym miejscu.

## Gdzie jesteśmy

Etap 3 z 7: **logowanie, role i uprawnienia**. Gotowe są fundament (trzy panele, cztery języki, automatyczne sprawdzanie kodu), mapa danych i baza danych w Neon. Teraz dochodzi logowanie kodem z e-maila.

1. ✅ **Fundament** – szkielet aplikacji, wygląd, cztery języki, automatyczne sprawdzanie kodu.
2. ✅ **Mapa danych i baza danych** – co zapisujemy, gdzie i po co ([docs/mapa-danych.md](docs/mapa-danych.md)).
3. **Logowanie, role i uprawnienia** – logowanie kodem z e-maila, zakładanie kręgu, zaproszenia, ekran seniora przez kod QR, ustawienia kręgu.
4. **Funkcje podstawowe** – plan dnia, leki, zadania, wizyty.
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
4. Przepisz kod i kliknij **Zaloguj się**. W panelu rodziny albo opiekuna zobaczysz krąg „Mama Halina”.
5. Możesz też wpisać dowolny inny adres e-mail. Wtedy aplikacja założy nowe konto i zapyta o imię.

## Polecenia

- `npm run dev` – uruchamia aplikację na Twoim komputerze (http://localhost:3000).
- `npm run check` – sprawdza formatowanie, błędy, tłumaczenia, schemat bazy i typy (to samo, co sprawdza GitHub).
- `npm run format` – automatycznie porządkuje formatowanie wszystkich plików.
- `npm run build` – buduje wersję produkcyjną, czyli sprawdza, czy całość się składa.
- `npm run test:smoke` – po `npm run build` uruchamia aplikację i sprawdza, czy wszystkie strony się otwierają i czy baza odpowiada.
- `npm run db:migrate` – zakłada albo aktualizuje tabele w bazie danych.
- `npm run db:seed` – wgrywa zmyślone dane testowe. Można je wgrywać wiele razy, za każdym razem od nowa.
- `npm run db:studio` – otwiera podgląd bazy danych w przeglądarce.

## Co gdzie jest

- `src/app` – ekrany aplikacji. Nazwa folderu to adres strony, np. `rodzina` to `/rodzina`.
- `src/components` – elementy używane w wielu miejscach: przyciski, karty, logo.
- `src/i18n` – obsługa języków.
- `src/lib` – wspólny kod, np. połączenie z bazą danych.
- `prisma` – schemat bazy danych, migracje (kolejne zmiany w tabelach) i zmyślone dane testowe.
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
