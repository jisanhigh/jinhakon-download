//go:build windows

package main

import (
    _ "embed"
    "encoding/base64"
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "syscall"
    "unicode/utf16"
    "unsafe"
)

//go:embed JinhakON.exe
var appExe []byte

func messageBox(title, message string, flags uintptr) {
    user32 := syscall.NewLazyDLL("user32.dll")
    proc := user32.NewProc("MessageBoxW")
    t, _ := syscall.UTF16PtrFromString(title)
    m, _ := syscall.UTF16PtrFromString(message)
    _, _, _ = proc.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), flags)
}

func psQuote(s string) string {
    return strings.ReplaceAll(s, "'", "''")
}

// Encode the shortcut command as UTF-16LE to preserve Korean filenames.
func encodePowerShell(script string) string {
    u16 := utf16.Encode([]rune(script))
    b := make([]byte, len(u16)*2)
    for i, v := range u16 {
        b[i*2] = byte(v)
        b[i*2+1] = byte(v >> 8)
    }
    return base64.StdEncoding.EncodeToString(b)
}

func createShortcuts(exePath, iconPath, installDir string) error {
    script := fmt.Sprintf(`
$ErrorActionPreference = 'Stop'
$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$start = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$targets = @(
  (Join-Path $desktop '진학ON.lnk'),
  (Join-Path $start '진학ON.lnk')
)
foreach($folder in @($desktop, $start)){
  Get-ChildItem -LiteralPath $folder -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $old = $ws.CreateShortcut($_.FullName)
      if((($old.TargetPath -eq '%s') -or ($old.TargetPath -eq '%s')) -and ($targets -notcontains $_.FullName)){
        Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
      }
    } catch {}
  }
}
foreach($p in $targets){
  $sc = $ws.CreateShortcut($p)
  $sc.TargetPath = '%s'
  $sc.WorkingDirectory = '%s'
  $sc.Description = '고3 진학상담 업무 자동화 프로그램'
  $sc.IconLocation = '%s,0'
  $sc.Save()
}
`, psQuote(exePath), psQuote(installDir), psQuote(exePath), psQuote(installDir), psQuote(iconPath))

    encoded := encodePowerShell(script)
    cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded)
    cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
    return cmd.Run()
}

func main() {
    local := os.Getenv("LOCALAPPDATA")
    if local == "" {
        messageBox("진학ON 설치", "LOCALAPPDATA 경로를 찾을 수 없습니다.", 0x10)
        return
    }
    installDir := filepath.Join(local, "Programs", "JinhakON")
    if err := os.MkdirAll(installDir, 0755); err != nil {
        messageBox("진학ON 설치", "설치 폴더를 만들 수 없습니다.\n"+err.Error(), 0x10)
        return
    }

    dest := filepath.Join(installDir, "JinhakON.exe")
    tmp := dest + ".new"
    if err := os.WriteFile(tmp, appExe, 0755); err != nil {
        messageBox("진학ON 설치", "프로그램 파일을 저장할 수 없습니다.\n"+err.Error(), 0x10)
        return
    }
    // Replace original executable without touching the saved Edge profile.
    backup := dest + ".backup"
    hadOld := false
    if _, err := os.Stat(dest); err == nil {
        if err := os.Remove(backup); err != nil && !os.IsNotExist(err) {
            _ = os.Remove(tmp)
            messageBox("진학ON 업데이트", "기존 백업 파일을 정리하지 못했습니다.\n"+err.Error(), 0x10)
            return
        }
        if err := os.Rename(dest, backup); err != nil {
            _ = os.Remove(tmp)
            messageBox("진학ON 업데이트", "기존 진학ON을 종료하고 잠시 후 다시 설치해 주세요.\n\n"+err.Error(), 0x10)
            return
        }
        hadOld = true
    }
    if err := os.Rename(tmp, dest); err != nil {
        _ = os.Remove(tmp)
        if hadOld { _ = os.Rename(backup, dest) }
        messageBox("진학ON 업데이트", "프로그램 교체 실패. 원본 복구를 시도했습니다.\n\n"+err.Error(), 0x10)
        return
    }

    iconPath := filepath.Join(installDir, "JinhakON.ico")
    // Preserve the original installed icon.
    if _, err := os.Stat(iconPath); err != nil { iconPath = dest }
    _ = os.Remove(filepath.Join(installDir, "VERSION.txt"))

    if err := createShortcuts(dest, iconPath, installDir); err != nil {
        messageBox("진학ON 설치", "프로그램 설치는 완료했지만 바로가기를 만들지 못했습니다.\n\n설치 위치: "+installDir+"\n\n"+err.Error(), 0x30)
    } else {
        messageBox("진학ON 설치", "진학ON 설치가 완료되었습니다.\n\n바탕화면의 '진학ON' 바로가기로 실행할 수 있습니다.", 0x40)
    }
    _ = exec.Command(dest).Start()
}