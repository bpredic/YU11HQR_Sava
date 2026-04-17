# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YU1HQR_Sava is a web portal for managing amateur radio (ham radio) WWA style event. The event is a global HAM scavanget hunt with activators and hunters. Activators require authentication on this portal and hunters do not. Activators are a predefined list of callsigns that hunters hunt on radio and should create QSOs with. Activators upload log files containing QSOs. The system processes Cabrillo and ADIF log files uploaded by activators. Hunters can freely enter their callsign and see the list of their confirmed QSOs and if fulfill conditions can download an award. The award is a predefined PDF file where the system should substitute generic callsign with hunter's callsign.

## Current Status

The repository contains example Cabrillo and ADIF data files in `LogFiles/`. cabrillo log files have extension .log and ADIF files have extension .adi

## Tech Stack
- **Backend**: [Next.js 15]
- **Frontend**: [React]
- **Language**: [TypeScript]
- **Styling**: [Tailwind CSS, Shadcn UI]
- **Database/ORM**: [SQLite, Prisma]

## Architecture & Project Structure
- **Framework**: Next.js 15+ (App Router)
- **Directory Map**:
  - `app/`: Routing and Server Components.
  - `components/ui/`: Reusable [shadcn/ui](https://shadcn.com) components.
  - `lib/`: Utilities, shared config, and API helpers.
  - `hooks/`: Custom React hooks.
  - `types/`: Global TypeScript definitions.
  - `CabrilloFiles` : Example Cabrillo files

## Coding Standards & Conventions
- **React Patterns**: Use Server Components by default; only use `'use client'` for interactivity.
- **State Management**: Prefer [Zustand](https://pmnd.rs) for client state and [TanStack Query](https://tanstack.com) for server state.
- **Styling**: Use Tailwind CSS exclusively; follow a mobile-first responsive approach.
- **TypeScript**: Strict mode is mandatory. Always define explicit return types for functions.
- **API Routes**: Place logic in `app/api/` handlers; use Zod for input validation.

## Guidelines for New Features
- Create components in `components/` before using them in pages.
- Handle loading states with `loading.tsx` and errors with `error.tsx`.
- Ensure all components are accessible (a11y) and SEO-friendly.

## Build and Development Commands
- Dev server: `npm run dev`
- Build: `npm run build`
- Type-check: `npm run type-check`
- Lint: `npm run lint`
- Test: `npm run test`

## Cabrillo Format Reference

Cabrillo 3.0 is the standard log format used by ham radio contest organizers. Key elements:

- **Header fields**: START-OF-LOG, CALLSIGN, CONTEST, CATEGORY-*, OPERATORS, NAME, ADDRESS, GRID-LOCATOR, EMAIL, CLAIMED-SCORE
- **QSO records**: `QSO: <freq> <mode> <datetime> <sent-call> <sent-rst> <sent-exch> <rcvd-call> <rcvd-rst> <rcvd-exch>`
- **Modes**: PH (Phone/SSB), CW (Morse), RY (Digital/RTTY)
- **Terminator**: END-OF-LOG

Example QSO line:
```
QSO:    3733 PH 2026-04-10 1730 YU4BPC        59   001  YU1P          59   002  TS
```
Fields: frequency (kHz), mode, date, time (UTC), sent callsign, sent RST, sent exchange, received callsign, received RST, received exchange (county code)

## Software functionalities
- Create a single admin user with username and pasword
- Create a page only for admin where admin can add new activator accounts and delete them. Registering activator account requires callsign and email. Notification email containing password should be emailed to the newly created activator to his email.
- When acttivator logs into the system he can upload his Cabrillo or ADIF log file. Create a separate page containing upload control and a list of uploaded log files. This list should show date of upload, number of QSOs and earliest and latest date and time of a QSO contained in this log file.
- Activator should have a separate page showing all uploaded QSOs from all files he uploaded. One row should show all standard QSO information like callsign, frequency, date and time, mode and a log file from which it was uploaded from. Detect duplicate QSOs when importing and after log file import show statistics, number of new QSOs added to the database and number of duplicate QSOs that are skipped. For each duplicate QSO show all relevant information and which activator and when uploaded and in which log file.
- Add a separate page for each of the files which lists all contacts QSLs in that file and show which ones have been confirmed by cross-referencing with other users' files
- Store all QSO data in a local SQLite database
- Hunters do not need to log into the portal. They have an option on the main page to enter their callsign and statistics page for that callsign is displayed.
- Statistics page for entered callsign should list all QSOs for that callsign that exist in log files data uploaded by activators. The list should show all relevant QSO data such as date and time, frequency, mode, activator callsign, how many points that QSO earns the hunter.
- Statistics page also shows total number of points earned by the hunter and if hunter earned more points than required for a diploma an option to download the PDF file of the diploma.

## Web design guidelines
- The theme for this HAM contest app is Sava river days
- Create adequate graphics for headers and CSS coloring scheme

## Pravila za racunanje poena
УСЛОВИ ЗА ОСВАЈАЊЕ ДИПЛОМЕ „SAVA“
Везе се признају у периоду од 1. до 7. јуна 2026. године
За диплому је потребно сакупити минимум 10 бодова
Обавезна је најмање једна потврђена веза са позивним знаком YT1SAVA
Са сваким позивним знаком може се остварити:
највише једна веза по опсегу (band) и по врсти рада (mode)
Везе на различитим опсезима се рачунају као посебне
Везе у различитим врстама рада се рачунају као посебне
Дигиталне врсте рада (FT8, FT4, FT2) рачунају се као засебни модови
Дупле везе:
Везе са истим позивним знаком на истом опсегу и у истој врсти рада не доносе додатне бодове
Слушања (SWL) се признају под истим условима као и двосмерне радио-везе
СИСТЕМ БОДОВАЊА
YT1SAVA, YU1HQR, YU1FI, YU1XO, YT1TU, YU4LUM, YU4URM, YU4CFA, YU4NPV, YU4RDX, YU4BCP, YU5TM, YU5DR, YT5FDE, YT5TNM, YT5WA, YT5MM, YU6DEJ, YU6DMR, YT1T

YT1SAVA – 6 бодова
YU1HQR – 2 бода
Сви остали позивни знаци – 1 бод
О ДАНУ РЕКЕ САВЕ
Дан реке Саве обележава се 1. јуна у земљама слива реке Саве: Словенији, Хрватској, Босни и Херцеговини и Србији.

Циљ:

промоција еколошке вредности реке
одрживо коришћење ресурса
регионална сарадња
унапређење квалитета вода и живота
ДОЗВОЉЕНЕ ВРСТЕ РАДА
CW, SSB, FT8, FT4, FT2, FM
