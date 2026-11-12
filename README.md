# 진학ON — Windows 설치판 및 소스

지산고등학교 진학 업무용 로컬 프로그램입니다. **정식 최신 버전은 v1.0.12**이며, 기존 Go/Edge 진학ON을 덮어쓰는 설치판입니다.

## 업데이트 안내

- [기존 설치판 덮어쓰기·데이터 보존 안내](docs/ORIGINAL_UPDATE.md)
- [정식 v1.0.12 설치파일](https://github.com/jisanhigh/jinhakon-download/releases/latest)
- [v1.0.12 릴리스 안내](docs/RELEASE_NOTES_1.0.12.md)
- [GitHub Actions 자동 빌드](../../actions/workflows/build-windows.yml)
- [CalendarTask 설치 및 DB 사용](docs/CALENDARTASK.md)
- [배포 점검표](docs/RELEASE_CHECKLIST.md)

기존 설치 위치: `%LOCALAPPDATA%\Programs\JinhakON`

기존 상담·성적 데이터 위치: `%LOCALAPPDATA%\JinhakON\EdgeProfile`

수시진학관리 Excel 및 CalendarTask `.db`는 공개 저장소에 올리지 않습니다.

## 코드 구성

- `app/index.html` — 학평·모평 성적 PDF 저장, PIN 재로그인 유지 및 다량 성적 화면 표시 속도 개선, 오늘 기준 전형 일정 달력, 수능최저 판정, 합격발표 DB 내보내기
- `legacy/launcher` — 원래 Go + Edge 애플리케이션 (기존 포트 28745 유지)
- `legacy/installer` — 기존 설치 경로에 덮어쓰는 Windows 설치기
- `scripts/copy-vendor.cjs` — 오프라인 SQLite 엔진 포함
- `.github/workflows/build-windows.yml` — Windows 빌드 및 v1.0.12 릴리스 파일 게시

**주의:** 앞서 시험 제작된 Electron 방식 v1.0.4는 기존 진학ON과 설치 경로 및 저장 프로필이 달라 별도 앱이 생성됩니다. 현재 사용자 업데이트에 권장하지 않습니다. Electron 시험 소스(`electron/`, `package.json`)는 참고용이며, GitHub의 기본 Windows 빌드는 기존 Go 설치판입니다.

## 개발·테스트

정식 배포판은 [GitHub Releases](https://github.com/jisanhigh/jinhakon-download/releases/latest)의 `JinhakON_Setup_1.0.12.exe`로 받습니다. 코드서명되지 않은 설치파일이며, 실제 PC에서 실행 및 CalendarTask DB 불러오기 검증이 권장됩니다.

기존 GitHub 릴리스 v1.0.3·v1.0.5는 이전 버전으로 보존합니다.
