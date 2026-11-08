// Package config holds application-wide constants and configuration.
package config

// Application identity. Version is overridden at release build time with:
//
//	-ldflags "-X mailize/internal/config.Version=1.0.0"
var (
	Version = "0.1.0-dev"
)

const (
	AppName    = "Mailize"
	AppTagline = "Build. Send. Capture. Debug."

	// Defaults for the (not yet implemented) SMTP capture server.
	// The server binds to loopback only unless the user explicitly changes it.
	DefaultSMTPHost = "127.0.0.1"
	DefaultSMTPPort = 1025
)
