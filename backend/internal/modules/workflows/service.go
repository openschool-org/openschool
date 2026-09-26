package workflows

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"slices"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/ports"
)

// Engine owns the run lifecycle: propose, edit, apply, discard, revert.
type Engine struct {
	store       *Store
	audit       ports.AuditRecorder
	definitions []Definition
}

func NewEngine(store *Store, audit ports.AuditRecorder, definitions []Definition) *Engine {
	return &Engine{store: store, audit: audit, definitions: definitions}
}

func (e *Engine) definition(key string) (Definition, error) {
	for _, d := range e.definitions {
		if d.Key() == key {
			return d, nil
		}
	}
	return nil, ErrUnknownWorkflow
}

// CatalogEntry is everything the frontend needs to render a workflow without hard-coding it.
type CatalogEntry struct {
	Key         string       `json:"key"`
	Order       int          `json:"order"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Steps       []StepInfo   `json:"steps"`
	Tools       []ToolInfo   `json:"tools"`
	Inputs      []InputField `json:"inputs"`
	LastRun     *RunSummary  `json:"last_run,omitempty"`
}

// Catalog lists every workflow in pipeline order, with the tools each one uses.
func (e *Engine) Catalog(ctx context.Context) ([]CatalogEntry, error) {
	latest, err := e.store.latestRuns(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]CatalogEntry, 0, len(e.definitions))
	for i, d := range e.definitions {
		inputs, err := d.Inputs(ctx, e.store)
		if err != nil {
			return nil, fmt.Errorf("%s inputs: %w", d.Key(), err)
		}
		entry := CatalogEntry{Key: d.Key(), Order: i + 1, Title: d.Title(), Description: d.Description(), Steps: d.Steps(), Inputs: inputs}
		for _, s := range d.Steps() {
			if tool, ok := Tools[s.Tool]; ok && !slices.ContainsFunc(entry.Tools, func(t ToolInfo) bool { return t.Name == tool.Name }) {
				entry.Tools = append(entry.Tools, tool)
			}
		}
		if run, ok := latest[d.Key()]; ok {
			entry.LastRun = &run
		}
		out = append(out, entry)
	}
	return out, nil
}

// Check evaluates a workflow's preconditions for the given inputs.
func (e *Engine) Check(ctx context.Context, key string, in Inputs) ([]Check, error) {
	d, err := e.definition(key)
	if err != nil {
		return nil, err
	}
	return d.Check(ctx, e.store, e.withDefaults(ctx, d, in))
}

// withDefaults fills inputs the person left empty from the field defaults.
func (e *Engine) withDefaults(ctx context.Context, d Definition, in Inputs) Inputs {
	out := Inputs{}
	for k, v := range in {
		out[k] = v
	}
	fields, err := d.Inputs(ctx, e.store)
	if err != nil {
		return out
	}
	for _, f := range fields {
		if out[f.Key] == "" && f.Default != "" {
			out[f.Key] = f.Default
		}
	}
	return out
}

// Propose runs the dry run and stores it as the open proposal for its scope.
func (e *Engine) Propose(ctx context.Context, key string, in Inputs, actor uuid.UUID) (RunRecord, []Check, error) {
	d, err := e.definition(key)
	if err != nil {
		return RunRecord{}, nil, err
	}
	in = e.withDefaults(ctx, d, in)
	checks, err := d.Check(ctx, e.store, in)
	if err != nil {
		return RunRecord{}, nil, err
	}
	if len(blockingFailures(checks)) > 0 {
		return RunRecord{}, checks, ErrChecksFailed
	}
	trace := &Trace{}
	proposal, scope, err := d.Propose(ctx, e.store, in, trace)
	if err != nil {
		return RunRecord{}, checks, err
	}
	var run RunRecord
	err = e.store.inTx(ctx, func(tx *Store) error {
		run, err = tx.createRun(ctx, key, scope, in, proposal, trace.Steps, "", actor)
		return err
	})
	if err != nil {
		return RunRecord{}, checks, err
	}
	e.record(ctx, run.ID, "workflow_proposed", actor, key)
	return run, checks, nil
}

// Get returns one run.
func (e *Engine) Get(ctx context.Context, id uuid.UUID) (RunRecord, error) {
	return e.store.getRun(ctx, id, false)
}

// History lists a workflow's recent runs.
func (e *Engine) History(ctx context.Context, key string) ([]RunSummary, error) {
	if _, err := e.definition(key); err != nil {
		return nil, err
	}
	return e.store.listRuns(ctx, key)
}

// Edit changes editable cells of one proposal row, validating select values against their options.
func (e *Engine) Edit(ctx context.Context, id uuid.UUID, sectionKey, rowID string, cells map[string]string) (RunRecord, error) {
	var out RunRecord
	err := e.store.inTx(ctx, func(tx *Store) error {
		run, err := tx.getRun(ctx, id, true)
		if err != nil {
			return err
		}
		if run.State != "proposed" {
			return ErrNotProposed
		}
		section := run.Proposal.Section(sectionKey)
		if section == nil {
			return ErrUnknownRow
		}
		idx := slices.IndexFunc(section.Rows, func(r Row) bool { return r.ID == rowID })
		if idx < 0 {
			return ErrUnknownRow
		}
		row := &section.Rows[idx]
		for key, value := range cells {
			col := slices.IndexFunc(section.Columns, func(c Column) bool { return c.Key == key })
			if col < 0 || !section.Columns[col].Editable {
				return ErrNotEditable
			}
			if err := validateCell(section.Columns[col], row, value); err != nil {
				return err
			}
			row.Cells[key] = value
			row.Reason = "Changed by hand"
			row.Warning = ""
		}
		if err := tx.saveProposal(ctx, id, run.Proposal); err != nil {
			return err
		}
		out = run
		return nil
	})
	return out, err
}

func validateCell(col Column, row *Row, value string) error {
	switch col.Type {
	case "boolean":
		if value != "true" && value != "false" {
			return ErrInvalidOption
		}
	case "select":
		options := col.Options
		if perRow, ok := row.Options[col.Key]; ok {
			options = perRow
		}
		if value != "" && !slices.ContainsFunc(options, func(o Option) bool { return o.Value == value }) {
			return ErrInvalidOption
		}
	}
	return nil
}

// Apply re-checks the preconditions, then writes the proposal in one transaction.
func (e *Engine) Apply(ctx context.Context, id uuid.UUID, actor uuid.UUID) (RunRecord, []Check, error) {
	run, err := e.store.getRun(ctx, id, false)
	if err != nil {
		return RunRecord{}, nil, err
	}
	d, err := e.definition(run.WorkflowKey)
	if err != nil {
		return RunRecord{}, nil, err
	}
	checks, err := d.Check(ctx, e.store, run.Inputs)
	if err != nil {
		return RunRecord{}, nil, err
	}
	if len(blockingFailures(checks)) > 0 {
		return RunRecord{}, checks, ErrChecksFailed
	}
	trace := &Trace{Steps: run.Trace}
	err = e.store.inTx(ctx, func(tx *Store) error {
		locked, err := tx.getRun(ctx, id, true)
		if err != nil {
			return err
		}
		if locked.State != "proposed" {
			return ErrNotProposed
		}
		snapshot, summary, err := d.Apply(ctx, tx, locked.Inputs, locked.Proposal, actor, trace)
		if err != nil {
			return err
		}
		if snapshot == nil {
			snapshot = json.RawMessage("{}")
		}
		return tx.markApplied(ctx, id, snapshot, trace.Steps, summary, actor)
	})
	if err != nil {
		return RunRecord{}, checks, err
	}
	e.record(ctx, id, "workflow_applied", actor, run.WorkflowKey)
	// Side effects outside the database transaction (a school notice) are best effort.
	if after, ok := d.(afterApplier); ok {
		if err := after.AfterApply(ctx, e.store, run.Inputs, actor); err != nil {
			log.Printf("workflow %s after-apply: %v", run.WorkflowKey, err)
		}
	}
	out, err := e.store.getRun(ctx, id, false)
	return out, checks, err
}

// Discard closes an open proposal without applying it.
func (e *Engine) Discard(ctx context.Context, id uuid.UUID, actor uuid.UUID) error {
	err := e.store.inTx(ctx, func(tx *Store) error {
		run, err := tx.getRun(ctx, id, true)
		if err != nil {
			return err
		}
		if run.State != "proposed" {
			return ErrNotProposed
		}
		return tx.markState(ctx, id, "discarded")
	})
	if err == nil {
		e.record(ctx, id, "workflow_discarded", actor, "")
	}
	return err
}

// Revert undoes an applied run from its snapshot; the definition refuses once real data depends on it.
func (e *Engine) Revert(ctx context.Context, id uuid.UUID, actor uuid.UUID) error {
	err := e.store.inTx(ctx, func(tx *Store) error {
		run, err := tx.getRun(ctx, id, true)
		if err != nil {
			return err
		}
		if run.State != "applied" {
			return ErrNotApplied
		}
		d, err := e.definition(run.WorkflowKey)
		if err != nil {
			return err
		}
		if err := d.Revert(ctx, tx, run.Snapshot); err != nil {
			return err
		}
		return tx.markState(ctx, id, "reverted")
	})
	if err == nil {
		e.record(ctx, id, "workflow_reverted", actor, "")
	}
	return err
}

// record writes the audit entry; the run itself already holds the detail, so a failure here is logged only.
func (e *Engine) record(ctx context.Context, runID uuid.UUID, action string, actor uuid.UUID, reason string) {
	if e.audit == nil {
		return
	}
	_ = e.audit.Record(ctx, "workflow_run", runID, action, actor, nil, nil, reason)
}
