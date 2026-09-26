// Package workflows runs the deterministic year-end workflows (rollover, leavers,
// promotion, ...). Every workflow proposes first, a person reviews and edits the
// proposal, and only Apply writes, in one transaction that also stores a snapshot
// for Revert. No workflow calls an LLM; the same inputs always give the same result.
package workflows

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrUnknownWorkflow = errors.New("unknown workflow")
	ErrChecksFailed    = errors.New("some preconditions are not met")
	ErrNotProposed     = errors.New("this run is no longer an open proposal")
	ErrNotApplied      = errors.New("only an applied run can be reverted")
	ErrNotEditable     = errors.New("this cell cannot be edited")
	ErrInvalidOption   = errors.New("that value is not one of the allowed options")
	ErrUnknownRow      = errors.New("unknown section or row")
)

// Inputs are the values a person chose in the workflow form, keyed by InputField.Key.
type Inputs map[string]string

// Option is one choice for a select input or an editable select cell.
type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// InputField describes one form field; the frontend renders it without knowing the workflow.
type InputField struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	Type     string   `json:"type"` // select, text, date, boolean
	Required bool     `json:"required"`
	Default  string   `json:"default,omitempty"`
	Help     string   `json:"help,omitempty"`
	Options  []Option `json:"options,omitempty"`
}

// Check is one precondition. A blocking check that fails disables Propose and Apply.
type Check struct {
	Key      string `json:"key"`
	Title    string `json:"title"`
	OK       bool   `json:"ok"`
	Detail   string `json:"detail,omitempty"`
	FixPath  string `json:"fix_path,omitempty"`
	Blocking bool   `json:"blocking"`
}

// ToolInfo documents one backend operation a workflow step uses; the manual pages call the same code.
type ToolInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Mutates     bool   `json:"mutates"`
}

// StepInfo is one ordered step of a workflow and the tool it runs.
type StepInfo struct {
	Key   string `json:"key"`
	Title string `json:"title"`
	Tool  string `json:"tool"`
	Phase string `json:"phase"` // propose or apply
}

// Proposal is a generic, table-shaped result the frontend renders and edits.
type Proposal struct {
	Summary  []Stat    `json:"summary"`
	Warnings []string  `json:"warnings"`
	Sections []Section `json:"sections"`
}

type Stat struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type Column struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	Type     string   `json:"type"` // text, number, select, boolean
	Editable bool     `json:"editable"`
	Options  []Option `json:"options,omitempty"`
}

type Row struct {
	ID      string              `json:"id"`
	Cells   map[string]string   `json:"cells"`
	Options map[string][]Option `json:"options,omitempty"` // per-row choices for editable select cells
	Reason  string              `json:"reason,omitempty"`
	Warning string              `json:"warning,omitempty"`
	Group   string              `json:"group,omitempty"`
}

type Section struct {
	Key         string   `json:"key"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Columns     []Column `json:"columns"`
	Rows        []Row    `json:"rows"`
}

// Section finds a section by key.
func (p *Proposal) Section(key string) *Section {
	for i := range p.Sections {
		if p.Sections[i].Key == key {
			return &p.Sections[i]
		}
	}
	return nil
}

// TraceStep records what one step did, so a run shows its work.
type TraceStep struct {
	Key        string `json:"key"`
	Title      string `json:"title"`
	Tool       string `json:"tool"`
	OK         bool   `json:"ok"`
	Detail     string `json:"detail,omitempty"`
	DurationMs int64  `json:"duration_ms"`
}

// Trace collects TraceSteps in order.
type Trace struct{ Steps []TraceStep }

// Run executes fn as the named step and records its outcome; detail is fn's one-line result.
func (t *Trace) Run(step StepInfo, fn func() (string, error)) error {
	start := time.Now()
	detail, err := fn()
	entry := TraceStep{Key: step.Key, Title: step.Title, Tool: step.Tool, OK: err == nil, Detail: detail, DurationMs: time.Since(start).Milliseconds()}
	if err != nil {
		entry.Detail = err.Error()
	}
	t.Steps = append(t.Steps, entry)
	return err
}

// Definition is one workflow. Implementations read through Store and write only inside Apply.
type Definition interface {
	Key() string
	Title() string
	Description() string
	Steps() []StepInfo
	Inputs(ctx context.Context, s *Store) ([]InputField, error)
	Check(ctx context.Context, s *Store, in Inputs) ([]Check, error)
	// Propose returns the proposal and the scope it applies to (usually the target year id).
	Propose(ctx context.Context, s *Store, in Inputs, trace *Trace) (Proposal, string, error)
	// Apply runs inside one transaction and returns what it changed, for Revert.
	Apply(ctx context.Context, tx *Store, in Inputs, p Proposal, actor uuid.UUID, trace *Trace) (json.RawMessage, string, error)
	Revert(ctx context.Context, tx *Store, snapshot json.RawMessage) error
}

// stepByKey returns the declared step so traces always match the catalogue.
func stepByKey(d Definition, key string) StepInfo {
	for _, s := range d.Steps() {
		if s.Key == key {
			return s
		}
	}
	panic(fmt.Sprintf("workflow %s has no step %q", d.Key(), key))
}

func blockingFailures(checks []Check) []Check {
	var failed []Check
	for _, c := range checks {
		if c.Blocking && !c.OK {
			failed = append(failed, c)
		}
	}
	return failed
}
