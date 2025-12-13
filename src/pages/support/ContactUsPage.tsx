import React from 'react';

export default function ContactUsPage() {
    return (
        <div className="container py-12">
            <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
            <div className="prose dark:prose-invert max-w-none">
                <p>
                    Have questions? We'd love to hear from you.
                </p>
                <ul>
                    <li><strong>Email:</strong> support@sventerprises.com</li>
                    <li><strong>Phone:</strong> +91 123 456 7890</li>
                    <li><strong>Address:</strong> 123 Main Street, City, Country</li>
                </ul>
            </div>
        </div>
    );
}
