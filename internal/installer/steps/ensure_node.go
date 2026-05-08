package steps

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/ulikunitz/xz"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
	"github.com/SolsticeSauer/solsclaw_beta/internal/platform"
)

// nodeLine is the canonical Node.js download channel. Pinning to "latest-v22.x"
// gives us the freshest patch in the LTS line at install time. Bump the major
// here when OpenClaw raises its floor.
const nodeLine = "latest-v22.x"
const nodeBaseURL = "https://nodejs.org/dist/" + nodeLine

// EnsureNode guarantees that npm is on PATH before the install-openclaw step
// runs. On a freshly provisioned server (Digital Ocean droplet, plain
// Ubuntu/Debian server image, etc.) Node.js is typically absent. We download
// a portable Node tarball from nodejs.org, verify it against the published
// SHASUMS256, and extract it under ~/.solsclaw/runtime/node so subsequent
// steps can find npm. Idempotent — re-runs just re-add the existing Node bin
// directory to PATH.
type EnsureNode struct{}

func (EnsureNode) ID() string    { return "ensure-node" }
func (EnsureNode) Label() string { return "Ensure Node.js is available" }

func (EnsureNode) ShouldRun(_ installer.StepContext) bool { return true }

func (s EnsureNode) Run(ctx context.Context, sc installer.StepContext) error {
	if commandExists("npm") || commandExists("pnpm") || commandExists("bun") {
		sc.Bus.Log(s.ID(), "info", "Found a JS package manager on PATH; skipping portable Node download.")
		return nil
	}

	nodeRoot := filepath.Join(platform.InstallerHome(), "runtime", "node")
	binDir := filepath.Join(nodeRoot, "bin")

	// Re-use a previous extraction if `node` exists and runs.
	if existsAndExecutable(filepath.Join(binDir, "node")) {
		sc.Bus.Log(s.ID(), "info", "Re-using portable Node at "+nodeRoot)
		return prependPATH(binDir)
	}

	nodeOS, nodeArch, archiveExt, err := nodePlatform()
	if err != nil {
		return err
	}

	sc.Bus.Log(s.ID(), "info", fmt.Sprintf("Resolving Node release for %s-%s from %s ...", nodeOS, nodeArch, nodeBaseURL))
	sums, err := fetchString(ctx, nodeBaseURL+"/SHASUMS256.txt")
	if err != nil {
		return fmt.Errorf("fetch SHASUMS256.txt: %w", err)
	}

	pattern := fmt.Sprintf("-%s-%s.%s", nodeOS, nodeArch, archiveExt)
	var filename, expectedSHA string
	for _, line := range strings.Split(sums, "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && strings.HasSuffix(fields[1], pattern) {
			filename = fields[1]
			expectedSHA = fields[0]
			break
		}
	}
	if filename == "" {
		return fmt.Errorf("no Node tarball matching %s in %s", pattern, nodeLine)
	}

	sc.Bus.Log(s.ID(), "info", "Downloading "+filename+" ...")
	body, sha, err := downloadWithSHA(ctx, nodeBaseURL+"/"+filename)
	if err != nil {
		return err
	}
	if sha != expectedSHA {
		return fmt.Errorf("checksum mismatch:\n  expected %s\n  actual   %s", expectedSHA, sha)
	}
	sc.Bus.Log(s.ID(), "info", fmt.Sprintf("Checksum verified (sha256=%s).", sha))

	if err := os.RemoveAll(nodeRoot); err != nil {
		return err
	}
	if err := os.MkdirAll(nodeRoot, 0o755); err != nil {
		return err
	}
	if err := extractTarball(body, nodeRoot, archiveExt); err != nil {
		return fmt.Errorf("extract: %w", err)
	}

	if !existsAndExecutable(filepath.Join(binDir, "node")) {
		return fmt.Errorf("extraction completed but %s/node is missing or not executable", binDir)
	}

	if err := prependPATH(binDir); err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", "Installed portable Node at "+nodeRoot)
	return nil
}

