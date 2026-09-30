package emails

import (
	"fmt"
	"time"
)

// greeting uses the first name only, which reads naturally for both students and parents.
func greeting(name string) string {
	for i, r := range name {
		if r == ' ' {
			return fmt.Sprintf("Hi %s,", name[:i])
		}
	}
	if name == "" {
		return "Hello,"
	}
	return fmt.Sprintf("Hi %s,", name)
}

func minutes(d time.Duration) string {
	return fmt.Sprintf("%d minutes", int(d.Minutes()))
}

func formatTime(t time.Time) string {
	return t.Format("2 January 2006 at 3:04 PM (MST)")
}

func activationLinkEmail(school, name, link string, ttl time.Duration) email {
	return email{
		subject: "Activate your OpenSchool account",
		view: view{
			Preheader:  "Choose a password to finish setting up your account.",
			Title:      "Activate your account",
			Greeting:   greeting(name),
			Paragraphs: []string{fmt.Sprintf("Your details matched our records at %s. Choose a password to finish setting up your OpenSchool account.", school)},
			Button:     &button{Label: "Choose your password", URL: link},
			Note:       fmt.Sprintf("This link expires in %s and works only once.", minutes(ttl)),
			Safety:     "Didn't ask for this? You can ignore this email. No account is created until someone chooses a password with this link.",
		},
	}
}

func emailInUseEmail(school, signInURL string) email {
	return email{
		subject: "This email already has an OpenSchool account",
		view: view{
			Preheader: "Someone tried to activate an account with this email.",
			Title:     "This email already has an account",
			Paragraphs: []string{
				fmt.Sprintf("Someone tried to activate an account at %s using this email address, but it already belongs to an OpenSchool account.", school),
				"If that was you, sign in with your existing account. Forgot the password? Use Forgot password on the sign-in page. To activate a different account, start again with another email.",
			},
			Button: &button{Label: "Go to sign in", URL: signInURL},
			Safety: "Didn't try this? Nothing has changed on your account and you don't need to do anything.",
		},
	}
}

func accountActivatedEmail(school, name, username, signInURL string, at time.Time) email {
	return email{
		subject: "Your OpenSchool account is ready",
		view: view{
			Preheader:  "Your account is active. Here is how to sign in.",
			Title:      "Your account is ready",
			Greeting:   greeting(name),
			Paragraphs: []string{fmt.Sprintf("Your OpenSchool account at %s is now active. Keep your password private.", school)},
			Details:    []detail{{"Sign in with", username}, {"Activated", formatTime(at)}},
			Button:     &button{Label: "Sign in", URL: signInURL},
			Safety:     fmt.Sprintf("Didn't activate this account? Contact %s straight away so they can lock it.", school),
		},
	}
}

func passwordResetEmail(school, link string, ttl time.Duration) email {
	return email{
		subject: "Reset your OpenSchool password",
		view: view{
			Preheader:  "Use this link to choose a new password.",
			Title:      "Reset your password",
			Paragraphs: []string{fmt.Sprintf("We received a request to reset the password for your OpenSchool account at %s.", school)},
			Button:     &button{Label: "Reset password", URL: link},
			Note:       fmt.Sprintf("This link expires in %s and works only once.", minutes(ttl)),
			Safety:     "Didn't ask for this? Ignore this email. Your password stays the same.",
		},
	}
}

func passwordChangedEmail(school, signInURL string, at time.Time) email {
	return email{
		subject: "Your OpenSchool password was changed",
		view: view{
			Preheader:  "This is a security notice about your account.",
			Title:      "Your password was changed",
			Paragraphs: []string{fmt.Sprintf("The password for your OpenSchool account at %s was just changed.", school)},
			Details:    []detail{{"Changed", formatTime(at)}},
			Button:     &button{Label: "Sign in", URL: signInURL},
			Safety:     fmt.Sprintf("Didn't change it? Use Forgot password on the sign-in page to reset it now, and tell %s.", school),
		},
	}
}

func testEmail(provider, sender string, at time.Time) email {
	return email{
		subject: "OpenSchool email is working",
		view: view{
			Preheader:  "Your email settings can send messages.",
			Title:      "Email is working",
			Paragraphs: []string{"This test message shows that OpenSchool can send email with the current settings."},
			Details:    []detail{{"Provider", provider}, {"Sender", sender}, {"Sent", formatTime(at)}},
		},
	}
}
