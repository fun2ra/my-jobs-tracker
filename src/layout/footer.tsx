export default function Footer() {
    return (<footer>
        <div className="footer-content">
            <div className="font-semibold text-xl text-primary mb-6">Privacy</div>
            <div className="flex items-center gap-12">
                <div>The code is public, your data is not. No emails, exports or account IDs live on the respository or this site</div>
                <div>Sign-in works for one google account only. Gmail access is read-only, and the token is revoked after every run</div>
                <div>Your client ID and Script ID are entered in Settings and saved in this browser, not in the code</div>
            </div>
        </div>
    </footer>)
}