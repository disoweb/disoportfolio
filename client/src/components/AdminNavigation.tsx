import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, BarChart3, Users, Settings, FileText, MessageSquare, CreditCard, LogOut } from "lucide-react";

export default function AdminNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const adminNavItems = [
    { 
      name: "Dashboard", 
      href: "/admin-dashboard", 
      icon: BarChart3,
      description: "Overview & Analytics"
    },
    { 
      name: "Projects", 
      href: "/admin/projects", 
      icon: FileText,
      description: "Manage All Projects"
    },
    { 
      name: "Orders", 
      href: "/admin/orders", 
      icon: CreditCard,
      description: "Order Management"
    },
    { 
      name: "Clients", 
      href: "/admin/clients", 
      icon: Users,
      description: "Client Management"
    },
    { 
      name: "Messages", 
      href: "/admin/messages", 
      icon: MessageSquare,
      description: "Support & Communication"
    },
    { 
      name: "Settings", 
      href: "/admin/settings", 
      icon: Settings,
      description: "System Configuration"
    },
  ];

  return (
    <nav className="bg-gray-900 shadow-lg border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/admin-dashboard" className="flex-shrink-0 flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-red-400">DiSO Admin</h1>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                        location === item.href
                          ? "bg-gray-800 text-red-400 border border-red-500/30"
                          : "text-gray-300 hover:text-red-400 hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Admin User Info */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                ADMIN
              </span>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-200">
                  {user?.firstName || 'Admin'}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-red-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
            >
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                    location === item.href
                      ? "bg-gray-700 text-red-400 border-l-4 border-red-500"
                      : "text-gray-300 hover:text-red-400 hover:bg-gray-700"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.description}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
            
            {/* Mobile User Info */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="px-3 py-2">
                <div className="flex items-center space-x-3">
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    ADMIN
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {user?.firstName || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="mx-3 bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}