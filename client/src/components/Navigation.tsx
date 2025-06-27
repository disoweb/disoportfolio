import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/projects", label: "Projects" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-2xl font-semibold text-blue-600 tracking-wide" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              DiSO Webs
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-slate-600 hover:text-blue-600 transition-colors duration-200 ${
                  location === link.href ? "text-blue-600 font-medium" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{user?.firstName || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/referrals" className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Referrals
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={logout} disabled={isLoggingOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                    Login
                  </Button>
                </Link>
                <Link href="/services">
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center space-x-3">
            {!isAuthenticated && (
              <Link href="/services">
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-xs"
                >
                  Get Started
                </Button>
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-slate-600" />
              ) : (
                <Menu className="h-6 w-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 text-slate-600 hover:text-blue-600 ${
                  location === link.href ? "text-blue-600 font-medium" : ""
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-slate-600 hover:text-blue-600"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/referrals"
                  className="block px-3 py-2 text-slate-600 hover:text-blue-600"
                  onClick={() => setIsOpen(false)}
                >
                  Referrals
                </Link>
                <button
                  onClick={logout}
                  disabled={isLoggingOut}
                  className="block px-3 py-2 text-slate-600 hover:text-blue-600 w-full text-left"
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            ) : (
              <div className="px-3 py-2">
                <div className="flex gap-3">
                  <Link href="/services" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button 
                      size="sm" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/auth" className="flex-1" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300">
                      Login
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
