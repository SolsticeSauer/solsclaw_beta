package steps

import (
	"bufio"
	"context"
	"errors"
	"io"
	"os/exec"
	"strings"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

// streamCommand runs a command and pipes each line of merged stdout/stderr
// to the bus as a log event. Returns the exit error (nil on success).
func streamCommand(ctx context.Context, sc installer.StepContext, stepID string, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	pipe, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		return err
	}

	scanLines(pipe, func(line string) {
		if line == "" {
			return
		}
		sc.Bus.Log(stepID, "info", line)
	})
	return cmd.Wait()
}

func scanLines(r io.Reader, fn func(line string)) {
	br := bufio.NewReader(r)
	for {
		line, err := br.ReadString('\n')
		line = strings.TrimRight(line, "\r\n")
		if line != "" {
			fn(line)
		}
		if err != nil {
			if !errors.Is(err, io.EOF) {
				fn(err.Error())
			}
			return
		}
	}
}

// commandExists is a non-throwing PATH lookup helper.
func commandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}
