import React from 'react';

export default function HelpCenterPage() {
    return (
        <div className="container py-12">
            <h1 className="text-3xl font-bold mb-6">Help Center</h1>
            <div className="prose dark:prose-invert max-w-none">
                <p>
                    Need help? Browse our frequently asked questions or contact our support team.
                </p>
                <h3>Frequently Asked Questions</h3>
                <ul>
                    <li><strong>How do I track my order?</strong> You can track your order from the "Orders" page in your account.</li>
                    <li><strong>What is your return policy?</strong> Please visit our Returns page for more information.</li>
                </ul>
            </div>
        </div>
    );
}
