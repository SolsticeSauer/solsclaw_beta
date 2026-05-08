package installer

import (
	"sync"
	"time"
)

type StepStatus string

const (
	StatusPending StepStatus = "pending"
	StatusRunning StepStatus = "running"
	StatusDone    StepStatus = "done"
	StatusFailed  StepStatus = "failed"
	StatusSkipped StepStatus = "skipped"
)

type Event struct {
	Type      string                 `json:"type"`
	Step      string                 `json:"step,omitempty"`
	Status    StepStatus             `json:"status,omitempty"`
	Level     string                 `json:"level,omitempty"`
	Message   string                 `json:"message,omitempty"`
	OK        *bool                  `json:"ok,omitempty"`
	Summary   map[string]interface{} `json:"summary,omitempty"`
	Timestamp int64                  `json:"timestamp,omitempty"`
}

// Bus is a tiny fan-out for pipeline events. The HTTP layer subscribes once
// per /api/install request and streams Send'ed events to the SSE client.
type Bus struct {
	mu  sync.Mutex
	out chan<- Event
}

func NewBus(out chan<- Event) *Bus { return &Bus{out: out} }

func (b *Bus) emit(ev Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.out != nil {
		b.out <- ev
	}
}

func (b *Bus) Step(id string, status StepStatus, message string) {
	b.emit(Event{
		Type:      "step",
		Step:      id,
		Status:    status,
		Message:   message,
		Timestamp: time.Now().UnixMilli(),
	})
}

func (b *Bus) Log(step, level, message string) {
	b.emit(Event{
		Type:      "log",
		Step:      step,
		Level:     level,
		Message:   message,
		Timestamp: time.Now().UnixMilli(),
	})
}

func (b *Bus) Done(ok bool, summary map[string]interface{}) {
	b.emit(Event{Type: "done", OK: &ok, Summary: summary})
}
