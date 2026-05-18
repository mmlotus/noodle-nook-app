"use client";

import global from "@/styles/Global.module.css";

export default function TermsPage() {
    return (
        <main className={global.section}>
            <h1 className={global.heading}>Terms of Service</h1>

            <p className={global.subcentered}>
                <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
            </p>

            <section>
                <h2 className={global.subheading}>1. Personal & Hobby Use</h2>
                <p>
                    NoodleNook is intended solely for willing participants.
                </p>
                <p>
                    NoodleNook is a personal tracker app intended for personal, household, hobby, and
                    everyday organization use. It may be used to track things like weight, tasks, groceries,
                    books, notes, mileage, expenses, and other personal information.
                </p>
                <p>
                    NoodleNook is not intended to provide medical, financial, legal, tax, or professional
                    advice. Any information entered into the app is for personal reference only.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>2. Account Responsibility</h2>
                <p>
                    You are responsible for keeping your login credentials secure. You should use a strong
                    password and avoid sharing your account with others.
                </p>
                <p>
                    You are also responsible for the information you choose to enter into the app.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>3. Your Data</h2>
                <p>
                    NoodleNook stores the information you enter so the app can provide its tracking features.
                    This may include personal notes, weight entries, task lists, grocery items, budget or
                    expense information, and other tracker data you choose to save.
                </p>
                <p>
                    Your personal data is not sold. Data may be processed by service providers as needed to
                    operate, host, secure, and maintain the app.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>4. Sensitive Information</h2>
                <p>
                    Because NoodleNook may be used for personal notes and trackers, you should be thoughtful
                    about what you enter. Do not store passwords, government identification numbers, banking
                    credentials, or other highly sensitive secrets in the app.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>5. Acceptable Use</h2>
                <p>
                    By using this app, you agree not to misuse the app, attempt to access another person&#39;s
                    account, interfere with the app&#39;s operation, or use the app for illegal or harmful activity.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>6. Availability & Changes</h2>
                <p>
                    NoodleNook is provided as a personal/hobby project. The app may change, be updated, experience
                    downtime, or be discontinued at any time.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>7. Disclaimer</h2>
                <p>
                    NoodleNook is provided &#34;as is&#34; and &#34;as available&#34;. No warranties of any kind are made
                    regarding the app&#39;s availability, accuracy, completeness, reliability, or suitability
                    for any particular purpose.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>8. Limitation of Liability</h2>
                <p>
                    To the fullest extent permitted by law, the creator of NoodleNook is not responsible
                    for losses, damages, or issues arising from use of the app, inability to access the app,
                    or reliance on information stored in the app.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>9. Updates to These Terms</h2>
                <p>
                    These Terms may be updated periodically. Continued use of NoodleNook after changes
                    are made indicates your acceptance of the updated Terms.
                </p>
            </section>

            <section>
                <h2 className={global.subheading}>10. Contact</h2>
                <p>
                    For questions, contact:{" "}
                    <a href="mailto:mmccoyinfo@gmail.com" className={global.linkBtn}>
                        mmccoyinfo@gmail.com
                    </a>
                </p>
            </section>
        </main>
    );
}
