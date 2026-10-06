// MemoriaCalc para Windows — lanzador nativo ultraligero.
// Sirve la aplicación embebida en 127.0.0.1 y la abre en una ventana de aplicación
// de Microsoft Edge (WebView del sistema, siempre presente en Windows 10/11).
package main

import (
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

//go:embed app.html
var appHTML []byte

const port = 47613

var lastPing atomic.Int64

// archivos .mcalc entregados por doble clic (token -> contenido)
var stash sync.Map
var seq atomic.Int64

func registerAssoc() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	q := `"` + exe + `" "%1"`
	cmds := [][]string{
		{"add", `HKCU\Software\Classes\.mcalc`, "/ve", "/d", "MemoriaCalc.Memoria", "/f"},
		{"add", `HKCU\Software\Classes\MemoriaCalc.Memoria`, "/ve", "/d", "Memoria de cálculo (MemoriaCalc)", "/f"},
		{"add", `HKCU\Software\Classes\MemoriaCalc.Memoria\DefaultIcon`, "/ve", "/d", exe + ",0", "/f"},
		{"add", `HKCU\Software\Classes\MemoriaCalc.Memoria\shell\open\command`, "/ve", "/d", q, "/f"},
	}
	for _, c := range cmds {
		cmd := exec.Command("reg", c...)
		hideWindow(cmd)
		cmd.Run()
	}
}

func fileArg() []byte {
	if len(os.Args) < 2 {
		return nil
	}
	b, err := os.ReadFile(os.Args[1])
	if err != nil || len(b) > 64<<20 {
		return nil
	}
	return b
}

func findBrowser() string {
	cands := []string{}
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LocalAppData"} {
		base := os.Getenv(env)
		if base == "" {
			continue
		}
		cands = append(cands,
			filepath.Join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(base, "Google", "Chrome", "Application", "chrome.exe"),
			filepath.Join(base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
		)
	}
	for _, c := range cands {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return ""
}

func openWindow(url string) *exec.Cmd {
	br := findBrowser()
	if br == "" {
		cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
		cmd.Start()
		return nil
	}
	prof := filepath.Join(os.Getenv("LOCALAPPDATA"), "MemoriaCalc", "Perfil")
	os.MkdirAll(prof, 0o755)
	cmd := exec.Command(br, "--app="+url, "--user-data-dir="+prof, "--window-size=1440,920",
		"--no-first-run", "--no-default-browser-check", "--disable-features=Translate,msEdgeSidebarV2,msHubApps",
		"--disable-sync", "--hide-crash-restore-bubble")
	cmd.Start()
	return cmd
}

func main() {
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	data := fileArg()
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		// ya hay una instancia sirviendo: entregarle el archivo y abrir otra ventana
		u := url
		if data != nil {
			if resp, e := http.Post(url+"stash", "application/json", bytes.NewReader(data)); e == nil {
				tok, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				u = url + "?abrir=" + strings.TrimSpace(string(tok))
			}
		}
		openWindow(u)
		return
	}
	go registerAssoc()
	first := ""
	if data != nil {
		t := strconv.FormatInt(seq.Add(1), 10)
		stash.Store(t, data)
		first = "?abrir=" + t
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" && r.URL.Path != "/index.html" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Write(appHTML)
	})
	mux.HandleFunc("/stash", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", 405)
			return
		}
		b, _ := io.ReadAll(io.LimitReader(r.Body, 64<<20))
		t := strconv.FormatInt(seq.Add(1), 10)
		stash.Store(t, b)
		io.WriteString(w, t)
	})
	mux.HandleFunc("/stash/", func(w http.ResponseWriter, r *http.Request) {
		t := strings.TrimPrefix(r.URL.Path, "/stash/")
		if v, ok := stash.LoadAndDelete(t); ok {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Write(v.([]byte))
			return
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		lastPing.Store(time.Now().Unix())
		w.WriteHeader(204)
	})
	go http.Serve(ln, mux)
	lastPing.Store(time.Now().Unix())
	cmd := openWindow(url + first)
	if cmd != nil {
		cmd.Wait()
	}
	// Mantener el servidor mientras alguna ventana siga enviando latidos
	for {
		time.Sleep(5 * time.Second)
		if time.Now().Unix()-lastPing.Load() > 40 {
			return
		}
	}
}
