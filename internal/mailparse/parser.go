// Package mailparse turns raw RFC 5322 / MIME bytes into a structured, display-ready message.
// It never executes or renders content; all output is treated as untrusted data.
package mailparse

import (
	"bytes"
	"errors"
	"io"
	"mime"
	"strings"

	"github.com/emersion/go-message"
	_ "github.com/emersion/go-message/charset" // register legacy charsets
	"github.com/emersion/go-message/mail"
)

type Header struct{ Name, Value string }

type Attachment struct {
	Filename    string
	ContentType string
	Data        []byte
}

type Parsed struct {
	Headers     []Header
	MessageID   string
	From        string
	To, Cc      []string
	ReplyTo     string
	Subject     string
	Text, HTML  string
	Attachments []Attachment
}

// Limits bound memory use for hostile input.
const (
	maxHeaderFields = 500
	maxParts        = 200
	maxBodyBytes    = 20 << 20
)

var dec = new(mime.WordDecoder)

func decodeWords(s string) string {
	if d, err := dec.DecodeHeader(s); err == nil {
		return d
	}
	return s
}

func addrs(h mail.Header, key string) []string {
	list, err := h.AddressList(key)
	out := make([]string, 0, len(list))
	for _, a := range list {
		if a != nil && a.Address != "" {
			out = append(out, a.Address)
		}
	}
	if err != nil && len(out) == 0 {
		if raw := strings.TrimSpace(h.Get(key)); raw != "" {
			out = append(out, raw) // keep malformed values visible rather than dropping them
		}
	}
	return out
}

// Parse never panics on malformed input; on structural failure it returns whatever was
// extracted so far, with the headers-only fallback, and a nil error where possible.
func Parse(raw []byte) (p Parsed, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = errors.New("malformed message")
		}
	}()

	mr, err := mail.CreateReader(bytes.NewReader(raw))
	if err != nil && !message.IsUnknownCharset(err) && !message.IsUnknownEncoding(err) {
		return p, err
	}
	if mr == nil {
		return p, err
	}
	h := mr.Header

	f := h.Fields()
	for n := 0; f.Next() && n < maxHeaderFields; n++ {
		p.Headers = append(p.Headers, Header{Name: f.Key(), Value: decodeWords(f.Value())})
	}
	p.MessageID = strings.Trim(strings.TrimSpace(h.Get("Message-Id")), "<>")
	if from := addrs(h, "From"); len(from) > 0 {
		p.From = from[0]
	}
	p.To, p.Cc = addrs(h, "To"), addrs(h, "Cc")
	if rt := addrs(h, "Reply-To"); len(rt) > 0 {
		p.ReplyTo = strings.Join(rt, ", ")
	}
	p.Subject, _ = h.Subject()
	if p.Subject == "" {
		p.Subject = decodeWords(h.Get("Subject"))
	}

	for parts := 0; parts < maxParts; parts++ {
		part, perr := mr.NextPart()
		if perr == io.EOF {
			break
		}
		if perr != nil && part == nil {
			break
		}
		body, _ := io.ReadAll(io.LimitReader(part.Body, maxBodyBytes))

		switch ph := part.Header.(type) {
		case *mail.InlineHeader:
			ct, params, _ := ph.ContentType()
			if _, fn := params["name"]; fn && !strings.HasPrefix(ct, "text/") {
				p.Attachments = append(p.Attachments, Attachment{Filename: params["name"], ContentType: ct, Data: body})
				continue
			}
			switch ct {
			case "text/plain":
				if p.Text == "" {
					p.Text = string(body)
				} else {
					p.Text += "\n" + string(body)
				}
			case "text/html":
				if p.HTML == "" {
					p.HTML = string(body)
				} else {
					p.HTML += string(body)
				}
			default:
				p.Attachments = append(p.Attachments, Attachment{Filename: "inline", ContentType: ct, Data: body})
			}
		case *mail.AttachmentHeader:
			ct, _, _ := ph.ContentType()
			name, _ := ph.Filename()
			p.Attachments = append(p.Attachments, Attachment{Filename: name, ContentType: ct, Data: body})
		}
	}
	return p, nil
}
