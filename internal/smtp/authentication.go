package smtp

import (
	"errors"

	"github.com/emersion/go-sasl"
)

// loginServer implements the (de facto standard) SASL LOGIN mechanism, which go-sasl no longer
// ships a server for. Many SMTP clients (including older Laravel/Swift mailers) default to it.
type loginServer struct {
	state        int // 0 = expecting username, 1 = expecting password, 2 = done
	username     string
	authenticate func(username, password string) error
}

func newLoginServer(auth func(username, password string) error) sasl.Server {
	return &loginServer{authenticate: auth}
}

func (s *loginServer) Next(response []byte) (challenge []byte, done bool, err error) {
	switch s.state {
	case 0:
		if response == nil { // no initial response: prompt for the username
			s.state = -1 // prompted; the next response is the username
			return []byte("Username:"), false, nil
		}
		s.username = string(response)
		s.state = 1
		return []byte("Password:"), false, nil
	case -1:
		s.username = string(response)
		s.state = 1
		return []byte("Password:"), false, nil
	case 1:
		s.state = 2
		return nil, true, s.authenticate(s.username, string(response))
	}
	return nil, true, errors.New("unexpected response")
}
