package services

import "errors"

// ValidationError is a user-correctable input error; its message is safe to show in the UI.
type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

func invalid(msg string) error { return &ValidationError{Msg: msg} }

var (
	ErrNotFound   = errors.New("not found")
	ErrAuthFailed = errors.New("authentication failed")
	ErrProjectOff = errors.New("project is disabled")
)
