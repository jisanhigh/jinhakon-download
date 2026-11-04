//go:build windows

package main

import (
    "context"
    "embed"
    "fmt"
    "io"
    "net"
    "net/http"
    "net/url"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "sync/atomic"
    "time"
)

//go:embed index.html vendor/sql-asm.js
var appFS embed.FS

const (
    appPort = "28745"
    appURL  = "http://127.0.0.1:" + appPort + "/"
    healthMarker = "JinhakON"
)

func findEdge() string {
    candidates := []string{
        filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
        filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
        filepath.Join(os.Getenv("LOCALAPPDATA"), "Microsoft", "Edge", "Application", "msedge.exe"),
    }
    for _, p := range candidates {
        if p == "" || strings.HasPrefix(p, string(filepath.Separator)) {
            continue
        }
        if st, err := os.Stat(p); err == nil && !st.IsDir() {
            return p
        }
    }
    return ""
}

func appDataDir() string {
    base := os.Getenv("LOCALAPPDATA")
    if base == "" {
        base = os.TempDir()
    }
    return filepath.Join(base, "JinhakON")
}

func isServerRunning() bool {
    client := &http.Client{Timeout: 700 * time.Millisecond}
    resp, err := client.Get("http://127.0.0.1:" + appPort + "/health")
    if err != nil {
        return false
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return false
    }
    b, _ := io.ReadAll(io.LimitReader(resp.Body, 128))
    return strings.Contains(string(b), "JinhakON")
}

func openAppWindow() error {
    edge := findEdge()
    if edge == "" {
        u, _ := url.QueryUnescape(appURL)
        return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", u).Start()
    }
    profile := filepath.Join(appDataDir(), "EdgeProfile")
    _ = os.MkdirAll(profile, 0700)
    cmd := exec.Command(edge,
        "--app="+appURL,
        "--user-data-dir="+profile,
        "--no-first-run",
        "--disable-background-mode",
        "--start-maximized",
    )
    return cmd.Start()
}

func injectHeartbeat(html []byte) []byte {
    iconLink := []byte(`<link rel="icon" href="/favicon.ico" sizes="any">`)
    lower0 := strings.ToLower(string(html))
    if idx := strings.Index(lower0, "</head>"); idx >= 0 {
        tmp := make([]byte, 0, len(html)+len(iconLink))
        tmp = append(tmp, html[:idx]...)
        tmp = append(tmp, iconLink...)
        tmp = append(tmp, html[idx:]...)
        html = tmp
    }
    heartbeat := []byte(`<script>(function(){function p(){fetch('/ping',{cache:'no-store'}).catch(function(){});}p();setInterval(p,10000);})();</script>`)
    lower := strings.ToLower(string(html))
    idx := strings.LastIndex(lower, "</body>")
    if idx < 0 {
        return append(html, heartbeat...)
    }
    out := make([]byte, 0, len(html)+len(heartbeat))
    out = append(out, html[:idx]...)
    out = append(out, heartbeat...)
    out = append(out, html[idx:]...)
    return out
}

func main() {
    if isServerRunning() {
        _ = openAppWindow()
        return
    }

    rawHTML, err := appFS.ReadFile("index.html")
    if err != nil {
        return
    }
    html := injectHeartbeat(rawHTML)

    listener, err := net.Listen("tcp", "127.0.0.1:"+appPort)
    if err != nil {
        if isServerRunning() {
            _ = openAppWindow()
        }
        return
    }

    var lastPing atomic.Int64
    lastPing.Store(time.Now().UnixNano())

    mux := http.NewServeMux()
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path != "/" && r.URL.Path != "/index.html" {
            http.NotFound(w, r)
            return
        }
        lastPing.Store(time.Now().UnixNano())
        w.Header().Set("Content-Type", "text/html; charset=utf-8")
        w.Header().Set("Cache-Control", "no-store")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        _, _ = w.Write(html)
    })
    // Offline SQLite is bundled to preserve original Go/Edge profile and port.
    mux.HandleFunc("/vendor/sql-asm.js", func(w http.ResponseWriter, r *http.Request) {
        b, err := appFS.ReadFile("vendor/sql-asm.js")
        if err != nil { http.NotFound(w, r); return }
        w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        _, _ = w.Write(b)
    })
    mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
        b, err := os.ReadFile(filepath.Join(filepath.Dir(os.Args[0]), "JinhakON.ico"))
        if err != nil {
            http.NotFound(w, r)
            return
        }
        w.Header().Set("Content-Type", "image/x-icon")
        w.Header().Set("Cache-Control", "public, max-age=86400")
        _, _ = w.Write(b)
    })
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/plain; charset=utf-8")
        _, _ = fmt.Fprint(w, healthMarker)
    })
    mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
        lastPing.Store(time.Now().UnixNano())
        w.Header().Set("Cache-Control", "no-store")
        w.WriteHeader(http.StatusNoContent)
    })

    server := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}

    // Stop the local server after the application has been inactive.
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        defer ticker.Stop()
        for range ticker.C {
            t := time.Unix(0, lastPing.Load())
            if time.Since(t) > 2*time.Minute {
                ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
                _ = server.Shutdown(ctx)
                cancel()
                return
            }
        }
    }()

    go func() {
        time.Sleep(250 * time.Millisecond)
        _ = openAppWindow()
    }()

    _ = server.Serve(listener)
}