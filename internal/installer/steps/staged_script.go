package steps

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
)

type stagedScript struct {
	Path   string
	SHA256 string
	Size   int64
}

// stage fetches a remote shell script to a private temp file and returns
// its hash so the caller can log it before execution. We deliberately avoid
// `curl ... | sh`; staging gives auditability and lets a paranoid operator
// inspect what is about to run.
func stage(url string) (stagedScript, error) {
	res, err := http.Get(url)
	if err != nil {
		return stagedScript{}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return stagedScript{}, fmt.Errorf("download %s: HTTP %d", url, res.StatusCode)
	}

	dir, err := os.MkdirTemp("", "solsclaw-stage-")
	if err != nil {
		return stagedScript{}, err
	}
	name := path.Base(url)
	if name == "" || name == "/" || name == "." {
		name = "script.sh"
	}
	target := filepath.Join(dir, name)
	f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o700)
	if err != nil {
		return stagedScript{}, err
	}

	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(f, h), res.Body)
	closeErr := f.Close()
	if err != nil {
		return stagedScript{}, err
	}
	if closeErr != nil {
		return stagedScript{}, closeErr
	}
	return stagedScript{
		Path:   target,
		SHA256: hex.EncodeToString(h.Sum(nil)),
		Size:   n,
	}, nil
}
