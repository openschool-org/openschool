// Package emails turns account events into branded messages: one shared layout, one builder per email.
package emails

import (
	"bytes"
	"embed"
	"encoding/base64"
	htmltemplate "html/template"
	texttemplate "text/template"

	"github.com/openschool-org/openschool/internal/mailer"
)

//go:embed templates/layout.html templates/layout.txt assets/openschool-logo.png
var files embed.FS

const logoContentID = "openschool-logo"

var (
	htmlLayout = htmltemplate.Must(htmltemplate.ParseFS(files, "templates/layout.html"))
	textLayout = texttemplate.Must(texttemplate.ParseFS(files, "templates/layout.txt"))
	logoPNG    = mustRead("assets/openschool-logo.png")
)

func mustRead(name string) []byte {
	b, err := files.ReadFile(name)
	if err != nil {
		panic(err)
	}
	return b
}

// Branding is the school identity shown in every email's header and footer.
type Branding struct {
	SchoolName string
	Phone      string
	Email      string
}

type detail struct{ Label, Value string }

type button struct{ Label, URL string }

// view is everything the layout needs; each email builder fills in the parts it uses.
type view struct {
	Brand         Branding
	LogoSrc       htmltemplate.URL
	Preheader     string
	Title         string
	Greeting      string
	Paragraphs    []string
	Details       []detail
	Button        *button
	ShowLink      bool
	Note          string
	Safety        string
	TestRecipient string
}

// email is a built message before rendering.
type email struct {
	subject string
	view    view
}

// render produces the HTML and text bodies; inlineLogo false embeds the logo as a data URI for browser previews.
func render(e email, brand Branding, testRecipient string, inlineLogo bool) (mailer.Message, error) {
	v := e.view
	v.Brand = brand
	v.TestRecipient = testRecipient
	v.ShowLink = v.Button != nil
	v.LogoSrc = htmltemplate.URL("cid:" + logoContentID)
	if !inlineLogo {
		v.LogoSrc = htmltemplate.URL("data:image/png;base64," + base64.StdEncoding.EncodeToString(logoPNG))
	}

	var html, text bytes.Buffer
	if err := htmlLayout.Execute(&html, v); err != nil {
		return mailer.Message{}, err
	}
	if err := textLayout.Execute(&text, v); err != nil {
		return mailer.Message{}, err
	}
	msg := mailer.Message{Subject: e.subject, HTML: html.String(), Text: text.String()}
	if inlineLogo {
		msg.Inline = []mailer.Inline{{ContentID: logoContentID, Filename: "openschool.png", ContentType: "image/png", Data: logoPNG}}
	}
	return msg, nil
}
