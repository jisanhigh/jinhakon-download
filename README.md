# 진학ON — Windows 설치판 및 소스

지산고등학교 진학 업무용 로컬 프로그램입니다. **현재 권장 설치판은 기존 Go/Edge 프로그램을 덮어쓰는 v1.0.5**입니다.

## 업데이트 안내

- [기존 설치판 덮어쓰기·데이터 보존 안내](docs/ORIGINAL_UPDATE.md)
- [GitHub Actions: 원본 설치판 업데이트 빌드](../../actions/workflows/build-windows.yml)
- [CalendarTask 설치 및 DB 사용](docs/CALENDARTASK.md)
- [배포 점검표](docs/RELEASE_CHECKLIST.md)

기존 설치 위치: `%LOCALAPPDATA%\Programs\JinhakON`

기존 상담·성적 데이터 위치: `%LOCALAPPDATA%\JinhakON\EdgeProfile`

수시진학관리 Excel 및 CalendarTask `.db`는 공개 저장소에 올리지 않습니다.

## 코드 구성

- `app/index.html` — 화면 및 합격발표 DB 내보내기
- `legacy/launcher` — 원래 Go + Edge 애플리케이션 (기존 포트 28745 유지)
- `legacy/installer` — 기존 설치 경로에 덮어쓰는 Windows 설치기
- `scripts/copy-vendor.cjs` — 오프라인 SQLite 엔진 포함
- `.github/workflows/build-windows.yml` — Windows 빌드·테스트 설치기 다운로드

**주의:** 앞서 시험 제작된 Electron 방식 v1.0.4는 기존 진학ON과 설치 경로 및 저장 프로필이 달라 별도 앱이 생성됩니다. 현재 사용자 업데이트에 권장하지 않습니다. Electron 시험 소스(`electron/`, `package.json`)는 참고용이며, GitHub의 기본 Windows 빌드는 기존 Go 설치판입니다.

## 개발·테스트

GitHub Actions의 **Build original JinhakON updater (Go / Edge)** 실행 결과에서 `JinhakON_Setup_1.0.5_OriginalUpdate` 빌드 아티팩트를 받습니다. 이 파일은 정식 서명 설치파일이 아니며 실제 PC에서 실행 및 CalendarTask DB 불러오기 검증이 필요합니다.

기존 GitHub 릴리스 v1.0.3은 이전 안정판으로 보존합니다.
