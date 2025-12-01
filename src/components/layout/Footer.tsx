import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="border-t bg-background">
            <div className="container py-8 md:py-12">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">About Us</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/about">Our Story</Link></li>
                            <li><Link to="/careers">Careers</Link></li>
                            <li><Link to="/press">Press</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Support</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/help">Help Center</Link></li>
                            <li><Link to="/returns">Returns</Link></li>
                            <li><Link to="/contact">Contact Us</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                            <li><Link to="/terms">Terms of Service</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Connect</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="#" target="_blank" rel="noreferrer">Twitter</a></li>
                            <li><a href="#" target="_blank" rel="noreferrer">Instagram</a></li>
                            <li><a href="#" target="_blank" rel="noreferrer">Facebook</a></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} SV Enterprises. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
