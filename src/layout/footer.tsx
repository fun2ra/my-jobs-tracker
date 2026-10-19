export default function Footer() {
    return (
        <footer className="mt-auto border-t border-border bg-surface py-12">
            <div className="page-container">
                <h2 className="mb-6 text-heading text-fg">Privacy</h2>
                <div className="grid gap-8 text-body text-fg-muted md:grid-cols-3">
                    <p>The code is public, your data is not. No emails, exports or account IDs live in the repository or on this site.</p>
                    <p>Sign-in works for one Google account only. Gmail access is read-only, and the token is revoked after every run.</p>
                    <p>Your client ID and Script ID are entered in Settings and saved in this browser, not in the code.</p>
                </div>
            </div>
        </footer>
    );
}
