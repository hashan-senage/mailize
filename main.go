package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "Mailize",
		Width:     1180,
		Height:    700,
		MinWidth:  960,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// Dark Background #101827 — avoids a white flash before the UI paints.
		BackgroundColour: &options.RGBA{R: 16, G: 24, B: 39, A: 255},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		// Two instances would fight over the SMTP port and the database.
		SingleInstanceLock: &options.SingleInstanceLock{UniqueId: "dev.mailize.desktop"},
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			Theme: windows.Dark,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
