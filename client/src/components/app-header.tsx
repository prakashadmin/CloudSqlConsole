import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "@/contexts/user-context";
import { LogOut, User, Settings, Shield, Code, BarChart3, Users } from "lucide-react";
import { Link, useLocation } from "wouter";

export function AppHeader() {
  const { user, logout, isAdmin, isDeveloper, isBusinessUser } = useUser();
  const [location, setLocation] = useLocation();

  const getRoleIcon = () => {
    if (isAdmin) return <Shield className="h-4 w-4 text-red-500" />;
    if (isDeveloper) return <Code className="h-4 w-4 text-blue-500" />;
    if (isBusinessUser) return <BarChart3 className="h-4 w-4 text-green-500" />;
    return null;
  };

  const getRoleName = () => {
    if (isAdmin) return "Admin";
    if (isDeveloper) return "Developer";
    if (isBusinessUser) return "Business User";
    return "Unknown";
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-14 items-center px-4">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2" data-testid="link-home">
            <div className="font-bold text-xl">SQLPad</div>
          </Link>
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium" data-testid="main-navigation">
          <Link 
            href="/" 
            className={`transition-colors hover:text-foreground/80 ${location === "/" ? "text-foreground" : "text-foreground/60"}`}
            data-testid="nav-sql-client"
          >
            SQL Client
          </Link>
          {isAdmin && (
            <Link 
              href="/admin" 
              className={`transition-colors hover:text-foreground/80 ${location === "/admin" ? "text-foreground" : "text-foreground/60"}`}
              data-testid="nav-admin"
            >
              <Users className="h-4 w-4 mr-1 inline" />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4">
          {user && (
            <>
              <div className="flex items-center gap-2" data-testid="user-info">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getRoleIcon()}
                  {getRoleName()}
                </Badge>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="user-menu-trigger">
                    <User className="h-4 w-4 mr-2" />
                    {user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" data-testid="user-menu">
                  <DropdownMenuItem disabled>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {getRoleName()} • ID: {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}