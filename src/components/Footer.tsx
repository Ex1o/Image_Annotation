import { Eye, Github, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-hero border-t border-upload-dashed py-12">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <a href="#" className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-primary" />
              <span className="font-bold text-hero-foreground">VisionRapid</span>
            </a>
            <p className="text-sm text-hero-muted leading-relaxed">
              Build production-ready computer vision models in minutes. No ML expertise required.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-hero-foreground mb-3 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-hero-muted">
              <li><a href="#" className="hover:text-hero-foreground transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-hero-foreground transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-hero-foreground transition-colors">API Docs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-hero-foreground mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-hero-muted">
              <li><a href="#" className="hover:text-hero-foreground transition-colors">About</a></li>
              <li><a href="#" className="hover:text-hero-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-hero-foreground transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-hero-foreground mb-3 text-sm">Connect</h4>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-upload flex items-center justify-center text-hero-muted hover:text-primary transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-upload flex items-center justify-center text-hero-muted hover:text-primary transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-upload flex items-center justify-center text-hero-muted hover:text-primary transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-upload-dashed pt-6 text-center text-xs text-hero-muted">
          © 2026 VisionRapid. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
