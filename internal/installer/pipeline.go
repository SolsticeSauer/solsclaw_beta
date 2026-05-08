package installer

import "context"

// Step is a single idempotent unit of work in the install pipeline.
type Step interface {
	ID() string
	Label() string
	ShouldRun(ctx StepContext) bool
	Run(ctx context.Context, sc StepContext) error
}

// StepContext bundles everything a step might want to read or emit. Passing
// it explicitly avoids pulling globals into step implementations and makes
// them straightforward to unit-test.
type StepContext struct {
	Submission       WizardSubmission
	Bus              *Bus
	InstallerVersion string
}

// RunPipeline executes steps sequentially, stopping on the first failure.
// Each step gets its own status events on the bus so the UI can render a
// step-by-step progress view.
func RunPipeline(ctx context.Context, sc StepContext, steps []Step) (failedStep string, ok bool) {
	for _, step := range steps {
		if !step.ShouldRun(sc) {
			sc.Bus.Step(step.ID(), StatusSkipped, "")
			continue
		}
		sc.Bus.Step(step.ID(), StatusRunning, "")
		if err := step.Run(ctx, sc); err != nil {
			sc.Bus.Log(step.ID(), "error", err.Error())
			sc.Bus.Step(step.ID(), StatusFailed, err.Error())
			return step.ID(), false
		}
		sc.Bus.Step(step.ID(), StatusDone, "")
	}
	return "", true
}