func nodePlatform() (osName, arch, ext string, err error) {
	switch runtime.GOOS {
	case "darwin":
		osName = "darwin"
		ext = "tar.gz"
	case "linux":
		osName = "linux"
		ext = "tar.xz"
	case "windows":
		// Windows native ships Node as .zip, which would need a separate
		// extraction path. Recommend WSL2 (which is Linux from our POV).
		err = fmt.Errorf("ensure-node on native Windows is not yet supported; install Node 22 from nodejs.org or run inside WSL2")
		return
	default:
		err = fmt.Errorf("ensure-node not supported on %s", runtime.GOOS)
		return
	}
	switch runtime.GOARCH {
	case "amd64":
		arch = "x64"
	case "arm64":
		arch = "arm64"
	default:
		err = fmt.Errorf("ensure-node not supported on %s/%s", runtime.GOOS, runtime.GOARCH)
	}
	return
}

func fetchString(ctx context.Context, url string) (string, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d", res.StatusCode)
	}
	b, err := io.ReadAll(res.Body)
	return string(b), err
}

// downloadWithSHA reads the entire body into memory while hashing it, so the
// caller can verify before writing anything to disk. Node tarballs are <50MB
// even for the LTS so an in-memory buffer is comfortably affordable.
func downloadWithSHA(ctx context.Context, url string) (io.Reader, string, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("HTTP %d", res.StatusCode)
	}

	h := sha256.New()
	var buf bytes.Buffer
	if _, err := io.Copy(io.MultiWriter(&buf, h), res.Body); err != nil {
		return nil, "", err
	}
	return &buf, hex.EncodeToString(h.Sum(nil)), nil
}

// extractTarball decompresses (gz or xz) and untars into dest, stripping the
// top-level "node-vX.Y.Z-os-arch/" directory the way `tar --strip-components=1`
// would. We refuse entries that would escape dest via "..".
func extractTarball(r io.Reader, dest, ext string) error {
	var stream io.Reader
	switch ext {
	case "tar.gz":
		gzr, err := gzip.NewReader(r)
		if err != nil {
			return err
		}
		defer gzr.Close()
		stream = gzr
	case "tar.xz":
		xzr, err := xz.NewReader(r)
		if err != nil {
			return err
		}
		stream = xzr
	default:
		return fmt.Errorf("unsupported archive extension: %s", ext)
	}

	cleanDest, err := filepath.Abs(dest)
	if err != nil {
		return err
	}

	tr := tar.NewReader(stream)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		// Strip the leading "node-vX.Y.Z-os-arch/" component.
		parts := strings.SplitN(hdr.Name, "/", 2)
		if len(parts) < 2 || parts[1] == "" {
			continue
		}
		rel := parts[1]
		target := filepath.Join(cleanDest, rel)

		// Containment check: the cleaned target must still live under dest.
		absTarget, err := filepath.Abs(target)
		if err != nil {
			return err
		}
		if !strings.HasPrefix(absTarget, cleanDest+string(filepath.Separator)) && absTarget != cleanDest {
			return fmt.Errorf("tar entry %q escapes destination", hdr.Name)
		}

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, fileMode(hdr.Mode, 0o755)); err != nil {
				return err
			}
		case tar.TypeReg, tar.TypeRegA:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, fileMode(hdr.Mode, 0o644))
			if err != nil {
				return err
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return err
			}
			if err := f.Close(); err != nil {
				return err
			}
		case tar.TypeSymlink:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			_ = os.Remove(target)
			if err := os.Symlink(hdr.Linkname, target); err != nil {
				return err
			}
		default:
			// Skip unsupported types (block / char / fifo) — Node's tarball
			// only contains files, dirs, and symlinks.
		}
	}
}

func fileMode(modeFromTar int64, fallback os.FileMode) os.FileMode {
	if modeFromTar == 0 {
		return fallback
	}
	return os.FileMode(modeFromTar) & 0o777
}

func existsAndExecutable(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir() && info.Mode()&0o111 != 0
}

// prependPATH adds dir to the front of the process PATH so subsequent
// exec.CommandContext calls (and pickPackageManager's lookups) find the
// portable binaries. Modifying os.Environ propagates to children automatically.
func prependPATH(dir string) error {
	current := os.Getenv("PATH")
	sep := string(os.PathListSeparator)
	if current == "" {
		return os.Setenv("PATH", dir)
	}
	return os.Setenv("PATH", dir+sep+current)
}
