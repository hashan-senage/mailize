package storage

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestSanitizeFilename(t *testing.T) {
	cases := map[string]string{
		"report.pdf":             "report.pdf",
		"../../etc/passwd":       "passwd",
		`..\..\win\system32.ini`: "system32.ini",
		"a<b>c:d|e?.txt":         "a_b_c_d_e_.txt",
		"":                       "attachment",
		"..":                     "attachment",
		"   ":                    "attachment",
		"CON.txt":                "_CON.txt",
		"nul\x00byte.txt":        "nul_byte.txt",
	}
	for in, want := range cases {
		if got := SanitizeFilename(in); got != want {
			t.Errorf("SanitizeFilename(%q) = %q, want %q", in, got, want)
		}
	}
	long := strings.Repeat("a", 400) + ".pdf"
	if got := SanitizeFilename(long); len(got) > 150 || !strings.HasSuffix(got, ".pdf") {
		t.Errorf("long name not truncated sensibly: %d", len(got))
	}
}

func TestResolveBlocksTraversal(t *testing.T) {
	root := t.TempDir()
	for _, bad := range []string{"..", "../x", "a/../../x", ".." + string(filepath.Separator) + "x"} {
		if _, err := Resolve(root, bad); err == nil {
			t.Errorf("Resolve(%q) escaped root", bad)
		}
	}
	if p, err := Resolve(root, "sub/file.bin"); err != nil || !strings.HasPrefix(p, root) {
		t.Errorf("valid path rejected: %v", err)
	}
}

func TestNewCreatesLayout(t *testing.T) {
	s, err := New(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if s.RawDir == "" || s.AttachmentsDir == "" || s.DatabasePath == "" {
		t.Errorf("incomplete layout: %+v", s)
	}
}
