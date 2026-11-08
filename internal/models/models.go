// Package models defines the data types shared across layers and serialised to the frontend.
package models

import "time"

type ProjectStatus string

const (
	ProjectActive   ProjectStatus = "active"
	ProjectDisabled ProjectStatus = "disabled"
)

// Project is a testing environment with its own SMTP credentials.
// The password is never part of this type; see ProjectCredentials.
type Project struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	SMTPUsername string        `json:"smtpUsername"`
	Status       ProjectStatus `json:"status"`
	IsSystem     bool          `json:"isSystem"`
	MessageCount int           `json:"messageCount"`
	CreatedAt    time.Time     `json:"createdAt"`
	UpdatedAt    time.Time     `json:"updatedAt"`
}

// ProjectCredentials carries the plaintext SMTP password. Returned only to the local UI on
// explicit request (create / regenerate / view configuration).
type ProjectCredentials struct {
	ProjectID string `json:"projectId"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

type ProjectInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type UpdateProjectInput struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Status      ProjectStatus `json:"status"`
}

// Message is a captured email. Bodies and headers are loaded only by GetMessage.
type Message struct {
	ID            string       `json:"id"`
	ProjectID     string       `json:"projectId"`
	ProjectName   string       `json:"projectName"`
	MessageID     string       `json:"messageId"`
	FromAddress   string       `json:"fromAddress"`
	ToAddresses   []string     `json:"toAddresses"`
	CcAddresses   []string     `json:"ccAddresses"`
	BccAddresses  []string     `json:"bccAddresses"`
	ReplyTo       string       `json:"replyTo"`
	Subject       string       `json:"subject"`
	TextBody      string       `json:"textBody,omitempty"`
	HTMLBody      string       `json:"htmlBody,omitempty"`
	HasHTML       bool         `json:"hasHtml"`
	HasText       bool         `json:"hasText"`
	Headers       []Header     `json:"headers,omitempty"`
	RawSource     string       `json:"rawSource,omitempty"`
	RawTruncated  bool         `json:"rawTruncated,omitempty"`
	Size          int64        `json:"size"`
	IsRead        bool         `json:"isRead"`
	AttachmentCnt int          `json:"attachmentCount"`
	ReceivedAt    time.Time    `json:"receivedAt"`
	Attachments   []Attachment `json:"attachments,omitempty"`
}

type Header struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type Attachment struct {
	ID          string    `json:"id"`
	MessageID   string    `json:"messageId"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"contentType"`
	Size        int64     `json:"size"`
	StoragePath string    `json:"-"`
	CreatedAt   time.Time `json:"createdAt"`
}

type MessageFilter struct {
	ProjectID  string `json:"projectId"`
	Search     string `json:"search"`
	Sender     string `json:"sender"`
	Recipient  string `json:"recipient"`
	DateFrom   string `json:"dateFrom"` // YYYY-MM-DD, inclusive
	DateTo     string `json:"dateTo"`   // YYYY-MM-DD, inclusive
	UnreadOnly bool   `json:"unreadOnly"`
	Oldest     bool   `json:"oldestFirst"`
	Limit      int    `json:"limit"`
	Offset     int    `json:"offset"`
}

type MessagePage struct {
	Items  []Message `json:"items"`
	Total  int       `json:"total"`
	Limit  int       `json:"limit"`
	Offset int       `json:"offset"`
}

type DashboardStats struct {
	TotalMessages  int        `json:"totalMessages"`
	MessagesToday  int        `json:"messagesToday"`
	UnreadMessages int        `json:"unreadMessages"`
	ProjectCount   int        `json:"projectCount"`
	Recent         []Message  `json:"recent"`
	SMTP           SMTPStatus `json:"smtp"`
	Insights       Insights   `json:"insights"`
	Server         ServerInfo `json:"server"`
}

// ReceivedEvent is the payload of the "message:received" event, so the UI can show a
// notification without another round trip.
type ReceivedEvent struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	ProjectName string `json:"projectName"`
	From        string `json:"from"`
	Subject     string `json:"subject"`
	Attachments int    `json:"attachments"`
}

type DayCount struct {
	Date  string `json:"date"` // YYYY-MM-DD, local time
	Count int    `json:"count"`
}

type ProjectStat struct {
	ProjectID      string `json:"projectId"`
	Name           string `json:"name"`
	Status         string `json:"status"`
	Total          int    `json:"total"`
	Unread         int    `json:"unread"`
	LastReceivedAt string `json:"lastReceivedAt,omitempty"`
}

type SenderStat struct {
	Address string `json:"address"`
	Count   int    `json:"count"`
}

// Insights are aggregate figures computed from the database.
type Insights struct {
	AttachmentCount int           `json:"attachmentCount"`
	AttachmentBytes int64         `json:"attachmentBytes"`
	MessageBytes    int64         `json:"messageBytes"`
	AvgMessageBytes int64         `json:"avgMessageBytes"`
	LastReceivedAt  string        `json:"lastReceivedAt,omitempty"`
	WithHTML        int           `json:"withHtml"`
	Last7Days       []DayCount    `json:"last7Days"`
	Projects        []ProjectStat `json:"projects"`
	TopSenders      []SenderStat  `json:"topSenders"`
}

// ServerInfo describes the effective SMTP configuration shown on the overview.
type ServerInfo struct {
	RequireAuth    bool `json:"requireAuth"`
	MaxMessageMB   int  `json:"maxMessageMb"`
	MaxConnections int  `json:"maxConnections"`
	AutoStart      bool `json:"autoStart"`
	LocalOnly      bool `json:"localOnly"`
}

type SMTPStatus struct {
	Running           bool   `json:"running"`
	Host              string `json:"host"`
	Port              int    `json:"port"`
	Address           string `json:"address"`
	ActiveConnections int    `json:"activeConnections"`
	StartedAt         string `json:"startedAt,omitempty"`
	LastError         string `json:"lastError,omitempty"`
}

// Settings is the validated application configuration.
type Settings struct {
	SMTPHost        string `json:"smtpHost"`
	SMTPPort        int    `json:"smtpPort"`
	RequireAuth     bool   `json:"requireAuth"`
	AllowPublicBind bool   `json:"allowPublicBind"`
	MaxMessageMB    int    `json:"maxMessageMb"`
	MaxConnections  int    `json:"maxConnections"`
	AutoStartSMTP   bool   `json:"autoStartSmtp"`
}

type StorageInfo struct {
	DataDir        string `json:"dataDir"`
	DatabasePath   string `json:"databasePath"`
	AttachmentsDir string `json:"attachmentsDir"`
	RawDir         string `json:"rawDir"`
}
