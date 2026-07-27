"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function AuthCard({
  children,
  className,
  title,
  subtitle,
  icon,
}: AuthCardProps) {
  return (
    <div className={cn("w-full", className)}>
      {(title || icon) && (
        <div className="text-center mb-5">
          {icon && (
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          {title && <h2 className="text-h1 text-foreground">{title}</h2>}
          {subtitle && <p className="text-body text-muted-foreground mt-1.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

interface AuthCardRootProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCardRoot({ children, className }: AuthCardRootProps) {
  return (
    <Card className={cn("glass p-6 sm:p-8 rounded-3xl", className)}>
      {children}
    </Card>
  );
}

interface AuthErrorProps {
  error?: string;
}

export function AuthError({ error }: AuthErrorProps) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-slideUp">
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-caption text-destructive leading-relaxed">{error}</p>
    </div>
  );
}
