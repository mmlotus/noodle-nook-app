"use client";

import global from "@/styles/Global.module.css";

export default function PrivacyPage() {
    return (
        <main className={global.section}>
            <h1 className={global.heading}>Privacy Policy</h1>
            <p className={global.subcentered}>
                <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
            </p>

            <section>
                <h2 className={global.subheading}>1. Information Collected</h2>
                <p>
                    NoodleNook collects and stores the information you provide while using the app.
                    This may include your name, email address, password-protected account information,
                    weight entries, notes, tasks, grocery lists, budget or expense information, books,
                    recipes, watchlist items, and other tracker data you choose to enter.
                </p>
                <p>
                    Passwords are not stored in plain text. They are stored using a hashed password value.
                    No personal information unrelated to account management or use is intentionally collected.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>2. How Information Is Used</h2>
                <p>
                    Your information is used to create and maintain your account, save your tracker entries,
                    display your personal app data, and support normal app functionality.
                </p>
                <p>
                    Your personal data is not sold. Your data is not intentionally shared with third parties for
                    advertising or marketing purposes. Data is not regularly accessed except by your own use of your
                    account.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>3. Service Providers</h2>
                <p>
                    NoodleNook may rely on third-party services for hosting, database storage, authentication
                    support, or other technical infrastructure. These services are used only as needed to
                    operate the app.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>4. Data Security</h2>
                <p>
                    Reasonable measures are used to protect your information from unauthorized access,
                    disclosure, alteration, or destruction. However, no website, app, database, or internet
                    transmission can be guaranteed to be completely secure.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>5. Sensitive Information</h2>
                <p>
                    NoodleNook may allow you to store personal notes and tracker information. You should avoid
                    storing passwords, government identification numbers, banking credentials, or other
                    highly sensitive secrets in the app.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>6. Access, Correction, & Deletion</h2>
                <p>
                    You may request access to your stored information, correction of inaccurate information, or
                    deletion of your account and associated data by contacting the email address below.
                    Access to an account or account data will only be provided to the authorized account user.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>7. Retention of Information</h2>
                <p>
                    Information is retained for as long as necessary to provide the app&#39;s features, maintain
                    account access, resolve issues, or meet reasonable operational needs. If an account is deleted,
                    associated data may be removed unless retention is required for legitimate operational, security,
                    or legal reasons.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>8. Children&#39;s Privacy</h2>
                <p>
                    NoodleNook is not intended for children under 13. Do not create an account or use the app if you
                    are under 13 years old.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>9. Changes to This Policy</h2>
                <p>
                    This Privacy Policy may be updated from time to time. Continued use of NoodleNook after updates
                    are posted indicates acceptance of the updated policy.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>10. Contact</h2>
                <p>
                    For questions about this Privacy Policy, contact:{" "}
                    <a href="mailto:mmccoyinfo@gmail.com" className={global.linkBtn}>
                        mmccoyinfo@gmail.com
                    </a>
                </p>
            </section>
        </main>
    );
}

