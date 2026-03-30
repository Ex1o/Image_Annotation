import { useState } from "react";
import { Menu, X, Eye, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-hero/80 backdrop-blur-xl border-b border-upload-dashed">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <Eye className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold text-hero-foreground">
            VisionRapid
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="/#how-it-works" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors">How It Works</a>
          <a href="/#features" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors">Features</a>
          <a href="/#use-cases" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors">Use Cases</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{user?.username || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="text-sm text-hero-muted hover:text-hero-foreground transition-colors px-4 py-2">
                Log In
              </Link>
              <Link to="/login" className="text-sm bg-primary text-primary-foreground px-5 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-hero-foreground">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-hero border-t border-upload-dashed overflow-hidden"
          >
            <div className="container py-4 flex flex-col gap-4">
              <a href="/#how-it-works" onClick={() => setOpen(false)} className="text-sm text-hero-muted hover:text-hero-foreground">How It Works</a>
              <a href="/#features" onClick={() => setOpen(false)} className="text-sm text-hero-muted hover:text-hero-foreground">Features</a>
              <a href="/#use-cases" onClick={() => setOpen(false)} className="text-sm text-hero-muted hover:text-hero-foreground">Use Cases</a>
              {isAuthenticated ? (
                <>
                  <div className="text-sm text-hero-muted px-2">
                    {user?.email}
                  </div>
                  <Button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    variant="destructive"
                    className="w-full"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium w-full text-center">
                  Get Started Free
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
